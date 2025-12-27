import { useState } from 'react';
import { Question, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

// Help content for each page/section
export const PAGE_HELP_CONTENT = {
  dashboard: {
    title: 'Dashboard',
    description: 'Your central hub for trust management. View portfolio summaries, quick actions, recent documents, and continue your learning journey.'
  },
  learn: {
    title: 'Learn',
    description: 'Master equity jurisprudence through structured lessons. Covers foundations of equity, maxims, and trust fundamentals with interactive modules.'
  },
  maxims: {
    title: 'Maxims of Equity',
    description: 'Study the foundational principles that guide equitable decisions. Flip through cards to learn and memorize the core maxims of equity law.'
  },
  glossary: {
    title: 'Glossary',
    description: 'Comprehensive dictionary of trust and equity terminology. Search and browse definitions for legal terms used throughout the platform.'
  },
  diagrams: {
    title: 'Diagrams',
    description: 'Visual representations of trust structures, relationships, and legal concepts. Interactive diagrams help understand complex trust arrangements.'
  },
  nodeMap: {
    title: 'Node Map',
    description: 'Interactive visualization of trust relationships and entity connections. Map out beneficiaries, trustees, and assets in a visual network.'
  },
  scenarios: {
    title: 'Scenarios',
    description: 'Practice with real-world trust scenarios. Work through case studies to understand how equity principles apply in various situations.'
  },
  ledger: {
    title: 'Governance Ledger',
    description: 'Unified timeline of all trust governance activities. Track meetings, distributions, disputes, and policy changes with full audit trails.'
  },
  vault: {
    title: 'Document Vault',
    description: 'Secure storage for all trust documents. Upload, organize, and manage legal documents with version control and access permissions.'
  },
  governance: {
    title: 'Governance Console',
    description: 'Manage trust operations including meetings, distributions, disputes, insurance policies, and compensation records. Create and track governance actions.'
  },
  templates: {
    title: 'Templates',
    description: 'Pre-built document templates for common trust instruments. Generate minutes, notices, resolutions, and other legal documents.'
  },
  assistant: {
    title: 'AI Assistant',
    description: 'Intelligent helper for trust management questions. Get guidance on procedures, document drafting, and equity law concepts.'
  },
  health: {
    title: 'Trust Health',
    description: 'Monitor the overall health of your trust portfolios. Identify missing documents, overdue actions, and compliance issues.'
  },
  diagnostics: {
    title: 'Diagnostics',
    description: 'Deep analysis of trust integrity and data quality. Run checks to identify orphan records, broken links, and data inconsistencies.'
  },
  threadManager: {
    title: 'Thread Manager',
    description: 'Organize and manage ledger threads across portfolios. Merge, split, or reassign activity threads for better record organization.'
  },
  binder: {
    title: 'Portfolio Binder',
    description: 'Generate court-ready PDF packets from your trust documents. Create consolidated binders with table of contents and bookmarks for audits or legal proceedings.'
  },
  auditLog: {
    title: 'Audit Log',
    description: 'Your complete diary of all system activities. Automatically tracks document changes, binder generation, record finalizations, and other important events. Use for compliance reporting and accountability.'
  },
  settings: {
    title: 'Settings',
    description: 'Configure your account preferences, notification settings, and platform customizations.'
  }
};

export default function PageHelpTooltip({ pageKey, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const content = PAGE_HELP_CONTENT[pageKey];
  
  if (!content) return null;
  
  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-5 h-5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 flex items-center justify-center transition-all duration-200 group"
        aria-label={`Help for ${content.title}`}
      >
        <Question className="w-3 h-3 text-white/40 group-hover:text-white/70" weight="bold" />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[100] bg-black/50"
            />
            
            {/* Tooltip - Centered modal with consistent text alignment */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed z-[101] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[280px] p-5 bg-[#0A0F1A] border border-vault-gold/30 rounded-xl shadow-2xl"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-3 right-3 p-1 text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="w-4 h-4" weight="bold" />
              </button>
              
              <h4 className="text-base font-semibold text-vault-gold mb-3 pr-6">{content.title}</h4>
              <p className="text-sm text-white/70 leading-[1.6] text-justify">{content.description}</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </span>
  );
}
