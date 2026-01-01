import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from 'framer-motion';
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
  Archive,
  CalendarBlank,
  Trash,
  Play,
  Pause,
  NumberSquareOne,
  Lock,
  LockOpen,
  Stamp,
  EyeSlash,
  Info,
  Gavel,
  ListNumbers,
  Tag,
  Timer
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
import BatesSchemesSettings from '../components/binder/BatesSchemesSettings';

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
function SwipeableHistoryCard({ run, StatusIcon, statusColor, onDelete }) {
  const x = useMotionValue(0);
  const background = useTransform(x, [-100, 0], ['rgba(239, 68, 68, 0.3)', 'rgba(0, 0, 0, 0)']);
  const deleteOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  const controls = useAnimation();

  const handleDragEnd = async (event, info) => {
    if (info.offset.x < -80) {
      // Confirm delete
      if (window.confirm('Delete this binder run?')) {
        onDelete();
      } else {
        // Reset position if canceled
        await controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } });
      }
    } else {
      // Reset position if not swiped far enough
      await controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } });
    }
  };

  const viewUrl = `${API_URL}/api/binder/runs/${run.id}/view`;
  const downloadUrl = `${API_URL}/api/binder/runs/${run.id}/download`;

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
        animate={controls}
        style={{ x }}
        className="p-3 rounded-lg bg-vault-dark/50 border border-vault-gold/10 hover:border-vault-gold/30 transition-colors cursor-grab active:cursor-grabbing relative"
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-white text-sm font-medium truncate flex-1 min-w-0">
            {run.profile_name}
          </span>
          <Badge className={`text-xs ${statusColor} border shrink-0`}>
            <StatusIcon className={`w-3 h-3 mr-1 ${run.status === 'generating' ? 'animate-spin' : ''}`} />
            {STATUS_CONFIG[run.status]?.label}
          </Badge>
        </div>
        <p className="text-vault-muted text-xs">
          {new Date(run.started_at).toLocaleString()}
        </p>
        {run.status === 'complete' && (
          <div className="flex gap-2 mt-2">
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs text-vault-muted hover:text-white h-7 px-2 rounded-md hover:bg-vault-gold/10 no-underline"
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </a>
            <a
              href={downloadUrl}
              download="OmniBinder.pdf"
              className="inline-flex items-center text-xs text-vault-muted hover:text-white h-7 px-2 rounded-md hover:bg-vault-gold/10 no-underline"
            >
              <Download className="w-3 h-3 mr-1" />
              Download
            </a>
          </div>
        )}
        {run.status === 'failed' && run.error_json && (
          <p className="text-red-400 text-xs mt-1 line-clamp-2">
            {run.error_json.user_message || run.error_json.message || 'Generation failed'}
          </p>
        )}
      </motion.div>
    </div>
  );
}

