# La Consulta Backend

FastAPI backend for the La Consulta clinical data extraction platform with dual-provider LLM system and automatic fallback support.

## Features

- **Dual-Provider LLM System**: Gemini (primary) with Anthropic Claude (fallback)
- **Automatic Fallback**: Seamlessly switches to backup provider on 429/quota/timeout errors
- **7 AI-Powered Endpoints**: PICO-T extraction, summarization, validation, metadata extraction, table extraction, image analysis, and deep analysis
- **JWT Authentication**: Secure user authentication and authorization
- **Rate Limiting**: Configurable rate limits for API and AI endpoints
- **CORS Support**: Configurable cross-origin resource sharing

## Quick Start

### Prerequisites

- Python 3.12+
- Poetry (Python package manager)
- Gemini API key (required)
- Anthropic API key (optional, for fallback support)

### Installation

```bash
# Install dependencies
poetry install

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env
```

### Configuration

Edit `.env` file with your settings:

```bash
# Required: Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Anthropic API Key (for fallback support)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# LLM Model Selection (verified stable models)
GEMINI_MODEL=gemini-2.5-flash
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# LLM Provider Priority
LLM_PRIMARY=gemini
LLM_FALLBACK=anthropic
FORCE_FALLBACK=false

# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET_KEY=your_jwt_secret_key_here
```

### Running the Server

```bash
# Development mode with auto-reload
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production mode
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## Dual-Provider LLM System

### How It Works

The backend implements a sophisticated dual-provider LLM system that automatically handles provider failures:

1. **Primary Provider**: Requests are sent to the primary provider (default: Gemini)
2. **Error Detection**: System detects retryable errors (429 quota, 503 unavailable, timeouts)
3. **Automatic Fallback**: On retryable errors, request is automatically sent to fallback provider (default: Anthropic Claude)
4. **Transparent to Client**: Frontend receives response without knowing which provider was used

### Supported Error Types

The system automatically retries with fallback provider for:

- **429 Quota Exceeded**: API quota limits reached
- **503 Service Unavailable**: Provider temporarily unavailable
- **500 Internal Server Error**: Provider internal errors
- **Timeout Errors**: Request deadline exceeded
- **Rate Limit Errors**: Too many requests

### Configuration Options

#### LLM_PRIMARY
Primary LLM provider to use first.
- **Options**: `gemini`, `anthropic`
- **Default**: `gemini`

#### LLM_FALLBACK
Fallback LLM provider if primary fails.
- **Options**: `gemini`, `anthropic`
- **Default**: `anthropic`

#### FORCE_FALLBACK
Force use of fallback provider (useful for testing).
- **Options**: `true`, `false`
- **Default**: `false`

#### GEMINI_MODEL
Gemini model to use (verified stable model).
- **Default**: `gemini-2.5-flash`
- **Alternatives**: `gemini-2.5-pro` (more accurate, slower)

#### ANTHROPIC_MODEL
Anthropic Claude model to use (verified stable model).
- **Default**: `claude-sonnet-4-5-20250929` (Claude Sonnet 4.5)
- **Alternatives**: `claude-opus-4-1-20250805` (Claude Opus 4.1 - most capable)

### Testing Fallback

To test the fallback system, the most reliable method is to use the `FORCE_FALLBACK` environment variable.

1.  **Force the fallback provider**:
    This method tests the fallback provider directly without needing to simulate a primary provider failure.
    ```bash
    # Ensure you have a valid ANTHROPIC_API_KEY
    FORCE_FALLBACK=true
    ```
    With this setting, all AI requests will be sent directly to the `LLM_FALLBACK` provider.

2.  **Monitor logs** to confirm the fallback provider is used.

(Optional) To test the automatic failover on a real error, you would need to simulate a retryable error like a rate limit (429) or a temporary server error (500/503), which is harder to reproduce reliably during development.

## API Endpoints

### Authentication

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

#### POST `/api/auth/login`
Login and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### AI Endpoints (Require Authentication)

All AI endpoints require JWT authentication via `Authorization: Bearer <token>` header.

#### POST `/api/ai/generate-pico`
Extract PICO-T elements from research paper.

**Request Body:**
```json
{
  "document_id": "doc123",
  "pdf_text": "Full text of research paper..."
}
```

**Response:**
```json
{
  "population": "Description of study population",
  "intervention": "Primary intervention",
  "comparator": "Control group",
  "outcomes": "Primary and secondary outcomes",
  "timing": "Study duration",
  "study_type": "RCT"
}
```

#### POST `/api/ai/generate-summary`
Generate document summary.

#### POST `/api/ai/validate-field`
Validate extracted field against document.

#### POST `/api/ai/find-metadata`
Extract bibliographic metadata (DOI, PMID, journal, year).

#### POST `/api/ai/extract-tables`
Extract tables from document.

#### POST `/api/ai/analyze-image`
Analyze image with AI vision.

#### POST `/api/ai/deep-analysis`
Perform deep analysis with extended reasoning.

## Rate Limiting

The backend implements rate limiting to prevent abuse:

- **General API**: 100 requests per minute per user
- **AI Endpoints**: 10 requests per minute per user

Rate limits are configurable via environment variables:
```bash
RATE_LIMIT_PER_MINUTE=100
AI_RATE_LIMIT_PER_MINUTE=10
```

## Security Features

### API Key Protection
- API keys are **never exposed to frontend**
- All AI requests proxied through backend
- Keys stored securely in environment variables

### JWT Authentication
- Secure token-based authentication
- Configurable token expiration (default: 30 minutes)
- HS256 algorithm for token signing

### CORS Configuration
- Configurable allowed origins
- Default: `http://localhost:5173,http://localhost:3000`

