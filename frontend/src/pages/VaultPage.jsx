import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import axios from 'axios';
import {
  ArrowCounterClockwise,
  CaretDown,
  Check,
  CheckSquare,
  Clock,
  DotsThreeVertical,
  Download,
  FileText,
  Folder,
  FolderOpen,
  MagnifyingGlass,
  Plus,
  ShieldCheck,
  Square,
  Star,
  Trash,
  X,
  Lock,
  Eye
} from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import BulkActionBar from '../components/shared/BulkActionBar';
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
  DialogDescription,
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

// Document Card Component - With selection checkbox and swipe to delete
function DocumentCard({ doc, isPinned, onNavigate, onDelete, isSelected, onToggleSelect, selectionMode }) {
  const x = useMotionValue(0);
  const background = useTransform(x, [-100, 0], ['rgba(239, 68, 68, 0.3)', 'rgba(0, 0, 0, 0)']);
  const deleteOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  const controls = useAnimation();

  const handleDragEnd = async (event, info) => {
    if (info.offset.x < -80 && onDelete && !doc.is_locked) {
      // Confirm delete
      if (window.confirm(`Delete "${doc.title}"?`)) {
        onDelete(doc);
      } else {
        // Reset position if canceled
        await controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } });
      }
    } else {
      // Reset position if not swiped far enough
      await controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } });
    }
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onToggleSelect?.(doc.document_id);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Delete background */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-end pr-4 rounded-xl"
        style={{ background }}
      >
        <motion.div style={{ opacity: deleteOpacity }} className="flex items-center gap-2 text-red-400">
          <Trash className="w-5 h-5" />
          <span className="text-sm font-medium">Delete</span>
        </motion.div>
      </motion.div>
      
      {/* Card content */}
      <motion.div
        drag={doc.is_locked || selectionMode ? false : "x"}
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className={`p-4 bg-gradient-to-br from-white/[0.08] to-white/[0.02] border rounded-xl relative transition-colors ${
          isSelected 
            ? 'border-vault-gold/50 bg-vault-gold/5' 
            : 'border-white/10'
        } ${selectionMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
        onClick={selectionMode ? handleCheckboxClick : undefined}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox - always visible but more prominent in selection mode */}
          <button
            onClick={handleCheckboxClick}
            className={`w-6 h-6 rounded flex items-center justify-center shrink-0 transition-all ${
              isSelected 
                ? 'bg-vault-gold text-vault-dark' 
                : 'bg-white/5 border border-white/20 hover:border-vault-gold/50'
            } ${selectionMode ? '' : 'opacity-60 hover:opacity-100'}`}
          >
            {isSelected && <Check className="w-4 h-4" weight="bold" />}
          </button>
          
          <div 
            className="w-10 h-10 rounded-xl bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center shrink-0"
            onClick={(e) => { if (!selectionMode) { e.stopPropagation(); onNavigate(); } }}
          >
            <FileText className="w-5 h-5 text-vault-gold" weight="duotone" />
          </div>
          <div className="flex-1 min-w-0" onClick={(e) => { if (!selectionMode) { e.stopPropagation(); onNavigate(); } }}>
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
        {!doc.is_locked && !selectionMode && (
          <p className="text-white/20 text-[10px] text-center mt-2">← Swipe to delete</p>
        )}
      </motion.div>
    </div>
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
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState(null); // Document pending delete confirmation
  
  // Bulk selection state
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  // Selection handlers
  const toggleDocSelection = useCallback((docId) => {
    setSelectedDocIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  }, []);
  
  const selectAllDocs = useCallback(() => {
    const displayedDocs = showTrash ? trashedDocuments : documents;
    setSelectedDocIds(new Set(displayedDocs.map(d => d.document_id)));
  }, [documents, trashedDocuments, showTrash]);
  
  const deselectAllDocs = useCallback(() => {
    setSelectedDocIds(new Set());
  }, []);
  
  // Bulk delete handler
  const handleBulkDelete = useCallback(async () => {
    if (selectedDocIds.size === 0) return;
    
    const idsToDelete = Array.from(selectedDocIds);
    let successCount = 0;
    let failCount = 0;
    
    for (const docId of idsToDelete) {
      try {
        if (showTrash) {
          // Permanently delete
          await axios.delete(`${API}/documents/${docId}/permanent`);
        } else {
          // Move to trash
          await axios.delete(`${API}/documents/${docId}`);
        }
        successCount++;
      } catch (err) {
        console.error(`Failed to delete document ${docId}:`, err);
        failCount++;
      }
    }
    
    // Refresh documents
    if (activePortfolio) {
      try {
        const [docsRes, trashRes] = await Promise.all([
          axios.get(`${API}/documents?portfolio_id=${activePortfolio.portfolio_id}`),
          axios.get(`${API}/documents/trash`).catch(() => ({ data: [] }))
        ]);
        setDocuments(docsRes.data || []);
        setTrashedDocuments((trashRes.data || []).filter(d => d.portfolio_id === activePortfolio.portfolio_id));
      } catch (err) {
        console.error('Failed to refresh documents:', err);
      }
    }
    
    setSelectedDocIds(new Set());
    setShowBulkDeleteConfirm(false);
    
    if (failCount > 0) {
      toast.warning(`Deleted ${successCount} documents, ${failCount} failed`);
    } else {
      toast.success(`Deleted ${successCount} document${successCount !== 1 ? 's' : ''}`);
    }
  }, [selectedDocIds, showTrash, activePortfolio]);
  
  // Clear selection when switching tabs
  useEffect(() => {
    setSelectedDocIds(new Set());
  }, [showTrash]);
  
  // Switch portfolio - use SWITCHING state to avoid skeleton flash
  const switchPortfolio = useCallback(async (portfolio, showToast = true) => {
    if (!portfolio) return;
    
    // Use SWITCHING state instead of LOADING to keep current content visible
    setVaultState(prev => prev === VAULT_STATES.LOADING ? VAULT_STATES.LOADING : VAULT_STATES.SWITCHING);
    setActivePortfolio(portfolio);
    localStorage.setItem('activePortfolioId', portfolio.portfolio_id);
    
    // DEBUG: Verify localStorage is being set correctly
    console.log('=== VaultPage Portfolio Switch ===');
    console.log('VaultPage set activePortfolioId:', portfolio.portfolio_id);
    console.log('VaultPage read-back activePortfolioId:', localStorage.getItem('activePortfolioId'));
    console.log('VaultPage origin:', window.location.origin);
    
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
        const savedPortfolio = fetchedPortfolios.find(p => p.portfolio_id === savedId);
        
        // Only switch portfolio if we don't have a valid saved one
        // This prevents overwriting the user's selection when navigating back to this page
        if (savedPortfolio) {
          // Just set the state without calling switchPortfolio to avoid overwriting localStorage
          setActivePortfolio(savedPortfolio);
          // Load documents for the saved portfolio
          try {
            const [docsRes, trashRes, pinnedRes] = await Promise.all([
              axios.get(`${API}/documents?portfolio_id=${savedPortfolio.portfolio_id}`),
              axios.get(`${API}/documents/trash`).catch(() => ({ data: [] })),
              axios.get(`${API}/documents/pinned/list`).catch(() => ({ data: [] }))
            ]);
            setDocuments(docsRes.data || []);
            setTrashedDocuments((trashRes.data || []).filter(d => d.portfolio_id === savedPortfolio.portfolio_id));
            setPinnedDocs(pinnedRes.data || []);
            setVaultState(VAULT_STATES.READY);
          } catch (err) {
            console.error('[Vault] Error loading docs for saved portfolio:', err);
            // Fall back to switchPortfolio
            await switchPortfolio(savedPortfolio, false);
          }
        } else {
          // No saved portfolio, use first one
          await switchPortfolio(fetchedPortfolios[0], false);
        }
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
      toast.success('Document permanently deleted');
    } catch { toast.error('Failed to delete'); }
  };

  // Soft delete - move document to trash (called after confirmation)
  const confirmDeleteDocument = async () => {
    if (!deleteConfirmDoc) return;
    try {
      await axios.delete(`${API}/documents/${deleteConfirmDoc.document_id}`);
      setDocuments(documents.filter(d => d.document_id !== deleteConfirmDoc.document_id));
      setTrashedDocuments([{ ...deleteConfirmDoc, deleted_at: new Date().toISOString() }, ...trashedDocuments]);
      toast.success('Document moved to trash');
    } catch { 
      toast.error('Failed to delete document'); 
    } finally {
      setDeleteConfirmDoc(null);
    }
  };

  // Show delete confirmation dialog
  const handleDeleteRequest = (doc) => {
    setDeleteConfirmDoc(doc);
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

  // Loading state - show a simple centered spinner instead of skeleton flash
  if (vaultState === VAULT_STATES.LOADING) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-vault-gold/30 border-t-vault-gold rounded-full animate-spin" />
          <span className="text-vault-muted text-sm">Loading vault...</span>
        </div>
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
      <div className="p-4 pb-24">
        {displayedDocuments.length > 0 ? (
          <div className="space-y-3">
            {displayedDocuments.map((doc) => (
              showTrash ? (
                <div
                  key={doc.document_id}
                  className={`p-4 bg-white/5 border rounded-xl transition-colors ${
                    selectedDocIds.has(doc.document_id) 
                      ? 'border-vault-gold/50 bg-vault-gold/5' 
                      : 'border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleDocSelection(doc.document_id)}
                      className={`w-6 h-6 rounded flex items-center justify-center shrink-0 transition-all ${
                        selectedDocIds.has(doc.document_id) 
                          ? 'bg-vault-gold text-vault-dark' 
                          : 'bg-white/5 border border-white/20 hover:border-vault-gold/50'
                      }`}
                    >
                      {selectedDocIds.has(doc.document_id) && <Check className="w-4 h-4" weight="bold" />}
                    </button>
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
                  <div className="flex gap-2 mt-3 ml-9">
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
                </div>
              ) : (
                <DocumentCard
                  key={doc.document_id}
                  doc={doc}
                  isPinned={pinnedDocs.some(d => d.document_id === doc.document_id)}
                  onNavigate={() => navigate(`/vault/document/${doc.document_id}`)}
                  onDelete={handleDeleteRequest}
                  isSelected={selectedDocIds.has(doc.document_id)}
                  onToggleSelect={toggleDocSelection}
                  selectionMode={selectedDocIds.size > 0}
                />
              )
            ))}
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
      
      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedDocIds.size}
        totalCount={displayedDocuments.length}
        onSelectAll={selectAllDocs}
        onDeselectAll={deselectAllDocs}
        onDelete={() => setShowBulkDeleteConfirm(true)}
        isAllSelected={selectedDocIds.size === displayedDocuments.length && displayedDocuments.length > 0}
        actions={['delete']}
      />
      
      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading text-red-400 flex items-center gap-2">
              <Trash className="w-5 h-5" />
              Delete {selectedDocIds.size} Document{selectedDocIds.size !== 1 ? 's' : ''}?
            </DialogTitle>
            <DialogDescription className="text-vault-muted text-sm">
              {showTrash 
                ? 'These documents will be permanently deleted. This action cannot be undone.'
                : 'These documents will be moved to trash and can be restored later.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)} className="border-vault-gold/30 text-white flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleBulkDelete} 
              className="bg-red-500 hover:bg-red-600 text-white flex-1"
            >
              <Trash className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmDoc} onOpenChange={(open) => !open && setDeleteConfirmDoc(null)}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading text-red-400 flex items-center gap-2">
              <Trash className="w-5 h-5" />
              Delete Document?
            </DialogTitle>
            <DialogDescription className="text-vault-muted text-sm">
              Are you sure you want to delete &ldquo;{deleteConfirmDoc?.title}&rdquo;? It will be moved to trash and can be restored later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmDoc(null)} className="border-vault-gold/30 text-white flex-1">
              Cancel
            </Button>
            <Button 
              onClick={confirmDeleteDocument} 
              className="bg-red-500 hover:bg-red-600 text-white flex-1"
            >
              <Trash className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
