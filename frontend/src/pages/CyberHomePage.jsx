import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView, useScroll, useTransform } from 'framer-motion';
import axios from 'axios';
import {
  ArrowRight,
  ArrowUp,
  ArrowDown,
  BookOpen,
  CaretRight,
  Certificate,
  CheckCircle,
  ClockCountdown,
  Coins,
  Command,
  CurrencyDollar,
  FileText,
  Gavel,
  Gear,
  Handshake,
  HandCoins,
  Heartbeat,
  Key,
  Lightning,
  Lock,
  LockOpen,
  MagnifyingGlass,
  Notebook,
  Pulse,
  Scales,
  Scroll,
  ShieldPlus,
  SignIn,
  Sparkle,
  Stamp,
  Timer,
  UserCheck,
  UserCircleGear,
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
  { id: 4, type: 'insurance', message: 'Premium Due Alert', detail: 'Policy renewal in 30 days', time: '1h ago', icon: ShieldPlus },
  { id: 5, type: 'compensation', message: 'Compensation Approved', detail: 'Q4 trustee payment logged', time: '2h ago', icon: UserCircleGear },
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
    icon: HandCoins
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
    icon: ShieldPlus
  },
  { 
    id: 'compensation', 
    title: 'Compensation', 
    desc: 'Log trustee time, approvals, and reasonableness with audit trails.',
    chip: 'Documented',
    chipColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    icon: UserCircleGear
  },
];

const SCENARIOS = [
  { id: 1, title: 'Sibling Dispute', desc: 'When beneficiaries disagree on asset distribution', icon: Gavel },
  { id: 2, title: 'Trustee Compensation', desc: 'Setting fair compensation with documentation', icon: UserCircleGear },
  { id: 3, title: 'Insurance Proceeds', desc: 'Managing life insurance payouts to the trust', icon: ShieldPlus },
  { id: 4, title: 'Late Distributions', desc: 'Handling delayed beneficiary payments', icon: ClockCountdown },
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

// Animation variants - Enhanced with more dynamic effects
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const fadeInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } }
};

const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.03, y: -5, transition: { duration: 0.3, ease: 'easeOut' } }
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

