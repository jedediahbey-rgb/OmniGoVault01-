import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  CalendarBlank,
  CaretDown,
  CaretRight,
  Check,
  CheckCircle,
  Clock,
  CurrencyDollar,
  DotsThreeVertical,
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
  Sparkle,
  SquaresFour,
  Timer,
  Trash,
  Users,
  Warning,
  X
} from '@phosphor-icons/react';

// Futuristic Date Icon - cyber styled with dynamic day display
const CyberDateIcon = ({ className = "w-5 h-5", day = null }) => {
  const displayDay = day ? String(day).padStart(2, '0') : new Date().getDate().toString().padStart(2, '0');
  return (
    <div className={`relative ${className} flex items-center justify-center`}>
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        {/* Outer frame */}
        <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" />
        {/* Top bar */}
        <rect x="2" y="3" width="20" height="5" rx="2" fill="currentColor" opacity="0.2" />
        {/* Calendar pins */}
        <line x1="7" y1="1" x2="7" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="17" y1="1" x2="17" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        {/* Day number display */}
        <text x="12" y="16.5" textAnchor="middle" fill="currentColor" fontSize="7" fontFamily="monospace" fontWeight="bold" opacity="0.9">{displayDay}</text>
        {/* Scan line accent */}
        <line x1="5" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      </svg>
    </div>
  );
};
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
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
const API_V2 = `${process.env.REACT_APP_BACKEND_URL}/api/governance/v2`;

// Helper to extract detailed error messages
const extractError = (error) => {
  const status = error.response?.status || 'NETWORK';
  const code = error.response?.data?.error?.code || error.response?.data?.detail?.[0]?.type || 'UNKNOWN';
  const message = error.response?.data?.error?.message 
    || error.response?.data?.detail?.[0]?.msg
    || error.response?.data?.detail
    || error.message 
    || 'Unknown error';
  const details = error.response?.data?.error?.details || error.response?.data || null;
  
  // Log full details to console
  console.error(`[API_ERROR] Status: ${status}, Code: ${code}`);
  console.error(`[API_ERROR] Message: ${message}`);
  if (details) console.error(`[API_ERROR] Details:`, details);
  
  return { status, code, message, details };
};

// Module type mapping for V2 API
const MODULE_TYPES = {
  meetings: 'minutes',
  distributions: 'distribution',
  disputes: 'dispute',
  insurance: 'insurance',
  compensation: 'compensation'
};

