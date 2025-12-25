import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import axios from 'axios';
import {
  ArrowRight,
  ArrowUp,
  ArrowDown,
  BookOpen,
  CaretRight,
  Certificate,
  CheckCircle,
  Coins,
  Command,
  CurrencyDollar,
  FileText,
  Gavel,
  Gear,
  Handshake,
  Key,
  Lightning,
  Lock,
  MagnifyingGlass,
  Notebook,
  Pulse,
  Scales,
  Scroll,
  ShieldCheck,
  SignIn,
  Sparkle,
  Stamp,
  Timer,
  UserCheck,
  Users,
  Vault,
  Eye,
  ClockCounterClockwise,
  Warning,
  X
} from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

// Demo Data (fallback)
const DEMO_SIGNALS = [
  { id: 1, type: 'meeting', message: 'Meeting Finalized', detail: 'RM-ID RF743916765US-20.001', time: '2m ago', icon: Notebook },
  { id: 2, type: 'distribution', message: 'Distribution Logged', detail: 'Beneficiary shares updated', time: '5m ago', icon: CurrencyDollar },
  { id: 3, type: 'dispute', message: 'Dispute Opened', detail: 'Evidence attached to case', time: '12m ago', icon: Gavel },
  { id: 4, type: 'insurance', message: 'Premium Due Alert', detail: 'Policy renewal in 30 days', time: '1h ago', icon: ShieldCheck },
  { id: 5, type: 'compensation', message: 'Compensation Approved', detail: 'Q4 trustee payment logged', time: '2h ago', icon: Users },
];

// Governance Matrix Modules
const MATRIX_MODULES = [
  { 
    id: 'meetings', 
    title: 'Minutes Ledger', 
    desc: 'Attest meetings, resolutions, and votes with tamper-evident history.',
    chip: 'Immutable',
    chipColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: Notebook
  },
  { 
    id: 'distributions', 
    title: 'Distributions', 
    desc: 'Visualize shares, allocations, and what-if scenarios in real time.',
    chip: 'Transparent',
    chipColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: CurrencyDollar
  },
  { 
    id: 'disputes', 
    title: 'Disputes', 
    desc: 'Track conflicts, evidence, and outcomes with role-based visibility.',
    chip: 'Controlled',
    chipColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: Gavel
  },
  { 
    id: 'insurance', 
    title: 'Policies', 
    desc: 'Model life insurance, beneficiaries, premiums, and proceeds flow.',
    chip: 'Automated',
    chipColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: ShieldCheck
  },
  { 
    id: 'compensation', 
    title: 'Compensation', 
    desc: 'Log trustee time, approvals, and reasonableness with audit trails.',
    chip: 'Documented',
    chipColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    icon: Users
  },
];

const SCENARIOS = [
  { id: 1, title: 'Sibling Dispute', desc: 'When beneficiaries disagree on asset distribution', icon: Gavel },
  { id: 2, title: 'Trustee Compensation', desc: 'Setting fair compensation with documentation', icon: Users },
  { id: 3, title: 'Insurance Proceeds', desc: 'Managing life insurance payouts to the trust', icon: ShieldCheck },
  { id: 4, title: 'Late Distributions', desc: 'Handling delayed beneficiary payments', icon: Timer },
];

const TEMPLATES = [
  { id: 1, title: 'Declaration of Trust', desc: 'Establishes exclusive equity trust structure', icon: Scroll },
  { id: 2, title: 'Trust Transfer Grant Deed', desc: 'Conveys property into trust', icon: FileText },
  { id: 3, title: 'Acknowledgement Receipt', desc: 'Formal receipt for transactions', icon: Handshake },
  { id: 4, title: 'Certificate of Trust', desc: 'Foreign grantor trust certificate', icon: Certificate },
  { id: 5, title: 'Affidavit of Fact', desc: 'Sworn statement under oath', icon: Stamp },
  { id: 6, title: 'Trustee Acceptance', desc: 'Notice of trustee acceptance', icon: UserCheck },
];

