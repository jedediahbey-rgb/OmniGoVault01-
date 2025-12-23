import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { 
  Scale, Plus, FileText, ArrowLeft, User, LogOut, Briefcase,
  Wallet, Bell, Clock, CheckCircle, Trash2, Download, Edit,
  ChevronRight, Calendar
} from "lucide-react";
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
      <div className="min-h-screen bg-[#0B1221] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#C6A87C] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-[#F8FAFC] hover:bg-white/5 rounded-sm transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-sans text-sm font-medium">Back to Dashboard</span>
          </Link>
          <div className="border-t border-white/5 pt-4 mt-4">
            <p className="font-sans text-xs text-slate-500 uppercase tracking-wider px-4 mb-2">Portfolio</p>
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm transition-colors ${activeTab === "profile" ? "bg-[#C6A87C]/10 text-[#C6A87C]" : "text-slate-400 hover:text-[#F8FAFC] hover:bg-white/5"}`}
            >
              <Briefcase className="w-5 h-5" />
              <span className="font-sans text-sm font-medium">Trust Profile</span>
            </button>
            <button
              onClick={() => setActiveTab("assets")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm transition-colors ${activeTab === "assets" ? "bg-[#C6A87C]/10 text-[#C6A87C]" : "text-slate-400 hover:text-[#F8FAFC] hover:bg-white/5"}`}
            >
              <Wallet className="w-5 h-5" />
              <span className="font-sans text-sm font-medium">Assets / Res</span>
            </button>
            <button
              onClick={() => setActiveTab("notices")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm transition-colors ${activeTab === "notices" ? "bg-[#C6A87C]/10 text-[#C6A87C]" : "text-slate-400 hover:text-[#F8FAFC] hover:bg-white/5"}`}
            >
              <Bell className="w-5 h-5" />
              <span className="font-sans text-sm font-medium">Notices</span>
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm transition-colors ${activeTab === "documents" ? "bg-[#C6A87C]/10 text-[#C6A87C]" : "text-slate-400 hover:text-[#F8FAFC] hover:bg-white/5"}`}
            >
              <FileText className="w-5 h-5" />
              <span className="font-sans text-sm font-medium">Documents</span>
            </button>
          </div>
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
              <p className="font-sans text-sm font-medium text-[#F8FAFC] truncate">{user?.name}</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-slate-400 hover:text-[#F8FAFC]">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
            <Link to="/vault" className="hover:text-[#C6A87C]">Dashboard</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#C6A87C]">{portfolio?.name}</span>
          </div>
          <h1 className="font-serif text-3xl text-[#F8FAFC]" data-testid="portfolio-title">
            {portfolio?.name}
          </h1>
          {portfolio?.description && (
            <p className="font-sans text-slate-400 mt-2">{portfolio.description}</p>
          )}
        </div>

        {/* Trust Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            {!trustProfile ? (
              <div className="bg-[#111827] border border-white/5 rounded-sm p-12 text-center">
                <Briefcase className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <h3 className="font-serif text-xl text-[#F8FAFC] mb-2">No Trust Profile</h3>
                <p className="font-sans text-slate-400 mb-6">Create a trust profile to store trust details</p>
                <Button onClick={handleCreateTrustProfile} className="bg-[#C6A87C] text-[#0B1221]">
                  Create Trust Profile
                </Button>
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="bg-[#111827] border border-white/5 rounded-sm p-6">
                  <h3 className="font-serif text-lg text-[#C6A87C] mb-4">Trust Identity</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="font-sans text-xs text-slate-500 uppercase tracking-wider">Trust Name</label>
                      <Input
                        value={trustProfile.trust_name || ""}
                        onChange={(e) => handleUpdateProfile("trust_name", e.target.value)}
                        className="mt-1 bg-[#0B1221] border-white/10 text-[#F8FAFC]"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-xs text-slate-500 uppercase tracking-wider">Trust Identifier</label>
                      <Input
                        value={trustProfile.trust_identifier || ""}
                        onChange={(e) => handleUpdateProfile("trust_identifier", e.target.value)}
                        className="mt-1 bg-[#0B1221] border-white/10 text-[#F8FAFC]"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-xs text-slate-500 uppercase tracking-wider">Creation Date</label>
                      <Input
                        type="date"
                        value={trustProfile.creation_date || ""}
                        onChange={(e) => handleUpdateProfile("creation_date", e.target.value)}
                        className="mt-1 bg-[#0B1221] border-white/10 text-[#F8FAFC]"
                      />
                    </div>
                  </div>
                </div>

                {/* Grantor */}
                <div className="bg-[#111827] border border-white/5 rounded-sm p-6">
                  <h3 className="font-serif text-lg text-[#C6A87C] mb-4">Grantor / Settlor</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="font-sans text-xs text-slate-500 uppercase tracking-wider">Name</label>
                      <Input
                        value={trustProfile.grantor_name || ""}
                        onChange={(e) => handleUpdateProfile("grantor_name", e.target.value)}
                        className="mt-1 bg-[#0B1221] border-white/10 text-[#F8FAFC]"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-xs text-slate-500 uppercase tracking-wider">Address</label>
                      <Textarea
                        value={trustProfile.grantor_address || ""}
                        onChange={(e) => handleUpdateProfile("grantor_address", e.target.value)}
                        className="mt-1 bg-[#0B1221] border-white/10 text-[#F8FAFC]"
                      />
                    </div>
                  </div>
                </div>

                {/* Trustee */}
                <div className="bg-[#111827] border border-white/5 rounded-sm p-6">
                  <h3 className="font-serif text-lg text-[#C6A87C] mb-4">Trustee</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="font-sans text-xs text-slate-500 uppercase tracking-wider">Name</label>
                      <Input
                        value={trustProfile.trustee_name || ""}
                        onChange={(e) => handleUpdateProfile("trustee_name", e.target.value)}
                        className="mt-1 bg-[#0B1221] border-white/10 text-[#F8FAFC]"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-xs text-slate-500 uppercase tracking-wider">Address</label>
                      <Textarea
                        value={trustProfile.trustee_address || ""}
                        onChange={(e) => handleUpdateProfile("trustee_address", e.target.value)}
                        className="mt-1 bg-[#0B1221] border-white/10 text-[#F8FAFC]"
                      />
                    </div>
                  </div>
                </div>

                {/* Beneficiary */}
                <div className="bg-[#111827] border border-white/5 rounded-sm p-6">
                  <h3 className="font-serif text-lg text-[#C6A87C] mb-4">Beneficiary</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="font-sans text-xs text-slate-500 uppercase tracking-wider">Name</label>
                      <Input
                        value={trustProfile.beneficiary_name || ""}
                        onChange={(e) => handleUpdateProfile("beneficiary_name", e.target.value)}
                        className="mt-1 bg-[#0B1221] border-white/10 text-[#F8FAFC]"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-xs text-slate-500 uppercase tracking-wider">Address</label>
                      <Textarea
                        value={trustProfile.beneficiary_address || ""}
                        onChange={(e) => handleUpdateProfile("beneficiary_address", e.target.value)}
                        className="mt-1 bg-[#0B1221] border-white/10 text-[#F8FAFC]"
                      />
                    </div>
                  </div>
                </div>

                {/* Governing Statements */}
                <div className="bg-[#111827] border border-white/5 rounded-sm p-6 lg:col-span-2">
                  <h3 className="font-serif text-lg text-[#C6A87C] mb-4">Governing Statements & Terms</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="font-sans text-xs text-slate-500 uppercase tracking-wider">Trust Term</label>
                      <Input
                        value={trustProfile.trust_term || ""}
                        onChange={(e) => handleUpdateProfile("trust_term", e.target.value)}
                        placeholder="e.g., 21 years"
                        className="mt-1 bg-[#0B1221] border-white/10 text-[#F8FAFC]"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-xs text-slate-500 uppercase tracking-wider">Renewal Terms</label>
                      <Input
                        value={trustProfile.renewal_terms || ""}
                        onChange={(e) => handleUpdateProfile("renewal_terms", e.target.value)}
                        className="mt-1 bg-[#0B1221] border-white/10 text-[#F8FAFC]"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-xs text-slate-500 uppercase tracking-wider">Revocation Conditions</label>
                      <Textarea
                        value={trustProfile.revocation_conditions || ""}
                        onChange={(e) => handleUpdateProfile("revocation_conditions", e.target.value)}
                        className="mt-1 bg-[#0B1221] border-white/10 text-[#F8FAFC]"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-xs text-slate-500 uppercase tracking-wider">Modification Conditions</label>
                      <Textarea
                        value={trustProfile.modification_conditions || ""}
                        onChange={(e) => handleUpdateProfile("modification_conditions", e.target.value)}
                        className="mt-1 bg-[#0B1221] border-white/10 text-[#F8FAFC]"
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
              <h2 className="font-serif text-xl text-[#F8FAFC]">Assets / Res Ledger</h2>
              <Dialog open={showAssetDialog} onOpenChange={setShowAssetDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-[#C6A87C] text-[#0B1221]">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Asset
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#111827] border-white/10 text-[#F8FAFC]">
                  <DialogHeader>
                    <DialogTitle className="font-serif text-xl text-[#C6A87C]">Add Asset</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="font-sans text-sm text-slate-400 mb-2 block">Asset Type</label>
                      <Select value={newAsset.asset_type} onValueChange={(v) => setNewAsset({...newAsset, asset_type: v})}>
                        <SelectTrigger className="bg-[#0B1221] border-white/10 text-[#F8FAFC]">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111827] border-white/10 z-[100]" position="popper" sideOffset={4}>
                          <SelectItem value="real_property">Real Property</SelectItem>
                          <SelectItem value="personal_property">Personal Property</SelectItem>
                          <SelectItem value="financial_account">Financial Account</SelectItem>
                          <SelectItem value="intellectual_property">Intellectual Property</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="font-sans text-sm text-slate-400 mb-2 block">Description</label>
                      <Textarea
                        value={newAsset.description}
                        onChange={(e) => setNewAsset({...newAsset, description: e.target.value})}
                        className="bg-[#0B1221] border-white/10 text-[#F8FAFC]"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-sm text-slate-400 mb-2 block">Value (Optional)</label>
                      <Input
                        value={newAsset.value}
                        onChange={(e) => setNewAsset({...newAsset, value: e.target.value})}
                        className="bg-[#0B1221] border-white/10 text-[#F8FAFC]"
                      />
                    </div>
                    <Button onClick={handleCreateAsset} className="w-full bg-[#C6A87C] text-[#0B1221]">
                      Add Asset
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {assets.length === 0 ? (
              <div className="bg-[#111827] border border-white/5 rounded-sm p-12 text-center">
                <Wallet className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <h3 className="font-serif text-xl text-[#F8FAFC] mb-2">No assets yet</h3>
                <p className="font-sans text-slate-400">Add assets to track the trust corpus</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assets.map((asset) => (
                  <div key={asset.asset_id} className="bg-[#111827] border border-white/5 rounded-sm p-4 flex items-center justify-between">
                    <div>
                      <span className="px-2 py-1 bg-[#C6A87C]/10 text-[#C6A87C] text-xs rounded-sm mr-3">
                        {asset.asset_type.replace('_', ' ')}
                      </span>
                      <span className="font-sans text-[#F8FAFC]">{asset.description}</span>
                      {asset.value && <span className="ml-4 text-slate-400">Value: {asset.value}</span>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteAsset(asset.asset_id)} className="text-slate-500 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
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
              <h2 className="font-serif text-xl text-[#F8FAFC]">Notices Timeline</h2>
              <Dialog open={showNoticeDialog} onOpenChange={setShowNoticeDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-[#C6A87C] text-[#0B1221]">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Notice
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#111827] border-white/10 text-[#F8FAFC]">
                  <DialogHeader>
                    <DialogTitle className="font-serif text-xl text-[#C6A87C]">Add Notice Event</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="font-sans text-sm text-slate-400 mb-2 block">Event Type</label>
                      <Select value={newNotice.event_type} onValueChange={(v) => setNewNotice({...newNotice, event_type: v})}>
                        <SelectTrigger className="bg-[#0B1221] border-white/10 text-[#F8FAFC]">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111827] border-white/10 z-[100]" position="popper" sideOffset={4}>
                          <SelectItem value="notice_of_intent">Notice of Intent</SelectItem>
                          <SelectItem value="acknowledgement">Acknowledgement</SelectItem>
                          <SelectItem value="delivery">Delivery</SelectItem>
                          <SelectItem value="conveyance">Conveyance</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="font-sans text-sm text-slate-400 mb-2 block">Title</label>
                      <Input
                        value={newNotice.title}
                        onChange={(e) => setNewNotice({...newNotice, title: e.target.value})}
                        className="bg-[#0B1221] border-white/10 text-[#F8FAFC]"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-sm text-slate-400 mb-2 block">Date</label>
                      <Input
                        type="date"
                        value={newNotice.date}
                        onChange={(e) => setNewNotice({...newNotice, date: e.target.value})}
                        className="bg-[#0B1221] border-white/10 text-[#F8FAFC]"
                      />
                    </div>
                    <Button onClick={handleCreateNotice} className="w-full bg-[#C6A87C] text-[#0B1221]">
                      Add Notice
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {notices.length === 0 ? (
              <div className="bg-[#111827] border border-white/5 rounded-sm p-12 text-center">
                <Bell className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <h3 className="font-serif text-xl text-[#F8FAFC] mb-2">No notices yet</h3>
                <p className="font-sans text-slate-400">Track important events and notices</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notices.map((notice) => (
                  <div key={notice.notice_id} className="bg-[#111827] border border-white/5 rounded-sm p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${notice.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      <div>
                        <span className="font-sans text-[#F8FAFC]">{notice.title}</span>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-500">{notice.event_type.replace('_', ' ')}</span>
                          <span className="text-xs text-slate-500">{notice.date}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-sm ${notice.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
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
              <h2 className="font-serif text-xl text-[#F8FAFC]">Documents</h2>
              <Dialog open={showDocDialog} onOpenChange={setShowDocDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-[#C6A87C] text-[#0B1221]">
                    <Plus className="w-4 h-4 mr-2" />
                    New Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#111827] border-white/10 text-[#F8FAFC]">
                  <DialogHeader>
                    <DialogTitle className="font-serif text-xl text-[#C6A87C]">Create Document</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="font-sans text-sm text-slate-400 mb-2 block">Document Type</label>
                      <Select value={newDoc.document_type} onValueChange={(v) => setNewDoc({...newDoc, document_type: v})}>
                        <SelectTrigger className="bg-[#0B1221] border-white/10 text-[#F8FAFC]">
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111827] border-white/10">
                          {templates.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="font-sans text-sm text-slate-400 mb-2 block">Document Title</label>
                      <Input
                        value={newDoc.title}
                        onChange={(e) => setNewDoc({...newDoc, title: e.target.value})}
                        placeholder="e.g., Smith Family Trust Declaration"
                        className="bg-[#0B1221] border-white/10 text-[#F8FAFC]"
                      />
                    </div>
                    <Button onClick={handleCreateDocument} className="w-full bg-[#C6A87C] text-[#0B1221]">
                      Create Document
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {documents.length === 0 ? (
              <div className="bg-[#111827] border border-white/5 rounded-sm p-12 text-center">
                <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <h3 className="font-serif text-xl text-[#F8FAFC] mb-2">No documents yet</h3>
                <p className="font-sans text-slate-400">Create documents from templates</p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div 
                    key={doc.document_id} 
                    onClick={() => navigate(`/vault/document/${doc.document_id}`)}
                    className="bg-[#111827] border border-white/5 rounded-sm p-4 flex items-center justify-between cursor-pointer hover:border-[#C6A87C]/30"
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="w-6 h-6 text-[#C6A87C]" />
                      <div>
                        <span className="font-sans text-[#F8FAFC]">{doc.title}</span>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-500">{doc.document_type.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-slate-500">v{doc.version}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-sm ${doc.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-[#C6A87C]/10 text-[#C6A87C]'}`}>
                        {doc.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
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
