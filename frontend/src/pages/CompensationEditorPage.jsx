import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  ArrowLeft,
  Calendar,
  CaretDown,
  Check,
  CurrencyDollar,
  DotsThreeVertical,
  Download,
  FileText,
  House,
  Lock,
  PencilSimple,
  Plus,
  PlusCircle,
  Timer,
  Trash,
  User,
  Users,
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
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 }
};

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-500/20 text-gray-400 border-gray-400/30' },
  pending_approval: { label: 'Pending Approval', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30' },
  approved: { label: 'Approved', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30' },
  paid: { label: 'Paid', color: 'bg-blue-500/20 text-blue-400 border-blue-400/30' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400 border-red-400/30' },
};

const typeLabels = {
  annual_fee: 'Annual Fee',
  transaction_fee: 'Transaction Fee',
  hourly: 'Hourly Rate',
  special: 'Special Compensation',
  reimbursement: 'Reimbursement',
};

export default function CompensationEditorPage({ user }) {
  const navigate = useNavigate();
  const { compensationId } = useParams();
  
  const [compensation, setCompensation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Editing states
  const [editingHeader, setEditingHeader] = useState(false);
  const [editedHeader, setEditedHeader] = useState({});
  
  // Dialogs
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const fetchCompensation = useCallback(async () => {
    if (!compensationId) {
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(`${API}/governance/compensation/${compensationId}`);
      const data = res.data;
      setCompensation(data.item || data);
    } catch (error) {
      // Only show error if it's not a cancel/unmount
      if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
        console.error('Failed to fetch compensation:', error);
        toast.error('Failed to load compensation details');
      }
    } finally {
      setLoading(false);
    }
  }, [compensationId]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) {
        await fetchCompensation();
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [fetchCompensation]);

  const refetchCompensation = async () => {
    try {
      const res = await axios.get(`${API}/governance/compensation/${compensationId}`);
      const data = res.data;
      setCompensation(data.item || data);
    } catch (error) {
      console.error('Failed to refetch compensation:', error);
    }
  };

  const saveCompensation = async (updates) => {
    setSaving(true);
    try {
      await axios.put(`${API}/governance/compensation/${compensationId}`, updates);
      await refetchCompensation();
      toast.success('Compensation updated');
      setEditingHeader(false);
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHeader = () => {
    saveCompensation(editedHeader);
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      await axios.post(`${API}/governance/compensation/${compensationId}/finalize`, {});
      await refetchCompensation();
      setShowFinalizeConfirm(false);
      toast.success('Compensation entry finalized and locked');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to finalize');
    } finally {
      setFinalizing(false);
    }
  };

  const handleAmend = async () => {
    try {
      const res = await axios.post(`${API}/governance/compensation/${compensationId}/amend`, {});
      const data = res.data;
      const amendmentData = data.item || data;
      toast.success('Amendment created');
      navigate(`/vault/governance/compensation/${amendmentData.compensation_id}`);
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to create amendment');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API}/governance/compensation/${compensationId}`);
      toast.success('Compensation entry deleted successfully');
      navigate('/vault/governance?tab=compensation');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete');
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

  if (!compensation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-vault-muted mb-4">Compensation entry not found</p>
        <Button onClick={() => navigate('/vault/governance?tab=compensation')}>
          Return to Governance
        </Button>
      </div>
    );
  }

  const status = statusConfig[compensation.status] || statusConfig.draft;
  const isLocked = compensation.locked;
  const isDraft = compensation.status === 'draft' && !isLocked;

  return (
    <div className="min-h-screen pb-24">
      <PageHeader 
        title="Compensation Details"
        breadcrumbs={[
          { label: 'Vault', href: '/vault' },
          { label: 'Governance', href: '/vault/governance?tab=compensation' },
          { label: 'Compensation' },
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header Card */}
        <motion.div {...fadeInUp} className="mb-6">
          <GlassCard className="p-4 sm:p-6">
            {editingHeader ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-vault-muted mb-1 block">Title</label>
                  <Input
                    value={editedHeader.title || ''}
                    onChange={(e) => setEditedHeader(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Compensation title"
                    className="bg-vault-dark/50 border-vault-gold/20 text-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-vault-muted mb-1 block">Recipient</label>
                    <Input
                      value={editedHeader.recipient_name || ''}
                      onChange={(e) => setEditedHeader(prev => ({ ...prev, recipient_name: e.target.value }))}
                      placeholder="Recipient name"
                      className="bg-vault-dark/50 border-vault-gold/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-vault-muted mb-1 block">Role</label>
                    <Select 
                      value={editedHeader.recipient_role || 'trustee'} 
                      onValueChange={(v) => setEditedHeader(prev => ({ ...prev, recipient_role: v }))}
                    >
                      <SelectTrigger className="bg-vault-dark/50 border-vault-gold/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                        <SelectItem value="trustee">Trustee</SelectItem>
                        <SelectItem value="co_trustee">Co-Trustee</SelectItem>
                        <SelectItem value="advisor">Advisor</SelectItem>
                        <SelectItem value="counsel">Counsel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-vault-muted mb-1 block">Compensation Type</label>
                    <Select 
                      value={editedHeader.compensation_type || 'annual_fee'} 
                      onValueChange={(v) => setEditedHeader(prev => ({ ...prev, compensation_type: v }))}
                    >
                      <SelectTrigger className="bg-vault-dark/50 border-vault-gold/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                        <SelectItem value="annual_fee">Annual Fee</SelectItem>
                        <SelectItem value="transaction_fee">Transaction Fee</SelectItem>
                        <SelectItem value="hourly">Hourly Rate</SelectItem>
                        <SelectItem value="special">Special Compensation</SelectItem>
                        <SelectItem value="reimbursement">Reimbursement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-vault-muted mb-1 block">Amount</label>
                    <Input
                      type="number"
                      value={editedHeader.amount || ''}
                      onChange={(e) => setEditedHeader(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      className="bg-vault-dark/50 border-vault-gold/20 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-vault-muted mb-1 block">Description</label>
                  <Textarea
                    value={editedHeader.description || ''}
                    onChange={(e) => setEditedHeader(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Details about this compensation..."
                    className="bg-vault-dark/50 border-vault-gold/20 text-white min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-vault-muted mb-1 block">Period Start</label>
                    <Input
                      type="date"
                      value={editedHeader.period_start || ''}
                      onChange={(e) => setEditedHeader(prev => ({ ...prev, period_start: e.target.value }))}
                      className="bg-vault-dark/50 border-vault-gold/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-vault-muted mb-1 block">Period End</label>
                    <Input
                      type="date"
                      value={editedHeader.period_end || ''}
                      onChange={(e) => setEditedHeader(prev => ({ ...prev, period_end: e.target.value }))}
                      className="bg-vault-dark/50 border-vault-gold/20 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-vault-muted mb-1 block">Basis of Calculation</label>
                  <Textarea
                    value={editedHeader.basis_of_calculation || ''}
                    onChange={(e) => setEditedHeader(prev => ({ ...prev, basis_of_calculation: e.target.value }))}
                    placeholder="How was this compensation calculated?"
                    className="bg-vault-dark/50 border-vault-gold/20 text-white min-h-[60px]"
                  />
                </div>

                <div>
                  <label className="text-sm text-vault-muted mb-1 block">Notes</label>
                  <Textarea
                    value={editedHeader.notes || ''}
                    onChange={(e) => setEditedHeader(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes..."
                    className="bg-vault-dark/50 border-vault-gold/20 text-white min-h-[60px]"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleSaveHeader} disabled={saving} className="bg-vault-gold text-vault-dark">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditingHeader(false)} className="border-vault-gold/30">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <CurrencyDollar className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-lg sm:text-xl font-heading text-white truncate">
                        {compensation.title || 'Compensation Entry'}
                      </h1>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {compensation.rm_id && (
                          <span className="text-xs font-mono text-vault-gold bg-vault-gold/10 px-2 py-0.5 rounded">
                            {compensation.rm_id}
                          </span>
                        )}
                        <Badge className={`text-xs ${status.color} border`}>
                          {status.label}
                        </Badge>
                        {isLocked && (
                          <Badge className="text-xs bg-vault-gold/20 text-vault-gold border border-vault-gold/30">
                            <Lock className="w-3 h-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amount Display */}
                <div className="text-2xl sm:text-3xl font-heading text-emerald-400 mb-4">
                  {formatCurrency(compensation.amount, compensation.currency)}
                  <span className="text-sm text-vault-muted ml-2">
                    {typeLabels[compensation.compensation_type] || compensation.compensation_type}
                  </span>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-vault-muted">
                    <User className="w-4 h-4" />
                    <span>{compensation.recipient_name}</span>
                    <span className="text-xs bg-vault-gold/10 px-2 py-0.5 rounded">
                      {compensation.recipient_role}
                    </span>
                  </div>
                  {compensation.period_start && compensation.period_end && (
                    <div className="flex items-center gap-2 text-sm text-vault-muted">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(compensation.period_start).toLocaleDateString()} - {new Date(compensation.period_end).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {compensation.description && (
                  <div className="mb-4 p-3 bg-vault-dark/30 rounded-lg">
                    <p className="text-sm text-vault-muted">{compensation.description}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {!isLocked && (
                    <Button onClick={() => setShowFinalizeConfirm(true)} variant="outline" className="border-vault-gold/30 text-vault-gold hover:bg-vault-gold/10">
                      <Lock className="w-4 h-4 mr-2" />
                      Finalize
                    </Button>
                  )}
                  
                  {isLocked && !compensation.amended_by_id && (
                    <Button onClick={handleAmend} variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
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
                          <DropdownMenuItem onClick={() => {
                            setEditedHeader({
                              title: compensation.title,
                              recipient_name: compensation.recipient_name,
                              recipient_role: compensation.recipient_role,
                              compensation_type: compensation.compensation_type,
                              amount: compensation.amount,
                              description: compensation.description,
                              period_start: compensation.period_start,
                              period_end: compensation.period_end,
                              basis_of_calculation: compensation.basis_of_calculation,
                              notes: compensation.notes,
                            });
                            setEditingHeader(true);
                          }} className="text-white hover:bg-vault-gold/20">
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
                      {isDraft && (
                        <>
                          <DropdownMenuSeparator className="bg-vault-gold/20" />
                          <DropdownMenuItem 
                            onClick={() => setShowDeleteConfirm(true)} 
                            className="text-red-400 hover:bg-red-500/20 hover:text-red-300"
                          >
                            <Trash className="w-4 h-4 mr-2" />
                            Delete Entry
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}
          </GlassCard>
        </motion.div>

        {/* Reasonableness Documentation */}
        <motion.div {...fadeInUp} className="mb-6">
          <GlassCard className="p-4 sm:p-6">
            <h2 className="text-lg font-heading text-vault-gold mb-4">Reasonableness Documentation</h2>
            
            <div className="space-y-4">
              {compensation.basis_of_calculation && (
                <div>
                  <h3 className="text-sm text-vault-muted mb-1">Basis of Calculation</h3>
                  <p className="text-white">{compensation.basis_of_calculation}</p>
                </div>
              )}
              
              {compensation.trust_assets_value > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm text-vault-muted mb-1">Trust Assets Value</h3>
                    <p className="text-white">{formatCurrency(compensation.trust_assets_value)}</p>
                  </div>
                  {compensation.fee_percentage > 0 && (
                    <div>
                      <h3 className="text-sm text-vault-muted mb-1">Fee Percentage</h3>
                      <p className="text-white">{compensation.fee_percentage}%</p>
                    </div>
                  )}
                </div>
              )}
              
              {compensation.hours_worked > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm text-vault-muted mb-1">Hours Worked</h3>
                    <p className="text-white">{compensation.hours_worked} hours</p>
                  </div>
                  {compensation.hourly_rate > 0 && (
                    <div>
                      <h3 className="text-sm text-vault-muted mb-1">Hourly Rate</h3>
                      <p className="text-white">{formatCurrency(compensation.hourly_rate)}/hr</p>
                    </div>
                  )}
                </div>
              )}
              
              {compensation.comparable_fees && (
                <div>
                  <h3 className="text-sm text-vault-muted mb-1">Market Comparison</h3>
                  <p className="text-white">{compensation.comparable_fees}</p>
                </div>
              )}
              
              {compensation.notes && (
                <div>
                  <h3 className="text-sm text-vault-muted mb-1">Notes</h3>
                  <p className="text-white">{compensation.notes}</p>
                </div>
              )}
              
              {!compensation.basis_of_calculation && !compensation.notes && compensation.trust_assets_value <= 0 && compensation.hours_worked <= 0 && (
                <p className="text-vault-muted text-center py-4">
                  No reasonableness documentation recorded yet.
                  {isDraft && ' Click Edit Details to add documentation.'}
                </p>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Navigation */}
        <motion.div {...fadeInUp}>
          <GlassCard className="p-4">
            <Link to="/vault/governance?tab=compensation" className="flex items-center gap-2 text-vault-gold hover:text-vault-gold/80">
              <ArrowLeft className="w-4 h-4" />
              Back to Compensation Records
            </Link>
          </GlassCard>
        </motion.div>
      </div>

      {/* Finalize Confirmation Dialog */}
      <Dialog open={showFinalizeConfirm} onOpenChange={setShowFinalizeConfirm}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading text-vault-gold flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Finalize Compensation Entry
            </DialogTitle>
            <DialogDescription className="text-vault-muted">
              Once finalized, this entry cannot be edited. You can only create amendments.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="p-4 bg-vault-gold/10 border border-vault-gold/30 rounded-lg">
              <p className="text-sm text-vault-gold">
                This will lock the compensation entry for <strong>{compensation?.recipient_name}</strong> 
                for {formatCurrency(compensation?.amount)} and prevent further edits.
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
              className="bg-vault-gold text-vault-dark"
              disabled={finalizing}
            >
              {finalizing ? 'Finalizing...' : 'Finalize Entry'}
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
              Delete Compensation Entry
            </DialogTitle>
            <DialogDescription className="text-vault-muted">
              This action cannot be undone. Are you sure you want to delete this entry?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-300">
                <strong>{compensation?.title}</strong> for {formatCurrency(compensation?.amount)} will be permanently deleted.
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
              className="bg-red-600 hover:bg-red-500 text-white"
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
