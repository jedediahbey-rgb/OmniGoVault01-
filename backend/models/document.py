"""Document models"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid


class Document(BaseModel):
    document_id: str = Field(default_factory=lambda: f"doc_{uuid.uuid4().hex[:12]}")
    portfolio_id: str
    user_id: str
    title: str
    content: str = ""
    document_type: str = "general"
    status: str = "draft"
    template_id: Optional[str] = None
    # RM-ID tracking
    rm_id: str = ""
    sub_record_id: str = ""
    # Lock/finalization
    is_locked: bool = False
    locked_at: Optional[datetime] = None
    locked_by: Optional[str] = None
    tags: List[str] = []
    folder: str = "/"
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    is_pinned: bool = False
    pinned_at: Optional[datetime] = None
    last_accessed: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    access_count: int = 0
    version: int = 1
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DocumentVersion(BaseModel):
    version_id: str = Field(default_factory=lambda: f"ver_{uuid.uuid4().hex[:12]}")
    document_id: str
    version_number: int
    content: str
    changed_by: str
    change_summary: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PDFChunk(BaseModel):
    chunk_id: str = Field(default_factory=lambda: f"chunk_{uuid.uuid4().hex[:12]}")
    pdf_source: str
    page_number: int
    chunk_index: int
    text: str
    metadata: dict = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
