from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
from io import BytesIO
import json
import hashlib
from bs4 import BeautifulSoup
import re
from PyPDF2 import PdfReader
from reportlab.lib.pagesizes import letter
import zipfile
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY

# Import modular components (new structure)
# Note: Models are still defined inline for now - will migrate gradually
# from models import *
# from services.rmid import normalize_rm_id, generate_subject_rm_id
# from utils.auth import get_current_user


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# PDF URLs - the source documents
PDF_SOURCES = {
    "roark": {
        "name": "Kingdom vs Empire",
        "url": "https://customer-assets.emergentagent.com/job_trustvault-1/artifacts/3ti3rrsm_Roark%20-%20Kindgom%20Vs%20Empire%20Feb%202020_compressed-1.pdf",
        "short_name": "Roark"
    },
    "pure_trust": {
        "name": "Pure Trust Under Equity",
        "url": "https://customer-assets.emergentagent.com/job_trustvault-1/artifacts/mx3a8y1s_pure%20trust%20under%20equity.pdf",
        "short_name": "Pure Trust"
    }
}


# ============ MODELS ============

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SessionData(BaseModel):
    session_token: str
    user_id: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Portfolio(BaseModel):
    portfolio_id: str = Field(default_factory=lambda: f"port_{uuid.uuid4().hex[:12]}")
    user_id: str
    name: str
    description: Optional[str] = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TrustProfile(BaseModel):
    profile_id: str = Field(default_factory=lambda: f"trust_{uuid.uuid4().hex[:12]}")
    portfolio_id: str
    user_id: str
    trust_name: str
    trust_identifier: Optional[str] = ""
    creation_date: Optional[str] = ""
    # Parties
    grantor_name: str = ""
    grantor_address: str = ""
    trustee_name: str = ""
    trustee_address: str = ""
    co_trustee_name: str = ""
    co_trustee_address: str = ""
    beneficiary_name: str = ""
    beneficiary_address: str = ""
    # Trust terms
    governing_statements: str = ""
    trust_term: str = ""
    renewal_terms: str = ""
    revocation_conditions: str = ""
    modification_conditions: str = ""
    extinguishment_conditions: str = ""
    conveyance_conditions: str = ""
    additional_notes: str = ""
    # Registered Mail ID System (Internal Recordkeeping) - Enhanced
    rm_id_raw: str = ""  # Exact user input (e.g., "RF 123 456 789 US")
    rm_id_normalized: str = ""  # Normalized: uppercase, no extra spaces (e.g., "RF123456789US")
    rm_id_is_placeholder: bool = False  # True if system-generated placeholder
    rm_record_id: str = ""  # Legacy field - kept for backward compatibility
    rm_series_start: str = ""  # e.g., "01.001"
    rm_series_end: str = ""  # e.g., "99.999"
    rm_next_series: int = 1  # Next available series number
    rm_evidence_files: List[str] = []  # Evidence uploads (sticker photos, receipts)
    # Tax IDs (Educational storage only)
    trust_ein: str = ""
    estate_ein: str = ""
    tax_classification: str = ""  # domestic/foreign - educational label only
    tax_notes: str = ""  # User-entered educational notes
    # Status
    status: str = "active"  # active, inactive, archived
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MailEvent(BaseModel):
    """Mail Event Log - Separate collection for registered mail tracking"""
    event_id: str = Field(default_factory=lambda: f"mail_{uuid.uuid4().hex[:12]}")
    trust_profile_id: str
    portfolio_id: str
    user_id: str
    rm_id: str  # Copy of RM-ID for fast search
    event_type: str  # created, sent, received, returned, other
    date: str
    from_party: str = ""
    to_party: str = ""
    purpose: str = ""
    evidence_files: List[str] = []
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Party(BaseModel):
    """Party directory for portfolios"""
    party_id: str = Field(default_factory=lambda: f"party_{uuid.uuid4().hex[:12]}")
    portfolio_id: str
    user_id: str
    name: str
    party_type: str  # individual, organization, trust, estate
    role: str = ""  # grantor, trustee, beneficiary, agent, other
    address: str = ""
    email: str = ""
    phone: str = ""
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AssetItem(BaseModel):
    asset_id: str = Field(default_factory=lambda: f"asset_{uuid.uuid4().hex[:12]}")
    portfolio_id: str
    user_id: str
    rm_id: str = ""  # Full RM-ID for the asset (e.g., RF123456789US-01.001)
    subject_code: str = "00"  # Subject category code (2-digit: "01", "02", etc.)
    subject_name: str = ""  # Name of the subject category (e.g., "Real Estate", "Vehicle", "Court Case")
    sequence_number: int = 1  # Sequence within category (.001, .002, .003...)
    asset_type: str  # real_property, personal_property, financial_account, intellectual_property, other
    description: str
    value: Optional[float] = None
    status: str = "active"  # active, transferred_in, transferred_out, released
    transaction_type: str = "deposit"  # deposit (into trust), withdrawal (from trust)
    notes: str = ""
    attachments: List[str] = []  # list of attachment IDs
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TrustLedgerEntry(BaseModel):
    """Track res (property) movements in and out of trust"""
    entry_id: str = Field(default_factory=lambda: f"ledger_{uuid.uuid4().hex[:12]}")
    portfolio_id: str
    user_id: str
    rm_id: str = ""  # Full RM-ID for this entry (e.g., RF123456789US-01.001)
    subject_code: str = "00"  # Subject category code (2-digit: "01", "02", etc.)
    subject_name: str = ""  # Name of the subject category
    sequence_number: int = 1  # Sequence within category (.001, .002, .003...)
    entry_type: str  # deposit, withdrawal, transfer_in, transfer_out
    description: str
    asset_id: Optional[str] = None  # Link to asset if applicable
    document_id: Optional[str] = None  # Link to document if applicable
    value: Optional[float] = None
    balance_effect: str = "credit"  # credit (adds to trust), debit (removes from trust)
    notes: str = ""
    recorded_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SubjectCategory(BaseModel):
    """Track subject categories for RM-ID numbering"""
    category_id: str = Field(default_factory=lambda: f"cat_{uuid.uuid4().hex[:12]}")
    portfolio_id: str
    user_id: str
    code: str  # 2-digit string: "01", "02", etc.
    name: str  # e.g., "Real Estate", "Vehicle Loan", "Court Case"
    description: str = ""
    is_active: bool = True
    next_sequence: int = 1  # Next sequence number for this category (.001, .002...)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Default seed categories - 01-09 reserved for document templates, 10+ for other entries
DEFAULT_SUBJECT_CATEGORIES = [
    {"code": "00", "name": "General", "description": "General/miscellaneous records"},
    {"code": "01", "name": "Declaration of Trust", "description": "Trust declaration documents"},
    {"code": "02", "name": "Trust Transfer Grant Deed", "description": "Property conveyance documents"},
    {"code": "03", "name": "Acknowledgement/Receipt", "description": "Acknowledgement and receipt documents"},
    {"code": "04", "name": "Notice of Interest", "description": "Interest declaration notices"},
    {"code": "05", "name": "Notice of Delivery", "description": "Delivery documentation"},
    {"code": "06", "name": "Deed of Conveyance", "description": "Conveyance notices"},
    {"code": "07", "name": "Affidavit of Fact", "description": "Sworn statements"},
    {"code": "08", "name": "Trustee Acceptance", "description": "Trustee acceptance documents"},
    {"code": "09", "name": "Certificate of Trust", "description": "Trust certificates"},
    {"code": "10", "name": "Real Estate", "description": "Real property transactions"},
    {"code": "11", "name": "Vehicle", "description": "Vehicle titles and loans"},
    {"code": "12", "name": "Financial Account", "description": "Bank accounts, investments"},
    {"code": "13", "name": "Court Case", "description": "Legal proceedings"},
    {"code": "14", "name": "Contract", "description": "Contracts and agreements"},
    {"code": "15", "name": "Correspondence", "description": "Letters and correspondence"},
]


class RmIdDetails(BaseModel):
    """RM-ID configuration for a trust profile"""
    rm_id_raw: str = ""  # Exact user input (e.g., "RF 123 456 789 US")
    rm_id_normalized: str = ""  # Normalized: uppercase, trimmed (e.g., "RF123456789US")
    is_placeholder: bool = False  # True if system-generated placeholder


class NoticeEvent(BaseModel):
    notice_id: str = Field(default_factory=lambda: f"notice_{uuid.uuid4().hex[:12]}")
    portfolio_id: str
    user_id: str
    event_type: str  # notice_of_intent, acknowledgement, delivery, conveyance, other
    title: str
    date: str
    status: str = "pending"  # pending, completed, archived
    description: str = ""
    related_documents: List[str] = []  # list of document IDs
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Document(BaseModel):
    document_id: str = Field(default_factory=lambda: f"doc_{uuid.uuid4().hex[:12]}")
    portfolio_id: Optional[str] = None
    trust_profile_id: Optional[str] = None  # Link to trust profile
    user_id: str
    template_id: Optional[str] = None
    title: str
    document_type: str  # declaration_of_trust, ttgd, notice_of_intent, affidavit, custom
    content: str = ""  # Rich text / HTML content
    editor_content: Optional[Dict] = None  # TipTap JSON for editor state
    rm_id: str = ""  # RM-ID for this document
    sub_record_id: str = ""  # Auto-generated: RM-ID + series (e.g., RF...US-01.001)
    status: str = "draft"  # draft, final, signed, archived
    is_locked: bool = False  # True when finalized - prevents editing
    locked_at: Optional[datetime] = None
    locked_by: Optional[str] = None
    tags: List[str] = []
    folder: str = "/"
    is_deleted: bool = False  # Soft delete for trash/recycle bin
    deleted_at: Optional[datetime] = None
    is_pinned: bool = False  # User can pin important documents
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
    heading: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatMessage(BaseModel):
    message_id: str = Field(default_factory=lambda: f"msg_{uuid.uuid4().hex[:12]}")
    user_id: str
    session_id: str
    role: str  # user, assistant
    content: str
    citations: List[Dict] = []  # [{pdf_name, page, excerpt}]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LearningProgress(BaseModel):
    """Track user progress through learning modules"""
    progress_id: str = Field(default_factory=lambda: f"prog_{uuid.uuid4().hex[:12]}")
    user_id: str
    module_id: str
    lesson_id: str
    completed: bool = False
    quiz_score: Optional[int] = None
    quiz_attempts: int = 0
    notes: str = ""
    bookmarked: bool = False
    time_spent_seconds: int = 0
    last_accessed: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MaximStudyProgress(BaseModel):
    """Track spaced repetition study of maxims"""
    study_id: str = Field(default_factory=lambda: f"study_{uuid.uuid4().hex[:12]}")
    user_id: str
    maxim_id: int
    ease_factor: float = 2.5  # SM-2 algorithm factor
    interval_days: int = 1
    repetitions: int = 0
    next_review: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_reviewed: Optional[datetime] = None
    correct_streak: int = 0
    total_reviews: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============ REQUEST/RESPONSE MODELS ============

class PortfolioCreate(BaseModel):
    name: str
    description: Optional[str] = ""


class TrustProfileCreate(BaseModel):
    portfolio_id: str
    trust_name: str


