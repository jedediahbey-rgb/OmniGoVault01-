import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import MonoChip from '../components/shared/MonoChip';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bank,
  Briefcase,
  Buildings,
  Car,
  CaretRight,
  ChartLine,
  CurrencyDollar,
  Eye,
  FileText,
  Funnel,
  Gavel,
  HandCoins,
  Hash,
  House,
  Key,
  Lock,
  MagnifyingGlass,
  Newspaper,
  Notebook,
  Package,
  PencilSimple,
  Plus,
  Scales,
  ShieldCheck,
  Trash,
  Users,
  Wallet
} from '@phosphor-icons/react';
import PageHeader from '../components/shared/PageHeader';
import GlassCard from '../components/shared/GlassCard';
import StatCard from '../components/shared/StatCard';
import IconBadge from '../components/shared/IconBadge';
import LedgerThreadSelector from '../components/governance/LedgerThreadSelector';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { RmIdDisplay } from '../components/ui/expandable-text';
import IconChip, { CurrencyDisplay } from '../components/ui/icon-chip';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '../components/ui/alert-dialog';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { humanizeSlug, formatCurrency as formatCurrencyUtil, formatCurrencyCompact, formatDate } from '../lib/utils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Module type configurations for governance records
const moduleConfig = {
  minutes: {
    icon: Newspaper,
    color: 'blue',
    label: 'Meeting Minutes',
    bgClass: 'bg-blue-500/20',
    borderClass: 'border-blue-500/30',
    textClass: 'text-blue-400',
  },
  distribution: {
    icon: HandCoins,
    color: 'green',
    label: 'Distribution',
    bgClass: 'bg-green-500/20',
    borderClass: 'border-green-500/30',
    textClass: 'text-green-400',
  },
  dispute: {
    icon: Scales,
    color: 'red',
    label: 'Dispute',
    bgClass: 'bg-red-500/20',
    borderClass: 'border-red-500/30',
    textClass: 'text-red-400',
  },
  insurance: {
    icon: ShieldCheck,
    color: 'purple',
    label: 'Insurance',
    bgClass: 'bg-purple-500/20',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-400',
  },
  compensation: {
    icon: CurrencyDollar,
    color: 'amber',
    label: 'Compensation',
    bgClass: 'bg-amber-500/20',
    borderClass: 'border-amber-500/30',
    textClass: 'text-amber-400',
  },
};

// Status badge configurations
const statusConfig = {
  draft: { label: 'Draft', bgClass: 'bg-amber-500/20', textClass: 'text-amber-400', borderClass: 'border-amber-500/30' },
  finalized: { label: 'Finalized', bgClass: 'bg-green-500/20', textClass: 'text-green-400', borderClass: 'border-green-500/30' },
  voided: { label: 'Voided', bgClass: 'bg-red-500/20', textClass: 'text-red-400', borderClass: 'border-red-500/30' },
  amended: { label: 'Amended', bgClass: 'bg-blue-500/20', textClass: 'text-blue-400', borderClass: 'border-blue-500/30' },
};

// Asset type configurations
const assetTypeConfig = {
  real_property: { 
    icon: House, 
    label: 'Real Property', 
    variant: 'emerald',
    bgClass: 'bg-emerald-500/20', 
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30'
  },
  personal_property: { 
    icon: Package, 
    label: 'Personal Property', 
    variant: 'blue',
    bgClass: 'bg-blue-500/20', 
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/30'
  },
  financial_account: { 
    icon: Bank, 
    label: 'Financial Account', 
    variant: 'purple',
    bgClass: 'bg-purple-500/20', 
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/30'
  },
  securities: { 
    icon: ChartLine, 
    label: 'Securities', 
    variant: 'cyan',
    bgClass: 'bg-cyan-500/20', 
    textClass: 'text-cyan-400',
    borderClass: 'border-cyan-500/30'
  },
  intellectual_property: { 
    icon: FileText, 
    label: 'Intellectual Property', 
    variant: 'amber',
    bgClass: 'bg-amber-500/20', 
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/30'
  },
  vehicle: { 
    icon: Car, 
    label: 'Vehicle', 
    variant: 'orange',
    bgClass: 'bg-orange-500/20', 
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500/30'
  },
  other: { 
    icon: Wallet, 
    label: 'Other', 
    variant: 'gray',
    bgClass: 'bg-gray-500/20', 
    textClass: 'text-gray-400',
    borderClass: 'border-gray-500/30'
  },
};

