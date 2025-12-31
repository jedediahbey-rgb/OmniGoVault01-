import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import axios from 'axios';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow,
  useNodesInitialized,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Archive,
  Books,
  BookOpen,
  Brain,
  CaretRight,
  Certificate,
  Clock,
  Eye,
  File,
  FileText,
  Folders,
  GitBranch,
  Lightning,
  MagnifyingGlass,
  MapTrifold,
  Scales,
  Seal,
  SealCheck,
  ShieldWarning,
  Sparkle,
  Stack,
  Tag,
  TreeStructure,
  Warning,
  X
} from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ============================================================================
// ANIMATED BLACK ARCHIVE ICON - Exclusive Dynamic Symbol
// ============================================================================
const BlackArchiveIcon = ({ size = 'lg', animate = true }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };
  
  return (
    <div className={`${sizeClasses[size]} relative`}>
      {/* Outer rotating ring */}
      <motion.div
        className="absolute inset-0 rounded-xl will-change-transform"
        style={{
          background: 'conic-gradient(from 0deg, transparent, rgba(198, 168, 124, 0.3), transparent, rgba(198, 168, 124, 0.1), transparent)',
        }}
        animate={animate ? { rotate: 360 } : {}}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Inner counter-rotating ring */}
      <motion.div
        className="absolute inset-1 rounded-lg will-change-transform"
        style={{
          background: 'conic-gradient(from 180deg, transparent, rgba(139, 92, 246, 0.2), transparent, rgba(198, 168, 124, 0.2), transparent)',
        }}
        animate={animate ? { rotate: -360 } : {}}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Core background */}
      <div className="absolute inset-2 rounded-lg bg-black/90 border border-vault-gold/30" />
      
      {/* Mystical eye symbol */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative"
          animate={animate ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg viewBox="0 0 40 40" className="w-8 h-8" style={{ filter: 'drop-shadow(0 0 8px rgba(198, 168, 124, 0.5))' }}>
            {/* Decorative outer triangles */}
            <motion.path
              d="M20 4 L24 12 L16 12 Z"
              fill="none"
              stroke="rgba(198, 168, 124, 0.6)"
              strokeWidth="0.5"
              animate={animate ? { opacity: [0.4, 1, 0.4] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.path
              d="M20 36 L24 28 L16 28 Z"
              fill="none"
              stroke="rgba(198, 168, 124, 0.6)"
              strokeWidth="0.5"
              animate={animate ? { opacity: [0.4, 1, 0.4] } : {}}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            />
            
            {/* Eye shape */}
            <path
              d="M6 20 Q20 8 34 20 Q20 32 6 20"
              fill="none"
              stroke="rgba(198, 168, 124, 0.8)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            
            {/* Pupil */}
            <motion.circle
              cx="20"
              cy="20"
              r="5"
              fill="rgba(198, 168, 124, 0.3)"
              stroke="rgba(198, 168, 124, 1)"
              strokeWidth="1"
              animate={animate ? { r: [5, 6, 5] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            
            {/* Inner dot */}
            <motion.circle
              cx="20"
              cy="20"
              r="2"
              fill="rgba(198, 168, 124, 1)"
              animate={animate ? { opacity: [0.6, 1, 0.6] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </svg>
        </motion.div>
      </div>
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-vault-gold/50 rounded-tl" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-vault-gold/50 rounded-tr" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-vault-gold/50 rounded-bl" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-vault-gold/50 rounded-br" />
    </div>
  );
};

// ============================================================================
// FLOATING PARTICLES BACKGROUND
// ============================================================================

// Pre-generated particle positions - REDUCED for mobile performance
const PARTICLE_POSITIONS_DESKTOP = [
  { left: 12, top: 8, duration: 5.2, delay: 0.3, size: 'lg' },
  { left: 85, top: 15, duration: 4.8, delay: 1.2, size: 'md' },
  { left: 23, top: 45, duration: 6.1, delay: 0.8, size: 'sm' },
  { left: 67, top: 72, duration: 5.5, delay: 1.8, size: 'lg' },
  { left: 45, top: 28, duration: 4.3, delay: 0.5, size: 'md' },
  { left: 91, top: 55, duration: 5.9, delay: 1.1, size: 'sm' },
  { left: 34, top: 82, duration: 4.6, delay: 0.2, size: 'lg' },
  { left: 78, top: 38, duration: 5.3, delay: 1.5, size: 'md' },
  { left: 56, top: 91, duration: 6.4, delay: 0.9, size: 'sm' },
  { left: 8, top: 62, duration: 4.9, delay: 1.7, size: 'lg' },
  { left: 42, top: 12, duration: 5.7, delay: 0.4, size: 'md' },
  { left: 95, top: 85, duration: 4.2, delay: 1.3, size: 'sm' },
  { left: 18, top: 33, duration: 6.0, delay: 0.6, size: 'lg' },
  { left: 72, top: 19, duration: 5.1, delay: 1.9, size: 'md' },
  { left: 51, top: 68, duration: 4.7, delay: 0.1, size: 'sm' },
  { left: 29, top: 95, duration: 5.8, delay: 1.4, size: 'lg' },
  { left: 83, top: 42, duration: 4.4, delay: 0.7, size: 'md' },
  { left: 6, top: 78, duration: 6.2, delay: 1.6, size: 'sm' },
  { left: 61, top: 5, duration: 5.0, delay: 1.0, size: 'lg' },
  { left: 38, top: 58, duration: 4.5, delay: 0.0, size: 'md' },
];

// Only 6 particles for mobile - much lighter
const PARTICLE_POSITIONS_MOBILE = [
  { left: 15, top: 20, duration: 6, delay: 0, size: 'md' },
  { left: 75, top: 15, duration: 7, delay: 1, size: 'lg' },
  { left: 45, top: 60, duration: 5.5, delay: 0.5, size: 'md' },
  { left: 85, top: 70, duration: 6.5, delay: 1.5, size: 'sm' },
  { left: 25, top: 80, duration: 5, delay: 2, size: 'lg' },
  { left: 60, top: 35, duration: 7, delay: 0.8, size: 'md' },
];

const FloatingParticles = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const particles = isMobile ? PARTICLE_POSITIONS_MOBILE : PARTICLE_POSITIONS_DESKTOP;
  
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2'
  };
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${sizeClasses[particle.size]}`}
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            background: i % 3 === 0 
              ? 'rgba(198, 168, 124, 0.6)' 
              : i % 3 === 1 
                ? 'rgba(198, 168, 124, 0.4)'
                : 'rgba(139, 92, 246, 0.4)',
            // GPU acceleration
            willChange: 'transform, opacity',
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

// ============================================================================
// MOBILE SEGMENTED TAB CONTROL - Luxury Glass Style
// ============================================================================
const MobileSegmentedTabs = ({ tabs, activeTab, onTabChange }) => {
  const primaryTabs = tabs.slice(0, 2); // First 2 tabs always visible
  const secondaryTabs = tabs.slice(2);  // Remaining tabs in scrollable row
  
  return (
    <div className="space-y-3">
      {/* Primary tabs - 2-column grid, always visible */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-white/[0.03] backdrop-blur-md rounded-xl border border-white/10">
        {primaryTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center justify-center gap-2 py-3 px-3 rounded-lg text-sm font-medium transition-all overflow-hidden ${
                isActive ? 'text-black' : 'text-white/60'
              }`}
              whileTap={{ scale: 0.98 }}
            >
              {isActive && (
                <motion.div
                  layoutId="mobileActiveTab"
                  className="absolute inset-0 bg-gradient-to-r from-vault-gold via-amber-400 to-vault-gold rounded-lg"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent rounded-lg"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                  />
                </motion.div>
              )}
              <tab.icon className="w-4 h-4 relative z-10 shrink-0" weight={isActive ? 'fill' : 'duotone'} />
              <span className="relative z-10 truncate">{tab.label}</span>
            </motion.button>
          );
        })}
      </div>
      
      {/* Secondary tabs - horizontal scroll chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {secondaryTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center gap-2 py-2.5 px-4 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-vault-gold/20 text-vault-gold border border-vault-gold/30'
                  : 'bg-white/[0.03] text-white/50 border border-white/10 hover:bg-white/[0.06] hover:text-white/70'
              }`}
              whileTap={{ scale: 0.98 }}
            >
              <tab.icon className="w-3.5 h-3.5" weight={isActive ? 'fill' : 'duotone'} />
              <span>{tab.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// DESKTOP PREMIUM TAB WITH EFFECTS
// ============================================================================
const DesktopPremiumTab = ({ tab, isActive, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.button
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`relative flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-colors overflow-hidden ${
        isActive ? 'text-black' : 'text-white/60 hover:text-white'
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {isActive && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-vault-gold via-amber-400 to-vault-gold"
          layoutId="desktopActiveTab"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}
      
      {!isActive && isHovered && (
        <motion.div
          className="absolute inset-0 bg-white/5 rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}
      
      <motion.div
        animate={isActive ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        <tab.icon className="w-4 h-4" weight={isActive ? 'fill' : 'duotone'} />
      </motion.div>
      
      <span className="relative z-10">{tab.label}</span>
      
      {!isActive && (
        <motion.div
          className="absolute inset-0 rounded-xl border border-vault-gold/0"
          animate={{ borderColor: isHovered ? 'rgba(198, 168, 124, 0.3)' : 'rgba(198, 168, 124, 0)' }}
        />
      )}
    </motion.button>
  );
};

// Tab configurations
const TABS = [
  { id: 'index', label: 'Black Index', icon: Books, shortLabel: 'Index' },
  { id: 'trails', label: 'Doctrine Tracks', icon: GitBranch, shortLabel: 'Tracks' },
  { id: 'claims', label: 'Dossiers', icon: FileText, shortLabel: 'Dossiers' },
  { id: 'map', label: 'Archive Map', icon: MapTrifold, shortLabel: 'Map' },
  { id: 'reading', label: 'Archive Desk', icon: Brain, shortLabel: 'Desk' }
];

// Type badges
const TYPE_BADGES = {
  PRIMARY_SOURCE: { label: 'Primary', color: 'bg-vault-gold/20 text-vault-gold border-vault-gold/30' },
  SUPPORTED_INTERPRETATION: { label: 'Interpretation', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  HYPOTHESIS: { label: 'Hypothesis', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' }
};

// Status badges
const STATUS_BADGES = {
  VERIFIED: { label: 'Verified', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: SealCheck },
  DISPUTED: { label: 'Disputed', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Warning },
  UNVERIFIED: { label: 'Unverified', color: 'bg-white/10 text-white/50 border-white/20', icon: ShieldWarning }
};

// Topic options
const TOPICS = [
  'Trusts', 'Equity', 'Fiduciary Duties', 'Negotiable Instruments', 
  'Monetary History', 'Legal Tender', 'Constitutional Structure'
];

// Era options
const ERAS = ['1600-1900', '1900-1932', '1933-1945', 'Modern'];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// ============================================================================
// PREMIUM SOURCE CARD WITH HOVER EFFECTS
// ============================================================================
function SourceCard({ source, onClick, index }) {
  const badge = TYPE_BADGES[source.source_type] || TYPE_BADGES.HYPOTHESIS;
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className="relative p-4 bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-xl cursor-pointer group overflow-hidden"
      whileHover={{ y: -2, borderColor: 'rgba(198, 168, 124, 0.4)' }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-vault-gold/5 to-transparent opacity-0"
        animate={{ opacity: isHovered ? 1 : 0 }}
      />
      
      {/* Scanning line effect on hover */}
      {isHovered && (
        <motion.div
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-vault-gold/50 to-transparent"
          initial={{ top: 0 }}
          animate={{ top: '100%' }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
      
      <div className="relative flex items-start gap-3">
        {source.source_type === 'PRIMARY_SOURCE' && (
          <motion.div 
            className="w-10 h-10 rounded-lg bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center shrink-0"
            animate={isHovered ? { scale: [1, 1.1, 1], rotate: [0, 5, 0] } : {}}
            transition={{ duration: 0.5 }}
          >
            <Seal className="w-5 h-5 text-vault-gold" weight="fill" />
          </motion.div>
        )}
        {source.source_type !== 'PRIMARY_SOURCE' && (
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-white/20 transition-colors">
            <BookOpen className="w-5 h-5 text-white/50 group-hover:text-white/70 transition-colors" weight="duotone" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-white font-medium text-sm line-clamp-2 group-hover:text-vault-gold/90 transition-colors">{source.title}</h3>
            <motion.span 
              className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium border ${badge.color}`}
              whileHover={{ scale: 1.05 }}
            >
              {badge.label}
            </motion.span>
          </div>
          
          <p className="text-vault-gold/60 text-xs font-mono mb-2">{source.citation}</p>
          
          {source.excerpt && (
            <p className="text-white/50 text-xs line-clamp-2">{source.excerpt}</p>
          )}
          
          <div className="flex items-center gap-2 mt-2">
            {source.jurisdiction && (
              <span className="text-white/30 text-[10px]">{source.jurisdiction}</span>
            )}
            {source.era_tags?.[0] && (
              <span className="text-white/30 text-[10px]">• {source.era_tags[0]}</span>
            )}
          </div>
        </div>
        
        {/* View indicator */}
        <motion.div
          className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
          initial={{ x: -10 }}
          animate={{ x: isHovered ? 0 : -10 }}
        >
          <Eye className="w-4 h-4 text-vault-gold/50" weight="duotone" />
        </motion.div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// PREMIUM CLAIM CARD (DOSSIER) WITH EFFECTS
// ============================================================================
function ClaimCard({ claim, onClick, index }) {
  const status = STATUS_BADGES[claim.status] || STATUS_BADGES.UNVERIFIED;
  const StatusIcon = status.icon;
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className="relative p-5 bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-xl cursor-pointer overflow-hidden group"
      whileHover={{ y: -4, boxShadow: '0 20px 40px -20px rgba(198, 168, 124, 0.2)' }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Animated border gradient */}
      <motion.div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'linear-gradient(135deg, rgba(198, 168, 124, 0.2) 0%, transparent 50%, rgba(198, 168, 124, 0.1) 100%)',
        }}
      />
      
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-4 h-4">
        <motion.div
          className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-vault-gold/50 to-transparent"
          animate={{ scaleX: isHovered ? 1 : 0.5 }}
        />
        <motion.div
          className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-vault-gold/50 to-transparent"
          animate={{ scaleY: isHovered ? 1 : 0.5 }}
        />
      </div>
      <div className="absolute bottom-0 right-0 w-4 h-4">
        <motion.div
          className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-l from-vault-gold/50 to-transparent"
          animate={{ scaleX: isHovered ? 1 : 0.5 }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-px h-full bg-gradient-to-t from-vault-gold/50 to-transparent"
          animate={{ scaleY: isHovered ? 1 : 0.5 }}
        />
      </div>
      
      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-3">
          <motion.div 
            className="w-12 h-12 rounded-xl bg-[#0a0f1a] border border-white/10 flex items-center justify-center shrink-0 group-hover:border-vault-gold/30 transition-colors"
            animate={isHovered ? { rotate: [0, -5, 5, 0] } : {}}
            transition={{ duration: 0.5 }}
          >
            <Certificate className="w-6 h-6 text-vault-gold" weight="duotone" />
          </motion.div>
          <motion.span 
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${status.color}`}
            whileHover={{ scale: 1.05 }}
          >
            <StatusIcon className="w-3.5 h-3.5" weight="fill" />
            {status.label}
          </motion.span>
        </div>
        
        <h3 className="text-white font-heading text-base mb-2 line-clamp-2 group-hover:text-vault-gold/90 transition-colors">{claim.title}</h3>
        <p className="text-white/50 text-sm line-clamp-3 mb-3">{claim.body}</p>
        
        <div className="flex items-center gap-3 text-xs">
          <motion.span 
            className="text-vault-gold/60 flex items-center gap-1"
            animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
          >
            <Stack className="w-3.5 h-3.5" />
            {claim.evidence_source_ids?.length || 0} sources
          </motion.span>
          {claim.counter_source_ids?.length > 0 && (
            <motion.span 
              className="text-orange-400/60 flex items-center gap-1"
              animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
            >
              <Warning className="w-3.5 h-3.5" />
              {claim.counter_source_ids.length} counter
            </motion.span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// PREMIUM TRAIL CARD WITH EFFECTS
// ============================================================================
function TrailCard({ trail, onClick, index }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className="relative p-5 bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-xl cursor-pointer group overflow-hidden"
      whileHover={{ 
        y: -3, 
        borderColor: 'rgba(198, 168, 124, 0.4)',
        boxShadow: '0 15px 30px -10px rgba(198, 168, 124, 0.15)'
      }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Animated path line */}
      <motion.div
        className="absolute left-8 top-0 bottom-0 w-px"
        style={{
          background: isHovered 
            ? 'linear-gradient(to bottom, transparent, rgba(198, 168, 124, 0.5), transparent)'
            : 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.1), transparent)'
        }}
      />
      
      {/* Moving dot on path */}
      {isHovered && (
        <motion.div
          className="absolute left-[30px] w-2 h-2 rounded-full bg-vault-gold shadow-[0_0_10px_rgba(198,168,124,0.8)]"
          initial={{ top: 0 }}
          animate={{ top: '100%' }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      )}
      
      <div className="flex items-start gap-4">
        <motion.div 
          className="w-14 h-14 rounded-xl bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center shrink-0 group-hover:bg-vault-gold/20 transition-colors"
          animate={isHovered ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.4 }}
        >
          <TreeStructure className="w-7 h-7 text-vault-gold" weight="duotone" />
        </motion.div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-heading text-lg mb-1 group-hover:text-vault-gold transition-colors">{trail.title}</h3>
          <p className="text-white/50 text-sm line-clamp-2 mb-3">{trail.description}</p>
          
          <div className="flex items-center gap-4 text-xs">
            <motion.span 
              className="text-vault-gold/60 flex items-center gap-1"
              animate={isHovered ? { x: [0, 3, 0] } : {}}
              transition={{ duration: 0.5 }}
            >
              <Lightning className="w-3.5 h-3.5" />
              {trail.steps?.length || 0} steps
            </motion.span>
            <span className="text-white/40 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              {trail.topic_tags?.join(', ')}
            </span>
          </div>
        </div>
        
        <motion.div
          className="shrink-0"
          animate={{ x: isHovered ? 5 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <CaretRight className="w-5 h-5 text-white/20 group-hover:text-vault-gold transition-colors" weight="bold" />
        </motion.div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// INDEX TAB
// ============================================================================

function IndexTab() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    topic: '',
    jurisdiction: '',
    era: ''
  });
  const [selectedSource, setSelectedSource] = useState(null);
  
  // Check if any filters are active
  const hasActiveFilters = filters.type || filters.topic || filters.era;
  
  const clearFilters = () => {
    setFilters({ type: '', topic: '', jurisdiction: '', era: '' });
    setSearch('');
  };
  
  useEffect(() => {
    fetchSources();
  }, [filters]);
  
  const fetchSources = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filters.type) params.append('source_type', filters.type);
      if (filters.topic) params.append('topic', filters.topic);
      if (filters.jurisdiction) params.append('jurisdiction', filters.jurisdiction);
      if (filters.era) params.append('era', filters.era);
      
      const res = await axios.get(`${API}/archive/sources?${params}`);
      setSources(res.data.sources || []);
    } catch (err) {
      console.error('Failed to fetch sources:', err);
      // Try seeding if empty
      if (err.response?.status === 401) return;
      try {
        await axios.post(`${API}/archive/seed`);
        const res = await axios.get(`${API}/archive/sources`);
        setSources(res.data.sources || []);
      } catch (seedErr) {
        console.log('Could not seed archive');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    fetchSources();
  };
  
  return (
    <div className="w-full">
      {/* Search & Filters - Mobile Optimized */}
      <div className="mb-6 space-y-3">
        {/* Search bar - full width */}
        <form onSubmit={handleSearch} className="relative w-full">
          <MagnifyingGlass className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-white/40" />
          <Input
            placeholder="Search sources, citations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 sm:pl-12 py-3 bg-white/[0.04] backdrop-blur-sm border-white/10 focus:border-vault-gold/50 focus:bg-white/[0.06] text-white text-sm sm:text-base rounded-xl transition-all"
          />
        </form>
        
        {/* Filters - responsive grid */}
        <div className="grid grid-cols-3 gap-2 w-full">
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="w-full px-2.5 sm:px-3 py-2.5 bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-xl text-white text-xs sm:text-sm focus:border-vault-gold/50 focus:bg-white/[0.06] outline-none transition-all appearance-none cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23ffffff50' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em', paddingRight: '2rem' }}
          >
            <option value="">All Types</option>
            <option value="PRIMARY_SOURCE">Primary</option>
            <option value="SUPPORTED_INTERPRETATION">Interp.</option>
            <option value="HYPOTHESIS">Hypothesis</option>
          </select>
          
          <select
            value={filters.topic}
            onChange={(e) => setFilters({ ...filters, topic: e.target.value })}
            className="w-full px-2.5 sm:px-3 py-2.5 bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-xl text-white text-xs sm:text-sm focus:border-vault-gold/50 focus:bg-white/[0.06] outline-none transition-all appearance-none cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23ffffff50' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em', paddingRight: '2rem' }}
          >
            <option value="">All Topics</option>
            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          
          <select
            value={filters.era}
            onChange={(e) => setFilters({ ...filters, era: e.target.value })}
            className="w-full px-2.5 sm:px-3 py-2.5 bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-xl text-white text-xs sm:text-sm focus:border-vault-gold/50 focus:bg-white/[0.06] outline-none transition-all appearance-none cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23ffffff50' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em', paddingRight: '2rem' }}
          >
            <option value="">All Eras</option>
            {ERAS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>
      
      {/* Results */}
      {loading ? (
        <div className="grid gap-3 sm:gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-28 sm:h-32 bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden relative">
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
          ))}
        </div>
      ) : sources.length > 0 ? (
        <div className="grid gap-3 sm:gap-4">
          {sources.map((source, index) => (
            <SourceCard key={source.source_id} source={source} index={index} onClick={() => setSelectedSource(source)} />
          ))}
        </div>
      ) : (
        /* Premium Empty State - Black Index with Dynamic Visual Effect */
        <div className="text-center py-12 sm:py-16">
          <motion.div 
            className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-6"
            whileHover={{ scale: 1.05 }}
          >
            {/* Outer rotating ring with gradient */}
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'conic-gradient(from 0deg, transparent, rgba(198, 168, 124, 0.4), transparent, rgba(198, 168, 124, 0.2), transparent)',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            />
            
            {/* Counter-rotating inner ring */}
            <motion.div
              className="absolute inset-1 rounded-xl"
              style={{
                background: 'conic-gradient(from 180deg, transparent, rgba(139, 92, 246, 0.2), transparent, rgba(198, 168, 124, 0.15), transparent)',
              }}
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            />
            
            {/* Pulsing glow rings */}
            <motion.div
              className="absolute inset-2 rounded-xl border border-vault-gold/30"
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-2 rounded-xl border border-vault-gold/20"
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2, delay: 0.5, repeat: Infinity }}
            />
            
            {/* Main container with glass effect */}
            <div className="absolute inset-3 rounded-lg bg-gradient-to-br from-vault-gold/20 to-vault-gold/5 border border-vault-gold/40 backdrop-blur-sm overflow-hidden">
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(45deg, transparent 30%, rgba(198, 168, 124, 0.15) 50%, transparent 70%)',
                  backgroundSize: '200% 200%',
                }}
                animate={{ backgroundPosition: ['0% 0%', '200% 200%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            
            {/* Floating particles around icon */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-vault-gold/60"
                style={{
                  top: '50%',
                  left: '50%',
                }}
                animate={{
                  x: [
                    Math.cos((angle * Math.PI) / 180) * 35,
                    Math.cos(((angle + 30) * Math.PI) / 180) * 40,
                    Math.cos((angle * Math.PI) / 180) * 35,
                  ],
                  y: [
                    Math.sin((angle * Math.PI) / 180) * 35,
                    Math.sin(((angle + 30) * Math.PI) / 180) * 40,
                    Math.sin((angle * Math.PI) / 180) * 35,
                  ],
                  opacity: [0.4, 0.8, 0.4],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 3,
                  delay: i * 0.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
            
            {/* Icon with glow */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Books 
                  className="w-10 h-10 sm:w-12 sm:h-12 text-vault-gold drop-shadow-[0_0_10px_rgba(198,168,124,0.5)]" 
                  weight="duotone" 
                />
              </motion.div>
            </div>
            
            {/* Corner sparkles */}
            <motion.div
              className="absolute top-1 right-1 w-2 h-2"
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0 }}
            >
              <Sparkle className="w-full h-full text-vault-gold" weight="fill" />
            </motion.div>
            <motion.div
              className="absolute bottom-1 left-1 w-2 h-2"
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            >
              <Sparkle className="w-full h-full text-vault-gold" weight="fill" />
            </motion.div>
          </motion.div>
          
          <h3 className="text-white font-heading text-lg sm:text-xl mb-2">No Sources Found</h3>
          <p className="text-white/40 text-sm mb-5 max-w-xs mx-auto">
            {hasActiveFilters ? 'Try adjusting your filters' : 'Sources will appear here once available'}
          </p>
          
          {hasActiveFilters && (
            <motion.button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-vault-gold/30 rounded-lg text-white/60 hover:text-white text-sm transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <X className="w-4 h-4" />
              Clear filters
            </motion.button>
          )}
        </div>
      )}
      
      {/* Source Detail Modal */}
      <AnimatePresence>
        {selectedSource && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedSource(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-[#0a0f1a] border border-white/10 rounded-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex items-start justify-between">
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border mb-2 ${TYPE_BADGES[selectedSource.source_type]?.color}`}>
                    {TYPE_BADGES[selectedSource.source_type]?.label}
                  </span>
                  <h2 className="text-white font-heading text-xl">{selectedSource.title}</h2>
                  <p className="text-vault-gold font-mono text-sm mt-1">{selectedSource.citation}</p>
                </div>
                <button onClick={() => setSelectedSource(null)} className="text-white/40 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {selectedSource.excerpt && (
                  <div>
                    <h4 className="text-white/60 text-xs uppercase tracking-wider mb-2">Excerpt</h4>
                    <p className="text-white/80 text-sm italic border-l-2 border-vault-gold/30 pl-4">
                      &ldquo;{selectedSource.excerpt}&rdquo;
                    </p>
                  </div>
                )}
                
                {selectedSource.notes && (
                  <div>
                    <h4 className="text-white/60 text-xs uppercase tracking-wider mb-2">Notes</h4>
                    <p className="text-white/70 text-sm">{selectedSource.notes}</p>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                  {selectedSource.jurisdiction && (
                    <span className="px-2 py-1 bg-white/5 rounded text-xs text-white/50">
                      {selectedSource.jurisdiction}
                    </span>
                  )}
                  {selectedSource.era_tags?.map(era => (
                    <span key={era} className="px-2 py-1 bg-white/5 rounded text-xs text-white/50">
                      {era}
                    </span>
                  ))}
                  {selectedSource.topic_tags?.map(topic => (
                    <span key={topic} className="px-2 py-1 bg-vault-gold/10 rounded text-xs text-vault-gold/70">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="p-4 border-t border-white/10 bg-white/[0.02]">
                <p className="text-white/30 text-xs text-center">
                  Educational only. Not legal advice.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// TRAILS TAB
// ============================================================================

function TrailsTab() {
  const [trails, setTrails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrail, setSelectedTrail] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  useEffect(() => {
    fetchTrails();
  }, []);
  
  const fetchTrails = async () => {
    try {
      const res = await axios.get(`${API}/archive/trails`);
      setTrails(res.data.trails || []);
    } catch (err) {
      console.error('Failed to fetch trails:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const openTrail = async (trail) => {
    try {
      const res = await axios.get(`${API}/archive/trails/${trail.trail_id}`);
      setSelectedTrail(res.data);
      setCurrentStep(0);
    } catch (err) {
      toast.error('Failed to load trail');
    }
  };
  
  if (loading) {
    return (
      <div className="grid gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="h-32 bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden relative">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
        ))}
      </div>
    );
  }
  
  if (selectedTrail) {
    const step = selectedTrail.steps?.[currentStep];
    
    return (
      <div>
        <button
          onClick={() => setSelectedTrail(null)}
          className="flex items-center gap-2 text-white/50 hover:text-white mb-6 text-sm"
        >
          <CaretRight className="w-4 h-4 rotate-180" />
          Back to Tracks
        </button>
        
        <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
          {/* Trail Header */}
          <div className="p-6 border-b border-white/10">
            <h2 className="text-white font-heading text-2xl mb-2">{selectedTrail.title}</h2>
            <p className="text-white/50">{selectedTrail.description}</p>
            
            {/* Progress */}
            <div className="flex items-center gap-2 mt-4">
              {selectedTrail.steps?.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                    i === currentStep 
                      ? 'bg-vault-gold text-black' 
                      : i < currentStep 
                        ? 'bg-vault-gold/20 text-vault-gold' 
                        : 'bg-white/5 text-white/30'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
          
          {/* Current Step */}
          {step && (
            <div className="p-6">
              <h3 className="text-vault-gold font-heading text-xl mb-4">{step.title}</h3>
              <p className="text-white/70 leading-relaxed mb-6">{step.content}</p>
              
              {step.key_definitions?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-white/50 text-xs uppercase tracking-wider mb-2">Key Terms</h4>
                  <div className="flex flex-wrap gap-2">
                    {step.key_definitions.map(term => (
                      <span key={term} className="px-3 py-1 bg-vault-gold/10 border border-vault-gold/20 rounded-lg text-vault-gold text-sm">
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-white/10">
                <Button
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  variant="outline"
                  className="text-white/60 border-white/20 disabled:opacity-30"
                >
                  Previous
                </Button>
                
                {currentStep < (selectedTrail.steps?.length || 0) - 1 ? (
                  <Button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="btn-primary"
                  >
                    Next Step
                  </Button>
                ) : (
                  <Button
                    onClick={() => setSelectedTrail(null)}
                    className="btn-primary"
                  >
                    Complete Trail
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {/* Reality Check */}
          {selectedTrail.reality_check && currentStep === (selectedTrail.steps?.length || 0) - 1 && (
            <div className="p-6 bg-orange-500/5 border-t border-orange-500/20">
              <h4 className="text-orange-400 font-medium flex items-center gap-2 mb-2">
                <Warning className="w-5 h-5" />
                Reality Check
              </h4>
              <p className="text-white/70 text-sm">{selectedTrail.reality_check}</p>
            </div>
          )}
        </div>
        
        <p className="text-white/30 text-xs text-center mt-6">
          Educational only. Not legal advice.
        </p>
      </div>
    );
  }
  
  return (
    <div>
      {trails.length > 0 ? (
        <div className="grid gap-4">
          {trails.map((trail, index) => (
            <TrailCard key={trail.trail_id} trail={trail} index={index} onClick={() => openTrail(trail)} />
          ))}
        </div>
      ) : (
        /* Premium Empty State - Doctrine Tracks */
        <div className="text-center py-16">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5">
            {/* Rotating ring - CSS animation */}
            <div className="absolute inset-0 rounded-2xl border border-purple-500/30 animate-spin-slow" 
                 style={{ animationDuration: '10s' }} />
            {/* Main container */}
            <div className="absolute inset-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-vault-gold/10 border border-purple-500/40" />
            {/* Pulse ring - CSS */}
            <div className="absolute inset-2 rounded-lg border border-purple-400/30 animate-pulse-slow" />
            {/* Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <GitBranch className="w-10 h-10 sm:w-12 sm:h-12 text-purple-400" weight="duotone" />
            </div>
          </div>
          
          <h3 className="text-white font-heading text-lg sm:text-xl mb-2">No Tracks Available</h3>
          <p className="text-white/40 text-sm">Doctrine tracks are being curated</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CLAIMS (DOSSIERS) TAB
// ============================================================================

function ClaimsTab() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  
  useEffect(() => {
    fetchClaims();
  }, [statusFilter]);
  
  const fetchClaims = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      const res = await axios.get(`${API}/archive/claims?${params}`);
      setClaims(res.data.claims || []);
    } catch (err) {
      console.error('Failed to fetch claims:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const openClaim = async (claim) => {
    try {
      const res = await axios.get(`${API}/archive/claims/${claim.claim_id}`);
      setSelectedClaim(res.data);
    } catch (err) {
      toast.error('Failed to load dossier');
    }
  };
  
  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-48 bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden relative">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {['', 'VERIFIED', 'DISPUTED', 'UNVERIFIED'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-vault-gold text-black'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {status || 'All'}
          </button>
        ))}
      </div>
      
      {claims.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {claims.map((claim, index) => (
            <ClaimCard key={claim.claim_id} claim={claim} index={index} onClick={() => openClaim(claim)} />
          ))}
        </div>
      ) : (
        /* Premium Empty State - Dossiers */
        <div className="text-center py-16">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5">
            {/* Seal stamp effect - CSS animation */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/30 animate-spin-slow"
                 style={{ animationDuration: '20s' }} />
            {/* Main container */}
            <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/30" />
            {/* Inner glow - CSS */}
            <div className="absolute inset-2 rounded-xl bg-amber-500/10 animate-pulse-slow" />
            {/* Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Certificate className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500" weight="duotone" />
            </div>
          </div>
          
          <h3 className="text-white font-heading text-lg sm:text-xl mb-2">No Dossiers Found</h3>
          <p className="text-white/40 text-sm">Try adjusting your filters</p>
        </div>
      )}
      
      {/* Claim Detail Modal */}
      <AnimatePresence>
        {selectedClaim && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedClaim(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-[#0a0f1a] border border-white/10 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 sticky top-0 bg-[#0a0f1a]">
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border mb-3 ${STATUS_BADGES[selectedClaim.status]?.color}`}>
                      {STATUS_BADGES[selectedClaim.status]?.icon && (
                        <span>{React.createElement(STATUS_BADGES[selectedClaim.status].icon, { className: 'w-3.5 h-3.5', weight: 'fill' })}</span>
                      )}
                      {STATUS_BADGES[selectedClaim.status]?.label}
                    </span>
                    <h2 className="text-white font-heading text-xl">{selectedClaim.title}</h2>
                  </div>
                  <button onClick={() => setSelectedClaim(null)} className="text-white/40 hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-6">
                <div>
                  <p className="text-white/80 leading-relaxed">{selectedClaim.body}</p>
                </div>
                
                {/* Evidence Spine */}
                {selectedClaim.evidence_sources?.length > 0 && (
                  <div>
                    <h4 className="text-vault-gold text-sm font-medium flex items-center gap-2 mb-3">
                      <Stack className="w-4 h-4" />
                      Evidence Spine ({selectedClaim.evidence_sources.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedClaim.evidence_sources.map(source => (
                        <div key={source.source_id} className="p-3 bg-vault-gold/5 border border-vault-gold/20 rounded-lg">
                          <p className="text-white text-sm font-medium">{source.title}</p>
                          <p className="text-vault-gold/60 text-xs font-mono">{source.citation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Counter Spine */}
                {selectedClaim.counter_sources?.length > 0 && (
                  <div>
                    <h4 className="text-orange-400 text-sm font-medium flex items-center gap-2 mb-3">
                      <Warning className="w-4 h-4" />
                      Counter-Spine ({selectedClaim.counter_sources.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedClaim.counter_sources.map(source => (
                        <div key={source.source_id} className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                          <p className="text-white text-sm font-medium">{source.title}</p>
                          <p className="text-orange-400/60 text-xs font-mono">{source.citation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Reality Check */}
                {selectedClaim.reality_check && (
                  <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                    <h4 className="text-blue-400 text-sm font-medium flex items-center gap-2 mb-2">
                      <Scales className="w-4 h-4" />
                      Reality Check
                    </h4>
                    <p className="text-white/70 text-sm">{selectedClaim.reality_check}</p>
                  </div>
                )}
                
                {/* Practical Takeaway */}
                {selectedClaim.practical_takeaway && (
                  <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                    <h4 className="text-green-400 text-sm font-medium flex items-center gap-2 mb-2">
                      <Lightning className="w-4 h-4" />
                      Practical Takeaway
                    </h4>
                    <p className="text-white/70 text-sm">{selectedClaim.practical_takeaway}</p>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-white/10 bg-white/[0.02]">
                <p className="text-white/30 text-xs text-center">
                  Educational only. Not legal advice.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// READING ROOM TAB - Premium Design
// ============================================================================

function ReadingRoomTab() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  
  const handleQuery = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const res = await axios.post(`${API}/archive/reading-room/query`, { query });
      setResponse(res.data);
      setHistory([{ query, response: res.data }, ...history.slice(0, 9)]);
    } catch (err) {
      toast.error('Failed to query archive');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto">
      {/* Header with animated icon */}
      <motion.div 
        className="text-center mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div 
          className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-vault-gold/20 to-vault-gold/5 border border-vault-gold/30 flex items-center justify-center mx-auto mb-5"
          whileHover={{ scale: 1.05, borderColor: 'rgba(198, 168, 124, 0.5)' }}
        >
          {/* Pulse rings */}
          <motion.div
            className="absolute inset-0 rounded-2xl border border-vault-gold/30"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <Brain className="w-10 h-10 text-vault-gold" weight="duotone" />
        </motion.div>
        
        <h2 className="text-white font-heading text-3xl mb-3">The Archive Desk</h2>
        <p className="text-white/50">Citation-first answers from the Black Archive</p>
      </motion.div>
      
      {/* Query Input with premium styling */}
      <motion.form 
        onSubmit={handleQuery} 
        className="mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div 
          className={`relative rounded-xl overflow-hidden transition-all duration-300 ${
            isFocused ? 'ring-2 ring-vault-gold/30 shadow-[0_0_30px_rgba(198,168,124,0.15)]' : ''
          }`}
        >
          {/* Animated border gradient when focused */}
          {isFocused && (
            <motion.div
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(198, 168, 124, 0.1), transparent)',
                backgroundSize: '200% 100%',
              }}
              animate={{ backgroundPosition: ['0% 50%', '200% 50%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          )}
          
          <Input
            placeholder="Ask about doctrine, terms, or legal concepts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="pr-28 py-5 bg-white/5 border-white/10 focus:border-vault-gold text-white text-lg rounded-xl"
          />
          <Button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary rounded-lg"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkle className="w-5 h-5" />
              </motion.div>
            ) : 'Query'}
          </Button>
        </motion.div>
      </motion.form>
      
      {/* Response with premium card */}
      <AnimatePresence mode="wait">
        {response && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-2xl p-6 overflow-hidden"
          >
            {/* Decorative corner accents */}
            <div className="absolute top-0 left-0 w-8 h-8">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-vault-gold/50 to-transparent" />
              <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-vault-gold/50 to-transparent" />
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8">
              <div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-l from-vault-gold/50 to-transparent" />
              <div className="absolute bottom-0 right-0 w-px h-full bg-gradient-to-t from-vault-gold/50 to-transparent" />
            </div>
            
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-white/80">{response.response}</div>
            </div>
            
            {response.suggestions?.length > 0 && (
              <div className="mt-6 pt-4 border-t border-white/10">
                <h4 className="text-white/50 text-xs uppercase tracking-wider mb-3">Related Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {response.suggestions.map((s, i) => (
                    <motion.button
                      key={i}
                      onClick={() => setQuery(s)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-vault-gold/10 border border-white/10 hover:border-vault-gold/30 rounded-lg text-white/60 hover:text-vault-gold text-sm transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-white/30 text-xs mt-6 text-center">
              Educational only. Not legal advice.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* History with hover effects */}
      {history.length > 1 && (
        <motion.div 
          className="mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-white/50 text-xs uppercase tracking-wider mb-4">Recent Queries</h3>
          <div className="space-y-2">
            {history.slice(1).map((h, i) => (
              <motion.button
                key={i}
                onClick={() => setQuery(h.query)}
                className="w-full text-left p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-xl text-white/60 hover:text-white text-sm transition-all group"
                whileHover={{ x: 5 }}
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-white/30 group-hover:text-vault-gold/50 transition-colors" />
                  <span>{h.query}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ============================================================================
// ARCHIVE MAP TAB - Interactive React Flow Implementation
// ============================================================================

// Custom Node Types - Responsive sizing (smaller on mobile to prevent overlap)
const DoctrineNode = ({ data }) => (
  <motion.div 
    className="px-2 py-1.5 sm:px-4 sm:py-3 bg-gradient-to-br from-vault-gold/20 to-vault-gold/5 border-2 border-vault-gold/50 rounded-lg sm:rounded-xl shadow-lg shadow-vault-gold/10 w-[110px] sm:min-w-[160px]"
    whileHover={{ scale: 1.05, borderColor: 'rgba(198, 168, 124, 0.8)' }}
  >
    <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
      <Scales className="w-3 h-3 sm:w-4 sm:h-4 text-vault-gold" weight="fill" />
      <span className="text-[7px] sm:text-[10px] text-vault-gold/70 uppercase tracking-wider">Doctrine</span>
    </div>
    <p className="text-white font-medium text-[10px] sm:text-sm leading-tight">{data.label}</p>
    {data.status && (
      <span className={`inline-block mt-1 sm:mt-2 px-1 sm:px-2 py-0.5 rounded text-[7px] sm:text-[10px] font-medium ${
        data.status === 'VERIFIED' ? 'bg-green-500/20 text-green-400' :
        data.status === 'DISPUTED' ? 'bg-orange-500/20 text-orange-400' :
        'bg-white/10 text-white/50'
      }`}>
        {data.status}
      </span>
    )}
  </motion.div>
);

const CaseNode = ({ data }) => (
  <motion.div 
    className="px-2 py-1.5 sm:px-4 sm:py-3 bg-gradient-to-br from-blue-500/20 to-blue-600/5 border-2 border-blue-500/50 rounded-lg sm:rounded-xl shadow-lg shadow-blue-500/10 w-[110px] sm:min-w-[160px]"
    whileHover={{ scale: 1.05, borderColor: 'rgba(59, 130, 246, 0.8)' }}
  >
    <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
      <Seal className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" weight="fill" />
      <span className="text-[7px] sm:text-[10px] text-blue-400/70 uppercase tracking-wider">Case</span>
    </div>
    <p className="text-white font-medium text-[10px] sm:text-sm leading-tight">{data.label}</p>
    {data.citation && (
      <p className="text-blue-400/60 text-[7px] sm:text-[10px] font-mono mt-0.5 sm:mt-1">{data.citation}</p>
    )}
  </motion.div>
);

const StatuteNode = ({ data }) => (
  <motion.div 
    className="px-2 py-1.5 sm:px-4 sm:py-3 bg-gradient-to-br from-purple-500/20 to-purple-600/5 border-2 border-purple-500/50 rounded-lg sm:rounded-xl shadow-lg shadow-purple-500/10 w-[110px] sm:min-w-[160px]"
    whileHover={{ scale: 1.05, borderColor: 'rgba(139, 92, 246, 0.8)' }}
  >
    <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
      <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" weight="fill" />
      <span className="text-[7px] sm:text-[10px] text-purple-400/70 uppercase tracking-wider">Statute</span>
    </div>
    <p className="text-white font-medium text-[10px] sm:text-sm leading-tight">{data.label}</p>
    {data.citation && (
      <p className="text-purple-400/60 text-[7px] sm:text-[10px] font-mono mt-0.5 sm:mt-1">{data.citation}</p>
    )}
  </motion.div>
);

const ConceptNode = ({ data }) => (
  <motion.div 
    className="px-2 py-1.5 sm:px-4 sm:py-3 bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border-2 border-emerald-500/50 rounded-lg sm:rounded-xl shadow-lg shadow-emerald-500/10 w-[100px] sm:min-w-[140px]"
    whileHover={{ scale: 1.05, borderColor: 'rgba(16, 185, 129, 0.8)' }}
  >
    <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
      <Brain className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" weight="fill" />
      <span className="text-[7px] sm:text-[10px] text-emerald-400/70 uppercase tracking-wider">Concept</span>
    </div>
    <p className="text-white font-medium text-[10px] sm:text-sm leading-tight">{data.label}</p>
  </motion.div>
);

const nodeTypes = {
  doctrine: DoctrineNode,
  case: CaseNode,
  statute: StatuteNode,
  concept: ConceptNode,
};

// Mobile-optimized nodes - 2x4 grid layout with proper margins and spacing
// Margins added to prevent clipping (x: 20, y: 20 start)
const mobileNodes = [
  // Row 1 (top)
  { id: '1', type: 'doctrine', position: { x: 20, y: 20 }, data: { label: 'Equity Follows the Law', status: 'VERIFIED' } },
  { id: '4', type: 'doctrine', position: { x: 155, y: 20 }, data: { label: 'Fiduciary Duty', status: 'VERIFIED' } },
  
  // Row 2
  { id: '2', type: 'case', position: { x: 20, y: 95 }, data: { label: "Earl of Oxford's Case", citation: '1 Rep Ch 1 (1615)' } },
  { id: '7', type: 'concept', position: { x: 155, y: 95 }, data: { label: "Chancellor's Conscience" } },
  
  // Row 3
  { id: '3', type: 'case', position: { x: 20, y: 170 }, data: { label: 'Keech v Sandford', citation: '25 ER 223 (1726)' } },
  { id: '8', type: 'concept', position: { x: 155, y: 170 }, data: { label: 'No-Profit Rule' } },
  
  // Row 4 (bottom)
  { id: '6', type: 'statute', position: { x: 20, y: 245 }, data: { label: 'Restatement (Third) of Trusts', citation: '2003' } },
  { id: '5', type: 'doctrine', position: { x: 155, y: 245 }, data: { label: 'Constructive Trust', status: 'VERIFIED' } },
];

// Desktop nodes - 3-row layout with proper margins and spacing
const desktopNodes = [
  // Top row - 3 nodes
  { id: '2', type: 'case', position: { x: 60, y: 40 }, data: { label: "Earl of Oxford's Case", citation: '1 Rep Ch 1 (1615)' } },
  { id: '1', type: 'doctrine', position: { x: 300, y: 40 }, data: { label: 'Equity Follows the Law', status: 'VERIFIED' } },
  { id: '4', type: 'doctrine', position: { x: 540, y: 40 }, data: { label: 'Fiduciary Duty', status: 'VERIFIED' } },
  
  // Middle row - 3 nodes
  { id: '7', type: 'concept', position: { x: 120, y: 160 }, data: { label: "Chancellor's Conscience" } },
  { id: '6', type: 'statute', position: { x: 340, y: 160 }, data: { label: 'Restatement (Third) of Trusts', citation: '2003' } },
  { id: '8', type: 'concept', position: { x: 560, y: 160 }, data: { label: 'No-Profit Rule' } },
  
  // Bottom row - 2 nodes centered
  { id: '3', type: 'case', position: { x: 200, y: 280 }, data: { label: 'Keech v Sandford', citation: '25 ER 223 (1726)' } },
  { id: '5', type: 'doctrine', position: { x: 460, y: 280 }, data: { label: 'Constructive Trust', status: 'VERIFIED' } },
];

const initialEdges = [
  { id: 'e1-2', source: '2', target: '1', type: 'smoothstep', animated: true, style: { stroke: '#C6A87C' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#C6A87C' }, label: 'establishes' },
  { id: 'e1-3', source: '3', target: '1', type: 'smoothstep', style: { stroke: '#C6A87C' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#C6A87C' }, label: 'develops' },
  { id: 'e1-4', source: '1', target: '4', type: 'smoothstep', style: { stroke: '#8B5CF6' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#8B5CF6' }, label: 'leads to' },
  { id: 'e1-5', source: '1', target: '5', type: 'smoothstep', style: { stroke: '#8B5CF6' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#8B5CF6' }, label: 'creates' },
  { id: 'e3-4', source: '3', target: '4', type: 'smoothstep', style: { stroke: '#3B82F6' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#3B82F6' }, label: 'defines' },
  { id: 'e6-1', source: '6', target: '1', type: 'smoothstep', style: { stroke: '#10B981', strokeDasharray: '5,5' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10B981' }, label: 'codifies' },
  { id: 'e7-1', source: '7', target: '1', type: 'smoothstep', style: { stroke: '#10B981' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10B981' } },
  { id: 'e8-4', source: '8', target: '4', type: 'smoothstep', style: { stroke: '#10B981' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10B981' } },
];

// Inner component that handles fitView after nodes are initialized
function ArchiveMapFlow({ nodes, edges, onNodesChange, onEdgesChange, onNodeClick, isMobile }) {
  const nodesInitialized = useNodesInitialized();
  const { fitView } = useReactFlow();
  const fitViewCalled = useRef(false);

  // Fit view when nodes are initialized - fit all nodes in the larger container
  useEffect(() => {
    if (!nodesInitialized || fitViewCalled.current) return;

    // Mark as called to prevent multiple invocations
    fitViewCalled.current = true;

    // Multiple passes to ensure all nodes are measured
    const timers = [];
    
    // Immediate fit - with proper padding to show all nodes
    requestAnimationFrame(() => {
      fitView({
        padding: 0.1,
        includeHiddenNodes: true,
        duration: 0,
        minZoom: 0.5,
        maxZoom: 1.0,
      });
    });

    // Second pass after 200ms
    timers.push(setTimeout(() => {
      requestAnimationFrame(() => {
        fitView({
          padding: 0.1,
          includeHiddenNodes: true,
          duration: 300,
          minZoom: 0.5,
          maxZoom: 1.0,
        });
      });
    }, 200));

    // Third pass after 500ms (for slower devices/Framer Motion)
    timers.push(setTimeout(() => {
      requestAnimationFrame(() => {
        fitView({
          padding: 0.1,
          includeHiddenNodes: true,
          duration: 350,
          minZoom: 0.5,
          maxZoom: 1.0,
        });
      });
    }, 500));

    return () => timers.forEach(t => clearTimeout(t));
  }, [nodesInitialized, fitView]);

  // Reset fitViewCalled when nodes change (device switch)
  useEffect(() => {
    fitViewCalled.current = false;
  }, [nodes.length]);

  // Default viewport - zoomed out to show all 8 nodes in the larger container
  const defaultViewport = isMobile 
    ? { x: 15, y: 15, zoom: 0.9 }   // Higher zoom since container is bigger
    : { x: 50, y: 30, zoom: 0.85 };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      defaultViewport={defaultViewport}
      fitViewOptions={{
        padding: 0.1,
        minZoom: 0.5,
        maxZoom: 1.0,
        includeHiddenNodes: true
      }}
      minZoom={0.3}
      maxZoom={2}
      attributionPosition="bottom-left"
      className="archive-map-flow"
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#1a1a2e" gap={20} />
      <Controls 
        position="bottom-left"
        style={{
          margin: 20,
          marginBottom: 'calc(20px + env(safe-area-inset-bottom))',
          marginLeft: 'calc(20px + env(safe-area-inset-left))',
        }}
        className="archive-map-controls !bg-black/80 !border-vault-gold/30 !rounded-lg !shadow-xl [&>button]:!bg-white/10 [&>button]:!border-vault-gold/20 [&>button]:!text-white/70 [&>button:hover]:!bg-vault-gold/20 [&>button:hover]:!text-vault-gold"
        showInteractive={false}
      />
      {/* MiniMap with increased margins to prevent corner clipping */}
      <MiniMap 
        position="bottom-right"
        style={{
          margin: 20,
          marginBottom: 'calc(20px + env(safe-area-inset-bottom))',
          marginRight: 'calc(20px + env(safe-area-inset-right))',
        }}
        nodeColor={(node) => {
          switch (node.type) {
            case 'doctrine': return '#C6A87C';
            case 'case': return '#3B82F6';
            case 'statute': return '#8B5CF6';
            case 'concept': return '#10B981';
            default: return '#666';
          }
        }}
        maskColor="rgba(0, 0, 0, 0.85)"
        className="archive-map-minimap !bg-black/80 !border-vault-gold/30 !rounded-lg"
        pannable
        zoomable
      />
    </ReactFlow>
  );
}

function ArchiveMapTab() {
  const [isMobile, setIsMobile] = useState(false);
  const initialNodesForDevice = isMobile ? mobileNodes : desktopNodes;
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodesForDevice);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);

  // Detect mobile and update nodes accordingly
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update nodes when device type changes
  useEffect(() => {
    const newNodes = isMobile ? mobileNodes : desktopNodes;
    setNodes(newNodes);
  }, [isMobile, setNodes]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="relative">
      {/* Map Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-white font-heading text-xl sm:text-2xl mb-1">Interactive Archive Map</h2>
          <p className="text-white/50 text-sm">Explore doctrine relationships and connections</p>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-vault-gold/30 border border-vault-gold/50" />
            <span className="text-white/60">Doctrine</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-500/30 border border-blue-500/50" />
            <span className="text-white/60">Case</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-purple-500/30 border border-purple-500/50" />
            <span className="text-white/60">Statute</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
            <span className="text-white/60">Concept</span>
          </div>
        </div>
      </div>
      
      {/* React Flow Map Container with Unique Premium Border */}
      <div className="relative mt-2">
        {/* Animated outer glow */}
        <motion.div 
          className="absolute -inset-2 rounded-3xl opacity-60"
          style={{
            background: 'linear-gradient(135deg, rgba(198, 168, 124, 0.15), rgba(139, 92, 246, 0.1), rgba(198, 168, 124, 0.15))',
            filter: 'blur(8px)',
          }}
          animate={{ opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        {/* Rotating corner accents */}
        <div className="absolute -top-1 -left-1 w-8 h-8">
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0deg, rgba(198, 168, 124, 0.6) 90deg, transparent 90deg)',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute inset-1 bg-[#0a0f1a]" />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8">
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'conic-gradient(from 90deg, transparent 0deg, rgba(198, 168, 124, 0.6) 90deg, transparent 90deg)',
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute inset-1 bg-[#0a0f1a]" />
        </div>
        <div className="absolute -bottom-1 -left-1 w-8 h-8">
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'conic-gradient(from 270deg, transparent 0deg, rgba(198, 168, 124, 0.6) 90deg, transparent 90deg)',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute inset-1 bg-[#0a0f1a]" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8">
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'conic-gradient(from 180deg, transparent 0deg, rgba(198, 168, 124, 0.6) 90deg, transparent 90deg)',
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute inset-1 bg-[#0a0f1a]" />
        </div>
        
        {/* Scanning line effect */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-vault-gold/60 to-transparent z-20 pointer-events-none"
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Inner double border frame */}
        <div className="absolute inset-0 rounded-2xl border border-vault-gold/40 pointer-events-none z-10" />
        <div className="absolute inset-[3px] rounded-xl border border-vault-gold/20 pointer-events-none z-10" />
        
        {/* Decorative corner brackets */}
        <svg className="absolute top-0 left-0 w-12 h-12 text-vault-gold/50 pointer-events-none z-10" viewBox="0 0 48 48">
          <path d="M4 20 L4 4 L20 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="4" cy="4" r="2" fill="currentColor" />
        </svg>
        <svg className="absolute top-0 right-0 w-12 h-12 text-vault-gold/50 pointer-events-none z-10" viewBox="0 0 48 48">
          <path d="M44 20 L44 4 L28 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="44" cy="4" r="2" fill="currentColor" />
        </svg>
        <svg className="absolute bottom-0 left-0 w-12 h-12 text-vault-gold/50 pointer-events-none z-10" viewBox="0 0 48 48">
          <path d="M4 28 L4 44 L20 44" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="4" cy="44" r="2" fill="currentColor" />
        </svg>
        <svg className="absolute bottom-0 right-0 w-12 h-12 text-vault-gold/50 pointer-events-none z-10" viewBox="0 0 48 48">
          <path d="M44 28 L44 44 L28 44" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="44" cy="44" r="2" fill="currentColor" />
        </svg>
        
        {/* Top center ornament */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          <div className="w-8 h-px bg-gradient-to-r from-transparent to-vault-gold/50" />
          <div className="bg-[#0a0f1a] px-3 py-1 border border-vault-gold/30 rounded-full flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            >
              <MapTrifold className="w-3 h-3 text-vault-gold" weight="fill" />
            </motion.div>
            <span className="text-vault-gold/80 text-[10px] font-medium uppercase tracking-widest">Doctrine Map</span>
          </div>
          <div className="w-8 h-px bg-gradient-to-l from-transparent to-vault-gold/50" />
        </div>
        
        {/* React Flow Map - larger container to fit all 8 nodes */}
        <div 
          style={{ 
            position: 'relative',
            width: '100%',
            height: isMobile ? 580 : 600,  // Increased height to fit all nodes
            overflow: 'hidden',
            borderRadius: 18
          }} 
          className="bg-gradient-to-b from-[#050810] to-[#080d18]"
        >
          {/* Inner vignette effect */}
          <div className="absolute inset-0 pointer-events-none z-10" style={{
            background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)'
          }} />
          
          <ReactFlowProvider>
            <ArchiveMapFlow
              key={isMobile ? 'mobile' : 'desktop'}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              isMobile={isMobile}
            />
          </ReactFlowProvider>
          
          {/* Touch hint for mobile - positioned above safe area */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 sm:hidden text-white/40 text-[10px] bg-black/60 px-3 py-1 rounded-full border border-white/10 z-20"
            style={{ bottom: 'calc(8px + env(safe-area-inset-bottom))' }}
          >
            Pinch to zoom • Drag to pan
          </div>
        </div>
        
        {/* Bottom center status indicator */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-[#0a0f1a] px-2 py-0.5 border border-vault-gold/20 rounded-full">
          <motion.div 
            className="w-1.5 h-1.5 rounded-full bg-emerald-500"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-white/40 text-[9px] uppercase tracking-wider">Live</span>
        </div>
      </div>
      
      {/* Selected Node Details */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-4 p-4 bg-white/[0.03] border border-white/10 rounded-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs text-white/40 uppercase tracking-wider">{selectedNode.type}</span>
                <h3 className="text-white font-heading text-lg">{selectedNode.data.label}</h3>
                {selectedNode.data.citation && (
                  <p className="text-vault-gold/60 text-sm font-mono">{selectedNode.data.citation}</p>
                )}
                {selectedNode.data.status && (
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                    selectedNode.data.status === 'VERIFIED' ? 'bg-green-500/20 text-green-400' :
                    selectedNode.data.status === 'DISPUTED' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-white/10 text-white/50'
                  }`}>
                    {selectedNode.data.status}
                  </span>
                )}
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Instructions */}
      <p className="text-white/30 text-xs text-center mt-4">
        Click and drag to pan • Scroll to zoom • Click nodes to view details
      </p>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT - PREMIUM DESIGN WITH MOBILE-FIRST LAYOUT
// ============================================================================

export default function BlackArchivePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'index';
  
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };
  
  return (
    <div 
      className="min-h-screen relative w-full"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      {/* Premium Header with Obsidian Glass Effect */}
      <div className="relative bg-[#030508]/80 sm:backdrop-blur-xl border-b border-vault-gold/10 overflow-hidden">
        {/* Animated background gradients - simplified on mobile */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Base gradient layer - static, no animation cost */}
          <div className="absolute inset-0 bg-gradient-to-br from-vault-gold/[0.08] via-transparent to-purple-900/[0.1]" />
          
          {/* Animated gold orb - simplified animation on mobile */}
          <motion.div 
            className="absolute -top-10 -left-10 w-40 sm:w-72 md:w-96 h-40 sm:h-72 md:h-96 rounded-full will-change-transform"
            style={{
              background: 'radial-gradient(circle, rgba(198, 168, 124, 0.15) 0%, rgba(198, 168, 124, 0.05) 40%, transparent 70%)',
            }}
            animate={{ 
              opacity: [0.6, 0.8, 0.6],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          
          {/* Purple orb - hidden on mobile for performance */}
          <motion.div 
            className="hidden sm:block absolute -bottom-10 -right-10 w-48 md:w-64 h-48 md:h-64 rounded-full will-change-transform"
            style={{
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.04) 40%, transparent 70%)',
            }}
            animate={{ 
              opacity: [0.5, 0.7, 0.5],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        
        {/* Floating particles */}
        <FloatingParticles />
        
        {/* Subtle grid pattern - CSS only, no JS cost */}
        <div 
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(198, 168, 124, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(198, 168, 124, 0.5) 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }}
        />
        
        {/* Specular highlight - CSS only */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-vault-gold/20 to-transparent" />
        
        {/* Header Content */}
        <div className="relative w-full max-w-6xl mx-auto px-4 pt-6 pb-5 sm:py-8 lg:py-10">
          {/* Title section */}
          <motion.div 
            className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left gap-4 sm:gap-6 mb-6 sm:mb-8"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Icon - smaller on mobile */}
            <div className="shrink-0">
              <BlackArchiveIcon size="lg" animate={true} />
            </div>
            
            <div className="flex-1 min-w-0">
              {/* Premium badge */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-vault-gold/10 border border-vault-gold/20 text-vault-gold text-[10px] sm:text-xs font-medium mb-2 sm:mb-3">
                  <Sparkle className="w-2.5 sm:w-3 h-2.5 sm:h-3" weight="fill" />
                  Premium Research Vault
                </span>
              </motion.div>
              
              {/* Title with responsive clamp sizing */}
              <motion.h1 
                className="text-white font-heading mb-1 sm:mb-2"
                style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)', lineHeight: 1.1 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-vault-gold/90 to-white">
                  The Black Archive
                </span>
              </motion.h1>
              
              {/* Subtitle */}
              <motion.p 
                className="text-white/45 text-xs sm:text-sm max-w-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
              >
                Primary sources. Doctrine trails. Citation-first learning.
              </motion.p>
            </div>
          </motion.div>
          
          {/* Tabs - Mobile vs Desktop */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            {/* Mobile: Segmented control + chips */}
            <div className="block sm:hidden">
              <MobileSegmentedTabs
                tabs={TABS}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>
            
            {/* Desktop: Horizontal premium tabs */}
            <div className="hidden sm:flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {TABS.map((tab, index) => (
                <motion.div
                  key={tab.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + index * 0.05 }}
                >
                  <DesktopPremiumTab
                    tab={tab}
                    isActive={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
        
        {/* Bottom decorative line */}
        <motion.div 
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent 5%, rgba(198, 168, 124, 0.4) 50%, transparent 95%)'
          }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      </div>
      
      {/* Content Area - Tabs stay mounted to prevent reload flash */}
      <div className="w-full max-w-6xl mx-auto px-4 py-5 sm:py-8">
        <div className={activeTab === 'index' ? 'block' : 'hidden'}>
          <IndexTab />
        </div>
        <div className={activeTab === 'trails' ? 'block' : 'hidden'}>
          <TrailsTab />
        </div>
        <div className={activeTab === 'claims' ? 'block' : 'hidden'}>
          <ClaimsTab />
        </div>
        <div className={activeTab === 'map' ? 'block' : 'hidden'}>
          <ArchiveMapTab />
        </div>
        <div className={activeTab === 'reading' ? 'block' : 'hidden'}>
          <ReadingRoomTab />
        </div>
      </div>
    </div>
  );
}