// Holographic Card component - clean, no animations
const HoloCard = ({ children, className = '', hover = true, onClick, delay = 0 }) => (
  <div
    className={`relative bg-[#0B1221]/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-[#C6A87C]/40 hover:shadow-[0_0_30px_rgba(198,168,124,0.1)] ${className}`}
    onClick={onClick}
  >
    <Scanline />
    <div className="relative z-20">{children}</div>
  </div>
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

// Governance Matrix Section with enhanced animations
const GovernanceMatrixSection = () => {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-50px' });
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Handle navigation with vault transition
  const handleNavigation = (path) => (e) => {
    e.preventDefault();
    setIsNavigating(true);
    // Navigate after brief animation
    setTimeout(() => {
      navigate(path);
    }, 300);
  };
  
  // Individual card animation with stagger effect
  const cardVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * 0.15,
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    })
  };
  
  return (
    <section id="matrix" ref={sectionRef} className="py-8 lg:py-12 bg-[#0B1221]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
        >
          {/* Header - Centered with scale animation */}
          <motion.div 
            variants={scaleIn} 
            className="mb-6 text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <IconChip icon={Gear} label="Governance Matrix" variant="gold" />
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mt-3 text-2xl sm:text-3xl font-bold text-white"
            >
              The console for trust operations.
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-2 text-slate-400 max-w-2xl mx-auto"
            >
              Minutes, distributions, disputes, policies, compensation—linked to a living ledger.
            </motion.p>
          </motion.div>
          
          {/* Module Grid - Cross/Diamond pattern with staggered animations */}
          <div className="max-w-4xl mx-auto">
            {/* Top row - 2 cards */}
            <div className="flex justify-center gap-3 sm:gap-4 mb-3 sm:mb-4">
              {MATRIX_MODULES.slice(0, 2).map((module, idx) => {
                const Icon = module.icon;
                return (
                  <motion.div
                    key={module.id}
                    custom={idx}
                    variants={cardVariants}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    className="w-full max-w-[160px] sm:max-w-[280px]"
                  >
                    <HoloCard 
                      className="p-3 sm:p-4 cursor-pointer h-full"
                      onClick={() => navigate(`/vault/governance?tab=${module.id}`)}
                    >
                      {/* Mobile: Centered layout, Desktop: Row layout */}
                      <div className="flex flex-col items-center text-center sm:text-left sm:items-start">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start sm:justify-between w-full gap-2 mb-2">
                          <div className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg bg-[#C6A87C]/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 sm:w-4 sm:h-4 text-[#C6A87C]" weight="duotone" />
                          </div>
                          <Badge className={`text-[8px] sm:text-[9px] border ${module.chipColor}`}>
                            {module.chip}
                          </Badge>
                        </div>
                        <h3 className="text-white font-semibold text-xs sm:text-sm mb-1">{module.title}</h3>
                        <p className="text-[10px] sm:text-xs text-slate-400 leading-relaxed">{module.desc}</p>
                      </div>
                    </HoloCard>
                  </motion.div>
                );
              })}
            </div>
            
            {/* Middle row - 1 center card */}
            <div className="flex justify-center mb-3 sm:mb-4">
              {MATRIX_MODULES.slice(2, 3).map((module) => {
                const Icon = module.icon;
                return (
                  <motion.div
                    key={module.id}
                    custom={2}
                    variants={cardVariants}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    className="w-full max-w-[160px] sm:max-w-[280px]"
                  >
                    <HoloCard 
                      className="p-3 sm:p-4 cursor-pointer"
                      onClick={() => navigate(`/vault/governance?tab=${module.id}`)}
                    >
                      <div className="flex flex-col items-center text-center sm:text-left sm:items-start">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start sm:justify-between w-full gap-2 mb-2">
                          <div className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg bg-[#C6A87C]/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 sm:w-4 sm:h-4 text-[#C6A87C]" weight="duotone" />
                          </div>
                          <Badge className={`text-[8px] sm:text-[9px] border ${module.chipColor}`}>
                            {module.chip}
                          </Badge>
                        </div>
                        <h3 className="text-white font-semibold text-xs sm:text-sm mb-1">{module.title}</h3>
                        <p className="text-[10px] sm:text-xs text-slate-400 leading-relaxed">{module.desc}</p>
                      </div>
                    </HoloCard>
                  </motion.div>
                );
              })}
            </div>
            
            {/* Bottom row - 2 cards */}
            <div className="flex justify-center gap-3 sm:gap-4">
              {MATRIX_MODULES.slice(3, 5).map((module, idx) => {
                const Icon = module.icon;
                return (
                  <motion.div
                    key={module.id}
                    custom={3 + idx}
                    variants={cardVariants}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    className="w-full max-w-[160px] sm:max-w-[280px]"
                  >
                    <HoloCard 
                      className="p-3 sm:p-4 cursor-pointer h-full"
                      onClick={() => navigate(`/vault/governance?tab=${module.id}`)}
                    >
                      <div className="flex flex-col items-center text-center sm:text-left sm:items-start">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start sm:justify-between w-full gap-2 mb-2">
                          <div className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg bg-[#C6A87C]/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 sm:w-4 sm:h-4 text-[#C6A87C]" weight="duotone" />
                          </div>
                          <Badge className={`text-[8px] sm:text-[9px] border ${module.chipColor}`}>
                            {module.chip}
                          </Badge>
                        </div>
                        <h3 className="text-white font-semibold text-xs sm:text-sm mb-1">{module.title}</h3>
                        <p className="text-[10px] sm:text-xs text-slate-400 leading-relaxed">{module.desc}</p>
                      </div>
                    </HoloCard>
                  </motion.div>
                );
              })}
            </div>
          </div>
          
          {/* CTA Row - Centered */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-4"
          >
            <div>
              <Button 
                className="bg-[#C6A87C] hover:bg-[#C6A87C]/90 text-[#05080F] font-semibold"
                onClick={handleNavigation('/vault/governance')}
              >
                Open Governance Console
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <button 
              onClick={handleNavigation('/ledger')}
              className="text-sm text-[#C6A87C] hover:text-[#C6A87C]/80 flex items-center gap-1"
            >
              View a sample ledger <CaretRight className="w-4 h-4" />
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// Main Homepage Component
export default function CyberHomePage() {
  const navigate = useNavigate();
  const [demoMode, setDemoMode] = useState(true);
  const [liveSignals, setLiveSignals] = useState([]);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [vaultOpening, setVaultOpening] = useState(false);
  const featuresRef = useRef(null);
  const isInView = useInView(featuresRef, { once: true, margin: '-100px' });
  
  // Scroll progress for animated progress bar
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  
  // Set theme color on mount to match app background
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#05080F');
    }
  }, []);
  
  // Handle vault entry animation - for main "Enter the Vault" button ONLY
  const handleEnterVault = (e) => {
    e.preventDefault();
    setVaultOpening(true);
    // Navigate after animation completes - extended to 2.5 seconds for better visibility
    setTimeout(() => {
      navigate('/vault');
    }, 2500);
  };
  
  // Simple navigation for other buttons - no vault animation, just navigate
  const handleSimpleNavigation = (path) => (e) => {
    e.preventDefault();
    navigate(path);
  };
  
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
    distribution: HandCoins,
    dispute: Gavel,
    insurance: ShieldPlus,
    compensation: UserCircleGear,
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
          distribution: HandCoins,
          dispute: Scales,
          insurance: ShieldPlus,
          compensation: UserCircleGear
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
  
  // Try to fetch live signals on mount
  useEffect(() => {
    fetchLiveSignals();
  }, []);
  
  return (
    <div className="min-h-screen bg-[#05080F] text-white overflow-x-hidden">
      {/* Vault Opening Animation Overlay */}
      <AnimatePresence>
        {vaultOpening && (
          <motion.div
            className="fixed inset-0 z-[9999] bg-[#05080F]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Vault door background */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0B1221] via-[#05080F] to-black">
              {/* Horizontal lines texture */}
              <div className="absolute inset-0 opacity-30">
                {[...Array(40)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute h-px bg-gradient-to-r from-transparent via-[#C6A87C]/50 to-transparent"
                    style={{ top: `${(i + 1) * 2.5}%`, left: 0, right: 0 }}
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: i * 0.02, duration: 0.3 }}
                  />
                ))}
              </div>
            </div>
            
            {/* Center vault emblem */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="relative"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ 
                  scale: [0.8, 1, 1.1, 1.3],
                  opacity: 1,
                }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              >
                {/* Outer pulsing ring */}
                <motion.div
                  className="absolute -inset-8 rounded-full border-2 border-[#C6A87C]/20"
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{ duration: 1.5, repeat: 1 }}
                />
                
                {/* Main ring */}
                <motion.div
                  className="w-44 h-44 sm:w-52 sm:h-52 rounded-full border-4 border-[#C6A87C]/50 flex items-center justify-center relative"
                  initial={{ boxShadow: '0 0 20px rgba(198, 168, 124, 0.2)' }}
                  animate={{ 
                    boxShadow: [
                      '0 0 20px rgba(198, 168, 124, 0.2)',
                      '0 0 60px rgba(198, 168, 124, 0.6)',
                      '0 0 100px rgba(198, 168, 124, 0.9)',
                    ],
                    borderColor: ['rgba(198, 168, 124, 0.5)', 'rgba(198, 168, 124, 0.8)', 'rgba(198, 168, 124, 1)']
                  }}
                  transition={{ duration: 1.2 }}
                >
                  {/* Inner gradient circle */}
                  <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-[#C6A87C]/30 to-[#C6A87C]/5 flex items-center justify-center border border-[#C6A87C]/30">
                    {/* Lock icon - fades out */}
                    <motion.div
                      initial={{ opacity: 1, scale: 1, rotate: 0 }}
                      animate={{ 
                        opacity: [1, 1, 0],
                        scale: [1, 1.1, 0.8],
                        rotate: [0, -15, 0],
                      }}
                      transition={{ duration: 0.8 }}
                      className="absolute"
                    >
                      <Lock className="w-16 h-16 sm:w-20 sm:h-20 text-[#C6A87C]" weight="duotone" />
                    </motion.div>
                    
                    {/* Unlock icon - fades in */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ 
                        opacity: [0, 0, 1],
                        scale: [0.5, 0.5, 1],
                      }}
                      transition={{ duration: 0.8 }}
                      className="absolute"
                    >
                      <LockOpen className="w-16 h-16 sm:w-20 sm:h-20 text-[#C6A87C]" weight="duotone" />
                    </motion.div>
                  </div>
                </motion.div>
                
                {/* Rotating dashed ring */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-dashed border-[#C6A87C]/40"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, ease: "linear" }}
                />
                
                {/* Second rotating ring */}
                <motion.div
                  className="absolute -inset-4 rounded-full border border-[#C6A87C]/20"
                  animate={{ rotate: -180 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
              </motion.div>
            </div>
            
            {/* Gold particles - more visible */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-[#C6A87C]"
                  initial={{
                    x: `${Math.random() * 100}%`,
                    y: '110%',
                    opacity: 0,
                  }}
                  animate={{
                    y: '-10%',
                    opacity: [0, 0.8, 0.8, 0],
                    scale: [0.5, 1.2, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    delay: 0.3 + Math.random() * 0.8,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </div>
            
            {/* Text */}
            <motion.div
              className="absolute bottom-24 sm:bottom-32 left-0 right-0 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <motion.p 
                className="text-[#C6A87C] font-heading text-lg sm:text-xl tracking-wider"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: 2 }}
              >
                Accessing Secure Vault...
              </motion.p>
            </motion.div>
            
            {/* Gold shimmer sweep - slower */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(198, 168, 124, 0) 30%, rgba(198, 168, 124, 0.4) 50%, rgba(198, 168, 124, 0) 70%, transparent 100%)',
                backgroundSize: '200% 100%',
              }}
              initial={{ backgroundPosition: '-100% 0' }}
              animate={{ backgroundPosition: '200% 0' }}
              transition={{ delay: 0.8, duration: 1 }}
            />
            
            {/* Door split animation - slower and more dramatic */}
            <motion.div
              className="absolute top-0 left-0 bottom-0 w-1/2 bg-gradient-to-r from-[#0B1221] to-[#0D1526]"
              style={{ 
                borderRight: '3px solid #C6A87C',
                boxShadow: '5px 0 30px rgba(198, 168, 124, 0.5)'
              }}
              initial={{ x: 0 }}
              animate={{ x: '-105%' }}
              transition={{ delay: 1.3, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            />
            <motion.div
              className="absolute top-0 right-0 bottom-0 w-1/2 bg-gradient-to-l from-[#0B1221] to-[#0D1526]"
              style={{ 
                borderLeft: '3px solid #C6A87C',
                boxShadow: '-5px 0 30px rgba(198, 168, 124, 0.5)'
              }}
              initial={{ x: 0 }}
              animate={{ x: '105%' }}
              transition={{ delay: 1.3, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Scroll Progress Bar - More visible on mobile */}
      <div className="fixed top-0 left-0 right-0 h-1.5 sm:h-1 bg-[#05080F] z-[60]">
        <motion.div
          className="h-full bg-gradient-to-r from-[#C6A87C] via-[#E8D5B5] to-[#C6A87C] origin-left"
          style={{ scaleX }}
        />
      </div>
      
      {/* Scanline overlay */}
      <div 
        className="fixed inset-0 pointer-events-none z-40 opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)'
        }}
      />
      
      {/* ===== TOP NAV ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#05080F]/95 backdrop-blur-xl border-b border-white/5 pt-1.5 sm:pt-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-16">
            {/* Logo - Private Equity & Trusts - Centered - NO link */}
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-vault-gold" weight="fill" />
              <span className="text-base font-medium text-white">Private Equity & Trusts</span>
            </div>
          </div>
        </div>
      </nav>
      
      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[calc(100vh-64px)] flex flex-col justify-center pb-16 sm:pb-20 lg:h-screen lg:pb-0 lg:pt-4">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1221] via-transparent to-[#05080F]" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              {/* OMNIGOVAULT Logo - Centered, fully visible */}
              <motion.div 
                variants={fadeInUp}
                className="mb-0 lg:-mb-2 lg:mt-8"
              >
                <div className="w-full max-w-[420px] sm:max-w-[320px] lg:max-w-[480px] mx-auto">
                  <img 
                    src="/omnigovault-logo-trimmed.png" 
                    alt="OMNIGOVAULT" 
                    className="w-full h-auto max-h-[260px] sm:max-h-[180px] lg:max-h-[260px] object-contain mx-auto"
                    style={{ imageRendering: 'crisp-edges' }}
                  />
                </div>
              </motion.div>
              
              <motion.h2
                variants={fadeInUp}
                className="text-lg sm:text-xl lg:text-2xl text-slate-300 font-light mt-4 sm:mt-2 lg:-mt-4"
              >
                A matrix system for trust governance.
              </motion.h2>
              
              <motion.p 
                variants={fadeInUp}
                className="mt-4 sm:mt-3 lg:mt-1 text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed italic"
              >
                &ldquo;In whom also we have obtained an inheritance, being predestinated according to the purpose of him who worketh all things after the counsel of his own will.&rdquo;&nbsp;&nbsp;<span className="text-[10px] text-white/30 not-italic">— Ephesians 1:11</span>
              </motion.p>
              
              <motion.div variants={fadeInUp} className="mt-6 sm:mt-5 lg:mt-3 flex justify-center">
                <Button 
                  size="default" 
                  className="bg-[#C6A87C] hover:bg-[#C6A87C]/90 text-[#05080F] font-semibold px-6"
                  onClick={handleEnterVault}
                >
                  Enter the Vault
                </Button>
              </motion.div>
              
              {/* Microcopy */}
              <motion.p variants={fadeInUp} className="mt-4 sm:mt-3 lg:mt-1 text-[10px] text-slate-500 flex items-center gap-1.5 justify-center">
                <ClockCounterClockwise className="w-3 h-3" />
                Draft → Finalize → Amend (with traceable history).
              </motion.p>
              
              {/* Stats */}
              <motion.div variants={fadeInUp} className="mt-6 sm:mt-5 lg:mt-3 flex flex-wrap gap-8 sm:gap-6 lg:gap-10 justify-center">
                {[
                  { value: '500+', label: 'Trusts Managed' },
                  { value: '10k+', label: 'Documents Filed' },
                  { value: '99.9%', label: 'Uptime' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-lg lg:text-xl font-bold text-white">{stat.value}</div>
                    <div className="text-[10px] text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
        
        {/* Scroll indicator - positioned below stats with proper spacing */}
        <motion.div 
          className="absolute bottom-20 sm:bottom-16 lg:bottom-2 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="relative w-5 h-8 rounded-full border-2 border-[#C6A87C]/40 flex justify-center pt-1.5 bg-[#0B1221]/50 backdrop-blur-sm">
            <motion.div 
              className="w-1 h-1.5 bg-gradient-to-b from-[#C6A87C] to-[#C6A87C]/50 rounded-full"
              animate={{ y: [0, 6, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </section>
      
      {/* ===== GOVERNANCE MATRIX SECTION (replaces Trust Radar) ===== */}
      <GovernanceMatrixSection />
      
      {/* ===== SIGNAL FEED SECTION ===== */}
      <section id="signals" className="py-8 lg:py-12 bg-gradient-to-b from-[#0B1221] to-[#05080F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Two cards side by side - aligned at top */}
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            {/* Signal Feed Card */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={fadeInUp}
            >
              <HoloCard className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">Signal Console</h3>
                    <p className="text-xs text-slate-400">Real-time governance activity</p>
                  </div>
                  <div className="flex items-center gap-2">
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
                    <button 
                      type="button"
                      style={{
                        backgroundColor: demoMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        color: demoMode ? '#fbbf24' : '#34d399',
                        borderColor: demoMode ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)',
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium rounded-md border outline-none focus:outline-none active:outline-none touch-manipulation select-none"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDemoMode(prev => !prev);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDemoMode(prev => !prev);
                      }}
                    >
                      <Pulse className="w-3 h-3" weight="fill" />
                      {demoMode ? 'Demo' : 'Live'}
                    </button>
                  </div>
                </div>
                {signalsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-[#C6A87C] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <SignalFeed signals={demoMode ? DEMO_SIGNALS : (liveSignals.length > 0 ? liveSignals : DEMO_SIGNALS)} />
                )}
              </HoloCard>
            </motion.div>
            
            {/* Trust Health Card - Aligned with Signal Console card */}
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
      <section id="scenarios" className="py-8 lg:py-12 bg-[#05080F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
          >
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-6"
            >
              <IconChip icon={BookOpen} label="Case Studies" variant="gold" />
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-white">Real-World Scenarios</h2>
              <p className="mt-2 text-slate-400">See how OMNIGOVAULT solves common governance challenges</p>
            </motion.div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {SCENARIOS.map((scenario, idx) => {
                const Icon = scenario.icon;
                return (
                  <motion.div
                    key={scenario.id}
                    initial={{ opacity: 0, y: 40, scale: 0.9 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1, duration: 0.5 }}
                  >
                    <HoloCard className="p-5 cursor-pointer text-center h-full">
                      <div className="flex justify-center">
                        <Icon className="w-8 h-8 text-[#C6A87C] mb-3" weight="duotone" />
                      </div>
                      <h3 className="text-white font-semibold mb-2">{scenario.title}</h3>
                      <p className="text-sm text-slate-400">{scenario.desc}</p>
                    </HoloCard>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* ===== LEARN SECTION ===== */}
      <section id="learn" className="py-8 lg:py-12 bg-gradient-to-b from-[#05080F] to-[#0B1221]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
          >
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-6"
            >
              <IconChip icon={Sparkle} label="Education" variant="gold" />
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-white">Maxims Explorer</h2>
              <p className="mt-2 text-slate-400">Master the foundational principles of equity law</p>
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mt-4 flex items-center justify-center gap-3"
              >
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                  <Lightning className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400">3-day streak</span>
                </div>
                <div>
                  <Button 
                    className="bg-[#C6A87C] hover:bg-[#C6A87C]/90 text-[#05080F]"
                    onClick={handleSimpleNavigation('/learn')}
                  >
                    Start Learning
                  </Button>
                </div>
              </motion.div>
            </motion.div>
            
            <div className="grid sm:grid-cols-3 gap-4">
              {MAXIMS.map((maxim, idx) => (
                <motion.div
                  key={maxim.id}
                  initial={{ opacity: 0, rotateY: -30, x: -50 }}
                  whileInView={{ opacity: 1, rotateY: 0, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.15, duration: 0.6, ease: "easeOut" }}
                >
                  <HoloCard className="p-5 cursor-pointer group text-center h-full">
                    <div className="flex justify-center mb-3">
                      <div>
                        <IconChip label={maxim.category} variant="default" />
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-white group-hover:text-[#C6A87C] mb-2">
                      {maxim.front}
                    </p>
                    <p className="text-sm text-slate-500 group-hover:text-slate-300">
                      {maxim.back}
                    </p>
                  </HoloCard>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* ===== TEMPLATE VAULT SECTION ===== */}
      <section id="templates" className="py-8 lg:py-12 bg-[#0B1221]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
          >
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-6"
            >
              <IconChip icon={FileText} label="Templates" variant="gold" />
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-white">Template Studio</h2>
              <p className="mt-2 text-slate-400">Professional trust document templates ready for customization</p>
            </motion.div>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              {TEMPLATES.map((template, idx) => {
                const Icon = template.icon;
                return (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, x: idx % 2 === 0 ? -30 : 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.08, duration: 0.5 }}
                  >
                    <HoloCard className="p-4 cursor-pointer h-full">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#C6A87C]/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-[#C6A87C]" weight="duotone" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-white font-medium text-sm">{template.title}</h3>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{template.desc}</p>
                        </div>
                      </div>
                    </HoloCard>
                  </motion.div>
                );
              })}
            </div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mt-5 text-center"
            >
              <div>
                <Button 
                  variant="outline" 
                  className="border-[#C6A87C]/30 text-[#C6A87C] hover:bg-[#C6A87C]/10"
                  onClick={handleSimpleNavigation('/templates')}
                >
                  Browse All Templates <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* ===== FINAL CTA ===== */}
      <section className="py-10 lg:py-14 bg-gradient-to-b from-[#0B1221] to-[#05080F]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mb-4"
            >
              <Vault className="w-10 h-10 sm:w-12 sm:h-12 text-[#C6A87C] mx-auto" weight="duotone" />
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2"
            >
              Ready to Transform Your Trust Governance?
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-xs sm:text-sm text-slate-400 mb-4"
            >
              Start with our demo or create your secure vault today.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <div>
                <Button 
                  size="lg" 
                  className="bg-[#C6A87C] hover:bg-[#C6A87C]/90 text-[#05080F] font-semibold px-8"
                  onClick={handleEnterVault}
                >
                  Enter the Vault
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Scroll-to-Top Arrow - Desktop only, bottom right */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="hidden lg:flex fixed bottom-8 right-8 z-40 w-10 h-10 items-center justify-center rounded-full bg-[#0B1221]/90 border border-[#C6A87C]/30 hover:border-[#C6A87C] hover:bg-[#C6A87C]/10 transition-all duration-300 shadow-lg backdrop-blur-sm"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-5 h-5 text-[#C6A87C]" weight="bold" />
          </motion.button>
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
    </div>
  );
}
