"""
Black Archive Routes - Doctrine Vault for OmniGoVault
Educational content with citation-first approach
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4
from pydantic import BaseModel

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
    user = Depends(get_current_user)
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
async def get_source(source_id: str, user = Depends(get_current_user)):
    """Get a single source by ID"""
    source = await db.archive_sources.find_one({"source_id": source_id}, {"_id": 0})
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return source

@router.post("/sources")
async def create_source(source: ArchiveSource, request: Request):
    """Create a new archive source"""
    from server import get_current_user
    user = await get_current_user(request)
    
    source_data = {
        "source_id": str(uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.user_id,
        **source.dict()
    }
    await db.archive_sources.insert_one(source_data)
    return {"source_id": source_data["source_id"]}

@router.put("/sources/{source_id}")
async def update_source(source_id: str, source: ArchiveSource, request: Request):
    """Update an archive source"""
    from server import get_current_user
    user = await get_current_user(request)
    
    existing = await db.archive_sources.find_one({"source_id": source_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Source not found")
    
    update_data = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user.user_id,
        **source.dict()
    }
    await db.archive_sources.update_one(
        {"source_id": source_id},
        {"$set": update_data}
    )
    updated = await db.archive_sources.find_one({"source_id": source_id}, {"_id": 0})
    return updated

@router.delete("/sources/{source_id}")
async def delete_source(source_id: str, request: Request):
    """Delete an archive source"""
    from server import get_current_user
    user = await get_current_user(request)
    
    existing = await db.archive_sources.find_one({"source_id": source_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Check if source is referenced by any claims
    claim_refs = await db.archive_claims.count_documents({
        "$or": [
            {"evidence_source_ids": source_id},
            {"counter_source_ids": source_id}
        ]
    })
    if claim_refs > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete source: referenced by {claim_refs} claim(s)"
        )
    
    await db.archive_sources.delete_one({"source_id": source_id})
    return {"message": "Source deleted", "source_id": source_id}

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
    user = Depends(get_current_user)
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
async def get_claim(claim_id: str, user = Depends(get_current_user)):
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
async def create_claim(claim: ArchiveClaim, request: Request):
    """Create a new archive claim with automatic conflict detection"""
    from server import get_current_user
    user = await get_current_user(request)
    
    # Auto-detect disputed status based on counter sources
    claim_dict = claim.dict()
    if claim_dict.get("counter_source_ids") and len(claim_dict["counter_source_ids"]) > 0:
        if claim_dict.get("status") != "DISPUTED":
            claim_dict["status"] = "DISPUTED"
            claim_dict["auto_disputed"] = True
    
    claim_data = {
        "claim_id": str(uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.user_id,
        **claim_dict
    }
    await db.archive_claims.insert_one(claim_data)
    return {"claim_id": claim_data["claim_id"], "status": claim_data["status"]}

@router.put("/claims/{claim_id}")
async def update_claim(claim_id: str, claim: ArchiveClaim, request: Request):
    """Update an archive claim with automatic conflict detection"""
    from server import get_current_user
    user = await get_current_user(request)
    
    existing = await db.archive_claims.find_one({"claim_id": claim_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    # Auto-detect disputed status based on counter sources
    claim_dict = claim.dict()
    if claim_dict.get("counter_source_ids") and len(claim_dict["counter_source_ids"]) > 0:
        if claim_dict.get("status") != "DISPUTED":
            claim_dict["status"] = "DISPUTED"
            claim_dict["auto_disputed"] = True
    else:
        # Remove auto-disputed flag if no counter sources
        claim_dict["auto_disputed"] = False
    
    update_data = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user.user_id,
        **claim_dict
    }
    await db.archive_claims.update_one(
        {"claim_id": claim_id},
        {"$set": update_data}
    )
    updated = await db.archive_claims.find_one({"claim_id": claim_id}, {"_id": 0})
    return updated

@router.delete("/claims/{claim_id}")
async def delete_claim(claim_id: str, request: Request):
    """Delete an archive claim"""
    from server import get_current_user
    user = await get_current_user(request)
    
    existing = await db.archive_claims.find_one({"claim_id": claim_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    await db.archive_claims.delete_one({"claim_id": claim_id})
    return {"message": "Claim deleted", "claim_id": claim_id}

# ============================================================================
# TRAILS (TRACKS) ENDPOINTS
# ============================================================================

@router.get("/trails")
async def get_trails(
    topic: Optional[str] = None,
    user = Depends(get_current_user)
):
    """Get all doctrine trails"""
    query = {}
    if topic:
        query["topic_tags"] = topic
    
    trails = await db.archive_trails.find(query, {"_id": 0}).to_list(100)
    return {"trails": trails}

@router.get("/trails/{trail_id}")
async def get_trail(trail_id: str, user = Depends(get_current_user)):
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
async def create_trail(trail: ArchiveTrail, request: Request):
    """Create a new doctrine trail"""
    from server import get_current_user
    user = await get_current_user(request)
    
    trail_data = {
        "trail_id": str(uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.user_id,
        **trail.dict()
    }
    await db.archive_trails.insert_one(trail_data)
    return {"trail_id": trail_data["trail_id"]}

@router.put("/trails/{trail_id}")
async def update_trail(trail_id: str, trail: ArchiveTrail, request: Request):
    """Update a doctrine trail"""
    from server import get_current_user
    user = await get_current_user(request)
    
    existing = await db.archive_trails.find_one({"trail_id": trail_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Trail not found")
    
    update_data = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user.user_id,
        **trail.dict()
    }
    await db.archive_trails.update_one(
        {"trail_id": trail_id},
        {"$set": update_data}
    )
    updated = await db.archive_trails.find_one({"trail_id": trail_id}, {"_id": 0})
    return updated

@router.delete("/trails/{trail_id}")
async def delete_trail(trail_id: str, request: Request):
    """Delete a doctrine trail"""
    from server import get_current_user
    user = await get_current_user(request)
    
    existing = await db.archive_trails.find_one({"trail_id": trail_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Trail not found")
    
    await db.archive_trails.delete_one({"trail_id": trail_id})
    return {"message": "Trail deleted", "trail_id": trail_id}

# ============================================================================
# MAP NODES & EDGES ENDPOINTS
# ============================================================================

@router.get("/map")
async def get_archive_map(user = Depends(get_current_user)):
    """Get all nodes and edges for the archive map"""
    nodes = await db.archive_nodes.find({}, {"_id": 0}).to_list(500)
    edges = await db.archive_edges.find({}, {"_id": 0}).to_list(1000)
    return {"nodes": nodes, "edges": edges}

@router.post("/map/nodes")
async def create_node(node: ArchiveNode, user = Depends(get_current_user)):
    """Create a map node"""
    node_data = {
        "node_id": str(uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        **node.dict()
    }
    await db.archive_nodes.insert_one(node_data)
    return {"node_id": node_data["node_id"]}

@router.post("/map/edges")
async def create_edge(edge: ArchiveEdge, user = Depends(get_current_user)):
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
async def reading_room_query(query: ReadingRoomQuery, user = Depends(get_current_user)):
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
async def get_archive_stats(request: Request):
    """Get archive statistics"""
    # Import get_current_user directly to avoid dependency injection issues
    from server import get_current_user
    user = await get_current_user(request)
    
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
# ADMIN TOOLS - Conflict Detection & Bulk Operations
# ============================================================================

@router.post("/admin/scan-conflicts")
async def scan_and_update_conflicts(request: Request):
    """
    Scan all claims and automatically apply 'DISPUTED' status 
    to claims that have counter_source_ids populated.
    Returns a summary of changes made.
    """
    from server import get_current_user
    user = await get_current_user(request)
    
    # Find all claims with counter sources that aren't already DISPUTED
    claims_to_update = await db.archive_claims.find({
        "counter_source_ids": {"$exists": True, "$ne": []},
        "status": {"$ne": "DISPUTED"}
    }, {"_id": 0}).to_list(1000)
    
    updated_claims = []
    for claim in claims_to_update:
        await db.archive_claims.update_one(
            {"claim_id": claim["claim_id"]},
            {"$set": {
                "status": "DISPUTED",
                "auto_disputed": True,
                "dispute_detected_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        updated_claims.append({
            "claim_id": claim["claim_id"],
            "title": claim.get("title", "Untitled"),
            "counter_sources_count": len(claim.get("counter_source_ids", []))
        })
    
    # Also find claims marked DISPUTED but with no counter sources
    invalid_disputes = await db.archive_claims.find({
        "status": "DISPUTED",
        "$or": [
            {"counter_source_ids": {"$exists": False}},
            {"counter_source_ids": []}
        ],
        "auto_disputed": True  # Only revert auto-disputed ones
    }, {"_id": 0, "claim_id": 1, "title": 1}).to_list(1000)
    
    reverted_claims = []
    for claim in invalid_disputes:
        await db.archive_claims.update_one(
            {"claim_id": claim["claim_id"]},
            {"$set": {
                "status": "UNVERIFIED",
                "auto_disputed": False
            }}
        )
        reverted_claims.append({
            "claim_id": claim["claim_id"],
            "title": claim.get("title", "Untitled")
        })
    
    return {
        "message": "Conflict scan complete",
        "newly_disputed": len(updated_claims),
        "disputed_claims": updated_claims,
        "reverted_to_unverified": len(reverted_claims),
        "reverted_claims": reverted_claims
    }

@router.get("/admin/conflicts")
async def get_conflicting_claims(request: Request):
    """Get all claims that have conflicting sources (counter_source_ids)"""
    from server import get_current_user
    user = await get_current_user(request)
    
    claims = await db.archive_claims.find(
        {"counter_source_ids": {"$exists": True, "$ne": []}},
        {"_id": 0}
    ).to_list(100)
    
    # Enrich with source details
    for claim in claims:
        counter_ids = claim.get("counter_source_ids", [])
        if counter_ids:
            counter_sources = await db.archive_sources.find(
                {"source_id": {"$in": counter_ids}},
                {"_id": 0, "source_id": 1, "title": 1, "citation": 1}
            ).to_list(100)
            claim["counter_sources_detail"] = counter_sources
    
    return {
        "count": len(claims),
        "conflicting_claims": claims
    }

class BulkSourceCreate(BaseModel):
    sources: List[ArchiveSource]

@router.post("/admin/bulk/sources")
async def bulk_create_sources(data: BulkSourceCreate, user = Depends(get_current_user)):
    """Create multiple sources at once"""
    created = []
    for source in data.sources:
        source_data = {
            "source_id": str(uuid4()),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user.user_id,
            **source.dict()
        }
        await db.archive_sources.insert_one(source_data)
        created.append(source_data["source_id"])
    
    return {"message": f"Created {len(created)} sources", "source_ids": created}

class BulkClaimCreate(BaseModel):
    claims: List[ArchiveClaim]

@router.post("/admin/bulk/claims")
async def bulk_create_claims(data: BulkClaimCreate, user = Depends(get_current_user)):
    """Create multiple claims at once with automatic conflict detection"""
    created = []
    for claim in data.claims:
        claim_dict = claim.dict()
        # Auto-detect disputed status
        if claim_dict.get("counter_source_ids") and len(claim_dict["counter_source_ids"]) > 0:
            if claim_dict.get("status") != "DISPUTED":
                claim_dict["status"] = "DISPUTED"
                claim_dict["auto_disputed"] = True
        
        claim_data = {
            "claim_id": str(uuid4()),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user.user_id,
            **claim_dict
        }
        await db.archive_claims.insert_one(claim_data)
        created.append({"claim_id": claim_data["claim_id"], "status": claim_data["status"]})
    
    return {"message": f"Created {len(created)} claims", "claims": created}

class BulkTrailCreate(BaseModel):
    trails: List[ArchiveTrail]

@router.post("/admin/bulk/trails")
async def bulk_create_trails(data: BulkTrailCreate, user = Depends(get_current_user)):
    """Create multiple trails at once"""
    created = []
    for trail in data.trails:
        trail_data = {
            "trail_id": str(uuid4()),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user.user_id,
            **trail.dict()
        }
        await db.archive_trails.insert_one(trail_data)
        created.append(trail_data["trail_id"])
    
    return {"message": f"Created {len(created)} trails", "trail_ids": created}

@router.delete("/admin/reset")
async def reset_archive_data(user = Depends(get_current_user)):
    """Reset all archive data (use with caution)"""
    sources_deleted = await db.archive_sources.delete_many({})
    claims_deleted = await db.archive_claims.delete_many({})
    trails_deleted = await db.archive_trails.delete_many({})
    nodes_deleted = await db.archive_nodes.delete_many({})
    edges_deleted = await db.archive_edges.delete_many({})
    
    return {
        "message": "Archive data reset complete",
        "deleted": {
            "sources": sources_deleted.deleted_count,
            "claims": claims_deleted.deleted_count,
            "trails": trails_deleted.deleted_count,
            "nodes": nodes_deleted.deleted_count,
            "edges": edges_deleted.deleted_count
        }
    }

# ============================================================================
# SEED DATA ENDPOINT (for initial setup)
# ============================================================================

@router.post("/seed")
async def seed_archive_data(user = Depends(get_current_user)):
    """Seed initial archive data with expanded content"""
    
    # Check if already seeded
    existing = await db.archive_sources.count_documents({})
    if existing > 0:
        return {"message": "Archive already seeded", "sources": existing}
    
    # ========================================================================
    # SOURCES - Primary sources, interpretations, and hypotheses
    # ========================================================================
    sources = [
        {
            "source_id": "src-001",
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
            "source_id": "src-002",
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
            "source_id": "src-003",
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
            "source_id": "src-004",
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
            "source_id": "src-005",
            "title": "UCC Article 3 - Negotiable Instruments",
            "source_type": "PRIMARY_SOURCE",
            "jurisdiction": "US Federal",
            "era_tags": ["Modern"],
            "topic_tags": ["Negotiable Instruments"],
            "citation": "U.C.C. Art. 3",
            "excerpt": "Governs negotiable instruments including promissory notes, drafts, and checks.",
            "notes": "Adopted in all 50 states with minor variations.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "source_id": "src-006",
            "title": "Salomon v A Salomon & Co Ltd (1897)",
            "source_type": "PRIMARY_SOURCE",
            "jurisdiction": "England",
            "era_tags": ["1600-1900"],
            "topic_tags": ["Corporate Law", "Legal Personality"],
            "citation": "[1897] AC 22",
            "excerpt": "A properly formed company is a legal entity distinct from its members. The corporate veil separates shareholders from corporate liabilities.",
            "notes": "Foundational case for corporate separate personality doctrine.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "source_id": "src-007",
            "title": "Statute of Frauds (1677)",
            "source_type": "PRIMARY_SOURCE",
            "jurisdiction": "England",
            "era_tags": ["1600-1900"],
            "topic_tags": ["Contracts", "Trusts"],
            "citation": "29 Car. II c. 3",
            "excerpt": "Certain contracts must be evidenced in writing to be enforceable, including contracts for sale of land and trusts of land.",
            "notes": "Basis for writing requirements in contract and trust law.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "source_id": "src-008",
            "title": "Black's Law Dictionary (11th ed.)",
            "source_type": "SUPPORTED_INTERPRETATION",
            "jurisdiction": "General",
            "era_tags": ["Modern"],
            "topic_tags": ["Definitions", "Legal Terms"],
            "citation": "Black's Law Dictionary (11th ed. 2019)",
            "excerpt": "Standard reference for legal definitions in American courts.",
            "notes": "Widely cited but not primary authority.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "source_id": "src-009",
            "title": "Tulk v Moxhay (1848)",
            "source_type": "PRIMARY_SOURCE",
            "jurisdiction": "England",
            "era_tags": ["1600-1900"],
            "topic_tags": ["Property", "Equity", "Covenants"],
            "citation": "2 Ph 774, 41 ER 1143",
            "excerpt": "Restrictive covenants can bind successors in title if they have notice, even without privity of contract.",
            "notes": "Foundation for equitable servitudes in property law.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "source_id": "src-010",
            "title": "Coinage Act of 1792",
            "source_type": "PRIMARY_SOURCE",
            "jurisdiction": "US Federal",
            "era_tags": ["1700-1900"],
            "topic_tags": ["Monetary History", "Legal Tender"],
            "citation": "1 Stat. 246",
            "excerpt": "Established the United States Mint and regulated coinage, defining the dollar in terms of silver.",
            "notes": "Historical foundation for US monetary system.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "source_id": "src-011",
            "title": "Helvering v. Gregory (1934)",
            "source_type": "PRIMARY_SOURCE",
            "jurisdiction": "US Federal",
            "era_tags": ["Modern"],
            "topic_tags": ["Taxation", "Substance over Form"],
            "citation": "69 F.2d 809 (2d Cir. 1934)",
            "excerpt": "Transactions must have economic substance beyond tax avoidance. Form does not control when substance is lacking.",
            "notes": "Foundation for substance-over-form doctrine in tax law.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "source_id": "src-012",
            "title": "Federal Reserve Act (1913)",
            "source_type": "PRIMARY_SOURCE",
            "jurisdiction": "US Federal",
            "era_tags": ["Modern"],
            "topic_tags": ["Monetary History", "Banking"],
            "citation": "12 U.S.C. § 221 et seq.",
            "excerpt": "Established the Federal Reserve System as the central banking system of the United States.",
            "notes": "Current framework for US monetary policy.",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.archive_sources.insert_many(sources)
    
    # ========================================================================
    # CLAIMS (DOSSIERS) - 10 claim cards covering key topics
    # ========================================================================
    claims = [
        {
            "claim_id": "claim-001",
            "title": "Equity Follows the Law — and Where Equity Overrides Form",
            "status": "VERIFIED",
            "body": "Equity courts developed to address deficiencies in common law remedies. While equity follows the law, it can override legal form when substance and fairness require it.",
            "evidence_source_ids": ["src-001"],
            "counter_source_ids": [],
            "topic_tags": ["Equity", "Trusts"],
            "reality_check": "Courts consistently apply equitable principles but within established doctrinal limits. Equity is not a license to ignore law.",
            "practical_takeaway": "Understand both legal and equitable remedies. Equity supplements but does not replace legal rights.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "claim_id": "claim-002",
            "title": "Constructive Trust: Remedy, Not a Magic Keyword",
            "status": "VERIFIED",
            "body": "A constructive trust is an equitable remedy imposed by courts to prevent unjust enrichment. It is not a trust created by parties but a judicial remedy.",
            "evidence_source_ids": ["src-001", "src-003"],
            "counter_source_ids": [],
            "topic_tags": ["Trusts", "Equity"],
            "reality_check": "Courts impose constructive trusts in specific circumstances: fraud, breach of fiduciary duty, unjust enrichment. Simply claiming a constructive trust exists does not make it so.",
            "practical_takeaway": "Constructive trusts require court action. They are remedies, not self-executing arrangements.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "claim_id": "claim-003",
            "title": "Fiduciary Duty: The Highest Standard (and the Standard Courts Enforce)",
            "status": "VERIFIED",
            "body": "Fiduciary duty imposes the highest standard of care in law. A fiduciary must act with undivided loyalty, prudence, and full disclosure.",
            "evidence_source_ids": ["src-002", "src-003"],
            "counter_source_ids": [],
            "topic_tags": ["Fiduciary Duties", "Trusts"],
            "reality_check": "Courts take fiduciary breaches seriously. Remedies include surcharge, removal, and constructive trust. But the duty must actually exist—not all relationships are fiduciary.",
            "practical_takeaway": "Know when fiduciary duties apply. Document compliance. Avoid conflicts of interest.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "claim_id": "claim-004",
            "title": "Negotiable Instruments: What They Are and What They Are Not",
            "status": "VERIFIED",
            "body": "Negotiable instruments under UCC Article 3 include promissory notes, drafts, and checks meeting specific requirements. They enable transfer of payment rights.",
            "evidence_source_ids": ["src-005"],
            "counter_source_ids": [],
            "topic_tags": ["Negotiable Instruments"],
            "reality_check": "Not everything called a 'note' is negotiable. Specific formal requirements must be met. Holder in due course status provides protections but has limits.",
            "practical_takeaway": "Understand negotiability requirements before relying on instrument protections.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "claim_id": "claim-005",
            "title": "Fiat Currency & Legal Tender: What the Law Actually Says",
            "status": "VERIFIED",
            "body": "US currency is legal tender by statute. This means it must be accepted for debts but does not mandate acceptance for all transactions.",
            "evidence_source_ids": ["src-004", "src-012"],
            "counter_source_ids": [],
            "topic_tags": ["Monetary History", "Legal Tender"],
            "reality_check": "Legal tender laws are straightforward. Private parties can agree to other payment methods. Businesses can refuse cash in many contexts.",
            "practical_takeaway": "Legal tender status has specific legal meaning. It does not support broader monetary theories without additional evidence.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "claim_id": "claim-006",
            "title": "The Corporate Veil: Protection and Its Limits",
            "status": "VERIFIED",
            "body": "A properly formed corporation is a separate legal entity from its shareholders. However, courts can 'pierce the veil' in cases of fraud, undercapitalization, or alter ego situations.",
            "evidence_source_ids": ["src-006"],
            "counter_source_ids": [],
            "topic_tags": ["Corporate Law", "Legal Personality"],
            "reality_check": "Veil piercing is the exception, not the rule. Courts require strong evidence of abuse. Mere ownership alone is insufficient.",
            "practical_takeaway": "Maintain corporate formalities. Keep adequate capitalization. Avoid commingling funds.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "claim_id": "claim-007",
            "title": "The Strawman Theory: Legal Fiction Without Legal Support",
            "status": "DISPUTED",
            "body": "The 'strawman' theory claims that birth certificates create a separate legal entity that can be used to discharge debts. This theory has no basis in law.",
            "evidence_source_ids": [],
            "counter_source_ids": ["src-004", "src-006", "src-008"],
            "topic_tags": ["Debunked Theories", "Legal Personality"],
            "reality_check": "NO COURT has ever accepted this theory. People who try to use it face sanctions, fines, and criminal charges. It is considered a fraudulent scheme.",
            "practical_takeaway": "Avoid this and similar theories. They lead to real legal consequences including criminal prosecution.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "claim_id": "claim-008",
            "title": "Statute of Frauds: When Writing Is Required",
            "status": "VERIFIED",
            "body": "Certain agreements must be evidenced in writing to be enforceable, including real estate contracts, trusts of land, and contracts that cannot be performed within one year.",
            "evidence_source_ids": ["src-007"],
            "counter_source_ids": [],
            "topic_tags": ["Contracts", "Trusts"],
            "reality_check": "The Statute of Frauds has exceptions (part performance, estoppel) but the general rule remains: get important agreements in writing.",
            "practical_takeaway": "Always document significant agreements. Oral contracts for land are generally unenforceable.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "claim_id": "claim-009",
            "title": "Sovereign Citizen Arguments: Rejected by All Courts",
            "status": "DISPUTED",
            "body": "Various theories claim individuals can opt out of government jurisdiction through declarations, punctuation changes, or UCC filings. All such theories have been uniformly rejected.",
            "evidence_source_ids": [],
            "counter_source_ids": ["src-004", "src-005", "src-008"],
            "topic_tags": ["Debunked Theories", "Jurisdiction"],
            "reality_check": "These arguments have been called 'frivolous,' 'delusional,' and 'legally incomprehensible' by courts. They result in sanctions and criminal liability.",
            "practical_takeaway": "There is no legal basis for these claims. Using them causes harm to the person making them.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "claim_id": "claim-010",
            "title": "Substance Over Form: Courts Look at Reality",
            "status": "VERIFIED",
            "body": "Courts apply substance-over-form analysis to look past labels and formalities to the economic reality of transactions, particularly in tax and equity contexts.",
            "evidence_source_ids": ["src-001", "src-011"],
            "counter_source_ids": [],
            "topic_tags": ["Taxation", "Equity", "Substance over Form"],
            "reality_check": "This doctrine cuts both ways. It can invalidate sham transactions but also protect legitimate transactions that lack perfect form.",
            "practical_takeaway": "Structure transactions for genuine business purposes. Mere form without substance will not survive scrutiny.",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.archive_claims.insert_many(claims)
    
    # ========================================================================
    # TRAILS (TRACKS) - 8 doctrine trails for guided learning
    # ========================================================================
    trails = [
        {
            "trail_id": "trail-001",
            "title": "Chancery Origins → Modern Trusts",
            "description": "Trace the evolution of equity from medieval England to modern trust law.",
            "topic_tags": ["Equity", "Trusts"],
            "steps": [
                {"order": 1, "title": "The Problem: Common Law Rigidity", "content": "Medieval common law courts offered limited remedies. Rigid forms of action left many wrongs without remedy.", "source_ids": [], "key_definitions": ["common law", "forms of action"]},
                {"order": 2, "title": "The Chancellor's Court", "content": "The Lord Chancellor, as keeper of the King's conscience, began hearing petitions for relief where common law was inadequate.", "source_ids": [], "key_definitions": ["equity", "chancellor"]},
                {"order": 3, "title": "Earl of Oxford's Case", "content": "Established that equity prevails over common law when they conflict, cementing Chancery's authority.", "source_ids": ["src-001"], "key_definitions": []},
                {"order": 4, "title": "The Use and the Trust", "content": "The 'use' allowed separation of legal and beneficial ownership. The Statute of Uses (1536) and its workarounds led to the modern trust.", "source_ids": [], "key_definitions": ["use", "trust", "beneficiary"]},
                {"order": 5, "title": "Modern Trust Law", "content": "Today, trusts are governed by statute and common law, with the Restatement providing influential guidance.", "source_ids": ["src-003"], "key_definitions": []}
            ],
            "reality_check": "Trust law is well-developed and courts apply established principles. Novel theories require strong support.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "trail_id": "trail-002",
            "title": "Fiduciary Duty & Accounting",
            "description": "Understand the highest standard of care in law and how courts enforce it.",
            "topic_tags": ["Fiduciary Duties", "Trusts"],
            "steps": [
                {"order": 1, "title": "What Makes a Relationship Fiduciary?", "content": "Not all relationships are fiduciary. Key indicators: trust and confidence, vulnerability, reliance, discretionary power.", "source_ids": [], "key_definitions": ["fiduciary", "principal"]},
                {"order": 2, "title": "The Duty of Loyalty", "content": "A fiduciary must act solely in the beneficiary's interest. No self-dealing, no conflicts of interest.", "source_ids": ["src-002"], "key_definitions": ["loyalty", "self-dealing"]},
                {"order": 3, "title": "The Duty of Prudence", "content": "Fiduciaries must act with reasonable care, skill, and caution. The standard is objective.", "source_ids": ["src-003"], "key_definitions": ["prudent investor rule"]},
                {"order": 4, "title": "Duty to Account", "content": "Fiduciaries must maintain records and provide accountings. Beneficiaries have the right to information.", "source_ids": [], "key_definitions": ["accounting", "surcharge"]},
                {"order": 5, "title": "Remedies for Breach", "content": "Breach of fiduciary duty can result in surcharge, removal, constructive trust, or damages.", "source_ids": [], "key_definitions": ["surcharge", "constructive trust"]}
            ],
            "reality_check": "Fiduciary duty claims are taken seriously but require proof of the relationship and breach.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "trail_id": "trail-003",
            "title": "Negotiable Instruments 101 → Holder in Due Course",
            "description": "Master the fundamentals of negotiable instruments under the UCC.",
            "topic_tags": ["Negotiable Instruments"],
            "steps": [
                {"order": 1, "title": "What Is a Negotiable Instrument?", "content": "An unconditional promise or order to pay a fixed amount of money, payable on demand or at a definite time.", "source_ids": ["src-005"], "key_definitions": ["negotiable instrument", "note", "draft"]},
                {"order": 2, "title": "Requirements for Negotiability", "content": "Writing, signed, unconditional promise/order, fixed amount, payable in money, payable on demand or at definite time, payable to bearer or order.", "source_ids": ["src-005"], "key_definitions": ["bearer", "order"]},
                {"order": 3, "title": "Transfer and Negotiation", "content": "Transfer is delivery; negotiation requires proper endorsement for order instruments.", "source_ids": [], "key_definitions": ["endorsement", "negotiation"]},
                {"order": 4, "title": "Holder in Due Course", "content": "A holder who takes for value, in good faith, without notice of defects takes free of most defenses.", "source_ids": ["src-005"], "key_definitions": ["holder in due course", "real defenses"]},
                {"order": 5, "title": "Defenses and Limitations", "content": "Real defenses (fraud in factum, incapacity, illegality) are good against even HDCs. Personal defenses are cut off.", "source_ids": [], "key_definitions": ["real defense", "personal defense"]}
            ],
            "reality_check": "UCC Article 3 is technical. Courts apply it strictly.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "trail_id": "trail-004",
            "title": "Corporate Formation & Veil Piercing",
            "description": "Understand corporate separate personality and when courts look behind it.",
            "topic_tags": ["Corporate Law", "Legal Personality"],
            "steps": [
                {"order": 1, "title": "The Concept of Separate Personality", "content": "A corporation is a legal person distinct from its shareholders. Salomon v Salomon established this fundamental principle.", "source_ids": ["src-006"], "key_definitions": ["legal personality", "limited liability"]},
                {"order": 2, "title": "Benefits of Incorporation", "content": "Limited liability, perpetual existence, transferable shares, centralized management.", "source_ids": [], "key_definitions": ["limited liability", "perpetual succession"]},
                {"order": 3, "title": "Corporate Formalities", "content": "To maintain the veil: hold meetings, keep minutes, maintain separate accounts, adequate capitalization.", "source_ids": [], "key_definitions": ["corporate formalities", "capitalization"]},
                {"order": 4, "title": "When Courts Pierce the Veil", "content": "Alter ego, fraud, undercapitalization, commingling funds, failure to observe formalities.", "source_ids": ["src-006"], "key_definitions": ["alter ego", "piercing the veil"]},
                {"order": 5, "title": "Protecting Yourself", "content": "Document everything. Keep funds separate. Never use corporate assets for personal expenses.", "source_ids": [], "key_definitions": []}
            ],
            "reality_check": "Veil piercing is rare but real. Maintain formalities to preserve protection.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "trail_id": "trail-005",
            "title": "History of Money: Gold Standard → Fiat Currency",
            "description": "Trace the evolution of American monetary policy and what the law actually says.",
            "topic_tags": ["Monetary History", "Legal Tender"],
            "steps": [
                {"order": 1, "title": "Colonial and Early Republic", "content": "Before the Constitution, states and private banks issued currency. The Constitution gave Congress power to coin money.", "source_ids": ["src-010"], "key_definitions": ["coinage power", "legal tender"]},
                {"order": 2, "title": "The Gold Standard Era", "content": "The Coinage Act of 1792 defined the dollar in terms of silver and gold. The gold standard provided a fixed anchor.", "source_ids": ["src-010"], "key_definitions": ["gold standard", "bimetallism"]},
                {"order": 3, "title": "The Federal Reserve System", "content": "Created in 1913 to provide an elastic currency and serve as lender of last resort.", "source_ids": ["src-012"], "key_definitions": ["Federal Reserve", "elastic currency"]},
                {"order": 4, "title": "Departure from Gold", "content": "1933: domestic gold ownership restricted. 1971: Nixon ended gold convertibility for foreign governments.", "source_ids": [], "key_definitions": ["fiat currency", "floating exchange rate"]},
                {"order": 5, "title": "Modern Legal Tender", "content": "Today, Federal Reserve Notes are legal tender by statute. This is the current legal framework.", "source_ids": ["src-004"], "key_definitions": ["legal tender", "Federal Reserve Note"]}
            ],
            "reality_check": "Monetary history is complex but documented. Current law is what courts apply.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "trail_id": "trail-006",
            "title": "Contract Basics: Formation to Breach",
            "description": "Essential contract law principles every person should understand.",
            "topic_tags": ["Contracts"],
            "steps": [
                {"order": 1, "title": "Offer and Acceptance", "content": "A valid contract requires a definite offer and unequivocal acceptance. Meeting of the minds is essential.", "source_ids": [], "key_definitions": ["offer", "acceptance", "meeting of minds"]},
                {"order": 2, "title": "Consideration", "content": "Both parties must give something of value. Past consideration is not consideration. Adequacy is generally not examined.", "source_ids": [], "key_definitions": ["consideration", "bargain"]},
                {"order": 3, "title": "Statute of Frauds", "content": "Certain contracts must be in writing: land, suretyship, contracts not performable within one year, UCC goods over $500.", "source_ids": ["src-007"], "key_definitions": ["statute of frauds", "writing requirement"]},
                {"order": 4, "title": "Performance and Breach", "content": "Material breach excuses further performance. Minor breach allows damages but requires continued performance.", "source_ids": [], "key_definitions": ["material breach", "substantial performance"]},
                {"order": 5, "title": "Remedies", "content": "Expectation damages put the non-breaching party where they would have been. Specific performance is exceptional.", "source_ids": [], "key_definitions": ["expectation damages", "specific performance"]}
            ],
            "reality_check": "Contract law is foundational. Courts enforce clear agreements.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "trail_id": "trail-007",
            "title": "Property: Real and Personal",
            "description": "Understand the fundamental distinctions in property law.",
            "topic_tags": ["Property"],
            "steps": [
                {"order": 1, "title": "Real vs. Personal Property", "content": "Real property is land and things attached to it. Personal property is everything else—chattels.", "source_ids": [], "key_definitions": ["real property", "personal property", "chattels"]},
                {"order": 2, "title": "Estates in Land", "content": "Fee simple, life estate, leasehold. Each has different rights, duration, and transferability.", "source_ids": [], "key_definitions": ["fee simple", "life estate", "leasehold"]},
                {"order": 3, "title": "Recording and Notice", "content": "Recording statutes protect bona fide purchasers. Check the records before buying real estate.", "source_ids": [], "key_definitions": ["recording act", "bona fide purchaser"]},
                {"order": 4, "title": "Equitable Interests", "content": "Trusts, equitable servitudes, and other equity-created interests run with the land in many cases.", "source_ids": ["src-009"], "key_definitions": ["equitable servitude", "covenant"]},
                {"order": 5, "title": "Taking and Eminent Domain", "content": "Government can take private property for public use with just compensation. This is constitutional.", "source_ids": [], "key_definitions": ["eminent domain", "just compensation"]}
            ],
            "reality_check": "Property law is ancient and well-settled. Novel claims face skepticism.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "trail_id": "trail-008",
            "title": "Debunking Common Legal Myths",
            "description": "Identify and understand why certain legal theories are rejected by courts.",
            "topic_tags": ["Debunked Theories"],
            "steps": [
                {"order": 1, "title": "The Strawman Theory", "content": "Claims that birth certificates create a separate entity with a secret account. No legal basis whatsoever.", "source_ids": [], "key_definitions": ["strawman", "legal fiction"]},
                {"order": 2, "title": "Sovereign Citizen Arguments", "content": "Claims that individuals can opt out of jurisdiction through UCC filings or declarations. Uniformly rejected.", "source_ids": [], "key_definitions": ["sovereign citizen", "jurisdiction"]},
                {"order": 3, "title": "Secret Trust Accounts", "content": "Claims of secret government accounts in your name. No evidence supports this; it is a known fraud scheme.", "source_ids": [], "key_definitions": []},
                {"order": 4, "title": "Why Courts Reject These", "content": "These theories contradict established law, lack any supporting authority, and are often used to perpetrate fraud.", "source_ids": ["src-008"], "key_definitions": ["frivolous argument", "sanctions"]},
                {"order": 5, "title": "Consequences of Using", "content": "Courts impose sanctions, refer for criminal prosecution, and dismiss cases with prejudice.", "source_ids": [], "key_definitions": ["sanctions", "dismissal with prejudice"]}
            ],
            "reality_check": "These theories harm those who use them. Stick to established legal principles.",
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
