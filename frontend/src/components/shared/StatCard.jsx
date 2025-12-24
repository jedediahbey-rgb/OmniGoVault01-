import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import IconChip from '../ui/icon-chip';

export default function StatCard({ 
  title,
  label, 
  value, 
  icon: Icon, 
  trend,
  subtitle,
  className,
  variant = 'default' 
}) {
  const variants = {
    default: 'border-white/5 bg-white/5',
    gold: 'border-vault-gold/20 bg-vault-gold/5',
    blue: 'border-vault-blue/20 bg-vault-blue/5'
  };

  const iconVariant = variant === 'gold' ? 'gold' : variant === 'blue' ? 'blue' : 'default';
  const displayLabel = title || label;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'rounded-xl border backdrop-blur-sm p-4 sm:p-5',
        variants[variant],
        className
      )}
    >
      {/* Mobile: Icon on top-right, text below */}
      <div className="sm:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.25em] text-white/60 leading-none">
              {displayLabel}
            </p>
          </div>
          {Icon && (
            <div className="shrink-0">
              <IconChip variant={iconVariant} size="sm">
                <Icon weight="duotone" />
              </IconChip>
            </div>
          )}
        </div>
        <p className="text-2xl font-heading text-white tabular-nums mt-2">{value}</p>
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
      </div>
      
      {/* Desktop: Original side-by-side layout */}
      <div className="hidden sm:flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-widest text-white/40 mb-2 leading-none">
            {displayLabel}
          </p>
          <p className="text-3xl font-heading text-white tabular-nums truncate">{value}</p>
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
        </div>
        {Icon && (
          <div className="shrink-0">
            <IconChip variant={iconVariant} size="md">
              <Icon weight="duotone" />
            </IconChip>
          </div>
        )}
      </div>
    </motion.div>
  );
}
