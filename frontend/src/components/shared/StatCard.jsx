import { motion, useSpring, useTransform } from 'framer-motion';
import { cn } from '../../lib/utils';
import IconChip from '../ui/icon-chip';
import { useState, useEffect, useMemo } from 'react';

// Define max thresholds for each stat type
const MAX_VALUES = {
  portfolios: 10,
  documents: 50,
  assets: 100,
  notices: 20,
  default: 50
};

// Color configurations for different fill levels
const getProgressColor = (percentage) => {
  if (percentage >= 80) return { bar: 'from-emerald-500/30 to-emerald-400/50', glow: 'shadow-emerald-500/20' };
  if (percentage >= 50) return { bar: 'from-vault-gold/30 to-vault-gold/50', glow: 'shadow-vault-gold/20' };
  if (percentage >= 25) return { bar: 'from-amber-500/20 to-amber-400/40', glow: 'shadow-amber-500/10' };
  return { bar: 'from-white/10 to-white/20', glow: '' };
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
  maxValue // Optional override for max value
}) {
  const variants = {
    default: 'border-white/5 bg-white/5',
    gold: 'border-vault-gold/20 bg-vault-gold/5',
    blue: 'border-vault-blue/20 bg-vault-blue/5'
  };

  const iconVariant = variant === 'gold' ? 'gold' : variant === 'blue' ? 'blue' : 'default';
  const displayLabel = title || label;
  
  // Calculate fill percentage
  const statKey = displayLabel?.toLowerCase() || 'default';
  const max = maxValue || MAX_VALUES[statKey] || MAX_VALUES.default;
  const percentage = Math.min((value / max) * 100, 100);
  
  // Get color configuration based on percentage
  const colorConfig = getProgressColor(percentage);
  
  // Animated spring for smooth fill
  const springValue = useSpring(0, { stiffness: 50, damping: 15 });
  
  useEffect(() => {
    springValue.set(percentage);
  }, [percentage, springValue]);
  
  // Transform spring to height percentage
  const fillHeight = useTransform(springValue, [0, 100], ['0%', '100%']);
  
  // Pulse animation when value changes
  const [isPulsing, setIsPulsing] = useState(false);
  
  useEffect(() => {
    if (value > 0) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 600);
      return () => clearTimeout(timer);
    }
  }, [value]);

  // Milestone indicators
  const milestones = useMemo(() => {
    const result = [];
    for (let i = 25; i <= 75; i += 25) {
      result.push({
        percent: i,
        reached: percentage >= i
      });
    }
    return result;
  }, [percentage]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'relative rounded-xl border backdrop-blur-sm p-4 sm:p-5 overflow-hidden',
        variants[variant],
        isPulsing && 'ring-2 ring-vault-gold/30',
        colorConfig.glow && `shadow-lg ${colorConfig.glow}`,
        className
      )}
    >
      {/* Animated Progress Fill Background */}
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
      
      {/* Milestone dots on the right edge */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-10">
        {milestones.map((m) => (
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
        <div className="flex items-baseline gap-2 mt-2">
          <motion.p 
            className="text-2xl font-heading text-white tabular-nums"
            animate={isPulsing ? { scale: [1, 1.05, 1] } : {}}
          >
            {value}
          </motion.p>
          <span className="text-[10px] text-white/30">/ {max}</span>
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
        
        {/* Mini progress bar for mobile */}
        <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            className={cn(
              'h-full rounded-full bg-gradient-to-r',
              percentage >= 80 ? 'from-emerald-500 to-emerald-400' :
              percentage >= 50 ? 'from-vault-gold to-amber-400' :
              percentage >= 25 ? 'from-amber-500 to-orange-400' :
              'from-white/30 to-white/50'
            )}
            initial={{ width: '0%' }}
            animate={{ width: `${percentage}%` }}
            transition={{ type: 'spring', stiffness: 50, damping: 15, delay: 0.2 }}
          />
        </div>
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
            <span className="text-xs text-white/30">/ {max}</span>
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
          <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className={cn(
                'h-full rounded-full bg-gradient-to-r',
                percentage >= 80 ? 'from-emerald-500 to-emerald-400' :
                percentage >= 50 ? 'from-vault-gold to-amber-400' :
                percentage >= 25 ? 'from-amber-500 to-orange-400' :
                'from-white/30 to-white/50'
              )}
              initial={{ width: '0%' }}
              animate={{ width: `${percentage}%` }}
              transition={{ type: 'spring', stiffness: 50, damping: 15, delay: 0.2 }}
            />
          </div>
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
