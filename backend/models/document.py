from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional, List, Dict
import uuid


class Document(BaseModel):
    document_id: str = Field(default_factory=lambda: f"doc_{uuid.uuid4().hex[:12]}")
    portfolio_id: Optional[str] = None
    trust_profile_id: Optional[str] = None
    user_id: str
    template_id: Optional[str] = None
    title: str
    document_type: str  # declaration_of_trust, ttgd, notice_of_intent, affidavit, custom
    content: str = ""
    editor_content: Optional[Dict] = None
    rm_id: str = ""
    sub_record_id: str = ""
    status: str = "draft"
    is_locked: bool = False
    locked_at: Optional[datetime] = None
    locked_by: Optional[str] = None
    # Amendment fields
    is_amendment: bool = False
    amends_document_id: Optional[str] = None
    amendment_number: int = 0
    is_controlling: bool = True
    amended_by_id: Optional[str] = None
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
    chunk_id: str
    pdf_id: str
    pdf_name: str
    page_number: int
    content: str
    embedding: Optional[List[float]] = None
    metadata: dict = {}


class DocumentCreate(BaseModel):
    title: str
    document_type: str
    template_id: Optional[str] = None
    portfolio_id: Optional[str] = None
    content: str = ""
    tags: List[str] = []
    folder: str = "/"
    subject_code: Optional[str] = None


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    folder: Optional[str] = None
    status: Optional[str] = None
