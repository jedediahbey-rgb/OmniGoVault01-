import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import axios from 'axios';
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
  
  const innerSizes = {
    sm: { outer: 32, inner: 16, ring: 24 },
    md: { outer: 48, inner: 24, ring: 36 },
    lg: { outer: 64, inner: 32, ring: 48 },
    xl: { outer: 80, inner: 40, ring: 60 }
  };
  
  const dims = innerSizes[size];
  
  return (
    <div className={`${sizeClasses[size]} relative`}>
      {/* Outer rotating ring */}
      <motion.div
        className="absolute inset-0 rounded-xl"
        style={{
          background: 'conic-gradient(from 0deg, transparent, rgba(198, 168, 124, 0.3), transparent, rgba(198, 168, 124, 0.1), transparent)',
        }}
        animate={animate ? { rotate: 360 } : {}}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Inner counter-rotating ring */}
      <motion.div
        className="absolute inset-1 rounded-lg"
        style={{
          background: 'conic-gradient(from 180deg, transparent, rgba(139, 92, 246, 0.2), transparent, rgba(198, 168, 124, 0.2), transparent)',
        }}
        animate={animate ? { rotate: -360 } : {}}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Core background */}
      <div className="absolute inset-2 rounded-lg bg-black/90 backdrop-blur-sm border border-vault-gold/30" />
      
      {/* Mystical eye symbol */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative"
          animate={animate ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Eye outer */}
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
            <motion.path
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

// Pre-generated particle positions for consistent rendering
const PARTICLE_POSITIONS = [
  { left: 12, top: 8, duration: 5.2, delay: 0.3 },
  { left: 85, top: 15, duration: 4.8, delay: 1.2 },
  { left: 23, top: 45, duration: 6.1, delay: 0.8 },
  { left: 67, top: 72, duration: 5.5, delay: 1.8 },
  { left: 45, top: 28, duration: 4.3, delay: 0.5 },
  { left: 91, top: 55, duration: 5.9, delay: 1.1 },
  { left: 34, top: 82, duration: 4.6, delay: 0.2 },
  { left: 78, top: 38, duration: 5.3, delay: 1.5 },
  { left: 56, top: 91, duration: 6.4, delay: 0.9 },
  { left: 8, top: 62, duration: 4.9, delay: 1.7 },
  { left: 42, top: 12, duration: 5.7, delay: 0.4 },
  { left: 95, top: 85, duration: 4.2, delay: 1.3 },
  { left: 18, top: 33, duration: 6.0, delay: 0.6 },
  { left: 72, top: 19, duration: 5.1, delay: 1.9 },
  { left: 51, top: 68, duration: 4.7, delay: 0.1 },
  { left: 29, top: 95, duration: 5.8, delay: 1.4 },
  { left: 83, top: 42, duration: 4.4, delay: 0.7 },
  { left: 6, top: 78, duration: 6.2, delay: 1.6 },
  { left: 61, top: 5, duration: 5.0, delay: 1.0 },
  { left: 38, top: 58, duration: 4.5, delay: 0.0 },
];

const FloatingParticles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {PARTICLE_POSITIONS.map((particle, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-vault-gold/30"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.5, 1],
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
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
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 100 }}
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
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 80 }}
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
            <div key={i} className="h-28 sm:h-32 bg-white/[0.03] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sources.length > 0 ? (
        <div className="grid gap-3 sm:gap-4">
          {sources.map((source, index) => (
            <SourceCard key={source.source_id} source={source} index={index} onClick={() => setSelectedSource(source)} />
          ))}
        </div>
      ) : (
        /* Premium Empty State */
        <motion.div 
          className="text-center py-12 sm:py-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div 
            className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Archive className="w-10 h-10 sm:w-12 sm:h-12 text-white/20" weight="duotone" />
            </div>
            {/* Subtle glow */}
            <div className="absolute inset-0 rounded-2xl bg-vault-gold/5 blur-xl opacity-50" />
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
        </motion.div>
      )}}
      
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
          <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />
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
        <div className="text-center py-16">
          <TreeStructure className="w-16 h-16 text-white/10 mx-auto mb-4" weight="duotone" />
          <h3 className="text-white text-lg mb-2">No Tracks Available</h3>
          <p className="text-white/50 text-sm">Doctrine tracks are being curated</p>
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
          <div key={i} className="h-48 bg-white/5 rounded-xl animate-pulse" />
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
        <div className="text-center py-16">
          <Certificate className="w-16 h-16 text-white/10 mx-auto mb-4" weight="duotone" />
          <h3 className="text-white text-lg mb-2">No Dossiers Found</h3>
          <p className="text-white/50 text-sm">Try adjusting your filters</p>
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
// ARCHIVE MAP TAB (Premium Placeholder - Phase B)
// ============================================================================