// Native link buttons for PDF actions
function LatestBinderActions({ latestRun, handleViewManifest }) {
  const viewUrl = `${API_URL}/api/binder/runs/${latestRun.id}/view`;
  const downloadUrl = `${API_URL}/api/binder/runs/${latestRun.id}/download`;
  const [showPrintHelp, setShowPrintHelp] = useState(false);
  const { toast } = useToast();

  // Detect mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Handle print
  const handlePrint = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isMobile) {
      // On mobile, show instructions since direct printing doesn't work
      setShowPrintHelp(true);
    } else {
      // On desktop, open PDF and trigger print
      const printWindow = window.open(viewUrl, '_blank', 'width=800,height=600');
      if (printWindow) {
        setTimeout(() => {
          try {
            printWindow.print();
          } catch (err) {
            console.log('Print error:', err);
          }
        }, 2000);
      }
    }
  };

  // Open PDF and close help modal
  const openPdfForPrint = () => {
    window.open(viewUrl, '_blank');
    setShowPrintHelp(false);
    toast({
      title: 'PDF Opened',
      description: 'Use your browser menu (⋮) → Print to print the PDF'
    });
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-2 mb-4">
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="col-span-1 inline-flex items-center justify-center gap-1 rounded-md text-sm font-medium h-10 px-3 bg-vault-gold hover:bg-vault-gold/90 text-vault-dark no-underline"
        >
          <Eye className="w-4 h-4" />
          View
        </a>

        <a
          href={downloadUrl}
          download="OmniBinder.pdf"
          className="col-span-1 inline-flex items-center justify-center gap-1 rounded-md text-sm font-medium h-10 px-3 border border-vault-gold/30 text-white hover:bg-vault-gold/10 no-underline"
        >
          <Download className="w-4 h-4" />
          DL
        </a>

        <button
          type="button"
          onClick={handlePrint}
          className="col-span-1 inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-3 border border-vault-gold/30 text-white hover:bg-vault-gold/10"
        >
          <Printer className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleViewManifest(latestRun.id); }}
          className="col-span-1 inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-3 text-vault-muted hover:text-white hover:bg-vault-gold/10"
        >
          <FileText className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Print Help Dialog */}
      <Dialog open={showPrintHelp} onOpenChange={setShowPrintHelp}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading text-vault-gold flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Print PDF
            </DialogTitle>
            <DialogDescription className="text-vault-muted text-sm">
              Mobile browsers require manual printing
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-3 space-y-2">
            <p className="text-white text-sm">To print your binder:</p>
            <ol className="text-vault-muted text-sm space-y-2 list-decimal list-inside">
              <li>Tap <span className="text-vault-gold font-medium">&ldquo;Open PDF&rdquo;</span> below</li>
              <li>Tap your browser menu <span className="text-white font-mono">⋮</span></li>
              <li>Select <span className="text-vault-gold font-medium">&ldquo;Print&rdquo;</span> or <span className="text-vault-gold font-medium">&ldquo;Share&rdquo;</span></li>
            </ol>
          </div>

          <DialogFooter className="flex flex-row gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowPrintHelp(false)} 
              className="border-vault-gold/30 text-white flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button 
              onClick={openPdfForPrint}
              className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark flex-1 sm:flex-none"
            >
              <Eye className="w-4 h-4 mr-2" />
              Open PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
  const [initialLoadDone, setInitialLoadDone] = useState(false); // Track if initial fetch completed
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

  // Court Mode state
  const [showCourtModePanel, setShowCourtModePanel] = useState(false);
  const [courtModeConfig, setCourtModeConfig] = useState({
    bates_enabled: false,
    bates_prefix: '',
    bates_start_number: 1,
    bates_digits: 6,
    bates_position: 'bottom-right',
    bates_include_cover: false,
    redaction_mode: 'standard',
    adhoc_redactions: []
  });
  const [courtModeInfo, setCourtModeInfo] = useState(null);
  const [redactionSummary, setRedactionSummary] = useState(null);

  // Gaps Analysis state
  const [showGapsPanel, setShowGapsPanel] = useState(false);
  const [gapsAnalysis, setGapsAnalysis] = useState(null);
  const [gapsLoading, setGapsLoading] = useState(false);

  // Evidence Mode state
  const [binderMode, setBinderMode] = useState('portfolio'); // 'portfolio' | 'evidence'
  const [showEvidencePanel, setShowEvidencePanel] = useState(false);
  const [disputes, setDisputes] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [evidenceConfig, setEvidenceConfig] = useState({
    exhibit_format: 'letters',
    exhibit_prefix: '',
    include_timeline: true,
    include_linked_only: true,
    include_date_range_items: true,
    categories_enabled: ['documents', 'communications', 'financial', 'governance'],
    include_bates: false
  });
  const [evidencePreview, setEvidencePreview] = useState(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceRuns, setEvidenceRuns] = useState([]);

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
        const res = await fetch(`${API_URL}/api/portfolios`, {
          credentials: 'include'
        });
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
        setInitialLoadDone(true);
      } catch (error) {
        console.error('Error fetching portfolios:', error);
        setInitialLoadDone(true);
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
      const profilesRes = await fetch(`${API_URL}/api/binder/profiles?portfolio_id=${portfolioId}`, {
        credentials: 'include'
      });
      const profilesData = await profilesRes.json();
      if (profilesData.ok) {
        setProfiles(profilesData.data.profiles || []);
        // Select first profile by default
        if (profilesData.data.profiles?.length > 0 && !selectedProfile) {
          setSelectedProfile(profilesData.data.profiles[0].id);
        }
      }

      // Fetch runs
      const runsRes = await fetch(`${API_URL}/api/binder/runs?portfolio_id=${portfolioId}&limit=10`, {
        credentials: 'include'
      });
      const runsData = await runsRes.json();
      if (runsData.ok) {
        setRuns(runsData.data.runs || []);
      }

      // Fetch latest
      const latestRes = await fetch(`${API_URL}/api/binder/latest?portfolio_id=${portfolioId}`, {
        credentials: 'include'
      });
      const latestData = await latestRes.json();
      if (latestData.ok) {
        setLatestRun(latestData.data.run);
      }

      // Fetch stale check
      const staleRes = await fetch(`${API_URL}/api/binder/stale-check?portfolio_id=${portfolioId}`, {
        credentials: 'include'
      });
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
      // Build request body with Court Mode options if enabled
      const requestBody = {
        portfolio_id: portfolioId,
        profile_id: selectedProfile
      };

      // Add Court Mode options if any are enabled
      if (courtModeConfig.bates_enabled || courtModeConfig.redaction_mode !== 'standard') {
        requestBody.court_mode = {
          bates_enabled: courtModeConfig.bates_enabled,
          bates_prefix: courtModeConfig.bates_prefix,
          bates_start_number: courtModeConfig.bates_start_number,
          bates_digits: courtModeConfig.bates_digits,
          bates_position: courtModeConfig.bates_position,
          bates_include_cover: courtModeConfig.bates_include_cover,
          redaction_mode: courtModeConfig.redaction_mode,
          adhoc_redactions: courtModeConfig.adhoc_redactions
        };
      }

      const res = await fetch(`${API_URL}/api/binder/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });
      const data = await res.json();

      if (data.ok) {
        // Build success message with Court Mode info
        let description = `Successfully created binder with ${data.data.total_items} items`;
        if (data.data.court_mode) {
          if (data.data.court_mode.bates_pages > 0) {
            description += ` • ${data.data.court_mode.bates_pages} Bates-stamped pages`;
          }
          if (data.data.court_mode.redactions_applied > 0) {
            description += ` • ${data.data.court_mode.redactions_applied} redactions applied`;
          }
        }

        toast({
          title: 'Binder Generated',
          description
        });
        
        // Fetch the newly created run to update Latest Binder section
        if (data.data.run_id) {
          try {
            const runRes = await fetch(`${API_URL}/api/binder/runs/${data.data.run_id}`, {
              credentials: 'include'
            });
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
      const res = await fetch(`${API_URL}/api/binder/manifest/${runId}`, {
        credentials: 'include'
      });
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
        credentials: 'include',
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
      const res = await fetch(`${API_URL}/api/binder/schedules?portfolio_id=${portfolioId}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.ok) {
        setSchedules(data.data.schedules || []);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  }, [portfolioId]);

  // Fetch Court Mode config
  const fetchCourtModeConfig = useCallback(async () => {
    if (!portfolioId) return;
    try {
      const res = await fetch(`${API_URL}/api/binder/court-mode/config?portfolio_id=${portfolioId}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.ok) {
        setCourtModeInfo(data.data);
        // Set default prefix
        if (data.data.bates?.default_prefix) {
          setCourtModeConfig(prev => ({
            ...prev,
            bates_prefix: data.data.bates.default_prefix
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching court mode config:', error);
    }
  }, [portfolioId]);

  // Fetch redaction summary
  const fetchRedactionSummary = useCallback(async () => {
    if (!portfolioId) return;
    try {
      const res = await fetch(`${API_URL}/api/binder/redactions/summary?portfolio_id=${portfolioId}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.ok) {
        setRedactionSummary(data.data);
      }
    } catch (error) {
      console.error('Error fetching redaction summary:', error);
    }
  }, [portfolioId]);

  // Fetch Gaps Analysis
  const fetchGapsAnalysis = useCallback(async () => {
    if (!portfolioId) return;
    setGapsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/binder/gaps/analyze?portfolio_id=${portfolioId}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.ok) {
        setGapsAnalysis(data.data);
      }
    } catch (error) {
      console.error('Error fetching gaps analysis:', error);
    } finally {
      setGapsLoading(false);
    }
  }, [portfolioId]);

  // Fetch disputes for Evidence Mode
  const fetchDisputes = useCallback(async () => {
    if (!portfolioId) return;
    try {
      const res = await fetch(`${API_URL}/api/evidence-binder/disputes?portfolio_id=${portfolioId}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.ok) {
        setDisputes(data.data.disputes || []);
      }
    } catch (error) {
      console.error('Error fetching disputes:', error);
    }
  }, [portfolioId]);

  // Fetch evidence preview
  const fetchEvidencePreview = useCallback(async () => {
    if (!portfolioId || !selectedDispute) return;
    setEvidenceLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/evidence-binder/preview?portfolio_id=${portfolioId}&dispute_id=${selectedDispute}&include_linked_only=${evidenceConfig.include_linked_only}&include_date_range=${evidenceConfig.include_date_range_items}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (data.ok) {
        setEvidencePreview(data.data);
      }
    } catch (error) {
      console.error('Error fetching evidence preview:', error);
    } finally {
      setEvidenceLoading(false);
    }
  }, [portfolioId, selectedDispute, evidenceConfig.include_linked_only, evidenceConfig.include_date_range_items]);

  // Fetch evidence binder runs
  const fetchEvidenceRuns = useCallback(async () => {
    if (!portfolioId) return;
    try {
      const res = await fetch(`${API_URL}/api/evidence-binder/runs?portfolio_id=${portfolioId}&limit=5`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.ok) {
        setEvidenceRuns(data.data.runs || []);
      }
    } catch (error) {
      console.error('Error fetching evidence runs:', error);
    }
  }, [portfolioId]);

  // Fetch schedules when portfolioId changes
  useEffect(() => {
    fetchSchedules();
    fetchCourtModeConfig();
    fetchRedactionSummary();
    fetchDisputes();
    fetchEvidenceRuns();
  }, [fetchSchedules, fetchCourtModeConfig, fetchRedactionSummary, fetchDisputes, fetchEvidenceRuns]);

  // Generate Evidence Binder
  const handleGenerateEvidence = async () => {
    if (!selectedDispute || !portfolioId) {
      toast({ title: 'Error', description: 'Please select a dispute', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch(`${API_URL}/api/evidence-binder/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          portfolio_id: portfolioId,
          dispute_id: selectedDispute,
          rules: evidenceConfig
        })
      });
      const data = await res.json();

      if (data.ok) {
        toast({
          title: 'Evidence Binder Generated',
          description: `Created binder with ${data.data.total_exhibits} exhibits`
        });
        fetchEvidenceRuns();
      } else {
        toast({
          title: 'Generation Failed',
          description: data.error?.message || 'Failed to generate evidence binder',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate evidence binder',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

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
        credentials: 'include',
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
        credentials: 'include',
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
        credentials: 'include',
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
        method: 'DELETE',
        credentials: 'include'
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
      const runsRes = await fetch(`${API_URL}/api/binder/runs?portfolio_id=${portfolioId}&limit=10`, {
        credentials: 'include'
      });
      const runsData = await runsRes.json();
      if (runsData.ok) {
        setRuns(runsData.data.runs || []);
      }

      // Fetch latest
      const latestRes = await fetch(`${API_URL}/api/binder/latest?portfolio_id=${portfolioId}`, {
        credentials: 'include'
      });
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
        method: 'DELETE',
        credentials: 'include'
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

  // Clear all failed binder runs
  const handleClearFailed = async () => {
    const failedRuns = runs.filter(r => r.status === 'failed');
    if (failedRuns.length === 0) return;

    let deletedCount = 0;
    for (const run of failedRuns) {
      try {
        const res = await fetch(`${API_URL}/api/binder/runs/${run.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        const data = await res.json();
        if (data.ok) deletedCount++;
      } catch (e) {
        console.error('Failed to delete run:', run.id);
      }
    }

    if (deletedCount > 0) {
      toast({ title: 'Cleared Failed Binders', description: `Removed ${deletedCount} failed binder${deletedCount > 1 ? 's' : ''} from history` });
      setRuns(runs.filter(r => r.status !== 'failed'));
      // Update latest if needed
      if (latestRun?.status === 'failed') {
        const successfulRuns = runs.filter(r => r.status === 'complete');
        setLatestRun(successfulRuns[0] || null);
      }
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

  // Show loading spinner while fetching data - wait for initial portfolios load
  if (!initialLoadDone || loading) {
    return (
      <div className="min-h-screen bg-vault-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-vault-gold/30 border-t-vault-gold rounded-full animate-spin" />
          <span className="text-vault-muted text-sm">Loading binder...</span>
        </div>
      </div>
    );
  }

  // Only show "No Portfolios" after initial load is complete
  if (portfolios.length === 0) {
    return (
      <div className="min-h-screen bg-vault-dark p-6">
        <div className="max-w-4xl mx-auto text-center py-20">
          <Archive className="w-16 h-16 text-vault-gold mx-auto mb-4" />
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
              onClick={() => {
                if (portfolioId) {
                  navigate(`/vault/portfolio/${portfolioId}`);
                } else {
                  navigate('/vault');
                }
              }}
              className="text-vault-muted hover:text-white shrink-0 p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FilePdf className="w-5 h-5 text-vault-gold shrink-0" />
                <h1 className="text-xl font-heading text-white truncate">Portfolio Binder</h1>
              </div>
              <p className="text-white/60 text-xs sm:text-sm mt-1">
                Generate court-ready PDF{' '}
                <span style={{ whiteSpace: 'nowrap' }}>
                  binders. <span className="inline-flex align-middle"><PageHelpTooltip pageKey="binder" /></span>
                </span>
              </p>
            </div>
          </div>

          {/* Portfolio Selector Row */}
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-vault-muted shrink-0" />
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
            <Archive className="w-10 h-10 text-vault-muted mx-auto mb-3" />
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

              {/* Binder Mode Toggle */}
              <div className="flex gap-2 mb-6 p-1 bg-[#05080F] rounded-lg">
                <button
                  onClick={() => setBinderMode('portfolio')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    binderMode === 'portfolio'
                      ? 'bg-vault-gold text-vault-dark'
                      : 'text-vault-muted hover:text-white'
                  }`}
                >
                  <Books className="w-4 h-4" />
                  Portfolio Binder
                </button>
                <button
                  onClick={() => {
                    setBinderMode('evidence');
                    if (disputes.length === 0) fetchDisputes();
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    binderMode === 'evidence'
                      ? 'bg-red-500 text-white'
                      : 'text-vault-muted hover:text-white'
                  }`}
                >
                  <Gavel className="w-4 h-4" />
                  Evidence Binder
                </button>
              </div>

              {/* Portfolio Binder Mode */}
              {binderMode === 'portfolio' && (
                <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {profiles.map((profile) => {
                  const Icon = PROFILE_ICONS[profile.profile_type] || FileText;
                  const colorClass = PROFILE_COLORS[profile.profile_type] || 'text-vault-gold bg-vault-gold/10';
                  const isSelected = selectedProfile === profile.id;

                  return (
                    <div
                      key={profile.id}
                      onClick={() => setSelectedProfile(profile.id)}
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfigProfile(profile);
                          }}
                          className="text-vault-muted hover:text-white text-xs shrink-0 p-1"
                        >
                          <Gear className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Court Mode Panel */}
              <div className="mb-6">
                <button
                  onClick={() => setShowCourtModePanel(!showCourtModePanel)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Scales className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-medium text-sm">Court Mode</span>
                    {(courtModeConfig.bates_enabled || courtModeConfig.redaction_mode !== 'standard') && (
                      <span className="px-2 py-0.5 text-xs rounded bg-blue-500/30 text-blue-300">Active</span>
                    )}
                  </div>
                  <CaretRight className={`w-4 h-4 text-vault-muted transition-transform ${showCourtModePanel ? 'rotate-90' : ''}`} />
                </button>

                <AnimatePresence>
                  {showCourtModePanel && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 p-4 rounded-lg bg-[#05080F] border border-vault-gold/10 space-y-4">
                        {/* Bates Numbering Section */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Stamp className="w-4 h-4 text-vault-gold" />
                              <span className="text-white text-sm font-medium">Bates Numbering</span>
                            </div>
                            <Switch
                              checked={courtModeConfig.bates_enabled}
                              onCheckedChange={(checked) => setCourtModeConfig(prev => ({ ...prev, bates_enabled: checked }))}
                            />
                          </div>

                          {courtModeConfig.bates_enabled && (
                            <div className="pl-6 space-y-3">
                              {/* Saved Schemes */}
                              <BatesSchemesSettings
                                workspaceId={portfolios.find(p => p.portfolio_id === portfolioId)?.account_id || 'default'}
                                portfolioId={portfolioId}
                                onApplyScheme={(schemeConfig) => {
                                  setCourtModeConfig(prev => ({
                                    ...prev,
                                    bates_prefix: schemeConfig.bates_prefix,
                                    bates_digits: schemeConfig.bates_digits,
                                    bates_position: schemeConfig.bates_position,
                                    bates_start_number: schemeConfig.bates_start_number,
                                    bates_include_cover: schemeConfig.bates_include_cover,
                                  }));
                                }}
                                compact={true}
                              />
                              
                              {/* Quick Presets */}
                              <div>
                                <label className="text-vault-muted text-xs mb-1.5 block">Quick Preset</label>
                                <div className="flex flex-wrap gap-1.5">
                                  {[
                                    { label: 'Portfolio', prefix: portfolios.find(p => p.portfolio_id === portfolioId)?.abbreviation || 'DOC' },
                                    { label: 'Exhibit', prefix: 'EXHIBIT' },
                                    { label: 'Discovery', prefix: 'DISC' },
                                    { label: 'Bates', prefix: 'BATES' }
                                  ].map(preset => (
                                    <button
                                      key={preset.label}
                                      onClick={() => setCourtModeConfig(prev => ({ 
                                        ...prev, 
                                        bates_prefix: preset.prefix + '-'
                                      }))}
                                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                                        courtModeConfig.bates_prefix === preset.prefix + '-'
                                          ? 'bg-vault-gold/20 border-vault-gold/50 text-vault-gold'
                                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                      }`}
                                    >
                                      {preset.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-vault-muted text-xs mb-1 block">Prefix</label>
                                  <Input
                                    value={courtModeConfig.bates_prefix}
                                    onChange={(e) => setCourtModeConfig(prev => ({ ...prev, bates_prefix: e.target.value.toUpperCase() }))}
                                    placeholder={courtModeInfo?.bates?.default_prefix || 'DOC-'}
                                    className="bg-[#0B1221] border-vault-gold/30 text-white h-9 text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-vault-muted text-xs mb-1 block">Start #</label>
                                  <Input
                                    type="number"
                                    value={courtModeConfig.bates_start_number}
                                    onChange={(e) => setCourtModeConfig(prev => ({ ...prev, bates_start_number: parseInt(e.target.value) || 1 }))}
                                    min={1}
                                    className="bg-[#0B1221] border-vault-gold/30 text-white h-9 text-sm"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-vault-muted text-xs mb-1 block">Digits</label>
                                  <Select
                                    value={String(courtModeConfig.bates_digits)}
                                    onValueChange={(v) => setCourtModeConfig(prev => ({ ...prev, bates_digits: parseInt(v) }))}
                                  >
                                    <SelectTrigger className="bg-[#0B1221] border-vault-gold/30 text-white h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0B1221] border-vault-gold/30">
                                      <SelectItem value="4" className="text-white">4 digits</SelectItem>
                                      <SelectItem value="5" className="text-white">5 digits</SelectItem>
                                      <SelectItem value="6" className="text-white">6 digits</SelectItem>
                                      <SelectItem value="7" className="text-white">7 digits</SelectItem>
                                      <SelectItem value="8" className="text-white">8 digits</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-vault-muted text-xs mb-1 block">Position</label>
                                  <Select
                                    value={courtModeConfig.bates_position}
                                    onValueChange={(v) => setCourtModeConfig(prev => ({ ...prev, bates_position: v }))}
                                  >
                                    <SelectTrigger className="bg-[#0B1221] border-vault-gold/30 text-white h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0B1221] border-vault-gold/30">
                                      <SelectItem value="bottom-right" className="text-white">Bottom Right</SelectItem>
                                      <SelectItem value="bottom-left" className="text-white">Bottom Left</SelectItem>
                                      <SelectItem value="bottom-center" className="text-white">Bottom Center</SelectItem>
                                      <SelectItem value="top-right" className="text-white">Top Right</SelectItem>
                                      <SelectItem value="top-left" className="text-white">Top Left</SelectItem>
                                      <SelectItem value="top-center" className="text-white">Top Center</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={courtModeConfig.bates_include_cover}
                                  onCheckedChange={(checked) => setCourtModeConfig(prev => ({ ...prev, bates_include_cover: checked }))}
                                  className="scale-75"
                                />
                                <span className="text-vault-muted text-xs">Include cover page</span>
                              </div>
                              {/* Preview */}
                              <div className="p-2 rounded bg-vault-gold/10 border border-vault-gold/20">
                                <span className="text-vault-muted text-xs">Preview: </span>
                                <span className="text-vault-gold font-mono text-sm">
                                  {courtModeConfig.bates_prefix || courtModeInfo?.bates?.default_prefix || 'DOC-'}
                                  {String(courtModeConfig.bates_start_number).padStart(courtModeConfig.bates_digits, '0')}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-vault-gold/10" />

                        {/* Redaction Section */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <EyeSlash className="w-4 h-4 text-vault-gold" />
                            <span className="text-white text-sm font-medium">Redaction Mode</span>
                          </div>
                          <Select
                            value={courtModeConfig.redaction_mode}
                            onValueChange={(v) => setCourtModeConfig(prev => ({ ...prev, redaction_mode: v }))}
                          >
                            <SelectTrigger className="bg-[#0B1221] border-vault-gold/30 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0B1221] border-vault-gold/30">
                              <SelectItem value="standard" className="text-white">
                                <div className="flex items-center gap-2">
                                  <LockOpen className="w-4 h-4" />
                                  <span>Standard (No redactions)</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="redacted" className="text-white">
                                <div className="flex items-center gap-2">
                                  <Lock className="w-4 h-4" />
                                  <span>Redacted (Apply all redactions)</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="privileged" className="text-white">
                                <div className="flex items-center gap-2">
                                  <ShieldCheck className="w-4 h-4" />
                                  <span>Privileged (Include privileged content)</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Redaction Summary */}
                          {redactionSummary && redactionSummary.total_redactions > 0 && (
                            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                              <div className="flex items-center gap-2">
                                <Info className="w-4 h-4 text-amber-400" />
                                <span className="text-amber-400 text-xs">
                                  {redactionSummary.total_redactions} redaction marker{redactionSummary.total_redactions !== 1 ? 's' : ''} on {redactionSummary.records_affected} record{redactionSummary.records_affected !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Compliance Gaps Panel */}
              <div className="mb-6">
                <button
                  onClick={() => {
                    setShowGapsPanel(!showGapsPanel);
                    if (!gapsAnalysis && !gapsLoading) {
                      fetchGapsAnalysis();
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-amber-400" />
                    <span className="text-white font-medium text-sm">Compliance Gaps</span>
                    {gapsAnalysis?.summary && (
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        gapsAnalysis.summary.high_risk > 0 
                          ? 'bg-red-500/30 text-red-300'
                          : gapsAnalysis.summary.missing > 0 || gapsAnalysis.summary.partial > 0
                            ? 'bg-amber-500/30 text-amber-300'
                            : 'bg-green-500/30 text-green-300'
                      }`}>
                        {gapsAnalysis.summary.high_risk > 0 
                          ? `${gapsAnalysis.summary.high_risk} High Risk`
                          : gapsAnalysis.summary.missing > 0 
                            ? `${gapsAnalysis.summary.missing} Missing`
                            : 'Compliant'}
                      </span>
                    )}
                  </div>
                  <CaretRight className={`w-4 h-4 text-vault-muted transition-transform ${showGapsPanel ? 'rotate-90' : ''}`} />
                </button>

                <AnimatePresence>
                  {showGapsPanel && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 p-4 rounded-lg bg-[#05080F] border border-vault-gold/10">
                        {gapsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <ArrowClockwise className="w-6 h-6 text-vault-gold animate-spin" />
                            <span className="ml-2 text-vault-muted">Analyzing compliance...</span>
                          </div>
                        ) : gapsAnalysis ? (
                          <div className="space-y-4">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-4 gap-2">
                              <div className="p-3 rounded bg-green-500/10 text-center">
                                <div className="text-2xl font-bold text-green-400">{gapsAnalysis.summary.complete}</div>
                                <div className="text-xs text-vault-muted">Complete</div>
                              </div>
                              <div className="p-3 rounded bg-amber-500/10 text-center">
                                <div className="text-2xl font-bold text-amber-400">{gapsAnalysis.summary.partial}</div>
                                <div className="text-xs text-vault-muted">Partial</div>
                              </div>
                              <div className="p-3 rounded bg-red-500/10 text-center">
                                <div className="text-2xl font-bold text-red-400">{gapsAnalysis.summary.missing}</div>
                                <div className="text-xs text-vault-muted">Missing</div>
                              </div>
                              <div className="p-3 rounded bg-gray-500/10 text-center">
                                <div className="text-2xl font-bold text-gray-400">{gapsAnalysis.summary.not_applicable}</div>
                                <div className="text-xs text-vault-muted">N/A</div>
                              </div>
                            </div>

                            {/* Risk Summary */}
                            <div className="p-2 rounded bg-vault-gold/5 border border-vault-gold/10">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-red-400">High Risk: {gapsAnalysis.summary.high_risk}</span>
                                <span className="text-amber-400">Medium: {gapsAnalysis.summary.medium_risk}</span>
                                <span className="text-green-400">Low: {gapsAnalysis.summary.low_risk}</span>
                              </div>
                            </div>

                            {/* High Risk Items */}
                            {gapsAnalysis.results && gapsAnalysis.results.filter(r => r.risk_level === 'high').length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium text-red-400 flex items-center gap-2">
                                  <Warning className="w-4 h-4" />
                                  High Risk Items
                                </h4>
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                  {gapsAnalysis.results
                                    .filter(r => r.risk_level === 'high')
                                    .slice(0, 5)
                                    .map((item, idx) => (
                                      <div key={idx} className="p-2 rounded bg-red-500/10 border border-red-500/20">
                                        <div className="flex items-center justify-between">
                                          <span className="text-white text-sm">{item.item_name}</span>
                                          <span className={`text-xs px-2 py-0.5 rounded ${
                                            item.status === 'missing' ? 'bg-red-500/30 text-red-300' : 'bg-amber-500/30 text-amber-300'
                                          }`}>
                                            {item.status}
                                          </span>
                                        </div>
                                        {item.remediation && (
                                          <p className="text-xs text-vault-muted mt-1">→ {item.remediation}</p>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* Refresh Button */}
                            <button
                              onClick={() => fetchGapsAnalysis()}
                              className="w-full py-2 text-xs text-vault-muted hover:text-white flex items-center justify-center gap-2"
                            >
                              <ArrowClockwise className="w-3 h-3" />
                              Refresh Analysis
                            </button>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-vault-muted text-sm">
                            Click to analyze compliance gaps
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={generating || !selectedProfile}
                className="w-full bg-vault-gold hover:bg-vault-gold/90 text-vault-dark font-semibold py-6 text-lg touch-manipulation select-none"
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
                </>
              )}

              {/* Evidence Binder Mode */}
              {binderMode === 'evidence' && (
                <>
                  {/* Dispute Selection */}
                  <div className="mb-6">
                    <label className="text-vault-muted text-sm mb-2 block">Select Dispute</label>
                    <Select
                      value={selectedDispute || ''}
                      onValueChange={(v) => {
                        setSelectedDispute(v);
                        setEvidencePreview(null);
                      }}
                    >
                      <SelectTrigger className="bg-[#05080F] border-vault-gold/30 text-white">
                        <SelectValue placeholder="Choose a dispute...">
                          {disputes.find(d => d.id === selectedDispute)?.title || 'Choose a dispute...'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                        {disputes.length === 0 ? (
                          <div className="p-4 text-center text-vault-muted text-sm">
                            No disputes found in this portfolio
                          </div>
                        ) : (
                          disputes.map((dispute) => (
                            <SelectItem
                              key={dispute.id}
                              value={dispute.id}
                              className="text-white hover:bg-vault-gold/20"
                            >
                              <div className="flex items-center gap-2">
                                <Gavel className="w-4 h-4 text-red-400" />
                                <span className="truncate">{dispute.title}</span>
                                <Badge className="text-xs bg-vault-gold/20 text-vault-gold ml-2">
                                  {dispute.status}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Evidence Configuration Panel */}
                  {selectedDispute && (
                    <div className="mb-6">
                      <button
                        onClick={() => setShowEvidencePanel(!showEvidencePanel)}
                        className="w-full flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <ListNumbers className="w-5 h-5 text-red-400" />
                          <span className="text-white font-medium text-sm">Evidence Configuration</span>
                        </div>
                        <CaretRight className={`w-4 h-4 text-vault-muted transition-transform ${showEvidencePanel ? 'rotate-90' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {showEvidencePanel && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 p-4 rounded-lg bg-[#05080F] border border-vault-gold/10 space-y-4">
                              {/* Exhibit Format */}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-vault-muted text-xs mb-1 block">Exhibit Format</label>
                                  <Select
                                    value={evidenceConfig.exhibit_format}
                                    onValueChange={(v) => setEvidenceConfig(prev => ({ ...prev, exhibit_format: v }))}
                                  >
                                    <SelectTrigger className="bg-[#0B1221] border-vault-gold/30 text-white h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0B1221] border-vault-gold/30">
                                      <SelectItem value="letters" className="text-white">Letters (A, B, C...)</SelectItem>
                                      <SelectItem value="numbers" className="text-white">Numbers (1, 2, 3...)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-vault-muted text-xs mb-1 block">Prefix (optional)</label>
                                  <Input
                                    value={evidenceConfig.exhibit_prefix}
                                    onChange={(e) => setEvidenceConfig(prev => ({ ...prev, exhibit_prefix: e.target.value.toUpperCase() }))}
                                    placeholder="e.g., PX-"
                                    className="bg-[#0B1221] border-vault-gold/30 text-white h-9 text-sm"
                                  />
                                </div>
                              </div>

                              {/* Categories */}
                              <div>
                                <label className="text-vault-muted text-xs mb-2 block">Categories to Include</label>
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    { key: 'documents', label: 'Documents', color: 'orange' },
                                    { key: 'communications', label: 'Communications', color: 'purple' },
                                    { key: 'financial', label: 'Financial', color: 'green' },
                                    { key: 'governance', label: 'Governance', color: 'blue' }
                                  ].map((cat) => {
                                    const isEnabled = evidenceConfig.categories_enabled.includes(cat.key);
                                    return (
                                      <button
                                        key={cat.key}
                                        onClick={() => {
                                          setEvidenceConfig(prev => ({
                                            ...prev,
                                            categories_enabled: isEnabled
                                              ? prev.categories_enabled.filter(c => c !== cat.key)
                                              : [...prev.categories_enabled, cat.key]
                                          }));
                                        }}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                          isEnabled
                                            ? `bg-${cat.color}-500/20 text-${cat.color}-400 border border-${cat.color}-500/30`
                                            : 'bg-vault-dark/50 text-vault-muted border border-vault-gold/10'
                                        }`}
                                      >
                                        {cat.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Options */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Timer className="w-4 h-4 text-vault-muted" />
                                    <span className="text-white text-sm">Include Timeline</span>
                                  </div>
                                  <Switch
                                    checked={evidenceConfig.include_timeline}
                                    onCheckedChange={(checked) => setEvidenceConfig(prev => ({ ...prev, include_timeline: checked }))}
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-vault-muted" />
                                    <span className="text-white text-sm">Linked Items Only</span>
                                  </div>
                                  <Switch
                                    checked={evidenceConfig.include_linked_only}
                                    onCheckedChange={(checked) => setEvidenceConfig(prev => ({ ...prev, include_linked_only: checked }))}
                                  />
                                </div>
                              </div>

                              {/* Preview Button */}
                              <button
                                onClick={fetchEvidencePreview}
                                disabled={evidenceLoading}
                                className="w-full py-2 text-sm text-vault-muted hover:text-white flex items-center justify-center gap-2 rounded-md border border-vault-gold/20 hover:border-vault-gold/40"
                              >
                                {evidenceLoading ? (
                                  <ArrowClockwise className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                                Preview Evidence Items
                              </button>

                              {/* Preview Results */}
                              {evidencePreview && (
                                <div className="p-3 rounded bg-vault-gold/5 border border-vault-gold/10">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-vault-gold text-sm font-medium">
                                      {evidencePreview.total_items} Items Found
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-xs">
                                    {Object.entries(evidencePreview.by_category || {}).map(([cat, count]) => (
                                      <span key={cat} className="px-2 py-0.5 rounded bg-vault-dark/50 text-vault-muted">
                                        {cat}: {count}
                                      </span>
                                    ))}
                                  </div>
                                  {evidencePreview.exhibits_preview?.length > 0 && (
                                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                      {evidencePreview.exhibits_preview.map((ex, idx) => (
                                        <div key={idx} className="text-xs text-vault-muted flex items-center gap-2">
                                          <span className="text-red-400 font-medium">{ex.exhibit_label}</span>
                                          <span className="truncate">{ex.title}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Generate Evidence Button */}
                  <Button
                    onClick={handleGenerateEvidence}
                    disabled={generating || !selectedDispute}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-6 text-lg touch-manipulation select-none"
                  >
                    {generating ? (
                      <>
                        <ArrowClockwise className="w-5 h-5 mr-2 animate-spin" />
                        Generating Evidence Binder...
                      </>
                    ) : (
                      <>
                        <Gavel className="w-5 h-5 mr-2" />
                        Generate Evidence Binder (PDF)
                      </>
                    )}
                  </Button>

                  {selectedDispute && (
                    <p className="text-center text-vault-muted text-xs mt-3">
                      Dispute: <span className="text-red-400">{disputes.find(d => d.id === selectedDispute)?.title}</span>
                    </p>
                  )}

                  {/* Recent Evidence Binders */}
                  {evidenceRuns.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-vault-gold/10">
                      <h3 className="text-sm font-medium text-vault-muted mb-3">Recent Evidence Binders</h3>
                      <div className="space-y-2">
                        {evidenceRuns.slice(0, 3).map((run) => {
                          const StatusIcon = STATUS_CONFIG[run.status]?.icon || Clock;
                          return (
                            <div key={run.id} className="p-3 rounded-lg bg-vault-dark/50 border border-vault-gold/10">
                              <div className="flex items-center justify-between">
                                <span className="text-white text-sm truncate">{run.profile_name}</span>
                                <Badge className={`text-xs ${STATUS_CONFIG[run.status]?.color} border`}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {STATUS_CONFIG[run.status]?.label}
                                </Badge>
                              </div>
                              <p className="text-vault-muted text-xs mt-1">
                                {new Date(run.started_at).toLocaleString()}
                              </p>
                              {run.status === 'complete' && (
                                <div className="flex gap-2 mt-2">
                                  <a
                                    href={`${API_URL}/api/evidence-binder/runs/${run.id}/view`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-vault-muted hover:text-white flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3" /> View
                                  </a>
                                  <a
                                    href={`${API_URL}/api/evidence-binder/runs/${run.id}/download`}
                                    download
                                    className="text-xs text-vault-muted hover:text-white flex items-center gap-1"
                                  >
                                    <Download className="w-3 h-3" /> Download
                                  </a>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>

            {/* Latest Binder Card */}
            {latestRun && binderMode === 'portfolio' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative bg-[#0B1221]/80 rounded-xl border border-vault-gold/20 p-6 mb-16"
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

                {/* ===== SANDBOX-SAFE PDF VIEWER: Fetch PDF as Blob + In-App Modal ===== */}
                {latestRun.status === 'complete' && <LatestBinderActions latestRun={latestRun} handleViewManifest={handleViewManifest} />}

                <div className="bg-vault-dark/50 rounded-lg p-4">
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

                {latestRun.status === 'failed' && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg mt-4">
                    <p className="text-red-400 text-sm">
                      {latestRun.error_json?.user_message || latestRun.error_json?.message || 'Generation failed'}
                    </p>
                  </div>
                )}

                {latestRun.status === 'generating' && (
                  <div className="flex items-center justify-center p-3 text-vault-muted text-sm mt-4">
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

              {/* Clear Failed Button - shows when there are failed runs */}
              {runs.filter(r => r.status === 'failed').length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClearFailed}
                  className="w-full mb-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
                >
                  <Trash className="w-3 h-3 mr-1" />
                  Clear {runs.filter(r => r.status === 'failed').length} Failed
                </Button>
              )}

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
          <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-[320px]">
            <DialogHeader>
              <DialogTitle className="text-lg font-heading text-red-400 flex items-center gap-2">
                <Trash className="w-5 h-5" />
                Delete Binder?
              </DialogTitle>
              <DialogDescription className="text-vault-muted text-sm">
                Are you sure you want to delete this binder from history? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-row gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setDeleteConfirmRun(null)} className="border-vault-gold/30 text-white flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button 
                onClick={() => deleteConfirmRun && handleDeleteRun(deleteConfirmRun.id)} 
                className="bg-red-500 hover:bg-red-600 text-white flex-1 sm:flex-none"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Config Modal */}
        <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
          <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-[380px]">
            <DialogHeader>
              <DialogTitle className="text-lg font-heading text-vault-gold flex items-center gap-2">
                <Gear className="w-5 h-5" />
                Configure Profile
              </DialogTitle>
              <DialogDescription className="text-vault-muted text-sm">
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

            <DialogFooter className="flex flex-row gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowConfigModal(false)} className="border-vault-gold/30 text-white flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button onClick={handleSaveConfig} className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark flex-1 sm:flex-none">
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manifest Modal */}
        <Dialog open={showManifestModal} onOpenChange={setShowManifestModal}>
          <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-[600px] max-h-[80vh] overflow-hidden">
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
          <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-[380px]">
            <DialogHeader>
              <DialogTitle className="text-lg font-heading text-vault-gold flex items-center gap-2">
                <CalendarBlank className="w-5 h-5" />
                {editingSchedule ? 'Edit Schedule' : 'New Schedule'}
              </DialogTitle>
              <DialogDescription className="text-vault-muted text-sm">
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

            <DialogFooter className="flex flex-row gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowScheduleModal(false);
                  setEditingSchedule(null);
                  resetScheduleForm();
                }}
                className="border-vault-gold/30 text-white flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                onClick={editingSchedule ? handleUpdateSchedule : handleCreateSchedule}
                className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark flex-1 sm:flex-none"
              >
                {editingSchedule ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
