"""
Enhanced Integrity Seal Service

Provides cryptographic integrity seals for finalized records:
1. Record-level hash seals (SHA-256)
2. Cross-record verification chains
3. Verification timestamps
4. Tamper detection
"""

import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from uuid import uuid4
from enum import Enum


class SealStatus(str, Enum):
    VALID = "valid"
    TAMPERED = "tampered"
    MISSING = "missing"
    NEVER_SEALED = "never_sealed"


class IntegritySealService:
    """
    Service for creating and verifying integrity seals on finalized records.
    """
    
    def __init__(self, db):
        self.db = db
    
    # ============ SEAL GENERATION ============
    
    def _normalize_payload(self, payload: Dict) -> str:
        """
        Normalize payload to canonical JSON for consistent hashing.
        Removes volatile fields that shouldn't affect seal.
        """
        # Remove fields that change on every access
        volatile_fields = [
            "_id", "updated_at", "last_accessed", "view_count",
            "integrity_verified_at", "integrity_seal", "seal_chain"
        ]
        
        normalized = {}
        for key, value in payload.items():
            if key not in volatile_fields:
                if isinstance(value, dict):
                    normalized[key] = self._normalize_dict(value, volatile_fields)
                elif isinstance(value, list):
                    normalized[key] = [
                        self._normalize_dict(v, volatile_fields) if isinstance(v, dict) else v
                        for v in value
                    ]
                else:
                    normalized[key] = value
        
        return json.dumps(normalized, sort_keys=True, default=str)
    
    def _normalize_dict(self, d: Dict, exclude_fields: List[str]) -> Dict:
        """Recursively normalize a dictionary."""
        return {
            k: (self._normalize_dict(v, exclude_fields) if isinstance(v, dict) else v)
            for k, v in d.items()
            if k not in exclude_fields
        }
    
    def generate_record_hash(self, record: Dict, payload: Dict) -> str:
        """
        Generate SHA-256 hash for a record's content.
        Hash includes key identifiers and payload content.
        """
        hashable_data = {
            "id": record.get("id"),
            "rm_id": record.get("rm_id"),
            "module_type": record.get("module_type"),
            "portfolio_id": record.get("portfolio_id"),
            "title": record.get("title"),
            "status": record.get("status"),
            "finalized_at": record.get("finalized_at"),
            "finalized_by": record.get("finalized_by"),
            "payload": self._normalize_payload(payload)
        }
        
        canonical = json.dumps(hashable_data, sort_keys=True, default=str)
        return hashlib.sha256(canonical.encode()).hexdigest()
    
    def generate_chain_hash(self, record_hash: str, previous_hash: Optional[str] = None) -> str:
        """
        Generate a chain hash linking this record to previous sealed records.
        Creates a blockchain-like verification chain.
        """
        chain_data = {
            "record_hash": record_hash,
            "previous_hash": previous_hash or "GENESIS",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        canonical = json.dumps(chain_data, sort_keys=True)
        return hashlib.sha256(canonical.encode()).hexdigest()
    
    async def create_integrity_seal(
        self,
        record_id: str,
        user_id: str,
        sealed_by: str = ""
    ) -> Dict:
        """
        Create an integrity seal for a finalized record.
        
        Returns:
            Seal information including hash and verification metadata
        """
        # Get the record
        record = await self.db.governance_records.find_one(
            {"id": record_id, "user_id": user_id},
            {"_id": 0}
        )
        
        if not record:
            return {"success": False, "error": "Record not found"}
        
        # Verify record is finalized
        if record.get("status") not in ("finalized", "attested", "amended"):
            return {
                "success": False,
                "error": "Only finalized records can be sealed",
                "current_status": record.get("status")
            }
        
        # Get the current revision payload
        payload = {}
        if record.get("current_revision_id"):
            revision = await self.db.governance_revisions.find_one(
                {"id": record["current_revision_id"]},
                {"_id": 0}
            )
            if revision:
                payload = revision.get("payload_json", {})
        
        # Generate record hash
        record_hash = self.generate_record_hash(record, payload)
        
        # Get previous seal for chain
        previous_seal = await self.db.integrity_seals.find_one(
            {"user_id": user_id, "portfolio_id": record.get("portfolio_id")},
            {"_id": 0},
            sort=[("sealed_at", -1)]
        )
        
        previous_hash = previous_seal.get("chain_hash") if previous_seal else None
        chain_hash = self.generate_chain_hash(record_hash, previous_hash)
        
        # Create seal document
        seal_id = f"seal_{uuid4().hex[:12]}"
        sealed_at = datetime.now(timezone.utc).isoformat()
        
        seal = {
            "id": seal_id,
            "record_id": record_id,
            "user_id": user_id,
            "portfolio_id": record.get("portfolio_id"),
            "rm_id": record.get("rm_id"),
            "module_type": record.get("module_type"),
            "record_hash": record_hash,
            "chain_hash": chain_hash,
            "previous_seal_id": previous_seal.get("id") if previous_seal else None,
            "sealed_at": sealed_at,
            "sealed_by": sealed_by or user_id,
            "status": SealStatus.VALID.value,
            "algorithm": "SHA-256",
            "version": "1.0"
        }
        
        # Store the seal
        await self.db.integrity_seals.insert_one(seal)
        
        # Update the record with seal reference
        await self.db.governance_records.update_one(
            {"id": record_id},
            {
                "$set": {
                    "integrity_seal_id": seal_id,
                    "integrity_sealed_at": sealed_at,
                    "integrity_verified_at": sealed_at,
                    "updated_at": sealed_at
                }
            }
        )
        
        # Remove _id from response
        seal.pop("_id", None)
        
        return {
            "success": True,
            "seal": seal,
            "message": "Integrity seal created successfully"
        }
    
    # ============ SEAL VERIFICATION ============
    
    async def verify_record_seal(
        self,
        record_id: str,
        user_id: str
    ) -> Dict:
        """
        Verify the integrity seal of a record.
        
        Checks:
        1. Seal exists
        2. Current hash matches stored hash
        3. Chain integrity (optional)
        
        Returns:
            Verification result with status and details
        """
        # Get the record
        record = await self.db.governance_records.find_one(
            {"id": record_id, "user_id": user_id},
            {"_id": 0}
        )
        
        if not record:
            return {
                "success": False,
                "status": SealStatus.MISSING.value,
                "error": "Record not found"
            }
        
        # Get the seal
        seal_id = record.get("integrity_seal_id")
        if not seal_id:
            return {
                "success": True,
                "status": SealStatus.NEVER_SEALED.value,
                "record_id": record_id,
                "message": "Record has never been sealed",
                "can_seal": record.get("status") in ("finalized", "attested", "amended")
            }
        
        seal = await self.db.integrity_seals.find_one(
            {"id": seal_id},
            {"_id": 0}
        )
        
        if not seal:
            return {
                "success": False,
                "status": SealStatus.MISSING.value,
                "error": "Seal record missing - data corruption detected"
            }
        
        # Get current payload
        payload = {}
        if record.get("current_revision_id"):
            revision = await self.db.governance_revisions.find_one(
                {"id": record["current_revision_id"]},
                {"_id": 0}
            )
            if revision:
                payload = revision.get("payload_json", {})
        
        # Recalculate hash
        current_hash = self.generate_record_hash(record, payload)
        stored_hash = seal.get("record_hash")
        
        verified_at = datetime.now(timezone.utc).isoformat()
        
        if current_hash == stored_hash:
            # Update verification timestamp
            await self.db.governance_records.update_one(
                {"id": record_id},
                {"$set": {"integrity_verified_at": verified_at}}
            )
            
            return {
                "success": True,
                "status": SealStatus.VALID.value,
                "record_id": record_id,
                "rm_id": record.get("rm_id"),
                "sealed_at": seal.get("sealed_at"),
                "verified_at": verified_at,
                "hash_match": True,
                "message": "Record integrity verified - no tampering detected"
            }
        else:
            # Tampering detected!
            await self.db.integrity_seals.update_one(
                {"id": seal_id},
                {
                    "$set": {
                        "status": SealStatus.TAMPERED.value,
                        "tamper_detected_at": verified_at,
                        "expected_hash": stored_hash,
                        "actual_hash": current_hash
                    }
                }
            )
            
            # Log the incident
            await self.db.integrity_logs.insert_one({
                "id": f"tamper_{uuid4().hex[:12]}",
                "action": "tamper_detected",
                "record_id": record_id,
                "seal_id": seal_id,
                "expected_hash": stored_hash,
                "actual_hash": current_hash,
                "detected_at": verified_at,
                "user_id": user_id
            })
            
            return {
                "success": False,
                "status": SealStatus.TAMPERED.value,
                "record_id": record_id,
                "rm_id": record.get("rm_id"),
                "error": "INTEGRITY VIOLATION: Record has been modified after sealing",
                "sealed_at": seal.get("sealed_at"),
                "tamper_detected_at": verified_at,
                "expected_hash": stored_hash[:16] + "...",  # Truncate for security
                "actual_hash": current_hash[:16] + "..."
            }
    
    async def verify_chain(
        self,
        portfolio_id: str,
        user_id: str
    ) -> Dict:
        """
        Verify the entire seal chain for a portfolio.
        
        Checks that all seals are properly linked.
        """
        seals = await self.db.integrity_seals.find(
            {"portfolio_id": portfolio_id, "user_id": user_id},
            {"_id": 0}
        ).sort("sealed_at", 1).to_list(1000)
        
        if not seals:
            return {
                "success": True,
                "status": "no_seals",
                "message": "No integrity seals found for this portfolio",
                "total_seals": 0
            }
        
        chain_valid = True
        broken_links = []
        
        for i, seal in enumerate(seals):
            if i == 0:
                # First seal should have no previous
                if seal.get("previous_seal_id"):
                    # Verify the previous points to nothing or itself
                    pass
            else:
                # Check chain link
                expected_previous = seals[i-1].get("id")
                actual_previous = seal.get("previous_seal_id")
                
                if expected_previous != actual_previous:
                    chain_valid = False
                    broken_links.append({
                        "seal_id": seal.get("id"),
                        "expected_previous": expected_previous,
                        "actual_previous": actual_previous
                    })
        
        return {
            "success": chain_valid,
            "status": "valid" if chain_valid else "broken_chain",
            "total_seals": len(seals),
            "chain_valid": chain_valid,
            "broken_links": broken_links,
            "first_seal": seals[0].get("sealed_at") if seals else None,
            "last_seal": seals[-1].get("sealed_at") if seals else None,
            "message": "Chain integrity verified" if chain_valid else "Chain integrity broken"
        }
    
    # ============ BATCH OPERATIONS ============
    
    async def seal_all_finalized(
        self,
        portfolio_id: str,
        user_id: str,
        sealed_by: str = ""
    ) -> Dict:
        """
        Create seals for all finalized records that don't have one.
        """
        # Find finalized records without seals
        records = await self.db.governance_records.find(
            {
                "portfolio_id": portfolio_id,
                "user_id": user_id,
                "status": {"$in": ["finalized", "attested", "amended"]},
                "integrity_seal_id": {"$exists": False}
            },
            {"_id": 0, "id": 1, "title": 1, "rm_id": 1}
        ).to_list(1000)
        
        sealed_count = 0
        errors = []
        
        for record in records:
            result = await self.create_integrity_seal(
                record["id"], user_id, sealed_by
            )
            if result.get("success"):
                sealed_count += 1
            else:
                errors.append({
                    "record_id": record["id"],
                    "error": result.get("error")
                })
        
        return {
            "success": True,
            "sealed_count": sealed_count,
            "total_candidates": len(records),
            "errors": errors,
            "message": f"Sealed {sealed_count} of {len(records)} finalized records"
        }
    
    async def verify_all_seals(
        self,
        portfolio_id: str,
        user_id: str
    ) -> Dict:
        """
        Verify all sealed records in a portfolio.
        """
        # Find all sealed records
        records = await self.db.governance_records.find(
            {
                "portfolio_id": portfolio_id,
                "user_id": user_id,
                "integrity_seal_id": {"$exists": True}
            },
            {"_id": 0, "id": 1, "title": 1, "rm_id": 1}
        ).to_list(1000)
        
        valid_count = 0
        tampered_count = 0
        results = []
        
        for record in records:
            result = await self.verify_record_seal(record["id"], user_id)
            results.append({
                "record_id": record["id"],
                "rm_id": record.get("rm_id"),
                "title": record.get("title"),
                "status": result.get("status"),
                "verified_at": result.get("verified_at")
            })
            
            if result.get("status") == SealStatus.VALID.value:
                valid_count += 1
            elif result.get("status") == SealStatus.TAMPERED.value:
                tampered_count += 1
        
        return {
            "success": tampered_count == 0,
            "total_verified": len(records),
            "valid_count": valid_count,
            "tampered_count": tampered_count,
            "results": results,
            "verification_timestamp": datetime.now(timezone.utc).isoformat(),
            "message": f"Verified {len(records)} seals: {valid_count} valid, {tampered_count} tampered"
        }
    
    # ============ REPORTING ============
    
    async def get_seal_report(
        self,
        portfolio_id: str,
        user_id: str
    ) -> Dict:
        """
        Generate a comprehensive seal status report.
        """
        # Count all finalized records
        total_finalized = await self.db.governance_records.count_documents({
            "portfolio_id": portfolio_id,
            "user_id": user_id,
            "status": {"$in": ["finalized", "attested", "amended"]}
        })
        
        # Count sealed records
        sealed_count = await self.db.governance_records.count_documents({
            "portfolio_id": portfolio_id,
            "user_id": user_id,
            "integrity_seal_id": {"$exists": True}
        })
        
        # Count by seal status
        seals = await self.db.integrity_seals.find(
            {"portfolio_id": portfolio_id, "user_id": user_id},
            {"_id": 0, "status": 1, "sealed_at": 1}
        ).to_list(1000)
        
        status_counts = {
            SealStatus.VALID.value: 0,
            SealStatus.TAMPERED.value: 0
        }
        
        for seal in seals:
            status = seal.get("status", SealStatus.VALID.value)
            if status in status_counts:
                status_counts[status] += 1
        
        # Get recent seals
        recent_seals = await self.db.integrity_seals.find(
            {"portfolio_id": portfolio_id, "user_id": user_id},
            {"_id": 0, "id": 1, "record_id": 1, "rm_id": 1, "sealed_at": 1, "status": 1}
        ).sort("sealed_at", -1).limit(10).to_list(10)
        
        return {
            "portfolio_id": portfolio_id,
            "total_finalized": total_finalized,
            "sealed_count": sealed_count,
            "unsealed_count": total_finalized - sealed_count,
            "seal_coverage": f"{(sealed_count / total_finalized * 100):.1f}%" if total_finalized > 0 else "N/A",
            "status_breakdown": status_counts,
            "recent_seals": recent_seals,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }


# Factory function for creating service instance
def create_integrity_seal_service(db):
    return IntegritySealService(db)
