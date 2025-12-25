import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  ArrowLeft,
  Calendar,
  CaretRight,
  Check,
  CheckCircle,
  Clock,
  CurrencyDollar,
  DotsThreeVertical,
  Download,
  FileText,
  Gavel,
  Lock,
  PencilSimple,
  Plus,
  PlusCircle,
  Scales,
  ShieldCheck,
  Trash,
  User,
  Users,
  Warning,
  X
} from '@phosphor-icons/react';
import PageHeader from '../components/shared/PageHeader';
import GlassCard from '../components/shared/GlassCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { staggerContainer, fadeInUp } from '../lib/motion';
import { toast } from 'sonner';
import { AmendmentStudio } from '../components/governance';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Dispute type configs
const disputeTypeConfig = {
  beneficiary: { icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Beneficiary Dispute' },
  trustee: { icon: Gavel, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Trustee Dispute' },
  third_party: { icon: Scales, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Third Party Dispute' },
  tax: { icon: CurrencyDollar, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Tax Dispute' },
  regulatory: { icon: ShieldCheck, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Regulatory Dispute' },
};

// Status configs
const statusConfig = {
  open: { label: 'Open', color: 'bg-blue-500/30 text-blue-400 border-blue-400/30', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-amber-500/30 text-amber-400 border-amber-400/30', icon: Clock },
  mediation: { label: 'Mediation', color: 'bg-purple-500/30 text-purple-400 border-purple-400/30', icon: Users },
  litigation: { label: 'Litigation', color: 'bg-red-500/30 text-red-400 border-red-400/30', icon: Gavel },
  finalized: { label: 'Finalized', color: 'bg-vault-gold/30 text-vault-gold border-vault-gold/30', icon: Lock },
  settled: { label: 'Settled', color: 'bg-emerald-500/30 text-emerald-400 border-emerald-400/30', icon: CheckCircle },
  closed: { label: 'Closed', color: 'bg-slate-500/30 text-slate-300 border-slate-400/30', icon: Check },
  appealed: { label: 'Appealed', color: 'bg-orange-500/30 text-orange-400 border-orange-400/30', icon: Warning },
};

// Priority configs
const priorityConfig = {
  low: { label: 'Low', color: 'bg-slate-500/30 text-slate-300 border-slate-400/30' },
  medium: { label: 'Medium', color: 'bg-blue-500/30 text-blue-400 border-blue-400/30' },
  high: { label: 'High', color: 'bg-amber-500/30 text-amber-400 border-amber-400/30' },
  critical: { label: 'Critical', color: 'bg-red-500/30 text-red-400 border-red-400/30' },
};

// Party role options
const partyRoleOptions = [
  { value: 'claimant', label: 'Claimant' },
  { value: 'respondent', label: 'Respondent' },
  { value: 'witness', label: 'Witness' },
  { value: 'mediator', label: 'Mediator' },
  { value: 'arbitrator', label: 'Arbitrator' },
];

// Event type options
const eventTypeOptions = [
  { value: 'filing', label: 'Filing' },
  { value: 'response', label: 'Response' },
  { value: 'hearing', label: 'Hearing' },
  { value: 'mediation', label: 'Mediation Session' },
  { value: 'ruling', label: 'Ruling/Decision' },
  { value: 'appeal', label: 'Appeal' },
  { value: 'settlement', label: 'Settlement' },
  { value: 'other', label: 'Other' },
];

export default function DisputeEditorPage({ user }) {
  const navigate = useNavigate();
  const { disputeId } = useParams();
  
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Editing states
  const [editingHeader, setEditingHeader] = useState(false);
  const [editedHeader, setEditedHeader] = useState({});
  
  // Dialogs
  const [showAddParty, setShowAddParty] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [showChangeStatus, setShowChangeStatus] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  
  // Amendment Studio V2
  const [showAmendmentStudio, setShowAmendmentStudio] = useState(false);
  const [amendLoading, setAmendLoading] = useState(false);
  
  // Forms
  const [newParty, setNewParty] = useState({
    name: '',
    role: 'claimant',
    contact_info: '',
    represented_by: '',
    notes: '',
  });
  const [newEvent, setNewEvent] = useState({
    event_type: 'filing',
    title: '',
    description: '',
    event_date: new Date().toISOString().slice(0, 10),
  });
  const [resolution, setResolution] = useState({
    resolution_type: 'settlement',
    summary: '',
    terms: '',
    monetary_award: '',
    in_favor_of: '',
  });

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchDispute = async () => {
      if (!disputeId) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }
      
      try {
        // Use V2 API
        const res = await axios.get(`${API}/governance/v2/records/${disputeId}`, {
          signal: abortController.signal
        });
        
        if (!isMounted) return;
        
        const data = res.data;
        if (!data.ok || !data.data?.record) {
          throw new Error(data.error?.message || 'Failed to load dispute');
        }
        
        const record = data.data.record;
        const revision = data.data.current_revision;
        const payload = revision?.payload_json || {};
        
        // Transform V2 record to expected format
        const dispData = {
          id: record.id,
          dispute_id: record.id,
          title: record.title,
          rm_id: record.rm_id,
          status: record.status,
          locked: record.status === 'finalized',
          portfolio_id: record.portfolio_id,
          created_at: record.created_at,
          finalized_at: record.finalized_at,
          // Extract from payload
          dispute_type: payload.dispute_type || 'beneficiary',
          description: payload.description || '',
          case_number: payload.case_number || '',
          jurisdiction: payload.jurisdiction || '',
          amount_claimed: payload.amount_claimed || 0,
          currency: payload.currency || 'USD',
          estimated_exposure: payload.estimated_exposure || 0,
          priority: payload.priority || 'medium',
          primary_counsel: payload.primary_counsel || '',
          counsel_firm: payload.counsel_firm || '',
          next_deadline: payload.next_deadline || '',
          next_hearing_date: payload.next_hearing_date || '',
          parties: payload.parties || [],
          events: payload.events || [],
          notes: payload.notes || '',
          // V2 specific
          current_version: revision?.version || 1,
          current_revision_id: record.current_revision_id
        };
        
        setDispute(dispData);
        setEditedHeader({
          title: dispData.title,
          dispute_type: dispData.dispute_type,
          description: dispData.description || '',
          case_number: dispData.case_number || '',
          jurisdiction: dispData.jurisdiction || '',
          amount_claimed: dispData.amount_claimed || 0,
          currency: dispData.currency || 'USD',
          estimated_exposure: dispData.estimated_exposure || 0,
          priority: dispData.priority || 'medium',
          primary_counsel: dispData.primary_counsel || '',
          counsel_firm: dispData.counsel_firm || '',
          next_deadline: dispData.next_deadline?.slice(0, 10) || '',
          next_hearing_date: dispData.next_hearing_date?.slice(0, 10) || '',
        });
      } catch (error) {
        if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED' || !isMounted) {
          return;
        }
        console.error('Failed to fetch dispute:', error);
        if (isMounted && error?.response?.status !== 0) {
          toast.error('Failed to load dispute details');
          navigate('/vault/governance?tab=disputes');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDispute();
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [disputeId, navigate]);

  const refetchDispute = async () => {
    if (!disputeId) return;
    
    try {
      const res = await axios.get(`${API}/governance/v2/records/${disputeId}`);
      const data = res.data;
      if (!data.ok || !data.data?.record) return;
      
      const record = data.data.record;
      const revision = data.data.current_revision;
      const payload = revision?.payload_json || {};
      
      const dispData = {
        id: record.id,
        dispute_id: record.id,
        title: record.title,
        rm_id: record.rm_id,
        status: record.status,
        locked: record.status === 'finalized',
        portfolio_id: record.portfolio_id,
        dispute_type: payload.dispute_type || 'beneficiary',
        description: payload.description || '',
        case_number: payload.case_number || '',
        jurisdiction: payload.jurisdiction || '',
        amount_claimed: payload.amount_claimed || 0,
        currency: payload.currency || 'USD',
        estimated_exposure: payload.estimated_exposure || 0,
        priority: payload.priority || 'medium',
        primary_counsel: payload.primary_counsel || '',
        counsel_firm: payload.counsel_firm || '',
        next_deadline: payload.next_deadline || '',
        next_hearing_date: payload.next_hearing_date || '',
        parties: payload.parties || [],
        events: payload.events || [],
        notes: payload.notes || '',
        current_version: revision?.version || 1,
      };
      
      setDispute(dispData);
      setEditedHeader({
        title: dispData.title,
        dispute_type: dispData.dispute_type,
        description: dispData.description || '',
        case_number: dispData.case_number || '',
        jurisdiction: dispData.jurisdiction || '',
        amount_claimed: dispData.amount_claimed || 0,
        currency: dispData.currency || 'USD',
        estimated_exposure: dispData.estimated_exposure || 0,
        priority: dispData.priority || 'medium',
        primary_counsel: dispData.primary_counsel || '',
        counsel_firm: dispData.counsel_firm || '',
        next_deadline: dispData.next_deadline?.slice(0, 10) || '',
        next_hearing_date: dispData.next_hearing_date?.slice(0, 10) || '',
      });
    } catch (error) {
      console.error('Failed to refetch dispute:', error);
    }
  };

  // Save using V2 API
  const saveDispute = async (updates) => {
    setSaving(true);
    try {
      const payload = {
        title: updates.title || dispute.title,
        dispute_type: updates.dispute_type || dispute.dispute_type,
        description: updates.description !== undefined ? updates.description : dispute.description,
        case_number: updates.case_number !== undefined ? updates.case_number : dispute.case_number,
        jurisdiction: updates.jurisdiction !== undefined ? updates.jurisdiction : dispute.jurisdiction,
        amount_claimed: updates.amount_claimed !== undefined ? updates.amount_claimed : dispute.amount_claimed,
        currency: updates.currency || dispute.currency,
        estimated_exposure: updates.estimated_exposure !== undefined ? updates.estimated_exposure : dispute.estimated_exposure,
        priority: updates.priority || dispute.priority,
        primary_counsel: updates.primary_counsel !== undefined ? updates.primary_counsel : dispute.primary_counsel,
        counsel_firm: updates.counsel_firm !== undefined ? updates.counsel_firm : dispute.counsel_firm,
        next_deadline: updates.next_deadline || dispute.next_deadline,
        next_hearing_date: updates.next_hearing_date || dispute.next_hearing_date,
        parties: updates.parties || dispute.parties || [],
        events: updates.events || dispute.events || [],
        notes: updates.notes !== undefined ? updates.notes : dispute.notes,
      };
      
      await axios.put(`${API}/governance/v2/records/${disputeId}`, {
        title: payload.title,
        payload_json: payload
      });
      
      await refetchDispute();
      toast.success('Changes saved');
    } catch (error) {
      console.error('Failed to save:', error);
      if (error.response?.status === 409) {
        toast.error('This dispute is closed and cannot be edited.');
        await refetchDispute();
      } else {
        toast.error(error.response?.data?.error?.message || 'Failed to save changes');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHeader = async () => {
    await saveDispute({
      title: editedHeader.title,
      dispute_type: editedHeader.dispute_type,
      description: editedHeader.description,
      case_number: editedHeader.case_number,
      jurisdiction: editedHeader.jurisdiction,
      amount_claimed: parseFloat(editedHeader.amount_claimed) || 0,
      currency: editedHeader.currency,
      estimated_exposure: parseFloat(editedHeader.estimated_exposure) || 0,
      priority: editedHeader.priority,
      primary_counsel: editedHeader.primary_counsel,
      counsel_firm: editedHeader.counsel_firm,
      next_deadline: editedHeader.next_deadline || null,
      next_hearing_date: editedHeader.next_hearing_date || null,
    });
    setEditingHeader(false);
  };

  const handleAddParty = async () => {
    if (!newParty.name.trim()) {
      toast.error('Please enter party name');
      return;
    }
    
    try {
      await axios.post(`${API}/governance/disputes/${disputeId}/parties`, newParty);
      await refetchDispute();
      setShowAddParty(false);
      setNewParty({
        name: '',
        role: 'claimant',
        contact_info: '',
        represented_by: '',
        notes: '',
      });
      toast.success('Party added');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to add party');
    }
  };

  const handleDeleteParty = async (partyId) => {
    try {
      await axios.delete(`${API}/governance/disputes/${disputeId}/parties/${partyId}`);
      await refetchDispute();
      toast.success('Party removed');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to remove party');
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title.trim()) {
      toast.error('Please enter event title');
      return;
    }
    
    try {
      await axios.post(`${API}/governance/disputes/${disputeId}/events`, newEvent);
      await refetchDispute();
      setShowAddEvent(false);
      setNewEvent({
        event_type: 'filing',
        title: '',
        description: '',
        event_date: new Date().toISOString().slice(0, 10),
      });
      toast.success('Event added');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to add event');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await axios.delete(`${API}/governance/disputes/${disputeId}/events/${eventId}`);
      await refetchDispute();
      toast.success('Event removed');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to remove event');
    }
  };

  const handleResolve = async () => {
    try {
      await axios.post(`${API}/governance/disputes/${disputeId}/resolve`, {
        ...resolution,
        monetary_award: parseFloat(resolution.monetary_award) || 0,
      });
      await refetchDispute();
      setShowResolve(false);
      toast.success('Dispute resolved');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to resolve dispute');
    }
  };

  const handleChangeStatus = async (newStatus) => {
    await saveDispute({ status: newStatus });
    setShowChangeStatus(false);
  };

  const handleSetOutcome = async (outcome) => {
    try {
      await axios.post(`${API}/governance/disputes/${disputeId}/set-outcome`, { status: outcome });
      await refetchDispute();
      setShowChangeStatus(false);
      toast.success(`Dispute outcome set to ${outcome}`);
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to set outcome');
    }
  };

  const handleAmend = async () => {
    try {
      const res = await axios.post(`${API}/governance/disputes/${disputeId}/amend`, {});
      const data = res.data;
      const amendmentData = data.item || data;
      toast.success('Amendment created');
      navigate(`/vault/governance/disputes/${amendmentData.dispute_id}`);
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to create amendment');
    }
  };

  // V2 Amendment Studio handler
  const handleAmendV2 = async (amendData) => {
    setAmendLoading(true);
    try {
      const res = await axios.post(`${API}/governance/disputes/${disputeId}/amend`, {
        reason: amendData.change_reason,
        change_type: amendData.change_type,
        effective_at: amendData.effective_at
      });
      const data = res.data;
      const amendmentData = data.item || data;
      toast.success('Amendment draft created');
      setShowAmendmentStudio(false);
      navigate(`/vault/governance/disputes/${amendmentData.dispute_id}`);
    } catch (error) {
      throw new Error(error.response?.data?.error?.message || 'Failed to create amendment');
    } finally {
      setAmendLoading(false);
    }
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      await axios.post(`${API}/governance/v2/records/${disputeId}/finalize`, {});
      await refetchDispute();
      setShowFinalizeConfirm(false);
      toast.success('Dispute finalized');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to finalize dispute');
    } finally {
      setFinalizing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.post(`${API}/governance/v2/records/${disputeId}/void`, {
        void_reason: 'Deleted by user'
      });
      toast.success('Dispute deleted successfully');
      navigate('/vault/governance?tab=disputes');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete dispute');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <Warning className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-heading text-white mb-2">Dispute Not Found</h2>
          <Button onClick={() => navigate('/vault/governance?tab=disputes')} className="mt-4">
            Back to Governance
          </Button>
        </GlassCard>
      </div>
    );
  }

  const typeConfig = disputeTypeConfig[dispute.dispute_type] || disputeTypeConfig.beneficiary;
  const TypeIcon = typeConfig.icon;
  const isLocked = dispute.locked === true || ['settled', 'closed'].includes(dispute.status);
  // Always show the actual status - never override
  const status = statusConfig[dispute.status] || statusConfig.open;
  const StatusIcon = status.icon;
  const priority = priorityConfig[dispute.priority] || priorityConfig.medium;
  const isOpen = !isLocked && dispute.status !== 'settled' && dispute.status !== 'closed';

  return (
    <motion.div 
      className="min-h-screen p-4 md:p-6 lg:p-8 w-full max-w-full overflow-x-hidden"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link 
            to="/vault/governance?tab=disputes"
            className="text-vault-muted hover:text-vault-gold transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <PageHeader
            title="Dispute Details"
            subtitle={dispute.rm_id || dispute.case_number || 'Dispute Record'}
            icon={Scales}
          />
        </div>
      </motion.div>

      {/* Dispute Header Card */}
      <motion.div variants={fadeInUp} className="mb-6">
        <GlassCard className="p-4 sm:p-6">
          {/* Status badges - mobile first */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <Badge className={`${status.color} border`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
            <Badge className={`${priority.color} border`}>
              {priority.label} Priority
            </Badge>
          </div>
          
          {editingHeader && isOpen ? (
            <div className="space-y-4">
              <Input
                value={editedHeader.title}
                onChange={(e) => setEditedHeader(prev => ({ ...prev, title: e.target.value }))}
                className="text-xl font-heading bg-[#05080F] border-vault-gold/20 text-white"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-vault-muted">Amount Claimed</label>
                  <Input
                    type="number"
                    value={editedHeader.amount_claimed}
                    onChange={(e) => setEditedHeader(prev => ({ ...prev, amount_claimed: e.target.value }))}
                    className="bg-[#05080F] border-vault-gold/20 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-vault-muted">Priority</label>
                  <Select 
                    value={editedHeader.priority} 
                    onValueChange={(v) => setEditedHeader(prev => ({ ...prev, priority: v }))}
                  >
                    <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveHeader} disabled={saving} className="bg-vault-gold text-vault-dark">
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" onClick={() => setEditingHeader(false)} className="border-vault-gold/30">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Title and details */}
              <h1 className="text-xl sm:text-2xl font-heading text-white mb-2">{dispute.title}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-vault-muted mb-2">
                {dispute.rm_id && <span className="font-mono text-vault-gold">{dispute.rm_id}</span>}
                {dispute.case_number && <span>Case: {dispute.case_number}</span>}
                {dispute.jurisdiction && <span>{dispute.jurisdiction}</span>}
              </div>
              {dispute.amount_claimed > 0 && (
                <div className="text-xl sm:text-2xl font-heading text-red-400 mb-4">
                  {formatCurrency(dispute.amount_claimed, dispute.currency)}
                  <span className="text-sm text-vault-muted ml-2">claimed</span>
                </div>
              )}
              
              {/* Action buttons - properly aligned */}
              <div className="flex items-center gap-2 justify-end mt-4">
                {isOpen && (
                  <Button size="sm" onClick={() => setShowResolve(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Resolve
                  </Button>
                )}
                
                {!isLocked && (
                  <Button size="sm" onClick={() => setShowFinalizeConfirm(true)} variant="outline" className="border-vault-gold/30 text-vault-gold hover:bg-vault-gold/10">
                    <Lock className="w-4 h-4 mr-2" />
                    Finalize
                  </Button>
                )}
                
                {isLocked && !dispute.amended_by_id && (
                  <Button size="sm" onClick={() => setShowAmendmentStudio(true)} variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Amend
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="border-vault-gold/30">
                      <DotsThreeVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                    {isOpen && (
                      <>
                        <DropdownMenuItem onClick={() => setEditingHeader(true)} className="text-white hover:bg-vault-gold/20">
                          <PencilSimple className="w-4 h-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowChangeStatus(true)} className="text-white hover:bg-vault-gold/20">
                          <Clock className="w-4 h-4 mr-2" />
                          Change Status
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-vault-gold/20" />
                      </>
                    )}
                    {isLocked && (
                      <>
                        <DropdownMenuItem onClick={() => setShowChangeStatus(true)} className="text-white hover:bg-vault-gold/20">
                          <Scales className="w-4 h-4 mr-2" />
                          Set Outcome
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-vault-gold/20" />
                      </>
                    )}
                    <DropdownMenuItem className="text-vault-muted hover:bg-vault-gold/20">
                      <Download className="w-4 h-4 mr-2" />
                      Export PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-vault-gold/20" />
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteConfirm(true)} 
                      className="text-red-400 hover:bg-red-500/20 hover:text-red-300"
                    >
                      <Trash className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </GlassCard>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Parties Section */}
        <motion.div variants={fadeInUp}>
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-heading text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-vault-gold" />
                Parties
              </h2>
              {isOpen && (
                <Button variant="outline" size="sm" onClick={() => setShowAddParty(true)} className="border-vault-gold/30 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Party
                </Button>
              )}
            </div>
            
            {!dispute.parties?.length ? (
              <div className="text-center py-6 text-vault-muted">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No parties added</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dispute.parties.map((party, idx) => (
                  <div key={party.party_id || idx} className="p-3 bg-vault-dark/30 rounded-lg border border-vault-gold/10 group">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-vault-gold/20 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-vault-gold" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-white truncate">{party.name}</div>
                          <div className="text-xs text-vault-muted capitalize">{party.role}</div>
                          {party.represented_by && (
                            <div className="text-xs text-vault-muted truncate">
                              Rep: {party.represented_by}
                            </div>
                          )}
                        </div>
                      </div>
                      {isOpen && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                          onClick={() => {
                            if (window.confirm(`Remove ${party.name} from this dispute?`)) {
                              handleDeleteParty(party.party_id);
                            }
                          }}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Timeline Section */}
        <motion.div variants={fadeInUp}>
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-heading text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-vault-gold" />
                Timeline
              </h2>
              {isOpen && (
                <Button variant="outline" size="sm" onClick={() => setShowAddEvent(true)} className="border-vault-gold/30 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Event
                </Button>
              )}
            </div>
            
            {!dispute.events?.length ? (
              <div className="text-center py-6 text-vault-muted">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No events recorded</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dispute.events.sort((a, b) => new Date(b.event_date) - new Date(a.event_date)).map((event, idx) => (
                  <div key={event.event_id || idx} className="p-3 bg-vault-dark/30 rounded-lg border border-vault-gold/10 group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <Badge className="text-xs bg-vault-gold/20 text-vault-gold border-vault-gold/30 mb-1">
                          {event.event_type}
                        </Badge>
                        <div className="font-medium text-white">{event.title}</div>
                        {event.description && (
                          <div className="text-sm text-vault-muted mt-1">{event.description}</div>
                        )}
                        <div className="text-xs text-vault-muted mt-1">
                          {new Date(event.event_date).toLocaleDateString()}
                        </div>
                      </div>
                      {isOpen && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                          onClick={() => {
                            if (window.confirm(`Delete event "${event.title}"?`)) {
                              handleDeleteEvent(event.event_id);
                            }
                          }}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>

      {/* Resolution Section (if resolved) */}
      {dispute.resolution && (
        <motion.div variants={fadeInUp} className="mt-6">
          <GlassCard className="p-6 border-emerald-500/30">
            <h2 className="text-xl font-heading text-emerald-400 flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5" />
              Resolution
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-vault-muted">Type</div>
                <div className="text-white capitalize">{dispute.resolution.resolution_type}</div>
              </div>
              {dispute.resolution.monetary_award > 0 && (
                <div>
                  <div className="text-sm text-vault-muted">Award</div>
                  <div className="text-emerald-400 font-heading">
                    {formatCurrency(dispute.resolution.monetary_award, dispute.resolution.currency)}
                  </div>
                </div>
              )}
              {dispute.resolution.in_favor_of && (
                <div>
                  <div className="text-sm text-vault-muted">In Favor Of</div>
                  <div className="text-white">{dispute.resolution.in_favor_of}</div>
                </div>
              )}
              {dispute.resolution.resolution_date && (
                <div>
                  <div className="text-sm text-vault-muted">Date</div>
                  <div className="text-white">{new Date(dispute.resolution.resolution_date).toLocaleDateString()}</div>
                </div>
              )}
            </div>
            {dispute.resolution.summary && (
              <div className="mt-4">
                <div className="text-sm text-vault-muted mb-1">Summary</div>
                <div className="text-white">{dispute.resolution.summary}</div>
              </div>
            )}
          </GlassCard>
        </motion.div>
      )}

      {/* Add Party Dialog */}
      <Dialog open={showAddParty} onOpenChange={setShowAddParty}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading text-vault-gold">Add Party</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Name *</label>
              <Input
                placeholder="Party name"
                value={newParty.name}
                onChange={(e) => setNewParty(prev => ({ ...prev, name: e.target.value }))}
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Role</label>
              <Select value={newParty.role} onValueChange={(v) => setNewParty(prev => ({ ...prev, role: v }))}>
                <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                  {partyRoleOptions.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Represented By</label>
              <Input
                placeholder="Attorney/Representative"
                value={newParty.represented_by}
                onChange={(e) => setNewParty(prev => ({ ...prev, represented_by: e.target.value }))}
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddParty(false)} className="border-vault-gold/30">Cancel</Button>
            <Button onClick={handleAddParty} disabled={!newParty.name.trim()} className="bg-vault-gold text-vault-dark">Add Party</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Event Dialog */}
      <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading text-vault-gold">Add Timeline Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Event Type</label>
              <Select value={newEvent.event_type} onValueChange={(v) => setNewEvent(prev => ({ ...prev, event_type: v }))}>
                <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                  {eventTypeOptions.map(e => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Title *</label>
              <Input
                placeholder="Event title"
                value={newEvent.title}
                onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Date</label>
              <Input
                type="date"
                value={newEvent.event_date}
                onChange={(e) => setNewEvent(prev => ({ ...prev, event_date: e.target.value }))}
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Description</label>
              <Textarea
                placeholder="Event details..."
                value={newEvent.description}
                onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                className="bg-[#05080F] border-vault-gold/20 text-white min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEvent(false)} className="border-vault-gold/30">Cancel</Button>
            <Button onClick={handleAddEvent} disabled={!newEvent.title.trim()} className="bg-vault-gold text-vault-dark">Add Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={showResolve} onOpenChange={setShowResolve}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading text-emerald-400">Resolve Dispute</DialogTitle>
            <DialogDescription className="text-vault-muted">
              Record the resolution of this dispute
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Resolution Type</label>
              <Select value={resolution.resolution_type} onValueChange={(v) => setResolution(prev => ({ ...prev, resolution_type: v }))}>
                <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                  <SelectItem value="settlement">Settlement</SelectItem>
                  <SelectItem value="ruling">Court Ruling</SelectItem>
                  <SelectItem value="dismissal">Dismissal</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="mediation_agreement">Mediation Agreement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Monetary Award</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={resolution.monetary_award}
                  onChange={(e) => setResolution(prev => ({ ...prev, monetary_award: e.target.value }))}
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-vault-muted mb-1 block">In Favor Of</label>
                <Input
                  placeholder="Party name"
                  value={resolution.in_favor_of}
                  onChange={(e) => setResolution(prev => ({ ...prev, in_favor_of: e.target.value }))}
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Summary</label>
              <Textarea
                placeholder="Resolution summary..."
                value={resolution.summary}
                onChange={(e) => setResolution(prev => ({ ...prev, summary: e.target.value }))}
                className="bg-[#05080F] border-vault-gold/20 text-white min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolve(false)} className="border-vault-gold/30">Cancel</Button>
            <Button onClick={handleResolve} className="bg-emerald-600 hover:bg-emerald-500 text-white">Resolve Dispute</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status / Set Outcome Dialog */}
      <Dialog open={showChangeStatus} onOpenChange={setShowChangeStatus}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading text-vault-gold">
              {isLocked ? 'Set Outcome' : 'Change Status'}
            </DialogTitle>
            {isLocked && (
              <DialogDescription className="text-vault-muted">
                Select the outcome for this finalized dispute
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-2 py-4">
            {['open', 'in_progress', 'mediation', 'litigation', 'settled', 'closed', 'appealed'].map(s => (
              <Button
                key={s}
                variant="outline"
                className={`w-full justify-start ${dispute?.status === s ? 'border-vault-gold bg-vault-gold/10' : 'border-vault-gold/30'}`}
                onClick={() => isLocked ? handleSetOutcome(s) : handleChangeStatus(s)}
              >
                {statusConfig[s]?.label || s}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading text-red-400 flex items-center gap-2">
              <Trash className="w-5 h-5" />
              Delete Dispute
            </DialogTitle>
            <DialogDescription className="text-vault-muted">
              This action cannot be undone. Are you sure you want to delete this dispute?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-300">
                <strong>{dispute?.title}</strong> and all its associated parties, events, and documents will be permanently deleted.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="border-vault-gold/30 text-white"
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash className="w-4 h-4 mr-2" />
                  Delete Dispute
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finalize Confirmation Dialog */}
      <Dialog open={showFinalizeConfirm} onOpenChange={setShowFinalizeConfirm}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading text-vault-gold flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Finalize Dispute
            </DialogTitle>
            <DialogDescription className="text-vault-muted">
              Once finalized, this dispute record will be permanently locked and cannot be edited.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="p-4 bg-vault-gold/10 border border-vault-gold/30 rounded-lg">
              <p className="text-sm text-vault-gold">
                <strong>{dispute?.title}</strong> will be locked. Make sure all details are correct before finalizing.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFinalizeConfirm(false)}
              className="border-vault-gold/30 text-white"
              disabled={finalizing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFinalize}
              disabled={finalizing}
              className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark"
            >
              {finalizing ? (
                <>
                  <div className="w-4 h-4 border-2 border-vault-dark border-t-transparent rounded-full animate-spin mr-2" />
                  Finalizing...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Finalize & Lock
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Amendment Studio V2 */}
      <AmendmentStudio
        open={showAmendmentStudio}
        onOpenChange={setShowAmendmentStudio}
        recordTitle={dispute?.title || 'Dispute'}
        currentVersion={dispute?.revision || 1}
        moduleType="dispute"
        onCreateAmendment={handleAmendV2}
        isLoading={amendLoading}
      />
    </motion.div>
  );
}
