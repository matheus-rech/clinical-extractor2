"""
LLM Service Abstraction Layer
Provides unified interface for multiple AI providers (Gemini, Anthropic)
with automatic fallback on failures
"""
import json
import base64
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
import google.generativeai as genai
from anthropic import Anthropic
from ..config import settings


class GeminiClient:
    """Client for Google Gemini API"""
    
    def __init__(self, model: str, api_key: str):
        self.model_name = model
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model)
    
    def generate_text(
        self,
        prompt: str,
        require_json: bool = False,
        temperature: float = 0.3,
        max_output_tokens: int = 2048
    ) -> str:
        """Generate text response from Gemini"""
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_output_tokens
        }
        
        if require_json:
            generation_config["response_mime_type"] = "application/json"
        
        response = self.model.generate_content(
            prompt,
            generation_config=generation_config
        )
        
        # Handle empty responses (finish_reason 2 = blocked/truncated)
        if not response.candidates or not response.candidates[0].content.parts:
            raise ValueError(f"Empty response from Gemini. Finish reason: {response.candidates[0].finish_reason if response.candidates else 'unknown'}")
        
        return response.text
    
    def generate_vision(
        self,
        prompt: str,
        image_base64: str,
        temperature: float = 0.3
    ) -> str:
        """Generate response with image analysis"""
        image_data = base64.b64decode(
            image_base64.split(',')[1] if ',' in image_base64 else image_base64
        )
        
        response = self.model.generate_content([
            prompt,
            {"mime_type": "image/png", "data": image_data}
        ])
        
        return response.text


class AnthropicClient:
    """Client for Anthropic Claude API"""
    
    def __init__(self, model: str, api_key: str):
        self.model_name = model
        self.client = Anthropic(api_key=api_key)
    
    def generate_text(
        self,
        prompt: str,
        require_json: bool = False,
        temperature: float = 0.3,
        max_output_tokens: int = 2048
    ) -> str:
        """Generate text response from Claude"""
        system_message = None
        if require_json:
            system_message = "You must respond with valid JSON only. Do not include markdown fences or any text outside the JSON object."
        
        messages = [{"role": "user", "content": prompt}]
        
        # Build kwargs, only include system if it's not None
        kwargs = {
            "model": self.model_name,
            "max_tokens": max_output_tokens,
            "temperature": temperature,
            "messages": messages
        }
        if system_message is not None:
            kwargs["system"] = system_message
        
        response = self.client.messages.create(**kwargs)
        
        return response.content[0].text
    
    def generate_vision(
        self,
        prompt: str,
        image_base64: str,
        temperature: float = 0.3
    ) -> str:
        """Generate response with image analysis"""
        image_data = image_base64.split(',')[1] if ',' in image_base64 else image_base64
        
        messages = [{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": image_data
                    }
                },
                {
                    "type": "text",
                    "text": prompt
                }
            ]
        }]
        
        response = self.client.messages.create(
            model=self.model_name,
            max_tokens=2048,
            temperature=temperature,
            messages=messages
        )
        
        return response.content[0].text


def is_retryable_error(error: Exception) -> bool:
    """Check if error is retryable (quota, rate limit, timeout, server error)"""
    error_str = str(error).lower()
    
    retryable_patterns = [
        "429", "quota", "rate", "resource exhausted",
        "503", "service unavailable",
        "500", "internal server error",
        "timeout", "deadline exceeded",
        "empty response", "finish reason: 2",  # Gemini safety blocks
        "blocked", "safety"
    ]
    
    return any(pattern in error_str for pattern in retryable_patterns)


def parse_json_strict(text: str) -> Dict[str, Any]:
    """Parse JSON with cleaning for markdown fences and extra text"""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines)
    
    start = cleaned.find("{")
    end = cleaned.rfind("}") + 1
    if start >= 0 and end > start:
        cleaned = cleaned[start:end]
    
    return json.loads(cleaned)


def generate_text(
    prompt: str,
    require_json: bool = False,
    temperature: float = 0.3,
    max_output_tokens: int = 2048,
    image_base64: Optional[str] = None
) -> str:
    """
    Generate text with automatic fallback between providers
    
    Args:
        prompt: The prompt text
        require_json: Whether JSON response is required
        temperature: Generation temperature (0.0-1.0)
        max_output_tokens: Maximum tokens to generate
        image_base64: Optional base64 image data for vision tasks
    
    Returns:
        Generated text response
    
    Raises:
        HTTPException: If both providers fail
    """
    primary_provider = settings.LLM_PRIMARY
    fallback_provider = settings.LLM_FALLBACK
    
    if settings.FORCE_FALLBACK:
        primary_provider, fallback_provider = fallback_provider, primary_provider
    
    clients = {}
    
    if "gemini" in [primary_provider, fallback_provider]:
        try:
            clients["gemini"] = GeminiClient(
                model=settings.GEMINI_MODEL,
                api_key=settings.GEMINI_API_KEY
            )
        except Exception as e:
            print(f"Failed to initialize Gemini client: {e}")
    
    if "anthropic" in [primary_provider, fallback_provider] and settings.ANTHROPIC_API_KEY:
        try:
            clients["anthropic"] = AnthropicClient(
                model=settings.ANTHROPIC_MODEL,
                api_key=settings.ANTHROPIC_API_KEY
            )
        except Exception as e:
            print(f"Failed to initialize Anthropic client: {e}")
    
    primary_error = None
    if primary_provider in clients:
        try:
            client = clients[primary_provider]
            if image_base64:
                result = client.generate_vision(prompt, image_base64, temperature)
            else:
                result = client.generate_text(prompt, require_json, temperature, max_output_tokens)
            
            if require_json:
                try:
                    parse_json_strict(result)
                except json.JSONDecodeError as e:
                    raise ValueError(f"Invalid JSON response: {e}")
            
            return result
            
        except Exception as e:
            primary_error = e
            print(f"Primary provider ({primary_provider}) failed: {e}")
            
            if not is_retryable_error(e):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"AI generation failed ({primary_provider}): {str(e)}"
                )
    
    if fallback_provider in clients:
        try:
            client = clients[fallback_provider]
            if image_base64:
                result = client.generate_vision(prompt, image_base64, temperature)
            else:
                result = client.generate_text(prompt, require_json, temperature, max_output_tokens)
            
            if require_json:
                try:
                    parse_json_strict(result)
                except json.JSONDecodeError as e:
                    raise ValueError(f"Invalid JSON response: {e}")
            
            print(f"Fallback provider ({fallback_provider}) succeeded after primary failure")
            return result
            
        except Exception as e:
            print(f"Fallback provider ({fallback_provider}) also failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"All AI providers failed. Primary ({primary_provider}): {str(primary_error)}. Fallback ({fallback_provider}): {str(e)}"
            )
    
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="No AI providers available"
    )