function ArchiveMapTab() {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div 
      className="text-center py-16 relative"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Decorative connection lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" viewBox="0 0 400 300">
        <motion.path
          d="M50,150 Q100,50 200,150 T350,150"
          stroke="rgba(198, 168, 124, 0.5)"
          strokeWidth="1"
          fill="none"
          strokeDasharray="5,5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.path
          d="M50,100 Q150,200 250,100 T350,200"
          stroke="rgba(139, 92, 246, 0.3)"
          strokeWidth="1"
          fill="none"
          strokeDasharray="5,5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 4, delay: 1, repeat: Infinity }}
        />
        
        {/* Node dots */}
        {[
          { cx: 50, cy: 150 },
          { cx: 200, cy: 150 },
          { cx: 350, cy: 150 },
          { cx: 100, cy: 100 },
          { cx: 300, cy: 200 },
        ].map((pos, i) => (
          <motion.circle
            key={i}
            cx={pos.cx}
            cy={pos.cy}
            r="4"
            fill="rgba(198, 168, 124, 0.5)"
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 2, 
              delay: i * 0.3, 
              repeat: Infinity 
            }}
          />
        ))}
      </svg>
      
      <motion.div 
        className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 flex items-center justify-center mx-auto mb-6 overflow-hidden"
        animate={{ borderColor: isHovered ? 'rgba(198, 168, 124, 0.3)' : 'rgba(255, 255, 255, 0.1)' }}
      >
        {/* Animated rings */}
        <motion.div
          className="absolute inset-0 rounded-2xl border border-vault-gold/20"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="absolute inset-0 rounded-2xl border border-vault-gold/20"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 3, delay: 1, repeat: Infinity }}
        />
        
        <MapTrifold className="w-12 h-12 text-white/30" weight="duotone" />
      </motion.div>
      
      <motion.h3 
        className="text-white font-heading text-2xl mb-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Interactive Archive Map
      </motion.h3>
      
      <motion.p 
        className="text-white/50 mb-6 max-w-md mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Explore doctrine relationships through an interactive visualization of connections between sources, claims, and trails.
      </motion.p>
      
      <motion.span 
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-vault-gold/10 to-purple-500/10 border border-vault-gold/20 rounded-xl text-vault-gold text-sm font-medium"
        whileHover={{ scale: 1.05, borderColor: 'rgba(198, 168, 124, 0.4)' }}
        whileTap={{ scale: 0.98 }}
      >
        <Sparkle className="w-4 h-4" weight="fill" />
        Coming in Phase B
      </motion.span>
    </motion.div>
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
      <div className="relative bg-[#030508]/80 backdrop-blur-xl border-b border-vault-gold/10 overflow-hidden">
        {/* Animated background gradients - visible on all devices */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Base gradient layer */}
          <div className="absolute inset-0 bg-gradient-to-br from-vault-gold/[0.08] via-transparent to-purple-900/[0.1]" />
          
          {/* Animated gold orb - top left */}
          <motion.div 
            className="absolute -top-10 -left-10 w-40 sm:w-72 md:w-96 h-40 sm:h-72 md:h-96 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(198, 168, 124, 0.15) 0%, rgba(198, 168, 124, 0.05) 40%, transparent 70%)',
            }}
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.6, 0.8, 0.6],
              x: [0, 10, 0],
              y: [0, 10, 0]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          
          {/* Animated purple orb - bottom right */}
          <motion.div 
            className="absolute -bottom-10 -right-10 w-32 sm:w-48 md:w-64 h-32 sm:h-48 md:h-64 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.04) 40%, transparent 70%)',
            }}
            animate={{ 
              scale: [1.1, 1, 1.1],
              opacity: [0.5, 0.7, 0.5],
              x: [0, -10, 0],
              y: [0, -10, 0]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          
          {/* Additional gold accent orb - center right (mobile visible) */}
          <motion.div 
            className="absolute top-1/2 -right-5 w-24 sm:w-32 h-24 sm:h-32 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(198, 168, 124, 0.1) 0%, transparent 60%)',
            }}
            animate={{ 
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.15, 1]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />
        </div>
        
        {/* Floating particles - visible on all devices with reduced count on mobile */}
        <FloatingParticles />
        
        {/* Subtle grid pattern - more visible */}
        <div 
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(198, 168, 124, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(198, 168, 124, 0.5) 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }}
        />
        
        {/* Specular highlight - top edge glow */}
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
      
      {/* Content Area */}
      <motion.div 
        className="w-full max-w-6xl mx-auto px-4 py-5 sm:py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="w-full"
          >
            {activeTab === 'index' && <IndexTab />}
            {activeTab === 'trails' && <TrailsTab />}
            {activeTab === 'claims' && <ClaimsTab />}
            {activeTab === 'map' && <ArchiveMapTab />}
            {activeTab === 'reading' && <ReadingRoomTab />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
