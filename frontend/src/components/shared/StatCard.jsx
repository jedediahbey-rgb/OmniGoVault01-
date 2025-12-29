import { motion, useSpring, useTransform } from 'framer-motion';
import { cn } from '../../lib/utils';
import IconChip from '../ui/icon-chip';
import { useState, useEffect, useMemo } from 'react';

// Define which stats have finite limits (show progress bar with max)
const FINITE_STATS = {
  portfolios: { max: 9, showProgress: true },
  profiles: { max: 9, showProgress: true }
};

// Stats that should never show the progress system (e.g., currency values)
const EXCLUDED_STATS = ['trust balance', 'balance', 'total', 'value'];

// Milestone tiers for infinite stats - each tier unlocks the next
const INFINITE_MILESTONES = [
  { threshold: 0, tier: 'Start', color: 'slate', next: 5 },
  { threshold: 5, tier: 'Bronze', color: 'amber', next: 10 },
  { threshold: 10, tier: 'Silver', color: 'slate', next: 25 },
  { threshold: 25, tier: 'Gold', color: 'yellow', next: 50 },
  { threshold: 50, tier: 'Platinum', color: 'cyan', next: 100 },
  { threshold: 100, tier: 'Diamond', color: 'violet', next: 250 },
  { threshold: 250, tier: 'Master', color: 'rose', next: 500 },
  { threshold: 500, tier: 'Legend', color: 'emerald', next: 1000 },
  { threshold: 1000, tier: 'Mythic', color: 'vault-gold', next: null }
];

// Get current tier and progress for infinite stats
const getInfiniteTierProgress = (value) => {
  let currentTier = INFINITE_MILESTONES[0];
  let nextTierIndex = 1;
  
  for (let i = INFINITE_MILESTONES.length - 1; i >= 0; i--) {
    if (value >= INFINITE_MILESTONES[i].threshold) {
      currentTier = INFINITE_MILESTONES[i];
      nextTierIndex = Math.min(i + 1, INFINITE_MILESTONES.length - 1);
      break;
    }
  }
  
  const nextTier = INFINITE_MILESTONES[nextTierIndex];
  const progressInTier = currentTier.next 
    ? ((value - currentTier.threshold) / (currentTier.next - currentTier.threshold)) * 100
    : 100; // Max tier reached
  
  return {
    currentTier,
    nextTier,
    progress: Math.min(progressInTier, 100),
    isMaxTier: !currentTier.next
  };
};

// Color configurations for different fill levels (finite stats)
const getProgressColor = (percentage) => {
  if (percentage >= 80) return { bar: 'from-emerald-500/30 to-emerald-400/50', glow: 'shadow-emerald-500/20' };
  if (percentage >= 50) return { bar: 'from-vault-gold/30 to-vault-gold/50', glow: 'shadow-vault-gold/20' };
  if (percentage >= 25) return { bar: 'from-amber-500/20 to-amber-400/40', glow: 'shadow-amber-500/10' };
  return { bar: 'from-white/10 to-white/20', glow: '' };
};

