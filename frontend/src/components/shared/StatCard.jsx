import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

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

  const iconVariants = {
    default: {
      bg: 'bg-white/10 border-white/20',
      icon: 'text-white/70',
      shadow: 'shadow-lg shadow-white/5',
      glow: 'drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]'
    },
    gold: {
      bg: 'bg-vault-gold/20 border-vault-gold/30',
      icon: 'text-vault-gold',
      shadow: 'shadow-lg shadow-vault-gold/10',
      glow: 'drop-shadow-[0_0_4px_rgba(198,168,124,0.5)]'
    },
    blue: {
      bg: 'bg-vault-blue/20 border-vault-blue/30',
      icon: 'text-vault-blue',
      shadow: 'shadow-lg shadow-vault-blue/10',
      glow: 'drop-shadow-[0_0_4px_rgba(96,165,250,0.5)]'
    }
  };

  const iconStyle = iconVariants[variant] || iconVariants.default;

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
          <div className={cn(
            'w-10 h-10 sm:w-[42px] sm:h-[42px] rounded-xl flex items-center justify-center shrink-0 border',
            iconStyle.bg,
            iconStyle.shadow
          )}>
            <Icon className={cn(
              'w-5 h-5 sm:w-6 sm:h-6',
              iconStyle.icon,
              iconStyle.glow
            )} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
