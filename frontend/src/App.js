import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import axios from "axios";

// Pages
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import KnowledgePage from "./pages/KnowledgePage";
import MaximsPage from "./pages/MaximsPage";
import RelationshipsPage from "./pages/RelationshipsPage";
import TemplatesPage from "./pages/TemplatesPage";
import SourceLibraryPage from "./pages/SourceLibraryPage";
import AssistantPage from "./pages/AssistantPage";
import DashboardPage from "./pages/DashboardPage";
import PortfolioPage from "./pages/PortfolioPage";
import DocumentEditorPage from "./pages/DocumentEditorPage";

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
      console.error("Logout error:", error);
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
        navigate("/login");
        return;
      }

      const sessionId = sessionIdMatch[1];

      try {
        const response = await axios.post(`${API}/auth/session`, { session_id: sessionId });
        if (response.data.user) {
          setUser(response.data.user);
          setLoading(false);
          navigate("/vault", { state: { user: response.data.user } });
        } else {
          navigate("/login");
        }
      } catch (error) {
        console.error("Auth error:", error);
        navigate("/login");
      }
    };

    processAuth();
  }, [location, navigate, setUser, setLoading]);

  return (
    <div className="min-h-screen bg-[#0B1221] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-[#C6A87C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#C6A87C] font-serif text-lg">Authenticating...</p>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, user, loading, checkAuth }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(location.state?.user ? true : null);

  useEffect(() => {
    if (location.state?.user) {
      setIsAuthenticated(true);
      return;
    }

    const verifyAuth = async () => {
      const userData = await checkAuth();
      if (userData) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        navigate("/login");
      }
    };

    verifyAuth();
  }, [checkAuth, navigate, location.state]);

  if (isAuthenticated === null || loading) {
    return (
      <div className="min-h-screen bg-[#0B1221] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#C6A87C] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// App Router Component
const AppRouter = ({ auth }) => {
  const location = useLocation();
  const { user, setUser, loading, setLoading, checkAuth, logout } = auth;

  if (location.hash?.includes("session_id=")) {
    return <AuthCallback setUser={setUser} setLoading={setLoading} />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/knowledge" element={<KnowledgePage />} />
      <Route path="/maxims" element={<MaximsPage />} />
      <Route path="/relationships" element={<RelationshipsPage />} />
      <Route path="/templates" element={<TemplatesPage user={user} />} />
      <Route path="/sources" element={<SourceLibraryPage />} />
      <Route path="/assistant" element={<AssistantPage user={user} />} />
      
      {/* Protected Routes */}
      <Route
        path="/vault"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <DashboardPage user={user} logout={logout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vault/portfolio/:portfolioId"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <PortfolioPage user={user} logout={logout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vault/document/:documentId"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <DocumentEditorPage user={user} logout={logout} />
          </ProtectedRoute>
        }
      />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  const auth = useAuth();

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <AppRouter auth={auth} />
    </BrowserRouter>
  );
}

export default App;
