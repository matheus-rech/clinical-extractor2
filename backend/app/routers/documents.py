"""
Document management endpoints
"""
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from ..models import (
    User, Document, DocumentCreate, DocumentResponse, DocumentDetail, db
)
from ..auth import get_current_user
from ..rate_limiter import rate_limiter
from ..config import settings

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    document_data: DocumentCreate,
    current_user: User = Depends(get_current_user)
):
    """Upload a new document"""
    rate_limiter.check_rate_limit(f"documents:{current_user.id}", settings.RATE_LIMIT_PER_MINUTE)
    
    document_id = db.generate_id()
    now = datetime.now(timezone.utc)
    
    document = Document(
        id=document_id,
        user_id=current_user.id,
        filename=document_data.filename,
        total_pages=document_data.total_pages,
        upload_date=now,
        pdf_data=document_data.pdf_data,
        metadata=document_data.metadata
    )
    
    db.documents[document_id] = document
    
    if current_user.id not in db.documents_by_user:
        db.documents_by_user[current_user.id] = []
    db.documents_by_user[current_user.id].append(document_id)
    
    return DocumentResponse(
        id=document.id,
        user_id=document.user_id,
        filename=document.filename,
        total_pages=document.total_pages,
        upload_date=document.upload_date,
        metadata=document.metadata
    )


@router.get("", response_model=List[DocumentResponse])
async def list_documents(current_user: User = Depends(get_current_user)):
    """List all documents for current user"""
    document_ids = db.documents_by_user.get(current_user.id, [])
    documents = [db.documents[doc_id] for doc_id in document_ids if doc_id in db.documents]
    
    return [
        DocumentResponse(
            id=doc.id,
            user_id=doc.user_id,
            filename=doc.filename,
            total_pages=doc.total_pages,
            upload_date=doc.upload_date,
            metadata=doc.metadata
        )
        for doc in documents
    ]


@router.get("/{document_id}", response_model=DocumentDetail)
async def get_document(document_id: str, current_user: User = Depends(get_current_user)):
    """Get specific document with PDF data"""
    document = db.documents.get(document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this document"
        )
    
    return DocumentDetail(
        id=document.id,
        user_id=document.user_id,
        filename=document.filename,
        total_pages=document.total_pages,
        upload_date=document.upload_date,
        pdf_data=document.pdf_data,
        metadata=document.metadata
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(document_id: str, current_user: User = Depends(get_current_user)):
    """Delete a document"""
    document = db.documents.get(document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this document"
        )
    
    del db.documents[document_id]
    
    if current_user.id in db.documents_by_user:
        db.documents_by_user[current_user.id] = [
            doc_id for doc_id in db.documents_by_user[current_user.id]
            if doc_id != document_id
        ]
    
    extraction_ids = db.extractions_by_document.get(document_id, [])
    for extraction_id in extraction_ids:
        if extraction_id in db.extractions:
            del db.extractions[extraction_id]
    if document_id in db.extractions_by_document:
        del db.extractions_by_document[document_id]
    
    annotation_ids = db.annotations_by_document.get(document_id, [])
    for annotation_id in annotation_ids:
        if annotation_id in db.annotations:
            del db.annotations[annotation_id]
    if document_id in db.annotations_by_document:
        del db.annotations_by_document[document_id]
    
    return None
