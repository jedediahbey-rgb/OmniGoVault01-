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

export default function PageHeader({ 
  title, 
  subtitle, 
  icon: Icon,
  actions,
  breadcrumbs,
  helpKey
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
      
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className="w-12 h-12 rounded-xl bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center">
              <Icon className="w-6 h-6 text-vault-gold" weight="duotone" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-heading text-white tracking-tight">
                {safeTitle || 'Untitled'}
              </h1>
              {helpKey && <PageHelpTooltip pageKey={helpKey} />}
            </div>
            {safeSubtitle && (
              <p className="text-white/60 mt-1">{safeSubtitle}</p>
            )}
          </div>
        </div>
        
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  );
}
