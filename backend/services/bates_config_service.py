"""
Bates Numbering Configuration Service

Provides comprehensive Bates numbering management for workspaces and portfolios:
- Custom prefix schemes (templates)
- Continuation tracking across binders
- Prefix validation and formatting
- Workspace-level defaults
"""
from typing import Optional, Dict, List, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, validator
from enum import Enum
import uuid
import re
import logging

logger = logging.getLogger(__name__)


# ============ MODELS ============

class BatesPrefixType(str, Enum):
    """Types of Bates prefix schemes"""
    PORTFOLIO_ABBREV = "portfolio_abbrev"  # Use portfolio abbreviation (e.g., "SMITH-")
    CUSTOM = "custom"  # User-defined prefix
    CASE_NUMBER = "case_number"  # Use case/matter number
    DATE_BASED = "date_based"  # Include date (e.g., "2024-01-")
    SEQUENTIAL = "sequential"  # Pure sequential (no prefix, just numbers)


class BatesPosition(str, Enum):
    """Position of Bates stamp on page"""
    BOTTOM_RIGHT = "bottom-right"
    BOTTOM_LEFT = "bottom-left"
    BOTTOM_CENTER = "bottom-center"
    TOP_RIGHT = "top-right"
    TOP_LEFT = "top-left"
    TOP_CENTER = "top-center"


class BatesPrefixScheme(BaseModel):
    """A saved Bates prefix scheme/template"""
    scheme_id: str = Field(default_factory=lambda: f"bps_{uuid.uuid4().hex[:12]}")
    workspace_id: str
    name: str  # Display name (e.g., "Court Filing Prefix")
    prefix_type: BatesPrefixType = BatesPrefixType.CUSTOM
    prefix_pattern: str  # The actual prefix pattern (e.g., "CASE-{matter}-")
    description: Optional[str] = None
    digits: int = 6
    position: BatesPosition = BatesPosition.BOTTOM_RIGHT
    font_size: int = 9
    include_cover: bool = False
    is_default: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str = ""
    
    @validator('prefix_pattern')
    def validate_prefix_pattern(cls, v):
        # Allow alphanumeric, hyphens, underscores, and template vars
        if not re.match(r'^[A-Za-z0-9\-_{}]*$', v):
            raise ValueError('Prefix pattern can only contain letters, numbers, hyphens, underscores, and template variables')
        return v.upper()
    
    @validator('digits')
    def validate_digits(cls, v):
        if v < 3 or v > 10:
            raise ValueError('Digits must be between 3 and 10')
        return v


class BatesContinuation(BaseModel):
    """Tracks Bates numbering continuation across binders"""
    continuation_id: str = Field(default_factory=lambda: f"bc_{uuid.uuid4().hex[:12]}")
    workspace_id: str
    portfolio_id: Optional[str] = None  # If None, workspace-wide
    prefix: str  # The prefix being tracked
    last_number: int = 0  # Last number used
    last_binder_id: Optional[str] = None  # Reference to last binder that used this
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    history: List[Dict] = []  # Record of changes


class BatesConfig(BaseModel):
    """Runtime configuration for Bates stamping a binder"""
    enabled: bool = False
    prefix: str = ""
    start_number: int = 1
    digits: int = 6
    position: BatesPosition = BatesPosition.BOTTOM_RIGHT
    include_cover: bool = False
    font_size: int = 9
    margin_x: int = 18
    margin_y: int = 18
    continuation_mode: bool = False  # If True, use continuation tracking
    scheme_id: Optional[str] = None  # Reference to saved scheme


# ============ REQUEST/RESPONSE MODELS ============

class CreatePrefixSchemeRequest(BaseModel):
    name: str
    prefix_type: BatesPrefixType = BatesPrefixType.CUSTOM
    prefix_pattern: str
    description: Optional[str] = None
    digits: int = 6
    position: BatesPosition = BatesPosition.BOTTOM_RIGHT
    font_size: int = 9
    include_cover: bool = False
    is_default: bool = False


class UpdatePrefixSchemeRequest(BaseModel):
    name: Optional[str] = None
    prefix_pattern: Optional[str] = None
    description: Optional[str] = None
    digits: Optional[int] = None
    position: Optional[BatesPosition] = None
    font_size: Optional[int] = None
    include_cover: Optional[bool] = None
    is_default: Optional[bool] = None


