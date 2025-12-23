# Equity Trust Portfolio Platform

## Original Problem Statement
Build a full-stack, dynamic, interactive website + backend called "Equity Trust Portfolio" that converts the attached PDFs into (1) a structured learning/knowledge site, (2) a secure trust-portfolio document workspace (edit/store/version/export/download), and (3) an AI assistant that is strictly grounded in the PDFs with citations.

## User Requirements (Phase 1)
- GPT-4o for AI assistant
- Google OAuth authentication (Phase 1)
- Dark navy/gold "Sovereign Vault" theme
- Basic versioning for documents

## Architecture

### Tech Stack
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Frontend**: React with Tailwind CSS and Shadcn/UI components
- **Database**: MongoDB
- **Authentication**: Google OAuth via Emergent Auth
- **AI**: GPT-4o via emergentintegrations library
- **PDF Export**: ReportLab

### Backend API Endpoints

**Public Endpoints:**
- `/api/knowledge/topics` - Get knowledge base topics
- `/api/knowledge/maxims` - Get 12 maxims of equity with citations
- `/api/knowledge/relationships` - Get duty-right relationship pairs
- `/api/templates` - Get document templates
- `/api/sources` - Get PDF source documents
- `/api/assistant/chat` - Chat with AI assistant (grounded in PDFs)

**Protected Endpoints (require auth):**
- `/api/portfolios` - CRUD for trust portfolios
- `/api/trust-profiles` - Manage trust profiles
- `/api/assets` - Manage assets/res ledger
- `/api/notices` - Manage notice events
- `/api/documents` - CRUD for documents with versioning
- `/api/documents/{id}/versions` - Version history
- `/api/documents/{id}/export/pdf` - PDF export
- `/api/dashboard/stats` - Dashboard statistics

### Frontend Pages

**Public Pages:**
- `/` - Homepage with hero, features, CTAs
- `/knowledge` - Knowledge base with topics from PDFs
- `/maxims` - Searchable/filterable maxims library
- `/relationships` - Duty ↔ Right explorer
- `/templates` - Document templates preview
- `/sources` - PDF viewer and source library
- `/assistant` - AI chat grounded in PDFs
- `/login` - Google OAuth login

**Protected Pages:**
- `/vault` - Dashboard with stats and portfolios
- `/vault/portfolio/:id` - Portfolio detail (profile, assets, notices, documents)
- `/vault/document/:id` - Document editor with versioning

### Database Collections
- `users` - User profiles
- `user_sessions` - Auth sessions
- `portfolios` - Trust portfolios
- `trust_profiles` - Trust profile details (parties, terms, conditions)
- `assets` - Assets/res ledger
- `notices` - Notice events timeline
- `documents` - Document content with versioning
- `document_versions` - Version history
- `chat_messages` - AI chat history

## Tasks Completed (Phase 1)

### Knowledge Base ✅
- [x] 10 knowledge topics derived from PDFs
- [x] 12 maxims of equity with explanations, tags, and citations
- [x] 4 duty-right relationship pairs with duties/rights lists
- [x] Search and filter functionality
- [x] Source citations on all content

### Portfolio Vault ✅
- [x] Portfolio creation and management
- [x] Trust profile with all party information (Grantor, Trustee, Beneficiary)
- [x] Governing statements, terms, renewal, revocation conditions
- [x] Assets/Res ledger with type, description, value
- [x] Notices timeline with status tracking
- [x] Document management with folders and tags

### Document System ✅
- [x] 7 document templates from Pure Trust Under Equity PDF
- [x] Document editor with rich text
- [x] Basic versioning (auto-save snapshots, restore)
- [x] PDF export functionality
- [x] Version history with restore capability

### AI Assistant ✅
- [x] GPT-4o integration via emergentintegrations
- [x] Grounded in source PDFs only
- [x] Citations included in responses
- [x] Educational disclaimer
- [x] Suggested questions

### Authentication ✅
- [x] Google OAuth via Emergent Auth
- [x] Session management with cookies
- [x] Protected routes

### Design ✅
- [x] Dark navy (#0B1221) and gold (#C6A87C) theme
- [x] Serif typography (Cormorant Garamond style)
- [x] Modern UI with glass-morphism elements
- [x] Responsive design

## Phase 2 Tasks (Future)
- [ ] Full audit logs
- [ ] Role-based access (owner/admin/editor/viewer)
- [ ] Email/password authentication with magic links
- [ ] Light mode toggle
- [ ] MFA authentication
- [ ] E-signature integration
- [ ] Full-text PDF search indexing
- [ ] Kanban/timeline views for notices
- [ ] Document collaboration features

## Source Documents
1. Kingdom vs Empire (Roark) - Equity jurisprudence, maxims, relationships
2. Pure Trust Under Equity - Trust document templates and forms
