import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import MonoChip from '../components/shared/MonoChip';
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
  FolderSimple,
  CalendarBlank,
  Trash,
  Play,
  Pause
} from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import PageHelpTooltip from '../components/shared/PageHelpTooltip';
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
import { Input } from '../components/ui/input';
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

// Swipeable history card component
function SwipeableHistoryCard({ run, StatusIcon, statusColor, onDelete, onView, onDownload }) {
  const x = useMotionValue(0);
  const background = useTransform(x, [-100, 0], ['rgba(239, 68, 68, 0.3)', 'rgba(0, 0, 0, 0)']);
  const deleteOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);

  const handleDragEnd = (event, info) => {
    if (info.offset.x < -80) {
      onDelete();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Delete background */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-end pr-4 rounded-lg"
        style={{ background }}
      >
        <motion.div style={{ opacity: deleteOpacity }}>
          <Trash className="w-5 h-5 text-red-400" />
        </motion.div>
      </motion.div>
      
      {/* Card content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="p-3 rounded-lg bg-vault-dark/50 border border-vault-gold/10 hover:border-vault-gold/30 transition-colors cursor-grab active:cursor-grabbing relative"
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
              onClick={(e) => { e.stopPropagation(); onView(); }}
              className="text-xs text-vault-muted hover:text-white h-7 px-2"
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onDownload(); }}
              className="text-xs text-vault-muted hover:text-white h-7 px-2"
            >
              <Download className="w-3 h-3 mr-1" />
              Download
            </Button>
          </div>
        )}
        {run.status === 'failed' && run.error_json && (
          <p className="text-red-400 text-xs mt-1 truncate">
            {run.error_json.user_message || run.error_json.message || 'Generation failed'}
          </p>
        )}
      </motion.div>
    </div>
  );
}

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
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [manifestData, setManifestData] = useState(null);
  const [configProfile, setConfigProfile] = useState(null);
  
  // Schedule state
  const [schedules, setSchedules] = useState([]);
  const [scheduleForm, setScheduleForm] = useState({
    profile_id: '',
    frequency: 'weekly',
    day_of_week: 0,
    day_of_month: 1,
    hour: 6,
    minute: 0,
    enabled: true
  });
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [refreshingHistory, setRefreshingHistory] = useState(false);
  const [deleteConfirmRun, setDeleteConfirmRun] = useState(null);

  // Default portfolio state (read-only - set from Dashboard)
  const [isDefaultPortfolio, setIsDefaultPortfolio] = useState(false);
  
  // Check for default portfolio in localStorage on mount
  useEffect(() => {
    if (!portfolioIdFromUrl) {
      const defaultPortfolio = localStorage.getItem('defaultPortfolioId');
      if (defaultPortfolio) {
        setPortfolioId(defaultPortfolio);
        setSearchParams({ portfolio: defaultPortfolio });
      }
    }
  }, [portfolioIdFromUrl, setSearchParams]);
  
  // Update isDefaultPortfolio when portfolioId changes
  useEffect(() => {
    const defaultId = localStorage.getItem('defaultPortfolioId');
    setIsDefaultPortfolio(portfolioId === defaultId);
  }, [portfolioId]);

  // Fetch portfolios on mount
  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        const res = await fetch(`${API_URL}/api/portfolios`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setPortfolios(data);
          // Auto-select default portfolio if exists, else first portfolio
          if (!portfolioId && data.length > 0) {
            const defaultId = localStorage.getItem('defaultPortfolioId');
            const targetId = defaultId && data.some(p => p.portfolio_id === defaultId) 
              ? defaultId 
              : data[0].portfolio_id;
            setPortfolioId(targetId);
            setSearchParams({ portfolio: targetId });
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
        
        // Fetch the newly created run to update Latest Binder section
        if (data.data.run_id) {
          try {
            const runRes = await fetch(`${API_URL}/api/binder/runs/${data.data.run_id}`);
            const runData = await runRes.json();
            if (runData.ok && runData.data.run) {
              setLatestRun(runData.data.run);
            }
          } catch (e) {
            console.error('Failed to fetch new run:', e);
          }
        }
        
        // Also refresh the history
        fetchData();
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

  // Fetch schedules
  const fetchSchedules = useCallback(async () => {
    if (!portfolioId) return;
    try {
      const res = await fetch(`${API_URL}/api/binder/schedules?portfolio_id=${portfolioId}`);
      const data = await res.json();
      if (data.ok) {
        setSchedules(data.data.schedules || []);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  }, [portfolioId]);

  // Fetch schedules when portfolioId changes
  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Create schedule
  const handleCreateSchedule = async () => {
    if (!scheduleForm.profile_id) {
      toast({ title: 'Error', description: 'Please select a profile', variant: 'destructive' });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/binder/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolio_id: portfolioId,
          ...scheduleForm
        })
      });
      const data = await res.json();

      if (data.ok) {
        toast({ title: 'Schedule Created', description: 'Automatic binder generation scheduled' });
        setShowScheduleModal(false);
        fetchSchedules();
        resetScheduleForm();
      } else {
        toast({ title: 'Error', description: data.error?.message || 'Failed to create schedule', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create schedule', variant: 'destructive' });
    }
  };

  // Update schedule
  const handleUpdateSchedule = async () => {
    if (!editingSchedule) return;

    try {
      const res = await fetch(`${API_URL}/api/binder/schedules/${editingSchedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleForm)
      });
      const data = await res.json();

      if (data.ok) {
        toast({ title: 'Schedule Updated', description: 'Schedule settings saved' });
        setShowScheduleModal(false);
        fetchSchedules();
        setEditingSchedule(null);
        resetScheduleForm();
      } else {
        toast({ title: 'Error', description: data.error?.message || 'Failed to update schedule', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update schedule', variant: 'destructive' });
    }
  };

  // Toggle schedule enabled
  const handleToggleSchedule = async (schedule) => {
    try {
      const res = await fetch(`${API_URL}/api/binder/schedules/${schedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !schedule.enabled })
      });
      const data = await res.json();

      if (data.ok) {
        toast({ 
          title: schedule.enabled ? 'Schedule Paused' : 'Schedule Activated',
          description: schedule.enabled ? 'Automatic generation paused' : 'Automatic generation resumed'
        });
        fetchSchedules();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update schedule', variant: 'destructive' });
    }
  };

  // Delete schedule
  const handleDeleteSchedule = async (scheduleId) => {
    try {
      const res = await fetch(`${API_URL}/api/binder/schedules/${scheduleId}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.ok) {
        toast({ title: 'Schedule Deleted', description: 'Automatic generation removed' });
        fetchSchedules();
      } else {
        toast({ title: 'Error', description: data.error?.message || 'Failed to delete', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete schedule', variant: 'destructive' });
    }
  };

  // Refresh binder history
  const handleRefreshHistory = async () => {
    setRefreshingHistory(true);
    try {
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

      toast({ title: 'Refreshed', description: 'Binder history updated' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to refresh history', variant: 'destructive' });
    } finally {
      setRefreshingHistory(false);
    }
  };

  // Delete binder run
  const handleDeleteRun = async (runId) => {
    try {
      const res = await fetch(`${API_URL}/api/binder/runs/${runId}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.ok) {
        toast({ title: 'Binder Deleted', description: 'Binder removed from history' });
        setRuns(runs.filter(r => r.id !== runId));
        // Update latest if we deleted the latest run
        if (latestRun?.id === runId) {
          const remainingRuns = runs.filter(r => r.id !== runId);
          setLatestRun(remainingRuns[0] || null);
        }
        setDeleteConfirmRun(null);
      } else {
        toast({ title: 'Error', description: data.error?.message || 'Failed to delete binder', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete binder', variant: 'destructive' });
    }
  };

  // Reset schedule form
  const resetScheduleForm = () => {
    setScheduleForm({
      profile_id: profiles[0]?.id || '',
      frequency: 'weekly',
      day_of_week: 0,
      day_of_month: 1,
      hour: 6,
      minute: 0,
      enabled: true
    });
  };

  // Open edit schedule modal
  const openEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setScheduleForm({
      profile_id: schedule.profile_id,
      frequency: schedule.frequency,
      day_of_week: schedule.day_of_week,
      day_of_month: schedule.day_of_month,
      hour: schedule.hour,
      minute: schedule.minute,
      enabled: schedule.enabled
    });
    setShowScheduleModal(true);
  };

  // Open new schedule modal
  const openNewSchedule = () => {
    setEditingSchedule(null);
    resetScheduleForm();
    setShowScheduleModal(true);
  };

  // Format schedule description
  const formatScheduleDescription = (schedule) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const time = `${String(schedule.hour).padStart(2, '0')}:${String(schedule.minute).padStart(2, '0')}`;
    
    if (schedule.frequency === 'daily') {
      return `Daily at ${time}`;
    } else if (schedule.frequency === 'weekly') {
      return `Every ${days[schedule.day_of_week]} at ${time}`;
    } else if (schedule.frequency === 'monthly') {
      return `Day ${schedule.day_of_month} of each month at ${time}`;
    }
    return schedule.frequency;
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
        {/* Header - Mobile Responsive */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Top Row - Back button and Title */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-vault-muted hover:text-white shrink-0 p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <FilePdf className="w-5 h-5 text-vault-gold shrink-0" />
              <h1 className="text-xl font-heading text-white truncate">Portfolio Binder</h1>
              <PageHelpTooltip pageKey="binder" />
            </div>
          </div>

          {/* Portfolio Selector Row */}
          <div className="flex items-center gap-2">
            <FolderSimple className="w-4 h-4 text-vault-muted shrink-0" />
            <Select value={portfolioId} onValueChange={handlePortfolioChange}>
              <SelectTrigger className="flex-1 bg-[#05080F] border-vault-gold/30 text-white">
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
            {/* Default Badge (read-only) */}
            {portfolioId && isDefaultPortfolio && (
              <span className="px-2 py-1 text-[10px] font-medium bg-vault-gold/20 text-vault-gold rounded shrink-0">
                Default
              </span>
            )}
          </div>

          {/* Stale Badge */}
          {staleCheck?.is_stale && latestRun && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2">
                <Warning className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 text-sm font-medium">Out of date</span>
              </div>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={generating}
                className="bg-amber-500 hover:bg-amber-600 text-black text-xs"
              >
                <ArrowClockwise className={`w-3 h-3 mr-1 ${generating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
          )}
        </div>

        {!portfolioId ? (
          <div className="text-center py-16 bg-[#0B1221]/50 rounded-xl border border-vault-gold/10">
            <FolderSimple className="w-10 h-10 text-vault-muted mx-auto mb-3" />
            <h3 className="text-base font-medium text-white mb-1">Select a Portfolio</h3>
            <p className="text-vault-muted text-sm">Choose a portfolio to generate binders</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                className="bg-[#0B1221]/80 rounded-xl border border-vault-gold/20 p-6 mb-16"
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
                      {latestRun.finished_at && (
                        <p className="text-vault-muted text-sm">
                          Generated {new Date(latestRun.finished_at).toLocaleString()}
                        </p>
                      )}
                      <p className="text-vault-muted text-xs">
                        {latestRun.total_items} items • {latestRun.total_pages || 'N/A'} pages
                      </p>
                    </div>
                  </div>
                </div>

                {/* Only show action buttons for completed binders */}
                {latestRun.status === 'complete' ? (
                  <div className="grid grid-cols-4 gap-2 relative z-50">
                    <a
                      href={`${API_URL}/api/binder/runs/${latestRun.id}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="col-span-1 inline-flex items-center justify-center gap-1 rounded-md text-sm font-medium h-9 px-3 bg-vault-gold hover:bg-vault-gold/90 text-vault-dark"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </a>
                    <a
                      href={`${API_URL}/api/binder/runs/${latestRun.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="col-span-1 inline-flex items-center justify-center gap-1 rounded-md text-sm font-medium h-9 px-3 border border-vault-gold/30 text-white hover:bg-vault-gold/10"
                    >
                      <Download className="w-4 h-4" />
                      DL
                    </a>
                    <a
                      href={`${API_URL}/api/binder/runs/${latestRun.id}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="col-span-1 inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 border border-vault-gold/30 text-white hover:bg-vault-gold/10"
                    >
                      <Printer className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleViewManifest(latestRun.id)}
                      className="col-span-1 inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 text-vault-muted hover:text-white hover:bg-vault-gold/10"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                ) : latestRun.status === 'failed' ? (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">
                      {latestRun.error_json?.user_message || latestRun.error_json?.message || 'Generation failed'}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-3 text-vault-muted text-sm">
                    <ArrowClockwise className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Sidebar - Schedules & History */}
          <div className="space-y-6">
            {/* Scheduled Generation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-[#0B1221]/80 rounded-xl border border-vault-gold/20 p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-heading text-white flex items-center gap-2">
                  <CalendarBlank className="w-5 h-5 text-vault-gold" />
                  Scheduled Generation
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={openNewSchedule}
                  className="text-vault-gold hover:text-white h-7 px-2"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {schedules.length === 0 ? (
                <div className="text-center py-4 text-vault-muted">
                  <CalendarBlank className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No schedules configured</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openNewSchedule}
                    className="mt-2 border-vault-gold/30 text-vault-gold text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Schedule
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        schedule.enabled 
                          ? 'bg-vault-dark/50 border-vault-gold/20' 
                          : 'bg-vault-dark/30 border-vault-gold/10 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm font-medium truncate">
                          {schedule.profile_name}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleSchedule(schedule)}
                            className={`h-6 w-6 p-0 ${schedule.enabled ? 'text-emerald-400' : 'text-vault-muted'}`}
                          >
                            {schedule.enabled ? <Play className="w-3 h-3" weight="fill" /> : <Pause className="w-3 h-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditSchedule(schedule)}
                            className="h-6 w-6 p-0 text-vault-muted hover:text-white"
                          >
                            <Gear className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="h-6 w-6 p-0 text-vault-muted hover:text-red-400"
                          >
                            <Trash className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-vault-muted text-xs">
                        {formatScheduleDescription(schedule)}
                      </p>
                      {schedule.next_run_at && schedule.enabled && (
                        <p className="text-vault-gold text-xs mt-1">
                          Next: {new Date(schedule.next_run_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Binder History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#0B1221]/80 rounded-xl border border-vault-gold/20 p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-heading text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-vault-gold" />
                  Binder History
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRefreshHistory}
                  disabled={refreshingHistory}
                  className="text-vault-gold hover:text-white h-7 px-2"
                >
                  <ArrowClockwise className={`w-4 h-4 ${refreshingHistory ? 'animate-spin' : ''}`} />
                </Button>
              </div>

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
                  <p className="text-vault-muted text-xs mb-2 text-center">Swipe left to delete</p>
                  {runs.map((run) => {
                    const StatusIcon = STATUS_CONFIG[run.status]?.icon || Clock;
                    const statusColor = STATUS_CONFIG[run.status]?.color || '';

                    return (
                      <SwipeableHistoryCard
                        key={run.id}
                        run={run}
                        StatusIcon={StatusIcon}
                        statusColor={statusColor}
                        onDelete={() => setDeleteConfirmRun(run)}
                        onView={() => window.open(`${API_URL}/api/binder/runs/${run.id}/view`, '_blank')}
                        onDownload={() => window.open(`${API_URL}/api/binder/runs/${run.id}/download`, '_blank')}
                      />
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmRun} onOpenChange={(open) => !open && setDeleteConfirmRun(null)}>
          <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-xl font-heading text-red-400 flex items-center gap-2">
                <Trash className="w-5 h-5" />
                Delete Binder?
              </DialogTitle>
              <DialogDescription className="text-vault-muted">
                Are you sure you want to delete this binder from history? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmRun(null)} className="border-vault-gold/30 text-white">
                Cancel
              </Button>
              <Button 
                onClick={() => deleteConfirmRun && handleDeleteRun(deleteConfirmRun.id)} 
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                      <td className="py-2">
                        {item.rm_id_display ? (
                          <MonoChip variant="gold" size="xs">{item.rm_id_display}</MonoChip>
                        ) : '—'}
                      </td>
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

        {/* Schedule Modal */}
        <Dialog open={showScheduleModal} onOpenChange={(open) => {
          setShowScheduleModal(open);
          if (!open) {
            setEditingSchedule(null);
            resetScheduleForm();
          }
        }}>
          <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-heading text-vault-gold flex items-center gap-2">
                <CalendarBlank className="w-5 h-5" />
                {editingSchedule ? 'Edit Schedule' : 'New Schedule'}
              </DialogTitle>
              <DialogDescription className="text-vault-muted">
                Configure automatic binder generation
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Profile Selection */}
              <div>
                <label className="text-sm text-white mb-2 block">Binder Profile</label>
                <Select
                  value={scheduleForm.profile_id}
                  onValueChange={(value) => setScheduleForm({ ...scheduleForm, profile_id: value })}
                >
                  <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                    <SelectValue placeholder="Select profile" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                    {profiles.map((profile) => (
                      <SelectItem
                        key={profile.id}
                        value={profile.id}
                        className="text-white hover:bg-vault-gold/20"
                      >
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Frequency Selection */}
              <div>
                <label className="text-sm text-white mb-2 block">Frequency</label>
                <Select
                  value={scheduleForm.frequency}
                  onValueChange={(value) => setScheduleForm({ ...scheduleForm, frequency: value })}
                >
                  <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                    <SelectItem value="daily" className="text-white hover:bg-vault-gold/20">Daily</SelectItem>
                    <SelectItem value="weekly" className="text-white hover:bg-vault-gold/20">Weekly</SelectItem>
                    <SelectItem value="monthly" className="text-white hover:bg-vault-gold/20">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Day of Week (for weekly) */}
              {scheduleForm.frequency === 'weekly' && (
                <div>
                  <label className="text-sm text-white mb-2 block">Day of Week</label>
                  <Select
                    value={String(scheduleForm.day_of_week)}
                    onValueChange={(value) => setScheduleForm({ ...scheduleForm, day_of_week: parseInt(value) })}
                  >
                    <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                      <SelectItem value="0" className="text-white hover:bg-vault-gold/20">Sunday</SelectItem>
                      <SelectItem value="1" className="text-white hover:bg-vault-gold/20">Monday</SelectItem>
                      <SelectItem value="2" className="text-white hover:bg-vault-gold/20">Tuesday</SelectItem>
                      <SelectItem value="3" className="text-white hover:bg-vault-gold/20">Wednesday</SelectItem>
                      <SelectItem value="4" className="text-white hover:bg-vault-gold/20">Thursday</SelectItem>
                      <SelectItem value="5" className="text-white hover:bg-vault-gold/20">Friday</SelectItem>
                      <SelectItem value="6" className="text-white hover:bg-vault-gold/20">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Day of Month (for monthly) */}
              {scheduleForm.frequency === 'monthly' && (
                <div>
                  <label className="text-sm text-white mb-2 block">Day of Month (1-28)</label>
                  <Input
                    type="number"
                    min="1"
                    max="28"
                    value={scheduleForm.day_of_month}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_month: parseInt(e.target.value) || 1 })}
                    className="bg-[#05080F] border-vault-gold/20 text-white"
                  />
                </div>
              )}

              {/* Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white mb-2 block">Hour (0-23)</label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={scheduleForm.hour}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, hour: parseInt(e.target.value) || 0 })}
                    className="bg-[#05080F] border-vault-gold/20 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-white mb-2 block">Minute (0-59)</label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={scheduleForm.minute}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, minute: parseInt(e.target.value) || 0 })}
                    className="bg-[#05080F] border-vault-gold/20 text-white"
                  />
                </div>
              </div>

              {/* Enabled Toggle */}
              <div className="flex items-center justify-between pt-2">
                <label className="text-sm text-white">Schedule Active</label>
                <Switch
                  checked={scheduleForm.enabled}
                  onCheckedChange={(checked) => setScheduleForm({ ...scheduleForm, enabled: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowScheduleModal(false);
                  setEditingSchedule(null);
                  resetScheduleForm();
                }}
                className="border-vault-gold/30 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={editingSchedule ? handleUpdateSchedule : handleCreateSchedule}
                className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark"
              >
                {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
