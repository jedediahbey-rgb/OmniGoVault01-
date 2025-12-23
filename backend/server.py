from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


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


class TrustDocument(BaseModel):
    document_id: str = Field(default_factory=lambda: f"doc_{uuid.uuid4().hex[:12]}")
    user_id: str
    document_type: str
    title: str
    status: str = "draft"  # draft, completed
    grantor_name: str = ""
    grantor_address: str = ""
    trustee_name: str = ""
    trustee_address: str = ""
    beneficiary_name: str = ""
    beneficiary_address: str = ""
    trust_name: str = ""
    trust_purpose: str = ""
    property_description: str = ""
    additional_terms: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TrustDocumentCreate(BaseModel):
    document_type: str
    title: str


class TrustDocumentUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    grantor_name: Optional[str] = None
    grantor_address: Optional[str] = None
    trustee_name: Optional[str] = None
    trustee_address: Optional[str] = None
    beneficiary_name: Optional[str] = None
    beneficiary_address: Optional[str] = None
    trust_name: Optional[str] = None
    trust_purpose: Optional[str] = None
    property_description: Optional[str] = None
    additional_terms: Optional[str] = None


# ============ AUTH HELPERS ============

async def get_current_user(request: Request) -> User:
    """Get current user from session token (cookie or header)"""
    # Check cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry with timezone awareness
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Convert datetime strings back to datetime objects if needed
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)


# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    """Exchange session_id for session_token after Google OAuth"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get user data
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
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info if changed
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    
    # Create session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session_doc = {
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Remove old sessions for user
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one(session_doc)
    
    # Set httpOnly cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60  # 7 days
    )
    
    # Get user for response
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {"user": user_doc, "session_token": session_token}


