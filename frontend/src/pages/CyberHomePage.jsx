import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  CaretRight,
  CheckCircle,
  Command,
  CurrencyDollar,
  FileText,
  Gavel,
  Gear,
  Lightning,
  Lock,
  MagnifyingGlass,
  Notebook,
  Pulse,
  Scales,
  ShieldCheck,
  SignIn,
  Sparkle,
  Timer,
  Users,
  Vault,
  Eye,
  ClockCounterClockwise,
  X
} from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

// Demo Data
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
  { id: 1, title: 'Meeting Minutes Pack', desc: 'Annual & Special meetings', icon: Notebook },
  { id: 2, title: 'Resolution Pack', desc: 'Trustee resolutions & amendments', icon: FileText },
  { id: 3, title: 'Distribution Receipt', desc: 'Beneficiary payment records', icon: CurrencyDollar },
  { id: 4, title: 'Insurance Summary', desc: 'Policy overview documents', icon: ShieldCheck },
  { id: 5, title: 'Trustee Time Log', desc: 'Compensation tracking sheets', icon: Timer },
  { id: 6, title: 'Dispute Summary', desc: 'Case documentation templates', icon: Gavel },
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

// Trust Health Card
const TrustHealthCard = () => {
  const score = 87;
  const nextActions = [
    { task: 'Review Q4 distribution schedule', priority: 'high' },
    { task: 'Update insurance beneficiaries', priority: 'medium' },
    { task: 'Approve trustee compensation', priority: 'low' },
  ];
  
  return (
    <HoloCard className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Trust Health</h3>
          <p className="text-sm text-slate-400">Overall governance score</p>
        </div>
        <IconChip icon={Pulse} label="Live" variant="green" />
      </div>
      
      {/* Score */}
      <div className="flex items-end gap-4 mb-6">
        <div className="text-5xl font-bold text-[#C6A87C]">{score}</div>
        <div className="pb-2">
          <span className="text-sm text-emerald-400">+3</span>
          <span className="text-xs text-slate-500 ml-1">this week</span>
        </div>
      </div>
      
      {/* Mini trend */}
      <div className="h-12 mb-6 flex items-end gap-1">
        {[65, 70, 68, 75, 80, 85, 87].map((val, i) => (
          <div
            key={i}
            className="flex-1 bg-[#C6A87C]/20 rounded-t"
            style={{ height: `${val}%` }}
          />
        ))}
      </div>
      
      {/* Next Actions */}
      <div className="space-y-2 mb-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider">Next Actions</p>
        {nextActions.map((action, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className={`w-1.5 h-1.5 rounded-full ${
              action.priority === 'high' ? 'bg-red-400' :
              action.priority === 'medium' ? 'bg-amber-400' : 'bg-slate-400'
            }`} />
            <span className="text-slate-300">{action.task}</span>
          </div>
        ))}
      </div>
      
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 border-[#C6A87C]/30 text-[#C6A87C] hover:bg-[#C6A87C]/10">
          View Dashboard
        </Button>
        <Button variant="outline" size="sm" className="border-white/10 text-slate-400 hover:bg-white/5">
          Digest
        </Button>
      </div>
    </HoloCard>
  );
};

// Governance Matrix Section (replaces Trust Radar)
const GovernanceMatrixSection = () => {
  const navigate = useNavigate();
  
  return (
    <section id="matrix" className="py-16 lg:py-24 bg-[#0B1221]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
        >
          {/* Header */}
          <motion.div variants={fadeInUp} className="mb-10">
            <IconChip icon={Gear} label="Governance Matrix" variant="gold" />
            <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-white">
              The console for trust operations.
            </h2>
            <p className="mt-3 text-slate-400 max-w-2xl">
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
                  className="p-5 cursor-pointer"
                  onClick={() => navigate(`/vault/governance?tab=${module.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
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
          
          {/* CTA Row */}
          <motion.div variants={fadeInUp} className="mt-8 flex flex-wrap items-center gap-4">
            <Link to="/vault/governance">
              <Button className="bg-[#C6A87C] hover:bg-[#C6A87C]/90 text-[#05080F] font-semibold">
                Open Governance Console
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/vault/governance?tab=meetings" className="text-sm text-[#C6A87C] hover:text-[#C6A87C]/80 flex items-center gap-1">
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
  const featuresRef = useRef(null);
  const isInView = useInView(featuresRef, { once: true, margin: '-100px' });
  
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
            <div className="flex items-center gap-3">
              {/* Command palette hint */}
              <button
                onClick={() => setShowCommandPalette(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-400 hover:border-[#C6A87C]/30 transition-colors"
              >
                <MagnifyingGlass className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Search</span>
                <kbd className="ml-2 px-1.5 py-0.5 bg-white/5 rounded text-[10px]">⌘K</kbd>
              </button>
              
              <Link to="/vault">
                <Button className="bg-[#C6A87C] hover:bg-[#C6A87C]/90 text-[#05080F] font-semibold text-sm">
                  <span className="hidden sm:inline">Enter Vault</span>
                  <span className="sm:hidden">Vault</span>
                </Button>
              </Link>
              
              <Link to="/vault">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/5 text-sm">
                  <SignIn className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>
      
      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[100dvh] flex items-center pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1221] via-transparent to-[#05080F]" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24">
          <div className="max-w-3xl">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp}>
                <IconChip icon={Vault} label="Trust Matrix" variant="gold" />
              </motion.div>
              
              <motion.h1 
                variants={fadeInUp}
                className="mt-6 text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1]"
              >
                <span className="text-[#C6A87C]">OMNIGOVAULT</span>
              </motion.h1>
              
              <motion.h2
                variants={fadeInUp}
                className="mt-4 text-xl sm:text-2xl lg:text-3xl text-slate-300 font-light"
              >
                A matrix system for trust governance.
              </motion.h2>
              
              <motion.p 
                variants={fadeInUp}
                className="mt-6 text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed"
              >
                Every decision. Every distribution. Every signature—tracked in a living ledger with immutable audit trails.
              </motion.p>
              
              <motion.div variants={fadeInUp} className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link to="/vault">
                  <Button size="lg" className="w-full sm:w-auto bg-[#C6A87C] hover:bg-[#C6A87C]/90 text-[#05080F] font-semibold">
                    Enter the Vault
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/vault/governance">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/20 text-white hover:bg-white/5">
                    Open Governance Console
                  </Button>
                </Link>
              </motion.div>
              
              {/* Microcopy */}
              <motion.p variants={fadeInUp} className="mt-4 text-xs text-slate-500 flex items-center gap-2">
                <ClockCounterClockwise className="w-3.5 h-3.5" />
                Draft → Finalize → Amend (with traceable history).
              </motion.p>
              
              {/* Stats */}
              <motion.div variants={fadeInUp} className="mt-12 flex flex-wrap gap-6 sm:gap-8">
                {[
                  { value: '500+', label: 'Trusts Managed' },
                  { value: '10k+', label: 'Documents Filed' },
                  { value: '99.9%', label: 'Uptime' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-sm text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-1.5 bg-[#C6A87C] rounded-full" />
          </div>
        </motion.div>
      </section>
      
      {/* ===== GOVERNANCE MATRIX SECTION (replaces Trust Radar) ===== */}
      <GovernanceMatrixSection />
      
      {/* ===== SIGNAL FEED SECTION ===== */}
      <section id="signals" className="py-16 lg:py-24 bg-gradient-to-b from-[#0B1221] to-[#05080F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Signal Feed */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp} className="flex items-center justify-between mb-6">
                <div>
                  <IconChip icon={Pulse} label="Live Feed" variant="green" />
                  <h2 className="mt-4 text-2xl font-bold text-white">Signal Console</h2>
                  <p className="text-slate-400">Real-time governance activity</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`border-white/10 ${demoMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'text-slate-400'}`}
                  onClick={() => setDemoMode(!demoMode)}
                >
                  {demoMode ? 'Demo Active' : 'Load Demo'}
                </Button>
              </motion.div>
              
              <motion.div variants={fadeInUp}>
                <HoloCard className="p-4">
                  <SignalFeed signals={DEMO_SIGNALS} />
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
      <section id="scenarios" className="py-16 lg:py-24 bg-[#05080F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center mb-10">
              <IconChip icon={BookOpen} label="Case Studies" variant="gold" />
              <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-white">Real-World Scenarios</h2>
              <p className="mt-3 text-slate-400">See how OMNIGOVAULT solves common governance challenges</p>
            </motion.div>
            
            <motion.div variants={fadeInUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SCENARIOS.map((scenario) => {
                const Icon = scenario.icon;
                return (
                  <HoloCard key={scenario.id} className="p-5 cursor-pointer">
                    <Icon className="w-8 h-8 text-[#C6A87C] mb-4" weight="duotone" />
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
      <section id="learn" className="py-16 lg:py-24 bg-gradient-to-b from-[#05080F] to-[#0B1221]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-10">
              <div>
                <IconChip icon={Sparkle} label="Education" variant="gold" />
                <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-white">Maxims Explorer</h2>
                <p className="mt-2 text-slate-400">Master the foundational principles of equity law</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                  <Lightning className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400">3-day streak</span>
                </div>
                <Button className="bg-[#C6A87C] hover:bg-[#C6A87C]/90 text-[#05080F]">
                  Start Learning
                </Button>
              </div>
            </motion.div>
            
            <motion.div variants={fadeInUp} className="grid sm:grid-cols-3 gap-4">
              {MAXIMS.map((maxim) => (
                <HoloCard key={maxim.id} className="p-6 cursor-pointer group" hover>
                  <IconChip label={maxim.category} variant="default" />
                  <div className="mt-4 h-24 flex items-center">
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
      <section id="templates" className="py-16 lg:py-24 bg-[#0B1221]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center mb-10">
              <IconChip icon={FileText} label="Templates" variant="gold" />
              <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-white">Template Vault</h2>
              <p className="mt-3 text-slate-400">Professional document templates for every governance need</p>
            </motion.div>
            
            <motion.div variants={fadeInUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TEMPLATES.map((template) => {
                const Icon = template.icon;
                return (
                  <HoloCard key={template.id} className="p-5 cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[#C6A87C]/10 flex items-center justify-center shrink-0">
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
            
            <motion.div variants={fadeInUp} className="mt-8 text-center">
              <Link to="/vault/documents">
                <Button variant="outline" className="border-[#C6A87C]/30 text-[#C6A87C] hover:bg-[#C6A87C]/10">
                  Browse All Templates <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* ===== FINAL CTA ===== */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-[#0B1221] to-[#05080F]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <Vault className="w-16 h-16 text-[#C6A87C] mx-auto mb-6" weight="duotone" />
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
              Ready to Transform Your Trust Governance?
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-base sm:text-lg text-slate-400 mb-8">
              Start with our demo or create your secure vault today.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/vault">
                <Button size="lg" className="w-full sm:w-auto bg-[#C6A87C] hover:bg-[#C6A87C]/90 text-[#05080F] font-semibold">
                  Enter the Vault
                </Button>
              </Link>
              <Link to="/vault/governance">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/20 text-white hover:bg-white/5">
                  Open Governance Console
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* ===== FOOTER ===== */}
      <footer className="py-12 bg-[#05080F] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-2">
              <Vault className="w-6 h-6 text-[#C6A87C]" weight="duotone" />
              <span className="font-semibold text-white">OMNIGOVAULT</span>
            </div>
            
            <div className="flex flex-wrap gap-6 text-sm text-slate-500">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Security</a>
              <a href="#" className="hover:text-white transition-colors">Changelog</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-white/5">
            <p className="text-xs text-slate-600 text-center">
              OMNIGOVAULT is for informational purposes only and does not constitute legal advice. 
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
