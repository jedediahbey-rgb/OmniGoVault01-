import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  ArrowCounterClockwise,
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
  Trash,
  X,
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

// Vault states
const VAULT_STATES = {
  LOADING: 'loading',
  SWITCHING: 'switching', // New state for portfolio switch
  NO_PORTFOLIOS: 'no_portfolios',
  READY: 'ready',
  ERROR: 'error'
};

// Portfolio Selector Component
function PortfolioSelector({ portfolios, activePortfolio, onSelect, onCreateNew }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-vault-gold/30 transition-all"
      >
        <div className="w-8 h-8 rounded-lg bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center shrink-0">
          <FolderOpen className="w-4 h-4 text-vault-gold" weight="duotone" />
        </div>
        <span className="flex-1 text-left text-white font-medium text-sm truncate">
          {activePortfolio?.name || 'Select Portfolio'}
        </span>
        <CaretDown className={`w-4 h-4 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} weight="bold" />
      </button>
      
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
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
                    <span className="flex-1 text-left text-white text-sm">{portfolio.name}</span>
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
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Document Card Component
function DocumentCard({ doc, isPinned, onNavigate }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      onClick={onNavigate}
      className="p-4 bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-xl active:scale-[0.98] transition-transform cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center shrink-0">
          <FileText className="w-6 h-6 text-vault-gold" weight="duotone" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-white font-medium text-sm line-clamp-2 leading-snug">{doc.title}</h3>
            <div className="flex items-center gap-1 shrink-0">
              {isPinned && <Star className="w-4 h-4 text-vault-gold" weight="fill" />}
              {doc.is_locked && <Lock className="w-4 h-4 text-green-400" weight="fill" />}
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
  );
}

// Main Vault Component
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
  const [showTrash, setShowTrash] = useState(initialView === 'trash');
  const [showNewPortfolio, setShowNewPortfolio] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');

  // Switch portfolio - use SWITCHING state to avoid skeleton flash
  const switchPortfolio = useCallback(async (portfolio, showToast = true) => {
    if (!portfolio) return;
    
    // Use SWITCHING state instead of LOADING to keep current content visible
    setVaultState(prev => prev === VAULT_STATES.LOADING ? VAULT_STATES.LOADING : VAULT_STATES.SWITCHING);
    setActivePortfolio(portfolio);
    localStorage.setItem('activePortfolioId', portfolio.portfolio_id);
    
    try {
      const [docsRes, trashRes, pinnedRes] = await Promise.all([
        axios.get(`${API}/documents?portfolio_id=${portfolio.portfolio_id}`),
        axios.get(`${API}/documents/trash`).catch(() => ({ data: [] })),
        axios.get(`${API}/documents/pinned/list`).catch(() => ({ data: [] }))
      ]);
      
      setDocuments(docsRes.data || []);
      setTrashedDocuments((trashRes.data || []).filter(d => d.portfolio_id === portfolio.portfolio_id));
      setPinnedDocs(pinnedRes.data || []);
      setShowTrash(false);
      setVaultState(VAULT_STATES.READY);
      
      if (showToast) toast.success(`Switched to ${portfolio.name}`);
    } catch (err) {
      console.error('[Vault] Failed to load documents:', err);
      if (err.response?.status === 401) {
        setVaultState(VAULT_STATES.NO_PORTFOLIOS);
      } else {
        setError('Failed to load documents');
        setVaultState(VAULT_STATES.ERROR);
      }
    }
  }, []);

  // Initialize vault
  useEffect(() => {
    const init = async () => {
      setVaultState(VAULT_STATES.LOADING);
      try {
        const res = await axios.get(`${API}/portfolios`);
        const fetchedPortfolios = res.data || [];
        setPortfolios(fetchedPortfolios);
        
        if (fetchedPortfolios.length === 0) {
          setVaultState(VAULT_STATES.NO_PORTFOLIOS);
          return;
        }
        
        const savedId = localStorage.getItem('activePortfolioId');
        const target = fetchedPortfolios.find(p => p.portfolio_id === savedId) || fetchedPortfolios[0];
        await switchPortfolio(target, false);
      } catch (err) {
        console.error('[Vault] Init error:', err);
        if (err.response?.status === 401) {
          setVaultState(VAULT_STATES.NO_PORTFOLIOS);
        } else {
          setError('Failed to load vault');
          setVaultState(VAULT_STATES.ERROR);
        }
      }
    };
    init();
  }, [switchPortfolio]);

  // Document actions
  const restoreDocument = async (docId) => {
    try {
      await axios.post(`${API}/documents/${docId}/restore`);
      const doc = trashedDocuments.find(d => d.document_id === docId);
      setTrashedDocuments(trashedDocuments.filter(d => d.document_id !== docId));
      if (doc) setDocuments([...documents, doc]);
      toast.success('Document restored');
    } catch { toast.error('Failed to restore'); }
  };

  const permanentlyDelete = async (docId) => {
    try {
      await axios.delete(`${API}/documents/${docId}/permanent`);
      setTrashedDocuments(trashedDocuments.filter(d => d.document_id !== docId));
      toast.success('Document deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const createPortfolio = async () => {
    if (!newPortfolioName.trim()) return;
    try {
      const res = await axios.post(`${API}/portfolios`, { name: newPortfolioName, description: '' });
      setPortfolios([res.data, ...portfolios]);
      setNewPortfolioName('');
      setShowNewPortfolio(false);
      await switchPortfolio(res.data);
      toast.success('Portfolio created');
    } catch { toast.error('Failed to create portfolio'); }
  };

  // Filter documents
  const displayedDocuments = useMemo(() => {
    const base = showTrash ? trashedDocuments : documents;
    let filtered = base;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = base.filter(d => (d.title || '').toLowerCase().includes(term));
    }
    return [...filtered].sort((a, b) => {
      const aPin = pinnedDocs.some(d => d.document_id === a.document_id);
      const bPin = pinnedDocs.some(d => d.document_id === b.document_id);
      if (aPin && !bPin) return -1;
      if (!aPin && bPin) return 1;
      return new Date(b.updated_at) - new Date(a.updated_at);
    });
  }, [documents, trashedDocuments, showTrash, searchTerm, pinnedDocs]);

  // Loading state - only show skeleton on initial load, not when switching portfolios
  if (vaultState === VAULT_STATES.LOADING) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-14 bg-white/5 rounded-lg animate-pulse" />
        <div className="h-10 bg-white/5 rounded-lg animate-pulse" />
        <div className="h-12 bg-white/5 rounded-lg animate-pulse" />
        {[1,2,3].map(i => <div key={i} className="h-24 bg-white/5 rounded-lg animate-pulse" />)}
      </div>
    );
  }

  // Switching portfolios - keep current content visible with subtle overlay
  const isSwitching = vaultState === VAULT_STATES.SWITCHING;

  // Error state
  if (vaultState === VAULT_STATES.ERROR) {
    return (
      <div className="p-8 text-center">
        <ShieldCheck className="w-16 h-16 text-white/20 mx-auto mb-4" weight="duotone" />
        <h3 className="text-xl text-white mb-2">Unable to Access Vault</h3>
        <p className="text-white/50 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} className="btn-primary">Retry</Button>
      </div>
    );
  }

  // No portfolios state
  if (vaultState === VAULT_STATES.NO_PORTFOLIOS) {
    return (
      <div className="p-8 text-center">
        <Folder className="w-16 h-16 text-white/20 mx-auto mb-4" weight="duotone" />
        <h3 className="text-xl text-white mb-2">Create Your First Portfolio</h3>
        <p className="text-white/50 mb-4">Organize your documents by trust, entity, or project.</p>
        <Button onClick={() => setShowNewPortfolio(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" /> Create Portfolio
        </Button>
        
        <Dialog open={showNewPortfolio} onOpenChange={setShowNewPortfolio}>
          <DialogContent className="bg-[#0f1629] border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Create Portfolio</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Portfolio name"
              value={newPortfolioName}
              onChange={(e) => setNewPortfolioName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createPortfolio()}
              className="bg-white/5 border-white/10 text-white mt-4"
              autoFocus
            />
            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={() => setShowNewPortfolio(false)} className="text-white/60">Cancel</Button>
              <Button onClick={createPortfolio} className="btn-primary">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Main Vault UI
  return (
    <div className="relative">
      {/* Switching Overlay - subtle fade instead of skeleton flash */}
      <AnimatePresence>
        {isSwitching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-[#0a0f1a]/60 z-20 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex items-center gap-2 bg-vault-dark/90 px-4 py-2 rounded-full border border-vault-gold/20"
            >
              <div className="w-4 h-4 border-2 border-vault-gold/30 border-t-vault-gold rounded-full animate-spin" />
              <span className="text-vault-gold/80 text-sm">Switching...</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-[#0a0f1a] sticky top-0 z-10">
        {/* Portfolio Row */}
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="w-10 h-10 rounded-lg bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-vault-gold" weight="fill" />
          </div>
          
          <div className="flex-1 min-w-0">
            <PortfolioSelector
              portfolios={portfolios}
              activePortfolio={activePortfolio}
              onSelect={switchPortfolio}
              onCreateNew={() => setShowNewPortfolio(true)}
            />
          </div>
          
          <Button onClick={() => navigate('/templates')} className="btn-primary h-10 w-10 p-0 shrink-0">
            <Plus className="w-5 h-5" weight="bold" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 py-2.5 bg-white/5 border-white/10 focus:border-vault-gold text-white text-sm"
            />
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setShowTrash(false)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
              !showTrash ? 'text-vault-gold border-vault-gold bg-vault-gold/5' : 'text-white/40 border-transparent'
            }`}
          >
            <FileText className="w-4 h-4" weight="duotone" />
            Documents ({documents.length})
          </button>
          <button
            onClick={() => setShowTrash(true)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
              showTrash ? 'text-red-400 border-red-400 bg-red-500/5' : 'text-white/40 border-transparent'
            }`}
          >
            <Trash className="w-4 h-4" weight="duotone" />
            Trash ({trashedDocuments.length})
          </button>
        </div>
      </div>
      
      {/* Document List */}
      <div className="p-4">
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
                  <DocumentCard
                    key={doc.document_id}
                    doc={doc}
                    isPinned={pinnedDocs.some(d => d.document_id === doc.document_id)}
                    onNavigate={() => navigate(`/vault/document/${doc.document_id}`)}
                  />
                )
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              {showTrash ? <Trash className="w-8 h-8 text-white/20" /> : <FileText className="w-8 h-8 text-white/20" />}
            </div>
            <h3 className="text-lg text-white mb-2">
              {showTrash ? 'Trash is Empty' : searchTerm ? 'No Results' : 'No Documents Yet'}
            </h3>
            <p className="text-white/50 text-sm mb-4">
              {showTrash ? 'Deleted documents appear here' : searchTerm ? 'Try a different search' : 'Create your first document'}
            </p>
            {!showTrash && !searchTerm && (
              <Button onClick={() => navigate('/templates')} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> Create Document
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* New Portfolio Dialog */}
      <Dialog open={showNewPortfolio} onOpenChange={setShowNewPortfolio}>
        <DialogContent className="bg-[#0f1629] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Create Portfolio</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Portfolio name"
            value={newPortfolioName}
            onChange={(e) => setNewPortfolioName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createPortfolio()}
            className="bg-white/5 border-white/10 text-white mt-4"
            autoFocus
          />
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setShowNewPortfolio(false)} className="text-white/60">Cancel</Button>
            <Button onClick={createPortfolio} className="btn-primary">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
