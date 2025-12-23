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


def generate_declaration_of_trust_pdf(doc, buffer):
    """Generate Declaration of Trust PDF based on pure equity trust structure"""
    pdf_doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=60,
        leftMargin=60,
        topMargin=50,
        bottomMargin=50
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        alignment=TA_CENTER,
        spaceAfter=20,
        fontName='Times-Bold',
        textTransform='uppercase'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=12,
        spaceAfter=10,
        spaceBefore=15,
        fontName='Times-Bold'
    )
    
    article_style = ParagraphStyle(
        'ArticleStyle',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=8,
        fontName='Times-Bold',
        textColor=colors.black
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_JUSTIFY,
        spaceAfter=10,
        fontName='Times-Roman',
        leading=14
    )
    
    indent_style = ParagraphStyle(
        'IndentStyle',
        parent=body_style,
        leftIndent=20,
        spaceAfter=8
    )
    
    small_style = ParagraphStyle(
        'SmallStyle',
        parent=styles['Normal'],
        fontSize=9,
        alignment=TA_CENTER,
        spaceAfter=6,
        fontName='Times-Roman'
    )
    
    elements = []
    
    # Header
    elements.append(Paragraph("DECLARATION OF TRUST", title_style))
    elements.append(Paragraph(f"<b>{doc.get('trust_name', 'PURE EQUITY TRUST')}</b>", 
                             ParagraphStyle('TrustName', parent=title_style, fontSize=14)))
    elements.append(Spacer(1, 0.2*inch))
    
    # Preamble
    current_date = datetime.now().strftime('%B %d, %Y')
    grantor = doc.get('grantor_name', '[GRANTOR NAME]')
    trustee = doc.get('trustee_name', '[TRUSTEE NAME]')
    beneficiary = doc.get('beneficiary_name', '[BENEFICIARY NAME]')
    trust_name = doc.get('trust_name', '[TRUST NAME]')
    
    preamble = f"""This Declaration of Trust is a formal written and expressed trust indenture of the special 
trust relationship between the parties for all transaction(s)/account(s) as the corpus "res" of this Trust 
belonging to the Estate of {grantor} and any derivations by this Grantor/Settlor successors and assigns, 
jointly and severally, and this Trust's Trustee and anyone appointed under the authority of this Trust."""
    
    elements.append(Paragraph(preamble, body_style))
    elements.append(Spacer(1, 0.15*inch))
    
    # FIRST - Trust Name
    elements.append(Paragraph("FIRST: TRUST NAME AND DESIGNATION", article_style))
    elements.append(Paragraph(
        f"""The name of this Trust shall be: <b>{trust_name}</b>, an equitable asset title, 
for the use and benefit of the sole bona fide Trust beneficial interest holder in due course. 
Grantor hereby transfers Certificate of Legal Title of {trust_name} to Trustee for special purpose.""",
        body_style
    ))
    
    # SECOND - Beneficiary
    elements.append(Paragraph("SECOND: BENEFICIARY", article_style))
    elements.append(Paragraph(
        f"""The beneficiary of this Trust shall hold Trust Certificate by both the Settlor and Trustee. 
The Beneficiary is: <b>{beneficiary}</b>, residing at {doc.get('beneficiary_address', '[ADDRESS]')}. 
Beneficiary is competent with age of majority sufficient to terminate any presumed or express trust 
relation and possesses all right, title and interest in the trust. The beneficiary is the true owner 
in equity, holding equitable title while the Trustee holds legal title.""",
        body_style
    ))
    
    # THIRD - Duration
    elements.append(Paragraph("THIRD: DURATION AND REVOCABILITY", article_style))
    elements.append(Paragraph(
        """This Trust is revocable and modifiable by the Grantor/Settlor with all rights reserved and shall 
continue for a term of twenty-one (21) years from the date of trust res transfer to Trustees. Trust shall 
also be renewable, if renewed prior to its termination. The Grantor reserves the right to amend, modify, 
or revoke this Trust at any time during their lifetime.""",
        body_style
    ))
    
    # FOURTH - Governing Law
    elements.append(Paragraph("FOURTH: GOVERNING LAW", article_style))
    elements.append(Paragraph(
        """This Trust shall be administered, managed, governed and regulated in all respects according to 
the laws of equity, under judicial power and inherited civilian due process protections. The following 
Maxims of Equity shall govern the interpretation and administration of this Trust:""",
        body_style
    ))
    
    maxims = [
        "Equity regards as done that which ought to be done",
        "Equity looks to the intent rather than to the form",
        "Equity will not suffer a wrong to be without a remedy",
        "Where there are equal equities, the law shall prevail",
        "Equity follows the law",
        "He who seeks equity must do equity",
        "Equity delights in equality",
        "Equity will not aid a volunteer",
        "Equity imputes an intention to fulfill an obligation"
    ]
    
    for maxim in maxims:
        elements.append(Paragraph(f"• {maxim}", indent_style))
    
    # FIFTH - Trust Purpose
    elements.append(Paragraph("FIFTH: TRUST PURPOSE", article_style))
    trust_purpose = doc.get('trust_purpose', 'To hold, manage, and protect assets for the benefit of the beneficiary')
    elements.append(Paragraph(
        f"""The purpose of this Trust is to re-unite, deliver, transfer, and merge titles for all the corpus 
of this Trust for the use and benefit of the beneficiary. Specifically: {trust_purpose}""",
        body_style
    ))
    
    # SIXTH - Trustee Powers
    elements.append(Paragraph("SIXTH: POWERS OF TRUSTEE", article_style))
    elements.append(Paragraph(
        f"""The Trustee, <b>{trustee}</b>, shall have full dispositive and discretionary powers and is 
authorized by the Instrument to:""",
        body_style
    ))
    
    powers = [
        "Sell, convey, pledge, mortgage, lease, or transfer title to any interest in real or personal property",
        "Enforce any and all mortgages, pledges and deeds of trust held by the Trust",
        "Purchase at any sale any real or personal property subject to any mortgage, pledge or deed of trust",
        "Initiate or defend any litigation affecting the Trust",
        "Submit to a court of Equity, or in private, to compromise or release claims affecting the Trust estate",
        "Invest and reinvest Trust funds in any property deemed appropriate",
        "Make distributions to beneficiaries according to the terms of this Trust"
    ]
    
    for power in powers:
        elements.append(Paragraph(f"• {power}", indent_style))
    
    # SEVENTH - Trustee Compensation
    elements.append(Paragraph("SEVENTH: TRUSTEE COMPENSATION", article_style))
    elements.append(Paragraph(
        """The Trustees shall receive reasonable emolument for the services performed by the Trustees, 
but such emolument shall not exceed the amount customarily received by corporate fiduciaries in the 
area for like services.""",
        body_style
    ))
    
    # EIGHTH - Liability
    elements.append(Paragraph("EIGHTH: LIABILITY OF TRUSTEES", article_style))
    elements.append(Paragraph(
        """Trustees shall have full commercial and personal liability for the faithful performance of duties. 
No Trustee shall be held liable for any action or default of any other person in connection with the 
administration and management of this Trust unless caused by the individual's own gross negligence or 
by commission of a willful act of breach of Trust.""",
        body_style
    ))
    
    # NINTH - Severability
    elements.append(Paragraph("NINTH: SEVERABILITY", article_style))
    elements.append(Paragraph(
        """In the event that any portion of this Trust shall be held unlawful, invalid or otherwise 
inoperative, it is the intention of the Grantor that all of the other provisions hereof shall continue 
to be fully effective and operative insofar as is possible and reasonable.""",
        body_style
    ))
    
    # TENTH - Property Description
    if doc.get('property_description'):
        elements.append(Paragraph("TENTH: TRUST PROPERTY (CORPUS)", article_style))
        elements.append(Paragraph(
            f"""The following property is hereby transferred and conveyed to the Trustee to be held in 
trust according to the terms herein: {doc.get('property_description')}""",
            body_style
        ))
    
    # Additional Terms
    if doc.get('additional_terms'):
        elements.append(Paragraph("ELEVENTH: ADDITIONAL TERMS AND CONDITIONS", article_style))
        elements.append(Paragraph(doc.get('additional_terms'), body_style))
    
    # Parties
    elements.append(Spacer(1, 0.3*inch))
    elements.append(Paragraph("PARTIES TO THIS TRUST", heading_style))
    
    parties_data = [
        ["GRANTOR/SETTLOR:", grantor],
        ["Address:", doc.get('grantor_address', '[ADDRESS]')],
        ["", ""],
        ["TRUSTEE:", trustee],
        ["Address:", doc.get('trustee_address', '[ADDRESS]')],
        ["", ""],
        ["BENEFICIARY:", beneficiary],
        ["Address:", doc.get('beneficiary_address', '[ADDRESS]')]
    ]
    
    parties_table = Table(parties_data, colWidths=[1.5*inch, 4.5*inch])
    parties_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Times-Roman'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, 0), (0, -1), 'Times-Bold'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(parties_table)
    
    # Signature Block
    elements.append(Spacer(1, 0.4*inch))
    elements.append(Paragraph(
        f"""IN WITNESS WHEREOF, I hereunto set my hand and seal on this {current_date} and hereby declare 
under oath the execution, creation and establishment of this Trust:""",
        body_style
    ))
    
    elements.append(Spacer(1, 0.4*inch))
    
    sig_data = [
        ["_" * 45, "", "_" * 45],
        [f"{grantor}", "", "Date"],
        ["Grantor/Settlor", "", ""],
        ["", "", ""],
        ["_" * 45, "", "_" * 45],
        [f"{trustee}", "", "Date"],
        ["Trustee", "", ""],
    ]
    
    sig_table = Table(sig_data, colWidths=[2.5*inch, 0.5*inch, 2.5*inch])
    sig_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Times-Roman'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(sig_table)
    
    # Notarization
    elements.append(Spacer(1, 0.4*inch))
    elements.append(Paragraph("CERTIFICATE OF JURAT", heading_style))
    elements.append(Paragraph(
        f"""On this _____ day of _____________, 20___, before me, the undersigned notary public, 
duly authorized, appeared {grantor}, personally known to me, who subscribed before me this 
Declaration of Trust document and who affirmed before me under oath that the contents of the 
document are truthful and accurate to the best of their knowledge and belief.""",
        body_style
    ))
    
    elements.append(Spacer(1, 0.3*inch))
    notary_data = [
        ["_" * 45, "", "_" * 45],
        ["Notary Public Signature", "", "My Commission Expires"],
        ["", "", ""],
        ["(SEAL)", "", ""],
    ]
    
    notary_table = Table(notary_data, colWidths=[2.5*inch, 0.5*inch, 2.5*inch])
    notary_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Times-Roman'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ]))
    elements.append(notary_table)
    
    pdf_doc.build(elements)


