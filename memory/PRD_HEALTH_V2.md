# Trust Health V2 - Product Requirements Document

## Overview

Trust Health V2 is an enterprise-grade health scoring system with bounded penalties, severity multipliers, readiness modes, and rich evidence payloads. It addresses the "death spiral" problem where large portfolios were unfairly penalized in V1.

## Version Info

- **Version**: 2.0
- **Status**: Implemented (Backend Complete)
- **Feature Flag**: `health_rules_version` = "v1" | "v2" (default: v2)

---

## Architecture

### Scoring Pipeline

```
1. Run Checks → Produce Findings (info/warn/critical) + Evidence
2. Calculate Category Penalties (bounded by max_penalty per check)
3. Category Score = clamp(100 - Σ bounded_penalties, 0, 100)
4. Raw Score = Σ(category_score × category_weight)
5. Apply Blocking Caps → Final Score = min(Raw Score, lowest_triggered_cap)
```

### Severity Multipliers

| Severity | Multiplier | Purpose |
|----------|------------|---------|
| Info | ×0.50 | Soft nudges, informational |
| Warning | ×1.00 | Standard importance |
| Critical | ×1.50 | Urgent, audit-blocking |

### Bounded Penalty Formula

```
Penalty = min(max_penalty, base_deduction × count × severity_multiplier)
```

This prevents large portfolios from being unfairly crushed by compounding penalties.

---

## Category Weights (Default)

| Category | Weight | Focus Area |
|----------|--------|------------|
| Governance Hygiene | 25% | Minutes quality, finalization, attestations, amendments |
| Financial Integrity | 25% | Ledger balance, approvals, aging drafts, reconciliation |
| Compliance & Recordkeeping | 15% | Essential docs, finalized, audit trail coverage |
| Risk & Exposure | 15% | Disputes aging, insurance gaps, time-sensitive risks |
| Data Integrity | 20% | Orphans/ghosts, RM-ID validity, lifecycle consistency |

---

## Blocking Condition Caps

| Cap ID | Condition | Cap Value | Trigger Check IDs |
|--------|-----------|-----------|-------------------|
| CAP_ORPHANS | Ghost/Orphan Records | 60 | DATA_001 |
| CAP_MISSING_FINALIZER | Finalized missing finalized_by/at | 70 | GOV_005, DATA_003 |
| CAP_LEDGER_IMBALANCE | Ledger imbalance | 65 | FIN_003 |
| CAP_DRAFT_ACTIVE | Draft insurance as active | 75 | RISK_004 |

---

## Check Definitions

### Governance Hygiene (GOV_001 - GOV_006)

| ID | Check | Severity | Base | Max | Effort |
|----|-------|----------|------|-----|--------|
| GOV_001 | No Meeting Minutes | Warning | 10 | 10 | M |
| GOV_002 | Low Finalization Rate (<50%) | Warning | 8 | 16 | S |
| GOV_003 | Missing Attestations | Warning | 3 | 18 | S |
| GOV_004 | Open Amendments | Warning | 3 | 15 | M |
| GOV_005 | Finalized Missing finalized_by | Critical | 5 | 25 | S |
| GOV_006 | Governance Cadence Gap (>90 days) | Warning | 6 | 12 | M |

### Financial Integrity (FIN_001 - FIN_005)

| ID | Check | Severity | Base | Max | Effort |
|----|-------|----------|------|-----|--------|
| FIN_001 | Aging Distribution Drafts (>30 days) | Warning | 3 | 18 | M |
| FIN_002 | Compensation Backlog (>3 pending) | Warning | 5 | 10 | M |
| FIN_003 | Ledger Imbalance | Critical | 15 | 15 | L |
| FIN_004 | Stale Reconciliation (>30 days) | Warning | 8 | 16 | M |
| FIN_005 | Unposted Distributions | Critical | 6 | 24 | M |

### Compliance & Recordkeeping (COM_001 - COM_004)

| ID | Check | Severity | Base | Max | Effort |
|----|-------|----------|------|-----|--------|
| COM_001 | Missing Essential Documents | Warning | 5 | 15 | L |
| COM_002 | Unfinalized Essential Docs | Warning | 4 | 16 | S |
| COM_003 | Missing Required Attachments | Warning | 3 | 15 | M |
| COM_004 | Broken Revision Chain | Critical | 5 | 20 | L |

### Risk & Exposure (RISK_001 - RISK_005)

| ID | Check | Severity | Base | Max | Effort |
|----|-------|----------|------|-----|--------|
| RISK_001 | Critical Dispute Aging (>60 days) | Critical | 8 | 32 | L |
| RISK_002 | Pending Disputes (30-60 days) | Warning | 4 | 24 | M |
| RISK_003 | No Insurance Policies | Warning | 10 | 10 | L |
| RISK_004 | No Active Coverage | Warning | 8 | 8 | M |
| RISK_005 | Policy Expiring Soon (<30 days) | Warning | 6 | 12 | M |

### Data Integrity (DATA_001 - DATA_006)

| ID | Check | Severity | Base | Max | Effort |
|----|-------|----------|------|-----|--------|
| DATA_001 | Orphan Records | Critical | 15 | 15 | M |
| DATA_002 | Invalid RM-ID Format | Warning | 5 | 20 | S |
| DATA_003 | Missing finalized_at Timestamp | Critical | 5 | 25 | S |
| DATA_004 | Draft with finalized_at | Warning | 3 | 15 | S |
| DATA_005 | Invalid Lifecycle Transition | Critical | 6 | 24 | L |
| DATA_006 | Duplicate RM-IDs | Critical | 10 | 20 | M |

