# Test Result Documentation

## Current Testing Session
- Session Date: 2024-12-24
- Testing Focus: P0 Bugs - RM-ID Sequence Fix & Sorting Order

## Features to Test

### P0 Issue #1: RM-ID Sequence Bug Fix
1. Create first document from "Declaration of Trust" template → Should get RM-ID ending in `.001`
2. Create second document from same template → Should get RM-ID ending in `.002`
3. Create document from different template (e.g., "Trust Transfer Grant Deed") → Should get RM-ID ending in `.001` for that category
4. Verify atomic operations prevent race conditions in concurrent requests

### P0 Issue #2: Sorting Order Verification
1. GET /api/documents → Should return documents sorted by `created_at` ascending (oldest first)
2. GET /api/portfolios/{id}/assets → Should return assets sorted by `created_at` ascending (oldest first)
3. GET /api/portfolios/{id}/ledger → Should return ledger entries sorted by `created_at` ascending (oldest first)

## Backend Changes Made
1. `seed_default_categories` now uses `update_one` with `upsert=True` to prevent race condition duplicates
2. `generate_subject_rm_id` now uses `find_one_and_update` with `ReturnDocument.BEFORE` for atomic sequence generation
3. Ledger entries endpoint now sorts by `created_at` ascending (was `recorded_date` descending)

## Code Files Modified
- `/app/backend/server.py`

## Testing Scope
- Backend API tests for RM-ID generation
- Backend API tests for sorting order
- Requires authentication via Google OAuth

## Incorporate User Feedback
- First document from a default template category must have RM-ID ending in `.001`
- All lists (documents, assets, ledger entries) must be sorted oldest first (ascending by created_at)
