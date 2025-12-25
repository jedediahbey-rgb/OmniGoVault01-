import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  FilePdf,
  Download,
  Eye,
  Printer,
  ArrowClockwise,
  Check,
  X,
  Warning,
  Clock,
  Gear,
  CaretDown,
  CaretRight,
  ShieldCheck,
  Scales,
  Books,
  ArrowLeft,
  Plus,
  Lightning,
  FolderSimple
} from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PROFILE_ICONS = {
  audit: ShieldCheck,
  court: Scales,
  omni: Books
};

const PROFILE_COLORS = {
  audit: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  court: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  omni: 'text-purple-400 bg-purple-500/10 border-purple-500/30'
};

const STATUS_CONFIG = {
  queued: { color: 'text-amber-400 bg-amber-500/10', label: 'Queued', icon: Clock },
  generating: { color: 'text-blue-400 bg-blue-500/10', label: 'Generating', icon: ArrowClockwise },
  complete: { color: 'text-emerald-400 bg-emerald-500/10', label: 'Complete', icon: Check },
  failed: { color: 'text-red-400 bg-red-500/10', label: 'Failed', icon: X }
};

export default function BinderPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const portfolioIdFromUrl = searchParams.get('portfolio') || '';
  const { toast } = useToast();

  // State
  const [portfolios, setPortfolios] = useState([]);
  const [portfolioId, setPortfolioId] = useState(portfolioIdFromUrl);
  const [profiles, setProfiles] = useState([]);
  const [runs, setRuns] = useState([]);
  const [latestRun, setLatestRun] = useState(null);
  const [staleCheck, setStaleCheck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  
  // Modal state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showManifestModal, setShowManifestModal] = useState(false);
  const [manifestData, setManifestData] = useState(null);
  const [configProfile, setConfigProfile] = useState(null);

  // Fetch portfolios on mount
  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        const res = await fetch(`${API_URL}/api/portfolios`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setPortfolios(data);
          // Auto-select first portfolio if none selected
          if (!portfolioId && data.length > 0) {
            setPortfolioId(data[0].portfolio_id);
            setSearchParams({ portfolio: data[0].portfolio_id });
          }
        }
      } catch (error) {
        console.error('Error fetching portfolios:', error);
      }
    };
    fetchPortfolios();
  }, []);

  // Handle portfolio change
  const handlePortfolioChange = (newPortfolioId) => {
    setPortfolioId(newPortfolioId);
    setSearchParams({ portfolio: newPortfolioId });
    setProfiles([]);
    setRuns([]);
    setLatestRun(null);
    setSelectedProfile(null);
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!portfolioId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch profiles
      const profilesRes = await fetch(`${API_URL}/api/binder/profiles?portfolio_id=${portfolioId}`);
      const profilesData = await profilesRes.json();
      if (profilesData.ok) {
        setProfiles(profilesData.data.profiles || []);
        // Select first profile by default
        if (profilesData.data.profiles?.length > 0 && !selectedProfile) {
          setSelectedProfile(profilesData.data.profiles[0].id);
        }
      }

      // Fetch runs
      const runsRes = await fetch(`${API_URL}/api/binder/runs?portfolio_id=${portfolioId}&limit=10`);
      const runsData = await runsRes.json();
      if (runsData.ok) {
        setRuns(runsData.data.runs || []);
      }

      // Fetch latest
      const latestRes = await fetch(`${API_URL}/api/binder/latest?portfolio_id=${portfolioId}`);
      const latestData = await latestRes.json();
      if (latestData.ok) {
        setLatestRun(latestData.data.run);
      }

      // Fetch stale check
      const staleRes = await fetch(`${API_URL}/api/binder/stale-check?portfolio_id=${portfolioId}`);
      const staleData = await staleRes.json();
      if (staleData.ok) {
        setStaleCheck(staleData.data);
      }

    } catch (error) {
      console.error('Error fetching binder data:', error);
      toast({ title: 'Error', description: 'Failed to load binder data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [portfolioId, toast, selectedProfile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate binder
  const handleGenerate = async () => {
    if (!selectedProfile || !portfolioId) return;

    setGenerating(true);
    try {
      const res = await fetch(`${API_URL}/api/binder/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolio_id: portfolioId,
          profile_id: selectedProfile
        })
      });
      const data = await res.json();

      if (data.ok) {
        toast({
          title: 'Binder Generated',
          description: `Successfully created binder with ${data.data.total_items} items`
        });
        fetchData(); // Refresh data
      } else {
        toast({
          title: 'Generation Failed',
          description: data.error?.message || 'Failed to generate binder',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate binder',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  // View manifest
  const handleViewManifest = async (runId) => {
    try {
      const res = await fetch(`${API_URL}/api/binder/manifest/${runId}`);
      const data = await res.json();
      if (data.ok) {
        setManifestData(data.data);
        setShowManifestModal(true);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load manifest', variant: 'destructive' });
    }
  };

  // Open config modal
  const handleConfigProfile = (profile) => {
    setConfigProfile(profile);
    setShowConfigModal(true);
  };

  // Save profile config
  const handleSaveConfig = async () => {
    if (!configProfile) return;

    try {
      const res = await fetch(`${API_URL}/api/binder/profiles/${configProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rules: configProfile.rules_json
        })
      });
      const data = await res.json();

      if (data.ok) {
        toast({ title: 'Profile Updated', description: 'Configuration saved' });
        setShowConfigModal(false);
        fetchData();
      } else {
        toast({ title: 'Error', description: data.error?.message || 'Failed to save', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save configuration', variant: 'destructive' });
    }
  };

  // Get profile by ID
  const getProfile = (id) => profiles.find(p => p.id === id);
  const currentProfile = getProfile(selectedProfile);
  const currentPortfolio = portfolios.find(p => p.portfolio_id === portfolioId);

  // Show portfolio selector if no portfolios or no selection
  if (portfolios.length === 0 && loading) {
    return (
      <div className="min-h-screen bg-vault-dark p-6">
        <div className="max-w-4xl mx-auto text-center py-20">
          <ArrowClockwise className="w-12 h-12 text-vault-gold mx-auto mb-4 animate-spin" />
          <p className="text-vault-muted">Loading portfolios...</p>
        </div>
      </div>
    );
  }

  if (portfolios.length === 0) {
    return (
      <div className="min-h-screen bg-vault-dark p-6">
        <div className="max-w-4xl mx-auto text-center py-20">
          <FolderSimple className="w-16 h-16 text-vault-gold mx-auto mb-4" />
          <h1 className="text-2xl font-heading text-white mb-2">No Portfolios Found</h1>
          <p className="text-vault-muted mb-6">Create a portfolio first to generate binders</p>
          <Button onClick={() => navigate('/vault')} className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark">
            Go to Vault
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vault-dark p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Portfolio Selector */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-vault-muted hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-heading text-white flex items-center gap-2">
                <FilePdf className="w-6 h-6 text-vault-gold" />
                Portfolio Binder
              </h1>
              <p className="text-vault-muted text-sm">Court / Audit / Omni</p>
            </div>
          </div>

          {/* Portfolio Selector */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FolderSimple className="w-4 h-4 text-vault-muted" />
              <Select value={portfolioId} onValueChange={handlePortfolioChange}>
                <SelectTrigger className="w-64 bg-[#05080F] border-vault-gold/30 text-white">
                  <SelectValue placeholder="Select portfolio">
                    {currentPortfolio?.name || 'Select portfolio'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                  {portfolios.map((p) => (
                    <SelectItem 
                      key={p.portfolio_id} 
                      value={p.portfolio_id}
                      className="text-white hover:bg-vault-gold/20"
                    >
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stale Badge */}
            {staleCheck?.is_stale && latestRun && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <Warning className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 text-sm font-medium">Out of date</span>
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="ml-2 bg-amber-500 hover:bg-amber-600 text-black text-xs"
                >
                  <ArrowClockwise className={`w-3 h-3 mr-1 ${generating ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
              </div>
            )}
          </div>
        </div>

        {!portfolioId ? (
          <div className="text-center py-20 bg-[#0B1221]/50 rounded-xl border border-vault-gold/10">
            <FolderSimple className="w-12 h-12 text-vault-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Select a Portfolio</h3>
            <p className="text-vault-muted">Choose a portfolio from the dropdown above to generate binders</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Panel - Generate */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Selection + Generate */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0B1221]/80 rounded-xl border border-vault-gold/20 p-6"
            >
              <h2 className="text-lg font-heading text-white mb-4 flex items-center gap-2">
                <Lightning className="w-5 h-5 text-vault-gold" />
                Generate Binder
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {profiles.map((profile) => {
                  const Icon = PROFILE_ICONS[profile.profile_type] || FileText;
                  const colorClass = PROFILE_COLORS[profile.profile_type] || 'text-vault-gold bg-vault-gold/10';
                  const isSelected = selectedProfile === profile.id;

                  return (
                    <button
                      key={profile.id}
                      onClick={() => setSelectedProfile(profile.id)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-vault-gold bg-vault-gold/10'
                          : 'border-vault-gold/20 hover:border-vault-gold/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg shrink-0 ${colorClass}`}>
                          <Icon className="w-5 h-5" weight="fill" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <h3 className="font-medium text-white text-sm truncate">{profile.name}</h3>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfigProfile(profile);
                          }}
                          className="text-vault-muted hover:text-white text-xs shrink-0 p-1"
                        >
                          <Gear className="w-4 h-4" />
                        </Button>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={generating || !selectedProfile}
                className="w-full bg-vault-gold hover:bg-vault-gold/90 text-vault-dark font-semibold py-6 text-lg"
              >
                {generating ? (
                  <>
                    <ArrowClockwise className="w-5 h-5 mr-2 animate-spin" />
                    Generating Binder...
                  </>
                ) : (
                  <>
                    <FilePdf className="w-5 h-5 mr-2" />
                    Generate Binder (PDF)
                  </>
                )}
              </Button>

              {currentProfile && (
                <p className="text-center text-vault-muted text-xs mt-3">
                  Using profile: <span className="text-white">{currentProfile.name}</span>
                </p>
              )}
            </motion.div>

            {/* Latest Binder Card */}
            {latestRun && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[#0B1221]/80 rounded-xl border border-vault-gold/20 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-heading text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-vault-gold" />
                    Latest Binder
                  </h2>
                  <Badge className={`${STATUS_CONFIG[latestRun.status]?.color || ''} border`}>
                    {STATUS_CONFIG[latestRun.status]?.label || latestRun.status}
                  </Badge>
                </div>

                <div className="bg-vault-dark/50 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-vault-gold/10">
                      <FilePdf className="w-8 h-8 text-vault-gold" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-white">{latestRun.profile_name}</h3>
                      <p className="text-vault-muted text-sm">
                        Generated {new Date(latestRun.finished_at).toLocaleString()}
                      </p>
                      <p className="text-vault-muted text-xs">
                        {latestRun.total_items} items • {latestRun.total_pages || 'N/A'} pages
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => window.open(`${API_URL}/api/binder/runs/${latestRun.id}/view`, '_blank')}
                    className="flex-1 bg-vault-gold hover:bg-vault-gold/90 text-vault-dark"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button
                    onClick={() => window.open(`${API_URL}/api/binder/runs/${latestRun.id}/download`, '_blank')}
                    variant="outline"
                    className="flex-1 border-vault-gold/30 text-white hover:bg-vault-gold/10"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    onClick={() => {
                      const url = `${API_URL}/api/binder/runs/${latestRun.id}/view`;
                      const printWindow = window.open(url, '_blank');
                      printWindow?.addEventListener('load', () => printWindow.print());
                    }}
                    variant="outline"
                    className="border-vault-gold/30 text-white hover:bg-vault-gold/10"
                  >
                    <Printer className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleViewManifest(latestRun.id)}
                    variant="ghost"
                    className="text-vault-muted hover:text-white"
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar - History */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#0B1221]/80 rounded-xl border border-vault-gold/20 p-4"
            >
              <h2 className="text-lg font-heading text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-vault-gold" />
                Binder History
              </h2>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <ArrowClockwise className="w-6 h-6 text-vault-gold animate-spin" />
                </div>
              ) : runs.length === 0 ? (
                <div className="text-center py-8 text-vault-muted">
                  <FilePdf className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No binders generated yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {runs.map((run) => {
                    const StatusIcon = STATUS_CONFIG[run.status]?.icon || Clock;
                    const statusColor = STATUS_CONFIG[run.status]?.color || '';

                    return (
                      <div
                        key={run.id}
                        className="p-3 rounded-lg bg-vault-dark/50 border border-vault-gold/10 hover:border-vault-gold/30 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white text-sm font-medium truncate">
                            {run.profile_name}
                          </span>
                          <Badge className={`text-xs ${statusColor} border`}>
                            <StatusIcon className={`w-3 h-3 mr-1 ${run.status === 'generating' ? 'animate-spin' : ''}`} />
                            {STATUS_CONFIG[run.status]?.label}
                          </Badge>
                        </div>
                        <p className="text-vault-muted text-xs">
                          {new Date(run.started_at).toLocaleString()}
                        </p>
                        {run.status === 'complete' && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(`${API_URL}/api/binder/runs/${run.id}/view`, '_blank')}
                              className="text-xs text-vault-muted hover:text-white h-7 px-2"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(`${API_URL}/api/binder/runs/${run.id}/download`, '_blank')}
                              className="text-xs text-vault-muted hover:text-white h-7 px-2"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        )}
                        {run.status === 'failed' && run.error_json && (
                          <p className="text-red-400 text-xs mt-1 truncate">
                            Error: {run.error_json.message}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        </div>
        )}

        {/* Config Modal */}
        <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
          <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-heading text-vault-gold flex items-center gap-2">
                <Gear className="w-5 h-5" />
                Configure Profile
              </DialogTitle>
              <DialogDescription className="text-vault-muted">
                {configProfile?.name}
              </DialogDescription>
            </DialogHeader>

            {configProfile && (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-white">Include Drafts</label>
                  <Switch
                    checked={configProfile.rules_json?.include_drafts || false}
                    onCheckedChange={(checked) => setConfigProfile({
                      ...configProfile,
                      rules_json: { ...configProfile.rules_json, include_drafts: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-white">Include Pending/Approved/Executed</label>
                  <Switch
                    checked={configProfile.rules_json?.include_pending_approved_executed || false}
                    onCheckedChange={(checked) => setConfigProfile({
                      ...configProfile,
                      rules_json: { ...configProfile.rules_json, include_pending_approved_executed: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-white">Include Attachments</label>
                  <Switch
                    checked={configProfile.rules_json?.include_attachments !== false}
                    onCheckedChange={(checked) => setConfigProfile({
                      ...configProfile,
                      rules_json: { ...configProfile.rules_json, include_attachments: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-white">Include Ledger Excerpts</label>
                  <Switch
                    checked={configProfile.rules_json?.include_ledger_excerpts !== false}
                    onCheckedChange={(checked) => setConfigProfile({
                      ...configProfile,
                      rules_json: { ...configProfile.rules_json, include_ledger_excerpts: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-white">Include Integrity Summary</label>
                  <Switch
                    checked={configProfile.rules_json?.include_integrity_summary !== false}
                    onCheckedChange={(checked) => setConfigProfile({
                      ...configProfile,
                      rules_json: { ...configProfile.rules_json, include_integrity_summary: checked }
                    })}
                  />
                </div>

                <div>
                  <label className="text-sm text-white mb-2 block">Date Range</label>
                  <Select
                    value={configProfile.rules_json?.date_range || 'all'}
                    onValueChange={(value) => setConfigProfile({
                      ...configProfile,
                      rules_json: { ...configProfile.rules_json, date_range: value }
                    })}
                  >
                    <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                      <SelectItem value="all" className="text-white hover:bg-vault-gold/20">All Time</SelectItem>
                      <SelectItem value="12months" className="text-white hover:bg-vault-gold/20">Last 12 Months</SelectItem>
                      <SelectItem value="24months" className="text-white hover:bg-vault-gold/20">Last 24 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfigModal(false)} className="border-vault-gold/30 text-white">
                Cancel
              </Button>
              <Button onClick={handleSaveConfig} className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark">
                Save Configuration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manifest Modal */}
        <Dialog open={showManifestModal} onOpenChange={setShowManifestModal}>
          <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-2xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-xl font-heading text-vault-gold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Binder Manifest
              </DialogTitle>
              <DialogDescription className="text-vault-muted">
                {manifestData?.profile_name} — Generated {manifestData?.generated_at ? new Date(manifestData.generated_at).toLocaleString() : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto max-h-[60vh] py-4">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#0B1221]">
                  <tr className="border-b border-vault-gold/30">
                    <th className="text-left py-2 text-vault-gold">Section</th>
                    <th className="text-left py-2 text-vault-gold">Title</th>
                    <th className="text-left py-2 text-vault-gold">RM-ID</th>
                    <th className="text-left py-2 text-vault-gold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {manifestData?.manifest?.map((item, index) => (
                    <tr key={index} className="border-b border-vault-gold/10">
                      <td className="py-2 text-vault-muted text-xs">{item.section?.replace(/_/g, ' ')}</td>
                      <td className="py-2 text-white">{item.title}</td>
                      <td className="py-2 text-vault-gold font-mono text-xs">{item.rm_id_display || '—'}</td>
                      <td className="py-2">
                        <Badge className="text-xs bg-vault-gold/10 text-vault-gold border-vault-gold/30">
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!manifestData?.manifest || manifestData.manifest.length === 0) && (
                <div className="text-center py-8 text-vault-muted">
                  No items in manifest
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowManifestModal(false)} className="border-vault-gold/30 text-white">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
