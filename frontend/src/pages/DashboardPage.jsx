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
  ChartLine,
  Clock,
  DotsThreeVertical,
  FilePdf,
  FileText,
  FolderSimple,
  FolderSimplePlus,
  Gavel,
  Gear,
  GitBranch,
  Heartbeat,
  House,
  MagnifyingGlass,
  MapTrifold,
  PencilSimple,
  Plus,
  Robot,
  Scroll,
  ShieldCheck,
  Sparkle,
  Stethoscope,
  Trash,
  Star
} from '@phosphor-icons/react';
import PageHeader from '../components/shared/PageHeader';
import PageHelpTooltip from '../components/shared/PageHelpTooltip';
import StatCard from '../components/shared/StatCard';
import GlassCard from '../components/shared/GlassCard';
import IconBadge from '../components/shared/IconBadge';
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
  const [showQuickActionSettings, setShowQuickActionSettings] = useState(false);

  // All available quick actions (matches sidebar tabs)
  const allQuickActions = [
    // Primary actions
    { id: 'newdocument', icon: FileText, label: 'New Document', action: () => navigate('/templates'), color: 'gold' },
    // Knowledge
    { id: 'learn', icon: BookOpen, label: 'Learn', action: () => navigate('/learn'), color: 'gold' },
    { id: 'maxims', icon: Sparkle, label: 'Maxims', action: () => navigate('/maxims'), color: 'gold' },
    { id: 'glossary', icon: Book, label: 'Glossary', action: () => navigate('/glossary'), color: 'gold' },
    { id: 'diagrams', icon: GitBranch, label: 'Diagrams', action: () => navigate('/diagrams'), color: 'gold' },
    // Workspace
    { id: 'nodemap', icon: MapTrifold, label: 'Node Map', action: () => navigate('/node-map'), color: 'gold' },
    { id: 'scenarios', icon: ChartLine, label: 'Scenarios', action: () => navigate('/scenarios'), color: 'gold' },
    { id: 'ledger', icon: Scroll, label: 'Ledger', action: () => navigate('/ledger'), color: 'gold' },
    { id: 'vault', icon: FolderSimple, label: 'Vault', action: () => navigate('/vault/documents'), color: 'gold' },
    { id: 'governance', icon: Gavel, label: 'Governance', action: () => navigate('/vault/governance'), color: 'gold' },
    { id: 'templates', icon: FileText, label: 'Templates', action: () => navigate('/templates'), color: 'gold' },
    // Tools
    { id: 'assistant', icon: Robot, label: 'Assistant', action: () => navigate('/assistant'), color: 'gold', hint: 'Ctrl+J' },
    { id: 'health', icon: Heartbeat, label: 'Trust Health', action: () => navigate('/health'), color: 'gold' },
    { id: 'diagnostics', icon: ShieldCheck, label: 'Diagnostics', action: () => navigate('/diagnostics'), color: 'gold' },
    { id: 'threads', icon: GitBranch, label: 'Threads', action: () => navigate('/ledger-threads'), color: 'gold' },
    { id: 'binder', icon: FilePdf, label: 'Binder', action: () => navigate('/binder'), color: 'gold' },
    { id: 'settings', icon: Gear, label: 'Settings', action: () => navigate('/settings'), color: 'gold' },
  ];


  // Calculate max quick actions based on portfolio count
  // Simple rule: 2 slots per portfolio row, minimum 4 slots
  const getMaxQuickActions = useCallback((portfolioCount) => {
    if (portfolioCount <= 2) return 4; // Minimum 2 rows (4 cards)
    // Each portfolio gives us 2 more card slots
    return Math.min(portfolioCount * 2, 16); // Cap at 16 max
  }, []);

  const maxQuickActions = getMaxQuickActions(portfolios.length);

  // Get all action IDs in order for auto-fill
  const allActionIds = useMemo(() => allQuickActions.map(a => a.id), []);

  // Track previous max to detect changes
  const prevMaxRef = useRef(maxQuickActions);

  // Default selected quick actions (stored in localStorage)
  const [selectedActions, setSelectedActions] = useState(() => {
    const saved = localStorage.getItem('quickActions');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.slice(0, 16);
    }
    return allActionIds.slice(0, 4);
  });

  // Respond to maxQuickActions changes - auto-fill or trim
  useEffect(() => {
    const prevMax = prevMaxRef.current;
    
    if (maxQuickActions !== prevMax) {
      setSelectedActions(prev => {
        let newSelected = [...prev];
        
        if (maxQuickActions > prevMax) {
          // Max INCREASED - add new cards to fill new slots
          const slotsToAdd = maxQuickActions - newSelected.length;
          if (slotsToAdd > 0) {
            const availableActions = allActionIds.filter(id => !newSelected.includes(id));
            const toAdd = availableActions.slice(0, slotsToAdd);
            newSelected = [...newSelected, ...toAdd];
          }
        } else {
          // Max DECREASED - trim excess cards
          newSelected = newSelected.slice(0, maxQuickActions);
        }
        
        localStorage.setItem('quickActions', JSON.stringify(newSelected));
        return newSelected;
      });
      
      prevMaxRef.current = maxQuickActions;
    }
  }, [maxQuickActions, allActionIds]);

  // Also ensure we're at max on initial load
  useEffect(() => {
    setSelectedActions(prev => {
      if (prev.length < maxQuickActions) {
        const availableActions = allActionIds.filter(id => !prev.includes(id));
        const toAdd = availableActions.slice(0, maxQuickActions - prev.length);
        const newSelected = [...prev, ...toAdd];
        localStorage.setItem('quickActions', JSON.stringify(newSelected));
        return newSelected;
      }
      return prev;
    });
  }, []); // Only run once on mount

  // Ensure quickActions is always capped at maxQuickActions
  const quickActions = allQuickActions
    .filter(a => selectedActions.includes(a.id))
    .slice(0, maxQuickActions);

  const toggleQuickAction = (actionId) => {
    setSelectedActions(prev => {
      let newSelected;
      // Cap current length at max before checking
      const currentLength = Math.min(prev.length, maxQuickActions);
      
      if (prev.includes(actionId)) {
        newSelected = prev.filter(id => id !== actionId);
      } else if (currentLength < maxQuickActions) {
        // Allow adding up to maxQuickActions
        newSelected = [...prev.slice(0, maxQuickActions - 1), actionId];
      } else {
        return prev; // Max reached
      }
      // Always cap at max
      newSelected = newSelected.slice(0, maxQuickActions);
      localStorage.setItem('quickActions', JSON.stringify(newSelected));
      return newSelected;
    });
  };

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
        subtitleAction={<PageHelpTooltip pageKey="dashboard" />}
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
          <StatCard label="Documents" value={stats?.documents || 0} icon={FileText} variant="gold" />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <StatCard label="Assets" value={stats?.assets || 0} icon={Briefcase} variant="gold" />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <StatCard label="Notices" value={stats?.pending_notices || 0} icon={Bell} variant="gold" />
        </motion.div>
      </motion.div>

      {/* Main Content - Quick Actions & Portfolios (same height row) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Actions - matches portfolio height */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-4 self-stretch"
        >
          <GlassCard className="h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg text-white">Quick Actions</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/40 hover:text-white">
                    <DotsThreeVertical className="w-5 h-5" weight="bold" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  side="bottom" 
                  sideOffset={8}
                  avoidCollisions={false}
                  className="bg-[#0B1221] border-vault-gold/20 w-52 max-h-80 overflow-y-auto z-[100]"
                >
                  <div className="px-2 py-1.5 text-xs text-white/50 font-medium">
                    Select Actions ({Math.min(selectedActions.length, maxQuickActions)}/{maxQuickActions} slots)
                  </div>
                  {/* New Document - Primary action */}
                  <DropdownMenuItem
                    onClick={() => toggleQuickAction('newdocument')}
                    className="text-white hover:bg-vault-gold/20 cursor-pointer text-sm"
                  >
                    <FileText className="w-4 h-4 mr-2 text-vault-gold" />
                    <span className="flex-1">New Document</span>
                    {selectedActions.includes('newdocument') && (
                      <span className="text-vault-gold text-xs">✓</span>
                    )}
                  </DropdownMenuItem>
                  <div className="px-2 py-1 text-[10px] text-vault-gold/60 uppercase tracking-wider mt-1">Knowledge</div>
                  {allQuickActions.slice(1, 5).map((action) => (
                    <DropdownMenuItem
                      key={action.id}
                      onClick={() => toggleQuickAction(action.id)}
                      className="text-white hover:bg-vault-gold/20 cursor-pointer text-sm"
                    >
                      <action.icon className="w-4 h-4 mr-2 text-vault-gold" />
                      <span className="flex-1">{action.label}</span>
                      {selectedActions.includes(action.id) && (
                        <span className="text-vault-gold text-xs">✓</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                  <div className="px-2 py-1 text-[10px] text-vault-gold/60 uppercase tracking-wider mt-1">Workspace</div>
                  {allQuickActions.slice(5, 11).map((action) => (
                    <DropdownMenuItem
                      key={action.id}
                      onClick={() => toggleQuickAction(action.id)}
                      className="text-white hover:bg-vault-gold/20 cursor-pointer text-sm"
                    >
                      <action.icon className="w-4 h-4 mr-2 text-vault-gold" />
                      <span className="flex-1">{action.label}</span>
                      {selectedActions.includes(action.id) && (
                        <span className="text-vault-gold text-xs">✓</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                  <div className="px-2 py-1 text-[10px] text-vault-gold/60 uppercase tracking-wider mt-1">Tools</div>
                  {allQuickActions.slice(11).map((action) => (
                    <DropdownMenuItem
                      key={action.id}
                      onClick={() => toggleQuickAction(action.id)}
                      className="text-white hover:bg-vault-gold/20 cursor-pointer text-sm"
                    >
                      <action.icon className="w-4 h-4 mr-2 text-vault-gold" />
                      <span className="flex-1">{action.label}</span>
                      {selectedActions.includes(action.id) && (
                        <span className="text-vault-gold text-xs">✓</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3 content-start" style={{ gridAutoRows: '72px' }}>
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.action}
                  className={`rounded-lg border transition-all duration-200 flex flex-col items-center justify-center gap-1 group ${
                    action.color === 'blue' 
                      ? 'border-vault-blue/20 hover:bg-vault-blue/10 hover:border-vault-blue/40'
                      : 'border-vault-gold/20 hover:bg-vault-gold/10 hover:border-vault-gold/40'
                  }`}
                >
                  <action.icon className={`w-5 h-5 ${action.color === 'blue' ? 'text-vault-blue' : 'text-vault-gold'}`} weight="duotone" />
                  <span className="text-xs text-white/70 group-hover:text-white">{action.label}</span>
                  {action.hint && <span className="hidden sm:inline text-[10px] text-white/30">{action.hint}</span>}
                </button>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Portfolios List - determines row height */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-8 self-stretch"
        >
          <GlassCard className="h-full">
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
                      <IconBadge icon={FolderSimple} size="lg" variant="gold" />
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
                  <Book className="w-5 h-5 text-vault-gold" weight="duotone" />
                  <span className="text-white">Will You Master Equity</span>
                </div>
                <p className="text-white/40 text-sm">5 modules • Interactive lessons</p>
              </div>
              
              <div 
                onClick={() => navigate('/maxims')}
                className="p-4 rounded-lg bg-vault-gold/5 border border-vault-gold/20 hover:border-vault-gold/40 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Sparkle className="w-5 h-5 text-vault-gold" weight="duotone" />
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
                    className="flex items-center gap-4 p-3 rounded-lg border border-white/5 hover:border-vault-gold/30 hover:bg-vault-gold/5 cursor-pointer transition-all group"
                  >
                    <IconBadge icon={FileText} size="md" variant="muted" />
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
