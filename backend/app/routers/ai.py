"""
AI proxy endpoints - Securely proxy AI API calls with fallback support
This is the critical security fix: API keys are now server-side only
Supports Gemini (primary) with Anthropic Claude fallback
"""
import json
from fastapi import APIRouter, HTTPException, status, Depends
from ..models import (
    User,
    PICORequest, PICOResponse,
    SummaryRequest, SummaryResponse,
    ValidationRequest, ValidationResponse,
    MetadataRequest, MetadataResponse,
    TableExtractionRequest, TableExtractionResponse,
    ImageAnalysisRequest, ImageAnalysisResponse,
    DeepAnalysisRequest, DeepAnalysisResponse,
    FileUploadRequest, FileUploadResponse,
    QueryWithCitationsRequest, QueryWithCitationsResponse
)
from ..auth import get_current_user
from ..config import settings
from ..rate_limiter import rate_limiter
from ..services.llm import generate_text, parse_json_strict
from ..services.file_search import file_search_service

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/generate-pico", response_model=PICOResponse)
async def generate_pico(request: PICORequest, current_user: User = Depends(get_current_user)):
    """Generate PICO-T extraction using AI with fallback support"""
    rate_limiter.check_rate_limit(f"ai:{current_user.id}", settings.AI_RATE_LIMIT_PER_MINUTE)
    
    # Validate input size (max 1MB of text)
    if len(request.pdf_text) > 1_000_000:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="PDF text too large. Maximum size is 1MB."
        )
    
    try:
        prompt = f"""You are a clinical research data extraction expert. Extract PICO-T elements from this research paper.

DOCUMENT TEXT:
{request.pdf_text[:15000]}

Extract the following in JSON format:
{{
    "population": "Description of study population",
    "intervention": "Primary intervention or exposure",
    "comparator": "Control or comparison group",
    "outcomes": "Primary and secondary outcomes",
    "timing": "Study duration and follow-up periods",
    "study_type": "Study design (RCT, cohort, case-control, etc.)"
}}

Return ONLY valid JSON, no additional text."""

        response_text = generate_text(
            prompt=prompt,
            require_json=True,
            temperature=0.2,
            max_output_tokens=2048
        )
        
        result = parse_json_strict(response_text)
        
        return PICOResponse(**result)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI generation failed: {str(e)}"
        )


@router.post("/generate-summary", response_model=SummaryResponse)
async def generate_summary(request: SummaryRequest, current_user: User = Depends(get_current_user)):
    """Generate document summary using AI with fallback support"""
    rate_limiter.check_rate_limit(f"ai:{current_user.id}", settings.AI_RATE_LIMIT_PER_MINUTE)
    
    try:
        prompt = f"""Summarize the key findings of this clinical research paper in 2-3 paragraphs.

DOCUMENT TEXT:
{request.pdf_text[:15000]}

Provide a clear, concise summary focusing on:
1. Study objective and design
2. Main findings and results
3. Clinical implications"""

        response_text = generate_text(
            prompt=prompt,
            require_json=False,
            temperature=0.3,
            max_output_tokens=2048
        )
        
        return SummaryResponse(summary=response_text)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI generation failed: {str(e)}"
        )


@router.post("/validate-field", response_model=ValidationResponse)
async def validate_field(request: ValidationRequest, current_user: User = Depends(get_current_user)):
    """Validate extracted field with AI with fallback support"""
    rate_limiter.check_rate_limit(f"ai:{current_user.id}", settings.AI_RATE_LIMIT_PER_MINUTE)
    
    try:
        prompt = f"""Validate if the following extracted value is supported by the document.

FIELD: {request.field_id}
EXTRACTED VALUE: {request.field_value}

DOCUMENT TEXT:
{request.pdf_text[:15000]}

Return JSON:
{{
    "is_supported": true/false,
    "quote": "Exact quote from document that supports or contradicts this",
    "confidence": 0.0-1.0
}}"""

        response_text = generate_text(
            prompt=prompt,
            require_json=True,
            temperature=0.2,
            max_output_tokens=2048
        )
        
        result = parse_json_strict(response_text)
        
        return ValidationResponse(**result)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI validation failed: {str(e)}"
        )


