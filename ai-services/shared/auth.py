# ai-services/shared/auth.py — API Key authentication dependency
import os
from fastapi import Header, HTTPException, status

API_KEY = os.getenv("API_KEY", "internal_key")


async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key"
        )