class TrustProfileUpdate(BaseModel):
    trust_name: Optional[str] = None
    trust_identifier: Optional[str] = None
    creation_date: Optional[str] = None
    grantor_name: Optional[str] = None
    grantor_address: Optional[str] = None
    trustee_name: Optional[str] = None
    trustee_address: Optional[str] = None
    co_trustee_name: Optional[str] = None
    co_trustee_address: Optional[str] = None
    beneficiary_name: Optional[str] = None
    beneficiary_address: Optional[str] = None
    governing_statements: Optional[str] = None
    trust_term: Optional[str] = None
    renewal_terms: Optional[str] = None
    revocation_conditions: Optional[str] = None
    modification_conditions: Optional[str] = None
    extinguishment_conditions: Optional[str] = None
    conveyance_conditions: Optional[str] = None
    additional_notes: Optional[str] = None
    # RM-ID fields (enhanced)
    rm_id_raw: Optional[str] = None
    rm_id_normalized: Optional[str] = None
    rm_id_is_placeholder: Optional[bool] = None
    rm_record_id: Optional[str] = None  # Legacy field
    rm_series_start: Optional[str] = None
    rm_series_end: Optional[str] = None
    rm_evidence_files: Optional[List[str]] = None
    # Tax ID fields
    trust_ein: Optional[str] = None
    estate_ein: Optional[str] = None
    tax_classification: Optional[str] = None
    tax_notes: Optional[str] = None
    status: Optional[str] = None


class SubjectCategoryCreate(BaseModel):
    """Create a new subject category"""
    code: str  # 2-digit: "01", "02", etc.
    name: str
    description: Optional[str] = ""


class SubjectCategoryUpdate(BaseModel):
    """Update a subject category"""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class AssetUpdate(BaseModel):
    """Update an existing asset"""
    description: Optional[str] = None
    asset_type: Optional[str] = None
    value: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    subject_code: Optional[str] = None


class LedgerEntryCreate(BaseModel):
    """Create a ledger entry"""
    entry_type: str  # deposit, withdrawal, transfer_in, transfer_out
    description: str
    subject_code: Optional[str] = "00"
    value: Optional[float] = None
    balance_effect: Optional[str] = "credit"
    notes: Optional[str] = ""
    asset_id: Optional[str] = None
    document_id: Optional[str] = None


class LedgerEntryUpdate(BaseModel):
    """Update a ledger entry"""
    description: Optional[str] = None
    value: Optional[float] = None
    notes: Optional[str] = None


class MailEventCreate(BaseModel):
    trust_profile_id: str
    portfolio_id: str
    rm_id: str
    event_type: str
    date: str
    from_party: Optional[str] = ""
    to_party: Optional[str] = ""
    purpose: Optional[str] = ""
    evidence_files: Optional[List[str]] = []
    notes: Optional[str] = ""


class PartyCreate(BaseModel):
    portfolio_id: str
    name: str
    party_type: str
    role: Optional[str] = ""
    address: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    notes: Optional[str] = ""


class PartyUpdate(BaseModel):
    name: Optional[str] = None
    party_type: Optional[str] = None
    role: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class AssetCreate(BaseModel):
    portfolio_id: str
    asset_type: str
    description: str
    value: Optional[str] = ""
    notes: Optional[str] = ""


class NoticeCreate(BaseModel):
    portfolio_id: str
    event_type: str
    title: str
    date: str
    description: Optional[str] = ""


class DocumentCreate(BaseModel):
    portfolio_id: Optional[str] = None
    trust_profile_id: Optional[str] = None
    template_id: Optional[str] = None
    title: str
    document_type: str
    content: Optional[str] = ""
    editor_content: Optional[Dict] = None
    tags: Optional[List[str]] = []
    folder: Optional[str] = "/"


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    editor_content: Optional[Dict] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    folder: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    portfolio_id: Optional[str] = None  # For portfolio-aware queries


class SearchRequest(BaseModel):
    query: str
    pdf_filter: Optional[str] = None  # "roark", "pure_trust", or None for all


# ============ HELPER FUNCTIONS ============

def normalize_rm_id(rm_id_raw: str) -> str:
    """Normalize RM-ID: uppercase, remove extra spaces"""
    if not rm_id_raw:
        return ""
    # Remove extra spaces and uppercase
    normalized = re.sub(r'\s+', '', rm_id_raw.strip().upper())
    return normalized


# ============ AUTH HELPERS ============

async def get_current_user(request: Request) -> User:
    """Get current user from session token"""
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)