def generate_trust_transfer_grant_deed_pdf(doc, buffer):
    """Generate Trust Transfer Grant Deed (TTGD) PDF"""
    pdf_doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=60,
        leftMargin=60,
        topMargin=50,
        bottomMargin=50
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle', parent=styles['Heading1'], fontSize=16, alignment=TA_CENTER,
        spaceAfter=20, fontName='Times-Bold'
    )
    heading_style = ParagraphStyle(
        'CustomHeading', parent=styles['Heading2'], fontSize=12, spaceAfter=10,
        spaceBefore=15, fontName='Times-Bold'
    )
    body_style = ParagraphStyle(
        'CustomBody', parent=styles['Normal'], fontSize=10, alignment=TA_JUSTIFY,
        spaceAfter=10, fontName='Times-Roman', leading=14
    )
    
    elements = []
    
    current_date = datetime.now().strftime('%B %d, %Y')
    grantor = doc.get('grantor_name', '[GRANTOR NAME]')
    trustee = doc.get('trustee_name', '[TRUSTEE NAME]')
    trust_name = doc.get('trust_name', '[TRUST NAME]')
    
    elements.append(Paragraph("TRUST TRANSFER GRANT DEED", title_style))
    elements.append(Paragraph("(Deed of Conveyance to Trust)", 
                             ParagraphStyle('Subtitle', parent=title_style, fontSize=12)))
    elements.append(Spacer(1, 0.2*inch))
    
    # Notice Statement
    elements.append(Paragraph(
        f"""This is Actual and Constructive Special Notice by the Grantor for sufficient private lawful 
and valuable consideration of the transfer of property and assets to the Trust herein described.""",
        body_style
    ))
    
    # Parties
    elements.append(Paragraph("PARTIES", heading_style))
    elements.append(Paragraph(
        f"""<b>GRANTOR:</b> {grantor}, residing at {doc.get('grantor_address', '[ADDRESS]')}, 
by their freewill act and Deed, executes this Deed of acknowledgement, receipt, and acceptance 
for private lawful consideration.""",
        body_style
    ))
    elements.append(Paragraph(
        f"""<b>GRANTEE (TRUSTEE):</b> {trustee}, as Trustee of {trust_name}, 
residing at {doc.get('trustee_address', '[ADDRESS]')}.""",
        body_style
    ))
    
    # Grant Clause
    elements.append(Paragraph("GRANT CLAUSE", heading_style))
    elements.append(Paragraph(
        f"""KNOW ALL MEN BY THESE PRESENTS, that the Grantor, {grantor}, for and in consideration 
of the sum of TEN DOLLARS ($10.00) and other good and valuable consideration, the receipt and 
sufficiency of which is hereby acknowledged, does hereby GRANT, BARGAIN, SELL, CONVEY, and CONFIRM 
unto {trustee}, as Trustee of {trust_name}, and their successors in trust forever, the following 
described property:""",
        body_style
    ))
    
    # Property Description
    elements.append(Paragraph("PROPERTY DESCRIPTION", heading_style))
    property_desc = doc.get('property_description', '[PROPERTY DESCRIPTION]')
    elements.append(Paragraph(property_desc, body_style))
    
    # Habendum Clause
    elements.append(Paragraph("HABENDUM CLAUSE", heading_style))
    elements.append(Paragraph(
        f"""TO HAVE AND TO HOLD the above-described property, together with all and singular the rights, 
privileges, appurtenances, and immunities thereto belonging or in anywise appertaining, unto the said 
Trustee of {trust_name}, and their successors in trust, FOREVER.""",
        body_style
    ))
    
    # Covenants
    elements.append(Paragraph("COVENANTS OF TITLE", heading_style))
    elements.append(Paragraph(
        """The Grantor hereby covenants with the Grantee that:""",
        body_style
    ))
    covenants = [
        "The Grantor is lawfully seized of the property in fee simple and has full power and authority to convey the same;",
        "The property is free from all encumbrances except as stated herein;",
        "The Grantor will warrant and forever defend the title to the property against all lawful claims;",
        "This conveyance is made pursuant to the principles of equity and the maxims thereof."
    ]
    for covenant in covenants:
        elements.append(Paragraph(f"• {covenant}", 
                                 ParagraphStyle('Indent', parent=body_style, leftIndent=20)))
    
    # Trust Reference
    elements.append(Paragraph("TRUST REFERENCE", heading_style))
    elements.append(Paragraph(
        f"""This Grant Deed is made subject to and in accordance with the terms and conditions of the 
Declaration of Trust creating {trust_name}, dated _____________, which Declaration of Trust is 
incorporated herein by reference.""",
        body_style
    ))
    
    # Signature Block
    elements.append(Spacer(1, 0.3*inch))
    elements.append(Paragraph(
        f"""Performed under my hand and seal, freewill act, volition and Deed on this {current_date}:""",
        body_style
    ))
    
    elements.append(Spacer(1, 0.4*inch))
    sig_data = [
        ["_" * 45, "", "_" * 45],
        [f"{grantor}", "", "Date"],
        ["Grantor", "", ""],
        ["", "", ""],
        ["_" * 45, "", "_" * 45],
        [f"{trustee}", "", "Date"],
        ["Trustee/Grantee", "", ""],
    ]
    sig_table = Table(sig_data, colWidths=[2.5*inch, 0.5*inch, 2.5*inch])
    sig_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Times-Roman'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
    ]))
    elements.append(sig_table)
    
    # Notarization
    elements.append(Spacer(1, 0.3*inch))
    elements.append(Paragraph("CERTIFICATE OF ACKNOWLEDGEMENT", heading_style))
    elements.append(Paragraph(
        f"""STATE OF _________________
COUNTY OF ________________

On this _____ day of _____________, 20___, before me, the undersigned notary public, personally 
appeared {grantor}, known to me (or proved to me on the basis of satisfactory evidence) to be the 
person whose name is subscribed to the within instrument and acknowledged to me that they executed 
the same in their authorized capacity, and that by their signature on the instrument the person, or 
the entity upon behalf of which the person acted, executed the instrument.""",
        body_style
    ))
    
    elements.append(Spacer(1, 0.3*inch))
    elements.append(Paragraph("_" * 45, body_style))
    elements.append(Paragraph("Notary Public", body_style))
    elements.append(Paragraph("My Commission Expires: _____________", body_style))
    
    pdf_doc.build(elements)


