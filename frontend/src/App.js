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
import AppLoader from './components/AppLoader';
import { useAppLoader } from './hooks/useAppLoader';
import WelcomeModal from './components/WelcomeModal';

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
import AdminConsolePage from './pages/AdminConsolePage';
import WorkspacesPage from './pages/WorkspacesPage';
import WorkspaceDetailPage from './pages/WorkspaceDetailPage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

axios.defaults.withCredentials = true;

// Auth Hook
// Dev bypass mode - allows unrestricted access for development/maintenance
// In production, real authenticated users will be used
const DEV_BYPASS_USER = {
  user_id: "dev_admin_user",
  email: "dev.admin@system.local",
  name: "Dev Admin",
  picture: ""
};

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true
      });
      
      if (response.data && response.data.user_id) {
        const userData = response.data;
        setUser(userData);
        // Check if this is dev bypass user
        setIsDevMode(userData.dev_bypass_enabled || userData.user_id === DEV_BYPASS_USER.user_id);
        // Check if first login - show welcome modal
        if (userData.is_first_login) {
          setShowWelcome(true);
        }
        return userData;
      } else {
        // No authenticated user - use dev bypass
        setUser(DEV_BYPASS_USER);
        setIsDevMode(true);
        return DEV_BYPASS_USER;
      }
    } catch (error) {
      // Auth check failed - use dev bypass for maintenance access
      console.log('Auth check using dev bypass mode');
      setUser(DEV_BYPASS_USER);
      setIsDevMode(true);
      return DEV_BYPASS_USER;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
    // After logout, revert to dev bypass
    setUser(DEV_BYPASS_USER);
    setIsDevMode(true);
  };
  
  const clearWelcome = async () => {
    setShowWelcome(false);
    // Clear first_login flag on server
    try {
      await axios.post(`${API}/auth/clear-first-login`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Failed to clear first login flag:', error);
    }
  };

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return { user, setUser, loading, setLoading, checkAuth, logout, isDevMode, showWelcome, clearWelcome };
};

// Auth Callback Component - Handles Emergent Google Auth redirect
// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const AuthCallback = ({ setUser, setLoading, onFirstLogin }) => {
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
        setLoading(true);
        const response = await axios.post(`${API}/auth/session`, { session_id: sessionId }, {
          withCredentials: true
        });
        
        if (response.data.user) {
          setUser(response.data.user);
          setLoading(false);
          
          // Check if this is a first-time user
          if (response.data.is_first_login && onFirstLogin) {
            onFirstLogin();
          }
          
          // Navigate to vault dashboard after successful auth
          navigate('/vault', { state: { user: response.data.user }, replace: true });
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth error:', error);
        navigate('/login');
      }
    };

    processAuth();
  }, [location, navigate, setUser, setLoading, onFirstLogin]);

  return (
    <div className="min-h-screen bg-vault-navy flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-vault-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-vault-gold font-heading text-lg">Authenticating...</p>
        <p className="text-vault-muted text-sm mt-2">Setting up your vault...</p>
      </div>
    </div>
  );
};

// Protected Route Component - allows dev bypass mode for maintenance
const ProtectedRoute = ({ children, user, loading, checkAuth }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      // If user is passed from state (e.g., from AuthCallback), skip check
      if (location.state?.user) {
        setIsChecking(false);
        return;
      }

      // If we already have a user (including dev bypass), we're good
      if (user) {
        setIsChecking(false);
        return;
      }

      // Otherwise, verify with server
      if (checkAuth) {
        await checkAuth();
      }
      setIsChecking(false);
    };

    verifyAuth();
  }, [user, location.state, checkAuth]);

  // While checking auth, show loading
  if (loading || isChecking) {
    return (
      <div className="min-h-screen bg-vault-navy flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-vault-gold border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-vault-muted text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Dev bypass mode OR authenticated user - allow access
  // The backend will return a dev bypass user if no valid session exists
  if (user) {
    return children;
  }

  // Fallback - shouldn't normally reach here due to dev bypass
  return children;
};

// AppLoader wrapper - only shows loading on protected routes, not landing page
const AppLoaderWrapper = ({ isLoading, entitlements, planName, planTier }) => {
  const location = useLocation();
  
  // Don't show loading screen on landing page (root path)
  const isLandingPage = location.pathname === '/' || location.pathname === '/home';
  
  if (isLandingPage) {
    return null;
  }
  
  return (
    <AppLoader 
      isLoading={isLoading}
      entitlements={entitlements}
      planName={planName}
      planTier={planTier}
      minDisplayTime={800}
    />
  );
};

// Layout wrapper for authenticated routes - clean transitions without shimmer
const AuthLayout = ({ children, auth }) => {
  return (
    <MainLayout user={auth.user} onLogout={auth.logout}>
      <div className="min-h-full">
        {children}
      </div>
    </MainLayout>
  );
};

// App Router Component - handles auth callback via session_id in hash
const AppRouter = ({ auth }) => {
  const { user, setUser, loading, setLoading, checkAuth, logout, showWelcome, clearWelcome } = auth;
  const location = useLocation();

  // Check for session_id in URL hash FIRST - before any other routing
  // This must be synchronous to prevent race conditions
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  if (location.hash && location.hash.includes('session_id=')) {
    // Trigger welcome modal via callback when auth completes for first-time users
    const handleFirstLogin = () => {
      // The auth response will set showWelcome via checkAuth after redirect
    };
    return <AuthCallback 
      setUser={setUser} 
      setLoading={setLoading} 
      onFirstLogin={handleFirstLogin}
    />;
  }

  return (
    <>
      {/* Welcome Modal for first-time users */}
      <WelcomeModal 
        isOpen={showWelcome} 
        onClose={clearWelcome}
        userName={user?.name}
      />
      
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
      
      {/* Admin Console (Omnicompetent) */}
      <Route path="/admin" element={
        <AuthLayout auth={auth}>
          <AdminConsolePage />
        </AuthLayout>
      } />
      
      {/* Shared Workspaces Routes */}
      <Route
        path="/vault/workspaces"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <AuthLayout auth={auth}>
              <WorkspacesPage user={user} />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vault/workspaces/:vaultId"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <AuthLayout auth={auth}>
              <WorkspaceDetailPage user={user} />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      
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
    </>
  );
};

function App() {
  const auth = useAuth();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  
  // App loader with entitlements
  const { isLoading, entitlements, planName, planTier } = useAppLoader();

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
      <BillingProvider>
        {/* Entitlement-aware loading screen - only shows for protected routes */}
        <AppLoaderWrapper 
          isLoading={isLoading}
          entitlements={entitlements}
          planName={planName}
          planTier={planTier}
        />
        
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
      </BillingProvider>
    </BrowserRouter>
  );
}

export default App;
