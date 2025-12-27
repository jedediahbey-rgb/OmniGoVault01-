import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { fadeInUp } from '../../lib/motion';
import PageHelpTooltip from './PageHelpTooltip';

// Helper to safely convert any value to a renderable string
const safeString = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    // If it's a React element, return it as-is
    if (value.$$typeof) return value;
    // If it has a label or name property, use that
    if (value.label) return String(value.label);
    if (value.name) return String(value.name);
    // Otherwise, try to convert to JSON or fall back to empty string
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return String(value);
};

/**
 * PageHeader Component
 * 
 * Props:
 * - title: Main page title (string)
 * - subtitle: Secondary text below title (string)
 * - icon: Phosphor icon component to display
 * - actions: React elements for top-right action buttons
 * - breadcrumbs: Array of breadcrumb items
 * - titleAction: Element placed NEXT TO the title (e.g., create folder button)
 * - subtitleAction: Element placed NEXT TO the subtitle (e.g., help "?" tooltip)
 * - helpKey: DEPRECATED - use subtitleAction with PageHelpTooltip instead
 * 
 * LOCKED POSITIONING STANDARD:
 * - All "?" help icons go in subtitleAction (next to subtitle)
 * - Action buttons like "create new" go in titleAction (next to title)
 * - DO NOT change this layout without explicit user request
 */
export default function PageHeader({ 
  title, 
  subtitle, 
  icon: Icon,
  actions,
  breadcrumbs,
  helpKey,
  titleAction,
  subtitleAction
}) {
  // Helper to render breadcrumb - handles both string and object formats
  const renderBreadcrumb = (crumb, isLast) => {
    // If crumb is a string, render directly
    if (typeof crumb === 'string') {
      return <span className={isLast ? 'text-vault-gold' : ''}>{crumb}</span>;
    }
    
    // If crumb is an object with label/href
    if (crumb && typeof crumb === 'object') {
      const label = safeString(crumb.label || crumb.name || crumb);
      const href = crumb.href || crumb.link;
      
      if (href && !isLast) {
        return (
          <Link 
            to={href} 
            className="hover:text-vault-gold transition-colors"
          >
            {label}
          </Link>
        );
      }
      return <span className={isLast ? 'text-vault-gold' : ''}>{label}</span>;
    }
    
    // Fallback for any other type
    return <span className={isLast ? 'text-vault-gold' : ''}>--</span>;
  };

  // Safely render title and subtitle
  const safeTitle = safeString(title);
  const safeSubtitle = subtitle ? safeString(subtitle) : null;

  return (
    <motion.div 
      {...fadeInUp}
      className="mb-8"
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-white/40 mb-4">
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-2">
              {idx > 0 && <span>/</span>}
              {renderBreadcrumb(crumb, idx === breadcrumbs.length - 1)}
            </span>
          ))}
        </div>
      )}
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {Icon && (
            <div className="w-12 h-12 rounded-xl bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center flex-shrink-0">
              <Icon className="w-6 h-6 text-vault-gold" weight="duotone" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-heading text-white tracking-tight">
                {safeTitle || 'Untitled'}
              </h1>
              {titleAction && <div className="shrink-0">{titleAction}</div>}
            </div>
            {(safeSubtitle || helpKey || subtitleAction) && (
              <p className="text-white/60 text-sm sm:text-base mt-1">
                {safeSubtitle}
                {(subtitleAction || helpKey) && (
                  <span className="inline-flex align-middle ml-1.5">
                    {subtitleAction}
                    {helpKey && <PageHelpTooltip pageKey={helpKey} />}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  );
}
