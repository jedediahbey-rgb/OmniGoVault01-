# Test Result Documentation

## Current Testing Session
- Session Date: 2024-12-24
- Testing Focus: Meeting Finalization, Locking, Amendment Flow

## Features to Test

### P0: Backend Meeting Locking & Amendment
**Implementation:**
- `normalize_meeting()` helper adds `id`, `locked`, `revision` fields to all meeting responses
- PUT /meetings/{id} returns 409 MEETING_LOCKED when trying to edit finalized meeting
- POST /meetings/{id}/amend creates new draft revision with `parent_meeting_id` and `revision` fields
- GET /meetings/{id}/versions returns all versions sorted by revision

**Backend API Changes:**
- All meeting responses include: `id` (alias for meeting_id), `locked` (boolean), `revision` (integer)
- PUT returns 409 with `MEETING_LOCKED` error code for finalized meetings
- POST /api/governance/meetings/{id}/amend - Creates amendment with proper revision tracking
- GET /api/governance/meetings/{id}/versions - Returns version chain

### P1: Frontend Read-Only & Amendment UX
**Implementation:**
- Meeting cards show 🔒 Locked badge for finalized meetings
- Meeting editor shows "Read-Only" badge for locked meetings
- Prominent "Amend" button for finalized meetings (not already amended)
- 409 error handling shows clear message about using amend instead

**Test Steps:**
1. Login via Google Auth
2. Create a new meeting
3. Add attendees and agenda items
4. Finalize the meeting
5. **EXPECTED**: Meeting shows "Finalized" status and "🔒 Locked" badge
6. Try to edit - **EXPECTED**: Shows read-only mode, no edit button
7. Click "Amend" button
8. **EXPECTED**: New draft revision created with v2 badge
9. Verify amendment can be edited normally

## Code Files Modified This Session
- `/app/backend/models/governance.py` - Added locked, locked_at, revision, parent_meeting_id fields
- `/app/backend/routes/governance.py` - Added normalize_meeting(), updated PUT to return 409, added /versions endpoint
- `/app/frontend/src/pages/GovernancePage.jsx` - Added locked badge, uses id fallback
- `/app/frontend/src/pages/MeetingEditorPage.jsx` - Added isLocked logic, read-only badge, prominent Amend button

## Testing Scope
- Backend: Test locked enforcement, amendment creation, versions endpoint
- Frontend: Test UI for locked meetings, amendment flow

## Incorporate User Feedback
- Finalized meetings must be immutable (reviewable, not editable)
- Amend creates a new draft revision linked to finalized record
- Backend must return stable `id` field and `locked` boolean
