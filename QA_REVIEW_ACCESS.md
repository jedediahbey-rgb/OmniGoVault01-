# OmniGoVault - QA Review Access Pack

## 🔐 QA Review Access

### Preview URL
```
https://docs-audit-tool.preview.emergentagent.com
```

### QA Reviewer Login
**Method:** Cookie-based session (paste in browser DevTools)

1. Open https://docs-audit-tool.preview.emergentagent.com
2. Open DevTools (F12) → Application tab → Cookies
3. Add cookie:
   - **Name:** `session_token`
   - **Value:** `QA_REVIEW_03289b5ff3ab49599b49b167a71f5ed4`
   - **Domain:** `docs-audit-tool.preview.emergentagent.com`
   - **Path:** `/`
4. Refresh the page

### QA Reviewer Permissions
- **Role:** `qa_reviewer`
- **Access:** Read-only to all portfolios, documents, workspaces
- **Restrictions:** No destructive actions (delete, billing changes, irreversible signing)
- **Added to:** All 14 existing vaults as VIEWER

---

## 📍 Complete Route List / Site Map

### Public Routes (No Auth Required)
| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing Page | Hero, login buttons, feature showcase |
| `/login` | Redirects to /vault | Auto-redirect |

### Authenticated Routes (Login Required)
| Route | Page | Role Access |
|-------|------|-------------|
| `/vault` | Dashboard | All users |
| `/vault/portfolio/:portfolioId` | Documents List | All users |
| `/vault/portfolio/:portfolioId/trust-profile` | Trust Profile | All users |
| `/vault/documents` | Documents (default portfolio) | All users |
| `/vault/document/:documentId` | Document Editor | All users |
| `/vault/trash` | Trash/Deleted Docs | All users |
| `/vault/workspaces` | Shared Workspaces List | All users |
| `/vault/workspaces/:vaultId` | Workspace Detail | Participants only |
| `/vault/governance` | Governance Dashboard | All users |
| `/vault/governance/meetings/:meetingId` | Meeting Detail | All users |
| `/vault/governance/distributions/:distributionId` | Distribution Detail | All users |
| `/vault/governance/disputes/:disputeId` | Dispute Detail | All users |
| `/vault/governance/insurance/:policyId` | Insurance Policy | All users |
| `/vault/governance/compensation/:compensationId` | Compensation Entry | All users |
| `/vault/governance/record/:recordId` | Governance Record | All users |
| `/vault/audit-log` | Audit Log | All users |
| `/binder` | Binder Generator | All users |
| `/ledger` | Trust Ledger | All users |
| `/ledger-threads` | Ledger Threads | All users |
| `/templates` | Document Templates | All users |
| `/archive` | Black Archive | All users |
| `/learn` | Learning Center | All users |
| `/maxims` | Legal Maxims | All users |
| `/glossary` | Glossary | All users |
| `/diagrams` | Trust Diagrams | All users |
| `/node-map` | Node Map | All users |
| `/node-map/:portfolioId` | Portfolio Node Map | All users |
| `/scenarios` | What-If Scenarios | All users |
| `/assistant` | AI Assistant | All users |
| `/settings` | User Settings | All users |
| `/billing` | Subscription/Billing | All users |
| `/diagnostics` | System Diagnostics | All users |
| `/health` | Health Check | All users |

### Admin Routes (Elevated Access)
| Route | Page | Role Access |
|-------|------|-------------|
| `/admin` | Admin Console | Admin only |
| `/archive/admin` | Black Archive Admin | Admin only |
| `/support-admin` | Support Admin Tools | Support/Admin |

---

## 🎨 Key UI Components & States

### Dialogs/Modals
1. **Import from Vault** - Select documents from portfolio to import into workspace
2. **Invite Participant** - Email invitation with role selection
3. **Create Document** - New document form with type selection
4. **Create Workspace** - New workspace form (auto-linked to active portfolio)
5. **Sign Document** - Digital signature capture
6. **Binder Configuration** - Profile selection, date range, redaction options

