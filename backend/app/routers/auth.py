"""
Authentication endpoints
"""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from ..models import User, UserCreate, UserResponse, Token, db
from ..auth import (
    get_password_hash,
    authenticate_user,
    create_access_token,
    get_current_user
)
from ..config import settings
from ..rate_limiter import rate_limiter

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user"""
    rate_limiter.check_rate_limit(f"register:{user_data.email}", settings.RATE_LIMIT_PER_MINUTE)
    
    if user_data.email in db.users_by_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user_id = db.generate_id()
    now = datetime.now(timezone.utc)
    
    user = User(
        id=user_id,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        created_at=now,
        updated_at=now
    )
    
    db.users[user_id] = user
    db.users_by_email[user_data.email] = user_id
    
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return Token(access_token=access_token, token_type="bearer")


@router.post("/login", response_model=Token)
async def login(user_data: UserCreate):
    """Login existing user"""
    rate_limiter.check_rate_limit(f"login:{user_data.email}", settings.RATE_LIMIT_PER_MINUTE)
    
    user = authenticate_user(user_data.email, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        created_at=current_user.created_at
    )
