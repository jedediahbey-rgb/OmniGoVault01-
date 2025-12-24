import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Calendar,
  CaretDown,
  CaretRight,
  Check,
  CheckCircle,
  Clock,
  FileText,
  Gavel,
  HandCoins,
  House,
  List,
  MagnifyingGlass,
  Newspaper,
  PencilSimple,
  Plus,
  Scales,
  ShieldCheck,
  SquaresFour,
  Timer,
  Trash,
  Users,
  Warning,
  X
} from '@phosphor-icons/react';
import PageHeader from '../components/shared/PageHeader';
import GlassCard from '../components/shared/GlassCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { staggerContainer, fadeInUp, paneTransition } from '../lib/motion';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Meeting type icons and colors
const meetingTypeConfig = {
  regular: { icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  special: { icon: Gavel, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  emergency: { icon: Warning, color: 'text-red-400', bg: 'bg-red-500/20' },
};

// Meeting status badges
const statusConfig = {
  draft: { label: 'Draft', color: 'bg-slate-500/30 text-slate-300 border-slate-400/30' },
  finalized: { label: 'Finalized', color: 'bg-vault-gold/30 text-vault-gold border-vault-gold/30' },
  attested: { label: 'Attested', color: 'bg-emerald-500/30 text-emerald-400 border-emerald-400/30' },
  amended: { label: 'Amended', color: 'bg-purple-500/30 text-purple-400 border-purple-400/30' },
};

// Role badge colors
const roleColors = {
  trustee: 'bg-vault-gold/20 text-vault-gold border-vault-gold/30',
  co_trustee: 'bg-amber-500/20 text-amber-400 border-amber-400/30',
  beneficiary: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30',
  grantor: 'bg-blue-500/20 text-blue-400 border-blue-400/30',
  protector: 'bg-purple-500/20 text-purple-400 border-purple-400/30',
  counsel: 'bg-cyan-500/20 text-cyan-400 border-cyan-400/30',
  observer: 'bg-slate-500/20 text-slate-400 border-slate-400/30',
};

export default function GovernancePage({ user }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const portfolioIdParam = searchParams.get('portfolio');
  
  const [activeTab, setActiveTab] = useState('meetings');
  const [meetings, setMeetings] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [parties, setParties] = useState([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState(portfolioIdParam || '');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  
  // New Meeting Dialog
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    meeting_type: 'regular',
    date_time: new Date().toISOString().slice(0, 16),
    location: '',
    called_by: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchPortfolios();
  }, []);

  useEffect(() => {
    if (selectedPortfolio) {
      fetchMeetings();
      fetchParties();
    }
  }, [selectedPortfolio]);

  const fetchPortfolios = async () => {
    try {
      const res = await axios.get(`${API}/portfolios`);
      setPortfolios(res.data || []);
      // Auto-select first portfolio if none selected
      if (!selectedPortfolio && res.data?.length > 0) {
        setSelectedPortfolio(portfolioIdParam || res.data[0].portfolio_id);
      }
    } catch (error) {
      console.error('Failed to fetch portfolios:', error);
      toast.error('Failed to load portfolios');
    }
  };

  const fetchMeetings = async () => {
    if (!selectedPortfolio) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/governance/meetings`, {
        params: { portfolio_id: selectedPortfolio }
      });
      setMeetings(res.data || []);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const fetchParties = async () => {
    if (!selectedPortfolio) return;
    try {
      const res = await axios.get(`${API}/portfolios/${selectedPortfolio}/parties`);
      setParties(res.data || []);
    } catch (error) {
      console.error('Failed to fetch parties:', error);
    }
  };

  const handleCreateMeeting = async () => {
    if (!newMeeting.title.trim()) {
      toast.error('Please enter a meeting title');
      return;
    }
    if (!selectedPortfolio) {
      toast.error('Please select a portfolio');
      return;
    }
    
    setCreating(true);
    try {
      const res = await axios.post(`${API}/governance/meetings`, {
        ...newMeeting,
        portfolio_id: selectedPortfolio,
        date_time: new Date(newMeeting.date_time).toISOString(),
      });
      
      toast.success('Meeting created');
      setShowNewMeeting(false);
      setNewMeeting({
        title: '',
        meeting_type: 'regular',
        date_time: new Date().toISOString().slice(0, 16),
        location: '',
        called_by: '',
      });
      
      // Navigate to the new meeting
      navigate(`/vault/governance/meetings/${res.data.meeting_id}`);
    } catch (error) {
      console.error('Failed to create meeting:', error);
      toast.error('Failed to create meeting');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    try {
      await axios.delete(`${API}/governance/meetings/${meetingId}`);
      toast.success('Meeting deleted');
      fetchMeetings();
    } catch (error) {
      console.error('Failed to delete meeting:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete meeting');
    }
  };

  const filteredMeetings = meetings.filter(m => 
    m.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.rm_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const selectedPortfolioData = portfolios.find(p => p.portfolio_id === selectedPortfolio);

  return (
    <motion.div 
      className="min-h-screen p-4 md:p-6 lg:p-8"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="mb-6">
        <PageHeader
          title="Governance"
          subtitle="Trust meeting minutes, distributions, and compliance"
          icon={Gavel}
        />
      </motion.div>

      {/* Portfolio Selector & Actions */}
      <motion.div variants={fadeInUp} className="mb-6">
        <GlassCard className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Portfolio Selector */}
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex-1 md:flex-none md:min-w-[250px]">
                <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
                  <SelectTrigger className="bg-vault-dark/50 border-vault-gold/20 text-white">
                    <SelectValue placeholder="Select Portfolio" />
                  </SelectTrigger>
                  <SelectContent className="bg-vault-dark border-vault-gold/30">
                    {portfolios.map(p => (
                      <SelectItem 
                        key={p.portfolio_id} 
                        value={p.portfolio_id}
                        className="text-white hover:bg-vault-gold/20"
                      >
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedPortfolioData && (
                <div className="hidden md:flex items-center gap-2 text-vault-muted text-sm">
                  <House className="w-4 h-4" />
                  <span>Portfolio: {selectedPortfolioData.name}</span>
                </div>
              )}
            </div>

            {/* Search & New Button */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vault-muted" />
                <Input
                  placeholder="Search meetings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-vault-dark/50 border-vault-gold/20 text-white placeholder:text-vault-muted"
                />
              </div>
              <Button
                onClick={() => setShowNewMeeting(true)}
                className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark font-semibold whitespace-nowrap"
                disabled={!selectedPortfolio}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Meeting
              </Button>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Tabs for different governance modules */}
      <motion.div variants={fadeInUp}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-vault-dark/50 border border-vault-gold/20 mb-6">
            <TabsTrigger 
              value="meetings" 
              className="data-[state=active]:bg-vault-gold data-[state=active]:text-vault-dark"
            >
              <Newspaper className="w-4 h-4 mr-2" />
              Meeting Minutes
            </TabsTrigger>
            <TabsTrigger 
              value="distributions" 
              className="data-[state=active]:bg-vault-gold data-[state=active]:text-vault-dark"
              disabled
            >
              <HandCoins className="w-4 h-4 mr-2" />
              Distributions
            </TabsTrigger>
            <TabsTrigger 
              value="disputes" 
              className="data-[state=active]:bg-vault-gold data-[state=active]:text-vault-dark"
              disabled
            >
              <Scales className="w-4 h-4 mr-2" />
              Disputes
            </TabsTrigger>
            <TabsTrigger 
              value="insurance" 
              className="data-[state=active]:bg-vault-gold data-[state=active]:text-vault-dark"
              disabled
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              Insurance
            </TabsTrigger>
          </TabsList>

          {/* Meeting Minutes Tab */}
          <TabsContent value="meetings" className="mt-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-12 h-12 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !selectedPortfolio ? (
              <GlassCard className="p-12 text-center">
                <House className="w-16 h-16 mx-auto text-vault-gold/50 mb-4" />
                <h3 className="text-xl font-heading text-white mb-2">Select a Portfolio</h3>
                <p className="text-vault-muted">Choose a portfolio to view its governance records</p>
              </GlassCard>
            ) : filteredMeetings.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <Newspaper className="w-16 h-16 mx-auto text-vault-gold/50 mb-4" />
                <h3 className="text-xl font-heading text-white mb-2">No Meetings Yet</h3>
                <p className="text-vault-muted mb-6">Create your first meeting minutes to get started</p>
                <Button
                  onClick={() => setShowNewMeeting(true)}
                  className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Meeting
                </Button>
              </GlassCard>
            ) : (
              <div className="space-y-4">
                {filteredMeetings.map((meeting, index) => {
                  const typeConfig = meetingTypeConfig[meeting.meeting_type] || meetingTypeConfig.regular;
                  const TypeIcon = typeConfig.icon;
                  const status = statusConfig[meeting.status] || statusConfig.draft;
                  
                  return (
                    <motion.div
                      key={meeting.meeting_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <GlassCard 
                        className="p-4 hover:border-vault-gold/40 transition-all cursor-pointer group"
                        onClick={() => navigate(`/vault/governance/meetings/${meeting.meeting_id}`)}
                      >
                        <div className="flex items-start gap-4">
                          {/* Type Icon */}
                          <div className={`p-3 rounded-xl ${typeConfig.bg}`}>
                            <TypeIcon className={`w-6 h-6 ${typeConfig.color}`} />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="text-lg font-heading text-white group-hover:text-vault-gold transition-colors">
                                  {meeting.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  {meeting.rm_id && (
                                    <span className="text-xs font-mono text-vault-muted bg-vault-dark/50 px-2 py-0.5 rounded">
                                      {meeting.rm_id}
                                    </span>
                                  )}
                                  <Badge className={`text-xs ${status.color} border`}>
                                    {status.label}
                                  </Badge>
                                  {meeting.is_amendment && (
                                    <Badge className="text-xs bg-purple-500/20 text-purple-400 border border-purple-400/30">
                                      Amendment #{meeting.amendment_number}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="text-right shrink-0">
                                <div className="text-sm text-vault-muted flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {formatDate(meeting.date_time)}
                                </div>
                                {meeting.location && (
                                  <div className="text-xs text-vault-muted mt-1 truncate max-w-[200px]">
                                    📍 {meeting.location}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Attendees Preview */}
                            {meeting.attendees?.length > 0 && (
                              <div className="flex items-center gap-2 mt-3">
                                <Users className="w-4 h-4 text-vault-muted" />
                                <div className="flex flex-wrap gap-1">
                                  {meeting.attendees.slice(0, 4).map((att, i) => (
                                    <span 
                                      key={i}
                                      className={`text-xs px-2 py-0.5 rounded-full border ${roleColors[att.role] || roleColors.observer}`}
                                    >
                                      {att.name || 'Unknown'}
                                    </span>
                                  ))}
                                  {meeting.attendees.length > 4 && (
                                    <span className="text-xs text-vault-muted">
                                      +{meeting.attendees.length - 4} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Agenda Preview */}
                            {meeting.agenda_items?.length > 0 && (
                              <div className="flex items-center gap-2 mt-2 text-sm text-vault-muted">
                                <List className="w-4 h-4" />
                                <span>{meeting.agenda_items.length} agenda item{meeting.agenda_items.length !== 1 ? 's' : ''}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {meeting.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Delete this draft meeting?')) {
                                    handleDeleteMeeting(meeting.meeting_id);
                                  }
                                }}
                              >
                                <Trash className="w-4 h-4" />
                              </Button>
                            )}
                            <CaretRight className="w-5 h-5 text-vault-muted" />
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Placeholder tabs for future modules */}
          <TabsContent value="distributions">
            <GlassCard className="p-12 text-center">
              <HandCoins className="w-16 h-16 mx-auto text-vault-gold/50 mb-4" />
              <h3 className="text-xl font-heading text-white mb-2">Coming Soon</h3>
              <p className="text-vault-muted">Distribution visualization with interactive charts</p>
            </GlassCard>
          </TabsContent>

          <TabsContent value="disputes">
            <GlassCard className="p-12 text-center">
              <Scales className="w-16 h-16 mx-auto text-vault-gold/50 mb-4" />
              <h3 className="text-xl font-heading text-white mb-2">Coming Soon</h3>
              <p className="text-vault-muted">Dispute tracking and case management</p>
            </GlassCard>
          </TabsContent>

          <TabsContent value="insurance">
            <GlassCard className="p-12 text-center">
              <ShieldCheck className="w-16 h-16 mx-auto text-vault-gold/50 mb-4" />
              <h3 className="text-xl font-heading text-white mb-2">Coming Soon</h3>
              <p className="text-vault-muted">Life insurance policy management</p>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* New Meeting Dialog */}
      <Dialog open={showNewMeeting} onOpenChange={setShowNewMeeting}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading text-vault-gold flex items-center gap-2">
              <Newspaper className="w-5 h-5" />
              New Meeting Minutes
            </DialogTitle>
            <DialogDescription className="text-vault-muted">
              Create a record for trust meeting minutes
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Meeting Title *</label>
              <Input
                value={newMeeting.title}
                onChange={(e) => setNewMeeting(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Q4 2024 Regular Meeting"
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
            
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Meeting Type</label>
              <Select 
                value={newMeeting.meeting_type} 
                onValueChange={(v) => setNewMeeting(prev => ({ ...prev, meeting_type: v }))}
              >
                <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                  <SelectItem value="regular" className="text-white hover:bg-vault-gold/20">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      Regular Meeting
                    </div>
                  </SelectItem>
                  <SelectItem value="special" className="text-white hover:bg-vault-gold/20">
                    <div className="flex items-center gap-2">
                      <Gavel className="w-4 h-4 text-amber-400" />
                      Special Meeting
                    </div>
                  </SelectItem>
                  <SelectItem value="emergency" className="text-white hover:bg-vault-gold/20">
                    <div className="flex items-center gap-2">
                      <Warning className="w-4 h-4 text-red-400" />
                      Emergency Meeting
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Date & Time</label>
              <Input
                type="datetime-local"
                value={newMeeting.date_time}
                onChange={(e) => setNewMeeting(prev => ({ ...prev, date_time: e.target.value }))}
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
            
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Location</label>
              <Input
                value={newMeeting.location}
                onChange={(e) => setNewMeeting(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Conference Room A or Zoom"
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
            
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Called By</label>
              <Input
                value={newMeeting.called_by}
                onChange={(e) => setNewMeeting(prev => ({ ...prev, called_by: e.target.value }))}
                placeholder="Name of person who called the meeting"
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewMeeting(false)}
              className="border-vault-gold/30 text-white hover:bg-vault-gold/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateMeeting}
              disabled={creating || !newMeeting.title.trim()}
              className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark font-semibold"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-vault-dark border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Meeting
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