### Input Validation
- Maximum PDF text size: 1MB per request
- Pydantic models for request/response validation
- Automatic input sanitization

## Development

### Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── models.py            # Pydantic models
│   ├── auth.py              # Authentication logic
│   ├── rate_limiter.py      # Rate limiting
│   ├── routers/
│   │   ├── ai.py            # AI endpoints (7 endpoints)
│   │   ├── auth.py          # Auth endpoints
│   │   ├── documents.py     # Document management
│   │   ├── extractions.py   # Extraction history
│   │   └── annotations.py   # PDF annotations
│   └── services/
│       └── llm.py           # LLM abstraction layer
├── tests/                   # Test suite
├── pyproject.toml           # Dependencies
├── .env.example             # Environment template
└── README.md                # This file
```

### Adding New AI Endpoints

1. **Define Pydantic models** in `app/models.py`:
   ```python
   class MyRequest(BaseModel):
       document_id: str
       pdf_text: str
   
   class MyResponse(BaseModel):
       result: str
   ```

2. **Create endpoint** in `app/routers/ai.py`:
   ```python
   @router.post("/my-endpoint", response_model=MyResponse)
   async def my_endpoint(request: MyRequest, current_user: User = Depends(get_current_user)):
       rate_limiter.check_rate_limit(f"ai:{current_user.id}", settings.AI_RATE_LIMIT_PER_MINUTE)
       
       prompt = f"Your prompt here: {request.pdf_text[:15000]}"
       
       response_text = generate_text(
           prompt=prompt,
           require_json=False,
           temperature=0.3
       )
       
       return MyResponse(result=response_text)
   ```

3. **Automatic fallback** is handled by `generate_text()` function

### Running Tests

```bash
# Run all tests
poetry run pytest

# Run with coverage
poetry run pytest --cov=app

# Run specific test file
poetry run pytest tests/test_ai.py
```

## Troubleshooting

### "No AI providers available"
- Check that at least one API key is configured in `.env`
- Verify API keys are valid

### "All AI providers failed"
- Check API quotas in provider dashboards
- Verify network connectivity
- Check provider status pages

### "429 Quota exceeded" persists
- Verify fallback provider is configured with valid API key
- Check fallback provider quota limits
- Consider upgrading API plan

### Fallback not working
- Verify `ANTHROPIC_API_KEY` is set in `.env`
- Check `LLM_FALLBACK=anthropic` is configured
- Review logs for error messages

## Model Selection Guide

### Gemini Models

**gemini-2.5-flash** (Default)
- Fast responses (~1-2 seconds)
- Good for most tasks
- 1M token context window
- Recommended for production

**gemini-2.5-pro**
- More accurate and capable
- Slower responses (~3-5 seconds)
- Best for complex analysis
- Higher cost per request

### Anthropic Claude Models

**claude-sonnet-4-5-20250929** (Default)
- Balanced speed and capability
- Excellent for medical/clinical text
- Good fallback for Gemini Flash
- Recommended for production fallback

**claude-opus-4-1-20250805**
- Most capable Claude model
- Best for complex reasoning
- Slower and more expensive
- Use for critical analysis tasks

## License

See main repository LICENSE file.

## Support

For issues and questions, please open an issue on the GitHub repository.
