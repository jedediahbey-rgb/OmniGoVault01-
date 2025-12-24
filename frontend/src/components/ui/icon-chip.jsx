import { cn } from '../../lib/utils';

/**
 * IconChip - Unified icon container with consistent styling
 * Uses currentColor for icon color, accepts accent variant
 */
export default function IconChip({ 
  children, 
  variant = 'default',
  size = 'md',
  className 
}) {
  const variants = {
    default: {
      container: 'bg-white/10 border-white/20 shadow-white/5',
      text: 'text-white/70'
    },
    gold: {
      container: 'bg-vault-gold/20 border-vault-gold/30 shadow-vault-gold/10',
      text: 'text-vault-gold'
    },
    green: {
      container: 'bg-green-500/20 border-green-500/30 shadow-green-500/10',
      text: 'text-green-400'
    },
    red: {
      container: 'bg-red-500/20 border-red-500/30 shadow-red-500/10',
      text: 'text-red-400'
    },
    blue: {
      container: 'bg-blue-500/20 border-blue-500/30 shadow-blue-500/10',
      text: 'text-blue-400'
    }
  };

  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10 sm:w-[42px] sm:h-[42px]',
    lg: 'w-12 h-12 sm:w-14 sm:h-14'
  };

  const iconSizes = {
    sm: '[&>svg]:w-4 [&>svg]:h-4',
    md: '[&>svg]:w-5 [&>svg]:h-5 sm:[&>svg]:w-6 sm:[&>svg]:h-6',
    lg: '[&>svg]:w-6 [&>svg]:h-6 sm:[&>svg]:w-7 sm:[&>svg]:h-7'
  };

  const style = variants[variant] || variants.default;

  return (
    <div 
      className={cn(
        'rounded-xl flex items-center justify-center shrink-0 border shadow-lg',
        'focus:outline-none', // Remove default focus ring
        sizes[size],
        style.container,
        style.text,
        iconSizes[size],
        '[&>svg]:drop-shadow-[0_0_3px_currentColor]', // Glow using currentColor
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * CurrencyDisplay - Properly formatted currency with overflow handling
 * Never adds extra "$" - uses Intl.NumberFormat only
 */
export function CurrencyDisplay({ 
  value, 
  variant = 'default',
  size = 'md',
  className 
}) {
  const colorVariants = {
    default: 'text-white',
    gold: 'text-vault-gold',
    green: 'text-green-400',
    red: 'text-red-400'
  };

  const sizeVariants = {
    sm: 'text-sm sm:text-base',
    md: 'text-base sm:text-xl',
    lg: 'text-xl sm:text-2xl'
  };

  // Format using Intl.NumberFormat - this includes the "$" symbol
  const formatted = (value === null || value === undefined || value === '') 
    ? '-' 
    : new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);

  return (
    <span 
      className={cn(
        'inline-flex max-w-full font-heading tabular-nums',
        'overflow-hidden',
        colorVariants[variant],
        sizeVariants[size],
        className
      )}
    >
      <span className="min-w-0 truncate">{formatted}</span>
    </span>
  );
}
