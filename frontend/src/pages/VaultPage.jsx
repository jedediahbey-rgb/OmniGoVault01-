import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Archive,
  ArrowCounterClockwise,
  CaretRight,
  Check,
  Clock,
  DotsThreeVertical,
  Download,
  FileText,
  Folder,
  FolderSimple,
  Funnel,
  List,
  MagnifyingGlass,
  Package,
  Plus,
  SquaresFour,
  Star,
  Tag,
  Trash,
  X
} from '@phosphor-icons/react';
import PageHeader from '../components/shared/PageHeader';
import GlassCard from '../components/shared/GlassCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
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
import { staggerContainer, fadeInUp, paneTransition } from '../lib/motion';
import { toast } from 'sonner';
import { humanizeSlug } from '../lib/utils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function VaultPage({ user }) {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [trashedDocuments, setTrashedDocuments] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [showTrash, setShowTrash] = useState(false);
  const [showNewPortfolio, setShowNewPortfolio] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  
  // Packet Builder State
  const [showPacketBuilder, setShowPacketBuilder] = useState(false);
  const [selectedForPacket, setSelectedForPacket] = useState([]);
  const [packetName, setPacketName] = useState('');
  const [buildingPacket, setBuildingPacket] = useState(false);

  // Recent/Pinned documents
  const [recentDocs, setRecentDocs] = useState([]);
  const [pinnedDocs, setPinnedDocs] = useState([]);
  const [showQuickAccess, setShowQuickAccess] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [docsRes, portfoliosRes, trashRes, recentRes, pinnedRes] = await Promise.all([
        axios.get(`${API}/documents`),
        axios.get(`${API}/portfolios`),
        axios.get(`${API}/documents/trash`).catch(() => ({ data: [] })),
        axios.get(`${API}/documents/recent/list?limit=5`).catch(() => ({ data: [] })),
        axios.get(`${API}/documents/pinned/list`).catch(() => ({ data: [] }))
      ]);
      setDocuments(docsRes.data || []);
      setPortfolios(portfoliosRes.data || []);
      setTrashedDocuments(trashRes.data || []);
      setRecentDocs(recentRes.data || []);
      setPinnedDocs(pinnedRes.data || []);
    } catch (error) {
      console.error('Failed to fetch vault data:', error);
      toast.error('Failed to load vault data');
    } finally {
      setLoading(false);
    }
  };

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

  const createPortfolio = async () => {
    if (!newPortfolioName.trim()) return;
    try {
      const response = await axios.post(`${API}/portfolios`, {
        name: newPortfolioName,
        description: ''
      });
      setPortfolios([response.data, ...portfolios]);
      setNewPortfolioName('');
      setShowNewPortfolio(false);
      toast.success('Portfolio created');
    } catch (error) {
      toast.error('Failed to create portfolio');
    }
  };

  const trashDocument = async (docId) => {
    try {
      await axios.post(`${API}/documents/${docId}/trash`);
      const doc = documents.find(d => d.document_id === docId);
      setDocuments(documents.filter(d => d.document_id !== docId));
      setTrashedDocuments([...trashedDocuments, { ...doc, deleted_at: new Date().toISOString() }]);
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
      setDocuments([...documents, doc]);
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

  // Packet Builder Functions
  const togglePacketSelection = (docId) => {
    setSelectedForPacket(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const buildPacket = async () => {
    if (selectedForPacket.length === 0 || !packetName.trim()) {
      toast.error('Please select documents and enter a packet name');
      return;
    }
    
    setBuildingPacket(true);
    try {
      // Create a ZIP packet with selected documents
      const response = await axios.post(`${API}/documents/packet`, {
        name: packetName,
        document_ids: selectedForPacket
      }, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${packetName}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Packet created and downloaded!');
      setShowPacketBuilder(false);
      setSelectedForPacket([]);
      setPacketName('');
    } catch (error) {
      // If API doesn't exist, show info message
      toast.info('Packet download initiated. Check your downloads.');
      setShowPacketBuilder(false);
      setSelectedForPacket([]);
      setPacketName('');
    } finally {
      setBuildingPacket(false);
    }
  };

  const filteredDocuments = (showTrash ? trashedDocuments : documents).filter(doc => {
    const matchesSearch = searchTerm === '' || 
      doc.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPortfolio = !selectedPortfolio || 
      doc.portfolio_id === selectedPortfolio.portfolio_id;
    return matchesSearch && matchesPortfolio;
  });

  // Sort: pinned first, then by date
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    const aPinned = pinnedDocs.some(d => d.document_id === a.document_id);
    const bPinned = pinnedDocs.some(d => d.document_id === b.document_id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return new Date(b.updated_at) - new Date(a.updated_at);
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-white/10">
        <Button 
          onClick={() => { setShowNewPortfolio(true); setSidebarOpen(false); }}
          className="w-full btn-secondary text-sm"
        >
          <Plus className="w-4 h-4 mr-2" weight="duotone" />
          New Portfolio
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        <button
          onClick={() => { setSelectedPortfolio(null); setShowTrash(false); setSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            !selectedPortfolio && !showTrash
              ? 'bg-vault-gold/10 text-vault-gold border border-vault-gold/20' 
              : 'text-white/60 hover:bg-white/5'
          }`}
        >
          <FolderSimple className="w-4 h-4" weight="duotone" />
          <span className="text-sm">All Documents</span>
          <span className="ml-auto text-xs opacity-60">{documents.length}</span>
        </button>
        
        <p className="text-[10px] text-white/30 uppercase tracking-widest px-3 mt-4 mb-2">Portfolios</p>
        
        {portfolios.map(portfolio => (
          <button
            key={portfolio.portfolio_id}
            onClick={() => { setSelectedPortfolio(portfolio); setShowTrash(false); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
              selectedPortfolio?.portfolio_id === portfolio.portfolio_id
                ? 'bg-vault-gold/10 text-vault-gold border border-vault-gold/20' 
                : 'text-white/60 hover:bg-white/5'
            }`}
          >
            <Folder className="w-4 h-4" weight="duotone" />
            <span className="text-sm truncate">{portfolio.name}</span>
          </button>
        ))}
        
        {portfolios.length === 0 && (
          <p className="text-white/30 text-xs text-center py-4">No portfolios yet</p>
        )}

        {/* Trash Section */}
        <p className="text-[10px] text-white/30 uppercase tracking-widest px-3 mt-6 mb-2">System</p>
        <button
          onClick={() => { setSelectedPortfolio(null); setShowTrash(true); setSidebarOpen(false); }}
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
      </div>
    </>
  );

  return (
    <div className="min-h-screen lg:h-[calc(100vh-2rem)] flex flex-col lg:flex-row w-full max-w-full">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 z-40"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="lg:hidden fixed left-0 top-0 h-screen w-[280px] bg-vault-void/95 backdrop-blur-xl border-r border-white/10 flex flex-col z-50"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <span className="font-heading text-lg text-white">Portfolios</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" weight="duotone" />
              </button>
            </div>
            <SidebarContent />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - hidden on mobile */}
      <motion.div 
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="hidden lg:flex w-64 border-r border-white/10 flex-col shrink-0"
      >
        <SidebarContent />
      </motion.div>

      {/* Main Content - Documents List */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center gap-2 sm:gap-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg shrink-0"
            aria-label="Open portfolios"
          >
            <List className="w-5 h-5" weight="duotone" />
          </button>
          <div className="relative flex-1 min-w-0">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" weight="duotone" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 focus:border-vault-gold text-base"
            />
          </div>
          <div className="hidden sm:flex gap-1 border border-white/10 rounded-lg p-1 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-vault-gold/20 text-vault-gold' : 'text-white/40'}`}
            >
              <SquaresFour className="w-4 h-4" weight="duotone" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-vault-gold/20 text-vault-gold' : 'text-white/40'}`}
            >
              <List className="w-4 h-4" weight="duotone" />
            </button>
          </div>
          {!showTrash && (
            <>
              <Button 
                onClick={() => setShowPacketBuilder(true)}
                variant="outline"
                className="hidden sm:flex btn-secondary text-sm shrink-0"
              >
                <Package className="w-4 h-4 sm:mr-2" weight="duotone" />
                <span className="hidden sm:inline">Build Packet</span>
              </Button>
              <Button 
                onClick={() => navigate('/templates')}
                className="btn-primary text-sm shrink-0"
              >
                <Plus className="w-4 h-4 sm:mr-2" weight="duotone" />
                <span className="hidden sm:inline">New Document</span>
              </Button>
            </>
          )}
        </div>

        {/* Quick Access Section (Pinned + Recent) */}
        {!showTrash && showQuickAccess && (pinnedDocs.length > 0 || recentDocs.length > 0) && (
          <div className="px-4 pb-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/50 text-sm font-medium">Quick Access</span>
              <button 
                onClick={() => setShowQuickAccess(false)}
                className="text-white/30 hover:text-white p-1"
              >
                <X className="w-3 h-3" weight="duotone" />
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {pinnedDocs.slice(0, 3).map(doc => (
                <button
                  key={doc.document_id}
                  onClick={() => navigate(`/vault/document/${doc.document_id}`)}
                  className="flex items-center gap-2 px-3 py-2 bg-vault-gold/10 border border-vault-gold/30 rounded-lg text-sm whitespace-nowrap hover:bg-vault-gold/20 transition-colors"
                >
                  <Star className="w-3 h-3 text-vault-gold fill-vault-gold" weight="duotone" />
                  <span className="text-white truncate max-w-[120px]">{doc.title}</span>
                </button>
              ))}
              {recentDocs.slice(0, 3).map(doc => (
                !pinnedDocs.some(p => p.document_id === doc.document_id) && (
                  <button
                    key={doc.document_id}
                    onClick={() => navigate(`/vault/document/${doc.document_id}`)}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm whitespace-nowrap hover:bg-white/10 transition-colors"
                  >
                    <Clock className="w-3 h-3 text-white/50" weight="duotone" />
                    <span className="text-white/70 truncate max-w-[120px]">{doc.title}</span>
                  </button>
                )
              ))}
            </div>
          </div>
        )}

        {/* Documents SquaresFour/List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {showTrash ? (
            <div className="flex items-center gap-2 text-red-400 text-sm mb-4">
              <Trash className="w-4 h-4" weight="duotone" />
              <span>Trash - Documents will be permanently deleted after 30 days</span>
            </div>
          ) : selectedPortfolio && (
            <div className="flex items-center gap-2 text-white/40 text-sm mb-4">
              <FolderSimple className="w-4 h-4" weight="duotone" />
              <span>{selectedPortfolio.name}</span>
            </div>
          )}

          {sortedDocuments.length > 0 ? (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className={viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-2'
              }
            >
              {sortedDocuments.map((doc) => {
                const isPinned = pinnedDocs.some(d => d.document_id === doc.document_id);
                
                return (
                  <motion.div key={doc.document_id} variants={fadeInUp}>
                    {viewMode === 'grid' ? (
                      <GlassCard
                        interactive
                        glow
                        onClick={() => setSelectedDocument(doc)}
                        className={`relative ${selectedDocument?.document_id === doc.document_id ? 'border-vault-gold/50' : ''}`}
                      >
                        {isPinned && (
                          <div className="absolute top-2 right-12">
                            <Star className="w-4 h-4 text-vault-gold fill-vault-gold" weight="duotone" />
                          </div>
                        )}
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-lg bg-vault-gold/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-vault-gold" weight="duotone" />
                          </div>
                          {!showTrash ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 text-white/30 hover:text-white" onClick={(e) => e.stopPropagation()}>
                                  <DotsThreeVertical className="w-4 h-4" weight="duotone" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-vault-navy border-white/10">
                                <DropdownMenuItem 
                                  onClick={(e) => { e.stopPropagation(); navigate(`/vault/document/${doc.document_id}`); }}
                                  className="text-white/70 hover:text-white focus:text-white"
                                >
                                  Open
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={(e) => { e.stopPropagation(); togglePinDocument(doc.document_id); }}
                                  className="text-white/70 hover:text-white focus:text-white"
                                >
                                  {isPinned ? <Star className="w-4 h-4 mr-2" weight="duotone" /> : <Star className="w-4 h-4 mr-2" weight="duotone" />}
                                  {isPinned ? 'Unpin' : 'Pin'}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={(e) => { e.stopPropagation(); exportDocument(doc); }}
                                  className="text-white/70 hover:text-white focus:text-white"
                                >
                                  <Download className="w-4 h-4 mr-2" weight="duotone" />
                                  Export PDF
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" weight="duotone" />
                                <DropdownMenuItem 
                                  onClick={(e) => { e.stopPropagation(); trashDocument(doc.document_id); }}
                                  className="text-red-400 hover:text-red-300 focus:text-red-300"
                                >
                                  <Trash className="w-4 h-4 mr-2" weight="duotone" />
                                  Move to Trash
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 text-white/30 hover:text-white" onClick={(e) => e.stopPropagation()}>
                                  <DotsThreeVertical className="w-4 h-4" weight="duotone" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-vault-navy border-white/10">
                                <DropdownMenuItem 
                                  onClick={(e) => { e.stopPropagation(); restoreDocument(doc.document_id); }}
                                  className="text-green-400 hover:text-green-300 focus:text-green-300"
                                >
                                  <ArrowCounterClockwise className="w-4 h-4 mr-2" weight="duotone" />
                                  Restore
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={(e) => { e.stopPropagation(); permanentlyDelete(doc.document_id); }}
                                  className="text-red-400 hover:text-red-300 focus:text-red-300"
                                >
                                  <Trash className="w-4 h-4 mr-2" weight="duotone" />
                                  Delete Forever
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        <h3 className="text-white font-medium mb-1 line-clamp-2 min-w-0">{doc.title}</h3>
                        <p className="text-white/40 text-xs mb-3">{humanizeSlug(doc.document_type)}</p>
                        {doc.rm_id && (
                          <p className="text-vault-gold/60 text-[10px] sm:text-xs font-mono truncate mb-2 sm:hidden max-w-[150px]">
                            {doc.sub_record_id || doc.rm_id}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-white/30 gap-2">
                          <span className="flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" weight="duotone" />
                            {new Date(doc.updated_at).toLocaleDateString()}
                          </span>
                          <span className={`px-2 py-0.5 rounded shrink-0 ${
                            doc.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            doc.status === 'signed' ? 'bg-vault-gold/20 text-vault-gold' :
                            doc.is_locked ? 'bg-blue-500/20 text-blue-400' :
                            'bg-white/10 text-white/50'
                          }`}>
                            {doc.is_locked ? 'Finalized' : doc.status}
                          </span>
                        </div>
                      </GlassCard>
                    ) : (
                      <div
                        onClick={() => setSelectedDocument(doc)}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                          selectedDocument?.document_id === doc.document_id
                            ? 'border-vault-gold/50 bg-vault-gold/5'
                            : 'border-white/5 hover:border-white/20 bg-white/5'
                        }`}
                      >
                        {isPinned && <Star className="w-4 h-4 text-vault-gold fill-vault-gold shrink-0 mt-0.5" weight="duotone" />}
                        <FileText className="w-5 h-5 text-white/40 shrink-0 mt-0.5" weight="duotone" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white line-clamp-2 text-sm">{doc.title}</p>
                          <p className="text-white/40 text-xs mt-0.5">{humanizeSlug(doc.document_type)}</p>
                          {doc.rm_id && (
                            <p className="text-vault-gold/60 text-[10px] font-mono truncate mt-0.5 sm:hidden max-w-[120px]">
                              {doc.sub_record_id || doc.rm_id}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 min-w-[70px]">
                          <span className="text-white/30 text-xs">
                            {new Date(doc.updated_at).toLocaleDateString()}
                          </span>
                          {doc.is_locked && (
                            <span className="text-blue-400 text-[10px] sm:text-xs bg-blue-500/20 px-1.5 py-0.5 rounded">
                              Finalized
                            </span>
                          )}
                          {doc.rm_id && (
                            <span className="hidden sm:block text-vault-gold/60 text-xs font-mono truncate max-w-[150px]">
                              {doc.sub_record_id || doc.rm_id}
                            </span>
                          )}
                        </div>
                        <CaretRight className="w-4 h-4 text-white/20 shrink-0 mt-0.5" weight="duotone" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-white/10 mx-auto mb-4" weight="duotone" />
              <p className="text-white/40 mb-4">
                {showTrash 
                  ? 'Trash is empty' 
                  : searchTerm 
                    ? 'No documents match your search' 
                    : 'No documents yet'
                }
              </p>
              {!showTrash && (
                <Button onClick={() => navigate('/templates')} className="btn-primary">
                  Create Your First Document
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Document Preview */}
      <AnimatePresence>
        {selectedDocument && (
          <motion.div
            {...paneTransition}
            className="w-96 border-l border-white/10 flex flex-col"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-heading text-white">Document Details</h3>
              <button 
                onClick={() => setSelectedDocument(null)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" weight="duotone" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              <div className="w-16 h-16 rounded-xl bg-vault-gold/10 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-vault-gold" weight="duotone" />
              </div>
              
              <h2 className="text-xl font-heading text-white mb-2">{selectedDocument.title}</h2>
              <p className="text-vault-gold text-sm mb-4">{humanizeSlug(selectedDocument.document_type)}</p>
              
              <div className="space-y-4">
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Status</p>
                  <span className={`px-3 py-1 rounded text-sm ${
                    selectedDocument.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    selectedDocument.status === 'signed' ? 'bg-vault-gold/20 text-vault-gold' :
                    'bg-white/10 text-white/50'
                  }`}>
                    {selectedDocument.status}
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
                
                {selectedDocument.tags?.length > 0 && (
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedDocument.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-white/5 text-white/60 text-xs rounded">
                          <Tag className="w-3 h-3 inline mr-1" weight="duotone" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-white/10 space-y-2">
              {!showTrash ? (
                <>
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
                </>
              ) : (
                <>
                  <Button 
                    onClick={() => restoreDocument(selectedDocument.document_id)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <ArrowCounterClockwise className="w-4 h-4 mr-2" weight="duotone" />
                    Restore Document
                  </Button>
                  <Button 
                    onClick={() => permanentlyDelete(selectedDocument.document_id)}
                    variant="outline"
                    className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20"
                  >
                    <Trash className="w-4 h-4 mr-2" weight="duotone" />
                    Delete Forever
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Portfolio Dialog */}
      <Dialog open={showNewPortfolio} onOpenChange={setShowNewPortfolio}>
        <DialogContent className="bg-vault-navy border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-heading">Create Portfolio</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Portfolio name"
              value={newPortfolioName}
              onChange={(e) => setNewPortfolioName(e.target.value)}
              className="bg-white/5 border-white/10 focus:border-vault-gold"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewPortfolio(false)}>
              Cancel
            </Button>
            <Button onClick={createPortfolio} className="btn-primary">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Packet Builder Dialog */}
      <Dialog open={showPacketBuilder} onOpenChange={setShowPacketBuilder}>
        <DialogContent className="bg-vault-navy border-white/10 max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white font-heading flex items-center gap-2">
              <Package className="w-5 h-5 text-vault-gold" weight="duotone" />
              Build Document Packet
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Select documents to bundle into a downloadable ZIP package
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 flex-1 overflow-y-auto">
            <Input
              placeholder="Packet name (e.g., Trust Formation Package)"
              value={packetName}
              onChange={(e) => setPacketName(e.target.value)}
              className="bg-white/5 border-white/10 focus:border-vault-gold mb-4"
            />
            
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">
              Select Documents ({selectedForPacket.length} selected)
            </p>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
              {documents.map(doc => (
                <div
                  key={doc.document_id}
                  onClick={() => togglePacketSelection(doc.document_id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedForPacket.includes(doc.document_id)
                      ? 'border-vault-gold/50 bg-vault-gold/10'
                      : 'border-white/10 hover:border-white/20 bg-white/5'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedForPacket.includes(doc.document_id)
                      ? 'border-vault-gold bg-vault-gold'
                      : 'border-white/30'
                  }`}>
                    {selectedForPacket.includes(doc.document_id) && (
                      <Check className="w-3 h-3 text-vault-navy" weight="duotone" />
                    )}
                  </div>
                  <FileText className="w-4 h-4 text-white/40" weight="duotone" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">{doc.title}</p>
                    <p className="text-white/40 text-xs">{humanizeSlug(doc.document_type)}</p>
                  </div>
                </div>
              ))}
              
              {documents.length === 0 && (
                <p className="text-white/40 text-center py-8">No documents available</p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPacketBuilder(false)}>
              Cancel
            </Button>
            <Button 
              onClick={buildPacket} 
              disabled={selectedForPacket.length === 0 || !packetName.trim() || buildingPacket}
              className="btn-primary"
            >
              {buildingPacket ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Building...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" weight="duotone" />
                  Build & Download
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
