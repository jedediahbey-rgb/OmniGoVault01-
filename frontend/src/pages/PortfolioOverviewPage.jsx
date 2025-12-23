import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  FolderArchive, FileText, Users, Briefcase,
  Plus, ArrowLeft, Edit2, Trash2, ChevronRight,
  DollarSign, Hash, Lock, Filter, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import GlassCard from '../components/shared/GlassCard';
import StatCard from '../components/shared/StatCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
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
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PortfolioOverviewPage({ user }) {
  const { portfolioId } = useParams();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [trustProfile, setTrustProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [parties, setParties] = useState([]);
  const [ledger, setLedger] = useState({ entries: [], summary: {} });
  const [subjectCategories, setSubjectCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  // Asset dialog state
  const [showAssetDialog, setShowAssetDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [newAssetDescription, setNewAssetDescription] = useState('');
  const [newAssetType, setNewAssetType] = useState('real_property');
  const [newAssetSubjectCode, setNewAssetSubjectCode] = useState('00');
  const [newAssetValue, setNewAssetValue] = useState('');
  const [newAssetNotes, setNewAssetNotes] = useState('');
  const [assetTransactionType, setAssetTransactionType] = useState('deposit');
  const [deleteAssetId, setDeleteAssetId] = useState(null);
  
  // Ledger entry dialog
  const [showLedgerDialog, setShowLedgerDialog] = useState(false);
  const [editingLedger, setEditingLedger] = useState(null);
  const [ledgerEntryType, setLedgerEntryType] = useState('deposit');
  const [ledgerSubjectCode, setLedgerSubjectCode] = useState('00');
  const [ledgerDescription, setLedgerDescription] = useState('');
  const [ledgerValue, setLedgerValue] = useState('');
  const [ledgerNotes, setLedgerNotes] = useState('');
  const [deleteLedgerId, setDeleteLedgerId] = useState(null);
  
  // Filters
  const [ledgerFilter, setLedgerFilter] = useState('all');

  useEffect(() => {
    fetchPortfolioData();
  }, [portfolioId]);

  const fetchPortfolioData = async () => {
    try {
      const [portfolioRes, trustRes, docsRes, assetsRes, partiesRes, ledgerRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/portfolios/${portfolioId}`),
        axios.get(`${API}/trust-profiles/by-portfolio/${portfolioId}`).catch(() => ({ data: null })),
        axios.get(`${API}/documents?portfolio_id=${portfolioId}`).catch(() => ({ data: [] })),
        axios.get(`${API}/portfolios/${portfolioId}/assets`).catch(() => ({ data: [] })),
        axios.get(`${API}/parties?portfolio_id=${portfolioId}`).catch(() => ({ data: [] })),
        axios.get(`${API}/portfolios/${portfolioId}/ledger`).catch(() => ({ data: { entries: [], summary: {} } })),
        axios.get(`${API}/portfolios/${portfolioId}/subject-categories`).catch(() => ({ data: [] }))
      ]);
      setPortfolio(portfolioRes.data);
      setTrustProfile(trustRes.data);
      setDocuments(docsRes.data || []);
      setAssets(assetsRes.data || []);
      setParties(partiesRes.data || []);
      setLedger(ledgerRes.data || { entries: [], summary: {} });
      setSubjectCategories(categoriesRes.data || []);
    } catch (error) {
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
      const response = await axios.post(`${API}/portfolios/${portfolioId}/assets`, {
        description: newAssetDescription,
        asset_type: newAssetType,
        subject_code: newAssetSubjectCode,
        value: newAssetValue ? parseFloat(newAssetValue) : null,
        transaction_type: assetTransactionType,
        notes: newAssetNotes
      });
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
    setNewAssetSubjectCode(asset.subject_code || '00');
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
    setLedgerSubjectCode(entry.subject_code || '00');
    setLedgerDescription(entry.description || '');
    setLedgerValue(entry.value ? String(entry.value) : '');
    setLedgerNotes(entry.notes || '');
    setShowLedgerDialog(true);
  };

  const resetAssetForm = () => {
    setEditingAsset(null);
    setNewAssetDescription('');
    setNewAssetType('real_property');
    setNewAssetSubjectCode('00');
    setNewAssetValue('');
    setNewAssetNotes('');
    setAssetTransactionType('deposit');
  };

  const resetLedgerForm = () => {
    setEditingLedger(null);
    setLedgerEntryType('deposit');
    setLedgerSubjectCode('00');
    setLedgerDescription('');
    setLedgerValue('');
    setLedgerNotes('');
  };

  // Filter ledger entries
  const filteredLedgerEntries = ledger.entries?.filter(entry => {
    if (ledgerFilter === 'all') return true;
    if (ledgerFilter === 'credits') return entry.balance_effect === 'credit';
    if (ledgerFilter === 'debits') return entry.balance_effect === 'debit';
    return entry.subject_code === ledgerFilter;
  }) || [];

  const formatCurrency = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/vault')}
        className="flex items-center gap-2 text-white/40 hover:text-white mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <PageHeader
        icon={FolderArchive}
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
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={deletePortfolio}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      {/* RM-ID Display */}
      {(trustProfile?.rm_id_normalized || trustProfile?.rm_id_raw || trustProfile?.rm_record_id) && (
        <GlassCard className="mb-6 flex items-center gap-4 p-4">
          <div className="w-10 h-10 rounded-lg bg-vault-gold/20 flex items-center justify-center">
            <Hash className="w-5 h-5 text-vault-gold" />
          </div>
          <div className="flex-1">
            <p className="text-white/40 text-xs uppercase tracking-wider">
              Main RM-ID {trustProfile?.rm_id_is_placeholder && <span className="text-yellow-400">(Placeholder)</span>}
            </p>
            <p className="text-vault-gold font-mono text-lg">
              {trustProfile.rm_id_raw || trustProfile.rm_record_id || 'Not set'}
            </p>
          </div>
          <Link 
            to={`/vault/portfolio/${portfolioId}/trust-profile`}
            className="text-white/40 hover:text-white text-sm"
          >
            Edit RM-ID →
          </Link>
        </GlassCard>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Documents"
          value={documents.length}
          icon={FileText}
        />
        <StatCard
          title="Assets"
          value={assets.length}
          icon={Briefcase}
        />
        <StatCard
          title="Trust Balance"
          value={formatCurrency(ledger.summary?.balance || 0)}
          icon={DollarSign}
          subtitle="Total res value"
        />
        <StatCard
          title="Parties"
          value={parties.length}
          icon={Users}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white/5 border border-white/10 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="ledger">Trust Ledger</TabsTrigger>
          <TabsTrigger value="parties">Parties</TabsTrigger>
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
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${
                    doc.is_locked ? 'bg-green-500/20' : 'bg-vault-gold/10'
                  }`}>
                    {doc.is_locked ? (
                      <Lock className="w-4 h-4 text-green-400" />
                    ) : (
                      <FileText className="w-4 h-4 text-vault-gold" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white truncate">{doc.title}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-white/40 text-xs">{doc.document_type}</p>
                      {doc.rm_id && (
                        <span className="text-vault-gold/60 text-xs font-mono">{doc.sub_record_id || doc.rm_id}</span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    doc.status === 'final' ? 'bg-green-500/20 text-green-400' :
                    doc.status === 'signed' ? 'bg-vault-gold/20 text-vault-gold' :
                    'bg-white/10 text-white/50'
                  }`}>
                    {doc.status}
                  </span>
                </Link>
              ))}
              {documents.length === 0 && (
                <p className="text-white/30 text-sm text-center py-4">No documents yet</p>
              )}
            </GlassCard>

            {/* Trust Profile Summary */}
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg text-white">Trust Profile</h3>
                {trustProfile && (
                  <Link to={`/vault/portfolio/${portfolioId}/trust-profile`} className="text-vault-gold text-sm hover:underline">
                    Manage
                  </Link>
                )}
              </div>
              {trustProfile ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-white/40">Trust Name</span>
                    <span className="text-white">{trustProfile.trust_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">RM-ID</span>
                    <span className="text-vault-gold font-mono">{trustProfile.rm_id_details?.full_rm_id || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Date Established</span>
                    <span className="text-white">{trustProfile.date_established || '-'}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-white/30 text-sm mb-3">No trust profile yet</p>
                  <Button 
                    onClick={() => navigate(`/vault/trust-profile/new?portfolio=${portfolioId}`)} 
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
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg text-white">Trust Ledger Summary</h3>
              <Button onClick={() => setActiveTab('ledger')} variant="ghost" size="sm" className="text-vault-gold">
                View Full Ledger
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <ArrowDownRight className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="text-green-400 text-xl font-heading">{formatCurrency(ledger.summary?.total_deposits)}</p>
                <p className="text-white/40 text-sm">Total Deposits</p>
              </div>
              <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <ArrowUpRight className="w-6 h-6 text-red-400 mx-auto mb-2" />
                <p className="text-red-400 text-xl font-heading">{formatCurrency(ledger.summary?.total_withdrawals)}</p>
                <p className="text-white/40 text-sm">Total Withdrawals</p>
              </div>
              <div className="text-center p-4 bg-vault-gold/10 rounded-lg border border-vault-gold/20">
                <DollarSign className="w-6 h-6 text-vault-gold mx-auto mb-2" />
                <p className="text-vault-gold text-xl font-heading">{formatCurrency(ledger.summary?.balance)}</p>
                <p className="text-white/40 text-sm">Current Balance</p>
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
                  <Plus className="w-4 h-4 mr-2" /> New Document
                </Button>
              </Link>
            </div>
            
            <div className="space-y-2">
              {documents.map(doc => (
                <Link
                  key={doc.document_id}
                  to={`/vault/document/${doc.document_id}`}
                  className="flex items-center gap-4 p-4 rounded-lg border border-white/5 hover:border-vault-gold/30 bg-white/5 hover:bg-white/10 transition-all"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    doc.is_locked ? 'bg-green-500/20' : 'bg-vault-gold/10'
                  }`}>
                    {doc.is_locked ? (
                      <Lock className="w-5 h-5 text-green-400" />
                    ) : (
                      <FileText className="w-5 h-5 text-vault-gold" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{doc.title}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-white/40">{doc.document_type}</span>
                      {doc.sub_record_id && (
                        <span className="text-vault-gold/60 font-mono">{doc.sub_record_id}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      doc.status === 'final' ? 'bg-green-500/20 text-green-400' :
                      doc.status === 'signed' ? 'bg-vault-gold/20 text-vault-gold' :
                      'bg-white/10 text-white/50'
                    }`}>
                      {doc.is_locked ? 'Finalized' : doc.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-white/30" />
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg text-white">Assets Ledger</h3>
              <Button onClick={() => { resetAssetForm(); setShowAssetDialog(true); }} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> Add Asset
              </Button>
            </div>

            {/* Assets Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-white/40 text-xs uppercase tracking-wider py-3 px-2">RM-ID</th>
                    <th className="text-left text-white/40 text-xs uppercase tracking-wider py-3 px-2">Subject</th>
                    <th className="text-left text-white/40 text-xs uppercase tracking-wider py-3 px-2">Description</th>
                    <th className="text-left text-white/40 text-xs uppercase tracking-wider py-3 px-2">Type</th>
                    <th className="text-right text-white/40 text-xs uppercase tracking-wider py-3 px-2">Value</th>
                    <th className="text-center text-white/40 text-xs uppercase tracking-wider py-3 px-2">Status</th>
                    <th className="text-right text-white/40 text-xs uppercase tracking-wider py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(asset => (
                    <tr key={asset.asset_id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-2">
                        <span className="text-vault-gold font-mono text-sm block whitespace-nowrap">{asset.rm_id || '-'}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-white/60 text-sm">{asset.subject_name || 'General'}</span>
                        <span className="text-white/30 text-xs ml-1">({asset.subject_code || '00'})</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-white">{asset.description}</span>
                        {asset.notes && (
                          <p className="text-white/40 text-xs mt-1">{asset.notes}</p>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-white/60 capitalize">{asset.asset_type?.replace('_', ' ')}</span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="text-white">{asset.value ? formatCurrency(asset.value) : '-'}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          asset.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          asset.status === 'transferred_out' ? 'bg-red-500/20 text-red-400' :
                          'bg-white/10 text-white/50'
                        }`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditAsset(asset)}
                            className="text-white/40 hover:text-white p-1"
                            title="Edit asset"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteAssetId(asset.asset_id)}
                            className="text-red-400 hover:text-red-300 p-1"
                            title="Delete asset"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {assets.length === 0 && (
                <p className="text-white/30 text-center py-8">No assets recorded</p>
              )}
            </div>
          </GlassCard>
        </TabsContent>

        {/* Ledger Tab */}
        <TabsContent value="ledger" className="mt-6">
          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-heading text-lg text-white">Trust Ledger</h3>
                <p className="text-white/40 text-sm">Track all res (property) movements in and out of the trust</p>
              </div>
              <Button onClick={() => { resetLedgerForm(); setShowLedgerDialog(true); }} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> Add Entry
              </Button>
            </div>

            {/* Balance Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-white/5 rounded-lg">
              <div>
                <p className="text-white/40 text-xs uppercase">Entries</p>
                <p className="text-white text-xl font-heading">{ledger.summary?.entry_count || 0}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase">Total Credits</p>
                <p className="text-green-400 text-xl font-heading">{formatCurrency(ledger.summary?.total_deposits)}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase">Total Debits</p>
                <p className="text-red-400 text-xl font-heading">{formatCurrency(ledger.summary?.total_withdrawals)}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase">Balance</p>
                <p className="text-vault-gold text-xl font-heading">{formatCurrency(ledger.summary?.balance)}</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-4 h-4 text-white/40" />
              <Select value={ledgerFilter} onValueChange={setLedgerFilter}>
                <SelectTrigger className="w-40 bg-white/5 border-white/10">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent className="bg-vault-navy border-white/10">
                  <SelectItem value="all">All Entries</SelectItem>
                  <SelectItem value="credits">Credits Only</SelectItem>
                  <SelectItem value="debits">Debits Only</SelectItem>
                  {subjectCategories.map(cat => (
                    <SelectItem key={cat.code} value={cat.code}>
                      {cat.code} - {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-white/40 text-sm">
                Showing {filteredLedgerEntries.length} of {ledger.entries?.length || 0} entries
              </span>
            </div>

            {/* Ledger Entries Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-white/40 text-xs uppercase tracking-wider py-3 px-2">Date</th>
                    <th className="text-left text-white/40 text-xs uppercase tracking-wider py-3 px-2">RM-ID</th>
                    <th className="text-left text-white/40 text-xs uppercase tracking-wider py-3 px-2">Subject</th>
                    <th className="text-left text-white/40 text-xs uppercase tracking-wider py-3 px-2">Type</th>
                    <th className="text-left text-white/40 text-xs uppercase tracking-wider py-3 px-2">Description</th>
                    <th className="text-right text-white/40 text-xs uppercase tracking-wider py-3 px-2">Credit</th>
                    <th className="text-right text-white/40 text-xs uppercase tracking-wider py-3 px-2">Debit</th>
                    <th className="text-right text-white/40 text-xs uppercase tracking-wider py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedgerEntries.map(entry => (
                    <tr key={entry.entry_id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-2">
                        <span className="text-white/60 text-sm">
                          {new Date(entry.recorded_date).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-vault-gold font-mono text-sm block whitespace-nowrap">{entry.rm_id}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-white/60 text-sm">{entry.subject_name || 'General'}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          entry.balance_effect === 'credit' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {entry.entry_type}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-white">{entry.description}</span>
                        {entry.notes && (
                          <p className="text-white/40 text-xs">{entry.notes}</p>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {entry.balance_effect === 'credit' && entry.value ? (
                          <span className="text-green-400">{formatCurrency(entry.value)}</span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {entry.balance_effect === 'debit' && entry.value ? (
                          <span className="text-red-400">{formatCurrency(entry.value)}</span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditLedger(entry)}
                            className="text-white/40 hover:text-white p-1"
                            title="Edit entry"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!entry.asset_id && (
                            <button
                              onClick={() => setDeleteLedgerId(entry.entry_id)}
                              className="text-red-400 hover:text-red-300 p-1"
                              title="Delete entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLedgerEntries.length === 0 && (
                <p className="text-white/30 text-center py-8">No ledger entries match filter</p>
              )}
            </div>
          </GlassCard>
        </TabsContent>

        {/* Parties Tab */}
        <TabsContent value="parties" className="mt-6">
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg text-white">Trust Parties</h3>
              <Button className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> Add Party
              </Button>
            </div>
            {parties.length > 0 ? (
              <div className="space-y-3">
                {parties.map(party => (
                  <div key={party.party_id} className="flex items-center gap-4 p-3 rounded-lg bg-white/5">
                    <div className="w-10 h-10 rounded-full bg-vault-gold/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-vault-gold" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white">{party.name}</p>
                      <p className="text-white/40 text-sm capitalize">{party.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/30 text-center py-8">No parties defined</p>
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
        <DialogContent className="bg-vault-navy border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-heading">
              {editingAsset ? 'Edit Asset' : 'Add Asset to Trust'}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              {editingAsset ? 'Update asset details (RM-ID cannot be changed)' : 'Assets will be assigned a unique RM-ID automatically'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingAsset && (
              <div className="p-3 bg-vault-gold/10 rounded-lg">
                <p className="text-white/40 text-xs uppercase">Current RM-ID</p>
                <p className="text-vault-gold font-mono">{editingAsset.rm_id}</p>
              </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/60 text-sm mb-2 block">Subject Category</label>
                <Select value={newAssetSubjectCode} onValueChange={setNewAssetSubjectCode} disabled={!!editingAsset}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-vault-navy border-white/10">
                    {subjectCategories.map(cat => (
                      <SelectItem key={cat.code} value={cat.code}>
                        {cat.code} - {cat.name}
                      </SelectItem>
                    ))}
                    {subjectCategories.length === 0 && (
                      <SelectItem value="00">00 - General</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-white/60 text-sm mb-2 block">Asset Type</label>
                <Select value={newAssetType} onValueChange={setNewAssetType}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-vault-navy border-white/10">
                    <SelectItem value="real_property">Real Property</SelectItem>
                    <SelectItem value="personal_property">Personal Property</SelectItem>
                    <SelectItem value="financial_account">Financial Account</SelectItem>
                    <SelectItem value="vehicle">Vehicle</SelectItem>
                    <SelectItem value="securities">Securities</SelectItem>
                    <SelectItem value="intellectual_property">Intellectual Property</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!editingAsset && (
              <div>
                <label className="text-white/60 text-sm mb-2 block">Transaction Type</label>
                <Select value={assetTransactionType} onValueChange={setAssetTransactionType}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-vault-navy border-white/10">
                    <SelectItem value="deposit">Deposit into Trust</SelectItem>
                    <SelectItem value="transfer_in">Transfer In</SelectItem>
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
        <DialogContent className="bg-vault-navy border-white/10">
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
                    <SelectContent className="bg-vault-navy border-white/10">
                      {subjectCategories.map(cat => (
                        <SelectItem key={cat.code} value={cat.code}>
                          {cat.code} - {cat.name}
                        </SelectItem>
                      ))}
                      {subjectCategories.length === 0 && (
                        <SelectItem value="00">00 - General</SelectItem>
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
                    <SelectContent className="bg-vault-navy border-white/10">
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
    </div>
  );
}
