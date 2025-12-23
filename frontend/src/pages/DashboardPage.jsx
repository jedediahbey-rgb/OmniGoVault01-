import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { 
  Scale, Plus, FileText, FolderOpen, Bell, Briefcase, LogOut, User,
  ChevronRight, Search, Calendar, Clock, MoreVertical, Trash2
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DashboardPage = ({ user, logout }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [portfolios, setPortfolios] = useState([]);
  const [stats, setStats] = useState({ portfolios: 0, documents: 0, assets: 0, pending_notices: 0 });
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [newPortfolioDesc, setNewPortfolioDesc] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
    // Check if redirected with create flag
    if (searchParams.get("create") === "true") {
      setShowCreateDialog(true);
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      const [portfoliosRes, statsRes] = await Promise.all([
        axios.get(`${API}/portfolios`),
        axios.get(`${API}/dashboard/stats`)
      ]);
      setPortfolios(portfoliosRes.data);
      setStats(statsRes.data);
      setRecentDocs(statsRes.data.recent_documents || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePortfolio = async () => {
    if (!newPortfolioName.trim()) {
      toast.error("Please enter a portfolio name");
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post(`${API}/portfolios`, {
        name: newPortfolioName.trim(),
        description: newPortfolioDesc.trim()
      });
      setPortfolios([response.data, ...portfolios]);
      setStats(prev => ({ ...prev, portfolios: prev.portfolios + 1 }));
      setShowCreateDialog(false);
      setNewPortfolioName("");
      setNewPortfolioDesc("");
      toast.success("Portfolio created successfully");
      navigate(`/vault/portfolio/${response.data.portfolio_id}`);
    } catch (error) {
      console.error("Error creating portfolio:", error);
      toast.error("Failed to create portfolio");
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePortfolio = async (portfolioId, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this portfolio and all its contents?")) return;

    try {
      await axios.delete(`${API}/portfolios/${portfolioId}`);
      setPortfolios(portfolios.filter(p => p.portfolio_id !== portfolioId));
      setStats(prev => ({ ...prev, portfolios: prev.portfolios - 1 }));
      toast.success("Portfolio deleted");
    } catch (error) {
      console.error("Error deleting portfolio:", error);
      toast.error("Failed to delete portfolio");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#0B1221]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0F172A] border-r border-white/5 p-6 flex flex-col z-40">
        <Link to="/" className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-[#C6A87C]/20 rounded-sm flex items-center justify-center">
            <Scale className="w-5 h-5 text-[#C6A87C]" />
          </div>
          <span className="font-serif text-xl font-semibold text-[#F8FAFC] tracking-tight">
            Portfolio Vault
          </span>
        </Link>

        <nav className="flex-1 space-y-2">
          <Link 
            to="/vault"
            className="flex items-center gap-3 px-4 py-3 bg-[#C6A87C]/10 text-[#C6A87C] rounded-sm"
            data-testid="nav-dashboard"
          >
            <Briefcase className="w-5 h-5" />
            <span className="font-sans text-sm font-medium">Dashboard</span>
          </Link>
          <Link 
            to="/knowledge"
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-[#F8FAFC] hover:bg-white/5 rounded-sm transition-colors"
          >
            <FileText className="w-5 h-5" />
            <span className="font-sans text-sm font-medium">Knowledge Base</span>
          </Link>
          <Link 
            to="/assistant"
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-[#F8FAFC] hover:bg-white/5 rounded-sm transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="font-sans text-sm font-medium">AI Assistant</span>
          </Link>
        </nav>

        <div className="border-t border-white/5 pt-6">
          <div className="flex items-center gap-3 mb-4">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 bg-[#C6A87C]/20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-[#C6A87C]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-sans text-sm font-medium text-[#F8FAFC] truncate">{user?.name || "User"}</p>
              <p className="font-sans text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <Button 
            onClick={handleLogout}
            variant="ghost" 
            className="w-full justify-start text-slate-400 hover:text-[#F8FAFC] hover:bg-white/5"
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl text-[#F8FAFC] mb-2" data-testid="dashboard-title">
              Welcome back, {user?.name?.split(' ')[0] || 'User'}
            </h1>
            <p className="font-sans text-slate-400">Manage your trust portfolios and documents</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[#C6A87C] text-[#0B1221] hover:bg-[#E8D5B5] font-sans font-bold uppercase tracking-wider text-xs" data-testid="create-portfolio-btn">
                <Plus className="w-4 h-4 mr-2" />
                New Portfolio
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#111827] border-white/10 text-[#F8FAFC]">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl text-[#C6A87C]">Create New Portfolio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="font-sans text-sm text-slate-400 mb-2 block">Portfolio Name</label>
                  <Input
                    value={newPortfolioName}
                    onChange={(e) => setNewPortfolioName(e.target.value)}
                    placeholder="e.g., Smith Family Trust"
                    className="bg-[#0B1221] border-white/10 text-[#F8FAFC] placeholder:text-slate-600"
                    data-testid="portfolio-name-input"
                  />
                </div>
                <div>
                  <label className="font-sans text-sm text-slate-400 mb-2 block">Description (Optional)</label>
                  <Input
                    value={newPortfolioDesc}
                    onChange={(e) => setNewPortfolioDesc(e.target.value)}
                    placeholder="Brief description..."
                    className="bg-[#0B1221] border-white/10 text-[#F8FAFC] placeholder:text-slate-600"
                  />
                </div>
                <Button 
                  onClick={handleCreatePortfolio}
                  disabled={creating}
                  className="w-full bg-[#C6A87C] text-[#0B1221] hover:bg-[#E8D5B5]"
                  data-testid="create-portfolio-submit"
                >
                  {creating ? "Creating..." : "Create Portfolio"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-[#111827] border border-white/5 rounded-sm p-6" data-testid="stat-portfolios">
            <p className="font-sans text-xs text-slate-500 uppercase tracking-wider mb-2">Portfolios</p>
            <p className="font-serif text-4xl text-[#F8FAFC]">{stats.portfolios}</p>
          </div>
          <div className="bg-[#111827] border border-white/5 rounded-sm p-6" data-testid="stat-documents">
            <p className="font-sans text-xs text-slate-500 uppercase tracking-wider mb-2">Documents</p>
            <p className="font-serif text-4xl text-[#C6A87C]">{stats.documents}</p>
          </div>
          <div className="bg-[#111827] border border-white/5 rounded-sm p-6" data-testid="stat-assets">
            <p className="font-sans text-xs text-slate-500 uppercase tracking-wider mb-2">Assets</p>
            <p className="font-serif text-4xl text-[#F8FAFC]">{stats.assets}</p>
          </div>
          <div className="bg-[#111827] border border-white/5 rounded-sm p-6" data-testid="stat-notices">
            <p className="font-sans text-xs text-slate-500 uppercase tracking-wider mb-2">Pending Notices</p>
            <p className="font-serif text-4xl text-yellow-500">{stats.pending_notices}</p>
          </div>
        </div>

        {/* Portfolios */}
        <div className="mb-8">
          <h2 className="font-serif text-xl text-[#F8FAFC] mb-4">Your Portfolios</h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-2 border-[#C6A87C] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : portfolios.length === 0 ? (
            <div className="bg-[#111827] border border-white/5 rounded-sm p-12 text-center" data-testid="empty-portfolios">
              <FolderOpen className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h3 className="font-serif text-xl text-[#F8FAFC] mb-2">No portfolios yet</h3>
              <p className="font-sans text-slate-400 mb-6">Create your first trust portfolio to get started</p>
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="bg-[#C6A87C] text-[#0B1221] hover:bg-[#E8D5B5]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Portfolio
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="portfolios-grid">
              {portfolios.map((portfolio) => (
                <div
                  key={portfolio.portfolio_id}
                  onClick={() => navigate(`/vault/portfolio/${portfolio.portfolio_id}`)}
                  className="group bg-[#111827] border border-white/5 rounded-sm p-6 cursor-pointer hover:border-[#C6A87C]/30 transition-all"
                  data-testid={`portfolio-${portfolio.portfolio_id}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-[#C6A87C]/10 rounded-sm flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-[#C6A87C]" />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeletePortfolio(portfolio.portfolio_id, e)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <h3 className="font-serif text-lg text-[#F8FAFC] mb-2">{portfolio.name}</h3>
                  <p className="font-sans text-sm text-slate-400 mb-4">{portfolio.description || "No description"}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="w-3 h-3" />
                    <span>Created {new Date(portfolio.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Documents */}
        {recentDocs.length > 0 && (
          <div>
            <h2 className="font-serif text-xl text-[#F8FAFC] mb-4">Recent Documents</h2>
            <div className="bg-[#111827] border border-white/5 rounded-sm overflow-hidden">
              {recentDocs.map((doc, index) => (
                <div
                  key={doc.document_id}
                  onClick={() => navigate(`/vault/document/${doc.document_id}`)}
                  className={`flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors ${
                    index !== recentDocs.length - 1 ? 'border-b border-white/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <FileText className="w-5 h-5 text-[#C6A87C]" />
                    <span className="font-sans text-[#F8FAFC]">{doc.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