// Meeting type icons and colors
const meetingTypeConfig = {
  regular: { icon: CyberDateIcon, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Regular Meeting' },
  special: { icon: Gavel, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Special Meeting' },
  emergency: { icon: Warning, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Emergency Meeting' },
};

// Meeting status badges
const statusConfig = {
  draft: { label: 'Draft', color: 'bg-slate-500/30 text-slate-300 border-slate-400/30' },
  finalized: { label: 'Finalized', color: 'bg-vault-gold/30 text-vault-gold border-vault-gold/30' },
  attested: { label: 'Attested', color: 'bg-emerald-500/30 text-emerald-400 border-emerald-400/30' },
  amended: { label: 'Amended', color: 'bg-purple-500/30 text-purple-400 border-purple-400/30' },
};

// Distribution type icons and colors
const distributionTypeConfig = {
  regular: { icon: HandCoins, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Regular Distribution' },
  special: { icon: Gavel, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Special Distribution' },
  final: { icon: CheckCircle, color: 'text-vault-gold', bg: 'bg-vault-gold/20', label: 'Final Distribution' },
  emergency: { icon: Warning, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Emergency Distribution' },
};

// Distribution status badges
const distributionStatusConfig = {
  draft: { label: 'Draft', color: 'bg-slate-500/30 text-slate-300 border-slate-400/30' },
  pending_approval: { label: 'Pending Approval', color: 'bg-amber-500/30 text-amber-400 border-amber-400/30' },
  approved: { label: 'Approved', color: 'bg-blue-500/30 text-blue-400 border-blue-400/30' },
  in_progress: { label: 'In Progress', color: 'bg-purple-500/30 text-purple-400 border-purple-400/30' },
  finalized: { label: 'Finalized', color: 'bg-vault-gold/30 text-vault-gold border-vault-gold/30' },
  completed: { label: 'Completed', color: 'bg-emerald-500/30 text-emerald-400 border-emerald-400/30' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/30 text-red-400 border-red-400/30' },
};

// Dispute type icons and colors
const disputeTypeConfig = {
  beneficiary: { icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Beneficiary Dispute' },
  trustee: { icon: Gavel, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Trustee Dispute' },
  third_party: { icon: Scales, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Third Party Dispute' },
  tax: { icon: CurrencyDollar, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Tax Dispute' },
  regulatory: { icon: ShieldCheck, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Regulatory Dispute' },
};

// Dispute status badges
const disputeStatusConfig = {
  open: { label: 'Open', color: 'bg-blue-500/30 text-blue-400 border-blue-400/30' },
  in_progress: { label: 'In Progress', color: 'bg-amber-500/30 text-amber-400 border-amber-400/30' },
  mediation: { label: 'Mediation', color: 'bg-purple-500/30 text-purple-400 border-purple-400/30' },
  litigation: { label: 'Litigation', color: 'bg-red-500/30 text-red-400 border-red-400/30' },
  settled: { label: 'Settled', color: 'bg-emerald-500/30 text-emerald-400 border-emerald-400/30' },
  closed: { label: 'Closed', color: 'bg-slate-500/30 text-slate-300 border-slate-400/30' },
  finalized: { label: 'Finalized', color: 'bg-vault-gold/30 text-vault-gold border-vault-gold/30' },
  appealed: { label: 'Appealed', color: 'bg-orange-500/30 text-orange-400 border-orange-400/30' },
};

// Priority badges
const priorityConfig = {
  low: { label: 'Low', color: 'bg-slate-500/30 text-slate-300 border-slate-400/30' },
  medium: { label: 'Medium', color: 'bg-blue-500/30 text-blue-400 border-blue-400/30' },
  high: { label: 'High', color: 'bg-amber-500/30 text-amber-400 border-amber-400/30' },
  critical: { label: 'Critical', color: 'bg-red-500/30 text-red-400 border-red-400/30' },
};

// Insurance policy type icons and colors
const insuranceTypeConfig = {
  whole_life: { icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Whole Life' },
  term: { icon: Timer, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Term Life' },
  universal: { icon: CurrencyDollar, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Universal Life' },
  variable: { icon: Scales, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Variable Life' },
  group: { icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: 'Group Life' },
};

// Insurance status badges
const insuranceStatusConfig = {
  active: { label: 'Active', color: 'bg-emerald-500/30 text-emerald-400 border-emerald-400/30' },
  lapsed: { label: 'Lapsed', color: 'bg-red-500/30 text-red-400 border-red-400/30' },
  paid_up: { label: 'Paid Up', color: 'bg-vault-gold/30 text-vault-gold border-vault-gold/30' },
  surrendered: { label: 'Surrendered', color: 'bg-slate-500/30 text-slate-300 border-slate-400/30' },
  claimed: { label: 'Claimed', color: 'bg-purple-500/30 text-purple-400 border-purple-400/30' },
  expired: { label: 'Expired', color: 'bg-amber-500/30 text-amber-400 border-amber-400/30' },
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

  // Distributions State
  const [distributions, setDistributions] = useState([]);
  const [distributionsLoading, setDistributionsLoading] = useState(false);
  const [showNewDistribution, setShowNewDistribution] = useState(false);
  const [newDistribution, setNewDistribution] = useState({
    title: '',
    distribution_type: 'regular',
    description: '',
    total_amount: '',
    currency: 'USD',
    asset_type: 'cash',
    scheduled_date: new Date().toISOString().slice(0, 10),
  });
  const [creatingDistribution, setCreatingDistribution] = useState(false);

  // Disputes State
  const [disputes, setDisputes] = useState([]);
  const [disputesLoading, setDisputesLoading] = useState(false);
  const [showNewDispute, setShowNewDispute] = useState(false);
  const [newDispute, setNewDispute] = useState({
    title: '',
    dispute_type: 'beneficiary',
    description: '',
    amount_claimed: '',
    currency: 'USD',
    priority: 'medium',
    case_number: '',
    jurisdiction: '',
  });
  const [creatingDispute, setCreatingDispute] = useState(false);

  // Insurance State
  const [insurancePolicies, setInsurancePolicies] = useState([]);
  const [insuranceLoading, setInsuranceLoading] = useState(false);
  const [showNewInsurance, setShowNewInsurance] = useState(false);
  const [newInsurance, setNewInsurance] = useState({
    title: '',
    policy_type: 'whole_life',
    policy_number: '',
    carrier_name: '',
    insured_name: '',
    death_benefit: '',
    cash_value: '',
    currency: 'USD',
    premium_amount: '',
    premium_frequency: 'monthly',
    effective_date: '',
    notes: '',
  });
  const [creatingInsurance, setCreatingInsurance] = useState(false);

  // Compensation State
  const [compensationEntries, setCompensationEntries] = useState([]);
  const [compensationLoading, setCompensationLoading] = useState(false);
  const [showNewCompensation, setShowNewCompensation] = useState(false);
  const [newCompensation, setNewCompensation] = useState({
    title: '',
    compensation_type: 'annual_fee',
    recipient_name: '',
    recipient_role: 'trustee',
    amount: '',
    currency: 'USD',
    period_start: '',
    period_end: '',
    fiscal_year: new Date().getFullYear().toString(),
    basis_of_calculation: '',
    notes: '',
  });
  const [creatingCompensation, setCreatingCompensation] = useState(false);

  useEffect(() => {
    fetchPortfolios();
  }, []);

  useEffect(() => {
    if (selectedPortfolio) {
      fetchMeetings();
      fetchParties();
      fetchDistributions();
      fetchDisputes();
      fetchInsurancePolicies();
      fetchCompensationEntries();
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
      // Use V2 API for meetings (module_type: minutes)
      const res = await axios.get(`${API_V2}/records`, {
        params: { 
          portfolio_id: selectedPortfolio, 
          module_type: MODULE_TYPES.meetings
        }
      });
      
      const data = res.data;
      if (data.ok && data.data?.items) {
        // Transform V2 records to V1 meeting format for backward compatibility
        const transformedMeetings = data.data.items.map(record => ({
          meeting_id: record.id,
          id: record.id,
          title: record.title,
          rm_id: record.rm_id,
          status: record.status,
          locked: record.status === 'finalized',
          revision: record.current_version || 1,
          created_at: record.created_at,
          finalized_at: record.finalized_at,
          // Default values for display
          meeting_type: 'regular',
          attendees: []
        }));
        setMeetings(transformedMeetings);
      } else {
        setMeetings([]);
      }
    } catch (error) {
      console.error('Failed to fetch meetings list:', error);
      if (error.response?.data?.error?.code !== 'NOT_FOUND') {
        toast.error('Failed to load meetings list');
      }
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistributions = async () => {
    if (!selectedPortfolio) return;
    setDistributionsLoading(true);
    try {
      // Use V2 API for distributions
      const res = await axios.get(`${API_V2}/records`, {
        params: { 
          portfolio_id: selectedPortfolio, 
          module_type: MODULE_TYPES.distributions
        }
      });
      
      const data = res.data;
      if (data.ok && data.data?.items) {
        const transformedDistributions = data.data.items.map(record => ({
          distribution_id: record.id,
          id: record.id,
          title: record.title,
          rm_id: record.rm_id,
          status: record.status,
          locked: record.status === 'finalized',
          created_at: record.created_at,
          finalized_at: record.finalized_at,
          // Default values
          distribution_type: 'regular',
          total_amount: 0,
          currency: 'USD',
          asset_type: 'cash',
          recipients: []
        }));
        setDistributions(transformedDistributions);
      } else {
        setDistributions([]);
      }
    } catch (error) {
      console.error('Failed to fetch distributions:', error);
      setDistributions([]);
    } finally {
      setDistributionsLoading(false);
    }
  };

  const fetchDisputes = async () => {
    if (!selectedPortfolio) return;
    setDisputesLoading(true);
    try {
      // Use V2 API for disputes
      const res = await axios.get(`${API_V2}/records`, {
        params: { 
          portfolio_id: selectedPortfolio, 
          module_type: MODULE_TYPES.disputes
        }
      });
      
      const data = res.data;
      if (data.ok && data.data?.items) {
        const transformedDisputes = data.data.items.map(record => ({
          dispute_id: record.id,
          id: record.id,
          title: record.title,
          rm_id: record.rm_id,
          status: record.status === 'finalized' ? 'closed' : (record.status === 'draft' ? 'open' : record.status),
          locked: record.status === 'finalized',
          created_at: record.created_at,
          finalized_at: record.finalized_at,
          // Default values
          dispute_type: 'beneficiary',
          priority: 'medium',
          amount_claimed: 0,
          currency: 'USD'
        }));
        setDisputes(transformedDisputes);
      } else {
        setDisputes([]);
      }
    } catch (error) {
      console.error('Failed to fetch disputes:', error);
      setDisputes([]);
    } finally {
      setDisputesLoading(false);
    }
  };

  const fetchInsurancePolicies = async () => {
    if (!selectedPortfolio) return;
    setInsuranceLoading(true);
    try {
      // Use V2 API for insurance policies
      const res = await axios.get(`${API_V2}/records`, {
        params: { 
          portfolio_id: selectedPortfolio, 
          module_type: MODULE_TYPES.insurance
        }
      });
      
      const data = res.data;
      if (data.ok && data.data?.items) {
        const transformedPolicies = data.data.items.map(record => ({
          policy_id: record.id,
          id: record.id,
          title: record.title,
          rm_id: record.rm_id,
          status: record.status === 'finalized' ? 'active' : (record.status === 'draft' ? 'active' : record.status),
          locked: record.status === 'finalized',
          created_at: record.created_at,
          finalized_at: record.finalized_at,
          // Default values
          policy_type: 'whole_life',
          death_benefit: 0,
          cash_value: 0,
          currency: 'USD',
          carrier_name: ''
        }));
        setInsurancePolicies(transformedPolicies);
      } else {
        setInsurancePolicies([]);
      }
    } catch (error) {
      console.error('Failed to fetch insurance policies:', error);
      setInsurancePolicies([]);
    } finally {
      setInsuranceLoading(false);
    }
  };

  const fetchCompensationEntries = async () => {
    if (!selectedPortfolio) return;
    setCompensationLoading(true);
    try {
      // Use V2 API for compensation entries
      const res = await axios.get(`${API_V2}/records`, {
        params: { 
          portfolio_id: selectedPortfolio, 
          module_type: MODULE_TYPES.compensation
        }
      });
      
      const data = res.data;
      if (data.ok && data.data?.items) {
        const transformedEntries = data.data.items.map(record => ({
          compensation_id: record.id,
          id: record.id,
          title: record.title,
          rm_id: record.rm_id,
          status: record.status,
          locked: record.status === 'finalized',
          created_at: record.created_at,
          finalized_at: record.finalized_at,
          // Default values
          compensation_type: 'annual_fee',
          recipient_name: '',
          recipient_role: 'trustee',
          amount: 0,
          currency: 'USD'
        }));
        setCompensationEntries(transformedEntries);
      } else {
        setCompensationEntries([]);
      }
    } catch (error) {
      console.error('Failed to fetch compensation entries:', error);
      setCompensationEntries([]);
    } finally {
      setCompensationLoading(false);
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
      // Build request
      const requestData = {
        module_type: MODULE_TYPES.meetings,
        portfolio_id: selectedPortfolio,
        title: newMeeting.title,
        payload_json: {
          title: newMeeting.title,
          meeting_type: newMeeting.meeting_type,
          date_time: new Date(newMeeting.date_time).toISOString(),
          location: newMeeting.location,
          called_by: newMeeting.called_by,
          attendees: [],
          agenda_items: []
        }
      };
      
      console.log('[CREATE_MEETING] Sending request:', JSON.stringify(requestData, null, 2));
      console.log('[CREATE_MEETING] URL:', `${API_V2}/records`);
      
      const res = await axios.post(`${API_V2}/records`, requestData);
      
      console.log('[CREATE_MEETING] Response status:', res.status);
      console.log('[CREATE_MEETING] Response data:', JSON.stringify(res.data, null, 2));
      
      const data = res.data;
      if (data.ok && data.data?.record) {
        toast.success('Meeting created');
        setShowNewMeeting(false);
        setNewMeeting({
          title: '',
          meeting_type: 'regular',
          date_time: new Date().toISOString().slice(0, 16),
          location: '',
          called_by: '',
        });
        
        // Navigate to the new meeting editor
        navigate(`/vault/governance/meetings/${data.data.record.id}`);
      } else {
        const errMsg = data.error?.message || 'Failed to create meeting';
        console.error('[CREATE_MEETING] Server error:', data.error);
        throw new Error(errMsg);
      }
    } catch (error) {
      console.error('[CREATE_MEETING] ERROR:', error);
      console.error('[CREATE_MEETING] Response status:', error.response?.status);
      console.error('[CREATE_MEETING] Response data:', JSON.stringify(error.response?.data, null, 2));
      
      const errMsg = error.response?.data?.error?.message 
        || error.response?.data?.detail 
        || error.message 
        || 'Failed to create meeting';
      const errCode = error.response?.data?.error?.code || error.response?.status || 'UNKNOWN';
      
      toast.error(`[${errCode}] ${errMsg}`);
    } finally {
      setCreating(false);
    }
  };


  const handleDeleteMeeting = async (meetingId) => {
    try {
      // Use V2 API void endpoint instead of delete
      await axios.post(`${API_V2}/records/${meetingId}/void`, {
        void_reason: 'Deleted by user from governance list'
      });
      toast.success('Meeting deleted');
      fetchMeetings();
    } catch (error) {
      console.error('Failed to delete meeting:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to delete meeting');
    }
  };

  // Distribution handlers
  const handleCreateDistribution = async () => {
    if (!newDistribution.title.trim()) {
      toast.error('Please enter a distribution title');
      return;
    }
    if (!selectedPortfolio) {
      toast.error('Please select a portfolio first');
      return;
    }
    
    setCreatingDistribution(true);
    try {
      // Build request
      const requestData = {
        module_type: MODULE_TYPES.distributions,
        portfolio_id: selectedPortfolio,
        title: newDistribution.title,
        payload_json: {
          title: newDistribution.title,
          distribution_type: newDistribution.distribution_type,
          description: newDistribution.description,
          total_amount: parseFloat(newDistribution.total_amount) || 0,
          currency: newDistribution.currency,
          asset_type: newDistribution.asset_type,
          scheduled_date: newDistribution.scheduled_date,
          recipients: []
        }
      };
      
      console.log('[CREATE_DISTRIBUTION] Sending:', JSON.stringify(requestData, null, 2));
      
      const res = await axios.post(`${API_V2}/records`, requestData);
      
      console.log('[CREATE_DISTRIBUTION] Response:', res.status, JSON.stringify(res.data, null, 2));
      
      const data = res.data;
      if (data.ok && data.data?.record) {
        toast.success('Distribution created');
        setShowNewDistribution(false);
        setNewDistribution({
          title: '',
          distribution_type: 'regular',
          description: '',
          total_amount: '',
          currency: 'USD',
          asset_type: 'cash',
          scheduled_date: new Date().toISOString().slice(0, 10),
        });
        
        navigate(`/vault/governance/distributions/${data.data.record.id}`);
      } else {
        const errMsg = data.error?.message || 'Failed to create distribution';
        console.error('[CREATE_DISTRIBUTION] Error:', data.error);
        throw new Error(errMsg);
      }
    } catch (error) {
      console.error('[CREATE_DISTRIBUTION] ERROR:', error);
      console.error('[CREATE_DISTRIBUTION] Status:', error.response?.status);
      console.error('[CREATE_DISTRIBUTION] Response:', JSON.stringify(error.response?.data, null, 2));
      
      const errMsg = error.response?.data?.error?.message 
        || error.response?.data?.detail 
        || error.message 
        || 'Failed to create distribution';
      const errCode = error.response?.data?.error?.code || error.response?.status || 'UNKNOWN';
      
      toast.error(`[${errCode}] ${errMsg}`);
    } finally {
      setCreatingDistribution(false);
    }
  };

  const handleDeleteDistribution = async (distributionId) => {
    try {
      // Use V2 API void endpoint
      await axios.post(`${API_V2}/records/${distributionId}/void`, {
        void_reason: 'Deleted by user from governance list'
      });
      toast.success('Distribution deleted');
      fetchDistributions();
    } catch (error) {
      console.error('Failed to delete distribution:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to delete distribution');
    }
  };

  // Dispute handlers
  const handleCreateDispute = async () => {
    if (!newDispute.title.trim()) {
      toast.error('Please enter a dispute title');
      return;
    }
    if (!selectedPortfolio) {
      toast.error('Please select a portfolio first');
      return;
    }
    
    setCreatingDispute(true);
    try {
      // Build request
      const requestData = {
        module_type: MODULE_TYPES.disputes,
        portfolio_id: selectedPortfolio,
        title: newDispute.title,
        payload_json: {
          title: newDispute.title,
          dispute_type: newDispute.dispute_type,
          description: newDispute.description,
          amount_claimed: parseFloat(newDispute.amount_claimed) || 0,
          currency: newDispute.currency,
          priority: newDispute.priority,
          case_number: newDispute.case_number,
          jurisdiction: newDispute.jurisdiction,
          parties: [],
          events: []
        }
      };
      
      console.log('[CREATE_DISPUTE] Sending:', JSON.stringify(requestData, null, 2));
      
      const res = await axios.post(`${API_V2}/records`, requestData);
      
      console.log('[CREATE_DISPUTE] Response:', res.status, JSON.stringify(res.data, null, 2));
      
      const data = res.data;
      if (data.ok && data.data?.record) {
        toast.success('Dispute created');
        setShowNewDispute(false);
        setNewDispute({
          title: '',
          dispute_type: 'beneficiary',
          description: '',
          amount_claimed: '',
          currency: 'USD',
          priority: 'medium',
          case_number: '',
          jurisdiction: '',
        });
        
        navigate(`/vault/governance/disputes/${data.data.record.id}`);
      } else {
        const errMsg = data.error?.message || 'Failed to create dispute';
        console.error('[CREATE_DISPUTE] Server error:', data.error);
        throw new Error(errMsg);
      }
    } catch (error) {
      const { status, code, message } = extractError(error);
      toast.error(`[${status}/${code}] ${message}`);
    } finally {
      setCreatingDispute(false);
    }
  };

  const handleDeleteDispute = async (disputeId) => {
    try {
      // Use V2 API void endpoint
      await axios.post(`${API_V2}/records/${disputeId}/void`, {
        void_reason: 'Deleted by user from governance list'
      });
      toast.success('Dispute deleted');
      fetchDisputes();
    } catch (error) {
      console.error('Failed to delete dispute:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to delete dispute');
    }
  };

  const handleCreateInsurance = async () => {
    if (!newInsurance.title.trim()) {
      toast.error('Please enter a policy name');
      return;
    }
    if (!selectedPortfolio) {
      toast.error('Please select a portfolio');
      return;
    }
    
    setCreatingInsurance(true);
    try {
      // Build request
      const requestData = {
        module_type: MODULE_TYPES.insurance,
        portfolio_id: selectedPortfolio,
        title: newInsurance.title,
        payload_json: {
          title: newInsurance.title,
          policy_type: newInsurance.policy_type,
          policy_number: newInsurance.policy_number,
          carrier_name: newInsurance.carrier_name,
          insured_name: newInsurance.insured_name,
          death_benefit: parseFloat(newInsurance.death_benefit) || 0,
          cash_value: parseFloat(newInsurance.cash_value) || 0,
          currency: newInsurance.currency,
          premium_amount: parseFloat(newInsurance.premium_amount) || 0,
          premium_frequency: newInsurance.premium_frequency,
          effective_date: newInsurance.effective_date,
          notes: newInsurance.notes,
          beneficiaries: []
        }
      };
      
      const res = await axios.post(`${API_V2}/records`, requestData);
      
      const data = res.data;
      if (data.ok && data.data?.record) {
        toast.success('Insurance policy created');
        setShowNewInsurance(false);
        setNewInsurance({
          title: '',
          policy_type: 'whole_life',
          policy_number: '',
          carrier_name: '',
          insured_name: '',
          death_benefit: '',
          cash_value: '',
          currency: 'USD',
          premium_amount: '',
          premium_frequency: 'monthly',
          effective_date: '',
          notes: '',
        });
        
        navigate(`/vault/governance/insurance/${data.data.record.id}`);
      } else {
        throw new Error(data.error?.message || 'Failed to create insurance policy');
      }
    } catch (error) {
      console.error('Failed to create insurance policy:', error);
      toast.error(error.response?.data?.error?.message || error.message || 'Failed to create insurance policy');
    } finally {
      setCreatingInsurance(false);
    }
  };

  const handleDeleteInsurance = async (policyId) => {
    try {
      // Use V2 API void endpoint
      await axios.post(`${API_V2}/records/${policyId}/void`, {
        void_reason: 'Deleted by user from governance list'
      });
      toast.success('Insurance policy deleted');
      fetchInsurancePolicies();
    } catch (error) {
      console.error('Failed to delete insurance policy:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to delete insurance policy');
    }
  };

  const handleCreateCompensation = async () => {
    if (!newCompensation.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!newCompensation.recipient_name.trim()) {
      toast.error('Please enter a recipient name');
      return;
    }
    if (!selectedPortfolio) {
      toast.error('Please select a portfolio');
      return;
    }
    
    setCreatingCompensation(true);
    try {
      // Build request
      const requestData = {
        module_type: MODULE_TYPES.compensation,
        portfolio_id: selectedPortfolio,
        title: newCompensation.title,
        payload_json: {
          title: newCompensation.title,
          compensation_type: newCompensation.compensation_type,
          recipient_name: newCompensation.recipient_name,
          recipient_role: newCompensation.recipient_role,
          amount: parseFloat(newCompensation.amount) || 0,
          currency: newCompensation.currency,
          period_start: newCompensation.period_start,
          period_end: newCompensation.period_end,
          fiscal_year: newCompensation.fiscal_year,
          basis_of_calculation: newCompensation.basis_of_calculation,
          notes: newCompensation.notes
        }
      };
      
      const res = await axios.post(`${API_V2}/records`, requestData);
      
      const data = res.data;
      if (data.ok && data.data?.record) {
        toast.success('Compensation entry created');
        setShowNewCompensation(false);
        setNewCompensation({
          title: '',
          compensation_type: 'annual_fee',
          recipient_name: '',
          recipient_role: 'trustee',
          amount: '',
          currency: 'USD',
          period_start: '',
          period_end: '',
          fiscal_year: new Date().getFullYear().toString(),
          basis_of_calculation: '',
          notes: '',
        });
        
        fetchCompensationEntries();
      } else {
        throw new Error(data.error?.message || 'Failed to create compensation entry');
      }
    } catch (error) {
      console.error('Failed to create compensation entry:', error);
      toast.error(error.response?.data?.error?.message || error.message || 'Failed to create compensation entry');
    } finally {
      setCreatingCompensation(false);
    }
  };

  const handleDeleteCompensation = async (compensationId) => {
    try {
      // Use V2 API void endpoint
      await axios.post(`${API_V2}/records/${compensationId}/void`, {
        void_reason: 'Deleted by user from governance list'
      });
      toast.success('Compensation entry deleted');
      fetchCompensationEntries();
    } catch (error) {
      console.error('Failed to delete compensation entry:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to delete compensation entry');
    }
  };

  const filteredMeetings = meetings.filter(m => 
    m.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.rm_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDistributions = distributions.filter(d => 
    d.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.rm_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDisputes = disputes.filter(d => 
    d.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.rm_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.case_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInsurance = insurancePolicies.filter(p => 
    p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.rm_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.policy_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.carrier_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCompensation = compensationEntries.filter(c => 
    c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.rm_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase())
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

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount || 0);
  };

  const selectedPortfolioData = portfolios.find(p => p.portfolio_id === selectedPortfolio);

  return (
    <motion.div 
      className="min-h-screen p-4 md:p-6 lg:p-8 w-full max-w-full overflow-x-hidden"
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
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between min-w-0">
            {/* Portfolio Selector */}
            <div className="flex items-center gap-4 w-full md:w-auto min-w-0">
              <div className="flex-1 md:flex-none md:w-[250px] min-w-0">
                <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
                  <SelectTrigger className="bg-vault-dark/50 border-vault-gold/20 text-white">
                    <SelectValue placeholder="Select Portfolio" className="truncate" />
                  </SelectTrigger>
                  <SelectContent className="bg-vault-dark border-vault-gold/30">
                    {portfolios.map(p => (
                      <SelectItem 
                        key={p.portfolio_id} 
                        value={p.portfolio_id}
                        className="text-white hover:bg-vault-gold/20"
                      >
                        <span className="truncate">{p.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedPortfolioData && (
                <div className="hidden md:flex items-center gap-2 text-vault-muted text-sm min-w-0">
                  <House className="w-4 h-4 shrink-0" />
                  <span className="truncate">Portfolio: {selectedPortfolioData.name}</span>
                </div>
              )}
            </div>

            {/* Search & New Button */}
            <div className="flex items-center gap-3 w-full md:w-auto min-w-0">
              <div className="relative flex-1 md:w-64 min-w-0">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vault-muted" />
                <Input
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-vault-dark/50 border-vault-gold/20 text-white placeholder:text-vault-muted"
                />
              </div>
              {activeTab === 'meetings' && (
                <Button
                  onClick={() => setShowNewMeeting(true)}
                  className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark font-semibold whitespace-nowrap shrink-0"
                  disabled={!selectedPortfolio}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">New Meeting</span>
                  <span className="sm:hidden">New</span>
                </Button>
              )}
              {activeTab === 'distributions' && (
                <Button
                  onClick={() => setShowNewDistribution(true)}
                  className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark font-semibold whitespace-nowrap shrink-0"
                  disabled={!selectedPortfolio}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">New Distribution</span>
                  <span className="sm:hidden">New</span>
                </Button>
              )}
              {activeTab === 'disputes' && (
                <Button
                  onClick={() => setShowNewDispute(true)}
                  className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark font-semibold whitespace-nowrap shrink-0"
                  disabled={!selectedPortfolio}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">New Dispute</span>
                  <span className="sm:hidden">New</span>
                </Button>
              )}
              {activeTab === 'insurance' && (
                <Button
                  onClick={() => setShowNewInsurance(true)}
                  className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark font-semibold whitespace-nowrap shrink-0"
                  disabled={!selectedPortfolio}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">New Policy</span>
                  <span className="sm:hidden">New</span>
                </Button>
              )}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Tabs for different governance modules */}
      <motion.div variants={fadeInUp}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Scrollable tabs on mobile */}
          <div className="w-full overflow-x-auto overscroll-x-contain -mx-4 px-4 md:mx-0 md:px-0 mb-6">
            <TabsList className="bg-vault-dark/50 border border-vault-gold/20 w-max md:w-auto">
              <TabsTrigger 
                value="meetings" 
                className="data-[state=active]:bg-vault-gold data-[state=active]:text-vault-dark whitespace-nowrap"
              >
                <Newspaper className="w-4 h-4 mr-2 shrink-0" />
                <span className="hidden sm:inline">Meeting</span> Minutes
              </TabsTrigger>
              <TabsTrigger 
                value="distributions" 
                className="data-[state=active]:bg-vault-gold data-[state=active]:text-vault-dark whitespace-nowrap"
              >
                <HandCoins className="w-4 h-4 mr-2 shrink-0" />
                <span className="hidden sm:inline">Distributions</span><span className="sm:hidden">Dist.</span>
              </TabsTrigger>
              <TabsTrigger 
                value="disputes" 
                className="data-[state=active]:bg-vault-gold data-[state=active]:text-vault-dark whitespace-nowrap"
              >
                <Scales className="w-4 h-4 mr-2 shrink-0" />
                Disputes
              </TabsTrigger>
              <TabsTrigger 
                value="insurance" 
                className="data-[state=active]:bg-vault-gold data-[state=active]:text-vault-dark whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4 mr-2 shrink-0" />
                <span className="hidden sm:inline">Insurance</span><span className="sm:hidden">Ins.</span>
              </TabsTrigger>
              <TabsTrigger 
                value="compensation" 
                className="data-[state=active]:bg-vault-gold data-[state=active]:text-vault-dark whitespace-nowrap"
              >
                <CurrencyDollar className="w-4 h-4 mr-2 shrink-0" />
                <span className="hidden sm:inline">Compensation</span><span className="sm:hidden">Comp.</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Meeting Minutes Tab */}
          <TabsContent value="meetings" className="mt-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-12 h-12 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !selectedPortfolio ? (
              <GlassCard className="p-8 sm:p-12 text-center">
                <House className="w-12 sm:w-16 h-12 sm:h-16 mx-auto text-vault-gold/50 mb-4" />
                <h3 className="text-lg sm:text-xl font-heading text-white mb-2">Select a Portfolio</h3>
                <p className="text-sm sm:text-base text-vault-muted">Choose a portfolio to view its governance records</p>
              </GlassCard>
            ) : filteredMeetings.length === 0 ? (
              <GlassCard className="p-8 sm:p-12 text-center">
                <Newspaper className="w-12 sm:w-16 h-12 sm:h-16 mx-auto text-vault-gold/50 mb-4" />
                <h3 className="text-lg sm:text-xl font-heading text-white mb-2">No Meetings Yet</h3>
                <p className="text-sm sm:text-base text-vault-muted">Tap the "New" button above to create your first meeting minutes</p>
              </GlassCard>
            ) : (
              <div className="space-y-4">
                {filteredMeetings.map((meeting, index) => {
                  const typeConfig = meetingTypeConfig[meeting.meeting_type] || meetingTypeConfig.regular;
                  const TypeIcon = typeConfig.icon;
                  // If locked, show "finalized" status instead of draft
                  const effectiveStatus = meeting.locked ? 'finalized' : meeting.status;
                  const status = statusConfig[effectiveStatus] || statusConfig.draft;
                  // Use meeting.id or meeting.meeting_id (backend now provides both)
                  const meetingId = meeting.id || meeting.meeting_id;
                  
                  return (
                    <motion.div
                      key={meetingId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <GlassCard 
                        className="p-4 hover:border-vault-gold/40 transition-all cursor-pointer group"
                        onClick={() => navigate(`/vault/governance/meetings/${meetingId}`)}
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
                                      v{meeting.revision || meeting.amendment_number + 1}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="text-right shrink-0 pl-4">
                                <div className="text-sm text-vault-muted flex items-center gap-1 justify-end">
                                  <Clock className="w-4 h-4 flex-shrink-0" />
                                  <span className="truncate">{formatDate(meeting.date_time)}</span>
                                </div>
                                {meeting.location && (
                                  <div className="text-xs text-vault-muted mt-1 truncate max-w-[180px] text-right">
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
                          
                          {/* Arrow indicator only - delete moved to editor 3-dot menu */}
                          <div className="flex items-center">
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

          {/* Distributions Tab */}
          <TabsContent value="distributions" className="mt-0">
            {distributionsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-12 h-12 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !selectedPortfolio ? (
              <GlassCard className="p-8 sm:p-12 text-center">
                <House className="w-12 sm:w-16 h-12 sm:h-16 mx-auto text-vault-gold/50 mb-4" />
                <h3 className="text-lg sm:text-xl font-heading text-white mb-2">Select a Portfolio</h3>
                <p className="text-sm sm:text-base text-vault-muted">Choose a portfolio to view its distributions</p>
              </GlassCard>
            ) : filteredDistributions.length === 0 ? (
              <GlassCard className="p-8 sm:p-12 text-center">
                <HandCoins className="w-12 sm:w-16 h-12 sm:h-16 mx-auto text-vault-gold/50 mb-4" />
                <h3 className="text-lg sm:text-xl font-heading text-white mb-2">No Distributions Yet</h3>
                <p className="text-sm sm:text-base text-vault-muted">Tap the "New" button above to track beneficiary distributions</p>
              </GlassCard>
            ) : (
              <div className="space-y-4">
                {filteredDistributions.map((distribution, index) => {
                  const typeConfig = distributionTypeConfig[distribution.distribution_type] || distributionTypeConfig.regular;
                  const TypeIcon = typeConfig.icon;
                  // If locked, always show "Finalized" status regardless of stored status
                  const effectiveStatus = distribution.locked ? 'finalized' : distribution.status;
                  const status = distributionStatusConfig[effectiveStatus] || distributionStatusConfig.draft;
                  const distributionId = distribution.id || distribution.distribution_id;
                  
                  return (
                    <motion.div
                      key={distributionId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <GlassCard 
                        className="p-4 hover:border-vault-gold/40 transition-all cursor-pointer group"
                        onClick={() => navigate(`/vault/governance/distributions/${distributionId}`)}
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
                                  {distribution.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  {distribution.rm_id && (
                                    <span className="text-xs font-mono text-vault-muted bg-vault-dark/50 px-2 py-0.5 rounded">
                                      {distribution.rm_id}
                                    </span>
                                  )}
                                  <Badge className={`text-xs ${status.color} border`}>
                                    {status.label}
                                  </Badge>
                                </div>
                              </div>
                              
                              {/* Amount */}
                              <div className="text-right">
                                <div className="text-xl font-heading text-emerald-400">
                                  {formatCurrency(distribution.total_amount, distribution.currency)}
                                </div>
                                <div className="text-xs text-vault-muted">
                                  {distribution.asset_type || 'Cash'}
                                </div>
                              </div>
                            </div>
                            
                            {/* Details Row */}
                            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-vault-muted">
                              {distribution.scheduled_date && (
                                <div className="flex items-center gap-1">
                                  <CyberDateIcon className="w-4 h-4" day={new Date(distribution.scheduled_date).getDate()} />
                                  <span>{new Date(distribution.scheduled_date).toLocaleDateString()}</span>
                                </div>
                              )}
                              {distribution.recipients?.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  <span>{distribution.recipients.length} recipient{distribution.recipients.length !== 1 ? 's' : ''}</span>
                                </div>
                              )}
                              {distribution.requires_approval && (
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="w-4 h-4" />
                                  <span>{distribution.approvals?.length || 0}/{distribution.approval_threshold || 1} approvals</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Arrow indicator only */}
                          <div className="flex items-center">
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

          {/* Disputes Tab */}
          <TabsContent value="disputes" className="mt-0">
            {disputesLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-12 h-12 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !selectedPortfolio ? (
              <GlassCard className="p-8 sm:p-12 text-center">
                <House className="w-12 sm:w-16 h-12 sm:h-16 mx-auto text-vault-gold/50 mb-4" />
                <h3 className="text-lg sm:text-xl font-heading text-white mb-2">Select a Portfolio</h3>
                <p className="text-sm sm:text-base text-vault-muted">Choose a portfolio to view its disputes</p>
              </GlassCard>
            ) : filteredDisputes.length === 0 ? (
              <GlassCard className="p-8 sm:p-12 text-center">
                <Scales className="w-12 sm:w-16 h-12 sm:h-16 mx-auto text-vault-gold/50 mb-4" />
                <h3 className="text-lg sm:text-xl font-heading text-white mb-2">No Disputes</h3>
                <p className="text-sm sm:text-base text-vault-muted">Tap the "New" button above to track disputes</p>
              </GlassCard>
            ) : (
              <div className="space-y-4">
                {/* New Dispute Button */}
                <div className="flex justify-end mb-4">
                  <Button
                    onClick={() => setShowNewDispute(true)}
                    className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Dispute
                  </Button>
                </div>
                
                {filteredDisputes.map((dispute, index) => {
                  const typeConfig = disputeTypeConfig[dispute.dispute_type] || disputeTypeConfig.beneficiary;
                  const TypeIcon = typeConfig.icon;
                  // Always show the actual status - don't override
                  const status = disputeStatusConfig[dispute.status] || disputeStatusConfig.open;
                  const priority = priorityConfig[dispute.priority] || priorityConfig.medium;
                  const disputeId = dispute.id || dispute.dispute_id;
                  
                  return (
                    <motion.div
                      key={disputeId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <GlassCard 
                        className="p-4 hover:border-vault-gold/40 transition-all cursor-pointer group"
                        onClick={() => navigate(`/vault/governance/disputes/${disputeId}`)}
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
                                  {dispute.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  {dispute.rm_id && (
                                    <span className="text-xs font-mono text-vault-muted bg-vault-dark/50 px-2 py-0.5 rounded">
                                      {dispute.rm_id}
                                    </span>
                                  )}
                                  <Badge className={`text-xs ${status.color} border`}>
                                    {status.label}
                                  </Badge>
                                  <Badge className={`text-xs ${priority.color} border`}>
                                    {priority.label}
                                  </Badge>
                                </div>
                              </div>
                              
                              {/* Amount */}
                              {dispute.amount_claimed > 0 && (
                                <div className="text-right">
                                  <div className="text-xl font-heading text-red-400">
                                    {formatCurrency(dispute.amount_claimed, dispute.currency)}
                                  </div>
                                  <div className="text-xs text-vault-muted">
                                    Amount Claimed
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Details Row */}
                            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-vault-muted">
                              {dispute.case_number && (
                                <div className="flex items-center gap-1">
                                  <FileText className="w-4 h-4" />
                                  <span>Case: {dispute.case_number}</span>
                                </div>
                              )}
                              {dispute.jurisdiction && (
                                <div className="flex items-center gap-1">
                                  <Gavel className="w-4 h-4" />
                                  <span>{dispute.jurisdiction}</span>
                                </div>
                              )}
                              {dispute.next_deadline && (
                                <div className="flex items-center gap-1 text-amber-400">
                                  <Clock className="w-4 h-4" />
                                  <span>Deadline: {new Date(dispute.next_deadline).toLocaleDateString()}</span>
                                </div>
                              )}
                              {dispute.parties?.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  <span>{dispute.parties.length} parties</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Arrow indicator only */}
                          <div className="flex items-center">
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

          <TabsContent value="insurance">
            {insuranceLoading ? (
              <GlassCard className="p-12 text-center">
                <div className="w-8 h-8 border-2 border-vault-gold border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-vault-muted mt-4">Loading insurance policies...</p>
              </GlassCard>
            ) : filteredInsurance.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <ShieldCheck className="w-16 h-16 mx-auto text-vault-gold/50 mb-4" />
                <h3 className="text-xl font-heading text-white mb-2">No Insurance Policies</h3>
                <p className="text-vault-muted">Tap the "New" button above to add insurance policies</p>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {filteredInsurance.map((policy, idx) => {
                  const policyId = policy.policy_id || policy.id;
                  const typeConfig = insuranceTypeConfig[policy.policy_type] || insuranceTypeConfig.whole_life;
                  const TypeIcon = typeConfig.icon;
                  const statusConf = insuranceStatusConfig[policy.status] || insuranceStatusConfig.active;
                  
                  return (
                    <motion.div
                      key={policyId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <GlassCard 
                        className="p-4 cursor-pointer hover:border-vault-gold/50 transition-all group"
                        onClick={() => navigate(`/vault/governance/insurance/${policyId}`)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`p-2 rounded-lg ${typeConfig.bg} shrink-0`}>
                              <TypeIcon className={`w-5 h-5 ${typeConfig.color}`} weight="duotone" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Badge className={`${statusConf.color} border text-xs`}>
                                  {statusConf.label}
                                </Badge>
                                <Badge className="bg-vault-dark/50 text-vault-muted border border-vault-gold/20 text-xs">
                                  {typeConfig.label}
                                </Badge>
                              </div>
                              
                              <h3 className="text-white font-medium truncate">{policy.title}</h3>
                              
                              {policy.rm_id && (
                                <span className="text-xs font-mono text-vault-muted">{policy.rm_id}</span>
                              )}
                              
                              {/* Death Benefit */}
                              {policy.death_benefit > 0 && (
                                <div className="text-lg font-heading text-emerald-400 mt-1">
                                  {formatCurrency(policy.death_benefit, policy.currency)}
                                  <span className="text-xs text-vault-muted ml-2">death benefit</span>
                                </div>
                              )}
                              
                              {/* Details Row */}
                              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-vault-muted">
                                {policy.carrier_name && (
                                  <div className="flex items-center gap-1">
                                    <House className="w-4 h-4" />
                                    <span>{policy.carrier_name}</span>
                                  </div>
                                )}
                                {policy.policy_number && (
                                  <div className="flex items-center gap-1">
                                    <FileText className="w-4 h-4" />
                                    <span>#{policy.policy_number}</span>
                                  </div>
                                )}
                                {policy.insured_name && (
                                  <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    <span>Insured: {policy.insured_name}</span>
                                  </div>
                                )}
                                {policy.premium_amount > 0 && (
                                  <div className="flex items-center gap-1">
                                    <CurrencyDollar className="w-4 h-4" />
                                    <span>{formatCurrency(policy.premium_amount)} / {policy.premium_frequency}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Arrow indicator only */}
                          <div className="flex items-center">
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

          {/* Compensation Tab */}
          <TabsContent value="compensation" className="mt-0">
            {compensationLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-12 h-12 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !selectedPortfolio ? (
              <GlassCard className="p-8 sm:p-12 text-center">
                <House className="w-12 sm:w-16 h-12 sm:h-16 mx-auto text-vault-gold/50 mb-4" />
                <h3 className="text-lg sm:text-xl font-heading text-white mb-2">Select a Portfolio</h3>
                <p className="text-sm sm:text-base text-vault-muted">Choose a portfolio to view its compensation records</p>
              </GlassCard>
            ) : filteredCompensation.length === 0 ? (
              <GlassCard className="p-8 sm:p-12 text-center">
                <CurrencyDollar className="w-12 sm:w-16 h-12 sm:h-16 mx-auto text-vault-gold/50 mb-4" />
                <h3 className="text-lg sm:text-xl font-heading text-white mb-2">No Compensation Records</h3>
                <p className="text-sm sm:text-base text-vault-muted">Tap the "New" button above to log trustee compensation</p>
              </GlassCard>
            ) : (
              <div className="space-y-4">
                {/* Summary Card */}
                <GlassCard className="p-4 mb-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-xs text-vault-muted uppercase tracking-wider">Total Compensation</p>
                        <p className="text-2xl font-bold text-vault-gold">
                          {formatCurrency(filteredCompensation.reduce((sum, c) => sum + (c.amount || 0), 0))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-vault-muted uppercase tracking-wider">Entries</p>
                        <p className="text-2xl font-bold text-white">{filteredCompensation.length}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowNewCompensation(true)}
                      className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark font-semibold"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Log Compensation
                    </Button>
                  </div>
                </GlassCard>

                {filteredCompensation.map((entry, index) => {
                  const compId = entry.compensation_id;
                  const statusColors = {
                    draft: 'bg-slate-500/30 text-slate-300 border-slate-400/30',
                    pending_approval: 'bg-amber-500/30 text-amber-400 border-amber-400/30',
                    approved: 'bg-blue-500/30 text-blue-400 border-blue-400/30',
                    paid: 'bg-emerald-500/30 text-emerald-400 border-emerald-400/30',
                    cancelled: 'bg-red-500/30 text-red-400 border-red-400/30',
                  };
                  const typeLabels = {
                    annual_fee: 'Annual Fee',
                    transaction_fee: 'Transaction Fee',
                    hourly: 'Hourly',
                    special: 'Special',
                    reimbursement: 'Reimbursement',
                  };
                  
                  return (
                    <motion.div
                      key={compId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => navigate(`/vault/governance/compensation/${compId}`)}
                    >
                      <GlassCard className="p-4 hover:border-vault-gold/40 transition-colors cursor-pointer group">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-vault-gold/20 flex items-center justify-center shrink-0">
                              <CurrencyDollar className="w-5 h-5 text-vault-gold" weight="duotone" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h4 className="font-semibold text-white truncate">{entry.title}</h4>
                                <Badge className={`text-xs border ${statusColors[entry.status] || statusColors.draft}`}>
                                  {entry.status?.replace('_', ' ')}
                                </Badge>
                              </div>
                              <p className="text-sm text-vault-muted mb-2">
                                {entry.recipient_name} • {typeLabels[entry.compensation_type] || entry.compensation_type}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-vault-muted flex-wrap">
                                <span className="font-mono text-vault-gold">{entry.rm_id}</span>
                                <span className="text-lg font-bold text-white">{formatCurrency(entry.amount)}</span>
                                {entry.fiscal_year && (
                                  <span>FY {entry.fiscal_year}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* 3-dot dropdown menu for actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <DotsThreeVertical className="w-5 h-5 text-vault-muted" weight="bold" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700">
                              <DropdownMenuItem
                                className="text-white hover:bg-zinc-800 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/vault/governance/compensation/${compId}`);
                                }}
                              >
                                <PencilSimple className="w-4 h-4 mr-2" />
                                View / Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-400 hover:bg-red-500/10 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCompensation(compId);
                                }}
                              >
                                <Trash className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </div>
            )}
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
                      <CyberDateIcon className="w-4 h-4 text-blue-400" />
                      Regular Meeting
                    </div>
                  </SelectItem>
                  <SelectItem value="special" className="text-white hover:bg-vault-gold/20">
                    <div className="flex items-center gap-2">
                      <Sparkle className="w-4 h-4 text-purple-400" />
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

      {/* New Distribution Dialog */}
      <Dialog open={showNewDistribution} onOpenChange={setShowNewDistribution}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading text-vault-gold flex items-center gap-2">
              <HandCoins className="w-6 h-6" />
              New Distribution
            </DialogTitle>
            <DialogDescription className="text-vault-muted">
              Create a new trust distribution record
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Distribution Title *</label>
              <Input
                placeholder="e.g., Q4 2024 Beneficiary Distribution"
                value={newDistribution.title}
                onChange={(e) => setNewDistribution(prev => ({ ...prev, title: e.target.value }))}
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
            
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Distribution Type</label>
              <Select 
                value={newDistribution.distribution_type} 
                onValueChange={(v) => setNewDistribution(prev => ({ ...prev, distribution_type: v }))}
              >
                <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                  <SelectItem value="regular" className="text-white hover:bg-vault-gold/20">
                    <div className="flex items-center gap-2">
                      <HandCoins className="w-4 h-4 text-emerald-400" />
                      Regular Distribution
                    </div>
                  </SelectItem>
                  <SelectItem value="special" className="text-white hover:bg-vault-gold/20">
                    <div className="flex items-center gap-2">
                      <Gavel className="w-4 h-4 text-amber-400" />
                      Special Distribution
                    </div>
                  </SelectItem>
                  <SelectItem value="final" className="text-white hover:bg-vault-gold/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-vault-gold" />
                      Final Distribution
                    </div>
                  </SelectItem>
                  <SelectItem value="emergency" className="text-white hover:bg-vault-gold/20">
                    <div className="flex items-center gap-2">
                      <Warning className="w-4 h-4 text-red-400" />
                      Emergency Distribution
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Total Amount</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newDistribution.total_amount}
                  onChange={(e) => setNewDistribution(prev => ({ ...prev, total_amount: e.target.value }))}
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Currency</label>
                <Select 
                  value={newDistribution.currency} 
                  onValueChange={(v) => setNewDistribution(prev => ({ ...prev, currency: v }))}
                >
                  <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                    <SelectItem value="USD" className="text-white hover:bg-vault-gold/20">USD</SelectItem>
                    <SelectItem value="EUR" className="text-white hover:bg-vault-gold/20">EUR</SelectItem>
                    <SelectItem value="GBP" className="text-white hover:bg-vault-gold/20">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Asset Type</label>
              <Select 
                value={newDistribution.asset_type} 
                onValueChange={(v) => setNewDistribution(prev => ({ ...prev, asset_type: v }))}
              >
                <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                  <SelectItem value="cash" className="text-white hover:bg-vault-gold/20">Cash</SelectItem>
                  <SelectItem value="securities" className="text-white hover:bg-vault-gold/20">Securities</SelectItem>
                  <SelectItem value="property" className="text-white hover:bg-vault-gold/20">Property</SelectItem>
                  <SelectItem value="mixed" className="text-white hover:bg-vault-gold/20">Mixed Assets</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Scheduled Date</label>
              <Input
                type="date"
                value={newDistribution.scheduled_date}
                onChange={(e) => setNewDistribution(prev => ({ ...prev, scheduled_date: e.target.value }))}
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
            
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Description</label>
              <Textarea
                placeholder="Optional notes about this distribution..."
                value={newDistribution.description}
                onChange={(e) => setNewDistribution(prev => ({ ...prev, description: e.target.value }))}
                className="bg-[#05080F] border-vault-gold/20 text-white min-h-[80px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewDistribution(false)}
              className="border-vault-gold/30 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateDistribution}
              disabled={creatingDistribution || !newDistribution.title.trim()}
              className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark font-semibold"
            >
              {creatingDistribution ? (
                <>
                  <div className="w-4 h-4 border-2 border-vault-dark border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Distribution
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Dispute Dialog */}
      <Dialog open={showNewDispute} onOpenChange={setShowNewDispute}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading text-vault-gold flex items-center gap-2">
              <Scales className="w-6 h-6" />
              Record Dispute
            </DialogTitle>
            <DialogDescription className="text-vault-muted">
              Track a dispute, claim, or litigation matter
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Dispute Title *</label>
              <Input
                placeholder="e.g., Smith v. Trust - Beneficiary Distribution Claim"
                value={newDispute.title}
                onChange={(e) => setNewDispute(prev => ({ ...prev, title: e.target.value }))}
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Dispute Type</label>
                <Select 
                  value={newDispute.dispute_type} 
                  onValueChange={(v) => setNewDispute(prev => ({ ...prev, dispute_type: v }))}
                >
                  <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                    <SelectItem value="beneficiary" className="text-white hover:bg-vault-gold/20">Beneficiary</SelectItem>
                    <SelectItem value="trustee" className="text-white hover:bg-vault-gold/20">Trustee</SelectItem>
                    <SelectItem value="third_party" className="text-white hover:bg-vault-gold/20">Third Party</SelectItem>
                    <SelectItem value="tax" className="text-white hover:bg-vault-gold/20">Tax</SelectItem>
                    <SelectItem value="regulatory" className="text-white hover:bg-vault-gold/20">Regulatory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Priority</label>
                <Select 
                  value={newDispute.priority} 
                  onValueChange={(v) => setNewDispute(prev => ({ ...prev, priority: v }))}
                >
                  <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                    <SelectItem value="low" className="text-white hover:bg-vault-gold/20">Low</SelectItem>
                    <SelectItem value="medium" className="text-white hover:bg-vault-gold/20">Medium</SelectItem>
                    <SelectItem value="high" className="text-white hover:bg-vault-gold/20">High</SelectItem>
                    <SelectItem value="critical" className="text-white hover:bg-vault-gold/20">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Amount Claimed</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newDispute.amount_claimed}
                  onChange={(e) => setNewDispute(prev => ({ ...prev, amount_claimed: e.target.value }))}
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Currency</label>
                <Select 
                  value={newDispute.currency} 
                  onValueChange={(v) => setNewDispute(prev => ({ ...prev, currency: v }))}
                >
                  <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                    <SelectItem value="USD" className="text-white hover:bg-vault-gold/20">USD</SelectItem>
                    <SelectItem value="EUR" className="text-white hover:bg-vault-gold/20">EUR</SelectItem>
                    <SelectItem value="GBP" className="text-white hover:bg-vault-gold/20">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Case Number</label>
                <Input
                  placeholder="e.g., 2024-CV-12345"
                  value={newDispute.case_number}
                  onChange={(e) => setNewDispute(prev => ({ ...prev, case_number: e.target.value }))}
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Jurisdiction</label>
                <Input
                  placeholder="e.g., Superior Court, CA"
                  value={newDispute.jurisdiction}
                  onChange={(e) => setNewDispute(prev => ({ ...prev, jurisdiction: e.target.value }))}
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Description</label>
              <Textarea
                placeholder="Brief description of the dispute..."
                value={newDispute.description}
                onChange={(e) => setNewDispute(prev => ({ ...prev, description: e.target.value }))}
                className="bg-[#05080F] border-vault-gold/20 text-white min-h-[80px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewDispute(false)}
              className="border-vault-gold/30 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateDispute}
              disabled={creatingDispute || !newDispute.title.trim()}
              className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark font-semibold"
            >
              {creatingDispute ? (
                <>
                  <div className="w-4 h-4 border-2 border-vault-dark border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Record Dispute
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Insurance Policy Dialog */}
      <Dialog open={showNewInsurance} onOpenChange={setShowNewInsurance}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading text-vault-gold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              New Insurance Policy
            </DialogTitle>
            <DialogDescription className="text-vault-muted">
              Track a life insurance policy owned by or for the trust
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Policy Name *</label>
              <Input
                value={newInsurance.title}
                onChange={(e) => setNewInsurance(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., John Doe Life Insurance"
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Policy Type</label>
                <Select 
                  value={newInsurance.policy_type} 
                  onValueChange={(v) => setNewInsurance(prev => ({ ...prev, policy_type: v }))}
                >
                  <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                    <SelectItem value="whole_life" className="text-white hover:bg-vault-gold/20">Whole Life</SelectItem>
                    <SelectItem value="term" className="text-white hover:bg-vault-gold/20">Term Life</SelectItem>
                    <SelectItem value="universal" className="text-white hover:bg-vault-gold/20">Universal Life</SelectItem>
                    <SelectItem value="variable" className="text-white hover:bg-vault-gold/20">Variable Life</SelectItem>
                    <SelectItem value="group" className="text-white hover:bg-vault-gold/20">Group Life</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Policy Number</label>
                <Input
                  value={newInsurance.policy_number}
                  onChange={(e) => setNewInsurance(prev => ({ ...prev, policy_number: e.target.value }))}
                  placeholder="e.g., POL-123456"
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Insurance Carrier</label>
              <Input
                value={newInsurance.carrier_name}
                onChange={(e) => setNewInsurance(prev => ({ ...prev, carrier_name: e.target.value }))}
                placeholder="e.g., Northwestern Mutual"
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
            
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Insured Person</label>
              <Input
                value={newInsurance.insured_name}
                onChange={(e) => setNewInsurance(prev => ({ ...prev, insured_name: e.target.value }))}
                placeholder="Name of person insured"
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Death Benefit</label>
                <Input
                  type="number"
                  value={newInsurance.death_benefit}
                  onChange={(e) => setNewInsurance(prev => ({ ...prev, death_benefit: e.target.value }))}
                  placeholder="e.g., 500000"
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Currency</label>
                <Select 
                  value={newInsurance.currency} 
                  onValueChange={(v) => setNewInsurance(prev => ({ ...prev, currency: v }))}
                >
                  <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                    <SelectItem value="USD" className="text-white hover:bg-vault-gold/20">USD</SelectItem>
                    <SelectItem value="EUR" className="text-white hover:bg-vault-gold/20">EUR</SelectItem>
                    <SelectItem value="GBP" className="text-white hover:bg-vault-gold/20">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Premium Amount</label>
                <Input
                  type="number"
                  value={newInsurance.premium_amount}
                  onChange={(e) => setNewInsurance(prev => ({ ...prev, premium_amount: e.target.value }))}
                  placeholder="e.g., 500"
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Frequency</label>
                <Select 
                  value={newInsurance.premium_frequency} 
                  onValueChange={(v) => setNewInsurance(prev => ({ ...prev, premium_frequency: v }))}
                >
                  <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                    <SelectItem value="monthly" className="text-white hover:bg-vault-gold/20">Monthly</SelectItem>
                    <SelectItem value="quarterly" className="text-white hover:bg-vault-gold/20">Quarterly</SelectItem>
                    <SelectItem value="semi_annual" className="text-white hover:bg-vault-gold/20">Semi-Annual</SelectItem>
                    <SelectItem value="annual" className="text-white hover:bg-vault-gold/20">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Effective Date</label>
              <Input
                type="date"
                value={newInsurance.effective_date}
                onChange={(e) => setNewInsurance(prev => ({ ...prev, effective_date: e.target.value }))}
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewInsurance(false)}
              className="border-vault-gold/30 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateInsurance}
              disabled={creatingInsurance || !newInsurance.title.trim()}
              className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark font-semibold"
            >
              {creatingInsurance ? (
                <>
                  <div className="w-4 h-4 border-2 border-vault-dark border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Policy
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Compensation Dialog */}
      <Dialog open={showNewCompensation} onOpenChange={setShowNewCompensation}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading text-vault-gold flex items-center gap-2">
              <CurrencyDollar className="w-5 h-5" />
              Log Compensation
            </DialogTitle>
            <DialogDescription className="text-vault-muted">
              Record trustee or advisor compensation
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Title *</label>
              <Input
                value={newCompensation.title}
                onChange={(e) => setNewCompensation(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Q4 2024 Trustee Fee"
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Recipient Name *</label>
                <Input
                  value={newCompensation.recipient_name}
                  onChange={(e) => setNewCompensation(prev => ({ ...prev, recipient_name: e.target.value }))}
                  placeholder="John Smith"
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Role</label>
                <Select
                  value={newCompensation.recipient_role}
                  onValueChange={(value) => setNewCompensation(prev => ({ ...prev, recipient_role: value }))}
                >
                  <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1221] border-vault-gold/30">
                    <SelectItem value="trustee" className="text-white hover:bg-vault-gold/20">Trustee</SelectItem>
                    <SelectItem value="co_trustee" className="text-white hover:bg-vault-gold/20">Co-Trustee</SelectItem>
                    <SelectItem value="advisor" className="text-white hover:bg-vault-gold/20">Advisor</SelectItem>
                    <SelectItem value="counsel" className="text-white hover:bg-vault-gold/20">Counsel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Type</label>
                <Select
                  value={newCompensation.compensation_type}
                  onValueChange={(value) => setNewCompensation(prev => ({ ...prev, compensation_type: value }))}
                >
                  <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1221] border-vault-gold/30">
                    <SelectItem value="annual_fee" className="text-white hover:bg-vault-gold/20">Annual Fee</SelectItem>
                    <SelectItem value="transaction_fee" className="text-white hover:bg-vault-gold/20">Transaction Fee</SelectItem>
                    <SelectItem value="hourly" className="text-white hover:bg-vault-gold/20">Hourly</SelectItem>
                    <SelectItem value="special" className="text-white hover:bg-vault-gold/20">Special</SelectItem>
                    <SelectItem value="reimbursement" className="text-white hover:bg-vault-gold/20">Reimbursement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Amount</label>
                <Input
                  type="number"
                  value={newCompensation.amount}
                  onChange={(e) => setNewCompensation(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Period Start</label>
                <Input
                  type="date"
                  value={newCompensation.period_start}
                  onChange={(e) => setNewCompensation(prev => ({ ...prev, period_start: e.target.value }))}
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Period End</label>
                <Input
                  type="date"
                  value={newCompensation.period_end}
                  onChange={(e) => setNewCompensation(prev => ({ ...prev, period_end: e.target.value }))}
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Fiscal Year</label>
              <Input
                value={newCompensation.fiscal_year}
                onChange={(e) => setNewCompensation(prev => ({ ...prev, fiscal_year: e.target.value }))}
                placeholder="2024"
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
            
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Basis of Calculation</label>
              <Textarea
                value={newCompensation.basis_of_calculation}
                onChange={(e) => setNewCompensation(prev => ({ ...prev, basis_of_calculation: e.target.value }))}
                placeholder="e.g., 1% of trust assets under management"
                className="bg-[#05080F] border-vault-gold/20 text-white min-h-[60px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewCompensation(false)}
              className="border-vault-gold/30 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCompensation}
              disabled={creatingCompensation || !newCompensation.title.trim() || !newCompensation.recipient_name.trim()}
              className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark font-semibold"
            >
              {creatingCompensation ? (
                <>
                  <div className="w-4 h-4 border-2 border-vault-dark border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Log Entry
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
