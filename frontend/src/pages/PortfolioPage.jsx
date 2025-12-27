import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { 
  Scales, Plus, FileText, ArrowLeft, User, SignOut, Briefcase,
  Wallet, Bell, Clock, CheckCircle, Trash, Download, Edit,
  CaretRight, Calendar
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PortfolioPage = ({ user, logout }) => {
  const { portfolioId } = useParams();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [trustProfile, setTrustProfile] = useState(null);
  const [assets, setAssets] = useState([]);
  const [notices, setNotices] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  
  // Dialog states
  const [showAssetDialog, setShowAssetDialog] = useState(false);
  const [showNoticeDialog, setShowNoticeDialog] = useState(false);
  const [showDocDialog, setShowDocDialog] = useState(false);
  
  // Form states
  const [newAsset, setNewAsset] = useState({ asset_type: "", description: "", value: "", notes: "" });
  const [newNotice, setNewNotice] = useState({ event_type: "", title: "", date: "", description: "" });
  const [newDoc, setNewDoc] = useState({ title: "", document_type: "" });

  useEffect(() => {
    fetchData();
  }, [portfolioId]);

  const fetchData = async () => {
    try {
      const [portfolioRes, profileRes, assetsRes, noticesRes, docsRes, templatesRes] = await Promise.all([
        axios.get(`${API}/portfolios/${portfolioId}`),
        axios.get(`${API}/portfolios/${portfolioId}/trust-profile`),
        axios.get(`${API}/portfolios/${portfolioId}/assets`),
        axios.get(`${API}/portfolios/${portfolioId}/notices`),
        axios.get(`${API}/documents?portfolio_id=${portfolioId}`),
        axios.get(`${API}/templates`)
      ]);
      
      setPortfolio(portfolioRes.data);
      setTrustProfile(profileRes.data);
      setAssets(assetsRes.data);
      setNotices(noticesRes.data);
      setDocuments(docsRes.data);
      setTemplates(templatesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      if (error.response?.status === 404) {
        navigate("/vault");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrustProfile = async () => {
    try {
      const response = await axios.post(`${API}/trust-profiles`, {
        portfolio_id: portfolioId,
        trust_name: portfolio.name
      });
      setTrustProfile(response.data);
      toast.success("Trust profile created");
    } catch (error) {
      console.error("Error creating profile:", error);
      toast.error("Failed to create profile");
    }
  };

  const handleUpdateProfile = async (field, value) => {
    if (!trustProfile) return;
    try {
      await axios.put(`${API}/trust-profiles/${trustProfile.profile_id}`, { [field]: value });
      setTrustProfile(prev => ({ ...prev, [field]: value }));
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleCreateAsset = async () => {
    try {
      const response = await axios.post(`${API}/assets`, {
        portfolio_id: portfolioId,
        ...newAsset
      });
      setAssets([response.data, ...assets]);
      setShowAssetDialog(false);
      setNewAsset({ asset_type: "", description: "", value: "", notes: "" });
      toast.success("Asset added");
    } catch (error) {
      console.error("Error creating asset:", error);
      toast.error("Failed to add asset");
    }
  };

  const handleDeleteAsset = async (assetId) => {
    try {
      await axios.delete(`${API}/assets/${assetId}`);
      setAssets(assets.filter(a => a.asset_id !== assetId));
      toast.success("Asset deleted");
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast.error("Failed to delete asset");
    }
  };

  const handleCreateNotice = async () => {
    try {
      const response = await axios.post(`${API}/notices`, {
        portfolio_id: portfolioId,
        ...newNotice
      });
      setNotices([response.data, ...notices]);
      setShowNoticeDialog(false);
      setNewNotice({ event_type: "", title: "", date: "", description: "" });
      toast.success("Notice added");
    } catch (error) {
      console.error("Error creating notice:", error);
      toast.error("Failed to add notice");
    }
  };

  const handleCreateDocument = async () => {
    try {
      const response = await axios.post(`${API}/documents`, {
        portfolio_id: portfolioId,
        title: newDoc.title,
        document_type: newDoc.document_type
      });
      navigate(`/vault/document/${response.data.document_id}`);
    } catch (error) {
      console.error("Error creating document:", error);
      toast.error("Failed to create document");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-vault-dark flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-vault-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vault-dark">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0F172A] border-r border-vault-gold/10 p-6 flex flex-col z-40">
        <Link to="/" className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-vault-gold/20 rounded-lg flex items-center justify-center">
            <Scales className="w-5 h-5 text-vault-gold" weight="duotone" />
          </div>
          <span className="font-heading text-xl font-semibold text-white tracking-tight">
            Portfolio Vault
          </span>
        </Link>

        <nav className="flex-1 space-y-2">
          <Link 
            to="/vault"
            className="flex items-center gap-3 px-4 py-3 text-vault-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" weight="duotone" />
            <span className="font-sans text-sm font-medium">Back to Dashboard</span>
          </Link>
          <div className="border-t border-vault-gold/10 pt-4 mt-4">
            <p className="font-sans text-xs text-vault-muted uppercase tracking-wider px-4 mb-2">Portfolio</p>
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "profile" ? "bg-vault-gold/10 text-vault-gold" : "text-vault-muted hover:text-white hover:bg-white/5"}`}
            >
              <Briefcase className="w-5 h-5" weight="duotone" />
              <span className="font-sans text-sm font-medium">Trust Profile</span>
            </button>
            <button
              onClick={() => setActiveTab("assets")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "assets" ? "bg-vault-gold/10 text-vault-gold" : "text-vault-muted hover:text-white hover:bg-white/5"}`}
            >
              <Wallet className="w-5 h-5" weight="duotone" />
              <span className="font-sans text-sm font-medium">Assets / Res</span>
            </button>
            <button
              onClick={() => setActiveTab("notices")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "notices" ? "bg-vault-gold/10 text-vault-gold" : "text-vault-muted hover:text-white hover:bg-white/5"}`}
            >
              <Bell className="w-5 h-5" weight="duotone" />
              <span className="font-sans text-sm font-medium">Notices</span>
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "documents" ? "bg-vault-gold/10 text-vault-gold" : "text-vault-muted hover:text-white hover:bg-white/5"}`}
            >
              <FileText className="w-5 h-5" weight="duotone" />
              <span className="font-sans text-sm font-medium">Documents</span>
            </button>
          </div>
        </nav>

        <div className="border-t border-vault-gold/10 pt-6">
          <div className="flex items-center gap-3 mb-4">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 bg-vault-gold/20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-vault-gold" weight="duotone" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-sans text-sm font-medium text-white truncate">{user?.name}</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-vault-muted hover:text-white">
            <SignOut className="w-4 h-4 mr-2" weight="duotone" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-vault-muted text-sm mb-4">
            <Link to="/vault" className="hover:text-vault-gold">Dashboard</Link>
            <CaretRight className="w-4 h-4" weight="duotone" />
            <span className="text-vault-gold">{portfolio?.name}</span>
          </div>
          <h1 className="font-heading text-3xl text-white" data-testid="portfolio-title">
            {portfolio?.name}
          </h1>
          {portfolio?.description && (
            <p className="font-sans text-vault-muted mt-2">{portfolio.description}</p>
          )}
        </div>

        {/* Trust Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            {!trustProfile ? (
              <div className="bg-[#0B1221]/80 border border-vault-gold/10 rounded-lg p-12 text-center">
                <Briefcase className="w-16 h-16 text-slate-700 mx-auto mb-4" weight="duotone" />
                <h3 className="font-heading text-xl text-white mb-2">No Trust Profile</h3>
                <p className="font-sans text-vault-muted mb-6">Create a trust profile to store trust details</p>
                <Button onClick={handleCreateTrustProfile} className="bg-vault-gold text-vault-dark">
                  Create Trust Profile
                </Button>
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="bg-[#0B1221]/80 border border-vault-gold/10 rounded-lg p-6">
                  <h3 className="font-heading text-lg text-vault-gold mb-4">Trust Identity</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="font-sans text-xs text-vault-muted uppercase tracking-wider">Trust Name</label>
                      <Input
                        value={trustProfile.trust_name || ""}
                        onChange={(e) => handleUpdateProfile("trust_name", e.target.value)}
                        className="mt-1 bg-vault-dark border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-xs text-vault-muted uppercase tracking-wider">Trust Identifier</label>
                      <Input
                        value={trustProfile.trust_identifier || ""}
                        onChange={(e) => handleUpdateProfile("trust_identifier", e.target.value)}
                        className="mt-1 bg-vault-dark border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-xs text-vault-muted uppercase tracking-wider">Creation Date</label>
                      <Input
                        type="date"
                        value={trustProfile.creation_date || ""}
                        onChange={(e) => handleUpdateProfile("creation_date", e.target.value)}
                        className="mt-1 bg-vault-dark border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Grantor */}
                <div className="bg-[#0B1221]/80 border border-vault-gold/10 rounded-lg p-6">
                  <h3 className="font-heading text-lg text-vault-gold mb-4">Grantor / Settlor</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="font-sans text-xs text-vault-muted uppercase tracking-wider">Name</label>
                      <Input
                        value={trustProfile.grantor_name || ""}
                        onChange={(e) => handleUpdateProfile("grantor_name", e.target.value)}
                        className="mt-1 bg-vault-dark border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-xs text-vault-muted uppercase tracking-wider">Address</label>
                      <Textarea
                        value={trustProfile.grantor_address || ""}
                        onChange={(e) => handleUpdateProfile("grantor_address", e.target.value)}
                        className="mt-1 bg-vault-dark border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Trustee */}
                <div className="bg-[#0B1221]/80 border border-vault-gold/10 rounded-lg p-6">
                  <h3 className="font-heading text-lg text-vault-gold mb-4">Trustee</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="font-sans text-xs text-vault-muted uppercase tracking-wider">Name</label>
                      <Input
                        value={trustProfile.trustee_name || ""}
                        onChange={(e) => handleUpdateProfile("trustee_name", e.target.value)}
                        className="mt-1 bg-vault-dark border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-xs text-vault-muted uppercase tracking-wider">Address</label>
                      <Textarea
                        value={trustProfile.trustee_address || ""}
                        onChange={(e) => handleUpdateProfile("trustee_address", e.target.value)}
                        className="mt-1 bg-vault-dark border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Beneficiary */}
                <div className="bg-[#0B1221]/80 border border-vault-gold/10 rounded-lg p-6">
                  <h3 className="font-heading text-lg text-vault-gold mb-4">Beneficiary</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="font-sans text-xs text-vault-muted uppercase tracking-wider">Name</label>
                      <Input
                        value={trustProfile.beneficiary_name || ""}
                        onChange={(e) => handleUpdateProfile("beneficiary_name", e.target.value)}
                        className="mt-1 bg-vault-dark border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-xs text-vault-muted uppercase tracking-wider">Address</label>
                      <Textarea
                        value={trustProfile.beneficiary_address || ""}
                        onChange={(e) => handleUpdateProfile("beneficiary_address", e.target.value)}
                        className="mt-1 bg-vault-dark border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Governing Statements */}
                <div className="bg-[#0B1221]/80 border border-vault-gold/10 rounded-lg p-6 lg:col-span-2">
                  <h3 className="font-heading text-lg text-vault-gold mb-4">Governing Statements & Terms</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="font-sans text-xs text-vault-muted uppercase tracking-wider">Trust Term</label>
                      <Input
                        value={trustProfile.trust_term || ""}
                        onChange={(e) => handleUpdateProfile("trust_term", e.target.value)}
                        placeholder="e.g., 21 years"
                        className="mt-1 bg-vault-dark border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-xs text-vault-muted uppercase tracking-wider">Renewal Terms</label>
                      <Input
                        value={trustProfile.renewal_terms || ""}
                        onChange={(e) => handleUpdateProfile("renewal_terms", e.target.value)}
                        className="mt-1 bg-vault-dark border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-xs text-vault-muted uppercase tracking-wider">Revocation Conditions</label>
                      <Textarea
                        value={trustProfile.revocation_conditions || ""}
                        onChange={(e) => handleUpdateProfile("revocation_conditions", e.target.value)}
                        className="mt-1 bg-vault-dark border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-xs text-vault-muted uppercase tracking-wider">Modification Conditions</label>
                      <Textarea
                        value={trustProfile.modification_conditions || ""}
                        onChange={(e) => handleUpdateProfile("modification_conditions", e.target.value)}
                        className="mt-1 bg-vault-dark border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Assets Tab */}
        {activeTab === "assets" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl text-white">Assets / Res Ledger</h2>
              <Dialog open={showAssetDialog} onOpenChange={setShowAssetDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-vault-gold text-vault-dark">
                    <Plus className="w-4 h-4 mr-2" weight="duotone" />
                    Add Asset
                  </Button>
                </DialogTrigger>
                <DialogContent 
                  className="bg-[#0B1221]/80 border-white/10 text-white"
                  onInteractOutside={(e) => {
                    const target = e.target;
                    if (target?.closest?.('[data-radix-select-content]') || 
                        target?.closest?.('[role="listbox"]') ||
                        target?.closest?.('[data-radix-popper-content-wrapper]')) {
                      e.preventDefault();
                    }
                  }}
                  onPointerDownOutside={(e) => {
                    const target = e.target;
                    if (target?.closest?.('[data-radix-select-content]') || 
                        target?.closest?.('[role="listbox"]') ||
                        target?.closest?.('[data-radix-popper-content-wrapper]')) {
                      e.preventDefault();
                    }
                  }}
                >
                  <DialogHeader>
                    <DialogTitle className="font-heading text-xl text-vault-gold">Add Asset</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="font-sans text-sm text-vault-muted mb-2 block">Asset Type</label>
                      <Select value={newAsset.asset_type} onValueChange={(v) => setNewAsset({...newAsset, asset_type: v})}>
                        <SelectTrigger className="bg-vault-dark border-white/10 text-white">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0B1221]/80 border-white/10 z-[100]" position="popper" sideOffset={4}>
                          <SelectItem value="real_property">Real Property</SelectItem>
                          <SelectItem value="personal_property">Personal Property</SelectItem>
                          <SelectItem value="financial_account">Financial Account</SelectItem>
                          <SelectItem value="intellectual_property">Intellectual Property</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="font-sans text-sm text-vault-muted mb-2 block">Description</label>
                      <Textarea
                        value={newAsset.description}
                        onChange={(e) => setNewAsset({...newAsset, description: e.target.value})}
                        className="bg-vault-dark border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-sm text-vault-muted mb-2 block">Value (Optional)</label>
                      <Input
                        value={newAsset.value}
                        onChange={(e) => setNewAsset({...newAsset, value: e.target.value})}
                        className="bg-vault-dark border-white/10 text-white"
                      />
                    </div>
                    <Button onClick={handleCreateAsset} className="w-full bg-vault-gold text-vault-dark">
                      Add Asset
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {assets.length === 0 ? (
              <div className="bg-[#0B1221]/80 border border-vault-gold/10 rounded-lg p-12 text-center">
                <Wallet className="w-16 h-16 text-slate-700 mx-auto mb-4" weight="duotone" />
                <h3 className="font-heading text-xl text-white mb-2">No assets yet</h3>
                <p className="font-sans text-vault-muted">Add assets to track the trust corpus</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assets.map((asset) => (
                  <div key={asset.asset_id} className="bg-[#0B1221]/80 border border-vault-gold/10 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <span className="px-2 py-1 bg-vault-gold/10 text-vault-gold text-xs rounded-lg mr-3">
                        {asset.asset_type.replace('_', ' ')}
                      </span>
                      <span className="font-sans text-white">{asset.description}</span>
                      {asset.value && <span className="ml-4 text-vault-muted">Value: {asset.value}</span>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteAsset(asset.asset_id)} className="text-vault-muted hover:text-red-500">
                      <Trash className="w-4 h-4" weight="duotone" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notices Tab */}
        {activeTab === "notices" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl text-white">Notices Timeline</h2>
              <Dialog open={showNoticeDialog} onOpenChange={setShowNoticeDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-vault-gold text-vault-dark">
                    <Plus className="w-4 h-4 mr-2" weight="duotone" />
                    Add Notice
                  </Button>
                </DialogTrigger>
                <DialogContent 
                  className="bg-[#0B1221]/80 border-white/10 text-white"
                  onInteractOutside={(e) => {
                    const target = e.target;
                    if (target?.closest?.('[data-radix-select-content]') || 
                        target?.closest?.('[role="listbox"]') ||
                        target?.closest?.('[data-radix-popper-content-wrapper]')) {
                      e.preventDefault();
                    }
                  }}
                  onPointerDownOutside={(e) => {
                    const target = e.target;
                    if (target?.closest?.('[data-radix-select-content]') || 
                        target?.closest?.('[role="listbox"]') ||
                        target?.closest?.('[data-radix-popper-content-wrapper]')) {
                      e.preventDefault();
                    }
                  }}
                >
                  <DialogHeader>
                    <DialogTitle className="font-heading text-xl text-vault-gold">Add Notice Event</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="font-sans text-sm text-vault-muted mb-2 block">Event Type</label>
                      <Select value={newNotice.event_type} onValueChange={(v) => setNewNotice({...newNotice, event_type: v})}>
                        <SelectTrigger className="bg-vault-dark border-white/10 text-white">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0B1221]/80 border-white/10 z-[100]" position="popper" sideOffset={4}>
                          <SelectItem value="notice_of_intent">Notice of Intent</SelectItem>
                          <SelectItem value="acknowledgement">Acknowledgement</SelectItem>
                          <SelectItem value="delivery">Delivery</SelectItem>
                          <SelectItem value="conveyance">Conveyance</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="font-sans text-sm text-vault-muted mb-2 block">Title</label>
                      <Input
                        value={newNotice.title}
                        onChange={(e) => setNewNotice({...newNotice, title: e.target.value})}
                        className="bg-vault-dark border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-sm text-vault-muted mb-2 block">Date</label>
                      <Input
                        type="date"
                        value={newNotice.date}
                        onChange={(e) => setNewNotice({...newNotice, date: e.target.value})}
                        className="bg-vault-dark border-white/10 text-white"
                      />
                    </div>
                    <Button onClick={handleCreateNotice} className="w-full bg-vault-gold text-vault-dark">
                      Add Notice
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {notices.length === 0 ? (
              <div className="bg-[#0B1221]/80 border border-vault-gold/10 rounded-lg p-12 text-center">
                <Bell className="w-16 h-16 text-slate-700 mx-auto mb-4" weight="duotone" />
                <h3 className="font-heading text-xl text-white mb-2">No notices yet</h3>
                <p className="font-sans text-vault-muted">Track important events and notices</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notices.map((notice) => (
                  <div key={notice.notice_id} className="bg-[#0B1221]/80 border border-vault-gold/10 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${notice.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      <div>
                        <span className="font-sans text-white">{notice.title}</span>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-vault-muted">{notice.event_type.replace('_', ' ')}</span>
                          <span className="text-xs text-vault-muted">{notice.date}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-lg ${notice.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                      {notice.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl text-white">Documents</h2>
              <Dialog open={showDocDialog} onOpenChange={setShowDocDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-vault-gold text-vault-dark">
                    <Plus className="w-4 h-4 mr-2" weight="duotone" />
                    New Document
                  </Button>
                </DialogTrigger>
                <DialogContent 
                  className="bg-[#0B1221]/80 border-white/10 text-white"
                  onInteractOutside={(e) => {
                    const target = e.target;
                    if (target?.closest?.('[data-radix-select-content]') || 
                        target?.closest?.('[role="listbox"]') ||
                        target?.closest?.('[data-radix-popper-content-wrapper]')) {
                      e.preventDefault();
                    }
                  }}
                  onPointerDownOutside={(e) => {
                    const target = e.target;
                    if (target?.closest?.('[data-radix-select-content]') || 
                        target?.closest?.('[role="listbox"]') ||
                        target?.closest?.('[data-radix-popper-content-wrapper]')) {
                      e.preventDefault();
                    }
                  }}
                >
                  <DialogHeader>
                    <DialogTitle className="font-heading text-xl text-vault-gold">Create Document</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="font-sans text-sm text-vault-muted mb-2 block">Document Type</label>
                      <Select value={newDoc.document_type} onValueChange={(v) => setNewDoc({...newDoc, document_type: v})}>
                        <SelectTrigger className="bg-vault-dark border-white/10 text-white">
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0B1221]/80 border-white/10 z-[100]" position="popper" sideOffset={4}>
                          {templates.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="font-sans text-sm text-vault-muted mb-2 block">Document Title</label>
                      <Input
                        value={newDoc.title}
                        onChange={(e) => setNewDoc({...newDoc, title: e.target.value})}
                        placeholder="e.g., Smith Family Trust Declaration"
                        className="bg-vault-dark border-white/10 text-white"
                      />
                    </div>
                    <Button onClick={handleCreateDocument} className="w-full bg-vault-gold text-vault-dark">
                      Create Document
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {documents.length === 0 ? (
              <div className="bg-[#0B1221]/80 border border-vault-gold/10 rounded-lg p-12 text-center">
                <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" weight="duotone" />
                <h3 className="font-heading text-xl text-white mb-2">No documents yet</h3>
                <p className="font-sans text-vault-muted">Create documents from templates</p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div 
                    key={doc.document_id} 
                    onClick={() => navigate(`/vault/document/${doc.document_id}`)}
                    className="bg-[#0B1221]/80 border border-vault-gold/10 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:border-vault-gold/30"
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="w-6 h-6 text-vault-gold" weight="duotone" />
                      <div>
                        <span className="font-sans text-white">{doc.title}</span>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-vault-muted">{doc.document_type.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-vault-muted">v{doc.version}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-lg ${doc.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-vault-gold/10 text-vault-gold'}`}>
                        {doc.status}
                      </span>
                      <CaretRight className="w-4 h-4 text-vault-muted" weight="duotone" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default PortfolioPage;
