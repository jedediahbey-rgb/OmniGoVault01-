import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import IconChip from '../ui/icon-chip';

export default function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  trend,
  className,
  variant = 'default' 
}) {
  const variants = {
    default: 'border-white/5 bg-white/5',
    gold: 'border-vault-gold/20 bg-vault-gold/5',
    blue: 'border-vault-blue/20 bg-vault-blue/5'
  };

  const iconVariant = variant === 'gold' ? 'gold' : variant === 'blue' ? 'blue' : 'default';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'rounded-xl border backdrop-blur-sm p-4 sm:p-5 overflow-hidden',
        variants[variant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-widest text-white/40 mb-2">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-heading text-white tabular-nums">{value}</p>
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
          <IconChip variant={iconVariant} size="md">
            <Icon />
          </IconChip>
        )}
      </div>
    </motion.div>
  );
}