def generate_notice_of_intent_pdf(doc, buffer):
    """Generate Notice of Intent to Preserve Interest PDF"""
    pdf_doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=60,
        leftMargin=60,
        topMargin=50,
        bottomMargin=50
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle', parent=styles['Heading1'], fontSize=16, alignment=TA_CENTER,
        spaceAfter=20, fontName='Times-Bold'
    )
    heading_style = ParagraphStyle(
        'CustomHeading', parent=styles['Heading2'], fontSize=12, spaceAfter=10,
        spaceBefore=15, fontName='Times-Bold'
    )
    body_style = ParagraphStyle(
        'CustomBody', parent=styles['Normal'], fontSize=10, alignment=TA_JUSTIFY,
        spaceAfter=10, fontName='Times-Roman', leading=14
    )
    
    elements = []
    
    current_date = datetime.now().strftime('%B %d, %Y')
    grantor = doc.get('grantor_name', '[NAME]')
    trust_name = doc.get('trust_name', '[TRUST NAME]')
    beneficiary = doc.get('beneficiary_name', '[BENEFICIARY NAME]')
    
    elements.append(Paragraph("NOTICE OF INTENT TO PRESERVE INTEREST", title_style))
    elements.append(Spacer(1, 0.2*inch))
    
    elements.append(Paragraph("NOTICE", heading_style))
    elements.append(Paragraph(
        f"""NOTICE IS HEREBY GIVEN that {grantor}, as Grantor/Settlor and Beneficiary Interest Holder 
of {trust_name}, hereby declares their intent to preserve all equitable interests in the property 
and assets described herein.""",
        body_style
    ))
    
    elements.append(Paragraph("DECLARATION OF INTEREST", heading_style))
    elements.append(Paragraph(
        f"""The undersigned, {beneficiary}, hereby declares that they hold a beneficial interest in 
{trust_name} and hereby asserts and preserves all equitable rights, titles, and interests therein. 
This Notice is given pursuant to the Maxims of Equity which provide that "Equity will not suffer 
a wrong to be without a remedy" and "Where there are equal equities, priority prevails.\"""",
        body_style
    ))
    
    elements.append(Paragraph("AFFECTED PROPERTY", heading_style))
    property_desc = doc.get('property_description', '[PROPERTY DESCRIPTION]')
    elements.append(Paragraph(
        f"""The equitable interest being preserved relates to the following property: {property_desc}""",
        body_style
    ))
    
    elements.append(Paragraph("PURPOSE OF NOTICE", heading_style))
    trust_purpose = doc.get('trust_purpose', 'asset protection and management')
    elements.append(Paragraph(
        f"""This Notice is filed for the purpose of putting all parties on notice of the beneficial 
interest held in the above-described property. The purpose of the Trust is: {trust_purpose}. 
Any person claiming a superior interest must present their claim under sworn affidavit.""",
        body_style
    ))
    
    elements.append(Paragraph("CONTACT INFORMATION", heading_style))
    elements.append(Paragraph(
        f"""All inquiries regarding this Notice should be directed to:
{grantor}
{doc.get('grantor_address', '[ADDRESS]')}""",
        body_style
    ))
    
    # Additional Terms
    if doc.get('additional_terms'):
        elements.append(Paragraph("ADDITIONAL PROVISIONS", heading_style))
        elements.append(Paragraph(doc.get('additional_terms'), body_style))
    
    # Signature
    elements.append(Spacer(1, 0.3*inch))
    elements.append(Paragraph(
        f"""Signed, sealed, acknowledged and specially deposited on this {current_date} under my hand 
and seal affirmed under oath with intent, special purpose, freewill act and Deed.""",
        body_style
    ))
    
    elements.append(Spacer(1, 0.4*inch))
    elements.append(Paragraph("_" * 45, body_style))
    elements.append(Paragraph(f"{grantor}, Beneficiary Interest Holder", body_style))
    
    elements.append(Spacer(1, 0.3*inch))
    elements.append(Paragraph("CERTIFICATE OF JURAT", heading_style))
    elements.append(Paragraph(
        f"""On this _____ day of _____________, 20___, before me appeared {grantor}, 
personally known to me, who affirmed under oath that the contents of this Notice are truthful 
and accurate to the best of their knowledge and belief.""",
        body_style
    ))
    
    elements.append(Spacer(1, 0.3*inch))
    elements.append(Paragraph("_" * 45, body_style))
    elements.append(Paragraph("Notary Public", body_style))
    
    pdf_doc.build(elements)


