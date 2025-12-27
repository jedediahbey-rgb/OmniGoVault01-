/**
 * MonoChip - Monospace ID display component
 * 
 * A consistent styling component for displaying system IDs,
 * hashes, RM-IDs, ledger refs, and audit metadata.
 * 
 * Usage:
 * <MonoChip>RM-RF743916765US-20.001</MonoChip>
 * <MonoChip variant="gold">TEMP-001</MonoChip>
 * <MonoChip truncateRmId>RM-RF743916765US-20.001</MonoChip>
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

/**
 * Smart RM-ID truncation that preserves meaningful parts
 * Always ends at "US" or "US-XX" where XX is the prime number
 * Example: "RM-RF743916765US-20.001" -> "...US-20" (truncated)
 */
function truncateRmIdSmart(rmId, maxLength = 20) {
  if (!rmId || rmId.length <= maxLength) return rmId;
  
  // Find US pattern - could be "US" or "US-XX"
  const usMatch = rmId.match(/US(-\d+)?/);
  if (!usMatch) {
    // No US pattern found, just truncate normally
    return rmId.substring(0, maxLength - 3) + '...';
  }
  
  const usIndex = rmId.indexOf(usMatch[0]);
  const usEnd = usIndex + usMatch[0].length;
  
  // Include "US" or "US-XX" (up to the hyphen after the prime)
  // e.g., "US-20" from "RM-RF743916765US-20.001"
  let endIndex = usEnd;
  
  // Check if there's more after US-XX (like .001)
  // We want to show "US-XX" but not the sub-record numbers
  const afterUs = rmId.substring(usEnd);
  const primeMatch = afterUs.match(/^(-\d+)/);
  if (primeMatch) {
    endIndex = usEnd + primeMatch[0].length;
  }
  
  const suffix = rmId.substring(usIndex, endIndex);
  const prefix = rmId.substring(0, usIndex);
  
  // If the prefix + suffix fits, show it all
  if (prefix.length + suffix.length <= maxLength) {
    return rmId.substring(0, endIndex);
  }
  
  // Truncate prefix with ellipsis
  const availableForPrefix = maxLength - suffix.length - 3; // 3 for "..."
  if (availableForPrefix > 0) {
    return prefix.substring(0, availableForPrefix) + '...' + suffix;
  }
  
  // Just show the suffix
  return '...' + suffix;
}

export default function MonoChip({
  children,
  variant = 'default',
  size = 'sm',
  className,
  copyable = false,
  truncateRmId = false,
  maxLength = 20,
  ...props
}) {
  const handleCopy = () => {
    if (copyable && children) {
      navigator.clipboard.writeText(String(children));
    }
  };

  // Apply smart truncation if requested
  let displayValue = children;
  if (truncateRmId && typeof children === 'string') {
    displayValue = truncateRmIdSmart(children, maxLength);
  }

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
      title={copyable ? 'Click to copy' : (truncateRmId ? String(children) : undefined)}
      {...props}
    >
      {displayValue}
    </span>
  );
}