class SetContinuationRequest(BaseModel):
    prefix: str
    last_number: int
    portfolio_id: Optional[str] = None


# ============ SERVICE ============

class BatesConfigService:
    """Service for managing Bates numbering configuration"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    # ============ PREFIX SCHEMES ============
    
    async def create_prefix_scheme(
        self,
        workspace_id: str,
        user_id: str,
        data: CreatePrefixSchemeRequest
    ) -> Dict:
        """Create a new Bates prefix scheme for a workspace"""
        # If setting as default, unset other defaults first
        if data.is_default:
            await self.db.bates_prefix_schemes.update_many(
                {"workspace_id": workspace_id, "is_default": True},
                {"$set": {"is_default": False}}
            )
        
        scheme = BatesPrefixScheme(
            workspace_id=workspace_id,
            name=data.name,
            prefix_type=data.prefix_type,
            prefix_pattern=data.prefix_pattern.upper(),
            description=data.description,
            digits=data.digits,
            position=data.position,
            font_size=data.font_size,
            include_cover=data.include_cover,
            is_default=data.is_default,
            created_by=user_id
        )
        
        await self.db.bates_prefix_schemes.insert_one(scheme.dict())
        
        logger.info(f"Created Bates prefix scheme {scheme.scheme_id} for workspace {workspace_id}")
        
        return {
            "scheme_id": scheme.scheme_id,
            "name": scheme.name,
            "prefix_pattern": scheme.prefix_pattern,
            "is_default": scheme.is_default
        }
    
    async def get_prefix_schemes(self, workspace_id: str) -> List[Dict]:
        """Get all Bates prefix schemes for a workspace"""
        schemes = await self.db.bates_prefix_schemes.find(
            {"workspace_id": workspace_id},
            {"_id": 0}
        ).to_list(100)
        
        return schemes
    
    async def get_prefix_scheme(self, scheme_id: str) -> Optional[Dict]:
        """Get a specific Bates prefix scheme"""
        scheme = await self.db.bates_prefix_schemes.find_one(
            {"scheme_id": scheme_id},
            {"_id": 0}
        )
        return scheme
    
    async def get_default_scheme(self, workspace_id: str) -> Optional[Dict]:
        """Get the default Bates prefix scheme for a workspace"""
        scheme = await self.db.bates_prefix_schemes.find_one(
            {"workspace_id": workspace_id, "is_default": True},
            {"_id": 0}
        )
        return scheme
    
    async def update_prefix_scheme(
        self,
        scheme_id: str,
        data: UpdatePrefixSchemeRequest
    ) -> Dict:
        """Update a Bates prefix scheme"""
        scheme = await self.get_prefix_scheme(scheme_id)
        if not scheme:
            raise ValueError("Scheme not found")
        
        update_data = {}
        
        if data.name is not None:
            update_data["name"] = data.name
        if data.prefix_pattern is not None:
            update_data["prefix_pattern"] = data.prefix_pattern.upper()
        if data.description is not None:
            update_data["description"] = data.description
        if data.digits is not None:
            update_data["digits"] = data.digits
        if data.position is not None:
            update_data["position"] = data.position.value
        if data.font_size is not None:
            update_data["font_size"] = data.font_size
        if data.include_cover is not None:
            update_data["include_cover"] = data.include_cover
        
        if data.is_default is not None and data.is_default:
            # Unset other defaults
            await self.db.bates_prefix_schemes.update_many(
                {"workspace_id": scheme["workspace_id"], "is_default": True},
                {"$set": {"is_default": False}}
            )
            update_data["is_default"] = True
        
        if update_data:
            await self.db.bates_prefix_schemes.update_one(
                {"scheme_id": scheme_id},
                {"$set": update_data}
            )
        
        return {"status": "updated", "scheme_id": scheme_id}
    
    async def delete_prefix_scheme(self, scheme_id: str) -> Dict:
        """Delete a Bates prefix scheme"""
        result = await self.db.bates_prefix_schemes.delete_one({"scheme_id": scheme_id})
        
        if result.deleted_count == 0:
            raise ValueError("Scheme not found")
        
        return {"status": "deleted", "scheme_id": scheme_id}
    
    # ============ CONTINUATION TRACKING ============
    
    async def get_continuation(
        self,
        workspace_id: str,
        prefix: str,
        portfolio_id: Optional[str] = None
    ) -> Optional[Dict]:
        """Get continuation info for a specific prefix"""
        query = {
            "workspace_id": workspace_id,
            "prefix": prefix.upper()
        }
        if portfolio_id:
            query["portfolio_id"] = portfolio_id
        else:
            query["portfolio_id"] = None
        
        continuation = await self.db.bates_continuations.find_one(
            query,
            {"_id": 0}
        )
        return continuation
    
    async def set_continuation(
        self,
        workspace_id: str,
        prefix: str,
        last_number: int,
        binder_id: Optional[str] = None,
        portfolio_id: Optional[str] = None
    ) -> Dict:
        """Set/update continuation for a prefix"""
        now = datetime.now(timezone.utc).isoformat()
        prefix = prefix.upper()
        
        query = {
            "workspace_id": workspace_id,
            "prefix": prefix,
            "portfolio_id": portfolio_id
        }
        
        existing = await self.db.bates_continuations.find_one(query)
        
        if existing:
            # Update existing continuation
            history_entry = {
                "previous_number": existing["last_number"],
                "new_number": last_number,
                "binder_id": binder_id,
                "timestamp": now
            }
            
            await self.db.bates_continuations.update_one(
                {"continuation_id": existing["continuation_id"]},
                {
                    "$set": {
                        "last_number": last_number,
                        "last_binder_id": binder_id,
                        "last_updated": now
                    },
                    "$push": {"history": history_entry}
                }
            )
            
            return {
                "status": "updated",
                "continuation_id": existing["continuation_id"],
                "prefix": prefix,
                "last_number": last_number
            }
        else:
            # Create new continuation
            continuation = BatesContinuation(
                workspace_id=workspace_id,
                portfolio_id=portfolio_id,
                prefix=prefix,
                last_number=last_number,
                last_binder_id=binder_id,
                history=[{
                    "previous_number": 0,
                    "new_number": last_number,
                    "binder_id": binder_id,
                    "timestamp": now
                }]
            )
            
            await self.db.bates_continuations.insert_one(continuation.dict())
            
            return {
                "status": "created",
                "continuation_id": continuation.continuation_id,
                "prefix": prefix,
                "last_number": last_number
            }
    
    async def get_next_start_number(
        self,
        workspace_id: str,
        prefix: str,
        portfolio_id: Optional[str] = None
    ) -> int:
        """Get the next starting number for a prefix (for continuation)"""
        continuation = await self.get_continuation(workspace_id, prefix, portfolio_id)
        
        if continuation:
            return continuation["last_number"] + 1
        
        return 1
    
    async def list_continuations(
        self,
        workspace_id: str,
        portfolio_id: Optional[str] = None
    ) -> List[Dict]:
        """List all continuation records for a workspace"""
        query = {"workspace_id": workspace_id}
        if portfolio_id:
            query["portfolio_id"] = portfolio_id
        
        continuations = await self.db.bates_continuations.find(
            query,
            {"_id": 0}
        ).to_list(100)
        
        return continuations
    
    # ============ PREFIX RESOLUTION ============
    
    def resolve_prefix(
        self,
        pattern: str,
        context: Dict[str, str]
    ) -> str:
        """
        Resolve a prefix pattern with context variables.
        
        Supported variables:
        - {portfolio}: Portfolio abbreviation
        - {matter}: Matter/case number
        - {date}: Current date (YYYYMMDD)
        - {year}: Current year
        """
        result = pattern.upper()
        
        # Replace template variables
        if "{PORTFOLIO}" in result:
            result = result.replace("{PORTFOLIO}", context.get("portfolio", "DOC"))
        if "{MATTER}" in result:
            result = result.replace("{MATTER}", context.get("matter", ""))
        if "{DATE}" in result:
            result = result.replace("{DATE}", datetime.now().strftime("%Y%m%d"))
        if "{YEAR}" in result:
            result = result.replace("{YEAR}", datetime.now().strftime("%Y"))
        
        # Clean up any unreplaced variables or double hyphens
        result = re.sub(r'\{[^}]+\}', '', result)
        result = re.sub(r'-+', '-', result)
        result = result.strip('-')
        
        # Ensure it ends with a separator if not empty
        if result and not result.endswith('-'):
            result += '-'
        
        return result
    
    async def get_resolved_config(
        self,
        workspace_id: str,
        portfolio_id: Optional[str] = None,
        scheme_id: Optional[str] = None,
        use_continuation: bool = False
    ) -> Dict:
        """
        Get a fully resolved Bates configuration ready for use.
        
        Returns a complete configuration with resolved prefix and start number.
        """
        # Get scheme (or default)
        scheme = None
        if scheme_id:
            scheme = await self.get_prefix_scheme(scheme_id)
        if not scheme:
            scheme = await self.get_default_scheme(workspace_id)
        
        # Get portfolio abbreviation if needed
        portfolio_abbrev = "DOC"
        matter_number = ""
        
        if portfolio_id:
            portfolio = await self.db.portfolios.find_one(
                {"portfolio_id": portfolio_id},
                {"_id": 0, "abbreviation": 1, "name": 1, "matter_number": 1}
            )
            if portfolio:
                portfolio_abbrev = portfolio.get("abbreviation") or portfolio.get("name", "DOC")[:4].upper()
                matter_number = portfolio.get("matter_number", "")
        
        # Build context for resolution
        context = {
            "portfolio": portfolio_abbrev,
            "matter": matter_number
        }
        
        # Resolve prefix
        if scheme:
            prefix = self.resolve_prefix(scheme["prefix_pattern"], context)
            digits = scheme["digits"]
            position = scheme["position"]
            font_size = scheme["font_size"]
            include_cover = scheme["include_cover"]
        else:
            # Default fallback
            prefix = f"{portfolio_abbrev}-"
            digits = 6
            position = BatesPosition.BOTTOM_RIGHT.value
            font_size = 9
            include_cover = False
        
        # Get start number
        start_number = 1
        if use_continuation:
            start_number = await self.get_next_start_number(workspace_id, prefix, portfolio_id)
        
        return {
            "prefix": prefix,
            "start_number": start_number,
            "digits": digits,
            "position": position,
            "font_size": font_size,
            "include_cover": include_cover,
            "scheme_id": scheme["scheme_id"] if scheme else None,
            "continuation_enabled": use_continuation
        }
    
    # ============ VALIDATION ============
    
    def validate_prefix(self, prefix: str) -> Dict:
        """Validate a Bates prefix and return any issues"""
        issues = []
        
        # Check length
        if len(prefix) > 20:
            issues.append("Prefix exceeds maximum length of 20 characters")
        
        # Check characters
        if not re.match(r'^[A-Za-z0-9\-_]*$', prefix):
            issues.append("Prefix contains invalid characters (only letters, numbers, hyphens, underscores allowed)")
        
        # Check for common problems
        if prefix.startswith('-') or prefix.startswith('_'):
            issues.append("Prefix should not start with a separator")
        
        if '--' in prefix or '__' in prefix:
            issues.append("Prefix contains consecutive separators")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "normalized": prefix.upper().strip('-_')
        }
    
    def format_bates_number(self, prefix: str, number: int, digits: int) -> str:
        """Format a complete Bates number"""
        return f"{prefix}{str(number).zfill(digits)}"
    
    def parse_bates_number(self, bates_string: str) -> Optional[Dict]:
        """Parse a Bates number string into components"""
        # Try to extract number from end
        match = re.match(r'^(.+?)(\d+)$', bates_string)
        if match:
            return {
                "prefix": match.group(1),
                "number": int(match.group(2)),
                "digits": len(match.group(2))
            }
        return None


# ============ SINGLETON ============

_bates_service: Optional[BatesConfigService] = None


def get_bates_service() -> BatesConfigService:
    if _bates_service is None:
        raise RuntimeError("BatesConfigService not initialized")
    return _bates_service


def init_bates_service(db: AsyncIOMotorDatabase) -> BatesConfigService:
    global _bates_service
    _bates_service = BatesConfigService(db)
    return _bates_service