---

## Readiness Modes

### Normal Mode
Standard scoring with all checks enabled.

### Audit Mode
Strict scoring with additional required checklist:

**Required (must pass for "Audit Ready"):**
- Latest finalized meeting minutes exists
- All finalized minutes have attestations
- All amendments documented & closed
- Distribution approval trails complete
- Trustee compensation documented
- Ledger reconciliation fresh (≤30 days)
- Active insurance coverage exists
- Policy documents finalized
- Declaration of Trust exists & finalized
- Certificate of Trust exists & finalized
- No orphan records
- All RM-IDs valid
- Revision history complete

**Audit Ready = Required all pass + Score ≥ 80%**

### Court Mode
Litigation-ready mode (future):
- All essential docs finalized + exportable
- Bates numbering configured
- Binder profile passes
- Dispute timelines complete

---

## API Endpoints

### GET /api/health/score
Get current health score (uses cache if <1 hour old).
- Query param: `version` (optional, "v1" or "v2")

### POST /api/health/scan
Force a fresh health scan.
- Query param: `version` (optional)

### GET /api/health/v2/ruleset
Get V2 health rules configuration for current user.

### PUT /api/health/v2/ruleset
Update V2 health rules (weights, caps, multipliers, mode).

### POST /api/health/v2/ruleset/reset
Reset V2 rules to defaults.

### PUT /api/health/version
Set user's preferred health rules version.

---

## Response Schema (V2 Scan)

```json
{
  "scan_id": "scan_abc12345",
  "user_id": "user_xyz",
  "scanned_at": "2024-12-30T05:00:00Z",
  "version": "v2",
  "mode": "normal",
  
  "final_score": 72.5,
  "raw_score": 78.3,
  "category_scores": {
    "governance_hygiene": 85.0,
    "financial_integrity": 70.0,
    "compliance_recordkeeping": 90.0,
    "risk_exposure": 65.0,
    "data_integrity": 75.0
  },
  "category_penalties": {
    "governance_hygiene": 15.0,
    "financial_integrity": 30.0,
    "compliance_recordkeeping": 10.0,
    "risk_exposure": 35.0,
    "data_integrity": 25.0
  },
  
  "blockers_triggered": [
    {
      "cap_id": "CAP_ORPHANS",
      "name": "Ghost/Orphan Records",
      "cap_value": 60,
      "score_before_cap": 78.3,
      "triggered_by": ["DATA_001"]
    }
  ],
  "is_capped": true,
  
  "findings_summary": {
    "total": 12,
    "critical": 3,
    "warning": 7,
    "info": 2
  },
  "findings": [
    {
      "id": "finding_abc123",
      "check_id": "DATA_001",
      "category": "data_integrity",
      "severity": "critical",
      "title": "5 orphan records detected",
      "description": "Records reference portfolios that no longer exist.",
      "penalty_applied": 15.0,
      "max_penalty": 15.0,
      "evidence": {"count": 5},
      "auto_fixable": true,
      "fix_route": "/diagnostics?issue=orphans",
      "estimated_gain": 15.0,
      "effort": "M",
      "record_ids": ["rec_1", "rec_2", "..."]
    }
  ],
  
  "next_actions": [
    {
      "id": "action_xyz",
      "finding_id": "finding_abc123",
      "title": "5 orphan records detected",
      "description": "Records reference portfolios that no longer exist.",
      "category": "data_integrity",
      "estimated_gain": 15.0,
      "effort": "M",
      "priority_score": 14.06,
      "fix_route": "/diagnostics?issue=orphans",
      "auto_fixable": true
    }
  ],
  "total_potential_gain": 45.0,
  
  "readiness": null,  // Populated in Audit/Court mode
  
  "stats": {
    "total_records": 150,
    "total_portfolios": 5,
    "total_documents": 45,
    "records_by_status": {"draft": 20, "finalized": 130},
    "records_by_module": {"minutes": 50, "distribution": 30, "...": "..."}
  },
  
  "config_snapshot": {
    "weights": {"governance_hygiene": 25, "...": "..."},
    "severity_multipliers": {"info": 0.5, "warning": 1.0, "critical": 1.5},
    "caps_enabled": ["CAP_ORPHANS", "CAP_MISSING_FINALIZER", "..."]
  }
}
```

---

## Files

### Backend
- `/app/backend/services/health_scanner_v2.py` - V2 scanner implementation
- `/app/backend/services/health_scanner.py` - V1 scanner (preserved)
- `/app/backend/routes/health.py` - API routes (supports V1 + V2)

### Frontend (TODO)
- Settings page V2 config UI
- Trust Health Dashboard V2 visualization
- Next Actions component
- Blockers alert strip

---

## Migration Path

1. **Default to V2**: New users default to V2
2. **Feature Flag**: Existing users can switch via API or Settings
3. **Backwards Compatible**: V1 scanner preserved, can switch back
4. **Data Compatible**: Both versions write to `health_scans` collection

---

## Next Steps

1. [ ] **Settings UI**: Add V2 config editor (weights, caps, mode)
2. [ ] **Trust Health Dashboard**: Update to render V2 payload
3. [ ] **Next Actions Panel**: Show prioritized fix actions
4. [ ] **Blockers Strip**: Visual alert for triggered caps
5. [ ] **Preview Impact**: Show score change before saving config
