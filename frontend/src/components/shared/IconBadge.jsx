/**
 * IconBadge - Premium icon container component
 * 
 * A reusable component that wraps icons in a consistent,
 * luxurious container with embossed styling and hover effects.
 * 
 * Usage:
 * <IconBadge icon={FileText} />
 * <IconBadge icon={Scales} size="lg" variant="gold" />
 */

import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-14 h-14',
};

const iconSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-7 h-7',
};

const variantClasses = {
  default: `
    bg-gradient-to-br from-white/5 to-transparent 
    border border-white/10 
    shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]
    group-hover:border-vault-gold/40 
    group-hover:shadow-[0_0_15px_rgba(212,175,55,0.1)]
  `,
  gold: `
    bg-gradient-to-br from-vault-gold/20 to-vault-gold/5 
    border border-vault-gold/30 
    shadow-[inset_0_1px_0_0_rgba(212,175,55,0.1)]
    group-hover:border-vault-gold/50 
    group-hover:shadow-[0_0_20px_rgba(212,175,55,0.2)]
  `,
  muted: `
    bg-white/5 
    border border-white/5 
    shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]
  `,
  live: `
    bg-gradient-to-br from-status-live/20 to-status-live/5 
    border border-status-live/30 
    shadow-[inset_0_1px_0_0_rgba(57,255,20,0.1)]
    group-hover:shadow-[0_0_15px_rgba(57,255,20,0.15)]
  `,
  error: `
    bg-gradient-to-br from-status-error/20 to-status-error/5 
    border border-status-error/30 
    shadow-[inset_0_1px_0_0_rgba(255,51,51,0.1)]
  `,
  blue: `
    bg-gradient-to-br from-blue-500/20 to-blue-500/5 
    border border-blue-500/30 
    shadow-[inset_0_1px_0_0_rgba(59,130,246,0.1)]
    group-hover:border-blue-500/50 
    group-hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]
  `,
  emerald: `
    bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 
    border border-emerald-500/30 
    shadow-[inset_0_1px_0_0_rgba(16,185,129,0.1)]
    group-hover:border-emerald-500/50 
    group-hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]
  `,
  amber: `
    bg-gradient-to-br from-amber-500/20 to-amber-500/5 
    border border-amber-500/30 
    shadow-[inset_0_1px_0_0_rgba(245,158,11,0.1)]
    group-hover:border-amber-500/50 
    group-hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]
  `,
  red: `
    bg-gradient-to-br from-red-500/20 to-red-500/5 
    border border-red-500/30 
    shadow-[inset_0_1px_0_0_rgba(239,68,68,0.1)]
    group-hover:border-red-500/50 
    group-hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]
  `,
  purple: `
    bg-gradient-to-br from-purple-500/20 to-purple-500/5 
    border border-purple-500/30 
    shadow-[inset_0_1px_0_0_rgba(168,85,247,0.1)]
    group-hover:border-purple-500/50 
    group-hover:shadow-[0_0_15px_rgba(168,85,247,0.15)]
  `,
};

const iconColorClasses = {
  default: 'text-white/70 group-hover:text-vault-gold',
  gold: 'text-vault-gold',
  muted: 'text-white/40',
  live: 'text-status-live',
  error: 'text-status-error',
  blue: 'text-blue-400',
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  purple: 'text-purple-400',
  cyan: 'text-cyan-400',
  orange: 'text-orange-400',
  gray: 'text-gray-400',
};

const IconBadge = forwardRef(({
  icon: Icon,
  size = 'md',
  variant = 'default',
  className,
  iconClassName,
  weight = 'regular',
  ...props
}, ref) => {
  if (!Icon) return null;

  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-center rounded-xl transition-all duration-300',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      <Icon
        className={cn(
          iconSizeClasses[size],
          iconColorClasses[variant],
          'transition-colors duration-300',
          iconClassName
        )}
        weight={weight}
      />
    </div>
  );
});

IconBadge.displayName = 'IconBadge';

export default IconBadge;

// Convenience exports for specific module icons
export const MODULE_ICONS = {
  minutes: 'FileText',
  distributions: 'Coins',
  disputes: 'Scales',
  insurance: 'ShieldCheck',
  compensation: 'Wallet',
  assets: 'Vault',
  parties: 'Users',
  ledger: 'Book',
  documents: 'Files',
  templates: 'Stamp',
  learning: 'Brain',
  health: 'Pulse',
  binder: 'Archive',
};
