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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'rounded-xl border backdrop-blur-sm p-5',
        variants[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/40 mb-2">
            {label}
          </p>
          <p className="text-3xl font-heading text-white">{value}</p>
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
            'w-10 h-10 rounded-lg flex items-center justify-center',
            variant === 'gold' ? 'bg-vault-gold/20' : 
            variant === 'blue' ? 'bg-vault-blue/20' : 'bg-white/10'
          )}>
            <Icon className={cn(
              'w-5 h-5',
              variant === 'gold' ? 'text-vault-gold' : 
              variant === 'blue' ? 'text-vault-blue' : 'text-white/60'
            )} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