@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture
    }


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user and clear session"""
    session_token = request.cookies.get("session_token")
    
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(
        key="session_token",
        path="/",
        secure=True,
        samesite="none"
    )
    
    return {"message": "Logged out successfully"}


# ============ TRUST DOCUMENT ENDPOINTS ============

@api_router.get("/trusts", response_model=List[TrustDocument])
async def get_trusts(user: User = Depends(get_current_user)):
    """Get all trust documents for current user"""
    docs = await db.trust_documents.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Convert datetime strings
    for doc in docs:
        if isinstance(doc.get('created_at'), str):
            doc['created_at'] = datetime.fromisoformat(doc['created_at'])
        if isinstance(doc.get('updated_at'), str):
            doc['updated_at'] = datetime.fromisoformat(doc['updated_at'])
    
    return docs


@api_router.post("/trusts", response_model=TrustDocument)
async def create_trust(data: TrustDocumentCreate, user: User = Depends(get_current_user)):
    """Create a new trust document"""
    doc = TrustDocument(
        user_id=user.user_id,
        document_type=data.document_type,
        title=data.title
    )
    
    doc_dict = doc.model_dump()
    doc_dict['created_at'] = doc_dict['created_at'].isoformat()
    doc_dict['updated_at'] = doc_dict['updated_at'].isoformat()
    
    await db.trust_documents.insert_one(doc_dict)
    
    return doc


@api_router.get("/trusts/{document_id}", response_model=TrustDocument)
async def get_trust(document_id: str, user: User = Depends(get_current_user)):
    """Get a specific trust document"""
    doc = await db.trust_documents.find_one(
        {"document_id": document_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Convert datetime strings
    if isinstance(doc.get('created_at'), str):
        doc['created_at'] = datetime.fromisoformat(doc['created_at'])
    if isinstance(doc.get('updated_at'), str):
        doc['updated_at'] = datetime.fromisoformat(doc['updated_at'])
    
    return doc


@api_router.put("/trusts/{document_id}", response_model=TrustDocument)
async def update_trust(
    document_id: str,
    data: TrustDocumentUpdate,
    user: User = Depends(get_current_user)
):
    """Update a trust document"""
    # Check document exists and belongs to user
    existing = await db.trust_documents.find_one(
        {"document_id": document_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not existing:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Build update dict
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.trust_documents.update_one(
        {"document_id": document_id},
        {"$set": update_data}
    )
    
    # Fetch updated document
    doc = await db.trust_documents.find_one(
        {"document_id": document_id},
        {"_id": 0}
    )
    
    if isinstance(doc.get('created_at'), str):
        doc['created_at'] = datetime.fromisoformat(doc['created_at'])
    if isinstance(doc.get('updated_at'), str):
        doc['updated_at'] = datetime.fromisoformat(doc['updated_at'])
    
    return doc


@api_router.delete("/trusts/{document_id}")
async def delete_trust(document_id: str, user: User = Depends(get_current_user)):
    """Delete a trust document"""
    result = await db.trust_documents.delete_one(
        {"document_id": document_id, "user_id": user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"message": "Document deleted successfully"}


@api_router.get("/trusts/{document_id}/pdf")
async def download_trust_pdf(document_id: str, user: User = Depends(get_current_user)):
    """Generate and download PDF for a trust document"""
    doc = await db.trust_documents.find_one(
        {"document_id": document_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Generate PDF
    buffer = BytesIO()
    pdf_doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72
    )
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        alignment=TA_CENTER,
        spaceAfter=30,
        fontName='Times-Bold'
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=12,
        fontName='Times-Bold'
    )
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=11,
        alignment=TA_JUSTIFY,
        spaceAfter=12,
        fontName='Times-Roman',
        leading=14
    )
    
    elements = []
    
    # Title
    elements.append(Paragraph(doc.get('title', 'TRUST DOCUMENT'), title_style))
    elements.append(Spacer(1, 0.3*inch))
    
    # Document type specific content
    doc_type = doc.get('document_type', '')
    
    if doc_type == 'declaration_of_trust':
        elements.append(Paragraph("DECLARATION OF TRUST", heading_style))
        elements.append(Paragraph(
            f"This Declaration of Trust is made on {datetime.now().strftime('%B %d, %Y')}.",
            body_style
        ))
        
    elif doc_type == 'trust_transfer_grant_deed':
        elements.append(Paragraph("TRUST TRANSFER GRANT DEED", heading_style))
        elements.append(Paragraph(
            "This Trust Transfer Grant Deed (TTGD) is executed to transfer property into trust.",
            body_style
        ))
        
    elif doc_type == 'notice_of_intent':
        elements.append(Paragraph("NOTICE OF INTENT TO PRESERVE INTEREST", heading_style))
        elements.append(Paragraph(
            "This Notice serves to preserve all equitable interests in the property described herein.",
            body_style
        ))
        
    elif doc_type == 'affidavit_of_fact':
        elements.append(Paragraph("AFFIDAVIT OF FACT", heading_style))
        elements.append(Paragraph(
            "I, the undersigned, being duly sworn, do hereby state the following facts:",
            body_style
        ))
    
    elements.append(Spacer(1, 0.3*inch))
    
    # Parties section
    elements.append(Paragraph("PARTIES TO THIS DOCUMENT", heading_style))
    
    # Grantor
    elements.append(Paragraph("<b>GRANTOR (Settlor):</b>", body_style))
    elements.append(Paragraph(f"Name: {doc.get('grantor_name', '_'*40)}", body_style))
    elements.append(Paragraph(f"Address: {doc.get('grantor_address', '_'*40)}", body_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Trustee
    elements.append(Paragraph("<b>TRUSTEE:</b>", body_style))
    elements.append(Paragraph(f"Name: {doc.get('trustee_name', '_'*40)}", body_style))
    elements.append(Paragraph(f"Address: {doc.get('trustee_address', '_'*40)}", body_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Beneficiary
    elements.append(Paragraph("<b>BENEFICIARY:</b>", body_style))
    elements.append(Paragraph(f"Name: {doc.get('beneficiary_name', '_'*40)}", body_style))
    elements.append(Paragraph(f"Address: {doc.get('beneficiary_address', '_'*40)}", body_style))
    elements.append(Spacer(1, 0.3*inch))
    
    # Trust Details
    if doc.get('trust_name'):
        elements.append(Paragraph("TRUST DETAILS", heading_style))
        elements.append(Paragraph(f"<b>Trust Name:</b> {doc.get('trust_name')}", body_style))
        
    if doc.get('trust_purpose'):
        elements.append(Paragraph(f"<b>Purpose:</b> {doc.get('trust_purpose')}", body_style))
    
    if doc.get('property_description'):
        elements.append(Spacer(1, 0.2*inch))
        elements.append(Paragraph("PROPERTY DESCRIPTION", heading_style))
        elements.append(Paragraph(doc.get('property_description'), body_style))
    
    if doc.get('additional_terms'):
        elements.append(Spacer(1, 0.2*inch))
        elements.append(Paragraph("ADDITIONAL TERMS AND CONDITIONS", heading_style))
        elements.append(Paragraph(doc.get('additional_terms'), body_style))
    
    # Equity principles section
    elements.append(Spacer(1, 0.3*inch))
    elements.append(Paragraph("EQUITABLE PRINCIPLES", heading_style))
    elements.append(Paragraph(
        "This trust is established under the principles of pure equity, recognizing that:",
        body_style
    ))
    elements.append(Paragraph(
        "• Equity regards as done that which ought to be done",
        body_style
    ))
    elements.append(Paragraph(
        "• Equity looks to the intent rather than to the form",
        body_style
    ))
    elements.append(Paragraph(
        "• Equity will not suffer a wrong to be without a remedy",
        body_style
    ))
    elements.append(Paragraph(
        "• The beneficiary is the true owner in equity",
        body_style
    ))
    
    # Signature block
    elements.append(Spacer(1, 0.5*inch))
    elements.append(Paragraph("SIGNATURES", heading_style))
    elements.append(Spacer(1, 0.3*inch))
    
    elements.append(Paragraph("_" * 50, body_style))
    elements.append(Paragraph("Grantor Signature / Date", body_style))
    elements.append(Spacer(1, 0.3*inch))
    
    elements.append(Paragraph("_" * 50, body_style))
    elements.append(Paragraph("Trustee Signature / Date", body_style))
    elements.append(Spacer(1, 0.3*inch))
    
    elements.append(Paragraph("_" * 50, body_style))
    elements.append(Paragraph("Witness Signature / Date", body_style))
    
    # Build PDF
    pdf_doc.build(elements)
    buffer.seek(0)
    
    filename = f"{doc.get('title', 'trust_document').replace(' ', '_')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============ TEMPLATE ENDPOINTS ============

@api_router.get("/templates")
async def get_templates():
    """Get available trust document templates"""
    templates = [
        {
            "id": "declaration_of_trust",
            "name": "Declaration of Trust",
            "description": "Establishes a pure equity trust structure with defined roles for grantor, trustee, and beneficiary.",
            "icon": "scroll"
        },
        {
            "id": "trust_transfer_grant_deed",
            "name": "Trust Transfer Grant Deed (TTGD)",
            "description": "Transfers property and rights into an existing trust structure.",
            "icon": "file-signature"
        },
        {
            "id": "notice_of_intent",
            "name": "Notice of Intent to Preserve Interest",
            "description": "Formal notice to preserve equitable interests in property.",
            "icon": "shield"
        },
        {
            "id": "affidavit_of_fact",
            "name": "Affidavit of Fact",
            "description": "Sworn statement establishing facts regarding trust or property matters.",
            "icon": "scale"
        }
    ]
    return templates


# ============ HEALTH CHECK ============

@api_router.get("/")
async def root():
    return {"message": "Sovereign Vault API", "status": "operational"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
