"""
Extraction management endpoints
"""
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from ..models import (
    User, Extraction, ExtractionCreate, ExtractionResponse, db
)
from ..auth import get_current_user
from ..rate_limiter import rate_limiter
from ..config import settings

router = APIRouter(prefix="/api/extractions", tags=["extractions"])


@router.post("", response_model=ExtractionResponse, status_code=status.HTTP_201_CREATED)
async def create_extraction(
    extraction_data: ExtractionCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new extraction"""
    rate_limiter.check_rate_limit(f"extractions:{current_user.id}", settings.RATE_LIMIT_PER_MINUTE)
    
    document = db.documents.get(extraction_data.document_id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    if document.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create extraction for this document"
        )
    
    extraction_id = db.generate_id()
    now = datetime.now(timezone.utc)
    
    extraction = Extraction(
        id=extraction_id,
        document_id=extraction_data.document_id,
        user_id=current_user.id,
        field_name=extraction_data.field_name,
        text=extraction_data.text,
        page=extraction_data.page,
        coordinates=extraction_data.coordinates,
        method=extraction_data.method,
        timestamp=now
    )
    
    db.extractions[extraction_id] = extraction
    
    if extraction_data.document_id not in db.extractions_by_document:
        db.extractions_by_document[extraction_data.document_id] = []
    db.extractions_by_document[extraction_data.document_id].append(extraction_id)
    
    if current_user.id not in db.extractions_by_user:
        db.extractions_by_user[current_user.id] = []
    db.extractions_by_user[current_user.id].append(extraction_id)
    
    return ExtractionResponse(**extraction.dict())


@router.get("", response_model=List[ExtractionResponse])
async def list_extractions(
    document_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """List all extractions for current user, optionally filtered by document"""
    if document_id:
        document = db.documents.get(document_id)
        if not document or document.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this document"
            )
        
        extraction_ids = db.extractions_by_document.get(document_id, [])
    else:
        extraction_ids = db.extractions_by_user.get(current_user.id, [])
    
    extractions = [db.extractions[ext_id] for ext_id in extraction_ids if ext_id in db.extractions]
    
    return [ExtractionResponse(**extraction.dict()) for extraction in extractions]


@router.get("/{extraction_id}", response_model=ExtractionResponse)
async def get_extraction(extraction_id: str, current_user: User = Depends(get_current_user)):
    """Get specific extraction"""
    extraction = db.extractions.get(extraction_id)
    
    if not extraction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Extraction not found"
        )
    
    if extraction.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this extraction"
        )
    
    return ExtractionResponse(**extraction.dict())


@router.delete("/{extraction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_extraction(extraction_id: str, current_user: User = Depends(get_current_user)):
    """Delete an extraction"""
    extraction = db.extractions.get(extraction_id)
    
    if not extraction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Extraction not found"
        )
    
    if extraction.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this extraction"
        )
    
    del db.extractions[extraction_id]
    
    if extraction.document_id in db.extractions_by_document:
        db.extractions_by_document[extraction.document_id] = [
            ext_id for ext_id in db.extractions_by_document[extraction.document_id]
            if ext_id != extraction_id
        ]
    
    if current_user.id in db.extractions_by_user:
        db.extractions_by_user[current_user.id] = [
            ext_id for ext_id in db.extractions_by_user[current_user.id]
            if ext_id != extraction_id
        ]
    
    return None