export default function PortfolioOverviewPage({ user }) {
  const { portfolioId } = useParams();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [trustProfile, setTrustProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [parties, setParties] = useState([]);
  const [ledger, setLedger] = useState({ entries: [], summary: {} });
  const [governanceRecords, setGovernanceRecords] = useState([]);
  const [subjectCategories, setSubjectCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  // Asset management state
  const [assetSearch, setAssetSearch] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState(null);
  
  // Asset dialog state
  const [showAssetDialog, setShowAssetDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [newAssetDescription, setNewAssetDescription] = useState('');
  const [newAssetType, setNewAssetType] = useState('real_property');
  const [newAssetSubjectCode, setNewAssetSubjectCode] = useState('10'); // Assets start at code 10
  const [newAssetValue, setNewAssetValue] = useState('');
  const [newAssetNotes, setNewAssetNotes] = useState('');
  const [assetTransactionType, setAssetTransactionType] = useState('deposit');
  const [assetThread, setAssetThread] = useState(null); // Ledger thread selector
  const [deleteAssetId, setDeleteAssetId] = useState(null);
  
  // Ledger entry dialog
  const [showLedgerDialog, setShowLedgerDialog] = useState(false);
  const [editingLedger, setEditingLedger] = useState(null);
  const [ledgerEntryType, setLedgerEntryType] = useState('deposit');
  const [ledgerSubjectCode, setLedgerSubjectCode] = useState('10'); // Ledger entries default to 10
  const [ledgerDescription, setLedgerDescription] = useState('');
  const [ledgerValue, setLedgerValue] = useState('');
  const [ledgerNotes, setLedgerNotes] = useState('');
  const [deleteLedgerId, setDeleteLedgerId] = useState(null);
  
  // Filters
  const [ledgerFilter, setLedgerFilter] = useState('all');
  
  // Filtered subject categories for different contexts
  // Asset categories: 10-19 (Real Estate, Vehicle, Financial, etc.)
  const assetCategories = subjectCategories.filter(cat => {
    const code = parseInt(cat.code, 10);
    return code >= 10 && code <= 19;
  });
  
  // Ledger categories: 10-19 for manual entries (excluding governance 20-29 and templates 00-09)
  const ledgerCategories = subjectCategories.filter(cat => {
    const code = parseInt(cat.code, 10);
    return code >= 10 && code <= 19;
  });
  
  // Filtered assets based on search and type filter
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = !assetSearch || 
      asset.description?.toLowerCase().includes(assetSearch.toLowerCase()) ||
      asset.rm_id?.toLowerCase().includes(assetSearch.toLowerCase()) ||
      asset.notes?.toLowerCase().includes(assetSearch.toLowerCase());
    const matchesType = assetTypeFilter === 'all' || asset.asset_type === assetTypeFilter;
    return matchesSearch && matchesType;
  });
  
  // Asset statistics
  const assetStats = {
    total: assets.length,
    totalValue: assets.reduce((sum, a) => sum + (a.value || 0), 0),
    active: assets.filter(a => a.status === 'active').length,
    byType: Object.keys(assetTypeConfig).reduce((acc, type) => {
      acc[type] = assets.filter(a => a.asset_type === type).length;
      return acc;
    }, {}),
  };
  
  // Party management state
  const [showPartyDialog, setShowPartyDialog] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [partyName, setPartyName] = useState('');
  const [partyRole, setPartyRole] = useState('beneficiary');
  const [partyAddress, setPartyAddress] = useState('');
  const [partyEmail, setPartyEmail] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [partyNotes, setPartyNotes] = useState('');
  const [deletePartyId, setDeletePartyId] = useState(null);
  
  // Trust Profile Edit
  const [showTrustDateDialog, setShowTrustDateDialog] = useState(false);
  const [editTrustDate, setEditTrustDate] = useState('');

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!portfolioId) return;
      
      try {
        const [portfolioRes, trustRes, docsRes, assetsRes, partiesRes, ledgerRes, categoriesRes, govRes] = await Promise.all([
          axios.get(`${API}/portfolios/${portfolioId}`),
          axios.get(`${API}/portfolios/${portfolioId}/trust-profile`).catch(() => ({ data: null })),
          axios.get(`${API}/documents?portfolio_id=${portfolioId}`).catch(() => ({ data: [] })),
          axios.get(`${API}/portfolios/${portfolioId}/assets`).catch(() => ({ data: [] })),
          axios.get(`${API}/portfolios/${portfolioId}/parties`).catch(() => ({ data: [] })),
          axios.get(`${API}/portfolios/${portfolioId}/ledger`).catch(() => ({ data: { entries: [], summary: {} } })),
          axios.get(`${API}/portfolios/${portfolioId}/subject-categories`).catch(() => ({ data: [] })),
          axios.get(`${API}/governance/v2/records?portfolio_id=${portfolioId}&limit=100`).catch(() => ({ data: { ok: false, data: { items: [] } } }))
        ]);
        
        if (isMounted) {
          setPortfolio(portfolioRes.data);
          setTrustProfile(trustRes.data);
          setDocuments(docsRes.data || []);
          setAssets(assetsRes.data || []);
          setParties(partiesRes.data || []);
          setLedger(ledgerRes.data || { entries: [], summary: {} });
          setSubjectCategories(categoriesRes.data || []);
          // Extract governance records from V2 API response
          const govData = govRes.data?.ok ? govRes.data.data?.items : (govRes.data?.items || []);
          setGovernanceRecords(govData || []);
          setLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Portfolio load error:', error);
          toast.error('Failed to load portfolio');
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [portfolioId]);

  const fetchPortfolioData = async () => {
    if (!portfolioId) return;
    setLoading(true);
    try {
      const [portfolioRes, trustRes, docsRes, assetsRes, partiesRes, ledgerRes, categoriesRes, govRes] = await Promise.all([
        axios.get(`${API}/portfolios/${portfolioId}`),
        axios.get(`${API}/portfolios/${portfolioId}/trust-profile`).catch(() => ({ data: null })),
        axios.get(`${API}/documents?portfolio_id=${portfolioId}`).catch(() => ({ data: [] })),
        axios.get(`${API}/portfolios/${portfolioId}/assets`).catch(() => ({ data: [] })),
        axios.get(`${API}/portfolios/${portfolioId}/parties`).catch(() => ({ data: [] })),
        axios.get(`${API}/portfolios/${portfolioId}/ledger`).catch(() => ({ data: { entries: [], summary: {} } })),
        axios.get(`${API}/portfolios/${portfolioId}/subject-categories`).catch(() => ({ data: [] })),
        axios.get(`${API}/governance/v2/records?portfolio_id=${portfolioId}&limit=100`).catch(() => ({ data: { ok: false, data: { items: [] } } }))
      ]);
      setPortfolio(portfolioRes.data);
      setTrustProfile(trustRes.data);
      setDocuments(docsRes.data || []);
      setAssets(assetsRes.data || []);
      setParties(partiesRes.data || []);
      setLedger(ledgerRes.data || { entries: [], summary: {} });
      setSubjectCategories(categoriesRes.data || []);
      // Extract governance records from V2 API response
      const govData = govRes.data?.ok ? govRes.data.data?.items : (govRes.data?.items || []);
      setGovernanceRecords(govData || []);
    } catch (error) {
      console.error('Portfolio refresh error:', error);
      toast.error('Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  const updatePortfolio = async () => {
    try {
      await axios.put(`${API}/portfolios/${portfolioId}`, {
        name: editName,
        description: editDescription
      });
      setPortfolio({ ...portfolio, name: editName, description: editDescription });
      setEditDialogOpen(false);
      toast.success('Portfolio updated');
    } catch (error) {
      toast.error('Failed to update portfolio');
    }
  };

  const updateTrustDate = async () => {
    if (!trustProfile?.profile_id) {
      toast.error('No trust profile to update');
      return;
    }
    try {
      await axios.put(`${API}/trust-profiles/${trustProfile.profile_id}`, {
        creation_date: editTrustDate
      });
      setTrustProfile({ ...trustProfile, creation_date: editTrustDate });
      setShowTrustDateDialog(false);
      toast.success('Date established updated');
    } catch (error) {
      toast.error('Failed to update date');
    }
  };

  const deletePortfolio = async () => {
    if (!confirm('Are you sure? This will delete all documents and data in this portfolio.')) return;
    try {
      await axios.delete(`${API}/portfolios/${portfolioId}`);
      toast.success('Portfolio deleted');
      navigate('/vault');
    } catch (error) {
      console.error('Delete portfolio error:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete portfolio');
    }
  };

  const addAsset = async () => {
    if (!newAssetDescription.trim()) {
      toast.error('Please enter an asset description');
      return;
    }
    try {
      // Build request with optional thread selection
      const requestData = {
        description: newAssetDescription,
        asset_type: newAssetType,
        value: newAssetValue ? parseFloat(newAssetValue) : null,
        transaction_type: assetTransactionType,
        notes: newAssetNotes,
      };
      
      // If a thread is selected, pass the relation_key to link to existing thread
      if (assetThread?.subject_id) {
        requestData.relation_key = assetThread.subject_id;
      }
      
      const response = await axios.post(`${API}/portfolios/${portfolioId}/assets`, requestData);
      setAssets([...assets, response.data]);
      // Refresh ledger to show new entry
      const ledgerRes = await axios.get(`${API}/portfolios/${portfolioId}/ledger`);
      setLedger(ledgerRes.data);
      setShowAssetDialog(false);
      resetAssetForm();
      toast.success('Asset added with RM-ID: ' + response.data.rm_id);
    } catch (error) {
      console.error('Add asset error:', error);
      toast.error('Failed to add asset');
    }
  };

  const updateAsset = async () => {
    if (!editingAsset || !newAssetDescription.trim()) {
      toast.error('Please enter an asset description');
      return;
    }
    try {
      const response = await axios.put(`${API}/assets/${editingAsset.asset_id}`, {
        description: newAssetDescription,
        asset_type: newAssetType,
        value: newAssetValue ? parseFloat(newAssetValue) : null,
        notes: newAssetNotes
      });
      setAssets(assets.map(a => a.asset_id === editingAsset.asset_id ? response.data : a));
      setShowAssetDialog(false);
      resetAssetForm();
      toast.success('Asset updated');
    } catch (error) {
      toast.error('Failed to update asset');
    }
  };

  const confirmDeleteAsset = async () => {
    if (!deleteAssetId) return;
    try {
      await axios.delete(`${API}/assets/${deleteAssetId}`);
      setAssets(assets.filter(a => a.asset_id !== deleteAssetId));
      // Refresh ledger
      const ledgerRes = await axios.get(`${API}/portfolios/${portfolioId}/ledger`);
      setLedger(ledgerRes.data);
      setDeleteAssetId(null);
      toast.success('Asset removed');
    } catch (error) {
      toast.error('Failed to remove asset');
    }
  };

  const openEditAsset = (asset) => {
    setEditingAsset(asset);
    setNewAssetDescription(asset.description || '');
    setNewAssetType(asset.asset_type || 'real_property');
    setNewAssetSubjectCode(asset.subject_code || '10'); // Default to 10 for assets
    setNewAssetValue(asset.value ? String(asset.value) : '');
    setNewAssetNotes(asset.notes || '');
    setShowAssetDialog(true);
  };

  const addLedgerEntry = async () => {
    if (!ledgerDescription.trim()) {
      toast.error('Please enter a description');
      return;
    }
    try {
      await axios.post(`${API}/portfolios/${portfolioId}/ledger`, {
        entry_type: ledgerEntryType,
        subject_code: ledgerSubjectCode,
        description: ledgerDescription,
        value: ledgerValue ? parseFloat(ledgerValue) : null,
        balance_effect: ledgerEntryType === 'deposit' || ledgerEntryType === 'transfer_in' ? 'credit' : 'debit',
        notes: ledgerNotes
      });
      // Refresh ledger
      const ledgerRes = await axios.get(`${API}/portfolios/${portfolioId}/ledger`);
      setLedger(ledgerRes.data);
      setShowLedgerDialog(false);
      resetLedgerForm();
      toast.success('Ledger entry added');
    } catch (error) {
      toast.error('Failed to add ledger entry');
    }
  };

  const updateLedgerEntry = async () => {
    if (!editingLedger || !ledgerDescription.trim()) {
      toast.error('Please enter a description');
      return;
    }
    try {
      await axios.put(`${API}/ledger/${editingLedger.entry_id}`, {
        description: ledgerDescription,
        value: ledgerValue ? parseFloat(ledgerValue) : null,
        notes: ledgerNotes
      });
      // Refresh ledger
      const ledgerRes = await axios.get(`${API}/portfolios/${portfolioId}/ledger`);
      setLedger(ledgerRes.data);
      setShowLedgerDialog(false);
      resetLedgerForm();
      toast.success('Ledger entry updated');
    } catch (error) {
      toast.error('Failed to update ledger entry');
    }
  };

  const confirmDeleteLedger = async () => {
    if (!deleteLedgerId) return;
    try {
      await axios.delete(`${API}/ledger/${deleteLedgerId}`);
      // Refresh ledger
      const ledgerRes = await axios.get(`${API}/portfolios/${portfolioId}/ledger`);
      setLedger(ledgerRes.data);
      setDeleteLedgerId(null);
      toast.success('Ledger entry deleted');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete ledger entry');
    }
  };

  const openEditLedger = (entry) => {
    setEditingLedger(entry);
    setLedgerEntryType(entry.entry_type || 'deposit');
    setLedgerSubjectCode(entry.subject_code || '10'); // Default to 10 for ledger
    setLedgerDescription(entry.description || '');
    setLedgerValue(entry.value ? String(entry.value) : '');
    setLedgerNotes(entry.notes || '');
    setShowLedgerDialog(true);
  };

  const resetAssetForm = () => {
    setEditingAsset(null);
    setNewAssetDescription('');
    setNewAssetType('real_property');
    setNewAssetSubjectCode('10'); // Reset to 10 for assets
    setNewAssetValue('');
    setNewAssetNotes('');
    setAssetTransactionType('deposit');
    setAssetThread(null); // Reset ledger thread selection
  };

  const resetLedgerForm = () => {
    setEditingLedger(null);
    setLedgerEntryType('deposit');
    setLedgerSubjectCode('10'); // Reset to 10 for manual ledger entries
    setLedgerDescription('');
    setLedgerValue('');
    setLedgerNotes('');
  };

  // Party CRUD functions
  const addParty = async () => {
    if (!partyName.trim()) {
      toast.error('Please enter a party name');
      return;
    }
    try {
      const response = await axios.post(`${API}/portfolios/${portfolioId}/parties`, {
        name: partyName,
        role: partyRole,
        address: partyAddress,
        email: partyEmail,
        phone: partyPhone,
        notes: partyNotes
      });
      setParties([...parties, response.data]);
      setShowPartyDialog(false);
      resetPartyForm();
      toast.success('Party added');
    } catch (error) {
      toast.error('Failed to add party');
    }
  };

  const updateParty = async () => {
    if (!editingParty || !partyName.trim()) {
      toast.error('Please enter a party name');
      return;
    }
    try {
      const response = await axios.put(`${API}/parties/${editingParty.party_id}`, {
        name: partyName,
        role: partyRole,
        address: partyAddress,
        email: partyEmail,
        phone: partyPhone,
        notes: partyNotes
      });
      setParties(parties.map(p => p.party_id === editingParty.party_id ? response.data : p));
      setShowPartyDialog(false);
      resetPartyForm();
      toast.success('Party updated');
    } catch (error) {
      toast.error('Failed to update party');
    }
  };

  const confirmDeleteParty = async () => {
    if (!deletePartyId) return;
    try {
      await axios.delete(`${API}/parties/${deletePartyId}`);
      setParties(parties.filter(p => p.party_id !== deletePartyId));
      setDeletePartyId(null);
      toast.success('Party removed');
    } catch (error) {
      toast.error('Failed to remove party');
    }
  };

  const openEditParty = (party) => {
    setEditingParty(party);
    setPartyName(party.name || '');
    setPartyRole(party.role || 'beneficiary');
    setPartyAddress(party.address || '');
    setPartyEmail(party.email || '');
    setPartyPhone(party.phone || '');
    setPartyNotes(party.notes || '');
    setShowPartyDialog(true);
  };

  const resetPartyForm = () => {
    setEditingParty(null);
    setPartyName('');
    setPartyRole('beneficiary');
    setPartyAddress('');
    setPartyEmail('');
    setPartyPhone('');
    setPartyNotes('');
  };

  // Funnel ledger entries
  const filteredLedgerEntries = ledger.entries?.filter(entry => {
    if (ledgerFilter === 'all') return true;
    if (ledgerFilter === 'credits') return entry.balance_effect === 'credit';
    if (ledgerFilter === 'debits') return entry.balance_effect === 'debit';
    return entry.subject_code === ledgerFilter;
  }) || [];

  // Use shared formatCurrency utility
  const formatCurrency = formatCurrencyUtil;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/vault')}
        className="flex items-center gap-2 text-white/40 hover:text-white mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" weight="duotone" />
        Back to Dashboard
      </button>

      <PageHeader
        icon={ShieldCheck}
        title={portfolio?.name}
        subtitle={portfolio?.description || 'Portfolio workspace'}
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setEditName(portfolio?.name || '');
                setEditDescription(portfolio?.description || '');
                setEditDialogOpen(true);
              }}
              className="btn-secondary"
            >
              <PencilSimple className="w-4 h-4 mr-2" weight="duotone" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={deletePortfolio}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <Trash className="w-4 h-4" weight="duotone" />
            </Button>
          </div>
        }
      />

      {/* RM-ID Display - Mobile Optimized */}
      {(trustProfile?.rm_id_normalized || trustProfile?.rm_id_raw || trustProfile?.rm_record_id) && (
        <GlassCard className="mb-6 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <IconBadge icon={Hash} size="md" variant="gold" />
              <div className="sm:hidden">
                <p className="text-white/40 text-xs uppercase tracking-wider">
                  Main RM-ID {trustProfile?.rm_id_is_placeholder && <span className="text-yellow-400">(Temp)</span>}
                </p>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="hidden sm:block text-white/40 text-xs uppercase tracking-wider mb-1">
                Main RM-ID {trustProfile?.rm_id_is_placeholder && <span className="text-yellow-400">(Placeholder)</span>}
              </p>
              <RmIdDisplay 
                rmId={trustProfile.rm_id_raw || trustProfile.rm_record_id || 'Not set'} 
                className="text-base sm:text-lg"
              />
            </div>
            <Link 
              to={`/vault/portfolio/${portfolioId}/trust-profile`}
              className="text-white/40 hover:text-white text-sm whitespace-nowrap self-end sm:self-center"
            >
              Edit RM-ID →
            </Link>
          </div>
        </GlassCard>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Documents"
          value={documents.length}
          icon={Notebook}
        />
        <StatCard
          title="Assets"
          value={assets.length}
          icon={Briefcase}
        />
        <StatCard
          title="Trust Balance"
          value={
            <>
              <span className={`sm:hidden ${(ledger.summary?.balance || 0) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                {formatCurrencyCompact(ledger.summary?.balance || 0)}
              </span>
              <span className={`hidden sm:inline ${(ledger.summary?.balance || 0) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                {formatCurrency(ledger.summary?.balance || 0)}
              </span>
            </>
          }
          icon={CurrencyDollar}
          subtitle="Total res value"
          hideProgress={true}
        />
        <StatCard
          title="Parties"
          value={parties.length}
          icon={Users}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white/5 border border-white/10 mb-6 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2">Overview</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2">Docs</TabsTrigger>
          <TabsTrigger value="assets" className="text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2">Assets</TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2">Ledger</TabsTrigger>
          <TabsTrigger value="parties" className="text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2">Parties</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Recent Documents */}
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg text-white">Recent Documents</h3>
                <Link to="/templates" className="text-vault-gold text-sm hover:underline">
                  + New
                </Link>
              </div>
              {documents.slice(0, 3).map(doc => (
                <Link 
                  key={doc.document_id} 
                  to={`/vault/document/${doc.document_id}`}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300 ${
                    doc.is_locked 
                      ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30' 
                      : 'bg-gradient-to-br from-vault-gold/20 to-vault-gold/5 border border-vault-gold/30'
                  }`}>
                    {doc.is_locked ? (
                      <Lock className="w-4 h-4 text-emerald-400" weight="duotone" />
                    ) : (
                      <FileText className="w-4 h-4 text-vault-gold" weight="duotone" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-white line-clamp-2 text-sm">{doc.title}</p>
                    <p className="text-white/40 text-xs mt-0.5">{humanizeSlug(doc.document_type)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] sm:text-xs whitespace-nowrap ${
                      doc.is_locked ? 'bg-green-500/20 text-green-400' :
                      doc.status === 'final' ? 'bg-green-500/20 text-green-400' :
                      doc.status === 'signed' ? 'bg-vault-gold/20 text-vault-gold' :
                      'bg-white/10 text-white/50'
                    }`}>
                      {doc.is_locked ? 'Finalized' : doc.status}
                    </span>
                    {doc.rm_id && (
                      <MonoChip variant="gold" size="xs" truncateRmId maxLength={18} className="max-w-[120px] sm:max-w-[180px]">
                        {doc.sub_record_id || doc.rm_id}
                      </MonoChip>
                    )}
                  </div>
                </Link>
              ))}
              {documents.length === 0 && (
                <p className="text-white/30 text-sm text-center py-4">No documents yet</p>
              )}
            </GlassCard>

            {/* Trust Profile Summary */}
            <GlassCard className="overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg text-white">Trust Profile</h3>
                {trustProfile && (
                  <Link to={`/vault/portfolio/${portfolioId}/trust-profile`} className="text-vault-gold text-sm hover:underline">
                    Manage
                  </Link>
                )}
              </div>
              {trustProfile ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-1 sm:gap-2">
                    <span className="text-white/40 text-sm">Trust Name</span>
                    <span className="text-white min-w-0 break-words sm:text-right">{trustProfile.trust_name || '—'}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-1 sm:gap-2">
                    <span className="text-white/40 text-sm">RM-ID</span>
                    <span className="text-vault-gold font-mono text-sm min-w-0 break-words sm:text-right">
                      {trustProfile.rm_id_raw || trustProfile.rm_record_id || trustProfile.rm_id_details?.full_rm_id || '—'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-1 sm:gap-2">
                    <span className="text-white/40 text-sm">Date Established</span>
                    <div className="flex items-center gap-2 sm:justify-end">
                      <span className="text-white min-w-0 break-words">
                        {trustProfile.creation_date || trustProfile.date_established 
                          ? formatDate(trustProfile.creation_date || trustProfile.date_established) 
                          : formatDate(trustProfile.created_at)}
                      </span>
                      <button
                        onClick={() => {
                          setEditTrustDate(trustProfile.creation_date || trustProfile.date_established || '');
                          setShowTrustDateDialog(true);
                        }}
                        className="p-1 text-white/40 hover:text-vault-gold transition-colors"
                        title="Edit date"
                      >
                        <PencilSimple className="w-3.5 h-3.5" weight="duotone" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-white/30 text-sm mb-3">No trust profile yet</p>
                  <Button 
                    onClick={() => navigate(`/vault/portfolio/${portfolioId}/trust-profile`)} 
                    size="sm" 
                    className="btn-primary"
                  >
                    Create Trust Profile
                  </Button>
                </div>
              )}
            </GlassCard>
          </div>

          {/* Ledger Summary */}
          <GlassCard className="overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg text-white">Trust Ledger Summary</h3>
              <Button onClick={() => setActiveTab('ledger')} variant="ghost" size="sm" className="text-vault-gold">
                View Full Ledger
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
              {/* Deposits */}
              <div className="flex flex-col items-center p-3 sm:p-4 bg-green-500/10 rounded-lg border border-green-500/20 overflow-hidden">
                <IconChip variant="green" className="mb-3">
                  <ArrowDownRight />
                </IconChip>
                <div className="w-full overflow-hidden text-center">
                  <CurrencyDisplay value={ledger.summary?.total_deposits} variant="green" />
                </div>
                <p className="text-white/40 text-xs sm:text-sm mt-1">Total Deposits</p>
              </div>
              
              {/* Withdrawals */}
              <div className="flex flex-col items-center p-3 sm:p-4 bg-red-500/10 rounded-lg border border-red-500/20 overflow-hidden">
                <IconChip variant="red" className="mb-3">
                  <ArrowUpRight />
                </IconChip>
                <div className="w-full overflow-hidden text-center">
                  <CurrencyDisplay value={ledger.summary?.total_withdrawals} variant="red" />
                </div>
                <p className="text-white/40 text-xs sm:text-sm mt-1">Total Withdrawals</p>
              </div>
              
              {/* Balance */}
              <div className="flex flex-col items-center p-3 sm:p-4 bg-vault-gold/10 rounded-lg border border-vault-gold/20 overflow-hidden">
                <IconChip variant="gold" className="mb-3">
                  <CurrencyDollar />
                </IconChip>
                <div className="w-full overflow-hidden text-center">
                  <CurrencyDisplay value={ledger.summary?.balance} variant="auto" />
                </div>
                <p className="text-white/40 text-xs sm:text-sm mt-1">Current Balance</p>
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg text-white">Documents</h3>
              <Link to="/templates">
                <Button className="btn-primary">
                  <Plus className="w-4 h-4 mr-2" weight="duotone" /> New Document
                </Button>
              </Link>
            </div>
            
            <div className="space-y-2">
              {documents.map(doc => (
                <Link
                  key={doc.document_id}
                  to={`/vault/document/${doc.document_id}`}
                  className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-white/5 hover:border-vault-gold/30 bg-white/5 hover:bg-white/10 transition-all"
                >
                  <IconChip variant={doc.is_locked ? 'green' : 'gold'} size="sm">
                    {doc.is_locked ? <Lock /> : <FileText />}
                  </IconChip>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-white font-medium truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="text-white/40">{humanizeSlug(doc.document_type)}</span>
                      {doc.sub_record_id && (
                        <span className="text-vault-gold/60 font-mono truncate max-w-[120px]">{doc.sub_record_id}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={`px-2 py-1 rounded text-[10px] sm:text-xs whitespace-nowrap ${
                      doc.is_locked ? 'bg-green-500/20 text-green-400' :
                      doc.status === 'final' ? 'bg-green-500/20 text-green-400' :
                      doc.status === 'signed' ? 'bg-vault-gold/20 text-vault-gold' :
                      'bg-white/10 text-white/50'
                    }`}>
                      {doc.is_locked ? 'Finalized' : doc.status}
                    </span>
                    <CaretRight className="w-4 h-4 text-white/30" weight="duotone" />
                  </div>
                </Link>
              ))}
              {documents.length === 0 && (
                <p className="text-white/30 text-center py-8">No documents in this portfolio</p>
              )}
            </div>
          </GlassCard>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets" className="mt-6">
          <GlassCard>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-heading text-lg text-white">Trust Assets</h3>
                <p className="text-white/40 text-sm">Manage res (property) held in the trust</p>
              </div>
              <Button onClick={() => { resetAssetForm(); setShowAssetDialog(true); }} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" weight="duotone" /> Add Asset
              </Button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 p-3 sm:p-4 bg-white/5 rounded-lg">
              <div className="min-w-0">
                <p className="text-white/40 text-xs uppercase">Total Assets</p>
                <p className="text-white text-lg sm:text-xl font-heading tabular-nums">{assetStats.total}</p>
              </div>
              <div className="min-w-0">
                <p className="text-white/40 text-xs uppercase">Active</p>
                <p className="text-green-400 text-lg sm:text-xl font-heading tabular-nums">{assetStats.active}</p>
              </div>
              <div className="min-w-0 col-span-2 sm:col-span-1">
                <p className="text-white/40 text-xs uppercase">Total Value</p>
                <p className="text-vault-gold text-lg sm:text-xl font-heading tabular-nums truncate">
                  {assetStats.totalValue > 0 ? formatCurrency(assetStats.totalValue) : '-'}
                </p>
              </div>
              <div className="min-w-0 col-span-2 sm:col-span-1">
                <p className="text-white/40 text-xs uppercase">Top Type</p>
                <p className="text-white text-sm sm:text-base font-heading truncate">
                  {Object.entries(assetStats.byType).sort((a, b) => b[1] - a[1])[0]?.[1] > 0 
                    ? assetTypeConfig[Object.entries(assetStats.byType).sort((a, b) => b[1] - a[1])[0][0]]?.label || 'None'
                    : 'None'}
                </p>
              </div>
            </div>

            {/* Search and Filter */}
            {assets.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    placeholder="Search assets..."
                    value={assetSearch}
                    onChange={e => setAssetSearch(e.target.value)}
                    className="pl-9 bg-white/5 border-white/10"
                  />
                </div>
                <Select value={assetTypeFilter} onValueChange={setAssetTypeFilter}>
                  <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent className="bg-vault-navy border-white/10">
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(assetTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Assets List */}
            {filteredAssets.length > 0 ? (
              <div className="space-y-3">
                {filteredAssets.map(asset => {
                  const typeConfig = assetTypeConfig[asset.asset_type] || assetTypeConfig.other;
                  const TypeIcon = typeConfig.icon;
                  
                  return (
                    <div 
                      key={asset.asset_id} 
                      className={`flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-white/5 border transition-all cursor-pointer group ${
                        selectedAsset?.asset_id === asset.asset_id 
                          ? 'border-vault-gold/50 bg-vault-gold/5' 
                          : 'border-white/5 hover:border-white/20 hover:bg-white/10'
                      }`}
                      onClick={() => setSelectedAsset(selectedAsset?.asset_id === asset.asset_id ? null : asset)}
                    >
                      {/* Type Icon */}
                      <IconBadge icon={TypeIcon} size="md" variant={typeConfig.variant || 'default'} />

                      {/* Content */}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-white font-medium truncate group-hover:text-vault-gold transition-colors pr-2">
                              {asset.description}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-sm flex-wrap">
                              <span className={`${typeConfig.textClass} flex-shrink-0`}>{typeConfig.label}</span>
                              {asset.rm_id && (
                                <>
                                  <span className="text-white/20">•</span>
                                  <MonoChip variant="gold" size="xs" truncateRmId maxLength={18} className="max-w-[120px] sm:max-w-none">{asset.rm_id}</MonoChip>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 mt-2 sm:mt-0">
                            {asset.value && (
                              <span className="text-white font-medium text-sm whitespace-nowrap">
                                {formatCurrency(asset.value)}
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded text-xs ${
                              asset.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              asset.status === 'transferred_out' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              'bg-white/10 text-white/50 border border-white/10'
                            }`}>
                              {asset.status}
                            </span>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {selectedAsset?.asset_id === asset.asset_id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 pt-3 border-t border-white/10"
                          >
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-white/40 text-xs uppercase mb-1">Subject Category</p>
                                <p className="text-white">{asset.subject_name || 'General'}</p>
                              </div>
                              <div>
                                <p className="text-white/40 text-xs uppercase mb-1">Added</p>
                                <p className="text-white">{new Date(asset.created_at).toLocaleDateString()}</p>
                              </div>
                              {asset.notes && (
                                <div className="col-span-2">
                                  <p className="text-white/40 text-xs uppercase mb-1">Notes</p>
                                  <p className="text-white/80">{asset.notes}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-white/20 hover:bg-white/10"
                                onClick={(e) => { e.stopPropagation(); openEditAsset(asset); }}
                              >
                                <PencilSimple className="w-4 h-4 mr-1" weight="duotone" /> Edit
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                                onClick={(e) => { e.stopPropagation(); setDeleteAssetId(asset.asset_id); }}
                              >
                                <Trash className="w-4 h-4 mr-1" weight="duotone" /> Delete
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* Expand Indicator */}
                      <div className="flex-shrink-0">
                        <Eye className={`w-5 h-5 transition-colors ${
                          selectedAsset?.asset_id === asset.asset_id ? 'text-vault-gold' : 'text-white/20 group-hover:text-white/40'
                        }`} weight="duotone" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : assets.length > 0 ? (
              <div className="text-center py-8">
                <MagnifyingGlass className="w-12 h-12 mx-auto text-white/20 mb-3" />
                <p className="text-white/40 mb-2">No assets match your search</p>
                <Button variant="ghost" onClick={() => { setAssetSearch(''); setAssetTypeFilter('all'); }}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 mx-auto text-vault-gold/30 mb-3" />
                <p className="text-white/40 mb-2">No assets in this trust yet</p>
                <p className="text-white/30 text-sm mb-4">Add real property, financial accounts, securities, and other trust res</p>
                <Button onClick={() => { resetAssetForm(); setShowAssetDialog(true); }} className="btn-primary">
                  <Plus className="w-4 h-4 mr-2" weight="duotone" /> Add First Asset
                </Button>
              </div>
            )}

            {/* Filter Results Count */}
            {assets.length > 0 && (
              <p className="text-white/30 text-xs mt-4 text-center">
                Showing {filteredAssets.length} of {assets.length} assets
              </p>
            )}
          </GlassCard>
        </TabsContent>

        {/* Ledger Tab */}
        <TabsContent value="ledger" className="mt-6">
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading text-lg text-white">Trust Ledger</h3>
                <p className="text-white/40 text-sm">Track all governance activity in the trust</p>
              </div>
              <Link to="/ledger">
                <Button variant="ghost" className="text-vault-gold text-sm">
                  View Full Ledger →
                </Button>
              </Link>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 p-3 sm:p-4 bg-white/5 rounded-lg overflow-hidden">
              <div className="min-w-0">
                <p className="text-white/40 text-xs uppercase">Total Records</p>
                <p className="text-white text-lg sm:text-xl font-heading tabular-nums">{governanceRecords.length}</p>
              </div>
              <div className="min-w-0">
                <p className="text-white/40 text-xs uppercase">Drafts</p>
                <p className="text-amber-400 text-lg sm:text-xl font-heading tabular-nums">
                  {governanceRecords.filter(r => r.status === 'draft').length}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-white/40 text-xs uppercase">Finalized</p>
                <p className="text-green-400 text-lg sm:text-xl font-heading tabular-nums">
                  {governanceRecords.filter(r => r.status === 'finalized').length}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-white/40 text-xs uppercase">This Month</p>
                <p className="text-blue-400 text-lg sm:text-xl font-heading tabular-nums">
                  {governanceRecords.filter(r => {
                    const date = new Date(r.created_at);
                    const now = new Date();
                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
            </div>

            {/* Records List */}
            {governanceRecords.length > 0 ? (
              <div className="space-y-3">
                {governanceRecords.map(record => {
                  const config = moduleConfig[record.module_type] || moduleConfig.minutes;
                  const status = statusConfig[record.status] || statusConfig.draft;
                  const Icon = config.icon;
                  const moduleMap = {
                    minutes: 'meetings',
                    distribution: 'distributions',
                    dispute: 'disputes',
                    insurance: 'insurance',
                    compensation: 'compensation',
                  };
                  const module = moduleMap[record.module_type] || record.module_type;
                  const recordLink = `/vault/governance/${module}/${record.id}`;

                  return (
                    <Link key={record.id} to={recordLink}>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-vault-gold/30 transition-all group">
                        {/* Icon */}
                        <IconBadge icon={Icon} size="md" variant={config.variant || 'default'} />

                        {/* Content */}
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-white font-medium truncate group-hover:text-vault-gold transition-colors pr-2">
                                {record.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 text-sm flex-wrap">
                                <span className={`${config.textClass} flex-shrink-0`}>{config.label}</span>
                                {record.rm_id && (
                                  <>
                                    <span className="text-white/20">•</span>
                                    <MonoChip variant="muted" size="xs" truncateRmId maxLength={18} className="max-w-[120px] sm:max-w-none">{record.rm_id}</MonoChip>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 mt-2 sm:mt-0">
                              <Badge className={`${status.bgClass} ${status.textClass} ${status.borderClass} border text-xs`}>
                                {status.label}
                              </Badge>
                              <span className="text-white/40 text-xs whitespace-nowrap">
                                {new Date(record.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Arrow */}
                        <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-vault-gold transition-colors flex-shrink-0" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Gavel className="w-12 h-12 mx-auto text-vault-gold/30 mb-3" />
                <p className="text-white/40 mb-4">No governance records yet</p>
                <Link to="/vault/governance">
                  <Button className="btn-primary">
                    <Plus className="w-4 h-4 mr-2" weight="duotone" />
                    Create First Record
                  </Button>
                </Link>
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* Parties Tab */}
        <TabsContent value="parties" className="mt-6">
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg text-white">Trust Parties</h3>
              <Button onClick={() => { resetPartyForm(); setShowPartyDialog(true); }} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" weight="duotone" /> Add Party
              </Button>
            </div>
            {parties.length > 0 ? (
              <div className="space-y-3">
                {parties.map(party => (
                  <div key={party.party_id} className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
                    <IconBadge icon={Users} size="md" variant="gold" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium">{party.name}</p>
                      <p className="text-vault-gold text-sm capitalize">{party.role?.replace('_', ' ')}</p>
                      {party.email && <p className="text-white/40 text-sm truncate">{party.email}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => openEditParty(party)}
                        className="text-white/40 hover:text-white p-2"
                        title="Edit party"
                      >
                        <PencilSimple className="w-4 h-4" weight="duotone" />
                      </button>
                      <button
                        onClick={() => setDeletePartyId(party.party_id)}
                        className="text-red-400 hover:text-red-300 p-2"
                        title="Delete party"
                      >
                        <Trash className="w-4 h-4" weight="duotone" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/30 text-center py-8">No parties defined. Add grantors, trustees, and beneficiaries.</p>
            )}
          </GlassCard>
        </TabsContent>
      </Tabs>

      {/* Edit Portfolio Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-vault-navy border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-heading">Edit Portfolio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-white/60 text-sm mb-2 block">Name</label>
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Description</label>
              <Textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={updatePortfolio} className="btn-primary">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Asset Dialog */}
      <Dialog open={showAssetDialog} onOpenChange={(open) => { if (!open) resetAssetForm(); setShowAssetDialog(open); }}>
        <DialogContent 
          className="bg-vault-navy border-white/10"
          onInteractOutside={(e) => {
            const target = e.target;
            if (target?.closest?.('[data-radix-select-content]') || 
                target?.closest?.('[role="listbox"]') ||
                target?.closest?.('[data-radix-popper-content-wrapper]')) {
              e.preventDefault();
            }
          }}
          onPointerDownOutside={(e) => {
            const target = e.target;
            if (target?.closest?.('[data-radix-select-content]') || 
                target?.closest?.('[role="listbox"]') ||
                target?.closest?.('[data-radix-popper-content-wrapper]')) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-white font-heading">
              {editingAsset ? 'Edit Asset' : 'Add Asset to Trust'}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              {editingAsset ? 'Update asset details (RM-ID cannot be changed)' : 'A unique RM-ID will be randomly generated for this asset'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingAsset && (
              <div className="p-3 bg-vault-gold/10 rounded-lg">
                <p className="text-white/40 text-xs uppercase">Current RM-ID</p>
                <p className="text-vault-gold font-mono">{editingAsset.rm_id}</p>
              </div>
            )}
            {!editingAsset && (
              <LedgerThreadSelector
                portfolioId={portfolioId}
                moduleType={`asset_${newAssetType}`}
                selectedSubject={assetThread}
                onSubjectChange={setAssetThread}
              />
            )}
            <div>
              <label className="text-white/60 text-sm mb-2 block">Description *</label>
              <Input
                placeholder="e.g., Real Property at 123 Main St"
                value={newAssetDescription}
                onChange={e => setNewAssetDescription(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Asset Type</label>
              <Select value={newAssetType} onValueChange={setNewAssetType}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-vault-navy border-white/10 z-[100]" position="popper" sideOffset={4}>
                  <SelectItem value="real_property">Real Property</SelectItem>
                  <SelectItem value="personal_property">Personal Property</SelectItem>
                  <SelectItem value="financial_account">Financial Account</SelectItem>
                  <SelectItem value="securities">Securities</SelectItem>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="intellectual_property">Intellectual Property</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!editingAsset && (
              <div>
                <label className="text-white/60 text-sm mb-2 block">Transaction Type</label>
                <Select value={assetTransactionType} onValueChange={setAssetTransactionType}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-vault-navy border-white/10 z-[100]" position="popper" sideOffset={4}>
                    <SelectItem value="deposit">Special Deposit into Trust</SelectItem>
                    <SelectItem value="transfer_in">Transfer In</SelectItem>
                    <SelectItem value="transfer_out">Transfer Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-white/60 text-sm mb-2 block">Value (Optional)</label>
              <Input
                type="number"
                placeholder="e.g., 250000"
                value={newAssetValue}
                onChange={e => setNewAssetValue(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Notes (Optional)</label>
              <Textarea
                placeholder="Additional details about this asset..."
                value={newAssetNotes}
                onChange={e => setNewAssetNotes(e.target.value)}
                className="bg-white/5 border-white/10"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowAssetDialog(false); resetAssetForm(); }}>Cancel</Button>
            <Button onClick={editingAsset ? updateAsset : addAsset} className="btn-primary">
              {editingAsset ? 'Save Changes' : 'Add Asset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Ledger Entry Dialog */}
      <Dialog open={showLedgerDialog} onOpenChange={(open) => { if (!open) resetLedgerForm(); setShowLedgerDialog(open); }}>
        <DialogContent 
          className="bg-vault-navy border-white/10"
          onInteractOutside={(e) => {
            const target = e.target;
            if (target?.closest?.('[data-radix-select-content]') || 
                target?.closest?.('[role="listbox"]') ||
                target?.closest?.('[data-radix-popper-content-wrapper]')) {
              e.preventDefault();
            }
          }}
          onPointerDownOutside={(e) => {
            const target = e.target;
            if (target?.closest?.('[data-radix-select-content]') || 
                target?.closest?.('[role="listbox"]') ||
                target?.closest?.('[data-radix-popper-content-wrapper]')) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-white font-heading">
              {editingLedger ? 'Edit Ledger Entry' : 'Add Ledger Entry'}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              {editingLedger ? 'Update entry details (RM-ID cannot be changed)' : 'Record a transaction in the trust ledger'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingLedger && (
              <div className="p-3 bg-vault-gold/10 rounded-lg">
                <p className="text-white/40 text-xs uppercase">Current RM-ID</p>
                <p className="text-vault-gold font-mono">{editingLedger.rm_id}</p>
              </div>
            )}
            {!editingLedger && (
              <>
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Subject Category</label>
                  <Select value={ledgerSubjectCode} onValueChange={setLedgerSubjectCode}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-vault-navy border-white/10 z-[100]" position="popper" sideOffset={4}>
                      {ledgerCategories.map(cat => (
                        <SelectItem key={cat.code} value={cat.code}>
                          {cat.code} - {cat.name}
                        </SelectItem>
                      ))}
                      {ledgerCategories.length === 0 && (
                        <SelectItem value="10">10 - Real Estate</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Entry Type</label>
                  <Select value={ledgerEntryType} onValueChange={setLedgerEntryType}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-vault-navy border-white/10 z-[100]" position="popper" sideOffset={4}>
                      <SelectItem value="deposit">Deposit (Credit)</SelectItem>
                      <SelectItem value="withdrawal">Withdrawal (Debit)</SelectItem>
                      <SelectItem value="transfer_in">Transfer In (Credit)</SelectItem>
                      <SelectItem value="transfer_out">Transfer Out (Debit)</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div>
              <label className="text-white/60 text-sm mb-2 block">Description *</label>
              <Input
                placeholder="e.g., Initial corpus deposit"
                value={ledgerDescription}
                onChange={e => setLedgerDescription(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Value (Optional)</label>
              <Input
                type="number"
                placeholder="e.g., 10000"
                value={ledgerValue}
                onChange={e => setLedgerValue(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Notes (Optional)</label>
              <Textarea
                placeholder="Additional details..."
                value={ledgerNotes}
                onChange={e => setLedgerNotes(e.target.value)}
                className="bg-white/5 border-white/10"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowLedgerDialog(false); resetLedgerForm(); }}>Cancel</Button>
            <Button onClick={editingLedger ? updateLedgerEntry : addLedgerEntry} className="btn-primary">
              {editingLedger ? 'Save Changes' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Asset Confirmation */}
      <AlertDialog open={!!deleteAssetId} onOpenChange={(open) => !open && setDeleteAssetId(null)}>
        <AlertDialogContent className="bg-vault-navy border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Asset?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This will remove the asset and create a withdrawal entry in the ledger. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAsset} className="bg-red-600 hover:bg-red-700">
              Delete Asset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Ledger Entry Confirmation */}
      <AlertDialog open={!!deleteLedgerId} onOpenChange={(open) => !open && setDeleteLedgerId(null)}>
        <AlertDialogContent className="bg-vault-navy border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Ledger Entry?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This will permanently remove this ledger entry. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteLedger} className="bg-red-600 hover:bg-red-700">
              Delete Entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Party Dialog */}
      <Dialog open={showPartyDialog} onOpenChange={(open) => { if (!open) resetPartyForm(); setShowPartyDialog(open); }}>
        <DialogContent 
          className="bg-vault-navy border-white/10"
          onInteractOutside={(e) => {
            const target = e.target;
            if (target?.closest?.('[data-radix-select-content]') || 
                target?.closest?.('[role="listbox"]') ||
                target?.closest?.('[data-radix-popper-content-wrapper]')) {
              e.preventDefault();
            }
          }}
          onPointerDownOutside={(e) => {
            const target = e.target;
            if (target?.closest?.('[data-radix-select-content]') || 
                target?.closest?.('[role="listbox"]') ||
                target?.closest?.('[data-radix-popper-content-wrapper]')) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-white font-heading">
              {editingParty ? 'Edit Party' : 'Add Trust Party'}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              {editingParty ? 'Update party details' : 'Add a grantor, trustee, beneficiary, or other party'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-white/60 text-sm mb-2 block">Name *</label>
                <Input
                  value={partyName}
                  onChange={e => setPartyName(e.target.value)}
                  placeholder="Full legal name"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <label className="text-white/60 text-sm mb-2 block">Role *</label>
                <Select value={partyRole} onValueChange={setPartyRole}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-vault-navy border-white/10 z-[100]" position="popper" sideOffset={4}>
                    <SelectItem value="grantor">Grantor / Settlor</SelectItem>
                    <SelectItem value="trustee">Trustee</SelectItem>
                    <SelectItem value="co_trustee">Co-Trustee</SelectItem>
                    <SelectItem value="beneficiary">Beneficiary</SelectItem>
                    <SelectItem value="registered_agent">Registered Agent</SelectItem>
                    <SelectItem value="witness">Witness</SelectItem>
                    <SelectItem value="notary">Notary</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Address</label>
              <Textarea
                value={partyAddress}
                onChange={e => setPartyAddress(e.target.value)}
                placeholder="Street address, city, state, zip"
                className="bg-white/5 border-white/10"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-white/60 text-sm mb-2 block">Email</label>
                <Input
                  type="email"
                  value={partyEmail}
                  onChange={e => setPartyEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <label className="text-white/60 text-sm mb-2 block">Phone</label>
                <Input
                  type="tel"
                  value={partyPhone}
                  onChange={e => setPartyPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Notes</label>
              <Textarea
                value={partyNotes}
                onChange={e => setPartyNotes(e.target.value)}
                placeholder="Additional notes..."
                className="bg-white/5 border-white/10"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowPartyDialog(false); resetPartyForm(); }}>Cancel</Button>
            <Button onClick={editingParty ? updateParty : addParty} className="btn-primary">
              {editingParty ? 'Save Changes' : 'Add Party'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Party Confirmation */}
      <AlertDialog open={!!deletePartyId} onOpenChange={(open) => !open && setDeletePartyId(null)}>
        <AlertDialogContent className="bg-vault-navy border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Party?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This will permanently remove this party from the trust. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteParty} className="bg-red-600 hover:bg-red-700">
              Delete Party
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Trust Date Dialog */}
      <Dialog open={showTrustDateDialog} onOpenChange={setShowTrustDateDialog}>
        <DialogContent className="bg-vault-navy border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Date Established</DialogTitle>
            <DialogDescription className="text-white/60">
              Update the date when the trust was established.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-white/60 text-sm mb-2 block">Date Established</label>
            <Input
              type="date"
              value={editTrustDate}
              onChange={(e) => setEditTrustDate(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowTrustDateDialog(false)}>Cancel</Button>
            <Button onClick={updateTrustDate} className="btn-primary">Save Date</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
