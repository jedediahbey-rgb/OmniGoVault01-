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
  X,
  Info,
  DownloadSimple
} from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

// Matrix Rain Canvas Component for Initial Loading
const MatrixRain = () => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?~`αβγδεζηθικλμνξοπρστυφχψω';
    const charArray = chars.split('');
    
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);
    // Gold color - vault-gold RGB(198, 168, 124)
    const matrixColor = 'rgba(198, 168, 124, ';
    
    const draw = () => {
      ctx.fillStyle = 'rgba(10, 17, 40, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.font = `${fontSize}px monospace`;
      
      for (let i = 0; i < drops.length; i++) {
        const char = charArray[Math.floor(Math.random() * charArray.length)];
        // Higher opacity for more visible gold characters (0.3 to 0.8)
        const opacity = Math.random() * 0.5 + 0.3;
        ctx.fillStyle = matrixColor + opacity + ')';
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };
    
    const interval = setInterval(draw, 50);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 opacity-70"
      style={{ background: 'transparent' }}
    />
  );
};

const API = process.env.REACT_APP_BACKEND_URL + '/api';

// Labyrinth definition image and text
const LABYRINTH_IMAGE = "https://customer-assets.emergentagent.com/job_19182e55-503a-460d-b3b9-a6c0d9af1a20/artifacts/mnjuuw0n_f8001dbee95798fb1001b83e3bde66f6.jpg";
const LABYRINTH_DEFINITION = "A labyrinth is a complex path leading inwards, often a single, winding route to a center, used for walking meditation, reflection, and stress relief, distinct from a maze which has choices and dead ends. Figuratively, it means any confusing, intricate situation or structure, like a \"labyrinth of rules\" or \"labyrinth of love,\" while anatomically, it refers to the inner ear.";

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
const HoloCard = ({ children, className = '', hover = true, onClick, delay = 0 }) => {
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) onClick(e);
  };
  
  return (
    <div
      className={`relative bg-[#0B1221]/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-[#C6A87C]/40 hover:shadow-[0_0_30px_rgba(198,168,124,0.1)] ${className}`}
      onClick={handleClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e); } : undefined}
    >
      <Scanline />
      <div className="relative z-20">{children}</div>
    </div>
  );
};

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
                const handleCardClick = () => {
                  navigate(module.id === 'compensation' ? '/vault/audit-log' : `/vault/governance?tab=${module.id}`);
                };
                return (
                  <motion.div
                    key={module.id}
                    custom={idx}
                    variants={cardVariants}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    className="w-full max-w-[160px] sm:max-w-[280px] cursor-pointer"
                  >
                    <HoloCard 
                      className="p-3 sm:p-4 h-full"
                      onClick={handleCardClick}
                    >
                      {/* Mobile: Centered layout, Desktop: Row layout */}
                      <div className="flex flex-col items-center text-center sm:text-left sm:items-start pointer-events-none">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start sm:justify-between w-full gap-2 mb-2">
                          <div className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg bg-[#C6A87C]/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 sm:w-4 sm:h-4 text-[#C6A87C]" weight="duotone" />
                          </div>
                          <Badge className={`text-[8px] sm:text-[9px] border ${module.chipColor} pointer-events-none`}>
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
                const handleCardClick = () => {
                  navigate(module.id === 'compensation' ? '/vault/audit-log' : `/vault/governance?tab=${module.id}`);
                };
                return (
                  <motion.div
                    key={module.id}
                    custom={2}
                    variants={cardVariants}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    className="w-full max-w-[160px] sm:max-w-[280px] cursor-pointer"
                  >
                    <HoloCard 
                      className="p-3 sm:p-4"
                      onClick={handleCardClick}
                    >
                      <div className="flex flex-col items-center text-center sm:text-left sm:items-start pointer-events-none">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start sm:justify-between w-full gap-2 mb-2">
                          <div className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg bg-[#C6A87C]/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 sm:w-4 sm:h-4 text-[#C6A87C]" weight="duotone" />
                          </div>
                          <Badge className={`text-[8px] sm:text-[9px] border ${module.chipColor} pointer-events-none`}>
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
                const handleCardClick = () => {
                  navigate(module.id === 'compensation' ? '/vault/audit-log' : `/vault/governance?tab=${module.id}`);
                };
                return (
                  <motion.div
                    key={module.id}
                    custom={3 + idx}
                    variants={cardVariants}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    className="w-full max-w-[160px] sm:max-w-[280px] cursor-pointer"
                  >
                    <HoloCard 
                      className="p-3 sm:p-4 h-full"
                      onClick={handleCardClick}
                    >
                      <div className="flex flex-col items-center text-center sm:text-left sm:items-start pointer-events-none">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start sm:justify-between w-full gap-2 mb-2">
                          <div className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg bg-[#C6A87C]/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 sm:w-4 sm:h-4 text-[#C6A87C]" weight="duotone" />
                          </div>
                          <Badge className={`text-[8px] sm:text-[9px] border ${module.chipColor} pointer-events-none`}>
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
  const [showAccessComplete, setShowAccessComplete] = useState(false);
  const [showInitialLoading, setShowInitialLoading] = useState(true);
  const [showLabyrinthPopup, setShowLabyrinthPopup] = useState(false);
  const [isLabyrinthHovered, setIsLabyrinthHovered] = useState(false);
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
  // If user has an existing session, this will auto-login them
  const handleEnterVault = async (e) => {
    e.preventDefault();
    
    // Check if user already has a session/account
    try {
      const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
      if (response.data && response.data.user_id && response.data.email !== 'dev.admin@system.local') {
        // User has an account - start vault animation and go to vault
        setVaultOpening(true);
        setTimeout(() => {
          setVaultOpening(false);
          setShowAccessComplete(true);
        }, 2500);
        setTimeout(() => {
          navigate('/vault');
        }, 4000);
        return;
      }
    } catch (error) {
      // No session or error - continue with normal flow
    }
    
    // Start vault animation for dev/new users
    setVaultOpening(true);
    setTimeout(() => {
      setVaultOpening(false);
      setShowAccessComplete(true);
    }, 2500);
    setTimeout(() => {
      navigate('/vault');
    }, 4000);
  };
  
  // Handle Google Auth - Create Account
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleCreateAccount = (e) => {
    e.preventDefault();
    // Use window.location.origin to dynamically get the current domain
    const redirectUrl = window.location.origin + '/vault';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };
  
  // State for labyrinth popup - desktop uses hover, mobile uses click
  const [isDesktopState, setIsDesktopState] = useState(typeof window !== 'undefined' && window.innerWidth >= 640);
  const labyrinthHoverTimeoutRef = useRef(null);
  
  // Check if desktop on mount and resize
  useEffect(() => {
    const checkDesktop = () => setIsDesktopState(window.innerWidth >= 640);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Handle labyrinth hover (desktop only - shows on hover, hides on leave with delay)
  const handleLabyrinthHover = (isHovering) => {
    // On desktop (>= 640px), show/hide popup on hover
    if (window.innerWidth >= 640) {
      // Clear any pending timeout
      if (labyrinthHoverTimeoutRef.current) {
        clearTimeout(labyrinthHoverTimeoutRef.current);
        labyrinthHoverTimeoutRef.current = null;
      }
      
      if (isHovering) {
        // Show immediately on hover
        setIsLabyrinthHovered(true);
        setShowLabyrinthPopup(true);
        document.body.style.overflow = 'hidden';
      } else {
        // Delay hiding to allow mouse to move to popup
        labyrinthHoverTimeoutRef.current = setTimeout(() => {
          setIsLabyrinthHovered(false);
          setShowLabyrinthPopup(false);
          document.body.style.overflow = '';
        }, 150);
      }
    }
  };
  
  // Keep popup open when mouse is over it (desktop)
  const handlePopupMouseEnter = () => {
    if (window.innerWidth >= 640 && labyrinthHoverTimeoutRef.current) {
      clearTimeout(labyrinthHoverTimeoutRef.current);
      labyrinthHoverTimeoutRef.current = null;
    }
  };
  
  // Close popup when mouse leaves it (desktop)
  const handlePopupMouseLeave = () => {
    if (window.innerWidth >= 640) {
      labyrinthHoverTimeoutRef.current = setTimeout(() => {
        setIsLabyrinthHovered(false);
        setShowLabyrinthPopup(false);
        document.body.style.overflow = '';
      }, 150);
    }
  };
  
  // Handle labyrinth click (mobile only)
  const handleLabyrinthClick = () => {
    // Only open on click for mobile
    if (window.innerWidth < 640) {
      console.log('Mobile click - opening popup');
      setShowLabyrinthPopup(true);
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
    }
  };
  
  const closeLabyrinthPopup = () => {
    setShowLabyrinthPopup(false);
    setIsLabyrinthHovered(false);
    // Restore background scroll
    if (window.innerWidth < 640) {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    document.body.style.overflow = '';
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Restore scroll on unmount
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      // Clear labyrinth hover timeout
      if (labyrinthHoverTimeoutRef.current) {
        clearTimeout(labyrinthHoverTimeoutRef.current);
      }
    };
  }, []);
  
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
  
  // Initial loading phase management
  const [loadingPhase, setLoadingPhase] = useState('booting');
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  useEffect(() => {
    if (!showInitialLoading) return;
    
    // Progress simulation
    const intervals = [
      { target: 15, duration: 400 },
      { target: 30, duration: 500 },
      { target: 45, duration: 400 },
      { target: 60, duration: 500 },
      { target: 75, duration: 400 },
      { target: 85, duration: 300 },
    ];
    
    let currentIndex = 0;
    const runProgress = () => {
      if (currentIndex >= intervals.length) return;
      const { target, duration } = intervals[currentIndex];
      setTimeout(() => {
        setLoadingProgress(target);
        currentIndex++;
        runProgress();
      }, duration);
    };
    runProgress();
    
    // Phase transitions
    const phaseTimer1 = setTimeout(() => {
      setLoadingPhase('entitled');
      setLoadingProgress(90);
    }, 1500);
    
    const phaseTimer2 = setTimeout(() => {
      setLoadingProgress(100);
    }, 2500);
    
    const completeTimer = setTimeout(() => {
      setShowInitialLoading(false);
    }, 3200);
    
    return () => {
      clearTimeout(phaseTimer1);
      clearTimeout(phaseTimer2);
      clearTimeout(completeTimer);
    };
  }, [showInitialLoading]);
  
  return (
    <div className="min-h-screen bg-[#05080F] text-white overflow-x-hidden">
      {/* Initial Loading Screen - EXACT design from AppLoader */}
      <AnimatePresence>
        {showInitialLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: 'easeInOut' }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a1128]"
          >
            {/* Matrix Rain Background */}
            <MatrixRain />
            
            {/* Gradient overlay */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(10, 17, 40, 0.3) 0%, rgba(10, 17, 40, 0.75) 60%, rgba(10, 17, 40, 0.9) 100%)'
              }}
            />

            {/* Scanline effect */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-[0.04]"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(198, 168, 124, 0.15) 2px, rgba(198, 168, 124, 0.15) 4px)'
              }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-6 px-8 py-10 rounded-2xl bg-[#0a1128]/60 backdrop-blur-sm border border-[#C6A87C]/10">
              {/* Logo / Wordmark */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex flex-col items-center gap-3"
              >
                <span className="text-xl font-heading text-[#C6A87C] tracking-[0.3em] font-bold">
                  OMNIGOVAULT
                </span>
                {/* Jack In Icon - positioned under OMNIGOVAULT */}
                <div className="w-12 h-12 rounded-lg bg-[#C6A87C]/10 border border-[#C6A87C]/40 flex items-center justify-center relative">
                  {/* Matrix Jack/Plug Icon */}
                  <svg 
                    viewBox="0 0 24 24" 
                    className="w-7 h-7 text-[#C6A87C]"
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {/* Main connector body */}
                    <rect x="7" y="2" width="10" height="8" rx="1" />
                    {/* Prongs */}
                    <line x1="10" y1="10" x2="10" y2="14" />
                    <line x1="14" y1="10" x2="14" y2="14" />
                    {/* Base plate */}
                    <rect x="6" y="14" width="12" height="3" rx="0.5" />
                    {/* Connection lines going down */}
                    <line x1="9" y1="17" x2="9" y2="22" />
                    <line x1="12" y1="17" x2="12" y2="20" />
                    <line x1="15" y1="17" x2="15" y2="22" />
                  </svg>
                  {/* Pulse effect when loading */}
                  {loadingPhase === 'booting' && (
                    <motion.div
                      className="absolute inset-0 rounded-lg border-2 border-[#C6A87C]/50"
                      animate={{ 
                        scale: [1, 1.3, 1],
                        opacity: [0.6, 0, 0.6]
                      }}
                      transition={{ 
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}
                </div>
              </motion.div>

              {/* Status Text */}
              <div className="flex flex-col items-center gap-3 min-h-[80px] mt-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={loadingPhase}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4 }}
                    className="text-center"
                  >
                    <p className="text-white/90 text-lg font-medium tracking-wider">
                      {loadingPhase === 'booting' ? 'Jacking into the Network' : 'Matrix System Online'}
                    </p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="text-white/50 text-sm mt-2 tracking-wide"
                    >
                      {loadingPhase === 'booting' 
                        ? 'Establishing secure connection...' 
                        : '1 vault · Solo operator mode'}
                    </motion.p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Progress Bar */}
              <div className="w-64 h-[3px] bg-[#C6A87C]/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#C6A87C]/40 via-[#C6A87C] to-[#C6A87C]/40 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>

              {/* Plan Badge */}
              <AnimatePresence>
                {loadingPhase !== 'booting' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4 }}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  >
                    DYNASTY
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* ACCESS DOWNLOAD COMPLETE Screen - shown after vault animation */}
      <AnimatePresence>
        {showAccessComplete && (
          <motion.div
            className="fixed inset-0 z-[9999] bg-[#040810] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Background glow */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(198,168,124,0.15) 0%, transparent 50%)',
              }}
            />
            
            {/* Content */}
            <motion.div
              className="relative text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {/* Success Icon */}
              <motion.div
                className="w-24 h-24 mx-auto mb-6 rounded-full border-2 border-[#C6A87C]/50 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                style={{
                  boxShadow: '0 0 40px rgba(198,168,124,0.3)',
                }}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <DownloadSimple className="w-12 h-12 text-[#C6A87C]" weight="duotone" />
                </motion.div>
              </motion.div>
              
              {/* Title */}
              <motion.h1
                className="text-[#C6A87C] text-2xl sm:text-3xl font-bold tracking-widest mb-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                ACCESS DOWNLOAD
              </motion.h1>
              
              <motion.h2
                className="text-white text-3xl sm:text-4xl font-bold tracking-wide mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                COMPLETE
              </motion.h2>
              
              {/* Progress bar complete */}
              <motion.div
                className="w-64 h-1.5 bg-[#C6A87C]/20 rounded-full mx-auto overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-[#C6A87C] to-[#E8D5B5] rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 0.7, duration: 0.5, ease: 'easeOut' }}
                />
              </motion.div>
              
              {/* Checkmark particles */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-[#C6A87C]"
                  style={{
                    left: `calc(50% + ${Math.cos((i * Math.PI * 2) / 8) * 80}px)`,
                    top: `calc(40% + ${Math.sin((i * Math.PI * 2) / 8) * 80}px)`,
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
                  transition={{ delay: 0.6 + i * 0.05, duration: 0.8 }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Premium Vault Door Opening Animation */}
      <AnimatePresence>
        {vaultOpening && (
          <motion.div
            className="fixed inset-0 z-[9999] bg-[#040810]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Subtle vignette background */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse at center, #0a0f18 0%, #040810 60%, #020408 100%)',
              }}
            />
            
            {/* Golden glow that intensifies as vault opens (appears after 1.2s) */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0, 0.4, 0.8, 1] }}
              transition={{ duration: 2.5, times: [0, 0.4, 0.55, 0.7, 1] }}
            >
              <div 
                className="w-[700px] h-[700px] rounded-full"
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(198,168,124,0.25) 0%, rgba(198,168,124,0.08) 40%, transparent 65%)',
                }}
              />
            </motion.div>
            
            {/* Document and folder silhouettes (appear as vault opens) */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0, 0, 0.5, 0.3] }}
              transition={{ duration: 2.5, times: [0, 0.5, 0.6, 0.75, 1] }}
            >
              {/* Document 1 */}
              <motion.svg 
                className="absolute" 
                style={{ left: '35%', top: '35%' }}
                width="45" height="55" viewBox="0 0 45 55" fill="none"
                initial={{ y: 40, opacity: 0, rotate: -8 }}
                animate={{ y: [40, 0, -10], opacity: [0, 0.6, 0.4], rotate: -8 }}
                transition={{ duration: 1.2, delay: 1.4 }}
              >
                <rect x="2" y="2" width="41" height="51" rx="2" stroke="rgba(198,168,124,0.5)" strokeWidth="1.5" fill="rgba(198,168,124,0.1)" />
                <line x1="8" y1="14" x2="35" y2="14" stroke="rgba(198,168,124,0.3)" strokeWidth="2" />
                <line x1="8" y1="22" x2="30" y2="22" stroke="rgba(198,168,124,0.25)" strokeWidth="2" />
                <line x1="8" y1="30" x2="32" y2="30" stroke="rgba(198,168,124,0.25)" strokeWidth="2" />
                <circle cx="30" cy="42" r="6" fill="rgba(198,168,124,0.3)" />
              </motion.svg>
              
              {/* Document 2 */}
              <motion.svg 
                className="absolute" 
                style={{ left: '55%', top: '38%' }}
                width="40" height="50" viewBox="0 0 40 50" fill="none"
                initial={{ y: 30, opacity: 0, rotate: 5 }}
                animate={{ y: [30, 0, -5], opacity: [0, 0.5, 0.35], rotate: 5 }}
                transition={{ duration: 1.1, delay: 1.5 }}
              >
                <rect x="2" y="2" width="36" height="46" rx="2" stroke="rgba(198,168,124,0.4)" strokeWidth="1.5" fill="rgba(198,168,124,0.08)" />
                <line x1="7" y1="12" x2="30" y2="12" stroke="rgba(198,168,124,0.25)" strokeWidth="2" />
                <line x1="7" y1="20" x2="26" y2="20" stroke="rgba(198,168,124,0.2)" strokeWidth="2" />
                <line x1="7" y1="28" x2="28" y2="28" stroke="rgba(198,168,124,0.2)" strokeWidth="2" />
              </motion.svg>
              
              {/* Folder */}
              <motion.svg 
                className="absolute" 
                style={{ left: '43%', top: '50%' }}
                width="55" height="42" viewBox="0 0 55 42" fill="none"
                initial={{ y: 25, opacity: 0 }}
                animate={{ y: [25, 0, -3], opacity: [0, 0.45, 0.3] }}
                transition={{ duration: 1, delay: 1.55 }}
              >
                <path 
                  d="M2 8C2 6.34 3.34 5 5 5H18L23 0H50C51.66 0 53 1.34 53 3V37C53 38.66 51.66 40 50 40H5C3.34 40 2 38.66 2 37V8Z" 
                  stroke="rgba(198,168,124,0.45)" 
                  strokeWidth="1.5" 
                  fill="rgba(198,168,124,0.08)" 
                />
              </motion.svg>
            </motion.div>
            
            {/* Fine golden sparkles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(25)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-[#C6A87C]"
                  style={{
                    left: `${30 + Math.random() * 40}%`,
                    top: `${30 + Math.random() * 40}%`,
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 0.8, 0],
                    scale: [0, 1.5, 0],
                  }}
                  transition={{
                    duration: 1.8,
                    delay: 1.3 + Math.random() * 0.8,
                    repeat: 1,
                    repeatDelay: 0.3,
                  }}
                />
              ))}
            </div>
            
            {/* Main Vault Door */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="relative"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ 
                  scale: [0.9, 1, 1, 1, 3],
                  opacity: [0, 1, 1, 1, 0],
                }}
                transition={{ 
                  duration: 2.5, 
                  times: [0, 0.15, 0.5, 0.85, 1],
                  ease: [0.4, 0, 0.2, 1]
                }}
              >
                {/* Vault Frame */}
                <div className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px]">
                  {/* Outer decorative ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-[#C6A87C]/20" />
                  <div className="absolute inset-2 rounded-full border border-[#C6A87C]/15" />
                  
                  {/* Main vault door */}
                  <motion.div
                    className="absolute inset-6 rounded-full overflow-hidden"
                    style={{
                      background: 'linear-gradient(145deg, #1a2235 0%, #0f1520 50%, #0a0e16 100%)',
                      boxShadow: 'inset 0 2px 30px rgba(0,0,0,0.8), 0 0 40px rgba(198,168,124,0.15)',
                    }}
                    initial={{ rotateY: 0 }}
                    animate={{ rotateY: [0, 0, -100] }}
                    transition={{ 
                      duration: 2.5, 
                      times: [0, 0.45, 0.85],
                      ease: [0.4, 0, 0.2, 1]
                    }}
                  >
                    {/* Door surface texture rings */}
                    <div className="absolute inset-4 rounded-full border border-[#C6A87C]/10" />
                    <div className="absolute inset-8 rounded-full border border-[#C6A87C]/08" />
                    
                    {/* Center wheel mechanism */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        className="relative w-24 h-24 sm:w-28 sm:h-28"
                        initial={{ rotate: 0 }}
                        animate={{ rotate: [0, 0, 180] }}
                        transition={{ 
                          duration: 2.5, 
                          times: [0, 0.2, 0.5],
                          ease: [0.4, 0, 0.6, 1]
                        }}
                      >
                        {/* Wheel outer ring */}
                        <div className="absolute inset-0 rounded-full border-[3px] border-[#C6A87C]/50" />
                        
                        {/* Wheel spokes */}
                        {[0, 45, 90, 135].map((angle) => (
                          <div
                            key={angle}
                            className="absolute top-1/2 left-1/2 w-full h-[3px] bg-[#C6A87C]/40 -translate-x-1/2 -translate-y-1/2 origin-center"
                            style={{ transform: `translate(-50%, -50%) rotate(${angle}deg)` }}
                          />
                        ))}
                        
                        {/* Center hub */}
                        <div className="absolute inset-[30%] rounded-full bg-gradient-to-br from-[#C6A87C]/25 to-[#C6A87C]/10 border-2 border-[#C6A87C]/40 flex items-center justify-center">
                          <div className="w-2 h-4 bg-[#0a0e16] border border-[#C6A87C]/30 rounded-sm" />
                        </div>
                      </motion.div>
                    </div>
                    
                    {/* Bolt indicators around edge */}
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                      <motion.div
                        key={angle}
                        className="absolute w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#C6A87C]/25 border border-[#C6A87C]/40"
                        style={{
                          top: `${50 + 40 * Math.sin((angle * Math.PI) / 180)}%`,
                          left: `${50 + 40 * Math.cos((angle * Math.PI) / 180)}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        animate={{
                          backgroundColor: ['rgba(198,168,124,0.25)', 'rgba(198,168,124,0.6)', 'rgba(198,168,124,0.25)'],
                          boxShadow: ['0 0 0px rgba(198,168,124,0)', '0 0 8px rgba(198,168,124,0.5)', '0 0 0px rgba(198,168,124,0)'],
                        }}
                        transition={{ duration: 0.4, delay: 0.5 + i * 0.04 }}
                      />
                    ))}
                    
                    {/* Engraved text */}
                    <motion.div
                      className="absolute bottom-8 sm:bottom-10 left-0 right-0 text-center"
                      initial={{ opacity: 0.5 }}
                      animate={{ opacity: [0.5, 0.5, 0] }}
                      transition={{ duration: 2.5, times: [0, 0.4, 0.6] }}
                    >
                      <span className="text-[#C6A87C]/30 text-[10px] tracking-[0.25em] font-light uppercase">
                        Private Vault
                      </span>
                    </motion.div>
                  </motion.div>
                  
                  {/* Outer notched ring (decorative) */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 340 340">
                    <circle
                      cx="170"
                      cy="170"
                      r="167"
                      fill="none"
                      stroke="rgba(198,168,124,0.12)"
                      strokeWidth="1"
                      strokeDasharray="8 4"
                    />
                  </svg>
                </div>
              </motion.div>
            </div>
            
            {/* Status text */}
            <motion.div
              className="absolute bottom-20 sm:bottom-28 left-0 right-0 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: [0, 1, 1, 0], y: [20, 0, 0, 0] }}
              transition={{ duration: 2.5, times: [0, 0.15, 0.8, 1] }}
            >
              <motion.p
                className="text-[#C6A87C]/80 text-sm sm:text-base tracking-wider font-light"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: 1 }}
              >
                Unlocking your private vault...
              </motion.p>
            </motion.div>
            
            {/* Bottom accent line */}
            <motion.div
              className="absolute bottom-10 left-1/2 -translate-x-1/2 h-px bg-gradient-to-r from-transparent via-[#C6A87C]/30 to-transparent"
              initial={{ width: 0 }}
              animate={{ width: [0, 150, 200] }}
              transition={{ duration: 1.5, delay: 0.3 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Scroll Progress Bar - Top (horizontal) */}
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
      <section className="relative min-h-[calc(100vh-64px)] flex flex-col justify-center pb-16 sm:pb-20 lg:min-h-0 lg:h-auto lg:pb-4 lg:pt-20">
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
                className="mb-0 lg:-mb-4"
              >
                <div className="w-full max-w-[420px] sm:max-w-[320px] lg:max-w-[380px] mx-auto">
                  <img 
                    src="/omnigovault-logo-trimmed.png" 
                    alt="OMNIGOVAULT" 
                    className="w-full h-auto max-h-[260px] sm:max-h-[180px] lg:max-h-[180px] object-contain mx-auto"
                    style={{ imageRendering: 'crisp-edges' }}
                  />
                </div>
              </motion.div>
              
              <motion.h2
                variants={fadeInUp}
                className="text-lg sm:text-xl lg:text-xl text-slate-300 font-light mt-4 sm:mt-2 lg:-mt-2"
              >
                A{' '}
                <span 
                  className="relative inline-block cursor-pointer group"
                  onClick={handleLabyrinthClick}
                  onMouseEnter={() => handleLabyrinthHover(true)}
                  onMouseLeave={() => handleLabyrinthHover(false)}
                  data-testid="labyrinth-trigger"
                >
                  <span className="text-[#C6A87C] hover:text-[#E8D5B5] transition-colors duration-200">
                    labyrinth system
                  </span>
                </span>
                {' '}for trust governance.
              </motion.h2>
              
              <motion.p 
                variants={fadeInUp}
                className="mt-4 sm:mt-3 lg:mt-1 text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed italic"
              >
                &ldquo;In whom also we have obtained an inheritance, being predestinated according to the purpose of him who worketh all things after the counsel of his own will.&rdquo;&nbsp;&nbsp;<span className="text-[10px] text-white/30 not-italic">— Ephesians 1:11</span>
              </motion.p>
              
              <motion.div variants={fadeInUp} className="mt-5 sm:mt-4 lg:mt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <Button 
                  size="default" 
                  className="bg-[#C6A87C] hover:bg-[#C6A87C]/90 text-[#05080F] font-semibold px-6"
                  onClick={handleEnterVault}
                >
                  Enter the Vault
                </Button>
                <Button 
                  size="default" 
                  variant="outline"
                  className="border-[#C6A87C]/50 text-[#C6A87C] hover:bg-[#C6A87C]/10 font-semibold px-6 flex items-center gap-2"
                  onClick={handleCreateAccount}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Create Account
                </Button>
              </motion.div>
              
              {/* Microcopy */}
              <motion.p variants={fadeInUp} className="mt-3 sm:mt-2 lg:mt-1 text-[10px] text-slate-500 flex items-center gap-1.5 justify-center">
                <ClockCounterClockwise className="w-3 h-3" />
                Draft → Finalize → Amend (with traceable history).
              </motion.p>
              
              {/* Stats */}
              <motion.div variants={fadeInUp} className="mt-4 sm:mt-3 lg:mt-2 flex flex-wrap gap-8 sm:gap-6 lg:gap-10 justify-center">
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
          className="absolute bottom-20 sm:bottom-16 lg:relative lg:mt-4 lg:bottom-auto left-1/2 -translate-x-1/2 lg:left-auto lg:translate-x-0 lg:mx-auto lg:flex lg:justify-center"
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
              className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
            >
              <Button 
                size="lg" 
                className="bg-[#C6A87C] hover:bg-[#C6A87C]/90 text-[#05080F] font-semibold px-8"
                onClick={handleEnterVault}
              >
                Enter the Vault
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-[#C6A87C]/50 text-[#C6A87C] hover:bg-[#C6A87C]/10 font-semibold px-6 flex items-center gap-2"
                onClick={handleCreateAccount}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Create Account
              </Button>
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
      
      {/* Labyrinth Definition Popup */}
      <AnimatePresence>
        {showLabyrinthPopup && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
              onClick={closeLabyrinthPopup}
              onMouseEnter={handlePopupMouseLeave}
              style={{ touchAction: 'none' }}
            />
            
            {/* Popup Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 pointer-events-none"
              style={{ touchAction: 'none' }}
            >
              {/* Modal wrapper */}
              <div 
                className="relative pointer-events-auto"
                onMouseEnter={handlePopupMouseEnter}
                onMouseLeave={handlePopupMouseLeave}
              >
                {/* Close button - mobile only */}
                <button
                  onClick={closeLabyrinthPopup}
                  className="sm:hidden absolute -top-12 right-0 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-[#0B1221]/90 border border-[#C6A87C]/40 hover:border-[#C6A87C] hover:bg-[#0B1221] text-[#C6A87C]/70 hover:text-[#C6A87C] transition-all duration-200"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" weight="bold" />
                </button>
                
                {/* Modal Content - no scroll on desktop */}
                <div 
                  className="relative bg-[#0B1221] border border-[#C6A87C]/30 rounded-2xl overflow-hidden shadow-2xl w-full max-w-md sm:max-w-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Content area - scrollable on mobile only */}
                  <div className="max-h-[80vh] sm:max-h-none overflow-y-auto sm:overflow-hidden">
                    {/* Labyrinth Image */}
                    <div className="relative w-full">
                      <div className="aspect-[4/3] sm:aspect-[16/10] flex items-center justify-center overflow-hidden">
                        <img
                          src={LABYRINTH_IMAGE}
                          alt="Hedge Maze Labyrinth"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#0B1221]/60 via-transparent to-transparent" />
                    </div>
                    
                    {/* Content */}
                    <div className="p-5 sm:p-6 text-center">
                      <h3 className="text-lg sm:text-xl font-semibold text-[#C6A87C] mb-3 flex items-center justify-center gap-2">
                        <span className="text-2xl">🌀</span>
                        What is a Labyrinth?
                      </h3>
                      <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                        {LABYRINTH_DEFINITION}
                      </p>
                      
                      {/* Visual divider */}
                      <div className="mt-5 pt-4 border-t border-white/10">
                        <p className="text-xs text-slate-500 italic">
                          Like navigating a labyrinth, trust governance requires a clear path to the center.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
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