const MAXIMS = [
  { id: 1, front: 'Equity Regards...', back: '...done as what ought to be done', category: 'Principle' },
  { id: 2, front: 'He Who Seeks Equity...', back: '...must do equity', category: 'Maxim' },
  { id: 3, front: 'Delay Defeats...', back: '...equitable relief', category: 'Doctrine' },
];

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

// Scanline overlay component
const Scanline = () => (
  <div 
    className="absolute inset-0 pointer-events-none z-10 opacity-[0.03]"
    style={{
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)'
    }}
  />
);

// Holographic Card component
const HoloCard = ({ children, className = '', hover = true, onClick }) => (
  <motion.div
    whileHover={hover ? { scale: 1.02, borderColor: 'rgba(198, 168, 124, 0.5)' } : {}}
    className={`relative bg-[#0B1221]/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden transition-colors duration-500 ${className}`}
    onClick={onClick}
  >
    <Scanline />
    <div className="relative z-20">{children}</div>
  </motion.div>
);

// Icon Chip component
const IconChip = ({ icon: Icon, label, variant = 'default' }) => {
  const variants = {
    default: 'bg-white/5 border-white/10 text-slate-300',
    gold: 'bg-[#C6A87C]/10 border-[#C6A87C]/30 text-[#C6A87C]',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    green: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  };
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-mono uppercase tracking-wider ${variants[variant]}`}>
      {Icon && <Icon className="w-3.5 h-3.5" weight="duotone" />}
      {label}
    </span>
  );
};

// Signal Feed component
const SignalFeed = ({ signals }) => (
  <div className="space-y-2 font-mono text-sm">
    <AnimatePresence mode="popLayout">
      {signals.map((signal, idx) => {
        const Icon = signal.icon;
        const colors = {
          meeting: 'text-blue-400',
          distribution: 'text-emerald-400',
          dispute: 'text-amber-400',
          insurance: 'text-purple-400',
          compensation: 'text-cyan-400',
        };
        
        return (
          <motion.div
            key={signal.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center gap-3 p-3 bg-black/30 backdrop-blur-sm rounded-lg border border-white/5 hover:border-[#C6A87C]/30 transition-colors cursor-pointer group"
          >
            <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${colors[signal.type]}`}>
              <Icon className="w-4 h-4" weight="duotone" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white/90">{signal.message}</span>
                <span className="text-[10px] text-slate-500">{signal.time}</span>
              </div>
              <p className="text-xs text-slate-500 truncate">{signal.detail}</p>
            </div>
            <CaretRight className="w-4 h-4 text-slate-600 group-hover:text-[#C6A87C] transition-colors" />
          </motion.div>
        );
      })}
    </AnimatePresence>
  </div>
);

