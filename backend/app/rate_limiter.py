"""
Rate limiting utilities using token bucket algorithm
"""
from datetime import datetime, timezone
from typing import Dict
from fastapi import HTTPException, status
import threading


class TokenBucket:
    """Token bucket for rate limiting"""
    
    def __init__(self, tokens_per_minute: int):
        self.tokens_per_minute = tokens_per_minute
        self.tokens = tokens_per_minute
        self.last_refill = datetime.now(timezone.utc)
        self._lock = threading.Lock()
    
    def refill(self):
        """Refill tokens based on time elapsed"""
        now = datetime.now(timezone.utc)
        elapsed = (now - self.last_refill).total_seconds()
        tokens_to_add = (elapsed / 60.0) * self.tokens_per_minute
        self.tokens = min(self.tokens_per_minute, self.tokens + tokens_to_add)
        self.last_refill = now
    
    def consume(self, tokens: int = 1) -> bool:
        """Try to consume tokens. Returns True if successful, False if rate limit exceeded"""
        with self._lock:
            self.refill()
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False


class RateLimiter:
    """Rate limiter for API endpoints"""
    
    def __init__(self):
        self.buckets: Dict[str, TokenBucket] = {}
    
    def check_rate_limit(self, key: str, tokens_per_minute: int, tokens: int = 1):
        """Check rate limit for a given key"""
        if key not in self.buckets:
            self.buckets[key] = TokenBucket(tokens_per_minute)
        
        if not self.buckets[key].consume(tokens):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Maximum {tokens_per_minute} requests per minute."
            )


rate_limiter = RateLimiter()