// Color configurations for tier colors (infinite stats)
const getTierColors = (tierColor) => {
  const colors = {
    slate: { bar: 'from-slate-500/20 to-slate-400/40', glow: '', badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    amber: { bar: 'from-amber-500/20 to-amber-400/40', glow: 'shadow-amber-500/10', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    yellow: { bar: 'from-yellow-500/25 to-yellow-400/45', glow: 'shadow-yellow-500/15', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    cyan: { bar: 'from-cyan-500/25 to-cyan-400/45', glow: 'shadow-cyan-500/15', badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
    violet: { bar: 'from-violet-500/25 to-violet-400/45', glow: 'shadow-violet-500/15', badge: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
    rose: { bar: 'from-rose-500/25 to-rose-400/45', glow: 'shadow-rose-500/15', badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    emerald: { bar: 'from-emerald-500/30 to-emerald-400/50', glow: 'shadow-emerald-500/20', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    'vault-gold': { bar: 'from-vault-gold/30 to-vault-gold/50', glow: 'shadow-vault-gold/20', badge: 'bg-vault-gold/20 text-vault-gold border-vault-gold/30' }
  };
  return colors[tierColor] || colors.slate;
};

export default function StatCard({ 
  title,
  label, 
  value, 
  icon: Icon, 
  trend,
  subtitle,
  className,
  variant = 'default',
  maxValue, // Optional override - set to Infinity for infinite display
  hideProgress = false // Force hide progress system
}) {
  const variants = {
    default: 'border-white/5 bg-white/5',
    gold: 'border-vault-gold/20 bg-vault-gold/5',
    blue: 'border-vault-blue/20 bg-vault-blue/5'
  };

  const iconVariant = variant === 'gold' ? 'gold' : variant === 'blue' ? 'blue' : 'default';
  const displayLabel = title || label;
  const statKey = displayLabel?.toLowerCase() || '';
  
  // Check if this stat should be excluded from progress system
  const isExcluded = hideProgress || EXCLUDED_STATS.some(exc => statKey.includes(exc));
  
  // Check if this stat has a finite limit
  const finiteConfig = FINITE_STATS[statKey];
  const isFinite = finiteConfig?.showProgress || (maxValue && maxValue !== Infinity);
  const isInfinite = !isExcluded && !isFinite;
  
  // Determine max value for finite stats
  const max = maxValue || finiteConfig?.max || null;
  
  // Calculate progress based on stat type
  const numericValue = typeof value === 'number' ? value : 0;
  
  // For finite stats
  const finitePercentage = isFinite && max ? Math.min((numericValue / max) * 100, 100) : 0;
  
  // For infinite stats - get tier progress
  const tierInfo = isInfinite ? getInfiniteTierProgress(numericValue) : null;
  const infinitePercentage = tierInfo?.progress || 0;
  
  // Use appropriate percentage
  const percentage = isFinite ? finitePercentage : infinitePercentage;
  
  // Get color configuration based on stat type
  const colorConfig = isFinite 
    ? getProgressColor(finitePercentage)
    : (tierInfo ? getTierColors(tierInfo.currentTier.color) : { bar: '', glow: '' });
  
  // Animated spring for smooth fill
  const springValue = useSpring(0, { stiffness: 50, damping: 15 });
  
  useEffect(() => {
    if (!isExcluded) {
      springValue.set(percentage);
    }
  }, [percentage, springValue, isExcluded]);
  
  // Transform spring to height percentage
  const fillHeight = useTransform(springValue, [0, 100], ['0%', '100%']);
  
  // Pulse animation when value changes
  const [isPulsing, setIsPulsing] = useState(false);
  
  useEffect(() => {
    if (numericValue > 0) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 600);
      return () => clearTimeout(timer);
    }
  }, [numericValue]);

  // Milestone indicators for finite stats
  const finiteMilestones = useMemo(() => {
    if (!isFinite) return [];
    const result = [];
    for (let i = 25; i <= 75; i += 25) {
      result.push({
        percent: i,
        reached: finitePercentage >= i
      });
    }
    return result;
  }, [finitePercentage, isFinite]);

  // Render the max/tier indicator
  const renderMaxIndicator = () => {
    if (isExcluded) return null;
    if (isInfinite && tierInfo) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/30">/ ∞</span>
          {tierInfo.currentTier.threshold > 0 && (
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded border font-medium',
              colorConfig.badge
            )}>
              {tierInfo.currentTier.tier}
            </span>
          )}
        </div>
      );
    }
    if (isFinite && max) {
      return <span className="text-xs text-white/30">/ {max}</span>;
    }
    return null;
  };

  // Render mobile max indicator
  const renderMobileMaxIndicator = () => {
    if (isExcluded) return null;
    if (isInfinite && tierInfo) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/30">/ ∞</span>
          {tierInfo.currentTier.threshold > 0 && (
            <span className={cn(
              'text-[8px] px-1 py-0.5 rounded border font-medium',
              colorConfig.badge
            )}>
              {tierInfo.currentTier.tier}
            </span>
          )}
        </div>
      );
    }
    if (isFinite && max) {
      return <span className="text-[10px] text-white/30">/ {max}</span>;
    }
    return null;
  };

  // Show progress bar for both finite and infinite (but not excluded)
  const showProgressBar = !isExcluded;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'relative rounded-xl border backdrop-blur-sm p-4 sm:p-5 overflow-hidden',
        variants[variant],
        isPulsing && 'ring-2 ring-vault-gold/30',
        showProgressBar && colorConfig.glow && `shadow-lg ${colorConfig.glow}`,
        className
      )}
    >
      {/* Animated Progress Fill Background */}
      {showProgressBar && (
        <>
          <motion.div 
            className={cn(
              'absolute inset-x-0 bottom-0 bg-gradient-to-t pointer-events-none',
              colorConfig.bar
            )}
            style={{ height: fillHeight }}
            initial={{ height: '0%' }}
          />
          
          {/* Animated shine effect on fill */}
          <motion.div 
            className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
            style={{ 
              bottom: fillHeight,
              opacity: percentage > 5 ? 1 : 0
            }}
          />
          
          {/* Milestone dots - for finite stats */}
          {isFinite && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-10">
              {finiteMilestones.map((m) => (
                <motion.div
                  key={m.percent}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-all duration-500',
                    m.reached 
                      ? 'bg-vault-gold shadow-sm shadow-vault-gold/50' 
                      : 'bg-white/20'
                  )}
                  initial={{ scale: 0 }}
                  animate={{ scale: m.reached ? 1.2 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                />
              ))}
            </div>
          )}
          
          {/* Tier progress indicator - for infinite stats */}
          {isInfinite && tierInfo && !tierInfo.isMaxTier && (
            <div className="absolute right-2 bottom-2 z-10 hidden sm:block">
              <div className="text-[9px] text-white/40 text-right">
                <span className="text-white/60">{tierInfo.currentTier.next}</span>
                <span className="ml-0.5">next</span>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Content - Mobile */}
      <div className="sm:hidden relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.25em] text-white/60 leading-none">
              {displayLabel}
            </p>
          </div>
          {Icon && (
            <motion.div 
              className="shrink-0"
              animate={isPulsing ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <IconChip variant={iconVariant} size="sm">
                <Icon weight="duotone" />
              </IconChip>
            </motion.div>
          )}
        </div>
        <div className="flex items-baseline gap-1 mt-2">
          <motion.p 
            className="text-2xl font-heading text-white tabular-nums"
            animate={isPulsing ? { scale: [1, 1.05, 1] } : {}}
          >
            {value}
          </motion.p>
          {renderMobileMaxIndicator()}
        </div>
        {subtitle && (
          <p className="text-xs text-white/40 mt-1">{subtitle}</p>
        )}
        {trend && (
          <p className={cn(
            'text-xs mt-2',
            trend > 0 ? 'text-green-400' : 'text-red-400'
          )}>
            {trend > 0 ? '+' : ''}{trend}% from last month
          </p>
        )}
        
        {/* Progress bar for mobile */}
        {showProgressBar && (
          <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className={cn(
                'h-full rounded-full bg-gradient-to-r',
                isInfinite && tierInfo ? (
                  tierInfo.currentTier.color === 'vault-gold' ? 'from-vault-gold to-amber-400' :
                  tierInfo.currentTier.color === 'emerald' ? 'from-emerald-500 to-emerald-400' :
                  tierInfo.currentTier.color === 'rose' ? 'from-rose-500 to-rose-400' :
                  tierInfo.currentTier.color === 'violet' ? 'from-violet-500 to-violet-400' :
                  tierInfo.currentTier.color === 'cyan' ? 'from-cyan-500 to-cyan-400' :
                  tierInfo.currentTier.color === 'yellow' ? 'from-yellow-500 to-yellow-400' :
                  tierInfo.currentTier.color === 'amber' ? 'from-amber-500 to-amber-400' :
                  'from-white/30 to-white/50'
                ) : (
                  finitePercentage >= 80 ? 'from-emerald-500 to-emerald-400' :
                  finitePercentage >= 50 ? 'from-vault-gold to-amber-400' :
                  finitePercentage >= 25 ? 'from-amber-500 to-orange-400' :
                  'from-white/30 to-white/50'
                )
              )}
              initial={{ width: '0%' }}
              animate={{ width: `${percentage}%` }}
              transition={{ type: 'spring', stiffness: 50, damping: 15, delay: 0.2 }}
            />
          </div>
        )}
      </div>
      
      {/* Content - Desktop */}
      <div className="hidden sm:flex items-start justify-between gap-3 relative z-10">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-widest text-white/40 mb-2 leading-none">
            {displayLabel}
          </p>
          <div className="flex items-baseline gap-2">
            <motion.p 
              className="text-3xl font-heading text-white tabular-nums truncate"
              animate={isPulsing ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {value}
            </motion.p>
            {renderMaxIndicator()}
          </div>
          {subtitle && (
            <p className="text-xs text-white/40 mt-1">{subtitle}</p>
          )}
          {trend && (
            <p className={cn(
              'text-xs mt-2',
              trend > 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {trend > 0 ? '+' : ''}{trend}% from last month
            </p>
          )}
          
          {/* Progress bar indicator */}
          {showProgressBar && (
            <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className={cn(
                  'h-full rounded-full bg-gradient-to-r',
                  isInfinite && tierInfo ? (
                    tierInfo.currentTier.color === 'vault-gold' ? 'from-vault-gold to-amber-400' :
                    tierInfo.currentTier.color === 'emerald' ? 'from-emerald-500 to-emerald-400' :
                    tierInfo.currentTier.color === 'rose' ? 'from-rose-500 to-rose-400' :
                    tierInfo.currentTier.color === 'violet' ? 'from-violet-500 to-violet-400' :
                    tierInfo.currentTier.color === 'cyan' ? 'from-cyan-500 to-cyan-400' :
                    tierInfo.currentTier.color === 'yellow' ? 'from-yellow-500 to-yellow-400' :
                    tierInfo.currentTier.color === 'amber' ? 'from-amber-500 to-amber-400' :
                    'from-white/30 to-white/50'
                  ) : (
                    finitePercentage >= 80 ? 'from-emerald-500 to-emerald-400' :
                    finitePercentage >= 50 ? 'from-vault-gold to-amber-400' :
                    finitePercentage >= 25 ? 'from-amber-500 to-orange-400' :
                    'from-white/30 to-white/50'
                  )
                )}
                initial={{ width: '0%' }}
                animate={{ width: `${percentage}%` }}
                transition={{ type: 'spring', stiffness: 50, damping: 15, delay: 0.2 }}
              />
            </div>
          )}
        </div>
        {Icon && (
          <motion.div 
            className="shrink-0"
            animate={isPulsing ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            <IconChip variant={iconVariant} size="md">
              <Icon weight="duotone" />
            </IconChip>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