### Key States to Review
- Empty states (no documents, no workspaces, no portfolios)
- Loading states (skeleton loaders, spinners)
- Error states (API failures, validation errors)
- Success states (toast notifications)
- Real-time presence indicators (who's viewing workspace)

---

## 📊 Seed Data Summary

### Portfolios (5)
1. AMMITAI JEDEDIAH BEY LIVING ESTATE TRUST (primary, has documents)
2. Test Portfolio for Style Testing
3. Test Portfolio 20251224_003153
4. Test Portfolio 20251224_003306  
5. Test Portfolio 20251231_130328

### Documents (~8 in primary portfolio)
- Declaration of Trust (various dates)
- Trust Transfer Grant Deed
- Amendment to Declaration of Trust
- Certificate of Acceptance
- Various statuses: draft, pending, executed

### Workspaces/Vaults (14)
- Document Signing Test Vault (multiple)
- Bey Family Trust
- Trust workspace

### Binder Profiles (3)
- Audit profile
- Court/Litigation profile
- Omni profile

---

## 🐛 Known Issues / Current Bugs

1. **WebSocket Connection** - May show connection errors in console (non-blocking)
2. **Binder Generation** - WeasyPrint dependency was reinstalled; verify PDF generation works
3. **Portfolio Switching** - Recently fixed; verify localStorage persistence across navigation

---

## 🔍 Key User Flows to Test

### Flow 1: Portfolio & Document Management
1. Login → Dashboard
2. Select portfolio from dropdown
3. Navigate to Vault/Documents
4. Create new document
5. Edit document
6. Pin/unpin document
7. Move to trash → Restore

### Flow 2: Workspace Collaboration
1. Go to Workspaces
2. Verify filtered by active portfolio
3. Create new workspace
4. Open workspace
5. Invite participant (enter email)
6. Import document from vault
7. View participant list
8. Check presence indicators

### Flow 3: Binder Generation
1. Go to Binder page
2. Select profile (Audit/Court/Omni)
3. Configure date range
4. Select Bates numbering options
5. Generate PDF
6. Download/view result

### Flow 4: Portfolio Switching
1. On Vault page, switch portfolio via dropdown
2. Navigate to Workspaces
3. Verify only workspaces for current portfolio show
4. Open Import from Vault dialog
5. Verify only documents from current portfolio show

---

## 📱 Responsive Breakpoints to Test

| Breakpoint | Width | Target |
|------------|-------|--------|
| Mobile | 390px | iPhone 12/13/14 |
| Tablet | 768px | iPad |
| Desktop | 1440px | Standard laptop |
| Wide | 1920px | Desktop monitor |

---

## ⚡ API Endpoints for Testing

### Authentication
- `GET /api/auth/me` - Current user info
- `POST /api/auth/logout` - Logout

### Portfolios
- `GET /api/portfolios` - List user's portfolios
- `POST /api/portfolios` - Create portfolio

### Documents
- `GET /api/documents?portfolio_id=xxx` - List documents
- `POST /api/documents` - Create document
- `GET /api/documents/:id` - Get document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Soft delete

### Workspaces
- `GET /api/vaults?portfolio_id=xxx` - List workspaces (filtered)
- `POST /api/vaults` - Create workspace
- `GET /api/vaults/:id` - Get workspace details
- `GET /api/vaults/:id/importable-documents?portfolio_id=xxx` - Get importable docs

### Binder
- `GET /api/binder/profiles?portfolio_id=xxx` - List binder profiles
- `POST /api/binder/generate` - Generate PDF

### Real-time
- `WS /api/realtime/ws` - WebSocket for presence

---

## ✅ Review Checklist

- [ ] Landing page loads correctly
- [ ] Google OAuth login works
- [ ] Dashboard displays portfolios
- [ ] Portfolio switching persists across pages
- [ ] Documents list filters by portfolio
- [ ] Document CRUD operations work
- [ ] Workspaces list filters by portfolio
- [ ] Workspace detail shows participants
- [ ] Import from Vault shows correct portfolio's docs
- [ ] Real-time presence indicators appear
- [ ] Binder generation produces PDF
- [ ] Mobile responsive layout works
- [ ] All navigation links work
- [ ] Error states display properly
- [ ] Toast notifications appear
- [ ] Loading states display

---

**Generated:** January 1, 2026
**Environment:** Staging/Preview
**QA Session Valid Until:** January 8, 2026