// Trust Health Card - LIVE VERSION
const TrustHealthCard = () => {
  const navigate = useNavigate();
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetchHealthSummary();
  }, []);

  const fetchHealthSummary = async () => {
    try {
      const res = await axios.get(`${API}/health/summary`);
      if (res.data.ok) {
        setHealthData(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch health summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await axios.post(`${API}/health/scan`);
      if (res.data.ok) {
        setHealthData({
          score: res.data.data.overall_score,
          trend: null,
          next_actions: res.data.data.next_actions?.slice(0, 3) || [],
          history: [],
          scanned_at: res.data.data.scanned_at,
          findings_count: res.data.data.findings_count
        });
      }
    } catch (error) {
      console.error('Failed to run scan:', error);
    } finally {
      setScanning(false);
    }
  };

  const score = healthData?.score ?? 0;
  const trend = healthData?.trend ?? 0;
  const nextActions = healthData?.next_actions || [];
  const history = healthData?.history || [];
  const needsScan = healthData?.needs_scan;
  const findingsCount = healthData?.findings_count || {};

  // Calculate health status color
  const getScoreColor = (s) => {
    if (s >= 80) return 'text-emerald-400';
    if (s >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreLabel = (s) => {
    if (s >= 90) return 'Excellent';
    if (s >= 80) return 'Good';
    if (s >= 60) return 'Fair';
    if (s >= 40) return 'Needs Attention';
    return 'Critical';
  };

  // Build trend bars from history
  const trendBars = history.length > 0 
    ? history.map(h => h.score || 0)
    : [65, 70, 68, 75, 80, 85, score]; // Fallback trend
  
  return (
    <HoloCard className="p-4 sm:p-6">
      <div className="flex items-start justify-between gap-2 mb-4 sm:mb-6">
        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-1">Trust Health</h3>
          <p className="text-xs sm:text-sm text-slate-400">
            {loading ? 'Loading...' : getScoreLabel(score)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {findingsCount.critical > 0 && (
            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
              {findingsCount.critical} critical
            </span>
          )}
          <IconChip icon={Pulse} label="Live" variant="green" />
        </div>
      </div>
      
      {/* Score */}
      {loading ? (
        <div className="flex items-end gap-3 sm:gap-4 mb-4 sm:mb-6 animate-pulse">
          <div className="h-12 w-16 bg-white/10 rounded"></div>
        </div>
      ) : needsScan ? (
        <div className="text-center py-4 mb-4">
          <p className="text-slate-400 text-sm mb-3">No health data yet</p>
          <Button 
            onClick={runScan}
            disabled={scanning}
            size="sm"
            className="bg-[#C6A87C] text-vault-dark hover:bg-[#C6A87C]/90"
          >
            {scanning ? 'Scanning...' : 'Run First Scan'}
          </Button>
        </div>
      ) : (
        <div className="flex items-end gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className={`text-4xl sm:text-5xl font-bold ${getScoreColor(score)}`}>
            {Math.round(score)}
          </div>
          <div className="pb-1 sm:pb-2 flex items-center gap-1">
            {trend !== null && trend !== 0 && (
              <>
                {trend > 0 ? (
                  <ArrowUp className="w-4 h-4 text-emerald-400" weight="bold" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-red-400" weight="bold" />
                )}
                <span className={`text-xs sm:text-sm ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {trend > 0 ? '+' : ''}{trend}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-500 ml-1">this week</span>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Mini trend */}
      {!loading && !needsScan && (
        <div className="h-10 sm:h-12 mb-4 sm:mb-6 flex items-end gap-1">
          {trendBars.map((val, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(val, 10)}%` }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className={`flex-1 rounded-t ${
                i === trendBars.length - 1 
                  ? 'bg-[#C6A87C]' 
                  : 'bg-[#C6A87C]/20'
              }`}
            />
          ))}
        </div>
      )}
      
      {/* Next Actions */}
      {!loading && nextActions.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">Next Actions</p>
          {nextActions.map((action, i) => (
            <div key={i} className="flex items-center gap-2 text-xs sm:text-sm">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                action.priority === 'high' ? 'bg-red-400' :
                action.priority === 'medium' ? 'bg-amber-400' : 'bg-slate-400'
              }`} />
              <span className="text-slate-300 truncate flex-1">{action.title}</span>
              <span className="text-[#C6A87C] text-xs">+{action.impact_points}</span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state for actions */}
      {!loading && !needsScan && nextActions.length === 0 && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <CheckCircle className="w-4 h-4" weight="fill" />
            <span>All clear! No actions needed.</span>
          </div>
        </div>
      )}
      
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/health')}
          className="flex-1 border-[#C6A87C]/30 text-[#C6A87C] hover:bg-[#C6A87C]/10 text-xs sm:text-sm"
        >
          Dashboard
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/diagnostics')}
          className="border-white/10 text-slate-400 hover:bg-white/5 text-xs sm:text-sm"
        >
          Details
        </Button>
      </div>
    </HoloCard>
  );
};

// Governance Matrix Section (replaces Trust Radar)
const GovernanceMatrixSection = () => {
  const navigate = useNavigate();
  
  return (
    <section id="matrix" className="py-10 lg:py-24 bg-[#0B1221]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
        >
          {/* Header - Centered on mobile */}
          <motion.div variants={fadeInUp} className="mb-10 text-center lg:text-left">
            <div className="flex justify-center lg:justify-start">
              <IconChip icon={Gear} label="Governance Matrix" variant="gold" />
            </div>
            <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-white">
              The console for trust operations.
            </h2>
            <p className="mt-3 text-slate-400 max-w-2xl mx-auto lg:mx-0">
              Minutes, distributions, disputes, policies, compensation—linked to a living ledger.
            </p>
          </motion.div>
          
          {/* Module Grid */}
          <motion.div 
            variants={fadeInUp}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {MATRIX_MODULES.map((module) => {
              const Icon = module.icon;
              return (
                <HoloCard 
                  key={module.id} 
                  className="p-5 cursor-pointer text-center sm:text-left"
                  onClick={() => navigate(`/vault/governance?tab=${module.id}`)}
                >
                  <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between mb-3 gap-2">
                    <div className="w-10 h-10 rounded-xl bg-[#C6A87C]/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#C6A87C]" weight="duotone" />
                    </div>
                    <Badge className={`text-[10px] border ${module.chipColor}`}>
                      {module.chip}
                    </Badge>
                  </div>
                  <h3 className="text-white font-semibold mb-2">{module.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{module.desc}</p>
                </HoloCard>
              );
            })}
          </motion.div>
          
          {/* CTA Row - Centered on mobile */}
          <motion.div variants={fadeInUp} className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-4">
            <Link to="/vault/governance">
              <Button className="bg-[#C6A87C] hover:bg-[#C6A87C]/90 text-[#05080F] font-semibold">
                Open Governance Console
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/ledger" className="text-sm text-[#C6A87C] hover:text-[#C6A87C]/80 flex items-center gap-1">
              View a sample ledger <CaretRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// Main Homepage Component
export default function CyberHomePage() {
  const navigate = useNavigate();
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [liveSignals, setLiveSignals] = useState([]);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const featuresRef = useRef(null);
  const isInView = useInView(featuresRef, { once: true, margin: '-100px' });
  
  // Handle scroll to show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Map activity types to icons
  const typeIcons = {
    meeting: Notebook,
    distribution: CurrencyDollar,
    dispute: Gavel,
    insurance: ShieldCheck,
    compensation: Users,
  };
  
  // Fetch live activity feed from V2 governance records
  const fetchLiveSignals = async () => {
    setSignalsLoading(true);
    try {
      // Use V2 records endpoint to get recent governance activity
      const res = await axios.get(`${API}/governance/v2/records`, {
        params: { limit: 8 }
      });
      const data = res.data;
      if (data.ok && data.data?.items && data.data.items.length > 0) {
        // Transform records to signal format with icons
        const moduleTypeIcons = {
          minutes: Notebook,
          distribution: Coins,
          dispute: Scales,
          insurance: ShieldCheck,
          compensation: CurrencyDollar
        };
        const signals = data.data.items.map((item, idx) => ({
          id: item.id || idx,
          type: item.module_type || 'governance',
          message: `${item.module_type?.charAt(0).toUpperCase() + item.module_type?.slice(1) || 'Record'}: ${item.title}`,
          detail: item.rm_id || '',
          time: item.created_at ? new Date(item.created_at).toLocaleString() : '',
          icon: moduleTypeIcons[item.module_type] || Notebook
        }));
        setLiveSignals(signals);
        setDemoMode(false);
      } else {
        // No data, stay in demo mode
        setDemoMode(true);
      }
    } catch (error) {
      console.log('Activity feed requires auth, using demo data');
      setDemoMode(true);
    } finally {
      setSignalsLoading(false);
    }
  };
  
  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Try to fetch live signals on mount
  useEffect(() => {
    fetchLiveSignals();
  }, []);
  
  return (
    <div className="min-h-screen bg-[#05080F] text-white overflow-x-hidden">
      {/* Scanline overlay */}
      <div 
        className="fixed inset-0 pointer-events-none z-50 opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)'
        }}
      />
      
      {/* ===== TOP NAV ===== */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#05080F]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Vault className="w-7 h-7 text-[#C6A87C]" weight="duotone" />
              <span className="text-lg font-semibold text-white">OMNIGOVAULT</span>
            </div>
            
            {/* Nav Links - Hidden on mobile */}
            <div className="hidden lg:flex items-center gap-6 text-sm">
              {['Learn', 'Tools', 'Templates', 'Governance', 'Scenarios', 'Pricing'].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} className="text-slate-400 hover:text-white transition-colors">
                  {item}
                </a>
              ))}
            </div>
            
            {/* Right side */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Command palette hint */}
              <button
                onClick={() => setShowCommandPalette(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-400 hover:border-[#C6A87C]/30 transition-colors"
              >
                <MagnifyingGlass className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Search</span>
                <kbd className="ml-2 px-1.5 py-0.5 bg-white/5 rounded text-[10px]">⌘K</kbd>
              </button>
              
              {/* Exclusive Equity & Trust - Links to Dashboard */}
              <Link to="/vault" className="flex items-center gap-1.5 px-2 py-1 bg-[#C6A87C]/10 border border-[#C6A87C]/30 rounded-lg hover:bg-[#C6A87C]/20 transition-colors">
                <Key className="w-3.5 h-3.5 text-[#C6A87C]" weight="fill" />
                <span className="text-xs font-medium text-[#C6A87C]">Exclusive Equity & Trust</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>
      
      {/* ===== HERO SECTION ===== */}
      <section className="relative flex items-start pt-20 pb-8 sm:min-h-[100dvh] sm:items-center sm:pt-16 sm:pb-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1221] via-transparent to-[#05080F]" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-4 lg:py-16">
          <div className="max-w-3xl mx-auto lg:mx-0">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="text-center lg:text-left"
            >
              <motion.h2
                variants={fadeInUp}
                className="text-xl sm:text-2xl lg:text-3xl text-slate-300 font-light"
              >
                A matrix system for trust governance.
              </motion.h2>
              
              <motion.p 
                variants={fadeInUp}
                className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed italic text-center lg:text-left"
              >
                "In whom also we have obtained an inheritance, being predestinated according to the purpose of him who worketh all things after the counsel of his own will."&nbsp;&nbsp;<span className="text-sm text-white/30 not-italic">— Ephesians 1:11</span>
              </motion.p>
              
              <motion.div variants={fadeInUp} className="mt-4 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link to="/login">
                  <Button size="lg" className="w-full sm:w-auto bg-[#C6A87C] hover:bg-[#C6A87C]/90 text-[#05080F] font-semibold">
                    Enter the Vault
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/20 text-white hover:bg-white/5">
                    Open Governance Console
                  </Button>
                </Link>
              </motion.div>
              
              {/* Microcopy */}
              <motion.p variants={fadeInUp} className="mt-3 text-xs text-slate-500 flex items-center gap-2 justify-center lg:justify-start">
                <ClockCounterClockwise className="w-3.5 h-3.5" />
                Draft → Finalize → Amend (with traceable history).
              </motion.p>
              
              {/* Stats */}
              <motion.div variants={fadeInUp} className="mt-8 flex flex-wrap gap-6 sm:gap-8 justify-center lg:justify-start">
                {[
                  { value: '500+', label: 'Trusts Managed' },
                  { value: '10k+', label: 'Documents Filed' },
                  { value: '99.9%', label: 'Uptime' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center lg:text-left">
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-sm text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
        
        {/* Scroll indicator - Enhanced cyber mouse */}
        <motion.div 
          className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden sm:block"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="relative w-7 h-12 rounded-full border-2 border-[#C6A87C]/40 flex justify-center pt-2 bg-[#0B1221]/50 backdrop-blur-sm shadow-[0_0_15px_rgba(198,168,124,0.15)]">
            {/* Inner glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[#C6A87C]/10 to-transparent" />
            {/* Scroll dot */}
            <motion.div 
              className="w-1.5 h-3 bg-gradient-to-b from-[#C6A87C] to-[#C6A87C]/50 rounded-full"
              animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </section>
      
      {/* ===== GOVERNANCE MATRIX SECTION (replaces Trust Radar) ===== */}
      <GovernanceMatrixSection />
      
      {/* ===== SIGNAL FEED SECTION ===== */}
      <section id="signals" className="py-10 lg:py-24 bg-gradient-to-b from-[#0B1221] to-[#05080F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-12">
            {/* Signal Feed */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp} className="mb-4 text-center lg:text-left">
                {/* Mode Toggle Row - Centered on mobile */}
                <div className="flex items-center justify-center lg:justify-start gap-2 mb-3">
                  {!demoMode && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-slate-400 hover:text-white p-2"
                      onClick={fetchLiveSignals}
                      disabled={signalsLoading}
                    >
                      <ClockCounterClockwise className={`w-4 h-4 ${signalsLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                  <IconChip icon={Pulse} label={demoMode ? "Demo Mode" : "Live Feed"} variant={demoMode ? "default" : "green"} />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`border-white/10 text-xs sm:text-sm whitespace-nowrap ${demoMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}
                    onClick={() => {
                      if (demoMode && liveSignals.length > 0) {
                        setDemoMode(false);
                      } else {
                        setDemoMode(true);
                      }
                    }}
                  >
                    {demoMode ? 'Demo' : 'Live'}
                  </Button>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Signal Console</h2>
                <p className="text-sm sm:text-base text-slate-400">Real-time governance activity</p>
              </motion.div>
              
              <motion.div variants={fadeInUp}>
                <HoloCard className="p-3 sm:p-4">
                  {signalsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-8 h-8 border-2 border-[#C6A87C] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <SignalFeed signals={demoMode ? DEMO_SIGNALS : (liveSignals.length > 0 ? liveSignals : DEMO_SIGNALS)} />
                  )}
                </HoloCard>
              </motion.div>
            </motion.div>
            
            {/* Trust Health */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={fadeInUp}
            >
              <TrustHealthCard />
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* ===== SCENARIOS SECTION ===== */}
      <section id="scenarios" className="py-10 lg:py-24 bg-[#05080F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center mb-8">
              <IconChip icon={BookOpen} label="Case Studies" variant="gold" />
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-white">Real-World Scenarios</h2>
              <p className="mt-2 text-slate-400">See how OMNIGOVAULT solves common governance challenges</p>
            </motion.div>
            
            <motion.div variants={fadeInUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SCENARIOS.map((scenario) => {
                const Icon = scenario.icon;
                return (
                  <HoloCard key={scenario.id} className="p-5 cursor-pointer text-center">
                    <div className="flex justify-center">
                      <Icon className="w-8 h-8 text-[#C6A87C] mb-3" weight="duotone" />
                    </div>
                    <h3 className="text-white font-semibold mb-2">{scenario.title}</h3>
                    <p className="text-sm text-slate-400">{scenario.desc}</p>
                  </HoloCard>
                );
              })}
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* ===== LEARN SECTION ===== */}
      <section id="learn" className="py-10 lg:py-24 bg-gradient-to-b from-[#05080F] to-[#0B1221]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="flex flex-col items-center lg:items-start lg:flex-row lg:justify-between gap-4 mb-8 text-center lg:text-left">
              <div>
                <div className="flex justify-center lg:justify-start">
                  <IconChip icon={Sparkle} label="Education" variant="gold" />
                </div>
                <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-white">Maxims Explorer</h2>
                <p className="mt-2 text-slate-400">Master the foundational principles of equity law</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                  <Lightning className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400">3-day streak</span>
                </div>
                <Link to="/learn">
                  <Button className="bg-[#C6A87C] hover:bg-[#C6A87C]/90 text-[#05080F]">
                    Start Learning
                  </Button>
                </Link>
              </div>
            </motion.div>
            
            <motion.div variants={fadeInUp} className="grid sm:grid-cols-3 gap-4">
              {MAXIMS.map((maxim) => (
                <HoloCard key={maxim.id} className="p-6 cursor-pointer group text-center" hover>
                  <div className="flex justify-center">
                    <IconChip label={maxim.category} variant="default" />
                  </div>
                  <div className="mt-4 h-24 flex items-center justify-center">
                    <p className="text-xl font-semibold text-white group-hover:text-[#C6A87C] transition-colors">
                      {maxim.front}
                    </p>
                  </div>
                  <p className="text-sm text-slate-500 group-hover:text-slate-300 transition-colors">
                    {maxim.back}
                  </p>
                </HoloCard>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* ===== TEMPLATE VAULT SECTION ===== */}
      <section id="templates" className="py-10 lg:py-24 bg-[#0B1221]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center mb-8">
              <IconChip icon={FileText} label="Templates" variant="gold" />
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-white">Template Studio</h2>
              <p className="mt-2 text-slate-400">Professional trust document templates ready for customization</p>
            </motion.div>
            
            <motion.div variants={fadeInUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TEMPLATES.map((template) => {
                const Icon = template.icon;
                return (
                  <HoloCard key={template.id} className="p-5 cursor-pointer text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#C6A87C]/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#C6A87C]" weight="duotone" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{template.title}</h3>
                        <p className="text-sm text-slate-400 mt-1">{template.desc}</p>
                      </div>
                    </div>
                  </HoloCard>
                );
              })}
            </motion.div>
            
            <motion.div variants={fadeInUp} className="mt-6 text-center">
              <Link to="/templates">
                <Button variant="outline" className="border-[#C6A87C]/30 text-[#C6A87C] hover:bg-[#C6A87C]/10">
                  Browse All Templates <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* ===== FINAL CTA ===== */}
      <section className="py-10 lg:py-24 bg-gradient-to-b from-[#0B1221] to-[#05080F]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <Vault className="w-14 h-14 text-[#C6A87C] mx-auto mb-4" weight="duotone" />
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
              Ready to Transform Your Trust Governance?
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-base sm:text-lg text-slate-400 mb-6">
              Start with our demo or create your secure vault today.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row justify-center gap-3">
              <Link to="/login">
                <Button size="lg" className="w-full sm:w-auto bg-[#C6A87C] hover:bg-[#C6A87C]/90 text-[#05080F] font-semibold">
                  Enter the Vault
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/20 text-white hover:bg-white/5">
                  Open Governance Console
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Sleek Scroll-to-Top Indicator */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40"
          >
            <button
              onClick={scrollToTop}
              className="group flex flex-col items-center gap-1 px-6 py-3"
              aria-label="Scroll to top"
            >
              <div className="w-12 h-1.5 rounded-full bg-white/40 group-hover:bg-[#C6A87C] transition-all duration-300 group-hover:w-16 shadow-sm" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* ===== FOOTER ===== */}
      <footer className="py-8 bg-[#05080F] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-500">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Security</a>
              <a href="#" className="hover:text-white transition-colors">Changelog</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/5">
            <p className="text-xs text-slate-600 text-center">
              For informational purposes only and does not constitute legal advice. 
              Consult a qualified attorney for legal matters.
            </p>
          </div>
        </div>
      </footer>
      
      {/* Command Palette Modal */}
      <AnimatePresence>
        {showCommandPalette && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCommandPalette(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="w-full max-w-lg mx-4 bg-[#0B1221] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <MagnifyingGlass className="w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search modules, templates, scenarios..."
                  className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-slate-500"
                  autoFocus
                />
                <kbd className="px-2 py-1 bg-white/5 rounded text-xs text-slate-500">ESC</kbd>
              </div>
              <div className="p-2 max-h-80 overflow-y-auto">
                {MATRIX_MODULES.map((module) => {
                  const Icon = module.icon;
                  return (
                    <button
                      key={module.id}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                      onClick={() => {
                        navigate(`/vault/governance?tab=${module.id}`);
                        setShowCommandPalette(false);
                      }}
                    >
                      <Icon className="w-5 h-5 text-[#C6A87C]" weight="duotone" />
                      <span className="text-white">{module.title}</span>
                      <span className="text-xs text-slate-500 ml-auto">Module</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
