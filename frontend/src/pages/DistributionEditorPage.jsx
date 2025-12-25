import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  ArrowLeft,
  Calendar,
  CaretDown,
  CaretRight,
  Check,
  CheckCircle,
  Clock,
  CurrencyDollar,
  DotsThreeVertical,
  Download,
  FileText,
  Gavel,
  HandCoins,
  Lock,
  PencilSimple,
  Plus,
  PlusCircle,
  Seal,
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
import { AmendmentStudio, RevisionHistory } from '../components/governance';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Distribution type configs
const distributionTypeConfig = {
  regular: { icon: HandCoins, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Regular Distribution' },
  special: { icon: Gavel, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Special Distribution' },
  final: { icon: CheckCircle, color: 'text-vault-gold', bg: 'bg-vault-gold/20', label: 'Final Distribution' },
  emergency: { icon: Warning, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Emergency Distribution' },
};

// Status configs
const statusConfig = {
  draft: { label: 'Draft', color: 'bg-amber-500/20 text-amber-400 border-amber-400/30', icon: PencilSimple },
  pending_approval: { label: 'Pending Approval', color: 'bg-amber-500/30 text-amber-400 border-amber-400/30', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-500/30 text-blue-400 border-blue-400/30', icon: Check },
  in_progress: { label: 'In Progress', color: 'bg-purple-500/30 text-purple-400 border-purple-400/30', icon: Clock },
  finalized: { label: 'Finalized', color: 'bg-vault-gold/30 text-vault-gold border-vault-gold/30', icon: Lock },
  completed: { label: 'Completed', color: 'bg-emerald-500/30 text-emerald-400 border-emerald-400/30', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/30 text-red-400 border-red-400/30', icon: X },
};

// Role options
const roleOptions = [
  { value: 'beneficiary', label: 'Beneficiary' },
  { value: 'trustee', label: 'Trustee' },
  { value: 'charity', label: 'Charity' },
  { value: 'other', label: 'Other' },
];

export default function DistributionEditorPage({ user }) {
  const navigate = useNavigate();
  const { distributionId } = useParams();
  
  const [distribution, setDistribution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState([]);
  
  // Editing states
  const [editingHeader, setEditingHeader] = useState(false);
  const [editedHeader, setEditedHeader] = useState({});
  
  // Dialogs
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showExecute, setShowExecute] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  
  // Amendment Studio V2
  const [showAmendmentStudio, setShowAmendmentStudio] = useState(false);
  const [showRevisionHistory, setShowRevisionHistory] = useState(false);
  const [revisions, setRevisions] = useState([]);
  const [amendLoading, setAmendLoading] = useState(false);
  
  // New recipient form
  const [newRecipient, setNewRecipient] = useState({
    name: '',
    role: 'beneficiary',
    share_percentage: '',
    amount: '',
    payment_method: 'check',
    notes: '',
  });

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchDistribution = async () => {
      try {
        // Use V2 API
        const res = await axios.get(`${API}/governance/v2/records/${distributionId}`, {
          signal: abortController.signal
        });
        
        if (!isMounted) return;
        
        const data = res.data;
        if (!data.ok || !data.data?.record) {
          throw new Error(data.error?.message || 'Failed to load distribution');
        }
        
        const record = data.data.record;
        const revision = data.data.current_revision;
        const payload = revision?.payload_json || {};
        
        // Transform V2 record to expected format
        const distData = {
          id: record.id,
          distribution_id: record.id,
          title: record.title,
          rm_id: record.rm_id,
          status: record.status,
          locked: record.status === 'finalized',
          portfolio_id: record.portfolio_id,
          created_at: record.created_at,
          finalized_at: record.finalized_at,
          // Extract from payload
          distribution_type: payload.distribution_type || 'regular',
          description: payload.description || '',
          total_amount: payload.total_amount || 0,
          currency: payload.currency || 'USD',
          asset_type: payload.asset_type || 'cash',
          scheduled_date: payload.scheduled_date || '',
          source_account: payload.source_account || '',
          recipients: payload.recipients || [],
          notes: payload.notes || '',
          // V2 specific
          current_version: revision?.version || 1,
          current_revision_id: record.current_revision_id
        };
        
        setDistribution(distData);
        setEditedHeader({
          title: distData.title,
          distribution_type: distData.distribution_type,
          description: distData.description || '',
          total_amount: distData.total_amount || 0,
          currency: distData.currency || 'USD',
          asset_type: distData.asset_type || 'cash',
          scheduled_date: distData.scheduled_date?.slice(0, 10) || '',
          source_account: distData.source_account || '',
        });
        
        // Fetch parties for this portfolio
        if (distData.portfolio_id && isMounted) {
          try {
            const partiesRes = await axios.get(`${API}/portfolios/${distData.portfolio_id}/parties`, {
              signal: abortController.signal
            });
            if (isMounted) {
              setParties(partiesRes.data || []);
            }
          } catch (partiesError) {
            if (partiesError?.name === 'CanceledError' || partiesError?.code === 'ERR_CANCELED') {
              return;
            }
            console.warn('Failed to fetch parties:', partiesError);
          }
        }
      } catch (error) {
        if (!isMounted || abortController.signal.aborted || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
          return;
        }
        
        console.error('Failed to fetch distribution:', error);
        if (isMounted && !abortController.signal.aborted) {
          toast.error('Failed to load distribution details');
          navigate('/vault/governance');
        }
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    if (distributionId) {
      fetchDistribution();
    }
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [distributionId, navigate]);

  const refetchDistribution = async () => {
    if (!distributionId) return;
    
    try {
      const res = await axios.get(`${API}/governance/v2/records/${distributionId}`);
      const data = res.data;
      if (!data.ok || !data.data?.record) return;
      
      const record = data.data.record;
      const revision = data.data.current_revision;
      const payload = revision?.payload_json || {};
      
      const distData = {
        id: record.id,
        distribution_id: record.id,
        title: record.title,
        rm_id: record.rm_id,
        status: record.status,
        locked: record.status === 'finalized',
        portfolio_id: record.portfolio_id,
        distribution_type: payload.distribution_type || 'regular',
        description: payload.description || '',
        total_amount: payload.total_amount || 0,
        currency: payload.currency || 'USD',
        asset_type: payload.asset_type || 'cash',
        scheduled_date: payload.scheduled_date || '',
        source_account: payload.source_account || '',
        recipients: payload.recipients || [],
        notes: payload.notes || '',
        current_version: revision?.version || 1,
      };
      
      setDistribution(distData);
      setEditedHeader({
        title: distData.title,
        distribution_type: distData.distribution_type,
        description: distData.description || '',
        total_amount: distData.total_amount || 0,
        currency: distData.currency || 'USD',
        asset_type: distData.asset_type || 'cash',
        scheduled_date: distData.scheduled_date?.slice(0, 10) || '',
        source_account: distData.source_account || '',
      });
    } catch (error) {
      console.error('Failed to refetch distribution:', error);
    }
  };

  // Save using V2 API
  const saveDistribution = async (updates) => {
    setSaving(true);
    try {
      const payload = {
        title: updates.title || distribution.title,
        distribution_type: updates.distribution_type || distribution.distribution_type,
        description: updates.description !== undefined ? updates.description : distribution.description,
        total_amount: updates.total_amount !== undefined ? updates.total_amount : distribution.total_amount,
        currency: updates.currency || distribution.currency,
        asset_type: updates.asset_type || distribution.asset_type,
        scheduled_date: updates.scheduled_date || distribution.scheduled_date,
        source_account: updates.source_account !== undefined ? updates.source_account : distribution.source_account,
        recipients: updates.recipients || distribution.recipients || [],
        notes: updates.notes !== undefined ? updates.notes : distribution.notes,
      };
      
      await axios.put(`${API}/governance/v2/records/${distributionId}`, {
        title: payload.title,
        payload_json: payload
      });
      
      await refetchDistribution();
      toast.success('Changes saved');
    } catch (error) {
      console.error('Failed to save:', error);
      if (error.response?.status === 409) {
        toast.error('This distribution is locked and cannot be edited.');
        await refetchDistribution();
      } else {
        toast.error(error.response?.data?.error?.message || 'Failed to save changes');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHeader = async () => {
    await saveDistribution({
      title: editedHeader.title,
      distribution_type: editedHeader.distribution_type,
      description: editedHeader.description,
      total_amount: parseFloat(editedHeader.total_amount) || 0,
      currency: editedHeader.currency,
      asset_type: editedHeader.asset_type,
      scheduled_date: editedHeader.scheduled_date,
      source_account: editedHeader.source_account,
    });
    setEditingHeader(false);
  };

  const handleAddRecipient = async () => {
    if (!newRecipient.name.trim()) {
      toast.error('Please enter recipient name');
      return;
    }
    
    const recipients = [...(distribution.recipients || [])];
    recipients.push({
      recipient_id: `rcpt_${Date.now()}`,
      ...newRecipient,
      share_percentage: parseFloat(newRecipient.share_percentage) || 0,
      amount: parseFloat(newRecipient.amount) || 0,
      status: 'pending',
    });
    
    await saveDistribution({ recipients });
    setShowAddRecipient(false);
    setNewRecipient({
      name: '',
      role: 'beneficiary',
      share_percentage: '',
      amount: '',
      payment_method: 'check',
      notes: '',
    });
  };

  const handleRemoveRecipient = async (recipientId) => {
    const recipients = (distribution.recipients || []).filter(r => r.recipient_id !== recipientId);
    await saveDistribution({ recipients });
  };

  const handleSubmitForApproval = async () => {
    try {
      // Use V2 API - update status to pending_approval
      await saveDistribution({ workflow_status: 'pending_approval' });
      setShowSubmit(false);
      toast.success('Distribution submitted for approval');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to submit');
    }
  };

  const handleApprove = async (approverName) => {
    try {
      // Use V2 API - add approval to array and save
      const approvalWithId = {
        approval_id: `appr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        approver_name: approverName,
        approver_role: 'trustee',
        approved_at: new Date().toISOString()
      };
      
      const updatedApprovals = [...(distribution.approvals || []), approvalWithId];
      await saveDistribution({ approvals: updatedApprovals, workflow_status: 'approved' });
      setShowApprove(false);
      toast.success('Approval added');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to approve');
    }
  };

  const handleExecute = async () => {
    try {
      // Use V2 API - update status to executed
      await saveDistribution({ 
        workflow_status: 'executed',
        executed_at: new Date().toISOString()
      });
      setShowExecute(false);
      toast.success('Distribution executed');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to execute');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.post(`${API}/governance/v2/records/${distributionId}/void`, {
        void_reason: 'Deleted by user'
      });
      toast.success('Distribution deleted successfully');
      navigate('/vault/governance?tab=distributions');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete distribution');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      await axios.post(`${API}/governance/v2/records/${distributionId}/finalize`, {});
      await refetchDistribution();
      setShowFinalizeConfirm(false);
      toast.success('Distribution finalized');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to finalize distribution');
    } finally {
      setFinalizing(false);
    }
  };

  // V2 Amendment Studio handler - uses unified V2 API
  const handleAmendV2 = async (amendData) => {
    setAmendLoading(true);
    try {
      const res = await axios.post(`${API}/governance/v2/records/${distributionId}/amend`, {
        change_reason: amendData.change_reason,
        change_type: amendData.change_type || 'amendment',
        effective_at: amendData.effective_at
      });
      
      const data = res.data;
      if (data.ok) {
        toast.success('Amendment draft created - you can now edit the new version');
        setShowAmendmentStudio(false);
        // Refetch to show the new draft version
        await refetchDistribution();
      } else {
        throw new Error(data.error?.message || 'Failed to create amendment');
      }
    } catch (error) {
      console.error('Amendment error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to create amendment');
    } finally {
      setAmendLoading(false);
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

  if (!distribution) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <Warning className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-heading text-white mb-2">Distribution Not Found</h2>
          <Button onClick={() => navigate('/vault/governance')} className="mt-4">
            Back to Governance
          </Button>
        </GlassCard>
      </div>
    );
  }

  const typeConfig = distributionTypeConfig[distribution.distribution_type] || distributionTypeConfig.regular;
  const TypeIcon = typeConfig.icon;
  // Status checks - based only on status field
  const isDraft = distribution.status === 'draft';
  const isFinalized = distribution.status === 'finalized';
  const status = statusConfig[distribution.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const isPendingApproval = distribution.status === 'pending_approval';
  const isApproved = distribution.status === 'approved';
  const isCompleted = distribution.status === 'completed';

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
            to="/vault/governance?tab=distributions"
            className="text-vault-muted hover:text-vault-gold transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <PageHeader
            title="Distribution Details"
            subtitle={distribution.rm_id || 'Draft Distribution'}
            icon={HandCoins}
          />
        </div>
      </motion.div>

      {/* Distribution Header Card */}
      <motion.div variants={fadeInUp} className="mb-6">
        <GlassCard className="p-4 sm:p-6 overflow-hidden">
          <div className="flex flex-col gap-4">
            {/* Top row - Icon, badges, content */}
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-xl ${typeConfig.bg} shrink-0`}>
                <TypeIcon className={`w-6 h-6 ${typeConfig.color}`} weight="duotone" />
              </div>
              
              {editingHeader && isDraft ? (
                <div className="flex-1 min-w-0 space-y-4">
                  <Input
                    value={editedHeader.title}
                    onChange={(e) => setEditedHeader(prev => ({ ...prev, title: e.target.value }))}
                    className="text-lg sm:text-xl font-heading bg-[#05080F] border-vault-gold/20 text-white"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-vault-muted">Total Amount</label>
                      <Input
                        type="number"
                        value={editedHeader.total_amount}
                        onChange={(e) => setEditedHeader(prev => ({ ...prev, total_amount: e.target.value }))}
                        className="bg-[#05080F] border-vault-gold/20 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-vault-muted">Currency</label>
                    <Select 
                      value={editedHeader.currency} 
                      onValueChange={(v) => setEditedHeader(prev => ({ ...prev, currency: v }))}
                    >
                      <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0B1221] border-vault-gold/30">
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
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
                <div className="flex-1 min-w-0">
                  {/* Badges row - status first, then type */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge className={`${status.color} border text-xs`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {status.label}
                    </Badge>
                    <Badge className="bg-vault-dark/50 text-vault-muted border border-vault-gold/20 text-xs">
                      {typeConfig.label}
                    </Badge>
                  </div>
                  
                  {/* Title */}
                  <h1 className="text-xl sm:text-2xl font-heading text-white break-words">{distribution.title}</h1>
                  
                  {/* RM-ID */}
                  {distribution.rm_id && (
                    <span className="text-xs font-mono text-vault-muted">
                      {distribution.rm_id}
                    </span>
                  )}
                  
                  {/* Amount */}
                  <div className="text-2xl font-heading text-emerald-400 mt-2">
                    {formatCurrency(distribution.total_amount, distribution.currency)}
                    <span className="text-sm text-vault-muted ml-2">total</span>
                  </div>
                  
                  {/* Details row */}
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-vault-muted">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{distribution.recipients?.length || 0} recipients</span>
                    </div>
                    {distribution.scheduled_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(distribution.scheduled_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Action buttons - properly aligned */}
            {!editingHeader && (
              <div className="flex items-center gap-2 justify-end mt-4">
                {!isFinalized && (
                  <Button variant="outline" size="sm" onClick={() => setShowFinalizeConfirm(true)} className="border-vault-gold/30 text-vault-gold hover:bg-vault-gold/10">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Finalize
                  </Button>
                )}
                  
                  {isFinalized && !distribution.amended_by_id && (
                    <Button variant="outline" size="sm" onClick={() => setShowAmendmentStudio(true)} className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
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
                      {isDraft && (
                        <>
                          <DropdownMenuItem onClick={() => setEditingHeader(true)} className="text-white hover:bg-vault-gold/20">
                            <PencilSimple className="w-4 h-4 mr-2" />
                            Edit Details
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
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* Recipients Section */}
      <motion.div variants={fadeInUp} className="mb-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-vault-gold" />
              Recipients
            </h2>
            {isDraft && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddRecipient(true)}
                className="border-vault-gold/30 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Recipient
              </Button>
            )}
          </div>
          
          {!distribution.recipients?.length ? (
            <div className="text-center py-8 text-vault-muted">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No recipients added yet</p>
              {isDraft && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddRecipient(true)}
                  className="mt-4 border-vault-gold/30 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Recipient
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {distribution.recipients.map((recipient, idx) => (
                <div
                  key={recipient.recipient_id || idx}
                  className="flex items-center justify-between p-4 bg-vault-dark/30 rounded-lg border border-vault-gold/10"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-vault-gold/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-vault-gold" />
                    </div>
                    <div>
                      <div className="font-medium text-white">{recipient.name}</div>
                      <div className="text-sm text-vault-muted capitalize">{recipient.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-heading text-emerald-400">
                        {formatCurrency(recipient.amount, distribution.currency)}
                      </div>
                      {recipient.share_percentage > 0 && (
                        <div className="text-xs text-vault-muted">
                          {recipient.share_percentage}% share
                        </div>
                      )}
                    </div>
                    <Badge className={
                      recipient.status === 'paid' 
                        ? 'bg-emerald-500/30 text-emerald-400 border-emerald-400/30'
                        : 'bg-slate-500/30 text-slate-300 border-slate-400/30'
                    }>
                      {recipient.status}
                    </Badge>
                    {isDraft && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRecipient(recipient.recipient_id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
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

      {/* Approvals Section */}
      {distribution.requires_approval && (distribution.approvals?.length > 0 || isPendingApproval) && (
        <motion.div variants={fadeInUp} className="mb-6">
          <GlassCard className="p-6">
            <h2 className="text-xl font-heading text-white flex items-center gap-2 mb-4">
              <Seal className="w-5 h-5 text-vault-gold" />
              Approvals ({distribution.approvals?.length || 0}/{distribution.approval_threshold || 1})
            </h2>
            
            {!distribution.approvals?.length ? (
              <div className="text-center py-4 text-vault-muted">
                <p>Awaiting approvals...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {distribution.approvals.map((approval, idx) => (
                  <div
                    key={approval.approval_id || idx}
                    className="flex items-center justify-between p-4 bg-vault-dark/30 rounded-lg border border-vault-gold/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <div className="font-medium text-white">{approval.approver_name}</div>
                        <div className="text-sm text-vault-muted capitalize">{approval.approver_role}</div>
                      </div>
                    </div>
                    <div className="text-sm text-vault-muted">
                      {approval.approved_at && new Date(approval.approved_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      )}

      {/* Add Recipient Dialog */}
      <Dialog open={showAddRecipient} onOpenChange={setShowAddRecipient}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading text-vault-gold">Add Recipient</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Select Beneficiary *</label>
              {parties.length > 0 ? (
                <Select 
                  value={newRecipient.name} 
                  onValueChange={(v) => {
                    const selectedParty = parties.find(p => p.name === v);
                    setNewRecipient(prev => ({ 
                      ...prev, 
                      name: v,
                      role: selectedParty?.role || 'beneficiary',
                      party_id: selectedParty?.party_id || null
                    }));
                  }}
                >
                  <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                    <SelectValue placeholder="Choose a beneficiary..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                    {/* Deduplicate parties by name - show each person only once */}
                    {parties
                      .filter((party, index, self) => 
                        index === self.findIndex(p => p.name === party.name)
                      )
                      .map(party => (
                        <SelectItem 
                          key={party.party_id || party.name} 
                          value={party.name} 
                          className="text-white hover:bg-vault-gold/20"
                        >
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-vault-muted" />
                            <span>{party.name}</span>
                            <span className="text-xs text-vault-muted">({party.role || 'party'})</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm text-vault-muted p-3 bg-vault-dark/50 rounded-lg border border-vault-gold/10">
                  No parties found. Add beneficiaries to this trust first.
                </div>
              )}
            </div>
            
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Role</label>
              <Select 
                value={newRecipient.role} 
                onValueChange={(v) => setNewRecipient(prev => ({ ...prev, role: v }))}
              >
                <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                  {roleOptions.map(r => (
                    <SelectItem key={r.value} value={r.value} className="text-white hover:bg-vault-gold/20">
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Amount</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newRecipient.amount}
                  onChange={(e) => setNewRecipient(prev => ({ ...prev, amount: e.target.value }))}
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Share %</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newRecipient.share_percentage}
                  onChange={(e) => setNewRecipient(prev => ({ ...prev, share_percentage: e.target.value }))}
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Payment Method</label>
              <Select 
                value={newRecipient.payment_method} 
                onValueChange={(v) => setNewRecipient(prev => ({ ...prev, payment_method: v }))}
              >
                <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                  <SelectItem value="check" className="text-white hover:bg-vault-gold/20">Check</SelectItem>
                  <SelectItem value="wire" className="text-white hover:bg-vault-gold/20">Wire Transfer</SelectItem>
                  <SelectItem value="ach" className="text-white hover:bg-vault-gold/20">ACH</SelectItem>
                  <SelectItem value="in_kind" className="text-white hover:bg-vault-gold/20">In-Kind</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRecipient(false)} className="border-vault-gold/30">
              Cancel
            </Button>
            <Button 
              onClick={handleAddRecipient} 
              disabled={!newRecipient.name.trim() || parties.length === 0} 
              className="bg-vault-gold text-vault-dark"
            >
              Add Recipient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit for Approval Dialog */}
      <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading text-vault-gold">Submit for Approval</DialogTitle>
            <DialogDescription className="text-vault-muted">
              This will submit the distribution for trustee approval.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmit(false)} className="border-vault-gold/30">
              Cancel
            </Button>
            <Button onClick={handleSubmitForApproval} className="bg-vault-gold text-vault-dark">
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApprove} onOpenChange={setShowApprove}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading text-emerald-400">Approve Distribution</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Your name"
              id="approver-name"
              className="bg-[#05080F] border-vault-gold/20 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprove(false)} className="border-vault-gold/30">
              Cancel
            </Button>
            <Button 
              onClick={() => handleApprove(document.getElementById('approver-name')?.value || 'Trustee')} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execute Dialog */}
      <Dialog open={showExecute} onOpenChange={setShowExecute}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading text-purple-400">Execute Distribution</DialogTitle>
            <DialogDescription className="text-vault-muted">
              This will mark the distribution as executed and all recipients as paid.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExecute(false)} className="border-vault-gold/30">
              Cancel
            </Button>
            <Button onClick={handleExecute} className="bg-purple-600 hover:bg-purple-500 text-white">
              Execute Distribution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading text-red-400 flex items-center gap-2">
              <Trash className="w-5 h-5" />
              Delete Distribution
            </DialogTitle>
            <DialogDescription className="text-vault-muted">
              This action cannot be undone. Are you sure you want to delete this distribution?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-300">
                <strong>{distribution?.title}</strong> and all its recipients will be permanently deleted.
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
                  Delete Distribution
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
              <CheckCircle className="w-5 h-5" />
              Finalize Distribution
            </DialogTitle>
            <DialogDescription className="text-vault-muted">
              Once finalized, this distribution record will be permanent and can only be amended.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="p-4 bg-vault-gold/10 border border-vault-gold/30 rounded-lg">
              <p className="text-sm text-vault-gold">
                <strong>{distribution?.title}</strong> will be finalized. Make sure all details are correct before proceeding.
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
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Finalize
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
        recordTitle={distribution?.title || 'Distribution'}
        currentVersion={distribution?.revision || 1}
        moduleType="distribution"
        onCreateAmendment={handleAmendV2}
        isLoading={amendLoading}
      />
    </motion.div>
  );
}
