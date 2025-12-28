import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import MainLayout from './components/layout/MainLayout';
// Disclaimer component available but not used globally
import CommandPalette from './components/shared/CommandPalette';
import AssistantDrawer from './components/shared/AssistantDrawer';
import { BillingProvider } from './contexts/BillingContext';

// Pages
import CyberHomePage from './pages/CyberHomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LearnPage from './pages/LearnPage';
import MaximsPage from './pages/MaximsPage';
import GlossaryPage from './pages/GlossaryPage';
import VaultPage from './pages/VaultPage';
import TemplatesPage from './pages/TemplatesPage';
import AssistantPage from './pages/AssistantPage';
import DocumentEditorPage from './pages/DocumentEditorPage';
import TrustProfilePage from './pages/TrustProfilePage';
import PortfolioOverviewPage from './pages/PortfolioOverviewPage';
import DiagramsPage from './pages/DiagramsPage';
import NodeMapPage from './pages/NodeMapPage';
import ScenariosPage from './pages/ScenariosPage';
import LedgerTimelinePage from './pages/LedgerTimelinePage';
import GovernancePage from './pages/GovernancePage';
import MeetingEditorPage from './pages/MeetingEditorPage';
import DistributionEditorPage from './pages/DistributionEditorPage';
import DisputeEditorPage from './pages/DisputeEditorPage';
import InsuranceEditorPage from './pages/InsuranceEditorPage';
import CompensationEditorPage from './pages/CompensationEditorPage';
import GovernanceRecordPage from './pages/GovernanceRecordPage';
import DiagnosticsPage from './pages/DiagnosticsPage';
import TrustHealthDashboard from './pages/TrustHealthDashboard';
import SettingsPage from './pages/SettingsPage';
import LedgerThreadsPage from './pages/LedgerThreadsPage';
import BinderPage from './pages/BinderPage';
import AuditLogPage from './pages/AuditLogPage';
import BillingPage from './pages/BillingPage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

axios.defaults.withCredentials = true;

// Auth Hook
// Default user - NO AUTH REQUIRED
const DEFAULT_USER = {
  user_id: "default_user",
  email: "user@omnigovault.com",
  name: "Default User",
  picture: ""
};

export const useAuth = () => {
  // Always return default user - no authentication
  const [user, setUser] = useState(DEFAULT_USER);
  const [loading, setLoading] = useState(false);

  const checkAuth = async () => {
    // Always return default user
    return DEFAULT_USER;
  };

  const logout = async () => {
    // No-op - no logout needed
  };

  return { user, setUser, loading, setLoading, checkAuth, logout };
};

// Auth Callback Component
const AuthCallback = ({ setUser, setLoading }) => {
  const hasProcessed = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (!sessionIdMatch) {
        navigate('/login');
        return;
      }

      const sessionId = sessionIdMatch[1];

      try {
        const response = await axios.post(`${API}/auth/session`, { session_id: sessionId });
        if (response.data.user) {
          setUser(response.data.user);
          setLoading(false);
          navigate('/vault', { state: { user: response.data.user } });
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth error:', error);
        navigate('/login');
      }
    };

    processAuth();
  }, [location, navigate, setUser, setLoading]);

  return (
    <div className="min-h-screen bg-vault-navy flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-vault-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-vault-gold font-heading text-lg">Authenticating...</p>
      </div>
    </div>
  );
};

// Protected Route Component - NO AUTH REQUIRED, always allow access
const ProtectedRoute = ({ children, user, loading, checkAuth }) => {
  // Always render children - no authentication check
  return children;
};

// Layout wrapper for authenticated routes with vault transition
const AuthLayout = ({ children, auth }) => {
  const location = useLocation();
  
  return (
    <MainLayout user={auth.user} onLogout={auth.logout}>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.99 }}
          transition={{ 
            duration: 0.4,
            ease: [0.4, 0, 0.2, 1]
          }}
          className="min-h-full relative"
        >
          {/* Gold shimmer effect on page enter - more visible */}
          <motion.div
            className="fixed inset-0 pointer-events-none z-50"
            initial={{ 
              background: 'linear-gradient(90deg, transparent 0%, rgba(198, 168, 124, 0.25) 45%, rgba(198, 168, 124, 0.4) 50%, rgba(198, 168, 124, 0.25) 55%, transparent 100%)',
              x: '-100%',
              opacity: 1
            }}
            animate={{ 
              x: '200%',
              opacity: [1, 1, 0]
            }}
            transition={{ 
              duration: 0.8,
              ease: 'easeOut'
            }}
          />
          {children}
        </motion.div>
      </AnimatePresence>
    </MainLayout>
  );
};