async def get_optional_user(request: Request) -> Optional[User]:
    """Get user if authenticated, otherwise None"""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    """Exchange session_id for session_token after Google OAuth"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    async with httpx.AsyncClient() as client_http:
        auth_response = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        
        auth_data = auth_response.json()
    
    email = auth_data.get("email")
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one({"email": email}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id, "email": email, "name": name, "picture": picture,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session_doc = {
        "session_token": session_token, "user_id": user_id,
        "expires_at": expires_at.isoformat(), "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token", value=session_token, httponly=True, secure=True,
        samesite="none", path="/", max_age=7 * 24 * 60 * 60
    )
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user_doc, "session_token": session_token}


@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    return {"user_id": user.user_id, "email": user.email, "name": user.name, "picture": user.picture}


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/", secure=True, samesite="none")
    return {"message": "Logged out successfully"}


# ============ PORTFOLIO ENDPOINTS ============

@api_router.get("/portfolios")
async def get_portfolios(user: User = Depends(get_current_user)):
    docs = await db.portfolios.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return docs


@api_router.post("/portfolios")
async def create_portfolio(data: PortfolioCreate, user: User = Depends(get_current_user)):
    portfolio = Portfolio(user_id=user.user_id, name=data.name, description=data.description)
    doc = portfolio.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.portfolios.insert_one(doc)
    # Return document without MongoDB _id field
    return {k: v for k, v in doc.items() if k != '_id'}


@api_router.get("/portfolios/{portfolio_id}")
async def get_portfolio(portfolio_id: str, user: User = Depends(get_current_user)):
    doc = await db.portfolios.find_one({"portfolio_id": portfolio_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return doc


@api_router.delete("/portfolios/{portfolio_id}")
async def delete_portfolio(portfolio_id: str, user: User = Depends(get_current_user)):
    result = await db.portfolios.delete_one({"portfolio_id": portfolio_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    # Also delete related data
    await db.trust_profiles.delete_many({"portfolio_id": portfolio_id})
    await db.assets.delete_many({"portfolio_id": portfolio_id})
    await db.notices.delete_many({"portfolio_id": portfolio_id})
    await db.documents.delete_many({"portfolio_id": portfolio_id})
    await db.parties.delete_many({"portfolio_id": portfolio_id})
    await db.mail_events.delete_many({"portfolio_id": portfolio_id})
    return {"message": "Portfolio deleted"}


@api_router.put("/portfolios/{portfolio_id}")
async def update_portfolio(portfolio_id: str, data: PortfolioCreate, user: User = Depends(get_current_user)):
    """Update portfolio name and description"""
    existing = await db.portfolios.find_one({"portfolio_id": portfolio_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    update_data = {
        "name": data.name,
        "description": data.description or "",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.portfolios.update_one({"portfolio_id": portfolio_id}, {"$set": update_data})
    doc = await db.portfolios.find_one({"portfolio_id": portfolio_id}, {"_id": 0})
    return doc


# ============ TRUST PROFILE ENDPOINTS ============

@api_router.get("/trust-profiles")
async def get_all_trust_profiles(user: User = Depends(get_current_user)):
    """Get all trust profiles for user"""
    docs = await db.trust_profiles.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    return docs


@api_router.get("/portfolios/{portfolio_id}/trust-profiles")
async def get_portfolio_trust_profiles(portfolio_id: str, user: User = Depends(get_current_user)):
    """Get all trust profiles for a portfolio"""
    docs = await db.trust_profiles.find({"portfolio_id": portfolio_id, "user_id": user.user_id}, {"_id": 0}).to_list(100)
    return docs


@api_router.get("/portfolios/{portfolio_id}/trust-profile")
async def get_trust_profile(portfolio_id: str, user: User = Depends(get_current_user)):
    doc = await db.trust_profiles.find_one({"portfolio_id": portfolio_id, "user_id": user.user_id}, {"_id": 0})
    return doc


@api_router.get("/trust-profiles/{profile_id}")
async def get_trust_profile_by_id(profile_id: str, user: User = Depends(get_current_user)):
    doc = await db.trust_profiles.find_one({"profile_id": profile_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Trust profile not found")
    return doc


@api_router.post("/trust-profiles")
async def create_trust_profile(data: TrustProfileCreate, user: User = Depends(get_current_user)):
    # Check portfolio exists
    portfolio = await db.portfolios.find_one({"portfolio_id": data.portfolio_id, "user_id": user.user_id})
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    profile = TrustProfile(portfolio_id=data.portfolio_id, user_id=user.user_id, trust_name=data.trust_name)
    doc = profile.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.trust_profiles.insert_one(doc)
    # Return document without MongoDB _id field
    return {k: v for k, v in doc.items() if k != '_id'}


@api_router.put("/trust-profiles/{profile_id}")
async def update_trust_profile(profile_id: str, data: TrustProfileUpdate, user: User = Depends(get_current_user)):
    existing = await db.trust_profiles.find_one({"profile_id": profile_id, "user_id": user.user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Trust profile not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Auto-normalize RM-ID if raw is provided
    if "rm_id_raw" in update_data and update_data["rm_id_raw"]:
        update_data["rm_id_normalized"] = normalize_rm_id(update_data["rm_id_raw"])
        update_data["rm_id_is_placeholder"] = False
        # Also update legacy field for backward compatibility
        update_data["rm_record_id"] = update_data["rm_id_raw"]
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.trust_profiles.update_one({"profile_id": profile_id}, {"$set": update_data})
    doc = await db.trust_profiles.find_one({"profile_id": profile_id}, {"_id": 0})
    return doc


@api_router.post("/trust-profiles/{profile_id}/generate-placeholder-rm-id")
async def generate_placeholder_rm_id(profile_id: str, user: User = Depends(get_current_user)):
    """Generate a placeholder RM-ID for users who don't have a sticker yet"""
    existing = await db.trust_profiles.find_one({"profile_id": profile_id, "user_id": user.user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Trust profile not found")
    
    # Generate a temporary placeholder RM-ID
    placeholder_raw = f"TEMP {uuid.uuid4().hex[:4].upper()} {uuid.uuid4().hex[:4].upper()} {uuid.uuid4().hex[:4].upper()} XX"
    placeholder_normalized = normalize_rm_id(placeholder_raw)
    
    update_data = {
        "rm_id_raw": placeholder_raw,
        "rm_id_normalized": placeholder_normalized,
        "rm_id_is_placeholder": True,
        "rm_record_id": placeholder_raw,  # Legacy field
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.trust_profiles.update_one({"profile_id": profile_id}, {"$set": update_data})
    doc = await db.trust_profiles.find_one({"profile_id": profile_id}, {"_id": 0})
    
    return {
        "message": "Placeholder RM-ID generated. Replace with your actual registered mail sticker number when available.",
        "rm_id_raw": placeholder_raw,
        "rm_id_normalized": placeholder_normalized,
        "is_placeholder": True,
        "profile": doc
    }


# ============ ASSET ENDPOINTS ============


async def seed_default_categories(portfolio_id: str, user_id: str):
    """Seed default subject categories for a new portfolio"""
    existing = await db.subject_categories.count_documents({
        "portfolio_id": portfolio_id,
        "user_id": user_id
    })
    
    if existing > 0:
        return  # Already has categories
    
    for cat_data in DEFAULT_SUBJECT_CATEGORIES:
        category = SubjectCategory(
            portfolio_id=portfolio_id,
            user_id=user_id,
            code=cat_data["code"],
            name=cat_data["name"],
            description=cat_data["description"],
            next_sequence=1
        )
        doc = category.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.subject_categories.insert_one(doc)


async def get_or_create_subject_category(portfolio_id: str, user_id: str, subject_code: str = "00", subject_name: str = "General") -> dict:
    """Get or create a subject category by code and return its details"""
    # Seed defaults if needed
    await seed_default_categories(portfolio_id, user_id)
    
    # Look for existing category with this code
    existing = await db.subject_categories.find_one({
        "portfolio_id": portfolio_id,
        "user_id": user_id,
        "code": subject_code
    })
    
    if existing:
        return existing
    
    # If not found by code, try by name
    existing_by_name = await db.subject_categories.find_one({
        "portfolio_id": portfolio_id,
        "user_id": user_id,
        "name": subject_name
    })
    
    if existing_by_name:
        return existing_by_name
    
    # Find the next available code
    all_codes = await db.subject_categories.find(
        {"portfolio_id": portfolio_id, "user_id": user_id},
        {"code": 1}
    ).to_list(100)
    used_codes = set(c.get("code", "00") for c in all_codes)
    
    new_code = subject_code
    if new_code in used_codes:
        # Find next available
        for i in range(8, 100):
            potential_code = f"{i:02d}"
            if potential_code not in used_codes:
                new_code = potential_code
                break
    
    # Create new category
    category = SubjectCategory(
        portfolio_id=portfolio_id,
        user_id=user_id,
        code=new_code,
        name=subject_name,
        next_sequence=1
    )
    doc = category.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.subject_categories.insert_one(doc)
    
    return doc


async def generate_subject_rm_id(portfolio_id: str, user_id: str, subject_code: str = "00", subject_name: str = "General") -> tuple:
    """Generate RM-ID based on subject category. Returns (full_rm_id, subject_code, sequence_num, subject_name)"""
    # Get trust profile for base RM-ID
    trust_profile = await db.trust_profiles.find_one(
        {"portfolio_id": portfolio_id, "user_id": user_id},
        {"rm_id_normalized": 1, "rm_id_raw": 1, "rm_record_id": 1}
    )
    
    # Priority: rm_id_normalized > rm_record_id (legacy) > placeholder
    base_rm_id = None
    if trust_profile:
        if trust_profile.get("rm_id_normalized"):
            base_rm_id = trust_profile["rm_id_normalized"]
        elif trust_profile.get("rm_record_id"):
            base_rm_id = normalize_rm_id(trust_profile["rm_record_id"])
    
    if not base_rm_id:
        # Generate a placeholder RM-ID
        base_rm_id = f"TEMP{uuid.uuid4().hex[:8].upper()}"
    
    # Get or create subject category
    category = await get_or_create_subject_category(portfolio_id, user_id, subject_code, subject_name)
    cat_code = category.get("code", "00")
    cat_name = category.get("name", "General")
    sequence_num = category.get("next_sequence", 1)
    
    # Increment the sequence for next use
    await db.subject_categories.update_one(
        {"category_id": category["category_id"]},
        {"$inc": {"next_sequence": 1}}
    )
    
    # Format: BASE-CODE.SEQUENCE (e.g., RF123456789US-01.001)
    full_rm_id = f"{base_rm_id}-{cat_code}.{sequence_num:03d}"
    
    return full_rm_id, cat_code, sequence_num, cat_name


@api_router.get("/portfolios/{portfolio_id}/subject-categories")
async def get_subject_categories(portfolio_id: str, user: User = Depends(get_current_user)):
    """Get all subject categories for a portfolio"""
    # Seed defaults if needed
    await seed_default_categories(portfolio_id, user.user_id)
    
    categories = await db.subject_categories.find(
        {"portfolio_id": portfolio_id, "user_id": user.user_id},
        {"_id": 0}
    ).sort("code", 1).to_list(100)
    return categories


@api_router.post("/portfolios/{portfolio_id}/subject-categories")
async def create_subject_category(portfolio_id: str, data: SubjectCategoryCreate, user: User = Depends(get_current_user)):
    """Create a new subject category"""
    # Check if code already exists
    existing = await db.subject_categories.find_one({
        "portfolio_id": portfolio_id,
        "user_id": user.user_id,
        "code": data.code
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"Subject category with code {data.code} already exists")
    
    category = SubjectCategory(
        portfolio_id=portfolio_id,
        user_id=user.user_id,
        code=data.code,
        name=data.name,
        description=data.description or "",
        next_sequence=1
    )
    doc = category.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.subject_categories.insert_one(doc)
    
    return {k: v for k, v in doc.items() if k != '_id'}


@api_router.put("/subject-categories/{category_id}")
async def update_subject_category(category_id: str, data: SubjectCategoryUpdate, user: User = Depends(get_current_user)):
    """Update a subject category"""
    existing = await db.subject_categories.find_one({
        "category_id": category_id,
        "user_id": user.user_id
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Subject category not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.subject_categories.update_one(
            {"category_id": category_id},
            {"$set": update_data}
        )
    
    doc = await db.subject_categories.find_one({"category_id": category_id}, {"_id": 0})
    return doc


@api_router.delete("/subject-categories/{category_id}")
async def delete_subject_category(category_id: str, user: User = Depends(get_current_user)):
    """Delete a subject category (only if not in use)"""
    existing = await db.subject_categories.find_one({
        "category_id": category_id,
        "user_id": user.user_id
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Subject category not found")
    
    # Check if category is in use
    in_use = await db.assets.count_documents({
        "subject_code": existing.get("code"),
        "portfolio_id": existing.get("portfolio_id")
    })
    if in_use > 0:
        raise HTTPException(status_code=400, detail="Cannot delete category that is in use by assets")
    
    await db.subject_categories.delete_one({"category_id": category_id})
    return {"message": "Category deleted"}


@api_router.get("/portfolios/{portfolio_id}/assets")
async def get_assets(portfolio_id: str, user: User = Depends(get_current_user)):
    docs = await db.assets.find({"portfolio_id": portfolio_id, "user_id": user.user_id}, {"_id": 0}).to_list(100)
    return docs


@api_router.post("/portfolios/{portfolio_id}/assets")
async def create_asset_for_portfolio(portfolio_id: str, data: dict, user: User = Depends(get_current_user)):
    """Create asset with subject-based RM-ID"""
    subject_code = data.get("subject_code", "00")
    subject_name = data.get("subject_name") or data.get("asset_type", "General")
    
    rm_id, cat_code, sequence_num, cat_name = await generate_subject_rm_id(
        portfolio_id, user.user_id, subject_code, subject_name
    )
    
    asset = AssetItem(
        portfolio_id=portfolio_id,
        user_id=user.user_id,
        rm_id=rm_id,
        subject_code=cat_code,
        subject_name=cat_name,
        sequence_number=sequence_num,
        asset_type=data.get("asset_type", "General"),
        description=data.get("description", ""),
        value=data.get("value"),
        transaction_type=data.get("transaction_type", "deposit"),
        notes=data.get("notes", "")
    )
    doc = asset.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.assets.insert_one(doc)
    
    # Also create a ledger entry for this asset deposit
    ledger_entry = TrustLedgerEntry(
        portfolio_id=portfolio_id,
        user_id=user.user_id,
        rm_id=rm_id,
        subject_code=cat_code,
        subject_name=cat_name,
        sequence_number=sequence_num,
        entry_type="deposit",
        description=f"Asset deposited: {data.get('description', '')}",
        asset_id=asset.asset_id,
        value=data.get("value"),
        balance_effect="credit"
    )
    ledger_doc = ledger_entry.model_dump()
    ledger_doc['recorded_date'] = ledger_doc['recorded_date'].isoformat()
    ledger_doc['created_at'] = ledger_doc['created_at'].isoformat()
    await db.trust_ledger.insert_one(ledger_doc)
    
    return {k: v for k, v in doc.items() if k != '_id'}


@api_router.put("/assets/{asset_id}")
async def update_asset(asset_id: str, data: dict, user: User = Depends(get_current_user)):
    """Update an existing asset"""
    asset = await db.assets.find_one({"asset_id": asset_id, "user_id": user.user_id}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    update_data = {
        "description": data.get("description", asset.get("description")),
        "asset_type": data.get("asset_type", asset.get("asset_type")),
        "value": data.get("value", asset.get("value")),
        "status": data.get("status", asset.get("status")),
        "notes": data.get("notes", asset.get("notes")),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.assets.update_one({"asset_id": asset_id}, {"$set": update_data})
    
    updated_asset = await db.assets.find_one({"asset_id": asset_id}, {"_id": 0})
    return updated_asset


@api_router.post("/assets")
async def create_asset(data: AssetCreate, user: User = Depends(get_current_user)):
    subject_name = data.asset_type or "General"
    rm_id, cat_code, sequence_num, cat_name = await generate_subject_rm_id(
        data.portfolio_id, user.user_id, "00", subject_name
    )
    
    asset = AssetItem(
        portfolio_id=data.portfolio_id,
        user_id=user.user_id,
        rm_id=rm_id,
        subject_code=cat_code,
        subject_name=cat_name,
        sequence_number=sequence_num,
        asset_type=data.asset_type,
        description=data.description,
        value=float(data.value) if data.value else None,
        notes=data.notes or ""
    )
    doc = asset.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.assets.insert_one(doc)
    return {k: v for k, v in doc.items() if k != '_id'}


@api_router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str, user: User = Depends(get_current_user)):
    # Get asset first to record in ledger
    asset = await db.assets.find_one({"asset_id": asset_id, "user_id": user.user_id}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Create ledger entry for removal
    ledger_entry = TrustLedgerEntry(
        portfolio_id=asset.get("portfolio_id", ""),
        user_id=user.user_id,
        rm_id=asset.get("rm_id", ""),
        subject_code=asset.get("subject_code", "00"),
        subject_name=asset.get("subject_name", ""),
        sequence_number=asset.get("sequence_number", 1),
        entry_type="withdrawal",
        description=f"Asset removed: {asset.get('description', '')}",
        asset_id=asset_id,
        value=asset.get("value"),
        balance_effect="debit"
    )
    ledger_doc = ledger_entry.model_dump()
    ledger_doc['recorded_date'] = ledger_doc['recorded_date'].isoformat()
    ledger_doc['created_at'] = ledger_doc['created_at'].isoformat()
    await db.trust_ledger.insert_one(ledger_doc)
    
    await db.assets.delete_one({"asset_id": asset_id, "user_id": user.user_id})
    return {"message": "Asset deleted", "rm_id": asset.get("rm_id", "")}


# ============ TRUST LEDGER ENDPOINTS ============

@api_router.get("/portfolios/{portfolio_id}/ledger")
async def get_trust_ledger(portfolio_id: str, user: User = Depends(get_current_user)):
    """Get trust ledger entries for a portfolio"""
    entries = await db.trust_ledger.find(
        {"portfolio_id": portfolio_id, "user_id": user.user_id},
        {"_id": 0}
    ).sort("recorded_date", -1).to_list(200)
    
    # Calculate balance
    total_credit = sum(e.get("value", 0) or 0 for e in entries if e.get("balance_effect") == "credit")
    total_debit = sum(e.get("value", 0) or 0 for e in entries if e.get("balance_effect") == "debit")
    
    return {
        "entries": entries,
        "summary": {
            "total_deposits": total_credit,
            "total_withdrawals": total_debit,
            "balance": total_credit - total_debit,
            "entry_count": len(entries)
        }
    }


@api_router.post("/portfolios/{portfolio_id}/ledger")
async def create_ledger_entry(portfolio_id: str, data: dict, user: User = Depends(get_current_user)):
    """Create a manual ledger entry with subject-based RM-ID"""
    subject_code = data.get("subject_code", "00")
    subject_name = data.get("subject_name", "General")
    
    # Generate RM-ID using the subject-based system
    rm_id, cat_code, sequence_num, cat_name = await generate_subject_rm_id(
        portfolio_id, user.user_id, subject_code, subject_name
    )
    
    entry = TrustLedgerEntry(
        portfolio_id=portfolio_id,
        user_id=user.user_id,
        rm_id=rm_id,
        subject_code=cat_code,
        subject_name=cat_name,
        sequence_number=sequence_num,
        entry_type=data.get("entry_type", "deposit"),
        description=data.get("description", ""),
        asset_id=data.get("asset_id"),
        document_id=data.get("document_id"),
        value=data.get("value"),
        balance_effect=data.get("balance_effect", "credit"),
        notes=data.get("notes", "")
    )
    doc = entry.model_dump()
    doc['recorded_date'] = doc['recorded_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.trust_ledger.insert_one(doc)
    
    return {k: v for k, v in doc.items() if k != '_id'}


@api_router.put("/ledger/{entry_id}")
async def update_ledger_entry(entry_id: str, data: LedgerEntryUpdate, user: User = Depends(get_current_user)):
    """Update a ledger entry (description, value, notes only - RM-ID cannot be changed)"""
    entry = await db.trust_ledger.find_one({"entry_id": entry_id, "user_id": user.user_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Ledger entry not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.trust_ledger.update_one(
            {"entry_id": entry_id},
            {"$set": update_data}
        )
    
    updated_entry = await db.trust_ledger.find_one({"entry_id": entry_id}, {"_id": 0})
    return updated_entry


@api_router.delete("/ledger/{entry_id}")
async def delete_ledger_entry(entry_id: str, user: User = Depends(get_current_user)):
    """Delete a ledger entry"""
    entry = await db.trust_ledger.find_one({"entry_id": entry_id, "user_id": user.user_id})
    if not entry:
        raise HTTPException(status_code=404, detail="Ledger entry not found")
    
    # Check if this entry was auto-generated from an asset - those shouldn't be deleted directly
    if entry.get("asset_id") and entry.get("entry_type") in ["deposit", "withdrawal"]:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete auto-generated asset entries. Delete the asset instead."
        )
    
    await db.trust_ledger.delete_one({"entry_id": entry_id})
    return {"message": "Ledger entry deleted", "rm_id": entry.get("rm_id", "")}


# ============ NOTICE ENDPOINTS ============

@api_router.get("/portfolios/{portfolio_id}/notices")
async def get_notices(portfolio_id: str, user: User = Depends(get_current_user)):
    docs = await db.notices.find({"portfolio_id": portfolio_id, "user_id": user.user_id}, {"_id": 0}).sort("date", -1).to_list(100)
    return docs


@api_router.post("/notices")
async def create_notice(data: NoticeCreate, user: User = Depends(get_current_user)):
    notice = NoticeEvent(
        portfolio_id=data.portfolio_id, user_id=user.user_id, event_type=data.event_type,
        title=data.title, date=data.date, description=data.description or ""
    )
    doc = notice.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.notices.insert_one(doc)
    # Return document without MongoDB _id field
    return {k: v for k, v in doc.items() if k != '_id'}


@api_router.put("/notices/{notice_id}")
async def update_notice_status(notice_id: str, status: str, user: User = Depends(get_current_user)):
    result = await db.notices.update_one(
        {"notice_id": notice_id, "user_id": user.user_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notice not found")
    return {"message": "Notice updated"}


@api_router.delete("/notices/{notice_id}")
async def delete_notice(notice_id: str, user: User = Depends(get_current_user)):
    result = await db.notices.delete_one({"notice_id": notice_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notice not found")
    return {"message": "Notice deleted"}


# ============ PARTY ENDPOINTS ============

@api_router.get("/portfolios/{portfolio_id}/parties")
async def get_parties(portfolio_id: str, user: User = Depends(get_current_user)):
    """Get all parties for a portfolio"""
    docs = await db.parties.find({"portfolio_id": portfolio_id, "user_id": user.user_id}, {"_id": 0}).to_list(100)
    return docs


@api_router.post("/parties")
async def create_party(data: PartyCreate, user: User = Depends(get_current_user)):
    """Create a new party"""
    party = Party(
        portfolio_id=data.portfolio_id, user_id=user.user_id, name=data.name,
        party_type=data.party_type, role=data.role or "", address=data.address or "",
        email=data.email or "", phone=data.phone or "", notes=data.notes or ""
    )
    doc = party.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.parties.insert_one(doc)
    return {k: v for k, v in doc.items() if k != '_id'}


@api_router.put("/parties/{party_id}")
async def update_party(party_id: str, data: PartyUpdate, user: User = Depends(get_current_user)):
    """Update a party"""
    existing = await db.parties.find_one({"party_id": party_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Party not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.parties.update_one({"party_id": party_id}, {"$set": update_data})
    doc = await db.parties.find_one({"party_id": party_id}, {"_id": 0})
    return doc


@api_router.delete("/parties/{party_id}")
async def delete_party(party_id: str, user: User = Depends(get_current_user)):
    result = await db.parties.delete_one({"party_id": party_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Party not found")
    return {"message": "Party deleted"}


# ============ MAIL EVENT ENDPOINTS ============

@api_router.get("/trust-profiles/{profile_id}/mail-events")
async def get_mail_events(profile_id: str, user: User = Depends(get_current_user)):
    """Get mail events for a trust profile"""
    docs = await db.mail_events.find({"trust_profile_id": profile_id, "user_id": user.user_id}, {"_id": 0}).sort("date", -1).to_list(100)
    return docs


@api_router.post("/mail-events")
async def create_mail_event(data: MailEventCreate, user: User = Depends(get_current_user)):
    """Create a new mail event"""
    event = MailEvent(
        trust_profile_id=data.trust_profile_id, portfolio_id=data.portfolio_id,
        user_id=user.user_id, rm_id=data.rm_id, event_type=data.event_type,
        date=data.date, from_party=data.from_party or "", to_party=data.to_party or "",
        purpose=data.purpose or "", evidence_files=data.evidence_files or [], notes=data.notes or ""
    )
    doc = event.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.mail_events.insert_one(doc)
    return {k: v for k, v in doc.items() if k != '_id'}


@api_router.delete("/mail-events/{event_id}")
async def delete_mail_event(event_id: str, user: User = Depends(get_current_user)):
    result = await db.mail_events.delete_one({"event_id": event_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mail event not found")
    return {"message": "Mail event deleted"}


@api_router.get("/search/mail-events")
async def search_mail_events(q: str, user: User = Depends(get_current_user)):
    """Search mail events by RM-ID or purpose"""
    docs = await db.mail_events.find({
        "user_id": user.user_id,
        "$or": [
            {"rm_id": {"$regex": q, "$options": "i"}},
            {"purpose": {"$regex": q, "$options": "i"}}
        ]
    }, {"_id": 0}).to_list(50)
    return docs


# ============ DOCUMENT ENDPOINTS ============

@api_router.get("/documents")
async def get_documents(portfolio_id: Optional[str] = None, include_deleted: bool = False, user: User = Depends(get_current_user)):
    query = {"user_id": user.user_id}
    if portfolio_id:
        query["portfolio_id"] = portfolio_id
    if not include_deleted:
        query["$or"] = [{"is_deleted": False}, {"is_deleted": {"$exists": False}}]
    docs = await db.documents.find(query, {"_id": 0}).sort("updated_at", -1).to_list(100)
    return docs


@api_router.get("/documents/trash")
async def get_deleted_documents(user: User = Depends(get_current_user)):
    """Get documents in trash"""
    docs = await db.documents.find({"user_id": user.user_id, "is_deleted": True}, {"_id": 0}).sort("deleted_at", -1).to_list(100)
    return docs


@api_router.post("/documents")
async def create_document(data: DocumentCreate, user: User = Depends(get_current_user)):
    """Create a new document - returns stable document_id"""
    # Generate sub-record ID and RM-ID if trust profile has RM-ID
    sub_record_id = ""
    rm_id = ""
    if data.portfolio_id:
        trust_profile = await db.trust_profiles.find_one({"portfolio_id": data.portfolio_id, "user_id": user.user_id})
        if trust_profile:
            # Get RM-ID from trust profile
            if trust_profile.get("rm_id_details", {}).get("full_rm_id"):
                rm_id = trust_profile["rm_id_details"]["full_rm_id"]
            elif trust_profile.get("rm_record_id"):
                rm_id = trust_profile.get("rm_record_id", "")
            
            if rm_id:
                next_series = trust_profile.get("rm_next_series", 1)
                sub_record_id = f"{rm_id}-{next_series:02d}.001"
                # Increment series counter
                await db.trust_profiles.update_one(
                    {"profile_id": trust_profile["profile_id"]},
                    {"$inc": {"rm_next_series": 1}}
                )
    
    doc = Document(
        portfolio_id=data.portfolio_id, 
        trust_profile_id=data.trust_profile_id if hasattr(data, 'trust_profile_id') else None,
        user_id=user.user_id, 
        template_id=data.template_id,
        title=data.title, 
        document_type=data.document_type, 
        content=data.content or "",
        rm_id=rm_id,
        sub_record_id=sub_record_id,
        tags=data.tags or [], 
        folder=data.folder or "/"
    )
    doc_dict = doc.model_dump()
    doc_dict['created_at'] = doc_dict['created_at'].isoformat()
    doc_dict['updated_at'] = doc_dict['updated_at'].isoformat()
    if doc_dict.get('deleted_at'):
        doc_dict['deleted_at'] = doc_dict['deleted_at'].isoformat()
    await db.documents.insert_one(doc_dict)
    # Return document without MongoDB _id field - ensure document_id is returned
    result = {k: v for k, v in doc_dict.items() if k != '_id'}
    logger.info(f"Document created: {result['document_id']}")
    return result


@api_router.get("/documents/{document_id}")
async def get_document(document_id: str, user: User = Depends(get_current_user)):
    doc = await db.documents.find_one({"document_id": document_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Update access tracking
    await db.documents.update_one(
        {"document_id": document_id},
        {
            "$set": {"last_accessed": datetime.now(timezone.utc).isoformat()},
            "$inc": {"access_count": 1}
        }
    )
    
    return doc


@api_router.get("/documents/recent/list")
async def get_recent_documents(limit: int = 10, user: User = Depends(get_current_user)):
    """Get recently accessed documents"""
    docs = await db.documents.find(
        {"user_id": user.user_id, "is_deleted": {"$ne": True}},
        {"_id": 0}
    ).sort("last_accessed", -1).limit(limit).to_list(limit)
    return docs


@api_router.get("/documents/pinned/list")
async def get_pinned_documents(user: User = Depends(get_current_user)):
    """Get pinned/favorite documents"""
    docs = await db.documents.find(
        {"user_id": user.user_id, "is_pinned": True, "is_deleted": {"$ne": True}},
        {"_id": 0}
    ).sort("pinned_at", -1).to_list(50)
    return docs


@api_router.post("/documents/{document_id}/pin")
async def pin_document(document_id: str, user: User = Depends(get_current_user)):
    """Pin a document for quick access"""
    doc = await db.documents.find_one({"document_id": document_id, "user_id": user.user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    await db.documents.update_one(
        {"document_id": document_id},
        {"$set": {"is_pinned": True, "pinned_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Document pinned", "document_id": document_id}


@api_router.post("/documents/{document_id}/unpin")
async def unpin_document(document_id: str, user: User = Depends(get_current_user)):
    """Unpin a document"""
    doc = await db.documents.find_one({"document_id": document_id, "user_id": user.user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    await db.documents.update_one(
        {"document_id": document_id},
        {"$set": {"is_pinned": False, "pinned_at": None}}
    )
    return {"message": "Document unpinned", "document_id": document_id}


@api_router.put("/documents/{document_id}")
async def update_document(document_id: str, data: DocumentUpdate, user: User = Depends(get_current_user)):
    existing = await db.documents.find_one({"document_id": document_id, "user_id": user.user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Save version before update
    version_doc = {
        "version_id": f"ver_{uuid.uuid4().hex[:12]}",
        "document_id": document_id,
        "version_number": existing.get("version", 1),
        "content": existing.get("content", ""),
        "changed_by": user.user_id,
        "change_summary": "Auto-save before update",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.document_versions.insert_one(version_doc)
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    update_data['version'] = existing.get("version", 1) + 1
    
    await db.documents.update_one({"document_id": document_id}, {"$set": update_data})
    doc = await db.documents.find_one({"document_id": document_id}, {"_id": 0})
    return doc


@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str, permanent: bool = False, user: User = Depends(get_current_user)):
    """Soft delete (move to trash) or permanently delete a document"""
    doc = await db.documents.find_one({"document_id": document_id, "user_id": user.user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if permanent:
        # Permanently delete
        await db.documents.delete_one({"document_id": document_id})
        await db.document_versions.delete_many({"document_id": document_id})
        return {"message": "Document permanently deleted"}
    else:
        # Soft delete - move to trash
        await db.documents.update_one(
            {"document_id": document_id},
            {"$set": {
                "is_deleted": True,
                "deleted_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Document moved to trash"}


@api_router.post("/documents/{document_id}/restore")
async def restore_document_from_trash(document_id: str, user: User = Depends(get_current_user)):
    """Restore a document from trash"""
    doc = await db.documents.find_one({"document_id": document_id, "user_id": user.user_id, "is_deleted": True})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found in trash")
    
    await db.documents.update_one(
        {"document_id": document_id},
        {"$set": {
            "is_deleted": False,
            "deleted_at": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Document restored"}


@api_router.post("/documents/{document_id}/duplicate")
async def duplicate_document(document_id: str, user: User = Depends(get_current_user)):
    """Duplicate a document"""
    original = await db.documents.find_one({"document_id": document_id, "user_id": user.user_id}, {"_id": 0})
    if not original:
        raise HTTPException(status_code=404, detail="Document not found")
    
    new_doc = Document(
        portfolio_id=original.get("portfolio_id"),
        trust_profile_id=original.get("trust_profile_id"),
        user_id=user.user_id,
        template_id=original.get("template_id"),
        title=f"{original['title']} (Copy)",
        document_type=original.get("document_type", "custom"),
        content=original.get("content", ""),
        tags=original.get("tags", []),
        folder=original.get("folder", "/")
    )
    doc_dict = new_doc.model_dump()
    doc_dict['created_at'] = doc_dict['created_at'].isoformat()
    doc_dict['updated_at'] = doc_dict['updated_at'].isoformat()
    await db.documents.insert_one(doc_dict)
    return {k: v for k, v in doc_dict.items() if k != '_id'}


@api_router.post("/documents/{document_id}/finalize")
async def finalize_document(document_id: str, user: User = Depends(get_current_user)):
    """Mark a document as final and lock it for editing"""
    doc = await db.documents.find_one({"document_id": document_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if doc.get("is_locked"):
        raise HTTPException(status_code=400, detail="Document is already finalized")
    
    now = datetime.now(timezone.utc)
    await db.documents.update_one(
        {"document_id": document_id},
        {"$set": {
            "status": "final",
            "is_locked": True,
            "locked_at": now.isoformat(),
            "locked_by": user.user_id,
            "updated_at": now.isoformat()
        }}
    )
    
    return {"message": "Document finalized and locked", "status": "final"}


@api_router.post("/documents/{document_id}/unlock")
async def unlock_document(document_id: str, user: User = Depends(get_current_user)):
    """Unlock a finalized document for editing"""
    doc = await db.documents.find_one({"document_id": document_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not doc.get("is_locked"):
        raise HTTPException(status_code=400, detail="Document is not locked")
    
    now = datetime.now(timezone.utc)
    await db.documents.update_one(
        {"document_id": document_id},
        {"$set": {
            "status": "draft",
            "is_locked": False,
            "locked_at": None,
            "locked_by": None,
            "updated_at": now.isoformat()
        }}
    )
    
    return {"message": "Document unlocked for editing", "status": "draft"}


@api_router.get("/documents/{document_id}/versions")
async def get_document_versions(document_id: str, user: User = Depends(get_current_user)):
    # Verify ownership
    doc = await db.documents.find_one({"document_id": document_id, "user_id": user.user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    versions = await db.document_versions.find({"document_id": document_id}, {"_id": 0}).sort("version_number", -1).to_list(50)
    return versions


@api_router.post("/documents/{document_id}/restore/{version_id}")
async def restore_document_version(document_id: str, version_id: str, user: User = Depends(get_current_user)):
    doc = await db.documents.find_one({"document_id": document_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    version = await db.document_versions.find_one({"version_id": version_id, "document_id": document_id}, {"_id": 0})
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Save current as new version
    current_version_doc = {
        "version_id": f"ver_{uuid.uuid4().hex[:12]}",
        "document_id": document_id,
        "version_number": doc.get("version", 1),
        "content": doc.get("content", ""),
        "changed_by": user.user_id,
        "change_summary": "Before restore",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.document_versions.insert_one(current_version_doc)
    
    # Restore content
    await db.documents.update_one(
        {"document_id": document_id},
        {"$set": {
            "content": version["content"],
            "version": doc.get("version", 1) + 1,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Version restored"}


# ============ TEMPLATE ENDPOINTS ============

# Default subject codes for templates (01-09 reserved)
TEMPLATE_SUBJECT_CODES = {
    "declaration_of_trust": "01",
    "trust_transfer_grant_deed": "02",
    "acknowledgement_receipt_acceptance": "03",
    "notice_of_interest": "04",
    "notice_of_delivery": "05",
    "special_notice_deed_conveyance": "06",
    "affidavit_of_fact": "07",
    "trustee_acceptance": "08",
    "certificate_of_trust": "09"
}

@api_router.get("/templates")
async def get_templates():
    templates = [
        {
            "id": "declaration_of_trust",
            "name": "Declaration of Trust",
            "description": "Establishes a pure equity trust with defined roles for grantor/settlor, trustee, and beneficiary. Includes maxims of equity and governing statements.",
            "source": "Pure Trust Under Equity, Pages 1-5",
            "icon": "scroll",
            "subject_code": "01",
            "fields": ["trust_name", "grantor", "trustee", "beneficiary", "property", "purpose", "terms"]
        },
        {
            "id": "trust_transfer_grant_deed",
            "name": "Trust Transfer Grant Deed (TTGD)",
            "description": "Conveys property and rights into an established trust structure with proper grant and habendum clauses.",
            "source": "Pure Trust Under Equity, Pages 6-8",
            "icon": "file-signature",
            "subject_code": "02",
            "fields": ["grantor", "grantee", "property", "consideration", "covenants"]
        },
        {
            "id": "acknowledgement_receipt_acceptance",
            "name": "Acknowledgement / Receipt / Acceptance",
            "description": "Formal acknowledgement of receipt and acceptance for lawful consideration in trust transactions.",
            "source": "Pure Trust Under Equity, Page 9",
            "icon": "check-circle",
            "subject_code": "03",
            "fields": ["parties", "items", "consideration", "date"]
        },
        {
            "id": "notice_of_interest",
            "name": "Notice of Interest",
            "description": "Formal notice declaring equitable interest in property or assets.",
            "source": "Pure Trust Under Equity, Page 10",
            "icon": "bell",
            "subject_code": "04",
            "fields": ["declarant", "property", "interest_type", "effective_date"]
        },
        {
            "id": "notice_of_delivery",
            "name": "Notice of Delivery",
            "description": "Documentation of delivery of property or documents to trust.",
            "source": "Pure Trust Under Equity, Page 11",
            "icon": "package",
            "subject_code": "05",
            "fields": ["sender", "recipient", "items", "date", "conditions"]
        },
        {
            "id": "special_notice_deed_conveyance",
            "name": "Special Notice of Deed of Conveyance",
            "description": "Special notice regarding conveyance of deed and title transfer.",
            "source": "Pure Trust Under Equity, Page 12",
            "icon": "stamp",
            "subject_code": "06",
            "fields": ["grantor", "grantee", "property", "conveyance_terms"]
        },
        {
            "id": "affidavit_of_fact",
            "name": "Affidavit of Fact",
            "description": "Sworn statement establishing facts under oath with jurat.",
            "source": "Pure Trust Under Equity, Page 13",
            "icon": "scale",
            "subject_code": "07",
            "fields": ["affiant", "facts", "attestation"]
        },
        {
            "id": "trustee_acceptance",
            "name": "Trustee Acceptance",
            "description": "Notice of acceptance by trustee acknowledging receipt of certificate of legal title and duties.",
            "source": "Pure Trust Under Equity, Pages 14-15",
            "icon": "check-circle",
            "subject_code": "08",
            "fields": ["trustee", "trust_name", "rm_id", "address"]
        },
        {
            "id": "certificate_of_trust",
            "name": "Certificate of Foreign Grantor Trust",
            "description": "Formal certificate establishing the trust under full faith and credit with all essential details.",
            "source": "Pure Trust Under Equity, Pages 16-17",
            "icon": "scroll",
            "subject_code": "09",
            "fields": ["trust_name", "grantor", "trustee", "creation_date", "execution_date"]
        }
    ]
    return templates


# ============ KNOWLEDGE BASE ENDPOINTS ============

@api_router.get("/knowledge/topics")
async def get_knowledge_topics():
    """Get the structured knowledge topics from PDFs"""
    topics = [
        {
            "id": "equity_history",
            "title": "Equity: History & Foundation",
            "description": "The origin and development of equity jurisprudence as a separate system from common law.",
            "source": "Roark - Kingdom vs Empire",
            "subtopics": ["Origins of Equity", "Equity vs Common Law", "Courts of Chancery"]
        },
        {
            "id": "maxims_of_equity",
            "title": "Maxims of Equity",
            "description": "The fundamental principles and maxims that govern equitable jurisprudence.",
            "source": "Roark - Kingdom vs Empire, Pages 5-12",
            "subtopics": ["Primary Maxims", "Secondary Maxims", "Application of Maxims"]
        },
        {
            "id": "trust_fundamentals",
            "title": "Trust Fundamentals",
            "description": "Core concepts of trust law including express, implied, resulting, and constructive trusts.",
            "source": "Roark - Kingdom vs Empire",
            "subtopics": ["Express Trusts", "Implied Trusts", "Resulting Trusts", "Constructive Trusts"]
        },
        {
            "id": "beneficial_owner",
            "title": "Beneficial Owner / Cestui Que Trust",
            "description": "The role and rights of the beneficial owner in equity.",
            "source": "Roark - Kingdom vs Empire",
            "subtopics": ["Definition", "Rights of Beneficiary", "Relationship to Trustee"]
        },
        {
            "id": "offices_of_trust",
            "title": "Offices of Trust",
            "description": "The duties and responsibilities of trustees, agents, and fiduciaries.",
            "source": "Roark - Kingdom vs Empire",
            "subtopics": ["Trustee Duties", "Agent Duties", "Fiduciary Obligations"]
        },
        {
            "id": "duty_right_relationships",
            "title": "Duty ↔ Right Relationships",
            "description": "The paired relationships between parties in equity: trustee/beneficiary, agent/principal, etc.",
            "source": "Roark - Kingdom vs Empire",
            "subtopics": ["Trustee-Beneficiary", "Agent-Principal", "Surety-Creditor"]
        },
        {
            "id": "equitable_lien",
            "title": "Equitable Lien",
            "description": "Security interests recognized in equity over property.",
            "source": "Roark - Kingdom vs Empire",
            "subtopics": ["Creation", "Enforcement", "Priority"]
        },
        {
            "id": "tracing_transmutations",
            "title": "Tracing & Transmutations",
            "description": "Following trust property through changes of form.",
            "source": "Roark - Kingdom vs Empire",
            "subtopics": ["Tracing Rules", "Transmutation Doctrine", "Mixed Funds"]
        },
        {
            "id": "notice_doctrine",
            "title": "Notice & Its Effects",
            "description": "The doctrine of notice in equity and its legal consequences.",
            "source": "Roark - Kingdom vs Empire",
            "subtopics": ["Actual Notice", "Constructive Notice", "Inquiry Notice"]
        },
        {
            "id": "pure_trust_structure",
            "title": "Pure Trust Structure",
            "description": "The specific structure and requirements of a pure equity trust.",
            "source": "Pure Trust Under Equity",
            "subtopics": ["Declaration", "Parties", "Transfer", "Administration"]
        }
    ]
    return topics


@api_router.get("/knowledge/maxims")
async def get_maxims():
    """Get the maxims of equity with citations"""
    maxims = [
        {
            "id": 1,
            "maxim": "Equity regards as done that which ought to be done",
            "explanation": "When parties have agreed to do something, equity will treat it as already accomplished. This is foundational to trust law.",
            "source": "Roark - Kingdom vs Empire, Page 6",
            "related_doctrines": ["Specific Performance", "Conversion"],
            "tags": ["intent", "completion", "agreement"]
        },
        {
            "id": 2,
            "maxim": "Equity looks to the intent rather than to the form",
            "explanation": "The substance of a transaction matters more than its outward appearance. Courts look at true intention.",
            "source": "Roark - Kingdom vs Empire, Page 6",
            "related_doctrines": ["Parol Evidence", "Reformation"],
            "tags": ["intent", "substance", "interpretation"]
        },
        {
            "id": 3,
            "maxim": "Equity will not suffer a wrong to be without a remedy",
            "explanation": "If someone has been wronged but cannot find relief at law, equity will provide a remedy.",
            "source": "Roark - Kingdom vs Empire, Page 7",
            "related_doctrines": ["Injunction", "Constructive Trust"],
            "tags": ["remedy", "justice", "protection"]
        },
        {
            "id": 4,
            "maxim": "Where there is equal equity, the law must prevail",
            "explanation": "When two parties have equally valid equitable claims, legal title determines outcome.",
            "source": "Roark - Kingdom vs Empire, Page 7",
            "related_doctrines": ["Priority", "Registration"],
            "tags": ["priority", "legal title", "competing claims"]
        },
        {
            "id": 5,
            "maxim": "Equity follows the law",
            "explanation": "Equity operates alongside legal principles, not against them.",
            "source": "Roark - Kingdom vs Empire, Page 8",
            "related_doctrines": ["Statutory Interpretation", "Legal Rules"],
            "tags": ["law", "harmony", "legal framework"]
        },
        {
            "id": 6,
            "maxim": "He who seeks equity must do equity",
            "explanation": "A party seeking equitable relief must act fairly and fulfill their own obligations.",
            "source": "Roark - Kingdom vs Empire, Page 8",
            "related_doctrines": ["Clean Hands", "Mutuality"],
            "tags": ["fairness", "reciprocity", "conduct"]
        },
        {
            "id": 7,
            "maxim": "He who comes into equity must come with clean hands",
            "explanation": "A party seeking equitable relief must not have engaged in inequitable conduct.",
            "source": "Roark - Kingdom vs Empire, Page 9",
            "related_doctrines": ["Unclean Hands Defense", "Good Faith"],
            "tags": ["conduct", "good faith", "defense"]
        },
        {
            "id": 8,
            "maxim": "Equity delights in equality",
            "explanation": "Where there is doubt, equity prefers equal division among parties.",
            "source": "Roark - Kingdom vs Empire, Page 9",
            "related_doctrines": ["Distribution", "Partition"],
            "tags": ["equality", "distribution", "fairness"]
        },
        {
            "id": 9,
            "maxim": "Equity will not aid a volunteer",
            "explanation": "Someone who provides consideration without receiving anything may not receive equitable assistance.",
            "source": "Roark - Kingdom vs Empire, Page 10",
            "related_doctrines": ["Consideration", "Gratuitous Promise"],
            "tags": ["consideration", "volunteer", "enforceability"]
        },
        {
            "id": 10,
            "maxim": "Equity imputes an intention to fulfill an obligation",
            "explanation": "Equity presumes parties intend to fulfill their obligations.",
            "source": "Roark - Kingdom vs Empire, Page 10",
            "related_doctrines": ["Performance", "Satisfaction"],
            "tags": ["intent", "obligation", "presumption"]
        },
        {
            "id": 11,
            "maxim": "Equity acts in personam",
            "explanation": "Equity operates on the conscience of the individual, not directly on property.",
            "source": "Roark - Kingdom vs Empire, Page 11",
            "related_doctrines": ["In Personam", "In Rem"],
            "tags": ["jurisdiction", "person", "property"]
        },
        {
            "id": 12,
            "maxim": "Delay defeats equity (Laches)",
            "explanation": "Unreasonable delay in asserting a right may bar equitable relief.",
            "source": "Roark - Kingdom vs Empire, Page 11",
            "related_doctrines": ["Laches", "Limitations"],
            "tags": ["time", "delay", "bar"]
        }
    ]
    return maxims


@api_router.get("/knowledge/relationships")
async def get_relationships():
    """Get duty-right relationship pairs"""
    relationships = [
        {
            "id": "trustee_beneficiary",
            "left_party": "Trustee",
            "right_party": "Beneficiary (Cestui Que Trust)",
            "left_duties": ["Hold legal title", "Manage trust property", "Act in beneficiary's interest", "Keep accounts", "Distribute according to terms"],
            "right_rights": ["Equitable title", "Enforce trust", "Receive distributions", "Accounting", "Sue for breach"],
            "explanation": "The trustee holds legal title and manages property for the beneficiary who holds equitable title. This is the core relationship in trust law.",
            "source": "Roark - Kingdom vs Empire, Pages 15-20"
        },
        {
            "id": "agent_principal",
            "left_party": "Agent",
            "right_party": "Principal",
            "left_duties": ["Act within authority", "Loyalty to principal", "Account for property", "Exercise care", "Follow instructions"],
            "right_rights": ["Control agent", "Receive benefits", "Ratify actions", "Sue for breach", "Terminate agency"],
            "explanation": "An agent acts on behalf of the principal within delegated authority. The agent's actions bind the principal to third parties.",
            "source": "Roark - Kingdom vs Empire, Pages 25-28"
        },
        {
            "id": "surety_creditor",
            "left_party": "Surety",
            "right_party": "Creditor",
            "left_duties": ["Guarantee debt", "Pay if principal defaults", "Honor bond terms"],
            "right_rights": ["Demand payment", "Sue surety", "Enforce security"],
            "explanation": "A surety guarantees another's obligation and becomes liable if the principal debtor fails to perform.",
            "source": "Roark - Kingdom vs Empire, Pages 30-32"
        },
        {
            "id": "grantor_trustee",
            "left_party": "Grantor/Settlor",
            "right_party": "Trustee",
            "left_duties": ["Transfer property", "Define trust terms", "Provide consideration"],
            "right_rights": ["Receive consideration", "Manage per terms", "Reasonable compensation"],
            "explanation": "The grantor creates the trust and transfers property to the trustee who accepts the duties of management.",
            "source": "Pure Trust Under Equity, Pages 1-3"
        }
    ]
    return relationships


# ============ PDF SOURCE LIBRARY ============

@api_router.get("/sources")
async def get_sources():
    """Get available PDF sources"""
    return [
        {
            "id": "roark",
            "name": "Kingdom vs Empire",
            "full_name": "Roark - Kingdom vs Empire Feb 2020",
            "url": PDF_SOURCES["roark"]["url"],
            "description": "Comprehensive guide to equity jurisprudence, maxims, and trust relationships."
        },
        {
            "id": "pure_trust",
            "name": "Pure Trust Under Equity",
            "full_name": "Pure Trust Under Equity",
            "url": PDF_SOURCES["pure_trust"]["url"],
            "description": "Template documents and forms for establishing pure equity trusts."
        }
    ]


@api_router.get("/sources/{source_id}/search")
async def search_source(source_id: str, q: str):
    """Search within a specific PDF source (basic implementation)"""
    # In production, this would search pre-indexed chunks
    # For now, return mock results
    if source_id not in PDF_SOURCES:
        raise HTTPException(status_code=404, detail="Source not found")
    
    return {
        "query": q,
        "source": PDF_SOURCES[source_id]["name"],
        "results": [
            {
                "page": 1,
                "excerpt": f"Search results for '{q}' would appear here...",
                "relevance": 0.85
            }
        ],
        "note": "Full-text search requires PDF indexing"
    }


# ============ AI ASSISTANT ENDPOINTS ============

@api_router.post("/assistant/chat")
async def chat_with_assistant(data: ChatRequest, request: Request):
    """Chat with the AI assistant grounded in PDFs"""
    user = await get_optional_user(request)
    user_id = user.user_id if user else "anonymous"
    session_id = data.session_id or f"session_{uuid.uuid4().hex[:12]}"
    
    # Get API key
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # System message for grounded responses
        system_message = """You are the Equity Trust Assistant, an AI expert on pure equity trusts and equitable jurisprudence.

YOUR KNOWLEDGE BASE:
You have deep knowledge from two authoritative source documents:
- "Kingdom vs Empire" (Roark) - covers equity history, maxims, trust relationships
- "Pure Trust Under Equity" - covers trust document templates and forms

RESPONSE GUIDELINES:
1. When a topic IS covered in the sources, cite them: [Source Name]
2. When a topic is NOT directly covered but relates to equity/trust law, provide helpful educational explanation from your general knowledge, noting it's supplementary information
3. Be helpful and educational - this is a learning platform
4. Structure responses clearly with definitions, explanations, and examples when helpful
5. For legal concepts, explain both the historical basis and modern application

KEY TOPICS IN YOUR SOURCE DOCUMENTS:
- 20+ Maxims of Equity with explanations and applications
- Trust relationships: Trustee-Beneficiary, Agent-Principal, Grantor-Trustee
- Trust parties: Settlor/Grantor, Trustee, Beneficiary (Cestui Que Trust)
- Pure trust structure under equity principles
- Trust documents: Declaration of Trust, Trust Transfer Grant Deed, Notices, Affidavits
- Equitable doctrines: Conversion, Laches, Clean Hands, Constructive Trust
- Equity vs Common Law distinctions

RELATED CONCEPTS (from general equity knowledge):
- Constructive trusts and resulting trusts
- Fiduciary duties (loyalty, care, prudence, impartiality)
- Equitable remedies (specific performance, injunction)
- Notice doctrine and priority
- Bona fide purchaser rule

When users ask about constructive trusts or other equity concepts, provide helpful educational explanations drawing on equity principles."""

        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        # Build context from knowledge base
        context_parts = []
        
        # Add maxims context if question relates to maxims
        if any(word in data.message.lower() for word in ['maxim', 'equity', 'principle']):
            maxims_data = await get_maxims()
            context_parts.append("MAXIMS OF EQUITY FROM SOURCES:")
            for m in maxims_data[:6]:  # First 6 maxims
                context_parts.append(f"- {m['maxim']} [Source: {m['source']}]")
        
        # Add relationship context if question relates to relationships
        if any(word in data.message.lower() for word in ['trustee', 'beneficiary', 'agent', 'principal', 'duty', 'right', 'relationship', 'constructive', 'resulting', 'express trust', 'implied']):
            rels_data = await get_relationships()
            context_parts.append("\nRELATIONSHIPS FROM SOURCES:")
            for r in rels_data[:3]:
                context_parts.append(f"- {r['left_party']} ↔ {r['right_party']} [Source: {r['source']}]")
        
        context = "\n".join(context_parts) if context_parts else ""
        
        # Build user message with context
        full_message = data.message
        if context:
            full_message = f"CONTEXT FROM SOURCE DOCUMENTS:\n{context}\n\nUSER QUESTION: {data.message}"
        
        user_message = UserMessage(text=full_message)
        response = await chat.send_message(user_message)
        
        # Save messages to database
        user_msg_doc = {
            "message_id": f"msg_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "session_id": session_id,
            "role": "user",
            "content": data.message,
            "citations": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.chat_messages.insert_one(user_msg_doc)
        
        assistant_msg_doc = {
            "message_id": f"msg_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "session_id": session_id,
            "role": "assistant",
            "content": response,
            "citations": [],  # Would extract citations in production
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.chat_messages.insert_one(assistant_msg_doc)
        
        return {
            "response": response,
            "session_id": session_id,
            "disclaimer": "This is for educational purposes only and does not constitute legal advice."
        }
        
    except Exception as e:
        logger.error(f"Assistant error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Assistant error: {str(e)}")


@api_router.get("/assistant/history/{session_id}")
async def get_chat_history(session_id: str, user: User = Depends(get_current_user)):
    """Get chat history for a session"""
    messages = await db.chat_messages.find(
        {"session_id": session_id, "user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    return messages


# ============ AI DOCUMENT TOOLS ============

class GenerateDocumentRequest(BaseModel):
    template_id: str  # Template to use
    portfolio_id: str
    instructions: str  # What to fill in
    title: Optional[str] = None


class UpdateDocumentRequest(BaseModel):
    document_id: str
    instructions: str  # What changes to make


@api_router.post("/assistant/generate-document")
async def ai_generate_document(data: GenerateDocumentRequest, user: User = Depends(get_current_user)):
    """Generate a document from template using AI"""
    # Get the template from the hardcoded list
    templates = await get_templates()
    template = next((t for t in templates if t.get('id') == data.template_id), None)
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Get user's trust profile for context
    trust_profile = await db.trust_profiles.find_one(
        {"portfolio_id": data.portfolio_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Build context from trust profile
        profile_context = ""
        if trust_profile:
            profile_context = f"""
TRUST PROFILE DATA:
- Trust Name: {trust_profile.get('trust_name', 'N/A')}
- Grantor: {trust_profile.get('grantor_name', 'N/A')}
- Trustee: {trust_profile.get('trustee_name', 'N/A')}
- Beneficiary: {trust_profile.get('beneficiary_name', 'N/A')}
- RM-ID: {trust_profile.get('rm_id_raw', 'N/A')}
"""
        
        system_message = """You are a document generation assistant for an equity trust platform.
Your task is to fill in legal document templates with the provided information.
Maintain the exact structure and formatting of the template.
Only fill in placeholders and blank fields - do not remove any standard language.
Use professional, precise legal language.
If information is missing, use appropriate placeholder text like "[TO BE COMPLETED]"."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"gen_{uuid.uuid4().hex[:8]}",
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Generate a legal document based on this template type and instructions.

TEMPLATE NAME: {template.get('name', 'Document')}
TEMPLATE DESCRIPTION: {template.get('description', '')}
TEMPLATE SOURCE: {template.get('source', '')}
FIELDS TO INCLUDE: {', '.join(template.get('fields', []))}

{profile_context}

USER INSTRUCTIONS:
{data.instructions}

Generate a complete, professional legal document in HTML format. Include:
1. A clear heading with the document title
2. All standard sections for this document type
3. Placeholders like [TO BE COMPLETED] for any missing information
4. Proper legal language and formatting
5. Signature blocks if appropriate for this document type

Return ONLY the document content in HTML format."""

        user_message = UserMessage(text=prompt)
        generated_content = await chat.send_message(user_message)
        
        # Generate RM-ID for the new document
        subject_code = "05"  # Contract/Documents category
        rm_id, cat_code, seq_num, cat_name = await generate_subject_rm_id(
            data.portfolio_id, user.user_id, subject_code, "Contract"
        )
        
        # Create the document
        doc = Document(
            portfolio_id=data.portfolio_id,
            user_id=user.user_id,
            title=data.title or f"Generated: {template.get('name', 'Document')}",
            content=generated_content,
            document_type=template.get('id', 'general'),
            rm_id=rm_id,
            sub_record_id=rm_id,
            status="draft",
            template_id=data.template_id
        )
        
        doc_dict = doc.model_dump()
        doc_dict['created_at'] = doc_dict['created_at'].isoformat()
        doc_dict['updated_at'] = doc_dict['updated_at'].isoformat()
        doc_dict['last_accessed'] = doc_dict['last_accessed'].isoformat()
        
        await db.documents.insert_one(doc_dict)
        
        return {
            "message": "Document generated successfully",
            "document_id": doc.document_id,
            "rm_id": rm_id,
            "title": doc.title
        }
        
    except Exception as e:
        logger.error(f"Document generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Generation error: {str(e)}")


@api_router.post("/assistant/update-document")
async def ai_update_document(data: UpdateDocumentRequest, user: User = Depends(get_current_user)):
    """Update a document using AI based on instructions"""
    # Get the document
    doc = await db.documents.find_one(
        {"document_id": data.document_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if doc.get('is_locked'):
        raise HTTPException(status_code=400, detail="Cannot update finalized document")
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        system_message = """You are a document editing assistant for an equity trust platform.
Your task is to modify legal documents based on user instructions.
Maintain professional legal language and document structure.
Make only the requested changes - preserve everything else.
Return the complete updated document."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"upd_{uuid.uuid4().hex[:8]}",
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Update this document based on the user's instructions.

DOCUMENT TITLE: {doc.get('title', 'Document')}
DOCUMENT TYPE: {doc.get('document_type', 'general')}

CURRENT CONTENT:
{doc.get('content', '')}

USER INSTRUCTIONS:
{data.instructions}

Return ONLY the updated document content in HTML format. Preserve all formatting not explicitly changed."""

        user_message = UserMessage(text=prompt)
        updated_content = await chat.send_message(user_message)
        
        # Save version before update
        version_doc = {
            "version_id": f"ver_{uuid.uuid4().hex[:12]}",
            "document_id": data.document_id,
            "version_number": doc.get("version", 1),
            "content": doc.get("content", ""),
            "changed_by": user.user_id,
            "change_summary": f"AI Update: {data.instructions[:100]}...",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.document_versions.insert_one(version_doc)
        
        # Update the document
        await db.documents.update_one(
            {"document_id": data.document_id},
            {
                "$set": {
                    "content": updated_content,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "version": doc.get("version", 1) + 1
                }
            }
        )
        
        return {
            "message": "Document updated successfully",
            "document_id": data.document_id,
            "version": doc.get("version", 1) + 1
        }
        
    except Exception as e:
        logger.error(f"Document update error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Update error: {str(e)}")


@api_router.post("/assistant/summarize-document")
async def ai_summarize_document(document_id: str, user: User = Depends(get_current_user)):
    """Generate an AI summary of a document"""
    doc = await db.documents.find_one(
        {"document_id": document_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"sum_{uuid.uuid4().hex[:8]}",
            system_message="You are a legal document analyst. Provide clear, concise summaries."
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Analyze this legal document and provide:
1. A brief summary (2-3 sentences)
2. Key parties involved
3. Main obligations or terms
4. Important dates or deadlines (if any)

DOCUMENT TITLE: {doc.get('title', 'Document')}
DOCUMENT TYPE: {doc.get('document_type', 'general')}

CONTENT:
{doc.get('content', '')}"""

        user_message = UserMessage(text=prompt)
        summary = await chat.send_message(user_message)
        
        return {
            "document_id": document_id,
            "title": doc.get('title'),
            "summary": summary
        }
        
    except Exception as e:
        logger.error(f"Summarization error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Summarization error: {str(e)}")


# ============ PDF EXPORT ENDPOINTS ============

def html_to_pdf_elements(html_content: str, styles):
    """Convert HTML content to ReportLab elements"""
    elements = []
    soup = BeautifulSoup(html_content, 'html.parser')
    
    h1_style = ParagraphStyle('H1', parent=styles['Heading1'], fontSize=18, alignment=TA_CENTER, spaceAfter=20, fontName='Times-Bold')
    h2_style = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=14, spaceAfter=12, fontName='Times-Bold')
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=11, alignment=TA_JUSTIFY, spaceAfter=10, fontName='Times-Roman', leading=14)
    
    for element in soup.children:
        if element.name == 'h1':
            elements.append(Paragraph(element.get_text(), h1_style))
        elif element.name == 'h2':
            elements.append(Paragraph(element.get_text(), h2_style))
        elif element.name == 'p':
            text = str(element).replace('<strong>', '<b>').replace('</strong>', '</b>')
            text = re.sub(r'<br\s*/?>', '<br/>', text)
            elements.append(Paragraph(text, body_style))
        elif element.name == 'ul':
            for li in element.find_all('li'):
                elements.append(Paragraph(f"• {li.get_text()}", body_style))
        elif element.name == 'ol':
            for idx, li in enumerate(element.find_all('li'), 1):
                elements.append(Paragraph(f"{idx}. {li.get_text()}", body_style))
        elif element.name and element.get_text().strip():
            elements.append(Paragraph(element.get_text(), body_style))
    
    return elements


@api_router.get("/documents/{document_id}/export/pdf")
async def export_document_pdf(document_id: str, user: User = Depends(get_current_user)):
    """Export document as PDF"""
    doc = await db.documents.find_one({"document_id": document_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    buffer = BytesIO()
    pdf_doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=60, leftMargin=60, topMargin=50, bottomMargin=50)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=16, alignment=TA_CENTER, spaceAfter=20, fontName='Times-Bold')
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=11, alignment=TA_JUSTIFY, spaceAfter=10, fontName='Times-Roman', leading=14)
    
    elements = []
    
    content = doc.get('content', '')
    if content:
        # Check if content is HTML
        if '<' in content and '>' in content:
            elements.extend(html_to_pdf_elements(content, styles))
        else:
            elements.append(Paragraph(doc.get('title', 'Document'), title_style))
            elements.append(Spacer(1, 0.2*inch))
            for para in content.split('\n\n'):
                if para.strip():
                    elements.append(Paragraph(para.strip(), body_style))
    else:
        elements.append(Paragraph(doc.get('title', 'Document'), title_style))
    
    # Add signature block
    elements.append(Spacer(1, 0.5*inch))
    elements.append(Paragraph("_" * 50, body_style))
    elements.append(Paragraph("Signature / Date", body_style))
    
    pdf_doc.build(elements)
    buffer.seek(0)
    
    filename = f"{doc.get('title', 'document').replace(' ', '_')}.pdf"
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})


class PacketRequest(BaseModel):
    name: str
    document_ids: List[str]


@api_router.post("/documents/packet")
async def create_document_packet(request: PacketRequest, user: User = Depends(get_current_user)):
    """Create a ZIP packet containing multiple documents as PDFs"""
    if not request.document_ids:
        raise HTTPException(status_code=400, detail="No documents selected")
    
    # Create ZIP buffer
    zip_buffer = BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for doc_id in request.document_ids:
            doc = await db.documents.find_one(
                {"document_id": doc_id, "user_id": user.user_id, "deleted_at": None},
                {"_id": 0}
            )
            
            if not doc:
                continue
            
            # Generate PDF for this document
            pdf_buffer = BytesIO()
            pdf_doc = SimpleDocTemplate(pdf_buffer, pagesize=letter)
            styles = getSampleStyleSheet()
            
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=18,
                spaceAfter=20
            )
            body_style = ParagraphStyle(
                'CustomBody',
                parent=styles['Normal'],
                fontSize=11,
                leading=14
            )
            
            elements = []
            elements.append(Paragraph(doc.get('title', 'Document'), title_style))
            elements.append(Spacer(1, 12))
            
            content = doc.get('editorContent', doc.get('content', ''))
            if content:
                soup = BeautifulSoup(content, 'html.parser')
                for elem in soup.find_all(['p', 'h1', 'h2', 'h3', 'li']):
                    text = elem.get_text().strip()
                    if text:
                        safe_text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                        if elem.name.startswith('h'):
                            elements.append(Paragraph(safe_text, styles['Heading2']))
                        else:
                            elements.append(Paragraph(safe_text, body_style))
                        elements.append(Spacer(1, 6))
            
            try:
                pdf_doc.build(elements)
                pdf_buffer.seek(0)
                
                # Add to ZIP with sanitized filename
                safe_title = re.sub(r'[^\w\s-]', '', doc.get('title', 'document'))
                zip_file.writestr(f"{safe_title}.pdf", pdf_buffer.getvalue())
            except Exception as e:
                logging.error(f"Failed to generate PDF for {doc_id}: {e}")
                continue
    
    zip_buffer.seek(0)
    
    filename = f"{request.name.replace(' ', '_')}.zip"
    return StreamingResponse(
        zip_buffer, 
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============ LEARNING PROGRESS ENDPOINTS ============

@api_router.get("/learning/progress")
async def get_learning_progress(user: User = Depends(get_current_user)):
    """Get all learning progress for user"""
    progress = await db.learning_progress.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    return progress


@api_router.get("/learning/progress/{module_id}")
async def get_module_progress(module_id: str, user: User = Depends(get_current_user)):
    """Get progress for a specific module"""
    progress = await db.learning_progress.find(
        {"user_id": user.user_id, "module_id": module_id}, {"_id": 0}
    ).to_list(100)
    return progress


@api_router.post("/learning/progress")
async def update_learning_progress(
    module_id: str,
    lesson_id: str,
    completed: bool = False,
    quiz_score: Optional[int] = None,
    time_spent: int = 0,
    user: User = Depends(get_current_user)
):
    """Update or create learning progress"""
    existing = await db.learning_progress.find_one({
        "user_id": user.user_id,
        "module_id": module_id,
        "lesson_id": lesson_id
    })
    
    now = datetime.now(timezone.utc)
    
    if existing:
        update_data = {
            "last_accessed": now.isoformat(),
            "time_spent_seconds": existing.get("time_spent_seconds", 0) + time_spent
        }
        if completed and not existing.get("completed"):
            update_data["completed"] = True
            update_data["completed_at"] = now.isoformat()
        if quiz_score is not None:
            update_data["quiz_score"] = quiz_score
            update_data["quiz_attempts"] = existing.get("quiz_attempts", 0) + 1
        
        await db.learning_progress.update_one(
            {"progress_id": existing["progress_id"]},
            {"$set": update_data}
        )
        return {"status": "updated", "progress_id": existing["progress_id"]}
    else:
        progress = LearningProgress(
            user_id=user.user_id,
            module_id=module_id,
            lesson_id=lesson_id,
            completed=completed,
            quiz_score=quiz_score,
            quiz_attempts=1 if quiz_score is not None else 0,
            time_spent_seconds=time_spent,
            completed_at=now if completed else None
        )
        progress_dict = progress.model_dump()
        progress_dict["last_accessed"] = progress_dict["last_accessed"].isoformat()
        progress_dict["created_at"] = progress_dict["created_at"].isoformat()
        if progress_dict["completed_at"]:
            progress_dict["completed_at"] = progress_dict["completed_at"].isoformat()
        
        await db.learning_progress.insert_one(progress_dict)
        return {"status": "created", "progress_id": progress.progress_id}


@api_router.post("/learning/bookmark")
async def toggle_bookmark(module_id: str, lesson_id: str, user: User = Depends(get_current_user)):
    """Toggle bookmark on a lesson"""
    existing = await db.learning_progress.find_one({
        "user_id": user.user_id,
        "module_id": module_id,
        "lesson_id": lesson_id
    })
    
    if existing:
        new_value = not existing.get("bookmarked", False)
        await db.learning_progress.update_one(
            {"progress_id": existing["progress_id"]},
            {"$set": {"bookmarked": new_value}}
        )
        return {"bookmarked": new_value}
    else:
        progress = LearningProgress(
            user_id=user.user_id,
            module_id=module_id,
            lesson_id=lesson_id,
            bookmarked=True
        )
        progress_dict = progress.model_dump()
        progress_dict["last_accessed"] = progress_dict["last_accessed"].isoformat()
        progress_dict["created_at"] = progress_dict["created_at"].isoformat()
        await db.learning_progress.insert_one(progress_dict)
        return {"bookmarked": True}


# ============ MAXIM STUDY/FLASHCARD ENDPOINTS ============

@api_router.get("/study/maxims")
async def get_maxim_study_progress(user: User = Depends(get_current_user)):
    """Get all maxim study progress"""
    progress = await db.maxim_study.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    return progress


@api_router.get("/study/maxims/due")
async def get_due_maxims(user: User = Depends(get_current_user)):
    """Get maxims due for review (spaced repetition)"""
    now = datetime.now(timezone.utc).isoformat()
    due = await db.maxim_study.find(
        {"user_id": user.user_id, "next_review": {"$lte": now}},
        {"_id": 0}
    ).sort("next_review", 1).to_list(20)
    return due


@api_router.post("/study/maxims/review")
async def review_maxim(
    maxim_id: int,
    quality: int,  # 0-5: 0-2 = fail, 3-5 = pass with varying ease
    user: User = Depends(get_current_user)
):
    """Record a maxim review using SM-2 spaced repetition algorithm"""
    existing = await db.maxim_study.find_one({
        "user_id": user.user_id,
        "maxim_id": maxim_id
    })
    
    now = datetime.now(timezone.utc)
    
    # SM-2 Algorithm implementation
    if existing:
        ef = existing.get("ease_factor", 2.5)
        interval = existing.get("interval_days", 1)
        reps = existing.get("repetitions", 0)
        streak = existing.get("correct_streak", 0)
        
        if quality >= 3:  # Correct response
            if reps == 0:
                interval = 1
            elif reps == 1:
                interval = 6
            else:
                interval = round(interval * ef)
            reps += 1
            streak += 1
        else:  # Incorrect response
            reps = 0
            interval = 1
            streak = 0
        
        # Update ease factor (minimum 1.3)
        ef = max(1.3, ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
        
        next_review = now + timedelta(days=interval)
        
        await db.maxim_study.update_one(
            {"study_id": existing["study_id"]},
            {"$set": {
                "ease_factor": ef,
                "interval_days": interval,
                "repetitions": reps,
                "next_review": next_review.isoformat(),
                "last_reviewed": now.isoformat(),
                "correct_streak": streak,
                "total_reviews": existing.get("total_reviews", 0) + 1
            }}
        )
    else:
        # First time studying this maxim
        interval = 1 if quality >= 3 else 0
        next_review = now + timedelta(days=interval)
        
        study = MaximStudyProgress(
            user_id=user.user_id,
            maxim_id=maxim_id,
            interval_days=interval,
            repetitions=1 if quality >= 3 else 0,
            next_review=next_review,
            last_reviewed=now,
            correct_streak=1 if quality >= 3 else 0,
            total_reviews=1
        )
        study_dict = study.model_dump()
        study_dict["next_review"] = study_dict["next_review"].isoformat()
        study_dict["last_reviewed"] = study_dict["last_reviewed"].isoformat()
        study_dict["created_at"] = study_dict["created_at"].isoformat()
        
        await db.maxim_study.insert_one(study_dict)
    
    return {"status": "recorded", "next_review_days": interval}


@api_router.get("/study/stats")
async def get_study_stats(user: User = Depends(get_current_user)):
    """Get overall study statistics"""
    # Learning progress stats
    total_lessons = await db.learning_progress.count_documents({"user_id": user.user_id})
    completed_lessons = await db.learning_progress.count_documents({
        "user_id": user.user_id,
        "completed": True
    })
    
    # Maxim study stats
    total_maxims_studied = await db.maxim_study.count_documents({"user_id": user.user_id})
    now = datetime.now(timezone.utc).isoformat()
    due_for_review = await db.maxim_study.count_documents({
        "user_id": user.user_id,
        "next_review": {"$lte": now}
    })
    
    # Calculate streak
    streak_docs = await db.maxim_study.find(
        {"user_id": user.user_id},
        {"correct_streak": 1, "_id": 0}
    ).to_list(100)
    max_streak = max([d.get("correct_streak", 0) for d in streak_docs]) if streak_docs else 0
    
    return {
        "lessons_started": total_lessons,
        "lessons_completed": completed_lessons,
        "completion_rate": round(completed_lessons / total_lessons * 100) if total_lessons > 0 else 0,
        "maxims_studied": total_maxims_studied,
        "maxims_due": due_for_review,
        "best_streak": max_streak
    }


# ============ STATS/DASHBOARD ENDPOINTS ============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: User = Depends(get_current_user)):
    """Get dashboard statistics"""
    portfolios_count = await db.portfolios.count_documents({"user_id": user.user_id})
    documents_count = await db.documents.count_documents({"user_id": user.user_id})
    assets_count = await db.assets.count_documents({"user_id": user.user_id})
    notices_pending = await db.notices.count_documents({"user_id": user.user_id, "status": "pending"})
    
    recent_docs = await db.documents.find(
        {"user_id": user.user_id}, {"_id": 0, "document_id": 1, "title": 1, "updated_at": 1}
    ).sort("updated_at", -1).limit(5).to_list(5)
    
    return {
        "portfolios": portfolios_count,
        "documents": documents_count,
        "assets": assets_count,
        "pending_notices": notices_pending,
        "recent_documents": recent_docs
    }


# ============ HEALTH CHECK ============

@api_router.get("/")
async def root():
    return {"message": "Equity Trust Portfolio API", "version": "2.0", "status": "operational"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
