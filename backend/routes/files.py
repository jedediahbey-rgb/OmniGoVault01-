"""
File Upload Routes
Handles file uploads for various application features
"""

from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form
from typing import Optional
import os
import uuid
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/files", tags=["Files"])

# Get database reference
_db = None

def init_files_routes(db):
    global _db
    _db = db

# File storage directory
UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Allowed file types
ALLOWED_EXTENSIONS = {
    'image/jpeg': '.jpg',
    'image/png': '.png', 
    'image/webp': '.webp',
    'application/pdf': '.pdf'
}

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

async def _get_current_user(request: Request):
    """Get current user from session"""
    from server import get_current_user
    return await get_current_user(request)

@router.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    category: str = Form("general"),
    portfolio_id: Optional[str] = Form(None)
):
    """
    Upload a file
    
    Categories:
    - rm_id_evidence: RM-ID sticker photos/receipts
    - document_attachment: General document attachments
    - general: Other files
    """
    user = await _get_current_user(request)
    
    # Validate file type
    content_type = file.content_type
    if content_type not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS.keys())}"
        )
    
    # Read file content
    content = await file.read()
    
    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Generate unique file ID and path
    file_id = f"file_{uuid.uuid4().hex[:12]}"
    extension = ALLOWED_EXTENSIONS[content_type]
    filename = f"{file_id}{extension}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Save file
    try:
        with open(filepath, "wb") as f:
            f.write(content)
    except Exception as e:
        logger.error(f"Failed to save file: {e}")
        raise HTTPException(status_code=500, detail="Failed to save file")
    
    # Create file record in database
    file_record = {
        "file_id": file_id,
        "user_id": user.user_id,
        "portfolio_id": portfolio_id,
        "category": category,
        "original_filename": file.filename,
        "filename": filename,
        "filepath": filepath,
        "content_type": content_type,
        "file_size": len(content),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_deleted": False
    }
    
    await _db.files.insert_one(file_record)
    
    logger.info(f"File uploaded: {file_id} by user {user.user_id}")
    
    return {
        "file_id": file_id,
        "filename": file.filename,
        "content_type": content_type,
        "file_size": len(content)
    }

@router.get("/{file_id}")
async def get_file_info(request: Request, file_id: str):
    """Get file metadata"""
    user = await _get_current_user(request)
    
    file_record = await _db.files.find_one(
        {"file_id": file_id, "is_deleted": False},
        {"_id": 0}
    )
    
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check access - user must own the file or be in same portfolio
    if file_record["user_id"] != user.user_id:
        # Could add portfolio-based access check here
        raise HTTPException(status_code=403, detail="Access denied")
    
    return file_record

@router.delete("/{file_id}")
async def delete_file(request: Request, file_id: str):
    """Delete a file (soft delete)"""
    user = await _get_current_user(request)
    
    file_record = await _db.files.find_one(
        {"file_id": file_id, "is_deleted": False}
    )
    
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check ownership
    if file_record["user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Soft delete
    await _db.files.update_one(
        {"file_id": file_id},
        {"$set": {"is_deleted": True, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Optionally delete the actual file
    try:
        if os.path.exists(file_record["filepath"]):
            os.remove(file_record["filepath"])
    except Exception as e:
        logger.warning(f"Failed to delete file from disk: {e}")
    
    logger.info(f"File deleted: {file_id} by user {user.user_id}")
    
    return {"success": True, "file_id": file_id}

@router.get("/portfolio/{portfolio_id}")
async def list_portfolio_files(request: Request, portfolio_id: str, category: Optional[str] = None):
    """List files for a portfolio"""
    # Verify user is authenticated
    await _get_current_user(request)
    
    query = {
        "portfolio_id": portfolio_id,
        "is_deleted": False
    }
    
    if category:
        query["category"] = category
    
    files = await _db.files.find(query, {"_id": 0}).to_list(100)
    
    return {"files": files}
