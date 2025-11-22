"""
In-memory database models for the application
"""
from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, EmailStr, validator
import uuid



class User(BaseModel):
    """User model"""
    id: str
    email: EmailStr
    password_hash: str
    created_at: datetime
    updated_at: datetime


class UserCreate(BaseModel):
    """User creation request"""
    email: EmailStr
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v


class UserResponse(BaseModel):
    """User response (without password)"""
    id: str
    email: EmailStr
    created_at: datetime


class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token payload data"""
    email: Optional[str] = None



class Document(BaseModel):
    """Document model"""
    id: str
    user_id: str
    filename: str
    total_pages: int
    upload_date: datetime
    pdf_data: str  # Base64 encoded PDF data
    metadata: Dict[str, Any] = {}


class DocumentCreate(BaseModel):
    """Document creation request"""
    filename: str
    total_pages: int
    pdf_data: str
    metadata: Dict[str, Any] = {}


class DocumentResponse(BaseModel):
    """Document response (without PDF data)"""
    id: str
    user_id: str
    filename: str
    total_pages: int
    upload_date: datetime
    metadata: Dict[str, Any]


class DocumentDetail(BaseModel):
    """Document detail response (with PDF data)"""
    id: str
    user_id: str
    filename: str
    total_pages: int
    upload_date: datetime
    pdf_data: str
    metadata: Dict[str, Any]



class Coordinates(BaseModel):
    """Coordinates for text extraction"""
    x: float
    y: float
    width: float
    height: float


class Extraction(BaseModel):
    """Extraction model"""
    id: str
    document_id: str
    user_id: str
    field_name: str
    text: str
    page: int
    coordinates: Coordinates
    method: str  # 'manual', 'gemini-pico', 'gemini-summary', etc.
    timestamp: datetime


class ExtractionCreate(BaseModel):
    """Extraction creation request"""
    document_id: str
    field_name: str
    text: str
    page: int
    coordinates: Coordinates
    method: str


class ExtractionResponse(BaseModel):
    """Extraction response"""
    id: str
    document_id: str
    user_id: str
    field_name: str
    text: str
    page: int
    coordinates: Coordinates
    method: str
    timestamp: datetime



class Annotation(BaseModel):
    """Annotation model"""
    id: str
    document_id: str
    user_id: str
    page_num: int
    type: str  # 'highlight', 'note', 'rectangle', 'circle', 'arrow', 'freehand'
    coordinates: Dict[str, Any]
    content: str
    color: str
    created_at: datetime


class AnnotationCreate(BaseModel):
    """Annotation creation request"""
    document_id: str
    page_num: int
    type: str
    coordinates: Dict[str, Any]
    content: str
    color: str


class AnnotationUpdate(BaseModel):
    """Annotation update request"""
    coordinates: Optional[Dict[str, Any]] = None
    content: Optional[str] = None
    color: Optional[str] = None


class AnnotationResponse(BaseModel):
    """Annotation response"""
    id: str
    document_id: str
    user_id: str
    page_num: int
    type: str
    coordinates: Dict[str, Any]
    content: str
    color: str
    created_at: datetime



class PICORequest(BaseModel):
    """PICO-T generation request"""
    document_id: Optional[str] = None
    pdf_text: str


class PICOResponse(BaseModel):
    """PICO-T generation response"""
    population: str
    intervention: str
    comparator: str
    outcomes: str
    timing: str
    study_type: str


class SummaryRequest(BaseModel):
    """Summary generation request"""
    document_id: Optional[str] = None
    pdf_text: str


class SummaryResponse(BaseModel):
    """Summary generation response"""
    summary: str


class ValidationRequest(BaseModel):
    """Field validation request"""
    document_id: Optional[str] = None
    field_id: str
    field_value: str
    pdf_text: str


class ValidationResponse(BaseModel):
    """Field validation response"""
    is_supported: bool
    quote: str
    confidence: float


class MetadataRequest(BaseModel):
    """Metadata extraction request"""
    document_id: Optional[str] = None
    pdf_text: str


class MetadataResponse(BaseModel):
    """Metadata extraction response"""
    doi: Optional[str] = None
    pmid: Optional[str] = None
    journal: Optional[str] = None
    year: Optional[int] = None


class TableExtractionRequest(BaseModel):
    """Table extraction request"""
    document_id: Optional[str] = None
    pdf_text: str


class TableData(BaseModel):
    """Table data structure"""
    title: str
    description: str
    data: List[List[str]]


class TableExtractionResponse(BaseModel):
    """Table extraction response"""
    tables: List[TableData]


class ImageAnalysisRequest(BaseModel):
    """Image analysis request"""
    document_id: Optional[str] = None
    image_base64: str
    prompt: str


class ImageAnalysisResponse(BaseModel):
    """Image analysis response"""
    analysis: str


class DeepAnalysisRequest(BaseModel):
    """Deep analysis request"""
    document_id: Optional[str] = None
    pdf_text: str
    prompt: str


class DeepAnalysisResponse(BaseModel):
    """Deep analysis response"""
    analysis: str


# Citation Models for Gemini File Search
class FileUploadRequest(BaseModel):
    """Request to upload PDF to File Search store"""
    document_id: str
    pdf_data: str  # Base64 encoded PDF
    filename: str


class FileUploadResponse(BaseModel):
    """Response from file upload"""
    document_id: str
    file_search_store_id: str
    message: str


class CitationQuery(BaseModel):
    """Citation text snippet with metadata"""
    text: str
    page_number: Optional[int] = None
    confidence: Optional[float] = None


class QueryWithCitationsRequest(BaseModel):
    """Request to query with citations"""
    document_id: str
    file_search_store_id: str
    query: str


class QueryWithCitationsResponse(BaseModel):
    """Response with answer and citations"""
    document_id: str
    answer: str
    citations: List[CitationQuery] = []


class PDFLibraryItem(BaseModel):
    """PDF Library Item - Fixed set of PDFs available to all users"""
    id: str
    title: str
    filename: str
    pdf_data: str  # Base64 encoded PDF data
    total_pages: int
    description: Optional[str] = None
    created_at: datetime


class PDFLibraryItemResponse(BaseModel):
    """PDF Library Item response (without PDF data for listing)"""
    id: str
    title: str
    filename: str
    total_pages: int
    description: Optional[str] = None


class PDFLibraryItemDetail(BaseModel):
    """PDF Library Item detail (with PDF data)"""
    id: str
    title: str
    filename: str
    pdf_data: str
    total_pages: int
    description: Optional[str] = None


class InMemoryDatabase:
    """Simple in-memory database for proof of concept"""
    
    def __init__(self):
        self.users: Dict[str, User] = {}
        self.documents: Dict[str, Document] = {}
        self.extractions: Dict[str, Extraction] = {}
        self.annotations: Dict[str, Annotation] = {}
        self.pdf_library: Dict[str, PDFLibraryItem] = {}  # Fixed library of PDFs
        
        self.users_by_email: Dict[str, str] = {}  # email -> user_id
        self.documents_by_user: Dict[str, List[str]] = {}  # user_id -> [document_ids]
        self.extractions_by_document: Dict[str, List[str]] = {}  # document_id -> [extraction_ids]
        self.extractions_by_user: Dict[str, List[str]] = {}  # user_id -> [extraction_ids]
        self.annotations_by_document: Dict[str, List[str]] = {}  # document_id -> [annotation_ids]
        self.annotations_by_user: Dict[str, List[str]] = {}  # user_id -> [annotation_ids]
    
    def generate_id(self) -> str:
        """Generate a unique ID"""
        return str(uuid.uuid4())


db = InMemoryDatabase()
