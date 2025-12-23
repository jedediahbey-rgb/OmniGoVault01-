import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import axios from "axios";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import CreateTrust from "./pages/CreateTrust";
import EditTrust from "./pages/EditTrust";
import Education from "./pages/Education";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Configure axios defaults
axios.defaults.withCredentials = true;

// Auth Context
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

// Auth Callback Component - Handles OAuth redirect
// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
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
        const response = await axios.post(`${API}/auth/session`, {
          session_id: sessionId
        });

        if (response.data.user) {
          setUser(response.data.user);
          setLoading(false);
          navigate("/dashboard", { state: { user: response.data.user } });
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
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#C6A87C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#C6A87C] font-serif text-lg">Loading...</p>
        </div>
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

  // Check URL fragment for session_id SYNCHRONOUSLY during render
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback setUser={setUser} setLoading={setLoading} />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/education" element={<Education />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <Dashboard user={user} logout={logout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trusts/new"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <CreateTrust user={user} logout={logout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trusts/:id"
        element={
          <ProtectedRoute user={user} loading={loading} checkAuth={checkAuth}>
            <EditTrust user={user} logout={logout} />
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
