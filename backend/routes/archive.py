"""
Black Archive Routes - Doctrine Vault for OmniGoVault
Educational content with citation-first approach
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4
from pydantic import BaseModel
from ..models import User

router = APIRouter(prefix="/archive", tags=["Black Archive"])

# These will be set by init function
db = None
get_current_user = None

def init_archive_routes(database, auth_func):
    global db, get_current_user
    db = database
    get_current_user = auth_func

# ============================================================================
# MODELS
# ============================================================================

class ArchiveSource(BaseModel):
    title: str
    source_type: str  # PRIMARY_SOURCE, SUPPORTED_INTERPRETATION, HYPOTHESIS
    jurisdiction: Optional[str] = "General"
    era_tags: List[str] = []
    topic_tags: List[str] = []
    citation: str
    url: Optional[str] = None
    excerpt: Optional[str] = None
    notes: Optional[str] = None

class ArchiveClaim(BaseModel):
    title: str
    status: str  # VERIFIED, DISPUTED, UNVERIFIED
    body: str
    evidence_source_ids: List[str] = []
    counter_source_ids: List[str] = []
    topic_tags: List[str] = []
    reality_check: Optional[str] = None
    practical_takeaway: Optional[str] = None

class ArchiveTrail(BaseModel):
    title: str
    description: str
    topic_tags: List[str] = []
    steps: List[dict] = []  # {order, title, content, source_ids, key_definitions}
    reality_check: Optional[str] = None

class ArchiveNode(BaseModel):
    node_type: str  # doctrine, case, statute, treatise, glossary
    ref_id: Optional[str] = None
    label: str
    meta: dict = {}
    position_x: float = 0
    position_y: float = 0

class ArchiveEdge(BaseModel):
    source_node_id: str
    target_node_id: str
    edge_type: str  # supports, contradicts, develops, limits, defines

class ReadingRoomQuery(BaseModel):
    query: str
    context: Optional[str] = None

# ============================================================================
# SOURCES ENDPOINTS
# ============================================================================

@router.get("/sources")
async def get_sources(
    search: Optional[str] = None,
    source_type: Optional[str] = None,
    topic: Optional[str] = None,
    jurisdiction: Optional[str] = None,
    era: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: User = Depends(get_current_user)
):
    """Get archive sources with filtering"""
    query = {}
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"citation": {"$regex": search, "$options": "i"}},
            {"excerpt": {"$regex": search, "$options": "i"}}
        ]
    
    if source_type:
        query["source_type"] = source_type
    
    if topic:
        query["topic_tags"] = topic
    
    if jurisdiction:
        query["jurisdiction"] = jurisdiction
    
    if era:
        query["era_tags"] = era
    
    sources = await db.archive_sources.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.archive_sources.count_documents(query)
    
    return {"sources": sources, "total": total}

@router.get("/sources/{source_id}")
async def get_source(source_id: str, user: User = Depends(get_current_user)):
    """Get a single source by ID"""
    source = await db.archive_sources.find_one({"source_id": source_id}, {"_id": 0})
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return source

@router.post("/sources")
async def create_source(source: ArchiveSource, user: User = Depends(get_current_user)):
    """Create a new archive source (admin only in future)"""
    source_data = {
        "source_id": str(uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.user_id,
        **source.dict()
    }
    await db.archive_sources.insert_one(source_data)
    return {"source_id": source_data["source_id"]}

# ============================================================================
# CLAIMS (DOSSIERS) ENDPOINTS
# ============================================================================

@router.get("/claims")
async def get_claims(
    search: Optional[str] = None,
    status: Optional[str] = None,
    topic: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: User = Depends(get_current_user)
):
    """Get archive claims with filtering"""
    query = {}
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"body": {"$regex": search, "$options": "i"}}
        ]
    
    if status:
        query["status"] = status
    
    if topic:
        query["topic_tags"] = topic
    
    claims = await db.archive_claims.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.archive_claims.count_documents(query)
    
    return {"claims": claims, "total": total}

@router.get("/claims/{claim_id}")
async def get_claim(claim_id: str, user: User = Depends(get_current_user)):
    """Get a single claim with its evidence sources"""
    claim = await db.archive_claims.find_one({"claim_id": claim_id}, {"_id": 0})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    # Fetch evidence sources
    if claim.get("evidence_source_ids"):
        evidence = await db.archive_sources.find(
            {"source_id": {"$in": claim["evidence_source_ids"]}},
            {"_id": 0}
        ).to_list(100)
        claim["evidence_sources"] = evidence
    
    # Fetch counter sources
    if claim.get("counter_source_ids"):
        counter = await db.archive_sources.find(
            {"source_id": {"$in": claim["counter_source_ids"]}},
            {"_id": 0}
        ).to_list(100)
        claim["counter_sources"] = counter
    
    return claim

@router.post("/claims")
async def create_claim(claim: ArchiveClaim, user: User = Depends(get_current_user)):
    """Create a new archive claim"""
    claim_data = {
        "claim_id": str(uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.user_id,
        **claim.dict()
    }
    await db.archive_claims.insert_one(claim_data)
    return {"claim_id": claim_data["claim_id"]}

# ============================================================================
# TRAILS (TRACKS) ENDPOINTS
# ============================================================================

@router.get("/trails")
async def get_trails(
    topic: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get all doctrine trails"""
    query = {}
    if topic:
        query["topic_tags"] = topic
    
    trails = await db.archive_trails.find(query, {"_id": 0}).to_list(100)
    return {"trails": trails}

