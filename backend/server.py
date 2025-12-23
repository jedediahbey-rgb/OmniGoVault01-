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
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY


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
    grantor_name: str = ""
    grantor_address: str = ""
    trustee_name: str = ""
    trustee_address: str = ""
    co_trustee_name: str = ""
    co_trustee_address: str = ""
    beneficiary_name: str = ""
    beneficiary_address: str = ""
    governing_statements: str = ""
    trust_term: str = ""
    renewal_terms: str = ""
    revocation_conditions: str = ""
    modification_conditions: str = ""
    extinguishment_conditions: str = ""
    conveyance_conditions: str = ""
    additional_notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AssetItem(BaseModel):
    asset_id: str = Field(default_factory=lambda: f"asset_{uuid.uuid4().hex[:12]}")
    portfolio_id: str
    user_id: str
    asset_type: str  # real_property, personal_property, financial_account, intellectual_property, other
    description: str
    value: Optional[str] = ""
    status: str = "active"  # active, transferred, released
    notes: str = ""
    attachments: List[str] = []  # list of attachment IDs
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


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
    user_id: str
    template_id: Optional[str] = None
    title: str
    document_type: str  # declaration_of_trust, ttgd, notice_of_intent, affidavit, custom
    content: str = ""  # JSON or rich text content
    status: str = "draft"  # draft, completed, signed
    tags: List[str] = []
    folder: str = "/"
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
    template_id: Optional[str] = None
    title: str
    document_type: str
    content: Optional[str] = ""
    tags: Optional[List[str]] = []
    folder: Optional[str] = "/"


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
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
    return {"message": "Portfolio deleted"}


# ============ TRUST PROFILE ENDPOINTS ============

@api_router.get("/portfolios/{portfolio_id}/trust-profile")
async def get_trust_profile(portfolio_id: str, user: User = Depends(get_current_user)):
    doc = await db.trust_profiles.find_one({"portfolio_id": portfolio_id, "user_id": user.user_id}, {"_id": 0})
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
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.trust_profiles.update_one({"profile_id": profile_id}, {"$set": update_data})
    doc = await db.trust_profiles.find_one({"profile_id": profile_id}, {"_id": 0})
    return doc


# ============ ASSET ENDPOINTS ============

@api_router.get("/portfolios/{portfolio_id}/assets")
async def get_assets(portfolio_id: str, user: User = Depends(get_current_user)):
    docs = await db.assets.find({"portfolio_id": portfolio_id, "user_id": user.user_id}, {"_id": 0}).to_list(100)
    return docs


@api_router.post("/assets")
async def create_asset(data: AssetCreate, user: User = Depends(get_current_user)):
    asset = AssetItem(
        portfolio_id=data.portfolio_id, user_id=user.user_id, asset_type=data.asset_type,
        description=data.description, value=data.value, notes=data.notes or ""
    )
    doc = asset.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.assets.insert_one(doc)
    # Return document without MongoDB _id field
    return {k: v for k, v in doc.items() if k != '_id'}


