import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretDown } from '@phosphor-icons/react';
import { cn } from '../../lib/utils';

/**
 * ExpandableText - Progressive disclosure component for text content
 * Shows truncated preview with "Read more" toggle
 */
export function ExpandableText({ 
  text, 
  previewLines = 3, 
  className = '',
  textClassName = ''
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if text is long enough to need truncation
  const needsTruncation = text && text.length > 150;

  if (!needsTruncation) {
    return (
      <p className={cn("text-white/60 text-sm leading-relaxed break-words", textClassName, className)}>
        {text}
      </p>
    );
  }

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        <motion.div
          key={isExpanded ? 'expanded' : 'collapsed'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <p 
            className={cn(
              "text-white/60 text-sm leading-relaxed break-words whitespace-normal",
              !isExpanded && `line-clamp-${previewLines}`,
              textClassName
            )}
            style={!isExpanded ? { 
              display: '-webkit-box',
              WebkitLineClamp: previewLines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            } : {}}
          >
            {text}
          </p>
        </motion.div>
      </AnimatePresence>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="mt-2 flex items-center gap-1 text-vault-gold/80 hover:text-vault-gold text-xs font-medium transition-colors"
      >
        <span>{isExpanded ? 'Show less' : 'Read more'}</span>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <CaretDown className="w-3 h-3" weight="duotone" />
        </motion.span>
      </button>
    </div>
  );
}

/**
 * ExpandableCard - Card with expandable content section
 * Smooth height animation using Framer Motion
 */
export function ExpandableCard({
  children,
  expandedContent,
  isExpanded,
  onToggle,
  className = ''
}) {
  return (
    <div className={className}>
      {children}
      
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ 
              height: { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] },
              opacity: { duration: 0.2 }
            }}
            className="overflow-hidden"
          >
            {expandedContent}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * RmIdDisplay - Proper display for RM-ID codes with truncation and copy
 * Only this component should have aggressive overflow handling
 */
export function RmIdDisplay({ rmId, className = '' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(rmId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 bg-vault-gold/10 rounded",
        "max-w-full overflow-hidden group transition-colors hover:bg-vault-gold/20",
        className
      )}
      title={`Click to copy: ${rmId}`}
    >
      <span className="text-vault-gold font-mono text-xs sm:text-sm truncate whitespace-nowrap overflow-hidden">
        {rmId}
      </span>
      <span className="text-vault-gold/50 text-[10px] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? '✓' : 'copy'}
      </span>
    </button>
  );
}

export default ExpandableText;
