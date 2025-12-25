import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import axios from 'axios';
import MainLayout from './components/layout/MainLayout';
// Disclaimer component available but not used globally
import CommandPalette from './components/shared/CommandPalette';
import AssistantDrawer from './components/shared/AssistantDrawer';

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
import GovernancePage from './pages/GovernancePage';
import MeetingEditorPage from './pages/MeetingEditorPage';
import DistributionEditorPage from './pages/DistributionEditorPage';
import DisputeEditorPage from './pages/DisputeEditorPage';
import InsuranceEditorPage from './pages/InsuranceEditorPage';
import CompensationEditorPage from './pages/CompensationEditorPage';
import GovernanceRecordPage from './pages/GovernanceRecordPage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

axios.defaults.withCredentials = true;

// Auth Hook
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
      return response.data;
    } catch (error) {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`);
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
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

// Layout wrapper for authenticated routes
const AuthLayout = ({ children, auth }) => {
  return (
    <MainLayout user={auth.user} onLogout={auth.logout}>
      {children}
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
      <Route path="/login" element={<LoginPage />} />
      
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
      <Route path="/assistant" element={
        <AuthLayout auth={auth}>
          <AssistantPage user={user} />
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
