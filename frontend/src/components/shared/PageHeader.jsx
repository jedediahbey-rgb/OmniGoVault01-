import { motion } from 'framer-motion';
import { fadeInUp } from '../../lib/motion';

export default function PageHeader({ 
  title, 
  subtitle, 
  icon: Icon,
  actions,
  breadcrumbs 
}) {
  return (
    <motion.div 
      {...fadeInUp}
      className="mb-8"
    >
      {breadcrumbs && (
        <div className="flex items-center gap-2 text-sm text-white/40 mb-4">
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-2">
              {idx > 0 && <span>/</span>}
              <span className={idx === breadcrumbs.length - 1 ? 'text-vault-gold' : ''}>
                {crumb}
              </span>
            </span>
          ))}
        </div>
      )}
      
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className="w-12 h-12 rounded-xl bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center">
              <Icon className="w-6 h-6 text-vault-gold" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-heading text-white tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-white/60 mt-1">{subtitle}</p>
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
