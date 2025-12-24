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
  draft: { label: 'Draft', color: 'bg-slate-500/30 text-slate-300 border-slate-400/30', icon: PencilSimple },
  pending_approval: { label: 'Pending Approval', color: 'bg-amber-500/30 text-amber-400 border-amber-400/30', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-500/30 text-blue-400 border-blue-400/30', icon: Check },
  in_progress: { label: 'In Progress', color: 'bg-purple-500/30 text-purple-400 border-purple-400/30', icon: Clock },
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
        const res = await axios.get(`${API}/governance/distributions/${distributionId}`, {
          signal: abortController.signal
        });
        
        if (!isMounted) return;
        
        const data = res.data;
        const distData = data.item || data;
        
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
            if (partiesError?.name !== 'CanceledError') {
              console.warn('Failed to fetch parties:', partiesError);
            }
          }
        }
      } catch (error) {
        if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
          return;
        }
        console.error('Failed to fetch distribution:', error);
        if (isMounted) {
          toast.error('Failed to load distribution details');
          navigate('/vault/governance');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDistribution();
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [distributionId, navigate]);

  const refetchDistribution = async () => {
    if (!distributionId) return;
    
    try {
      const res = await axios.get(`${API}/governance/distributions/${distributionId}`);
      const data = res.data;
      const distData = data.item || data;
      
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

  const saveDistribution = async (updates) => {
    setSaving(true);
    try {
      await axios.put(`${API}/governance/distributions/${distributionId}`, updates);
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
      await axios.post(`${API}/governance/distributions/${distributionId}/submit`);
      await refetchDistribution();
      setShowSubmit(false);
      toast.success('Distribution submitted for approval');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to submit');
    }
  };

  const handleApprove = async (approverName) => {
    try {
      await axios.post(`${API}/governance/distributions/${distributionId}/approve`, {
        approver_name: approverName,
        approver_role: 'trustee',
      });
      await refetchDistribution();
      setShowApprove(false);
      toast.success('Approval added');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to approve');
    }
  };

  const handleExecute = async () => {
    try {
      await axios.post(`${API}/governance/distributions/${distributionId}/execute`, {});
      await refetchDistribution();
      setShowExecute(false);
      toast.success('Distribution executed');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to execute');
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
  const status = statusConfig[distribution.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const isLocked = distribution.locked === true || distribution.locked_at !== null;
  const isDraft = distribution.status === 'draft' && !isLocked;
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
        <GlassCard className="p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            {/* Left side - Info */}
            <div className="flex items-start gap-4">
              <div className={`p-4 rounded-xl ${typeConfig.bg}`}>
                <TypeIcon className={`w-8 h-8 ${typeConfig.color}`} />
              </div>
              
              {editingHeader && isDraft ? (
                <div className="flex-1 space-y-4">
                  <Input
                    value={editedHeader.title}
                    onChange={(e) => setEditedHeader(prev => ({ ...prev, title: e.target.value }))}
                    className="text-2xl font-heading bg-[#05080F] border-vault-gold/20 text-white"
                  />
                  <div className="grid grid-cols-2 gap-4">
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
                    <Button
                      onClick={handleSaveHeader}
                      disabled={saving}
                      className="bg-vault-gold text-vault-dark"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditingHeader(false)}
                      className="border-vault-gold/30"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge className={`${status.color} border`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {status.label}
                    </Badge>
                    {isLocked && (
                      <Badge className="bg-vault-gold/20 text-vault-gold border border-vault-gold/30">
                        <Lock className="w-3 h-3 mr-1" />
                        Locked
                      </Badge>
                    )}
                    <Badge className="bg-vault-dark/50 text-vault-muted border border-vault-gold/20">
                      {typeConfig.label}
                    </Badge>
                  </div>
                  <h1 className="text-2xl font-heading text-white mt-2">{distribution.title}</h1>
                  {distribution.rm_id && (
                    <span className="text-sm font-mono text-vault-muted">
                      {distribution.rm_id}
                    </span>
                  )}
                  <div className="text-3xl font-heading text-emerald-400 mt-2">
                    {formatCurrency(distribution.total_amount, distribution.currency)}
                  </div>
                  <div className="text-sm text-vault-muted">
                    {distribution.asset_type || 'Cash'} • {distribution.recipients?.length || 0} recipients
                  </div>
                </div>
              )}
            </div>
            
            {/* Right side - Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {isLocked && (
                <Badge className="bg-vault-gold/20 text-vault-gold border border-vault-gold/30 gap-1">
                  <Lock className="w-3 h-3" />
                  Read-Only
                </Badge>
              )}
              
              {isDraft && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setEditingHeader(true)}
                    className="border-vault-gold/30 text-white"
                  >
                    <PencilSimple className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => setShowSubmit(true)}
                    className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark"
                    disabled={!distribution.recipients?.length}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Submit
                  </Button>
                </>
              )}
              
              {isPendingApproval && (
                <Button
                  onClick={() => setShowApprove(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Seal className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              )}
              
              {isApproved && (
                <Button
                  onClick={() => setShowExecute(true)}
                  className="bg-purple-600 hover:bg-purple-500 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Execute
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-vault-gold/30">
                    <DotsThreeVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                  <DropdownMenuItem className="text-vault-muted hover:bg-vault-gold/20">
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
              <label className="text-sm text-vault-muted mb-1 block">Name *</label>
              <Input
                placeholder="Recipient name"
                value={newRecipient.name}
                onChange={(e) => setNewRecipient(prev => ({ ...prev, name: e.target.value }))}
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
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
            <Button onClick={handleAddRecipient} disabled={!newRecipient.name.trim()} className="bg-vault-gold text-vault-dark">
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
    </motion.div>
  );
}