def generate_affidavit_of_fact_pdf(doc, buffer):
    """Generate Affidavit of Fact PDF"""
    pdf_doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=60,
        leftMargin=60,
        topMargin=50,
        bottomMargin=50
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle', parent=styles['Heading1'], fontSize=16, alignment=TA_CENTER,
        spaceAfter=20, fontName='Times-Bold'
    )
    heading_style = ParagraphStyle(
        'CustomHeading', parent=styles['Heading2'], fontSize=12, spaceAfter=10,
        spaceBefore=15, fontName='Times-Bold'
    )
    body_style = ParagraphStyle(
        'CustomBody', parent=styles['Normal'], fontSize=10, alignment=TA_JUSTIFY,
        spaceAfter=10, fontName='Times-Roman', leading=14
    )
    numbered_style = ParagraphStyle(
        'NumberedStyle', parent=body_style, leftIndent=30, spaceAfter=8
    )
    
    elements = []
    
    current_date = datetime.now().strftime('%B %d, %Y')
    grantor = doc.get('grantor_name', '[AFFIANT NAME]')
    trust_name = doc.get('trust_name', '[TRUST NAME]')
    
    elements.append(Paragraph("AFFIDAVIT OF FACT", title_style))
    elements.append(Spacer(1, 0.2*inch))
    
    elements.append(Paragraph("AFFIANT DECLARATION", heading_style))
    elements.append(Paragraph(
        f"""I, {grantor}, being of lawful age and being duly sworn, do hereby depose and state 
the following facts under oath and under penalty of perjury:""",
        body_style
    ))
    
    elements.append(Paragraph("STATEMENT OF FACTS", heading_style))
    
    # Standard facts
    facts = [
        f"I am the Grantor/Settlor of {trust_name}.",
        f"I have established {trust_name} for lawful purposes in accordance with the principles of equity.",
        "I have the legal capacity and authority to create this Trust and execute this Affidavit.",
        "The Trust was created with proper consideration and in good faith.",
        "All transfers to the Trust were made voluntarily and without fraud or coercion.",
        "I affirm that the Trust is being administered according to its terms and the Maxims of Equity."
    ]
    
    for i, fact in enumerate(facts, 1):
        elements.append(Paragraph(f"{i}. {fact}", numbered_style))
    
    # Property facts if provided
    if doc.get('property_description'):
        elements.append(Paragraph("PROPERTY FACTS", heading_style))
        elements.append(Paragraph(
            f"7. The following property has been transferred to the Trust: {doc.get('property_description')}",
            numbered_style
        ))
        elements.append(Paragraph(
            "8. I affirm that I had full legal authority to transfer said property to the Trust.",
            numbered_style
        ))
    
    # Trust purpose facts
    if doc.get('trust_purpose'):
        elements.append(Paragraph("PURPOSE FACTS", heading_style))
        elements.append(Paragraph(
            f"The purpose of the Trust is: {doc.get('trust_purpose')}",
            body_style
        ))
    
    # Additional statements
    if doc.get('additional_terms'):
        elements.append(Paragraph("ADDITIONAL FACTS", heading_style))
        elements.append(Paragraph(doc.get('additional_terms'), body_style))
    
    # Attestation
    elements.append(Paragraph("ATTESTATION", heading_style))
    elements.append(Paragraph(
        """I declare under penalty of perjury under the laws of the jurisdiction in which this 
Affidavit is executed that the foregoing is true and correct to the best of my knowledge and belief. 
Further affiant sayeth not.""",
        body_style
    ))
    
    # Signature
    elements.append(Spacer(1, 0.4*inch))
    elements.append(Paragraph(
        f"""Executed on this {current_date}.""",
        body_style
    ))
    
    elements.append(Spacer(1, 0.4*inch))
    elements.append(Paragraph("_" * 45, body_style))
    elements.append(Paragraph(f"{grantor}", body_style))
    elements.append(Paragraph("Affiant", body_style))
    
    elements.append(Spacer(1, 0.3*inch))
    elements.append(Paragraph("JURAT", heading_style))
    elements.append(Paragraph(
        f"""STATE OF _________________
COUNTY OF ________________

Subscribed and sworn to (or affirmed) before me on this _____ day of _____________, 20___, 
by {grantor}, proved to me on the basis of satisfactory evidence to be the person who appeared 
before me.""",
        body_style
    ))
    
    elements.append(Spacer(1, 0.3*inch))
    elements.append(Paragraph("_" * 45, body_style))
    elements.append(Paragraph("Notary Public", body_style))
    elements.append(Paragraph("My Commission Expires: _____________", body_style))
    elements.append(Paragraph("(SEAL)", body_style))
    
    pdf_doc.build(elements)


@api_router.get("/trusts/{document_id}/pdf")
async def download_trust_pdf(document_id: str, user: User = Depends(get_current_user)):
    """Generate and download PDF for a trust document"""
    doc = await db.trust_documents.find_one(
        {"document_id": document_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Generate PDF based on document type
    buffer = BytesIO()
    doc_type = doc.get('document_type', '')
    
    if doc_type == 'declaration_of_trust':
        generate_declaration_of_trust_pdf(doc, buffer)
    elif doc_type == 'trust_transfer_grant_deed':
        generate_trust_transfer_grant_deed_pdf(doc, buffer)
    elif doc_type == 'notice_of_intent':
        generate_notice_of_intent_pdf(doc, buffer)
    elif doc_type == 'affidavit_of_fact':
        generate_affidavit_of_fact_pdf(doc, buffer)
    else:
        # Default generic format
        generate_declaration_of_trust_pdf(doc, buffer)
    
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