@api_router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str, user: User = Depends(get_current_user)):
    result = await db.assets.delete_one({"asset_id": asset_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {"message": "Asset deleted"}


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


# ============ DOCUMENT ENDPOINTS ============

@api_router.get("/documents")
async def get_documents(portfolio_id: Optional[str] = None, user: User = Depends(get_current_user)):
    query = {"user_id": user.user_id}
    if portfolio_id:
        query["portfolio_id"] = portfolio_id
    docs = await db.documents.find(query, {"_id": 0}).sort("updated_at", -1).to_list(100)
    return docs


@api_router.post("/documents")
async def create_document(data: DocumentCreate, user: User = Depends(get_current_user)):
    doc = Document(
        portfolio_id=data.portfolio_id, user_id=user.user_id, template_id=data.template_id,
        title=data.title, document_type=data.document_type, content=data.content or "",
        tags=data.tags or [], folder=data.folder or "/"
    )
    doc_dict = doc.model_dump()
    doc_dict['created_at'] = doc_dict['created_at'].isoformat()
    doc_dict['updated_at'] = doc_dict['updated_at'].isoformat()
    await db.documents.insert_one(doc_dict)
    # Return document without MongoDB _id field
    return {k: v for k, v in doc_dict.items() if k != '_id'}


@api_router.get("/documents/{document_id}")
async def get_document(document_id: str, user: User = Depends(get_current_user)):
    doc = await db.documents.find_one({"document_id": document_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


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
async def delete_document(document_id: str, user: User = Depends(get_current_user)):
    result = await db.documents.delete_one({"document_id": document_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.document_versions.delete_many({"document_id": document_id})
    return {"message": "Document deleted"}


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

@api_router.get("/templates")
async def get_templates():
    templates = [
        {
            "id": "declaration_of_trust",
            "name": "Declaration of Trust",
            "description": "Establishes a pure equity trust with defined roles for grantor/settlor, trustee, and beneficiary. Includes maxims of equity and governing statements.",
            "source": "Pure Trust Under Equity, Pages 1-5",
            "icon": "scroll",
            "fields": ["trust_name", "grantor", "trustee", "beneficiary", "property", "purpose", "terms"]
        },
        {
            "id": "trust_transfer_grant_deed",
            "name": "Trust Transfer Grant Deed (TTGD)",
            "description": "Conveys property and rights into an established trust structure with proper grant and habendum clauses.",
            "source": "Pure Trust Under Equity, Pages 6-8",
            "icon": "file-signature",
            "fields": ["grantor", "grantee", "property", "consideration", "covenants"]
        },
        {
            "id": "acknowledgement_receipt_acceptance",
            "name": "Acknowledgement / Receipt / Acceptance",
            "description": "Formal acknowledgement of receipt and acceptance for lawful consideration in trust transactions.",
            "source": "Pure Trust Under Equity, Page 9",
            "icon": "check-circle",
            "fields": ["parties", "items", "consideration", "date"]
        },
        {
            "id": "notice_of_interest",
            "name": "Notice of Interest",
            "description": "Formal notice declaring equitable interest in property or assets.",
            "source": "Pure Trust Under Equity, Page 10",
            "icon": "bell",
            "fields": ["declarant", "property", "interest_type", "effective_date"]
        },
        {
            "id": "notice_of_delivery",
            "name": "Notice of Delivery",
            "description": "Documentation of delivery of property or documents to trust.",
            "source": "Pure Trust Under Equity, Page 11",
            "icon": "package",
            "fields": ["sender", "recipient", "items", "date", "conditions"]
        },
        {
            "id": "special_notice_deed_conveyance",
            "name": "Special Notice of Deed of Conveyance",
            "description": "Special notice regarding conveyance of deed and title transfer.",
            "source": "Pure Trust Under Equity, Page 12",
            "icon": "stamp",
            "fields": ["grantor", "grantee", "property", "conveyance_terms"]
        },
        {
            "id": "affidavit_of_fact",
            "name": "Affidavit of Fact",
            "description": "Sworn statement establishing facts under oath with jurat.",
            "source": "Pure Trust Under Equity, Page 13",
            "icon": "scale",
            "fields": ["affiant", "facts", "attestation"]
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

STRICT RULES:
1. You may ONLY answer questions based on the two source documents:
   - "Kingdom vs Empire" (Roark) - covers equity history, maxims, trust relationships
   - "Pure Trust Under Equity" - covers trust document templates and forms

2. For EVERY substantive claim, you MUST cite the source: [Source Name, Page X]

3. If the user asks something NOT covered in the source documents, you MUST say: "This information is not found in the provided source documents."

4. NEVER invent citations or facts. If unsure, say so.

5. Include this disclaimer when giving advice: "This is for educational purposes only and does not constitute legal advice."

KEY TOPICS YOU CAN DISCUSS:
- Maxims of Equity (12 maxims covered in sources)
- Trust relationships (Trustee-Beneficiary, Agent-Principal, Grantor-Trustee)
- Pure trust structure and requirements
- Trust documents (Declaration of Trust, TTGD, Notices, Affidavits)
- Equitable principles and doctrines

When explaining concepts, structure your response with:
- Definition/Explanation
- Source citation
- Practical application (if relevant)"""

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
        if any(word in data.message.lower() for word in ['trustee', 'beneficiary', 'agent', 'principal', 'duty', 'right', 'relationship']):
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
