import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  ArrowCounterClockwise,
  CaretRight,
  CaretDown,
  Check,
  Clock,
  DotsThreeVertical,
  Download,
  FileText,
  Folder,
  FolderOpen,
  MagnifyingGlass,
  Plus,
  ShieldCheck,
  Star,
  Tag,
  Trash,
  X,
  Swap,
  Lock,
  Eye
} from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { humanizeSlug } from '../lib/utils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ============================================================================
// VAULT STATE MACHINE - Clean, predictable state flow
// ============================================================================
const VAULT_STATES = {
  LOADING: 'loading',
  NO_PORTFOLIOS: 'no_portfolios',
  SELECT_PORTFOLIO: 'select_portfolio',
  READY: 'ready',
  ERROR: 'error'
};

// ============================================================================
// PREMIUM ANIMATED COMPONENTS
// ============================================================================

// Glassy sidebar with animated shimmer
function GlassSidebar({ children, className = '' }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-white/[0.03]" />
      
      {/* Animated shimmer effect */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -inset-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent skew-x-12"
          animate={{
            x: ['0%', '200%'],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>
      
      {/* Glass surface */}
      <div className="absolute inset-0 backdrop-blur-xl bg-[#0a0f1a]/80" />
      
      {/* Border glow */}
      <div className="absolute inset-0 border-r border-white/10" />
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        {children}
      </div>
    </div>
  );
}

// Premium document card with museum-style framing
function DocumentCard({ doc, isPinned, onPin, onOpen, onTrash, onExport, isSelected, onSelect }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => onSelect(doc)}
      className={`
        relative group cursor-pointer
        bg-gradient-to-b from-white/[0.08] to-white/[0.02]
        backdrop-blur-sm
        border transition-all duration-300
        rounded-lg overflow-hidden
        ${isSelected 
          ? 'border-vault-gold/60 shadow-[0_0_30px_rgba(212,175,55,0.15)]' 
          : 'border-white/10 hover:border-white/20'
        }
      `}
    >
      {/* Hover glow effect - Desktop only */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="hidden lg:block absolute inset-0 bg-gradient-to-t from-vault-gold/5 to-transparent pointer-events-none"
          />
        )}
      </AnimatePresence>
      
      {/* Card content - More compact on mobile */}
      <div className="p-4 lg:p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3 lg:mb-4">
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center">
            <FileText className="w-5 h-5 lg:w-6 lg:h-6 text-vault-gold" weight="duotone" />
          </div>
          
          <div className="flex items-center gap-2">
            {isPinned && (
              <Star className="w-4 h-4 text-vault-gold fill-vault-gold" weight="fill" />
            )}
            {doc.is_locked && (
              <Lock className="w-4 h-4 text-green-400" weight="fill" />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="p-1.5 rounded-md text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DotsThreeVertical className="w-4 h-4" weight="bold" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#0f1629] border-white/10 min-w-[160px]">
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onOpen(doc); }}
                  className="text-white/70 hover:text-white focus:text-white gap-2"
                >
                  <Eye className="w-4 h-4" weight="duotone" />
                  Open
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onPin(doc.document_id); }}
                  className="text-white/70 hover:text-white focus:text-white gap-2"
                >
                  <Star className="w-4 h-4" weight="duotone" />
                  {isPinned ? 'Unpin' : 'Pin'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onExport(doc); }}
                  className="text-white/70 hover:text-white focus:text-white gap-2"
                >
                  <Download className="w-4 h-4" weight="duotone" />
                  Export PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onTrash(doc.document_id); }}
                  className="text-red-400 hover:text-red-300 focus:text-red-300 gap-2"
                >
                  <Trash className="w-4 h-4" weight="duotone" />
                  Move to Trash
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Title */}
        <h3 className="text-white font-medium text-sm lg:text-base mb-1 line-clamp-2 leading-snug">
          {doc.title}
        </h3>
        
        {/* Type badge */}
        <p className="text-vault-gold/70 text-[10px] lg:text-xs font-medium uppercase tracking-wider mb-3 lg:mb-4">
          {humanizeSlug(doc.document_type)}
        </p>
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-2 lg:pt-3 border-t border-white/5">
          <span className="flex items-center gap-1 lg:gap-1.5 text-white/40 text-[10px] lg:text-xs">
            <Clock className="w-3 h-3 lg:w-3.5 lg:h-3.5" weight="duotone" />
            {new Date(doc.updated_at).toLocaleDateString()}
          </span>
          <span className={`
            px-1.5 lg:px-2 py-0.5 rounded text-[9px] lg:text-[10px] font-medium uppercase tracking-wide
            ${doc.is_locked 
              ? 'bg-green-500/20 text-green-400' 
              : doc.status === 'completed' 
                ? 'bg-vault-gold/20 text-vault-gold'
                : 'bg-white/10 text-white/50'
            }
          `}>
            {doc.is_locked ? 'Finalized' : doc.status || 'Draft'}
          </span>
        </div>
      </div>
      
      {/* Bottom accent line */}
      <div className={`
        absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-300
        ${isSelected 
          ? 'bg-gradient-to-r from-vault-gold/0 via-vault-gold to-vault-gold/0' 
          : 'bg-transparent'
        }
      `} />
    </motion.div>
  );
}

