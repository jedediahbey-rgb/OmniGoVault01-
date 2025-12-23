"""Authentication utilities"""
from fastapi import Request, HTTPException
from typing import Optional
from datetime import datetime, timezone
from database import db
from models.user import User


async def get_current_user(request: Request) -> User:
    """Get current authenticated user from session"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": session_token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    if datetime.fromisoformat(session["expires_at"].replace("Z", "+00:00")) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_data = await db.users.find_one({"user_id": session["user_id"]})
    if not user_data:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(
        user_id=user_data["user_id"],
        email=user_data["email"],
        name=user_data["name"],
        picture=user_data.get("picture")
    )


async def get_optional_user(request: Request) -> Optional[User]:
    """Get current user if authenticated, otherwise return None"""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None
