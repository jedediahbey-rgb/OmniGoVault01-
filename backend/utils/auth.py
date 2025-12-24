from fastapi import Request, HTTPException
from typing import Optional
from datetime import datetime, timezone
from .db import db
from models.user import User


async def get_current_user(request: Request) -> User:
    """Get the current authenticated user from session cookie"""
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.sessions.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiration
    expires_at = session.get("expires_at")
    if expires_at:
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        if expires_at < datetime.now(timezone.utc):
            await db.sessions.delete_one({"session_id": session_id})
            raise HTTPException(status_code=401, detail="Session expired")
    
    user_data = await db.users.find_one({"user_id": session["user_id"]})
    if not user_data:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**{k: v for k, v in user_data.items() if k != '_id'})


async def get_optional_user(request: Request) -> Optional[User]:
    """Get the current user if authenticated, otherwise return None"""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None