@router.get("/trails/{trail_id}")
async def get_trail(trail_id: str, user: User = Depends(get_current_user)):
    """Get a single trail with full step details"""
    trail = await db.archive_trails.find_one({"trail_id": trail_id}, {"_id": 0})
    if not trail:
        raise HTTPException(status_code=404, detail="Trail not found")
    
    # Fetch sources for each step
    all_source_ids = []
    for step in trail.get("steps", []):
        all_source_ids.extend(step.get("source_ids", []))
    
    if all_source_ids:
        sources = await db.archive_sources.find(
            {"source_id": {"$in": all_source_ids}},
            {"_id": 0}
        ).to_list(100)
        trail["sources"] = {s["source_id"]: s for s in sources}
    
    return trail

@router.post("/trails")
async def create_trail(trail: ArchiveTrail, user: User = Depends(get_current_user)):
    """Create a new doctrine trail"""
    trail_data = {
        "trail_id": str(uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.user_id,
        **trail.dict()
    }
    await db.archive_trails.insert_one(trail_data)
    return {"trail_id": trail_data["trail_id"]}

# ============================================================================
# MAP NODES & EDGES ENDPOINTS
# ============================================================================

@router.get("/map")
async def get_archive_map(user: User = Depends(get_current_user)):
    """Get all nodes and edges for the archive map"""
    nodes = await db.archive_nodes.find({}, {"_id": 0}).to_list(500)
    edges = await db.archive_edges.find({}, {"_id": 0}).to_list(1000)
    return {"nodes": nodes, "edges": edges}

@router.post("/map/nodes")
async def create_node(node: ArchiveNode, user: User = Depends(get_current_user)):
    """Create a map node"""
    node_data = {
        "node_id": str(uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        **node.dict()
    }
    await db.archive_nodes.insert_one(node_data)
    return {"node_id": node_data["node_id"]}

@router.post("/map/edges")
async def create_edge(edge: ArchiveEdge, user: User = Depends(get_current_user)):
    """Create a map edge"""
    edge_data = {
        "edge_id": str(uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        **edge.dict()
    }
    await db.archive_edges.insert_one(edge_data)
    return {"edge_id": edge_data["edge_id"]}

# ============================================================================
# READING ROOM (AI ASSISTANT)
# ============================================================================

@router.post("/reading-room/query")
async def reading_room_query(query: ReadingRoomQuery, user: User = Depends(get_current_user)):
    """
    AI-powered archive assistant that only responds using archive content.
    Citation-first approach - must cite sources or refuse.
    """
    # Search for relevant sources
    search_query = {
        "$or": [
            {"title": {"$regex": query.query, "$options": "i"}},
            {"citation": {"$regex": query.query, "$options": "i"}},
            {"excerpt": {"$regex": query.query, "$options": "i"}},
            {"notes": {"$regex": query.query, "$options": "i"}}
        ]
    }
    
    relevant_sources = await db.archive_sources.find(search_query, {"_id": 0}).limit(10).to_list(10)
    
    # Search for relevant claims
    claim_query = {
        "$or": [
            {"title": {"$regex": query.query, "$options": "i"}},
            {"body": {"$regex": query.query, "$options": "i"}}
        ]
    }
    relevant_claims = await db.archive_claims.find(claim_query, {"_id": 0}).limit(5).to_list(5)
    
    # Search glossary
    glossary_query = {"term": {"$regex": query.query, "$options": "i"}}
    glossary_terms = await db.glossary.find(glossary_query, {"_id": 0}).limit(5).to_list(5)
    
    if not relevant_sources and not relevant_claims and not glossary_terms:
        return {
            "response": "Not supported by sources in this vault.",
            "sources": [],
            "claims": [],
            "glossary": [],
            "suggestions": [
                "Try searching for specific legal terms",
                "Browse the Doctrine Trails for guided learning",
                "Check the Index for available topics"
            ]
        }
    
    # Build response with citations
    response_parts = []
    
    if glossary_terms:
        response_parts.append("**Definitions found:**")
        for term in glossary_terms[:3]:
            response_parts.append(f"- **{term.get('term', 'Unknown')}**: {term.get('definition', 'No definition')[:200]}...")
    
    if relevant_claims:
        response_parts.append("\n**Related Dossiers:**")
        for claim in relevant_claims[:3]:
            status = claim.get('status', 'UNVERIFIED')
            response_parts.append(f"- [{status}] {claim.get('title', 'Untitled')}")
    
    if relevant_sources:
        response_parts.append("\n**Primary Sources:**")
        for source in relevant_sources[:5]:
            source_type = source.get('source_type', 'UNKNOWN')
            response_parts.append(f"- [{source_type}] {source.get('title', 'Untitled')} — *{source.get('citation', 'No citation')}*")
    
    return {
        "response": "\n".join(response_parts),
        "sources": relevant_sources,
        "claims": relevant_claims,
        "glossary": glossary_terms,
        "suggestions": []
    }

# ============================================================================
# STATS ENDPOINT
# ============================================================================

@router.get("/stats")
async def get_archive_stats(user: User = Depends(get_current_user)):
    """Get archive statistics"""
    sources_count = await db.archive_sources.count_documents({})
    claims_count = await db.archive_claims.count_documents({})
    trails_count = await db.archive_trails.count_documents({})
    
    # Count by type
    primary_count = await db.archive_sources.count_documents({"source_type": "PRIMARY_SOURCE"})
    interpretation_count = await db.archive_sources.count_documents({"source_type": "SUPPORTED_INTERPRETATION"})
    hypothesis_count = await db.archive_sources.count_documents({"source_type": "HYPOTHESIS"})
    
    # Count by status
    verified_count = await db.archive_claims.count_documents({"status": "VERIFIED"})
    disputed_count = await db.archive_claims.count_documents({"status": "DISPUTED"})
    
    return {
        "total_sources": sources_count,
        "total_claims": claims_count,
        "total_trails": trails_count,
        "by_type": {
            "primary": primary_count,
            "interpretation": interpretation_count,
            "hypothesis": hypothesis_count
        },
        "by_status": {
            "verified": verified_count,
            "disputed": disputed_count
        }
    }

# ============================================================================
# SEED DATA ENDPOINT (for initial setup)
# ============================================================================

@router.post("/seed")
async def seed_archive_data(user: User = Depends(get_current_user)):
    """Seed initial archive data"""
    
    # Check if already seeded
    existing = await db.archive_sources.count_documents({})
    if existing > 0:
        return {"message": "Archive already seeded", "sources": existing}
    
    # Seed sources
    sources = [
        {
            "source_id": str(uuid4()),
            "title": "Earl of Oxford's Case (1615)",
            "source_type": "PRIMARY_SOURCE",
            "jurisdiction": "England",
            "era_tags": ["1600-1900"],
            "topic_tags": ["Equity", "Trusts"],
            "citation": "1 Rep Ch 1, 21 ER 485",
            "excerpt": "Established the primacy of equity over common law when the two conflict.",
            "notes": "Foundation case for equity jurisprudence.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "source_id": str(uuid4()),
            "title": "Keech v Sandford (1726)",
            "source_type": "PRIMARY_SOURCE",
            "jurisdiction": "England",
            "era_tags": ["1600-1900"],
            "topic_tags": ["Trusts", "Fiduciary Duties"],
            "citation": "Sel Cas T King 61, 25 ER 223",
            "excerpt": "A trustee must not profit from the trust. Even if acting in good faith, any profit belongs to the beneficiary.",
            "notes": "Seminal case on fiduciary duty and the no-profit rule.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "source_id": str(uuid4()),
            "title": "Restatement (Third) of Trusts",
            "source_type": "SUPPORTED_INTERPRETATION",
            "jurisdiction": "US Federal",
            "era_tags": ["Modern"],
            "topic_tags": ["Trusts", "Fiduciary Duties"],
            "citation": "Restatement (Third) of Trusts (2003)",
            "excerpt": "Comprehensive treatise on trust law principles as understood in modern American jurisprudence.",
            "notes": "Influential but not binding authority.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "source_id": str(uuid4()),
            "title": "31 U.S.C. § 5103 - Legal Tender",
            "source_type": "PRIMARY_SOURCE",
            "jurisdiction": "US Federal",
            "era_tags": ["Modern"],
            "topic_tags": ["Monetary History", "Legal Tender"],
            "citation": "31 U.S.C. § 5103",
            "excerpt": "United States coins and currency are legal tender for all debts, public charges, taxes, and dues.",
            "notes": "Current statutory framework for legal tender in the United States.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "source_id": str(uuid4()),
            "title": "UCC Article 3 - Negotiable Instruments",
            "source_type": "PRIMARY_SOURCE",
            "jurisdiction": "US Federal",
            "era_tags": ["Modern"],
            "topic_tags": ["Negotiable Instruments"],
            "citation": "U.C.C. Art. 3",
            "excerpt": "Governs negotiable instruments including promissory notes, drafts, and checks.",
            "notes": "Adopted in all 50 states with minor variations.",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.archive_sources.insert_many(sources)
    
    # Seed claims (dossiers)
    claims = [
        {
            "claim_id": str(uuid4()),
            "title": "Equity Follows the Law — and Where Equity Overrides Form",
            "status": "VERIFIED",
            "body": "Equity courts developed to address deficiencies in common law remedies. While equity follows the law, it can override legal form when substance and fairness require it.",
            "evidence_source_ids": [sources[0]["source_id"]],
            "counter_source_ids": [],
            "topic_tags": ["Equity", "Trusts"],
            "reality_check": "Courts consistently apply equitable principles but within established doctrinal limits. Equity is not a license to ignore law.",
            "practical_takeaway": "Understand both legal and equitable remedies. Equity supplements but does not replace legal rights.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "claim_id": str(uuid4()),
            "title": "Constructive Trust: Remedy, Not a Magic Keyword",
            "status": "VERIFIED",
            "body": "A constructive trust is an equitable remedy imposed by courts to prevent unjust enrichment. It is not a trust created by parties but a judicial remedy.",
            "evidence_source_ids": [sources[0]["source_id"], sources[2]["source_id"]],
            "counter_source_ids": [],
            "topic_tags": ["Trusts", "Equity"],
            "reality_check": "Courts impose constructive trusts in specific circumstances: fraud, breach of fiduciary duty, unjust enrichment. Simply claiming a constructive trust exists does not make it so.",
            "practical_takeaway": "Constructive trusts require court action. They are remedies, not self-executing arrangements.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "claim_id": str(uuid4()),
            "title": "Fiduciary Duty: The Highest Standard (and the Standard Courts Enforce)",
            "status": "VERIFIED",
            "body": "Fiduciary duty imposes the highest standard of care in law. A fiduciary must act with undivided loyalty, prudence, and full disclosure.",
            "evidence_source_ids": [sources[1]["source_id"], sources[2]["source_id"]],
            "counter_source_ids": [],
            "topic_tags": ["Fiduciary Duties", "Trusts"],
            "reality_check": "Courts take fiduciary breaches seriously. Remedies include surcharge, removal, and constructive trust. But the duty must actually exist—not all relationships are fiduciary.",
            "practical_takeaway": "Know when fiduciary duties apply. Document compliance. Avoid conflicts of interest.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "claim_id": str(uuid4()),
            "title": "Negotiable Instruments: What They Are and What They Are Not",
            "status": "VERIFIED",
            "body": "Negotiable instruments under UCC Article 3 include promissory notes, drafts, and checks meeting specific requirements. They enable transfer of payment rights.",
            "evidence_source_ids": [sources[4]["source_id"]],
            "counter_source_ids": [],
            "topic_tags": ["Negotiable Instruments"],
            "reality_check": "Not everything called a 'note' is negotiable. Specific formal requirements must be met. Holder in due course status provides protections but has limits.",
            "practical_takeaway": "Understand negotiability requirements before relying on instrument protections.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "claim_id": str(uuid4()),
            "title": "Fiat Currency & Legal Tender: What the Law Actually Says",
            "status": "VERIFIED",
            "body": "US currency is legal tender by statute. This means it must be accepted for debts but does not mandate acceptance for all transactions.",
            "evidence_source_ids": [sources[3]["source_id"]],
            "counter_source_ids": [],
            "topic_tags": ["Monetary History", "Legal Tender"],
            "reality_check": "Legal tender laws are straightforward. Private parties can agree to other payment methods. Businesses can refuse cash in many contexts.",
            "practical_takeaway": "Legal tender status has specific legal meaning. It does not support broader monetary theories without additional evidence.",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.archive_claims.insert_many(claims)
    
    # Seed trails
    trails = [
        {
            "trail_id": str(uuid4()),
            "title": "Chancery Origins → Modern Trusts",
            "description": "Trace the evolution of equity from medieval England to modern trust law.",
            "topic_tags": ["Equity", "Trusts"],
            "steps": [
                {
                    "order": 1,
                    "title": "The Problem: Common Law Rigidity",
                    "content": "Medieval common law courts offered limited remedies. Rigid forms of action left many wrongs without remedy.",
                    "source_ids": [],
                    "key_definitions": ["common law", "forms of action"]
                },
                {
                    "order": 2,
                    "title": "The Chancellor's Court",
                    "content": "The Lord Chancellor, as keeper of the King's conscience, began hearing petitions for relief where common law was inadequate.",
                    "source_ids": [],
                    "key_definitions": ["equity", "chancellor"]
                },
                {
                    "order": 3,
                    "title": "Earl of Oxford's Case",
                    "content": "Established that equity prevails over common law when they conflict, cementing Chancery's authority.",
                    "source_ids": [sources[0]["source_id"]],
                    "key_definitions": []
                },
                {
                    "order": 4,
                    "title": "The Use and the Trust",
                    "content": "The 'use' allowed separation of legal and beneficial ownership. The Statute of Uses (1536) and its workarounds led to the modern trust.",
                    "source_ids": [],
                    "key_definitions": ["use", "trust", "beneficiary"]
                },
                {
                    "order": 5,
                    "title": "Modern Trust Law",
                    "content": "Today, trusts are governed by statute and common law, with the Restatement providing influential guidance.",
                    "source_ids": [sources[2]["source_id"]],
                    "key_definitions": []
                }
            ],
            "reality_check": "Trust law is well-developed and courts apply established principles. Novel theories require strong support.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "trail_id": str(uuid4()),
            "title": "Fiduciary Duty & Accounting",
            "description": "Understand the highest standard of care in law and how courts enforce it.",
            "topic_tags": ["Fiduciary Duties", "Trusts"],
            "steps": [
                {
                    "order": 1,
                    "title": "What Makes a Relationship Fiduciary?",
                    "content": "Not all relationships are fiduciary. Key indicators: trust and confidence, vulnerability, reliance, discretionary power.",
                    "source_ids": [],
                    "key_definitions": ["fiduciary", "principal"]
                },
                {
                    "order": 2,
                    "title": "The Duty of Loyalty",
                    "content": "A fiduciary must act solely in the beneficiary's interest. No self-dealing, no conflicts of interest.",
                    "source_ids": [sources[1]["source_id"]],
                    "key_definitions": ["loyalty", "self-dealing"]
                },
                {
                    "order": 3,
                    "title": "The Duty of Prudence",
                    "content": "Fiduciaries must act with reasonable care, skill, and caution. The standard is objective.",
                    "source_ids": [sources[2]["source_id"]],
                    "key_definitions": ["prudent investor rule"]
                },
                {
                    "order": 4,
                    "title": "Duty to Account",
                    "content": "Fiduciaries must maintain records and provide accountings. Beneficiaries have the right to information.",
                    "source_ids": [],
                    "key_definitions": ["accounting", "surcharge"]
                },
                {
                    "order": 5,
                    "title": "Remedies for Breach",
                    "content": "Breach of fiduciary duty can result in surcharge, removal, constructive trust, or damages.",
                    "source_ids": [],
                    "key_definitions": ["surcharge", "constructive trust"]
                }
            ],
            "reality_check": "Fiduciary duty claims are taken seriously but require proof of the relationship and breach. Courts don't invent fiduciary relationships.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "trail_id": str(uuid4()),
            "title": "Negotiable Instruments 101 → Holder in Due Course",
            "description": "Master the fundamentals of negotiable instruments under the UCC.",
            "topic_tags": ["Negotiable Instruments"],
            "steps": [
                {
                    "order": 1,
                    "title": "What Is a Negotiable Instrument?",
                    "content": "An unconditional promise or order to pay a fixed amount of money, payable on demand or at a definite time.",
                    "source_ids": [sources[4]["source_id"]],
                    "key_definitions": ["negotiable instrument", "note", "draft"]
                },
                {
                    "order": 2,
                    "title": "Requirements for Negotiability",
                    "content": "Writing, signed, unconditional promise/order, fixed amount, payable in money, payable on demand or at definite time, payable to bearer or order.",
                    "source_ids": [sources[4]["source_id"]],
                    "key_definitions": ["bearer", "order"]
                },
                {
                    "order": 3,
                    "title": "Transfer and Negotiation",
                    "content": "Transfer is delivery; negotiation requires proper endorsement for order instruments.",
                    "source_ids": [],
                    "key_definitions": ["endorsement", "negotiation"]
                },
                {
                    "order": 4,
                    "title": "Holder in Due Course",
                    "content": "A holder who takes for value, in good faith, without notice of defects takes free of most defenses.",
                    "source_ids": [sources[4]["source_id"]],
                    "key_definitions": ["holder in due course", "real defenses"]
                },
                {
                    "order": 5,
                    "title": "Defenses and Limitations",
                    "content": "Real defenses (fraud in factum, incapacity, illegality) are good against even HDCs. Personal defenses are cut off.",
                    "source_ids": [],
                    "key_definitions": ["real defense", "personal defense"]
                }
            ],
            "reality_check": "UCC Article 3 is technical. Courts apply it strictly. DIY negotiable instrument theories often fail because they misunderstand requirements.",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.archive_trails.insert_many(trails)
    
    return {
        "message": "Archive seeded successfully",
        "sources": len(sources),
        "claims": len(claims),
        "trails": len(trails)
    }
