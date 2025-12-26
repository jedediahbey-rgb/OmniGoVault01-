import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  ArrowRight,
  Bell,
  Book,
  BookOpen,
  Briefcase,
  Clock,
  DotsThreeVertical,
  FileText,
  FolderSimple,
  FolderSimplePlus,
  Gear,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Robot,
  Sparkle,
  Stethoscope,
  Trash,
  Star
} from '@phosphor-icons/react';
import PageHeader from '../components/shared/PageHeader';
import StatCard from '../components/shared/StatCard';
import GlassCard from '../components/shared/GlassCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import { staggerContainer, fadeInUp } from '../lib/motion';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DashboardPage({ user }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewPortfolio, setShowNewPortfolio] = useState(false);
  const [showEditPortfolio, setShowEditPortfolio] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState(null);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioDesc, setNewPortfolioDesc] = useState('');
  const [defaultPortfolioId, setDefaultPortfolioId] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [portfolioToDelete, setPortfolioToDelete] = useState(null);

  // Load default portfolio from backend first, then fallback to localStorage
  const loadDefaultPortfolio = useCallback(async () => {
    try {
      // First check localStorage for immediate UI response
      const localDefault = localStorage.getItem('defaultPortfolioId');
      if (localDefault) {
        setDefaultPortfolioId(localDefault);
      }
      
      // Then sync with backend
      const res = await axios.get(`${API}/user/preferences`);
      const backendDefault = res.data?.default_portfolio_id;
      
      if (backendDefault) {
        // Backend has a default, use it and sync localStorage
        localStorage.setItem('defaultPortfolioId', backendDefault);
        setDefaultPortfolioId(backendDefault);
      } else if (localDefault) {
        // localStorage has default but backend doesn't, sync to backend
        await axios.put(`${API}/user/preferences`, { default_portfolio_id: localDefault });
      }
    } catch (error) {
      console.log('Using localStorage for default portfolio');
      // Fallback to localStorage only
      const localDefault = localStorage.getItem('defaultPortfolioId');
      if (localDefault) {
        setDefaultPortfolioId(localDefault);
      }
    }
  }, []);

  // Set a portfolio as the global default (persists to both localStorage and backend)
  const setAsDefault = async (portfolioId, e) => {
    e.stopPropagation();
    // Update localStorage immediately for instant UI feedback
    localStorage.setItem('defaultPortfolioId', portfolioId);
    setDefaultPortfolioId(portfolioId);
    toast.success('Default portfolio set - will be auto-selected across the app');
    
    // Persist to backend for cross-device/session persistence
    try {
      await axios.put(`${API}/user/preferences`, { default_portfolio_id: portfolioId });
    } catch (error) {
      console.log('Backend sync failed, localStorage will be used');
    }
  };

  // Clear default portfolio
  const clearDefault = async (e) => {
    e.stopPropagation();
    localStorage.removeItem('defaultPortfolioId');
    setDefaultPortfolioId('');
    toast.success('Default portfolio cleared');
    
    // Clear from backend too
    try {
      await axios.put(`${API}/user/preferences`, { default_portfolio_id: null });
    } catch (error) {
      console.log('Backend sync failed');
    }
  };

  useEffect(() => {
    loadDefaultPortfolio();
    fetchDashboardData();
  }, [loadDefaultPortfolio]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, portfoliosRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/portfolios`)
      ]);
      setStats(statsRes.data);
      setPortfolios(portfoliosRes.data || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const createPortfolio = async () => {
    if (!newPortfolioName.trim()) {
      toast.error('Portfolio name is required');
      return;
    }
    try {
      const response = await axios.post(`${API}/portfolios`, {
        name: newPortfolioName,
        description: newPortfolioDesc
      });
      setPortfolios([response.data, ...portfolios]);
      setNewPortfolioName('');
      setNewPortfolioDesc('');
      setShowNewPortfolio(false);
      toast.success('Portfolio created');
      // Navigate to the new portfolio
      navigate(`/vault/portfolio/${response.data.portfolio_id}`);
    } catch (error) {
      toast.error('Failed to create portfolio');
    }
  };

  const updatePortfolio = async () => {
    if (!editingPortfolio || !newPortfolioName.trim()) return;
    try {
      await axios.put(`${API}/portfolios/${editingPortfolio.portfolio_id}`, {
        name: newPortfolioName,
        description: newPortfolioDesc
      });
      setPortfolios(portfolios.map(p => 
        p.portfolio_id === editingPortfolio.portfolio_id 
          ? { ...p, name: newPortfolioName, description: newPortfolioDesc }
          : p
      ));
      setShowEditPortfolio(false);
      setEditingPortfolio(null);
      toast.success('Portfolio updated');
    } catch (error) {
      toast.error('Failed to update portfolio');
    }
  };

  const deletePortfolio = async (portfolio) => {
    setPortfolioToDelete(portfolio);
    setShowDeleteConfirm(true);
  };

  const confirmDeletePortfolio = async () => {
    if (!portfolioToDelete) return;
    try {
      await axios.delete(`${API}/portfolios/${portfolioToDelete.portfolio_id}`);
      setPortfolios(portfolios.filter(p => p.portfolio_id !== portfolioToDelete.portfolio_id));
      // Clear default if deleted portfolio was the default
      if (portfolioToDelete.portfolio_id === defaultPortfolioId) {
        localStorage.removeItem('defaultPortfolioId');
        setDefaultPortfolioId('');
        // Also clear from backend
        try {
          await axios.put(`${API}/user/preferences`, { default_portfolio_id: null });
        } catch (err) {
          console.log('Backend sync failed');
        }
      }
      toast.success('Portfolio deleted');
    } catch (error) {
      console.error('Delete portfolio error:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete portfolio');
    } finally {
      setShowDeleteConfirm(false);
      setPortfolioToDelete(null);
    }
  };

  const openEditDialog = (portfolio, e) => {
    e.stopPropagation();
    setEditingPortfolio(portfolio);
    setNewPortfolioName(portfolio.name);
    setNewPortfolioDesc(portfolio.description || '');
    setShowEditPortfolio(true);
  };

  const quickActions = [
    { icon: FileText, label: 'New Document', action: () => navigate('/templates'), color: 'blue' },
    { icon: BookOpen, label: 'Start Learning', action: () => navigate('/learn'), color: 'default' },
    { icon: Robot, label: 'Ask Assistant', action: () => navigate('/assistant'), color: 'gold', hint: 'Ctrl+J' },
  ];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Get the default portfolio name
  const defaultPortfolio = portfolios.find(p => p.portfolio_id === defaultPortfolioId);
  const welcomeName = defaultPortfolio?.name || user?.name?.split(' ')[0] || 'User';

  return (
    <div className="p-8">
      <PageHeader
        title={`Welcome back, ${welcomeName}`}
        subtitle="Your trust portfolio dashboard"
        helpKey="dashboard"
        titleAction={
          <Button 
            onClick={() => setShowNewPortfolio(true)} 
            size="sm"
            className="bg-vault-gold/10 hover:bg-vault-gold/20 text-vault-gold border border-vault-gold/30"
          >
            <FolderSimplePlus className="w-4 h-4" weight="duotone" />
          </Button>
        }
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-white/30 text-xs">Ctrl+K for commands</span>
          </div>
        }
      />

      {/* Stats SquaresFour */}
      <motion.div 
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <motion.div variants={fadeInUp}>
          <StatCard label="Portfolios" value={portfolios.length} icon={FolderSimple} variant="gold" />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <StatCard label="Documents" value={stats?.documents || 0} icon={FileText} variant="default" />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <StatCard label="Assets" value={stats?.assets || 0} icon={Briefcase} variant="blue" />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <StatCard label="Notices" value={stats?.pending_notices || 0} icon={Bell} variant="default" />
        </motion.div>
      </motion.div>

      {/* Main Content SquaresFour */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-4"
        >
          <GlassCard className="h-full">
            <h3 className="font-heading text-lg text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.action}
                  className={`p-4 rounded-lg border transition-all duration-200 flex flex-col items-center gap-2 group ${
                    action.color === 'gold' 
                      ? 'border-vault-gold/20 hover:bg-vault-gold/10 hover:border-vault-gold/40' 
                      : action.color === 'blue'
                      ? 'border-vault-blue/20 hover:bg-vault-blue/10 hover:border-vault-blue/40'
                      : 'border-white/10 hover:bg-white/5 hover:border-white/20'
                  }`}
                >
                  <action.icon className={`w-5 h-5 ${
                    action.color === 'gold' ? 'text-vault-gold' :
                    action.color === 'blue' ? 'text-vault-blue' : 'text-white/60'
                  }`} />
                  <span className="text-xs text-white/70 group-hover:text-white">{action.label}</span>
                  {action.hint && <span className="hidden sm:inline text-[10px] text-white/30">{action.hint}</span>}
                </button>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Portfolios List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-8"
        >
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg text-white">Your Portfolios</h3>
              <Button 
                onClick={() => setShowNewPortfolio(true)}
                variant="ghost" 
                size="sm"
                className="text-vault-gold hover:text-vault-gold"
              >
                <Plus className="w-4 h-4 mr-1" weight="duotone" /> Add
              </Button>
            </div>
            
            {portfolios.length > 0 ? (
              <div className="space-y-3">
                {portfolios.map((portfolio) => {
                  const isDefault = portfolio.portfolio_id === defaultPortfolioId;
                  return (
                    <div 
                      key={portfolio.portfolio_id}
                      onClick={() => navigate(`/vault/portfolio/${portfolio.portfolio_id}`)}
                      className={`flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer group ${
                        isDefault 
                          ? 'border-vault-gold/40 bg-vault-gold/5 hover:bg-vault-gold/10' 
                          : 'border-white/5 hover:border-vault-gold/30 hover:bg-vault-gold/5'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-vault-gold/10 flex items-center justify-center shrink-0">
                        <FolderSimple className="w-6 h-6 text-vault-gold" weight="duotone" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium truncate">{portfolio.name}</p>
                          {isDefault && (
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-vault-gold/20 text-vault-gold rounded-full shrink-0">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-white/40 text-sm truncate">
                          {portfolio.description || 'No description'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <span className="hidden sm:inline text-white/30 text-xs">
                          {new Date(portfolio.created_at).toLocaleDateString()}
                        </span>
                        {/* Set as Default Button */}
                        <button
                          onClick={(e) => isDefault ? clearDefault(e) : setAsDefault(portfolio.portfolio_id, e)}
                          className={`p-2 rounded transition-colors ${
                            isDefault 
                              ? 'text-vault-gold hover:text-vault-gold/70' 
                              : 'text-white/30 hover:text-vault-gold'
                          }`}
                          title={isDefault ? 'Remove as default' : 'Set as default portfolio'}
                        >
                          <Star className="w-4 h-4" weight={isDefault ? 'fill' : 'regular'} />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button 
                              onClick={e => e.stopPropagation()}
                              className="p-1.5 text-white/30 hover:text-white hover:bg-white/10 rounded"
                            >
                              <DotsThreeVertical className="w-4 h-4" weight="duotone" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-vault-navy border-white/10">
                            <DropdownMenuItem 
                              onClick={(e) => isDefault ? clearDefault(e) : setAsDefault(portfolio.portfolio_id, e)}
                              className="text-white/70 hover:text-white focus:text-white"
                            >
                              <Star className="w-4 h-4 mr-2" weight={isDefault ? 'fill' : 'regular'} /> 
                              {isDefault ? 'Remove Default' : 'Set as Default'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => openEditDialog(portfolio, e)}
                              className="text-white/70 hover:text-white focus:text-white"
                            >
                              <PencilSimple className="w-4 h-4 mr-2" weight="duotone" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => { e.stopPropagation(); deletePortfolio(portfolio); }}
                              className="text-red-400 hover:text-red-300 focus:text-red-300"
                            >
                              <Trash className="w-4 h-4 mr-2" weight="duotone" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-vault-gold transition-colors" weight="duotone" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <FolderSimple className="w-16 h-16 text-white/10 mx-auto mb-4" weight="duotone" />
                <p className="text-white/40 mb-4">No portfolios yet</p>
                <Button onClick={() => setShowNewPortfolio(true)} className="btn-primary">
                  <Plus className="w-4 h-4 mr-2" weight="duotone" /> Create Your First Portfolio
                </Button>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Learning Progress */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-6"
        >
          <GlassCard className="h-full">
            <h3 className="font-heading text-lg text-white mb-4">Continue Learning</h3>
            <div className="space-y-4">
              <div 
                onClick={() => navigate('/learn')}
                className="p-4 rounded-lg bg-vault-gold/5 border border-vault-gold/20 hover:border-vault-gold/40 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <BookOpen className="w-5 h-5 text-vault-gold" weight="duotone" />
                  <span className="text-white">Foundations of Equity</span>
                </div>
                <p className="text-white/40 text-sm">5 modules • Interactive lessons</p>
              </div>
              
              <div 
                onClick={() => navigate('/maxims')}
                className="p-4 rounded-lg bg-vault-blue/5 border border-vault-blue/20 hover:border-vault-blue/40 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Sparkle className="w-5 h-5 text-vault-blue" weight="duotone" />
                  <span className="text-white">Maxims of Equity</span>
                </div>
                <p className="text-white/40 text-sm">20+ principles • Study mode</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Recent Documents */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-6"
        >
          <GlassCard className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg text-white">Recent Documents</h3>
              <Button 
                onClick={() => navigate('/vault/documents')}
                variant="ghost" 
                size="sm"
                className="text-vault-gold hover:text-vault-gold"
              >
                View All <ArrowRight className="w-4 h-4 ml-1" weight="duotone" />
              </Button>
            </div>
            
            {stats?.recent_documents?.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_documents.map((doc) => (
                  <div 
                    key={doc.document_id}
                    onClick={() => navigate(`/vault/document/${doc.document_id}`)}
                    className="flex items-center gap-4 p-3 rounded-lg border border-white/5 hover:border-vault-gold/30 hover:bg-vault-gold/5 cursor-pointer transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white/40" weight="duotone" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white truncate">{doc.title}</p>
                      <p className="text-xs text-white/40 flex items-center gap-1">
                        <Clock className="w-3 h-3" weight="duotone" />
                        {new Date(doc.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-white/10 mx-auto mb-3" weight="duotone" />
                <p className="text-white/40">No documents yet</p>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>

      {/* New Portfolio Dialog */}
      <Dialog open={showNewPortfolio} onOpenChange={setShowNewPortfolio}>
        <DialogContent className="bg-vault-navy border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-heading">Create Portfolio</DialogTitle>
            <DialogDescription className="text-white/50">
              Create a new portfolio to organize your trust documents and assets.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-white/60 text-sm mb-2 block">Portfolio Name *</label>
              <Input
                placeholder="e.g., Smith Family Trust"
                value={newPortfolioName}
                onChange={(e) => setNewPortfolioName(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-vault-gold"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Description (Optional)</label>
              <Input
                placeholder="Brief description..."
                value={newPortfolioDesc}
                onChange={(e) => setNewPortfolioDesc(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-vault-gold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewPortfolio(false)}>Cancel</Button>
            <Button onClick={createPortfolio} className="btn-primary">Create Portfolio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Portfolio Dialog */}
      <Dialog open={showEditPortfolio} onOpenChange={setShowEditPortfolio}>
        <DialogContent className="bg-vault-navy border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-heading">Edit Portfolio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-white/60 text-sm mb-2 block">Portfolio Name</label>
              <Input
                value={newPortfolioName}
                onChange={(e) => setNewPortfolioName(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Description</label>
              <Input
                value={newPortfolioDesc}
                onChange={(e) => setNewPortfolioDesc(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEditPortfolio(false)}>Cancel</Button>
            <Button onClick={updatePortfolio} className="btn-primary">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-vault-navy border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-heading">Delete Portfolio</DialogTitle>
            <DialogDescription className="text-white/50">
              Are you sure you want to delete "{portfolioToDelete?.name}"? This will permanently delete all documents and data associated with this portfolio.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button onClick={confirmDeletePortfolio} className="bg-red-500 hover:bg-red-600 text-white">
              Delete Portfolio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
