
"""
PDF Library management endpoints
Fixed library of PDFs available to all users
"""
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone
from ..models import (
    User, PDFLibraryItem, PDFLibraryItemResponse, PDFLibraryItemDetail, db
)
from ..auth import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/api/pdf-library", tags=["pdf-library"])


class PDFLibraryUploadRequest(BaseModel):
    """Request to add a PDF to the library"""
    title: str
    filename: str
    pdf_data: str  # Base64 encoded with data:application/pdf;base64, prefix
    total_pages: int
    description: str = None


@router.get("", response_model=List[PDFLibraryItemResponse])
async def list_library_pdfs(current_user: User = Depends(get_current_user)):
    """List all PDFs in the library (without PDF data)"""
    items = list(db.pdf_library.values())
    
    return [
        PDFLibraryItemResponse(
            id=item.id,
            title=item.title,
            filename=item.filename,
            total_pages=item.total_pages,
            description=item.description
        )
        for item in items
    ]


@router.get("/{library_id}", response_model=PDFLibraryItemDetail)
async def get_library_pdf(library_id: str, current_user: User = Depends(get_current_user)):
    """Get specific PDF from library with full data"""
    item = db.pdf_library.get(library_id)
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF not found in library"
        )
    
    return PDFLibraryItemDetail(
        id=item.id,
        title=item.title,
        filename=item.filename,
        pdf_data=item.pdf_data,
        total_pages=item.total_pages,
        description=item.description
    )


@router.post("/upload", response_model=PDFLibraryItemResponse)
async def upload_pdf_to_library(
    request: PDFLibraryUploadRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Admin endpoint: Upload a new PDF to the library
    
    This allows you to add PDFs dynamically without restarting the backend.
    The PDF data should be base64-encoded with the data URI prefix:
    data:application/pdf;base64,<base64_data>
    """
    # Generate unique ID
    library_id = f"library_{db.generate_id()}"
    
    # Validate PDF data format
    if not request.pdf_data.startswith("data:application/pdf;base64,"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PDF data must be base64-encoded with data URI prefix"
        )
    
    # Create library item
    now = datetime.now(timezone.utc)
    library_item = PDFLibraryItem(
        id=library_id,
        title=request.title,
        filename=request.filename,
        pdf_data=request.pdf_data,
        total_pages=request.total_pages,
        description=request.description,
        created_at=now
    )
    
    # Add to library
    db.pdf_library[library_id] = library_item
    
    print(f"✅ Added new PDF to library: {request.title} (ID: {library_id})")
    
    return PDFLibraryItemResponse(
        id=library_item.id,
        title=library_item.title,
        filename=library_item.filename,
        total_pages=library_item.total_pages,
        description=library_item.description
    )


@router.delete("/{library_id}")
async def delete_library_pdf(
    library_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Admin endpoint: Delete a PDF from the library
    """
    if library_id not in db.pdf_library:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF not found in library"
        )
    
    deleted_item = db.pdf_library.pop(library_id)
    print(f"✅ Deleted PDF from library: {deleted_item.title} (ID: {library_id})")
    
    return {"message": f"Deleted {deleted_item.title} from library"}