// Premium loading skeleton - responsive
function VaultSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Mobile skeleton */}
      <div className="lg:hidden p-4 space-y-4">
        <div className="h-14 bg-white/5 rounded-lg animate-pulse" />
        <div className="h-10 bg-white/5 rounded-lg animate-pulse" />
        <div className="h-10 bg-white/5 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 gap-4 mt-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-32 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
      
      {/* Desktop skeleton */}
      <div className="hidden lg:flex min-h-screen">
        <div className="w-72 border-r border-white/10 p-6 space-y-4">
          <div className="h-10 bg-white/5 rounded-lg animate-pulse" />
          <div className="h-12 bg-white/5 rounded-lg animate-pulse" />
          <div className="space-y-2 mt-6">
            {[1,2,3].map(i => (
              <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-8">
          <div className="h-8 w-64 bg-white/5 rounded-lg animate-pulse mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-48 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Portfolio selector dropdown - compact version for mobile
function PortfolioSelector({ portfolios, activePortfolio, onSelect, onCreateNew, compact = false }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-vault-gold/30 transition-all group ${compact ? 'p-2' : 'p-3 gap-3'}`}
      >
        <div className={`rounded-lg bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center shrink-0 ${compact ? 'w-8 h-8' : 'w-10 h-10'}`}>
          <FolderOpen className={`text-vault-gold ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} weight="duotone" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className={`text-white font-medium truncate ${compact ? 'text-sm' : ''}`}>
            {activePortfolio?.name || 'Select Portfolio'}
          </p>
          {!compact && (
            <p className="text-white/40 text-xs">
              {activePortfolio?.document_count || 0} documents
            </p>
          )}
        </div>
        <CaretDown className={`w-4 h-4 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} weight="bold" />
      </button>
      
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-[#0f1629] border border-white/10 rounded-lg shadow-2xl overflow-hidden z-50"
          >
            <div className="max-h-64 overflow-y-auto">
              {portfolios.map(portfolio => (
                <button
                  key={portfolio.portfolio_id}
                  onClick={() => { onSelect(portfolio); setOpen(false); }}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors ${
                    activePortfolio?.portfolio_id === portfolio.portfolio_id ? 'bg-vault-gold/10' : ''
                  }`}
                >
                  <Folder className="w-5 h-5 text-vault-gold/70" weight="duotone" />
                  <div className="flex-1 text-left">
                    <p className="text-white text-sm">{portfolio.name}</p>
                    <p className="text-white/40 text-xs">{portfolio.document_count || 0} docs</p>
                  </div>
                  {activePortfolio?.portfolio_id === portfolio.portfolio_id && (
                    <Check className="w-4 h-4 text-vault-gold" weight="bold" />
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-white/10 p-2">
              <button
                onClick={() => { onCreateNew(); setOpen(false); }}
                className="w-full flex items-center gap-2 p-2 text-vault-gold hover:bg-vault-gold/10 rounded-md transition-colors text-sm"
              >
                <Plus className="w-4 h-4" weight="bold" />
                Create New Portfolio
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Empty state component
function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-8 text-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-white/20" weight="duotone" />
      </div>
      <h3 className="text-xl font-heading text-white mb-2">{title}</h3>
      <p className="text-white/50 max-w-sm mb-6">{description}</p>
      {action}
    </motion.div>
  );
}

// ============================================================================
// MAIN VAULT COMPONENT
// ============================================================================
export default function VaultPage({ user, initialView }) {
  const navigate = useNavigate();
  
  // Core state
  const [vaultState, setVaultState] = useState(VAULT_STATES.LOADING);
  const [error, setError] = useState(null);
  
  // Data state
  const [portfolios, setPortfolios] = useState([]);
  const [activePortfolio, setActivePortfolio] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [trashedDocuments, setTrashedDocuments] = useState([]);
  const [pinnedDocs, setPinnedDocs] = useState([]);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showTrash, setShowTrash] = useState(initialView === 'trash');
  const [showNewPortfolio, setShowNewPortfolio] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // ============================================================================
  // DATA FETCHING - Clean, predictable flow
  // ============================================================================
  
  // Switch portfolio - single source of truth for portfolio changes
  const switchPortfolio = useCallback(async (portfolio, showToast = true) => {
    if (!portfolio) return;
    
    setVaultState(VAULT_STATES.LOADING);
    setActivePortfolio(portfolio);
    localStorage.setItem('activePortfolioId', portfolio.portfolio_id);
    
    try {
      // Fetch documents for this specific portfolio
      const [docsRes, trashRes, pinnedRes] = await Promise.all([
        axios.get(`${API}/documents?portfolio_id=${portfolio.portfolio_id}`),
        axios.get(`${API}/documents/trash`).catch(() => ({ data: [] })),
        axios.get(`${API}/documents/pinned/list`).catch(() => ({ data: [] }))
      ]);
      
      setDocuments(docsRes.data || []);
      setTrashedDocuments((trashRes.data || []).filter(d => d.portfolio_id === portfolio.portfolio_id));
      setPinnedDocs(pinnedRes.data || []);
      setShowTrash(false);
      setSelectedDocument(null);
      setVaultState(VAULT_STATES.READY);
      
      if (showToast) {
        toast.success(`Switched to ${portfolio.name}`);
      }
      
    } catch (err) {
      console.error('[Vault] Failed to load documents:', err);
      
      // Check if auth error - don't show error state
      if (err.response?.status === 401) {
        setVaultState(VAULT_STATES.NO_PORTFOLIOS);
        return;
      }
      
      setError('Failed to load documents');
      setVaultState(VAULT_STATES.ERROR);
    }
  }, []);

  // Initialize vault - fetch portfolios first
  useEffect(() => {
    const initializeVault = async () => {
      setVaultState(VAULT_STATES.LOADING);
      setError(null);
      
      try {
        // Step 1: Fetch portfolios
        const portfoliosRes = await axios.get(`${API}/portfolios`);
        const fetchedPortfolios = portfoliosRes.data || [];
        setPortfolios(fetchedPortfolios);
        
        if (fetchedPortfolios.length === 0) {
          setVaultState(VAULT_STATES.NO_PORTFOLIOS);
          return;
        }
        
        // Step 2: Restore or select active portfolio
        const savedPortfolioId = localStorage.getItem('activePortfolioId');
        let targetPortfolio = fetchedPortfolios.find(p => p.portfolio_id === savedPortfolioId);
        
        if (!targetPortfolio) {
          targetPortfolio = fetchedPortfolios[0]; // Default to first
        }
        
        // Step 3: Set active and load documents
        await switchPortfolio(targetPortfolio, false);
        
      } catch (err) {
        console.error('[Vault] Initialization error:', err);
        console.error('[Vault] Error details:', {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data
        });
        
        // Check if it's an auth error (401) - don't show error state, user needs to login
        if (err.response?.status === 401) {
          // User not authenticated - this is handled by the app's auth flow
          // Just set a neutral state
          setVaultState(VAULT_STATES.NO_PORTFOLIOS);
          return;
        }
        
        // Network error
        if (err.code === 'ERR_NETWORK' || !err.response) {
          setError('Network error. Please check your connection.');
        } else {
          setError('Failed to load vault. Please try again.');
        }
        setVaultState(VAULT_STATES.ERROR);
      }
    };
    
    initializeVault();
  }, [switchPortfolio]);
  
  // Refresh documents (after create/delete/etc)
  const refreshDocuments = useCallback(async () => {
    if (!activePortfolio) return;
    
    try {
      const docsRes = await axios.get(`${API}/documents?portfolio_id=${activePortfolio.portfolio_id}`);
      setDocuments(docsRes.data || []);
    } catch (err) {
      console.error('[Vault] Failed to refresh documents:', err);
    }
  }, [activePortfolio]);
  
  // ============================================================================
  // DOCUMENT ACTIONS
  // ============================================================================
  
  const togglePinDocument = async (docId) => {
    const isPinned = pinnedDocs.some(d => d.document_id === docId);
    try {
      if (isPinned) {
        await axios.post(`${API}/documents/${docId}/unpin`);
        setPinnedDocs(pinnedDocs.filter(d => d.document_id !== docId));
        toast.success('Document unpinned');
      } else {
        await axios.post(`${API}/documents/${docId}/pin`);
        const doc = documents.find(d => d.document_id === docId);
        if (doc) setPinnedDocs([doc, ...pinnedDocs]);
        toast.success('Document pinned');
      }
    } catch (error) {
      toast.error('Failed to update pin status');
    }
  };
  
  const trashDocument = async (docId) => {
    try {
      await axios.post(`${API}/documents/${docId}/trash`);
      const doc = documents.find(d => d.document_id === docId);
      setDocuments(documents.filter(d => d.document_id !== docId));
      if (doc) setTrashedDocuments([...trashedDocuments, { ...doc, deleted_at: new Date().toISOString() }]);
      setSelectedDocument(null);
      toast.success('Document moved to trash');
    } catch (error) {
      toast.error('Failed to trash document');
    }
  };
  
  const restoreDocument = async (docId) => {
    try {
      await axios.post(`${API}/documents/${docId}/restore`);
      const doc = trashedDocuments.find(d => d.document_id === docId);
      setTrashedDocuments(trashedDocuments.filter(d => d.document_id !== docId));
      if (doc) setDocuments([...documents, doc]);
      toast.success('Document restored');
    } catch (error) {
      toast.error('Failed to restore document');
    }
  };
  
  const permanentlyDelete = async (docId) => {
    try {
      await axios.delete(`${API}/documents/${docId}/permanent`);
      setTrashedDocuments(trashedDocuments.filter(d => d.document_id !== docId));
      toast.success('Document permanently deleted');
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };
  
  const exportDocument = async (doc) => {
    try {
      const response = await axios.get(`${API}/documents/${doc.document_id}/export/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${doc.title}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Document exported');
    } catch (error) {
      toast.error('Failed to export document');
    }
  };
  
  const createPortfolio = async () => {
    if (!newPortfolioName.trim()) return;
    try {
      const response = await axios.post(`${API}/portfolios`, {
        name: newPortfolioName,
        description: ''
      });
      const newPortfolio = response.data;
      setPortfolios([newPortfolio, ...portfolios]);
      setNewPortfolioName('');
      setShowNewPortfolio(false);
      await switchPortfolio(newPortfolio);
      toast.success('Portfolio created');
    } catch (error) {
      toast.error('Failed to create portfolio');
    }
  };
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const displayedDocuments = useMemo(() => {
    const baseDocs = showTrash ? trashedDocuments : documents;
    
    // Filter by search
    let filtered = baseDocs;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = baseDocs.filter(doc => 
        (doc.title || '').toLowerCase().includes(term)
      );
    }
    
    // Sort: pinned first, then by date
    return [...filtered].sort((a, b) => {
      const aPinned = pinnedDocs.some(d => d.document_id === a.document_id);
      const bPinned = pinnedDocs.some(d => d.document_id === b.document_id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return new Date(b.updated_at) - new Date(a.updated_at);
    });
  }, [documents, trashedDocuments, showTrash, searchTerm, pinnedDocs]);
  
  // Retry initialization
  const retryInitialization = useCallback(() => {
    setVaultState(VAULT_STATES.LOADING);
    setError(null);
    // Small delay to ensure state is reset
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }, []);
  
  // ============================================================================
  // RENDER STATES
  // ============================================================================
  
  // Loading state
  if (vaultState === VAULT_STATES.LOADING) {
    return <VaultSkeleton />;
  }
  
  // Error state
  if (vaultState === VAULT_STATES.ERROR) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <EmptyState
          icon={ShieldCheck}
          title="Unable to Access Vault"
          description={error || 'Please check your connection and try again.'}
          action={
            <div className="flex flex-col gap-3">
              <Button onClick={retryInitialization} className="btn-primary">
                Retry
              </Button>
              <Button onClick={() => window.location.href = '/'} variant="outline" className="text-white/60 border-white/20">
                Go Home
              </Button>
            </div>
          }
        />
      </div>
    );
  }
  
  // No portfolios state
  if (vaultState === VAULT_STATES.NO_PORTFOLIOS) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyState
          icon={Folder}
          title="Create Your First Portfolio"
          description="Portfolios organize your documents by trust, entity, or project. Create one to get started."
          action={
            <Button onClick={() => setShowNewPortfolio(true)} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" weight="bold" />
              Create Portfolio
            </Button>
          }
        />
        
        {/* New Portfolio Dialog */}
        <Dialog open={showNewPortfolio} onOpenChange={setShowNewPortfolio}>
          <DialogContent className="bg-[#0f1629] border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white font-heading text-xl">Create Portfolio</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Portfolio name"
                value={newPortfolioName}
                onChange={(e) => setNewPortfolioName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createPortfolio()}
                className="bg-white/5 border-white/10 focus:border-vault-gold text-white"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowNewPortfolio(false)} className="text-white/60">
                Cancel
              </Button>
              <Button onClick={createPortfolio} className="btn-primary">
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  
  // ============================================================================
  // MAIN VAULT UI
  // ============================================================================
  
  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>
      
      {/* ================================================================== */}
      {/* GLASSY SIDEBAR - Desktop only, mobile uses drawer */}
      {/* ================================================================== */}
      <GlassSidebar className={`
        fixed lg:relative inset-y-0 left-0 w-72 z-50
        transform transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 text-white/40 hover:text-white"
        >
          <X className="w-5 h-5" weight="bold" />
        </button>
        
        {/* Sidebar header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-vault-gold" weight="fill" />
            </div>
            <div>
              <h2 className="text-white font-heading text-lg">Vault</h2>
              <p className="text-white/40 text-xs">Secure Documents</p>
            </div>
          </div>
          
          {/* Portfolio selector */}
          <PortfolioSelector
            portfolios={portfolios}
            activePortfolio={activePortfolio}
            onSelect={switchPortfolio}
            onCreateNew={() => setShowNewPortfolio(true)}
          />
        </div>
        
        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-3">
          <nav className="space-y-1">
            <button
              onClick={() => { setShowTrash(false); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                !showTrash
                  ? 'bg-vault-gold/10 text-vault-gold border border-vault-gold/20' 
                  : 'text-white/60 hover:bg-white/5'
              }`}
            >
              <FileText className="w-4 h-4" weight="duotone" />
              <span className="text-sm font-medium">Documents</span>
              <span className="ml-auto text-xs opacity-60">{documents.length}</span>
            </button>
            
            <button
              onClick={() => { setShowTrash(true); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                showTrash
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                  : 'text-white/40 hover:bg-white/5'
              }`}
            >
              <Trash className="w-4 h-4" weight="duotone" />
              <span className="text-sm">Trash</span>
              {trashedDocuments.length > 0 && (
                <span className="ml-auto text-xs opacity-60">{trashedDocuments.length}</span>
              )}
            </button>
          </nav>
        </div>
        
        {/* New document button */}
        <div className="p-4 border-t border-white/10">
          <Button 
            onClick={() => navigate('/templates')}
            className="w-full btn-primary text-sm"
          >
            <Plus className="w-4 h-4 mr-2" weight="bold" />
            New Document
          </Button>
        </div>
      </GlassSidebar>
      
      {/* ================================================================== */}
      {/* MAIN CONTENT */}
      {/* ================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ============ MOBILE LAYOUT ============ */}
        <div className="lg:hidden flex flex-col h-full">
          {/* Mobile Header Bar */}
          <div className="bg-[#0a0f1a] border-b border-white/10">
            {/* Portfolio Row */}
            <div className="flex items-center gap-2 px-4 py-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg shrink-0"
              >
                <ShieldCheck className="w-5 h-5 text-vault-gold" weight="fill" />
              </button>
              
              <div className="flex-1 min-w-0">
                <PortfolioSelector
                  portfolios={portfolios}
                  activePortfolio={activePortfolio}
                  onSelect={switchPortfolio}
                  onCreateNew={() => setShowNewPortfolio(true)}
                  compact={true}
                />
              </div>
              
              <Button 
                onClick={() => navigate('/templates')}
                className="btn-primary h-10 w-10 p-0 shrink-0"
              >
                <Plus className="w-5 h-5" weight="bold" />
              </Button>
            </div>
            
            {/* Search Bar */}
            <div className="px-4 pb-3">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" weight="duotone" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 py-2.5 bg-white/5 border-white/10 focus:border-vault-gold text-white text-sm rounded-lg"
                />
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex">
              <button
                onClick={() => setShowTrash(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                  !showTrash 
                    ? 'text-vault-gold border-vault-gold bg-vault-gold/5' 
                    : 'text-white/40 border-transparent'
                }`}
              >
                <FileText className="w-4 h-4" weight="duotone" />
                <span>Documents</span>
                <span className="text-xs opacity-70">({documents.length})</span>
              </button>
              <button
                onClick={() => setShowTrash(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                  showTrash 
                    ? 'text-red-400 border-red-400 bg-red-500/5' 
                    : 'text-white/40 border-transparent'
                }`}
              >
                <Trash className="w-4 h-4" weight="duotone" />
                <span>Trash</span>
                {trashedDocuments.length > 0 && (
                  <span className="text-xs opacity-70">({trashedDocuments.length})</span>
                )}
              </button>
            </div>
          </div>
          
          {/* Mobile Document List */}
          <div className="flex-1 overflow-y-auto p-4">
            {displayedDocuments.length > 0 ? (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {displayedDocuments.map((doc) => (
                    showTrash ? (
                      <motion.div
                        key={doc.document_id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className="p-4 bg-white/5 border border-white/10 rounded-xl"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-red-400" weight="duotone" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-medium text-sm truncate">{doc.title}</h3>
                            <p className="text-white/40 text-xs mt-0.5">
                              Deleted {new Date(doc.deleted_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            onClick={() => restoreDocument(doc.document_id)}
                            variant="outline"
                            size="sm"
                            className="flex-1 text-green-400 border-green-500/30 hover:bg-green-500/10 text-xs"
                          >
                            <ArrowCounterClockwise className="w-3.5 h-3.5 mr-1" />
                            Restore
                          </Button>
                          <Button
                            onClick={() => permanentlyDelete(doc.document_id)}
                            variant="outline"
                            size="sm"
                            className="flex-1 text-red-400 border-red-500/30 hover:bg-red-500/10 text-xs"
                          >
                            <Trash className="w-3.5 h-3.5 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={doc.document_id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        onClick={() => navigate(`/vault/document/${doc.document_id}`)}
                        className="p-4 bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-xl active:scale-[0.98] transition-transform"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6 text-vault-gold" weight="duotone" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-white font-medium text-sm line-clamp-2 leading-snug">{doc.title}</h3>
                              <div className="flex items-center gap-1 shrink-0">
                                {pinnedDocs.some(d => d.document_id === doc.document_id) && (
                                  <Star className="w-4 h-4 text-vault-gold" weight="fill" />
                                )}
                                {doc.is_locked && (
                                  <Lock className="w-4 h-4 text-green-400" weight="fill" />
                                )}
                              </div>
                            </div>
                            <p className="text-vault-gold/60 text-xs font-medium uppercase tracking-wide mt-1">
                              {humanizeSlug(doc.document_type)}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-white/40 text-xs flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(doc.updated_at).toLocaleDateString()}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                                doc.is_locked ? 'bg-green-500/20 text-green-400' :
                                doc.status === 'completed' ? 'bg-vault-gold/20 text-vault-gold' :
                                'bg-white/10 text-white/50'
                              }`}>
                                {doc.is_locked ? 'Finalized' : doc.status || 'Draft'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <EmptyState
                icon={showTrash ? Trash : FileText}
                title={showTrash ? 'Trash is Empty' : searchTerm ? 'No Results' : 'No Documents Yet'}
                description={
                  showTrash 
                    ? 'Deleted documents will appear here'
                    : searchTerm 
                      ? 'Try adjusting your search'
                      : 'Create your first document'
                }
                action={!showTrash && !searchTerm && (
                  <Button onClick={() => navigate('/templates')} className="btn-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Document
                  </Button>
                )}
              />
            )}
          </div>
        </div>
        
        {/* ============ DESKTOP LAYOUT ============ */}
        <div className="hidden lg:flex lg:flex-col lg:flex-1">
          {/* Desktop Header */}
          <div className="p-6 border-b border-white/10 flex items-center gap-4">
            <div className="flex items-center gap-2 text-white/50 text-sm">
              <FolderOpen className="w-4 h-4 text-vault-gold" weight="duotone" />
              <span className="text-vault-gold font-medium">{activePortfolio?.name}</span>
              {showTrash && (
                <>
                  <CaretRight className="w-3 h-3" />
                  <span className="text-red-400">Trash</span>
                </>
              )}
            </div>
            
            <div className="relative flex-1 max-w-md ml-auto">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" weight="duotone" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 focus:border-vault-gold text-white"
              />
            </div>
          </div>
        
        {/* Desktop Document grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {showTrash && (
              <div className="flex items-center gap-2 text-red-400 text-sm mb-6 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <Trash className="w-4 h-4" weight="duotone" />
                <span>Trash — Documents will be permanently deleted after 30 days</span>
              </div>
            )}
            
            {displayedDocuments.length > 0 ? (
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
              >
                <AnimatePresence mode="popLayout">
                  {displayedDocuments.map((doc) => (
                    showTrash ? (
                      <motion.div
                        key={doc.document_id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative group p-5 bg-white/5 border border-white/10 rounded-lg"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-red-400" weight="duotone" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-medium truncate">{doc.title}</h3>
                            <p className="text-white/40 text-xs mt-1">
                              Deleted {new Date(doc.deleted_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            onClick={() => restoreDocument(doc.document_id)}
                            variant="outline"
                            size="sm"
                            className="flex-1 text-green-400 border-green-500/30 hover:bg-green-500/10"
                          >
                            <ArrowCounterClockwise className="w-4 h-4 mr-1" weight="duotone" />
                            Restore
                          </Button>
                          <Button
                            onClick={() => permanentlyDelete(doc.document_id)}
                            variant="outline"
                            size="sm"
                            className="flex-1 text-red-400 border-red-500/30 hover:bg-red-500/10"
                          >
                            <Trash className="w-4 h-4 mr-1" weight="duotone" />
                            Delete
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      <DocumentCard
                        key={doc.document_id}
                        doc={doc}
                        isPinned={pinnedDocs.some(d => d.document_id === doc.document_id)}
                        isSelected={selectedDocument?.document_id === doc.document_id}
                        onSelect={setSelectedDocument}
                        onPin={togglePinDocument}
                        onOpen={(d) => navigate(`/vault/document/${d.document_id}`)}
                        onTrash={trashDocument}
                        onExport={exportDocument}
                      />
                    )
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <EmptyState
                icon={showTrash ? Trash : FileText}
                title={showTrash ? 'Trash is Empty' : searchTerm ? 'No Results' : 'No Documents Yet'}
                description={
                  showTrash 
                    ? 'Deleted documents will appear here'
                    : searchTerm 
                      ? 'Try adjusting your search terms'
                      : 'Create your first document to get started'
                }
                action={!showTrash && !searchTerm && (
                  <Button onClick={() => navigate('/templates')} className="btn-primary">
                    <Plus className="w-4 h-4 mr-2" weight="bold" />
                    Create Document
                  </Button>
                )}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* ================================================================== */}
      {/* DOCUMENT PREVIEW PANEL - Desktop Only */}
      {/* ================================================================== */}
      <AnimatePresence>
        {selectedDocument && !showTrash && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="hidden xl:flex w-96 border-l border-white/10 flex-col bg-[#0a0f1a]/50"
          >
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-heading text-white">Preview</h3>
              <button 
                onClick={() => setSelectedDocument(null)}
                className="text-white/40 hover:text-white p-1"
              >
                <X className="w-4 h-4" weight="bold" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5">
              <div className="w-16 h-16 rounded-xl bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center mb-5">
                <FileText className="w-8 h-8 text-vault-gold" weight="duotone" />
              </div>
              
              <h2 className="text-xl font-heading text-white mb-2">{selectedDocument.title}</h2>
              <p className="text-vault-gold text-sm mb-6">{humanizeSlug(selectedDocument.document_type)}</p>
              
              <div className="space-y-4">
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Status</p>
                  <span className={`inline-block px-3 py-1 rounded text-sm ${
                    selectedDocument.is_locked ? 'bg-green-500/20 text-green-400' :
                    selectedDocument.status === 'completed' ? 'bg-vault-gold/20 text-vault-gold' :
                    'bg-white/10 text-white/50'
                  }`}>
                    {selectedDocument.is_locked ? 'Finalized' : selectedDocument.status || 'Draft'}
                  </span>
                </div>
                
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Last Updated</p>
                  <p className="text-white">{new Date(selectedDocument.updated_at).toLocaleString()}</p>
                </div>
                
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Created</p>
                  <p className="text-white">{new Date(selectedDocument.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t border-white/10 space-y-2">
              <Button 
                onClick={() => navigate(`/vault/document/${selectedDocument.document_id}`)}
                className="w-full btn-primary"
              >
                Open Document
              </Button>
              <Button 
                onClick={() => exportDocument(selectedDocument)}
                variant="outline"
                className="w-full btn-secondary"
              >
                <Download className="w-4 h-4 mr-2" weight="duotone" />
                Export as PDF
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* ================================================================== */}
      {/* DIALOGS */}
      {/* ================================================================== */}
      
      {/* New Portfolio Dialog */}
      <Dialog open={showNewPortfolio} onOpenChange={setShowNewPortfolio}>
        <DialogContent className="bg-[#0f1629] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-heading text-xl">Create Portfolio</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Portfolio name"
              value={newPortfolioName}
              onChange={(e) => setNewPortfolioName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createPortfolio()}
              className="bg-white/5 border-white/10 focus:border-vault-gold text-white"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewPortfolio(false)} className="text-white/60">
              Cancel
            </Button>
            <Button onClick={createPortfolio} className="btn-primary">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
