"""
Gemini File Search Service
Handles PDF uploads to File Search stores and querying with citations

Note: This service requires the newer google-genai SDK for File Search API.
Falls back gracefully if not available.
"""
import base64
import asyncio
import json
from typing import Optional, Dict, Any, List
from ..config import settings

# Try to import the newer google-genai SDK for File Search
try:
    from google import genai
    from google.genai import types
    HAS_FILE_SEARCH = True
except ImportError:
    # Fall back to google-generativeai which doesn't have File Search
    import google.generativeai as genai
    HAS_FILE_SEARCH = False


class FileSearchService:
    """Service for managing Gemini File Search operations"""

    def __init__(self):
        """Initialize the File Search service with Gemini client"""
        global HAS_FILE_SEARCH
        self.store_mappings: Dict[str, str] = {}
        self.client = None

        if HAS_FILE_SEARCH:
            try:
                self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
                print("✅ File Search API initialized successfully")
            except Exception as e:
                print(f"Warning: Could not initialize File Search client: {e}")
                HAS_FILE_SEARCH = False

        if not HAS_FILE_SEARCH:
            print("Note: File Search API not available. Citation features will be limited.")
    
    async def upload_pdf_to_file_search(self, document_id: str, pdf_base64: str, filename: str) -> Dict[str, str]:
        """
        Upload a PDF to a new File Search store

        Args:
            document_id: Unique ID for the document
            pdf_base64: Base64 encoded PDF data
            filename: Name of the PDF file

        Returns:
            Dictionary with file_search_store_id and status
        """
        if not self.client:
            raise Exception("File Search API not available. Install google-genai package for this feature.")

        try:
            # Decode base64 PDF data
            pdf_data = base64.b64decode(
                pdf_base64.split(',')[1] if ',' in pdf_base64 else pdf_base64
            )
            
            # Create a temporary file to upload
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
                tmp_file.write(pdf_data)
                tmp_file_path = tmp_file.name
            
            # Create File Search Store with display name
            file_search_store = self.client.file_search_stores.create(
                config={'display_name': f'clinical_doc_{document_id}'}
            )
            
            # Upload PDF directly to the File Search store
            operation = self.client.file_search_stores.upload_to_file_search_store(
                file=tmp_file_path,
                file_search_store_name=file_search_store.name,
                config={'display_name': filename}
            )
            
            # Wait for import to complete (up to 60 seconds)
            max_wait = 60
            elapsed = 0
            while not operation.done and elapsed < max_wait:
                await asyncio.sleep(5)
                operation = self.client.operations.get(operation)
                elapsed += 5
            
            # Clean up temp file
            import os
            os.unlink(tmp_file_path)
            
            if not operation.done:
                raise Exception("File upload timed out after 60 seconds")
            
            # Store mapping for later queries
            self.store_mappings[document_id] = file_search_store.name
            
            return {
                "file_search_store_id": file_search_store.name,
                "message": f"PDF uploaded successfully to File Search store"
            }
            
        except Exception as e:
            raise Exception(f"Failed to upload PDF to File Search: {str(e)}")
    
    async def query_with_citations(
        self, 
        document_id: str, 
        file_search_store_id: str,
        query: str
    ) -> Dict[str, Any]:
        """
        Query a File Search store and get answer with citations
        
        Args:
            document_id: Document ID
            file_search_store_id: File Search store identifier
            query: User's question about the document
            
        Returns:
            Dictionary with answer and citation details
        """
        if not self.client:
            raise Exception("File Search API not available. Install google-genai package for this feature.")

        try:
            # Generate response with File Search tool
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=query,
                config=types.GenerateContentConfig(
                    tools=[
                        types.Tool(
                            file_search=types.FileSearch(
                                file_search_store_names=[file_search_store_id]
                            )
                        )
                    ]
                )
            )
            
            # Extract answer text
            answer = response.text if response.text else "No answer generated"
            
            # Parse citations from grounding metadata
            citations = []
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'grounding_metadata') and candidate.grounding_metadata:
                    metadata = candidate.grounding_metadata
                    
                    # Extract grounding supports (citations)
                    if hasattr(metadata, 'grounding_supports'):
                        for support in metadata.grounding_supports:
                            # Get cited text and location
                            if hasattr(support, 'segment'):
                                segment = support.segment
                                cited_text = segment.text if hasattr(segment, 'text') else ""
                                
                                # Try to extract page number from chunks
                                page_num = None
                                if hasattr(support, 'grounding_chunk_indices') and support.grounding_chunk_indices:
                                    # Get the first chunk index
                                    chunk_idx = support.grounding_chunk_indices[0]
                                    if hasattr(metadata, 'grounding_chunks') and chunk_idx < len(metadata.grounding_chunks):
                                        chunk = metadata.grounding_chunks[chunk_idx]
                                        # Extract page number if available
                                        if hasattr(chunk, 'page_number'):
                                            page_num = chunk.page_number
                                
                                citations.append({
                                    "text": cited_text,
                                    "page_number": page_num,
                                    "confidence": 0.95  # Default confidence
                                })
            
            return {
                "document_id": document_id,
                "answer": answer,
                "citations": citations
            }
            
        except Exception as e:
            raise Exception(f"Failed to query with citations: {str(e)}")
    
    def get_store_id(self, document_id: str) -> Optional[str]:
        """Get the File Search store ID for a document"""
        return self.store_mappings.get(document_id)


# Create singleton instance
file_search_service = FileSearchService()