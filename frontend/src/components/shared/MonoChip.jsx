/**
 * MonoChip - Monospace ID display component
 * 
 * A consistent styling component for displaying system IDs,
 * hashes, RM-IDs, ledger refs, and audit metadata.
 * 
 * Usage:
 * <MonoChip>RM-RF743916765US-20.001</MonoChip>
 * <MonoChip variant="gold">TEMP-001</MonoChip>
 */

import { cn } from '../../lib/utils';

const variantClasses = {
  default: 'bg-white/5 text-white/60 border-white/10',
  gold: 'bg-vault-gold/10 text-vault-gold border-vault-gold/20',
  muted: 'bg-white/[0.02] text-white/40 border-transparent',
  live: 'bg-status-live/10 text-status-live border-status-live/20',
  error: 'bg-status-error/10 text-status-error border-status-error/20',
};

const sizeClasses = {
  xs: 'text-[10px] px-1.5 py-0.5',
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
};

export default function MonoChip({
  children,
  variant = 'default',
  size = 'sm',
  className,
  copyable = false,
  ...props
}) {
  const handleCopy = () => {
    if (copyable && children) {
      navigator.clipboard.writeText(String(children));
    }
  };

  return (
    <span
      className={cn(
        'font-mono rounded border inline-block tracking-wide break-all',
        variantClasses[variant],
        sizeClasses[size],
        copyable && 'cursor-pointer hover:bg-white/10 transition-colors',
        className
      )}
      onClick={copyable ? handleCopy : undefined}
      title={copyable ? 'Click to copy' : undefined}
      {...props}
    >
      {children}
    </span>
  );
}
