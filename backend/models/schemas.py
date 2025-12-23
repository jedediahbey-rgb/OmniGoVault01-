"""Request/Response schemas"""
from pydantic import BaseModel
from typing import Optional, List


# Portfolio schemas
class PortfolioCreate(BaseModel):
    name: str
    description: str = ""


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
    rm_record_id: Optional[str] = None
    rm_series_start: Optional[str] = None
    rm_series_end: Optional[str] = None
    rm_evidence_files: Optional[List[str]] = None
    # Tax ID fields
    trust_ein: Optional[str] = None
    estate_ein: Optional[str] = None
    tax_classification: Optional[str] = None
    tax_notes: Optional[str] = None
    status: Optional[str] = None


# Subject Category schemas
class SubjectCategoryCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = ""


class SubjectCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


# Asset schemas
class AssetCreate(BaseModel):
    portfolio_id: str
    asset_type: str
    description: str
    value: Optional[float] = None
    notes: str = ""


class AssetUpdate(BaseModel):
    description: Optional[str] = None
    asset_type: Optional[str] = None
    value: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    subject_code: Optional[str] = None


# Ledger schemas
class LedgerEntryCreate(BaseModel):
    entry_type: str
    description: str
    subject_code: Optional[str] = "00"
    value: Optional[float] = None
    balance_effect: Optional[str] = "credit"
    notes: Optional[str] = ""
    asset_id: Optional[str] = None
    document_id: Optional[str] = None


class LedgerEntryUpdate(BaseModel):
    description: Optional[str] = None
    value: Optional[float] = None
    notes: Optional[str] = None


# Mail Event schemas
class MailEventCreate(BaseModel):
    event_type: str
    description: str
    date: str
    rm_number: str = ""
    notes: str = ""


# Party schemas
class PartyCreate(BaseModel):
    portfolio_id: str
    role: str
    name: str
    address: str = ""
    email: str = ""
    phone: str = ""
    notes: str = ""
    is_primary: bool = False


class PartyUpdate(BaseModel):
    role: Optional[str] = None
    name: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    is_primary: Optional[bool] = None


# Notice schemas
class NoticeCreate(BaseModel):
    portfolio_id: str
    event_type: str
    title: str
    date: str
    description: str = ""


# Document schemas
class DocumentCreate(BaseModel):
    portfolio_id: str
    title: str
    content: str = ""
    document_type: str = "general"
    template_id: Optional[str] = None
    rm_id: str = ""
    sub_record_id: str = ""


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    document_type: Optional[str] = None
    status: Optional[str] = None


# Chat schemas
class ChatRequest(BaseModel):
    message: str
    session_id: str = ""
    portfolio_id: Optional[str] = None


class SearchRequest(BaseModel):
    query: str
    pdf_filter: Optional[str] = None


# AI Document schemas
class GenerateDocumentRequest(BaseModel):
    template_id: str
    portfolio_id: str
    instructions: str
    title: Optional[str] = None


class UpdateDocumentRequest(BaseModel):
    document_id: str
    instructions: str
