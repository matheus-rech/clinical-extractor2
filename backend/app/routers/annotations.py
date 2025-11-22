"""
Annotation management endpoints
"""
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from ..models import (
    User, Annotation, AnnotationCreate, AnnotationUpdate, AnnotationResponse, db
)
from ..auth import get_current_user
from ..rate_limiter import rate_limiter
from ..config import settings

router = APIRouter(prefix="/api/annotations", tags=["annotations"])


@router.post("", response_model=AnnotationResponse, status_code=status.HTTP_201_CREATED)
async def create_annotation(
    annotation_data: AnnotationCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new annotation"""
    rate_limiter.check_rate_limit(f"annotations:{current_user.id}", settings.RATE_LIMIT_PER_MINUTE)
    
    document = db.documents.get(annotation_data.document_id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    if document.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create annotation for this document"
        )
    
    annotation_id = db.generate_id()
    now = datetime.now(timezone.utc)
    
    annotation = Annotation(
        id=annotation_id,
        document_id=annotation_data.document_id,
        user_id=current_user.id,
        page_num=annotation_data.page_num,
        type=annotation_data.type,
        coordinates=annotation_data.coordinates,
        content=annotation_data.content,
        color=annotation_data.color,
        created_at=now
    )
    
    db.annotations[annotation_id] = annotation
    
    if annotation_data.document_id not in db.annotations_by_document:
        db.annotations_by_document[annotation_data.document_id] = []
    db.annotations_by_document[annotation_data.document_id].append(annotation_id)
    
    if current_user.id not in db.annotations_by_user:
        db.annotations_by_user[current_user.id] = []
    db.annotations_by_user[current_user.id].append(annotation_id)
    
    return AnnotationResponse(**annotation.dict())


@router.get("", response_model=List[AnnotationResponse])
async def list_annotations(
    document_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """List all annotations for current user, optionally filtered by document"""
    if document_id:
        document = db.documents.get(document_id)
        if not document or document.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this document"
            )
        
        annotation_ids = db.annotations_by_document.get(document_id, [])
    else:
        annotation_ids = db.annotations_by_user.get(current_user.id, [])
    
    annotations = [db.annotations[ann_id] for ann_id in annotation_ids if ann_id in db.annotations]
    
    return [AnnotationResponse(**annotation.dict()) for annotation in annotations]


@router.get("/{annotation_id}", response_model=AnnotationResponse)
async def get_annotation(annotation_id: str, current_user: User = Depends(get_current_user)):
    """Get specific annotation"""
    annotation = db.annotations.get(annotation_id)
    
    if not annotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Annotation not found"
        )
    
    if annotation.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this annotation"
        )
    
    return AnnotationResponse(**annotation.dict())


@router.put("/{annotation_id}", response_model=AnnotationResponse)
async def update_annotation(
    annotation_id: str,
    annotation_data: AnnotationUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update an annotation"""
    annotation = db.annotations.get(annotation_id)
    
    if not annotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Annotation not found"
        )
    
    if annotation.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this annotation"
        )
    
    if annotation_data.coordinates is not None:
        annotation.coordinates = annotation_data.coordinates
    if annotation_data.content is not None:
        annotation.content = annotation_data.content
    if annotation_data.color is not None:
        annotation.color = annotation_data.color
    
    db.annotations[annotation_id] = annotation
    
    return AnnotationResponse(**annotation.dict())


@router.delete("/{annotation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_annotation(annotation_id: str, current_user: User = Depends(get_current_user)):
    """Delete an annotation"""
    annotation = db.annotations.get(annotation_id)
    
    if not annotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Annotation not found"
        )
    
    if annotation.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this annotation"
        )
    
    del db.annotations[annotation_id]
    
    if annotation.document_id in db.annotations_by_document:
        db.annotations_by_document[annotation.document_id] = [
            ann_id for ann_id in db.annotations_by_document[annotation.document_id]
            if ann_id != annotation_id
        ]
    
    if current_user.id in db.annotations_by_user:
        db.annotations_by_user[current_user.id] = [
            ann_id for ann_id in db.annotations_by_user[current_user.id]
            if ann_id != annotation_id
        ]
    
    return None