@router.post("/find-metadata", response_model=MetadataResponse)
async def find_metadata(request: MetadataRequest, current_user: User = Depends(get_current_user)):
    """Find document metadata (DOI, PMID, etc.) using AI with fallback support"""
    rate_limiter.check_rate_limit(f"ai:{current_user.id}", settings.AI_RATE_LIMIT_PER_MINUTE)
    
    try:
        prompt = f"""Extract bibliographic metadata from this research paper.

DOCUMENT TEXT:
{request.pdf_text[:5000]}

Return JSON:
{{
    "doi": "DOI if found (format: 10.xxxx/xxxxx)",
    "pmid": "PubMed ID if found (numeric only)",
    "journal": "Journal name",
    "year": publication year (integer)
}}

Return null for fields not found."""

        response_text = generate_text(
            prompt=prompt,
            require_json=True,
            temperature=0.1,
            max_output_tokens=1024
        )
        
        result = parse_json_strict(response_text)
        
        return MetadataResponse(**result)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI metadata extraction failed: {str(e)}"
        )


@router.post("/extract-tables", response_model=TableExtractionResponse)
async def extract_tables(request: TableExtractionRequest, current_user: User = Depends(get_current_user)):
    """Extract tables from document using AI with fallback support"""
    rate_limiter.check_rate_limit(f"ai:{current_user.id}", settings.AI_RATE_LIMIT_PER_MINUTE)
    
    try:
        prompt = f"""Extract all tables from this research paper.

DOCUMENT TEXT:
{request.pdf_text[:15000]}

Return JSON array:
{{
    "tables": [
        {{
            "title": "Table title or caption",
            "description": "Brief description of table contents",
            "data": [["header1", "header2"], ["row1col1", "row1col2"]]
        }}
    ]
}}"""

        response_text = generate_text(
            prompt=prompt,
            require_json=True,
            temperature=0.2,
            max_output_tokens=2048
        )
        
        result = parse_json_strict(response_text)
        
        return TableExtractionResponse(**result)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI table extraction failed: {str(e)}"
        )


@router.post("/analyze-image", response_model=ImageAnalysisResponse)
async def analyze_image(request: ImageAnalysisRequest, current_user: User = Depends(get_current_user)):
    """Analyze image with AI with fallback support"""
    rate_limiter.check_rate_limit(f"ai:{current_user.id}", settings.AI_RATE_LIMIT_PER_MINUTE)
    
    try:
        response_text = generate_text(
            prompt=request.prompt,
            require_json=False,
            temperature=0.3,
            max_output_tokens=2048,
            image_base64=request.image_base64
        )
        
        return ImageAnalysisResponse(analysis=response_text)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI image analysis failed: {str(e)}"
        )


@router.post("/deep-analysis", response_model=DeepAnalysisResponse)
async def deep_analysis(request: DeepAnalysisRequest, current_user: User = Depends(get_current_user)):
    """Perform deep analysis with AI with fallback support"""
    rate_limiter.check_rate_limit(f"ai:{current_user.id}", settings.AI_RATE_LIMIT_PER_MINUTE)
    
    try:
        prompt = f"""{request.prompt}

DOCUMENT TEXT:
{request.pdf_text[:15000]}"""

        response_text = generate_text(
            prompt=prompt,
            require_json=False,
            temperature=0.3,
            max_output_tokens=2048
        )
        
        return DeepAnalysisResponse(analysis=response_text)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI deep analysis failed: {str(e)}"
        )


@router.post("/upload-pdf", response_model=FileUploadResponse)
async def upload_pdf_to_file_search(
    request: FileUploadRequest,
    current_user: User = Depends(get_current_user)
):
    """Upload a PDF to Gemini File Search store for citation-enabled queries"""
    rate_limiter.check_rate_limit(f"ai:{current_user.id}", settings.AI_RATE_LIMIT_PER_MINUTE)
    
    # Validate input size (max 10MB for PDF)
    if len(request.pdf_data) > 10_000_000:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="PDF too large. Maximum size is 10MB."
        )
    
    try:
        result = await file_search_service.upload_pdf_to_file_search(
            document_id=request.document_id,
            pdf_base64=request.pdf_data,
            filename=request.filename
        )
        
        return FileUploadResponse(
            document_id=request.document_id,
            file_search_store_id=result["file_search_store_id"],
            message=result["message"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload PDF: {str(e)}"
        )


@router.post("/query-with-citations", response_model=QueryWithCitationsResponse)
async def query_with_citations(
    request: QueryWithCitationsRequest,
    current_user: User = Depends(get_current_user)
):
    """Query a document and get answer with citations using File Search"""
    rate_limiter.check_rate_limit(f"ai:{current_user.id}", settings.AI_RATE_LIMIT_PER_MINUTE)
    
    try:
        result = await file_search_service.query_with_citations(
            document_id=request.document_id,
            file_search_store_id=request.file_search_store_id,
            query=request.query
        )
        
        return QueryWithCitationsResponse(**result)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query with citations failed: {str(e)}"
        )