// App Router Component
const AppRouter = ({ auth }) => {
  const { user, setUser, loading, setLoading, checkAuth, logout } = auth;

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<CyberHomePage />} />
      <Route path="/login" element={<Navigate to="/vault" replace />} />
      
      {/* Public Educational Routes - No auth required for learning */}
      <Route path="/learn" element={
        <AuthLayout auth={auth}>
          <LearnPage user={user} />
        </AuthLayout>
      } />
      <Route path="/maxims" element={
        <AuthLayout auth={auth}>
          <MaximsPage user={user} />
        </AuthLayout>
      } />
      <Route path="/glossary" element={
        <AuthLayout auth={auth}>
          <GlossaryPage user={user} />
        </AuthLayout>
      } />
      <Route path="/diagrams" element={
        <AuthLayout auth={auth}>
          <DiagramsPage />
        </AuthLayout>
      } />
      <Route path="/node-map" element={
        <AuthLayout auth={auth}>
          <NodeMapPage />
        </AuthLayout>
      } />
      <Route path="/node-map/:portfolioId" element={
        <AuthLayout auth={auth}>
          <NodeMapPage />
        </AuthLayout>
      } />
      <Route path="/scenarios" element={
        <AuthLayout auth={auth}>
          <ScenariosPage />
        </AuthLayout>
      } />
      <Route path="/ledger" element={
        <AuthLayout auth={auth}>
          <LedgerTimelinePage />
        </AuthLayout>
      } />
      <Route path="/assistant" element={
        <AuthLayout auth={auth}>
          <AssistantPage user={user} />
        </AuthLayout>
      } />
      
      {/* Diagnostics Page - Admin Tools */}
      <Route path="/diagnostics" element={
        <AuthLayout auth={auth}>
          <DiagnosticsPage />
        </AuthLayout>
      } />
      
      {/* Trust Health Dashboard */}
      <Route path="/health" element={
        <AuthLayout auth={auth}>
          <TrustHealthDashboard />
        </AuthLayout>
      } />
      
      {/* Settings Page */}
      <Route path="/settings" element={
        <AuthLayout auth={auth}>
          <SettingsPage />
        </AuthLayout>
      } />
      
      {/* Ledger Threads Manager */}
      <Route path="/ledger-threads" element={
        <AuthLayout auth={auth}>
          <LedgerThreadsPage />
        </AuthLayout>
      } />
      
      {/* Portfolio Binder */}
      <Route path="/binder" element={
        <AuthLayout auth={auth}>
          <BinderPage />
        </AuthLayout>
      } />
      
      {/* Audit Log */}
      <Route path="/vault/audit-log" element={
        <AuthLayout auth={auth}>
          <AuditLogPage />
        </AuthLayout>
      } />
      
      {/* Billing & Subscription */}
      <Route path="/billing" element={
        <AuthLayout auth={auth}>
          <BillingPage />
        </AuthLayout>
      } />
      
      {/* Protected Vault Routes */}
      <Route
        path="/vault"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <AuthLayout auth={auth}>
              <DashboardPage user={user} />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vault/portfolio/:portfolioId"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <AuthLayout auth={auth}>
              <PortfolioOverviewPage user={user} />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vault/portfolio/:portfolioId/trust-profile"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <AuthLayout auth={auth}>
              <TrustProfilePage user={user} />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vault/documents"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <AuthLayout auth={auth}>
              <VaultPage user={user} />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vault/trash"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <AuthLayout auth={auth}>
              <VaultPage user={user} initialView="trash" />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vault/document/:documentId"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <AuthLayout auth={auth}>
              <DocumentEditorPage user={user} />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/templates"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <AuthLayout auth={auth}>
              <TemplatesPage user={user} />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Governance Routes */}
      <Route
        path="/vault/governance"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <AuthLayout auth={auth}>
              <GovernancePage user={user} />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vault/governance/meetings/:meetingId"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <AuthLayout auth={auth}>
              <MeetingEditorPage user={user} />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vault/governance/distributions/:distributionId"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <AuthLayout auth={auth}>
              <DistributionEditorPage user={user} />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vault/governance/disputes/:disputeId"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <AuthLayout auth={auth}>
              <DisputeEditorPage user={user} />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/vault/governance/insurance/:policyId"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <AuthLayout auth={auth}>
              <InsuranceEditorPage user={user} />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/vault/governance/compensation/:compensationId"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <AuthLayout auth={auth}>
              <CompensationEditorPage user={user} />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      
      {/* V2 Unified Governance Record Page (Amendment Studio) */}
      <Route 
        path="/vault/governance/record/:recordId"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <AuthLayout auth={auth}>
              <GovernanceRecordPage user={user} />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  const auth = useAuth();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setAssistantOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors toastOptions={{ duration: 2000, style: { marginTop: '120px' } }} />
      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)}
        onAction={(action) => {
          if (action === 'new-portfolio') {
            // Handle new portfolio action
          }
        }}
      />
      <AssistantDrawer 
        isOpen={assistantOpen} 
        onClose={() => setAssistantOpen(false)} 
      />
      <AppRouter auth={auth} />
    </BrowserRouter>
  );
}

export default App;
