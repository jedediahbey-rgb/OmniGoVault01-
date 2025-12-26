import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import MonoChip from '../components/shared/MonoChip';
import {
  ArrowLeft,
  Calendar,
  CaretDown,
  Check,
  CheckCircle,
  Clock,
  CurrencyDollar,
  DotsThreeVertical,
  Download,
  FileText,
  House,
  PencilSimple,
  Plus,
  PlusCircle,
  ShieldCheck,
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
import { staggerContainer, fadeInUp } from '../lib/motion';
import { toast } from 'sonner';
import { AmendmentStudio, RevisionHistory } from '../components/governance';
import { FinalizeConfirmationModal } from '../components/governance/FinalizeConfirmationModal';
import IntegritySealBadge from '../components/shared/IntegritySealBadge';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Insurance type config
const insuranceTypeConfig = {
  whole_life: { icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Whole Life' },
  term: { icon: Timer, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Term Life' },
  universal: { icon: CurrencyDollar, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Universal Life' },
  variable: { icon: House, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Variable Life' },
  group: { icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: 'Group Life' },
};

// Policy state badges (only shown when lifecycle is FINALIZED)
const policyStateBadgeConfig = {
  pending: { label: 'Pending', color: 'bg-slate-500/30 text-slate-300 border-slate-400/30', icon: Timer },
  active: { label: 'Active', color: 'bg-emerald-500/30 text-emerald-400 border-emerald-400/30', icon: Check },
  lapsed: { label: 'Lapsed', color: 'bg-red-500/30 text-red-400 border-red-400/30', icon: X },
  paid_up: { label: 'Paid Up', color: 'bg-vault-gold/30 text-vault-gold border-vault-gold/30', icon: Check },
  surrendered: { label: 'Surrendered', color: 'bg-slate-500/30 text-slate-300 border-slate-400/30', icon: X },
  claimed: { label: 'Claimed', color: 'bg-purple-500/30 text-purple-400 border-purple-400/30', icon: Check },
  expired: { label: 'Expired', color: 'bg-amber-500/30 text-amber-400 border-amber-400/30', icon: X },
};

/**
 * Derived Insurance Badge Logic:
 * - If lifecycle status !== "finalized" => show "Draft" badge only
 * - Only when status === "finalized" may we show policyState badges
 */
function getInsuranceBadge(policy) {
  const lifecycleStatus = policy?.status; // "draft" | "finalized" | "voided"
  const policyState = policy?.policy_state || "pending";

  // Draft records must NEVER display "Active" or any operational state
  if (lifecycleStatus !== "finalized") {
    return { label: 'Draft', color: 'bg-amber-500/20 text-amber-400 border-amber-400/30', icon: PencilSimple };
  }

  // Finalized records - show the policy state
  const stateConfig = policyStateBadgeConfig[policyState];
  if (stateConfig) {
    return stateConfig;
  }

  return { label: policyState || 'Pending', color: 'bg-slate-500/30 text-slate-300 border-slate-400/30', icon: Timer };
}

export default function InsuranceEditorPage({ user }) {
  const { policyId } = useParams();
  const navigate = useNavigate();
  
  const [policy, setPolicy] = useState(null);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Edit states
  const [editingHeader, setEditingHeader] = useState(false);
  const [editedHeader, setEditedHeader] = useState({});
  
  // Dialogs
  const [showAddBeneficiary, setShowAddBeneficiary] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  
  // Amendment Studio V2
  const [showAmendmentStudio, setShowAmendmentStudio] = useState(false);
  const [showRevisionHistory, setShowRevisionHistory] = useState(false);
  const [revisions, setRevisions] = useState([]);
  const [amendLoading, setAmendLoading] = useState(false);
  
  // New beneficiary
  const [newBeneficiary, setNewBeneficiary] = useState({
    name: '',
    relationship: '',
    percentage: '',
    beneficiary_type: 'primary',
    notes: ''
  });
  
  // New payment
  const [newPayment, setNewPayment] = useState({
    payment_date: new Date().toISOString().slice(0, 10),
    amount: '',
    payment_method: 'check',
    confirmation_number: '',
    notes: ''
  });

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchPolicy = async () => {
      try {
        // Use V2 API for insurance policy
        const res = await axios.get(`${API}/governance/v2/records/${policyId}`, {
          signal: abortController.signal
        });
        
        if (!isMounted) return;
        
        const data = res.data;
        if (!data.ok || !data.data?.record) {
          throw new Error(data.error?.message || 'Failed to load policy');
        }
        
        const record = data.data.record;
        const revision = data.data.current_revision;
        const payload = revision?.payload_json || {};
        
        // Transform V2 record to expected policy format
        const policyData = {
          id: record.id,
          policy_id: record.id,
          title: record.title,
          rm_id: record.rm_id,
          status: record.status, // Keep lifecycle status as-is
          policy_state: payload.policy_state || 'pending', // Policy operational state
          locked: record.status === 'finalized',
          portfolio_id: record.portfolio_id,
          created_at: record.created_at,
          finalized_at: record.finalized_at,
          // Extract from payload
          policy_type: payload.policy_type || 'whole_life',
          policy_number: payload.policy_number || '',
          carrier_name: payload.carrier_name || payload.insurer || '',
          insured_name: payload.insured_name || '',
          death_benefit: payload.death_benefit || payload.face_value || 0,
          cash_value: payload.cash_value || 0,
          currency: payload.currency || 'USD',
          premium_amount: payload.premium_amount || payload.premium || 0,
          premium_frequency: payload.premium_frequency || 'monthly',
          effective_date: payload.effective_date || '',
          beneficiaries: payload.beneficiaries || [],
          premium_due_date: payload.premium_due_date || '',
          lapse_risk: payload.lapse_risk || false,
          notes: payload.notes || '',
          // V2 specific fields
          current_version: revision?.version || 1,
          current_revision_id: record.current_revision_id
        };
        
        setPolicy(policyData);
        setEditedHeader({
          title: policyData.title,
          policy_type: policyData.policy_type,
          policy_number: policyData.policy_number,
          carrier_name: policyData.carrier_name,
          insured_name: policyData.insured_name,
          death_benefit: policyData.death_benefit,
          cash_value: policyData.cash_value,
          currency: policyData.currency,
          premium_amount: policyData.premium_amount,
          premium_frequency: policyData.premium_frequency,
          effective_date: policyData.effective_date?.slice(0, 10) || '',
          notes: policyData.notes,
        });
        
        // Fetch parties for beneficiary selection
        if (policyData.portfolio_id && isMounted) {
          try {
            const partiesRes = await axios.get(`${API}/portfolios/${policyData.portfolio_id}/parties`, {
              signal: abortController.signal
            });
            if (isMounted) {
              setParties(partiesRes.data || []);
            }
          } catch (partiesError) {
            if (partiesError?.name === 'CanceledError') return;
            console.warn('Failed to fetch parties:', partiesError);
          }
        }
      } catch (error) {
        // Silently ignore aborted requests (happens on navigation)
        if (!isMounted || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED' || abortController.signal.aborted) {
          return;
        }
        console.error('Failed to fetch insurance policy:', error);
        // Only show error if still mounted and not a cancellation
        if (isMounted && error?.response?.status !== 0) {
          toast.error('Failed to load insurance policy');
          navigate('/vault/governance?tab=insurance');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (policyId) {
      fetchPolicy();
    }
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [policyId, navigate]);

  // Refetch policy data
  const refetchPolicy = async () => {
    try {
      const res = await axios.get(`${API}/governance/v2/records/${policyId}`);
      const data = res.data;
      if (!data.ok || !data.data?.record) {
        throw new Error(data.error?.message || 'Failed to load policy');
      }
      
      const record = data.data.record;
      const revision = data.data.current_revision;
      const payload = revision?.payload_json || {};
      
      const policyData = {
        id: record.id,
        policy_id: record.id,
        title: record.title,
        rm_id: record.rm_id,
        status: record.status,
        policy_state: payload.policy_state || 'pending',
        locked: record.status === 'finalized',
        portfolio_id: record.portfolio_id,
        created_at: record.created_at,
        finalized_at: record.finalized_at,
        revision: revision?.version || 1,
        policy_type: payload.policy_type || 'whole_life',
        policy_number: payload.policy_number || '',
        carrier_name: payload.carrier_name || payload.insurer || '',
        insured_name: payload.insured_name || '',
        death_benefit: payload.death_benefit || payload.face_value || 0,
        cash_value: payload.cash_value || 0,
        currency: payload.currency || 'USD',
        premium_amount: payload.premium_amount || payload.premium || 0,
        premium_frequency: payload.premium_frequency || 'monthly',
        effective_date: payload.effective_date || '',
        beneficiaries: payload.beneficiaries || [],
        premium_due_date: payload.premium_due_date || '',
        lapse_risk: payload.lapse_risk || false,
        notes: payload.notes || '',
        current_version: revision?.version || 1,
        current_revision_id: record.current_revision_id
      };
      
      setPolicy(policyData);
      setEditedHeader({
        title: policyData.title,
        policy_type: policyData.policy_type,
        policy_number: policyData.policy_number,
        carrier_name: policyData.carrier_name,
        insured_name: policyData.insured_name,
        death_benefit: policyData.death_benefit,
        cash_value: policyData.cash_value,
        currency: policyData.currency,
        premium_amount: policyData.premium_amount,
        premium_frequency: policyData.premium_frequency,
        effective_date: policyData.effective_date?.slice(0, 10) || '',
        notes: policyData.notes,
      });
    } catch (error) {
      console.error('Failed to refetch policy:', error);
      toast.error('Failed to refresh policy data');
    }
  };

  // Save using V2 API
  const savePolicy = async (updates) => {
    setSaving(true);
    try {
      const payload = {
        policy_type: updates.policy_type !== undefined ? updates.policy_type : policy.policy_type,
        policy_number: updates.policy_number !== undefined ? updates.policy_number : policy.policy_number,
        carrier_name: updates.carrier_name !== undefined ? updates.carrier_name : policy.carrier_name,
        insured_name: updates.insured_name !== undefined ? updates.insured_name : policy.insured_name,
        death_benefit: updates.death_benefit !== undefined ? updates.death_benefit : policy.death_benefit,
        cash_value: updates.cash_value !== undefined ? updates.cash_value : policy.cash_value,
        currency: updates.currency || policy.currency,
        premium_amount: updates.premium_amount !== undefined ? updates.premium_amount : policy.premium_amount,
        premium_frequency: updates.premium_frequency || policy.premium_frequency,
        effective_date: updates.effective_date || policy.effective_date,
        beneficiaries: updates.beneficiaries !== undefined ? updates.beneficiaries : (policy.beneficiaries || []),
        premium_payments: updates.premium_payments !== undefined ? updates.premium_payments : (policy.premium_payments || []),
        premium_due_date: updates.premium_due_date || policy.premium_due_date,
        lapse_risk: updates.lapse_risk !== undefined ? updates.lapse_risk : policy.lapse_risk,
        policy_state: updates.policy_state || policy.policy_state,
        notes: updates.notes !== undefined ? updates.notes : policy.notes,
      };

      await axios.put(`${API}/governance/v2/records/${policyId}`, {
        title: updates.title || policy.title,
        payload_json: payload
      });

      await refetchPolicy();
      toast.success('Changes saved');
    } catch (error) {
      console.error('Failed to save:', error);
      if (error.response?.status === 409) {
        toast.error('This policy is finalized and cannot be edited.');
        await refetchPolicy();
      } else {
        toast.error(error.response?.data?.error?.message || 'Failed to save changes');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHeader = async () => {
    await savePolicy({
      title: editedHeader.title,
      policy_type: editedHeader.policy_type,
      policy_number: editedHeader.policy_number,
      carrier_name: editedHeader.carrier_name,
      insured_name: editedHeader.insured_name,
      death_benefit: parseFloat(editedHeader.death_benefit) || 0,
      cash_value: parseFloat(editedHeader.cash_value) || 0,
      currency: editedHeader.currency,
      premium_amount: parseFloat(editedHeader.premium_amount) || 0,
      premium_frequency: editedHeader.premium_frequency,
      effective_date: editedHeader.effective_date || null,
      notes: editedHeader.notes,
    });
    setEditingHeader(false);
  };

  const handleAddBeneficiary = async () => {
    if (!newBeneficiary.name.trim()) {
      toast.error('Please enter beneficiary name');
      return;
    }
    
    try {
      // Use V2 API - add beneficiary to array and save
      const beneficiaryWithId = {
        ...newBeneficiary,
        beneficiary_id: `ben-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        percentage: parseFloat(newBeneficiary.percentage) || 0,
        added_at: new Date().toISOString()
      };
      
      const updatedBeneficiaries = [...(policy.beneficiaries || []), beneficiaryWithId];
      await savePolicy({ beneficiaries: updatedBeneficiaries });
      
      setShowAddBeneficiary(false);
      setNewBeneficiary({
        name: '',
        relationship: '',
        percentage: '',
        beneficiary_type: 'primary',
        notes: ''
      });
      toast.success('Beneficiary added');
    } catch (error) {
      console.error('Failed to add beneficiary:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to add beneficiary');
    }
  };

  const handleRemoveBeneficiary = async (beneficiaryId) => {
    try {
      // Use V2 API - remove beneficiary from array and save
      const updatedBeneficiaries = (policy.beneficiaries || []).filter(b => b.beneficiary_id !== beneficiaryId);
      await savePolicy({ beneficiaries: updatedBeneficiaries });
      toast.success('Beneficiary removed');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to remove beneficiary');
    }
  };

  const handleAddPayment = async () => {
    if (!newPayment.amount) {
      toast.error('Please enter payment amount');
      return;
    }
    
    try {
      // Use V2 API - add payment to array and save
      const paymentWithId = {
        ...newPayment,
        payment_id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        amount: parseFloat(newPayment.amount) || 0,
        currency: policy.currency || 'USD',
        recorded_at: new Date().toISOString()
      };
      
      const updatedPayments = [...(policy.premium_payments || []), paymentWithId];
      await savePolicy({ premium_payments: updatedPayments });
      
      setShowAddPayment(false);
      setNewPayment({
        payment_date: new Date().toISOString().slice(0, 10),
        amount: '',
        payment_method: 'check',
        confirmation_number: '',
        notes: ''
      });
      toast.success('Payment recorded');
    } catch (error) {
      console.error('Failed to add payment:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to record payment');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.post(`${API}/governance/v2/records/${policyId}/void`, {
        void_reason: 'Deleted by user'
      });
      toast.success('Insurance policy deleted successfully');
      navigate('/vault/governance?tab=insurance');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete policy');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      await axios.post(`${API}/governance/v2/records/${policyId}/finalize`, {});
      // Refetch policy data with proper transformation
      const res = await axios.get(`${API}/governance/v2/records/${policyId}`);
      const data = res.data;
      if (data.ok && data.data?.record) {
        const record = data.data.record;
        const revision = data.data.current_revision;
        const payload = revision?.payload_json || {};
        
        // Update policy with finalized data
        setPolicy(prev => ({
          ...prev,
          status: record.status,
          policy_state: payload.policy_state || 'pending',
          locked: record.status === 'finalized',
          finalized_at: record.finalized_at
        }));
      }
      setShowFinalizeConfirm(false);
      toast.success('Insurance policy finalized');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to finalize policy');
    } finally {
      setFinalizing(false);
    }
  };

  // V2 Amendment Studio handler - uses unified V2 API
  const handleAmendV2 = async (amendData) => {
    setAmendLoading(true);
    try {
      const res = await axios.post(`${API}/governance/v2/records/${policyId}/amend`, {
        change_reason: amendData.change_reason,
        change_type: amendData.change_type || 'amendment',
        effective_at: amendData.effective_at
      });
      
      const data = res.data;
      if (data.ok) {
        toast.success('Amendment draft created - you can now edit the new version');
        setShowAmendmentStudio(false);
        // Refetch to show the new draft version
        await refetchPolicy();
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

  // Fetch revision history
  const fetchRevisions = async () => {
    try {
      const res = await axios.get(`${API}/governance/v2/records/${policyId}/revisions`);
      const data = res.data;
      if (data.ok && data.data?.revisions) {
        setRevisions(data.data.revisions);
      }
    } catch (error) {
      console.error('Failed to fetch revisions:', error);
    }
  };

  const handleViewRevision = (revision) => {
    // For now, just show revision info - can be enhanced to show full read-only view
    toast.info(`Viewing v${revision.version} - ${revision.change_type}`);
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen p-4 md:p-6 lg:p-8 w-full max-w-full overflow-x-hidden"
      >
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </motion.div>
    );
  }

  if (!policy) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen p-4 md:p-6 lg:p-8"
      >
        <GlassCard className="p-12 text-center">
          <ShieldCheck className="w-16 h-16 mx-auto text-vault-gold/50 mb-4" />
          <h3 className="text-xl font-heading text-white mb-2">Policy Not Found</h3>
          <p className="text-vault-muted mb-6">The insurance policy you are looking for does not exist.</p>
          <Link to="/vault/governance?tab=insurance">
            <Button className="bg-vault-gold text-vault-dark">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Insurance
            </Button>
          </Link>
        </GlassCard>
      </motion.div>
    );
  }

  const typeConfig = insuranceTypeConfig[policy.policy_type] || insuranceTypeConfig.whole_life;
  const TypeIcon = typeConfig.icon;
  
  // Status logic: Use derived badge - Draft until finalized
  const isDraft = policy.status === 'draft';
  const isFinalized = policy.status === 'finalized';
  // Use derived badge logic - Draft records NEVER show "Active"
  const badge = getInsuranceBadge(policy);
  const StatusIcon = badge.icon;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="min-h-screen p-4 md:p-6 lg:p-8 w-full max-w-full overflow-x-hidden"
    >
      {/* Back Navigation */}
      <motion.div variants={fadeInUp} className="mb-6">
        <div className="flex items-center gap-4">
          <Link to="/vault/governance?tab=insurance">
            <Button variant="ghost" size="sm" className="text-vault-muted hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Insurance
            </Button>
          </Link>
        </div>
        <PageHeader 
          title="Insurance Policy Details"
          subtitle="View and manage life insurance policy"
          icon={ShieldCheck}
        />
      </motion.div>

      {/* Policy Header Card */}
      <motion.div variants={fadeInUp} className="mb-6">
        <GlassCard className="p-4 sm:p-6 overflow-hidden">
          <div className="flex flex-col gap-4">
            {/* Top row - Icon, badges, status */}
            <div className="flex items-start gap-3 sm:gap-4">
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
                      <label className="text-xs text-vault-muted">Death Benefit</label>
                      <Input
                        type="number"
                        value={editedHeader.death_benefit}
                        onChange={(e) => setEditedHeader(prev => ({ ...prev, death_benefit: e.target.value }))}
                        className="bg-[#05080F] border-vault-gold/20 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-vault-muted">Cash Value</label>
                      <Input
                        type="number"
                        value={editedHeader.cash_value}
                        onChange={(e) => setEditedHeader(prev => ({ ...prev, cash_value: e.target.value }))}
                        className="bg-[#05080F] border-vault-gold/20 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-vault-muted">Premium</label>
                      <Input
                        type="number"
                        value={editedHeader.premium_amount}
                        onChange={(e) => setEditedHeader(prev => ({ ...prev, premium_amount: e.target.value }))}
                        className="bg-[#05080F] border-vault-gold/20 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-vault-muted">Carrier</label>
                      <Input
                        value={editedHeader.carrier_name}
                        onChange={(e) => setEditedHeader(prev => ({ ...prev, carrier_name: e.target.value }))}
                        className="bg-[#05080F] border-vault-gold/20 text-white"
                      />
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge className={`${badge.color} border`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {badge.label}
                    </Badge>
                    <Badge className="bg-vault-dark/50 text-vault-muted border border-vault-gold/20 hidden sm:flex">
                      {typeConfig.label}
                    </Badge>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-heading text-white mt-2 break-words">{policy.title}</h1>
                  {policy.rm_id && (
                    <MonoChip variant="muted" size="sm" className="break-all">
                      {policy.rm_id}
                    </MonoChip>
                  )}
                  <div className="text-2xl sm:text-3xl font-heading text-emerald-400 mt-2">
                    {formatCurrency(policy.death_benefit, policy.currency)}
                    <span className="text-sm text-vault-muted ml-2">death benefit</span>
                  </div>
                  <div className="text-sm text-vault-muted mt-1">
                    {policy.carrier_name || 'No carrier'} • Policy #{policy.policy_number || 'N/A'}
                  </div>
                </div>
              )}
            </div>
            
            {/* Actions - properly aligned */}
            {!editingHeader && (
              <div className="flex items-center gap-2 justify-end mt-4">
                {isDraft && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFinalizeConfirm(true)}
                    className="border-vault-gold/30 text-vault-gold hover:bg-vault-gold/10"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Finalize
                  </Button>
                )}
                
                {/* Revision History button - show if more than one version */}
                {policy.revision > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetchRevisions();
                      setShowRevisionHistory(true);
                    }}
                    className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    v{policy.revision}
                  </Button>
                )}
                
                {isFinalized && !policy.amended_by_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAmendmentStudio(true)}
                    className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                  >
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
          
          {/* Integrity Seal for finalized insurance policies */}
          {isFinalized && (
            <div className="mt-4 pt-4 border-t border-vault-gold/20">
              <IntegritySealBadge
                recordId={policy.id}
                sealId={policy.integrity_seal_id}
                sealedAt={policy.integrity_sealed_at}
                verifiedAt={policy.integrity_verified_at}
                status={policy.integrity_seal_id ? 'valid' : 'never_sealed'}
                isFinalized={true}
              />
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Policy Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Coverage Info */}
        <motion.div variants={fadeInUp}>
          <GlassCard className="p-6">
            <h3 className="text-lg font-heading text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-vault-gold" />
              Coverage Details
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-vault-muted">Death Benefit</span>
                <span className="text-white font-semibold">{formatCurrency(policy.death_benefit, policy.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-vault-muted">Cash Value</span>
                <span className="text-white">{formatCurrency(policy.cash_value, policy.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-vault-muted">Loan Balance</span>
                <span className="text-white">{formatCurrency(policy.loan_balance, policy.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-vault-muted">Insured</span>
                <span className="text-white">{policy.insured_name || 'Not specified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-vault-muted">Effective Date</span>
                <span className="text-white">{policy.effective_date ? new Date(policy.effective_date).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Premium Info */}
        <motion.div variants={fadeInUp}>
          <GlassCard className="p-6">
            <h3 className="text-lg font-heading text-white mb-4 flex items-center gap-2">
              <CurrencyDollar className="w-5 h-5 text-vault-gold" />
              Premium Information
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-vault-muted">Premium Amount</span>
                <span className="text-white font-semibold">{formatCurrency(policy.premium_amount, policy.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-vault-muted">Frequency</span>
                <span className="text-white capitalize">{policy.premium_frequency || 'Monthly'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-vault-muted">Due Date</span>
                <span className="text-white">{policy.premium_due_date || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-vault-muted">Payments Recorded</span>
                <span className="text-white">{policy.premium_payments?.length || 0}</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Beneficiaries */}
      <motion.div variants={fadeInUp} className="mb-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-heading text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-vault-gold" />
              Beneficiaries
            </h3>
            {isDraft && (
              <Button
                size="sm"
                onClick={() => setShowAddBeneficiary(true)}
                className="bg-vault-gold/20 text-vault-gold hover:bg-vault-gold/30"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            )}
          </div>
          
          {policy.beneficiaries?.length > 0 ? (
            <div className="space-y-3">
              {policy.beneficiaries.map((ben, idx) => (
                <div key={ben.beneficiary_id || idx} className="flex items-center justify-between p-3 bg-vault-dark/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-vault-gold/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-vault-gold" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{ben.name}</p>
                      <p className="text-xs text-vault-muted">{ben.relationship || 'Beneficiary'} • {ben.beneficiary_type}</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
                    {ben.percentage}%
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-vault-muted text-center py-8">No beneficiaries added yet</p>
          )}
        </GlassCard>
      </motion.div>

      {/* Premium Payments */}
      <motion.div variants={fadeInUp} className="mb-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-heading text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-vault-gold" />
              Premium Payments
            </h3>
            {isDraft && (
              <Button
                size="sm"
                onClick={() => setShowAddPayment(true)}
                className="bg-vault-gold/20 text-vault-gold hover:bg-vault-gold/30"
              >
                <Plus className="w-4 h-4 mr-1" />
                Record Payment
              </Button>
            )}
          </div>
          
          {policy.premium_payments?.length > 0 ? (
            <div className="space-y-3">
              {policy.premium_payments.map((payment, idx) => (
                <div key={payment.payment_id || idx} className="flex items-center justify-between p-3 bg-vault-dark/30 rounded-lg">
                  <div>
                    <p className="text-white">{new Date(payment.payment_date).toLocaleDateString()}</p>
                    <p className="text-xs text-vault-muted">{payment.payment_method} • {payment.confirmation_number || 'No ref'}</p>
                  </div>
                  <span className="text-emerald-400 font-semibold">
                    {formatCurrency(payment.amount, payment.currency || policy.currency)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-vault-muted text-center py-8">No payments recorded yet</p>
          )}
        </GlassCard>
      </motion.div>

      {/* Add Beneficiary Dialog */}
      <Dialog open={showAddBeneficiary} onOpenChange={setShowAddBeneficiary}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading text-vault-gold">Add Beneficiary</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Name *</label>
              {parties.length > 0 ? (
                <Select 
                  value={newBeneficiary.name} 
                  onValueChange={(v) => {
                    const party = parties.find(p => p.name === v);
                    setNewBeneficiary(prev => ({ 
                      ...prev, 
                      name: v,
                      relationship: party?.role || prev.relationship
                    }));
                  }}
                >
                  <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                    <SelectValue placeholder="Select beneficiary..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                    {parties
                      .filter((party, index, self) => index === self.findIndex(p => p.name === party.name))
                      .map(party => (
                        <SelectItem key={party.party_id || party.name} value={party.name}>
                          {party.name} ({party.role || 'party'})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={newBeneficiary.name}
                  onChange={(e) => setNewBeneficiary(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Beneficiary name"
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Percentage</label>
                <Input
                  type="number"
                  value={newBeneficiary.percentage}
                  onChange={(e) => setNewBeneficiary(prev => ({ ...prev, percentage: e.target.value }))}
                  placeholder="e.g., 50"
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Type</label>
                <Select 
                  value={newBeneficiary.beneficiary_type} 
                  onValueChange={(v) => setNewBeneficiary(prev => ({ ...prev, beneficiary_type: v }))}
                >
                  <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="contingent">Contingent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Relationship</label>
              <Input
                value={newBeneficiary.relationship}
                onChange={(e) => setNewBeneficiary(prev => ({ ...prev, relationship: e.target.value }))}
                placeholder="e.g., Spouse, Child, Trust"
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBeneficiary(false)} className="border-vault-gold/30">
              Cancel
            </Button>
            <Button 
              onClick={handleAddBeneficiary} 
              disabled={!newBeneficiary.name.trim() || saving} 
              className="bg-vault-gold text-vault-dark"
            >
              Add Beneficiary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={showAddPayment} onOpenChange={setShowAddPayment}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading text-vault-gold">Record Premium Payment</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Date *</label>
                <Input
                  type="date"
                  value={newPayment.payment_date}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, payment_date: e.target.value }))}
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Amount *</label>
                <Input
                  type="number"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Payment Method</label>
              <Select 
                value={newPayment.payment_method} 
                onValueChange={(v) => setNewPayment(prev => ({ ...prev, payment_method: v }))}
              >
                <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="ach">ACH</SelectItem>
                  <SelectItem value="wire">Wire Transfer</SelectItem>
                  <SelectItem value="auto_draft">Auto Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Confirmation #</label>
              <Input
                value={newPayment.confirmation_number}
                onChange={(e) => setNewPayment(prev => ({ ...prev, confirmation_number: e.target.value }))}
                placeholder="Optional"
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPayment(false)} className="border-vault-gold/30">
              Cancel
            </Button>
            <Button 
              onClick={handleAddPayment} 
              disabled={!newPayment.amount || saving} 
              className="bg-vault-gold text-vault-dark"
            >
              Record Payment
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
              Delete Insurance Policy
            </DialogTitle>
            <DialogDescription className="text-vault-muted">
              This action cannot be undone. Are you sure you want to delete this policy?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-300">
                <strong>{policy?.title}</strong> and all its associated beneficiaries and payment history will be permanently deleted.
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
                  Delete Policy
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finalize Confirmation Modal */}
      <FinalizeConfirmationModal
        open={showFinalizeConfirm}
        onOpenChange={setShowFinalizeConfirm}
        onConfirm={handleFinalize}
        recordTitle={policy?.title}
        moduleType="insurance"
        rmId={policy?.rm_id}
        isLoading={finalizing}
      />

      {/* Amendment Studio V2 */}
      <AmendmentStudio
        open={showAmendmentStudio}
        onOpenChange={setShowAmendmentStudio}
        recordTitle={policy?.policy_name || 'Insurance Policy'}
        currentVersion={policy?.revision || 1}
        moduleType="insurance"
        onCreateAmendment={handleAmendV2}
        isLoading={amendLoading}
      />

      {/* Revision History */}
      <RevisionHistory
        open={showRevisionHistory}
        onOpenChange={setShowRevisionHistory}
        recordTitle={policy?.policy_name || 'Insurance Policy'}
        revisions={revisions}
        currentRevisionId={policy?.policy_id}
        onViewRevision={handleViewRevision}
      />
    </motion.div>
  );
}
