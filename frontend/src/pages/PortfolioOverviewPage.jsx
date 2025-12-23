import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  FolderArchive, FileText, Users, Briefcase, Bell, Settings,
  Plus, ArrowLeft, Edit2, Trash2, Download, ChevronRight, Clock
} from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import GlassCard from '../components/shared/GlassCard';
import StatCard from '../components/shared/StatCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { staggerContainer, fadeInUp } from '../lib/motion';
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  // Asset dialog state
  const [showAssetDialog, setShowAssetDialog] = useState(false);
  const [newAssetDescription, setNewAssetDescription] = useState('');
  const [newAssetType, setNewAssetType] = useState('');
  const [newAssetValue, setNewAssetValue] = useState('');

  useEffect(() => {
    fetchPortfolioData();
  }, [portfolioId]);

  const fetchPortfolioData = async () => {
    try {
      const [portfolioRes, trustRes, docsRes, assetsRes, partiesRes] = await Promise.all([
        axios.get(`${API}/portfolios/${portfolioId}`),
        axios.get(`${API}/portfolios/${portfolioId}/trust-profile`).catch(() => ({ data: null })),
        axios.get(`${API}/documents?portfolio_id=${portfolioId}`),
        axios.get(`${API}/portfolios/${portfolioId}/assets`),
        axios.get(`${API}/portfolios/${portfolioId}/parties`).catch(() => ({ data: [] }))
      ]);
      setPortfolio(portfolioRes.data);
      setTrustProfile(trustRes.data);
      setDocuments(docsRes.data || []);
      setAssets(assetsRes.data || []);
      setParties(partiesRes.data || []);
      setEditName(portfolioRes.data.name);
      setEditDescription(portfolioRes.data.description || '');
    } catch (error) {
      toast.error('Failed to load portfolio');
      navigate('/vault');
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
      toast.error('Failed to delete portfolio');
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
        asset_type: newAssetType || 'General',
        value: newAssetValue ? parseFloat(newAssetValue) : null
      });
      setAssets([...assets, response.data]);
      setShowAssetDialog(false);
      setNewAssetDescription('');
      setNewAssetType('');
      setNewAssetValue('');
      toast.success('Asset added');
    } catch (error) {
      toast.error('Failed to add asset');
    }
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
            <Button onClick={() => setEditDialogOpen(true)} variant="outline" className="btn-secondary">
              <Edit2 className="w-4 h-4 mr-2" /> Edit
            </Button>
            <Button onClick={deletePortfolio} variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      {/* Portfolio Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="bg-white/5 border border-white/10 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold">
            Overview
          </TabsTrigger>
          <TabsTrigger value="trust-profile" className="data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold">
            Trust Profile
          </TabsTrigger>
          <TabsTrigger value="parties" className="data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold">
            Parties
          </TabsTrigger>
          <TabsTrigger value="assets" className="data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold">
            Assets
          </TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold">
            Documents
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <motion.div variants={staggerContainer} initial="initial" animate="animate">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <motion.div variants={fadeInUp}>
                <StatCard label="Documents" value={documents.length} icon={FileText} variant="gold" />
              </motion.div>
              <motion.div variants={fadeInUp}>
                <StatCard label="Assets" value={assets.length} icon={Briefcase} variant="blue" />
              </motion.div>
              <motion.div variants={fadeInUp}>
                <StatCard label="Parties" value={parties.length} icon={Users} />
              </motion.div>
              <motion.div variants={fadeInUp}>
                <StatCard label="RM-ID" value={trustProfile?.rm_record_id ? '1' : '0'} icon={Bell} />
              </motion.div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassCard>
                <h3 className="font-heading text-lg text-white mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Button onClick={() => navigate('/templates')} className="w-full justify-start btn-secondary">
                    <Plus className="w-4 h-4 mr-2" /> New Document from Template
                  </Button>
                  <Button onClick={() => setActiveTab('trust-profile')} className="w-full justify-start btn-secondary">
                    <Settings className="w-4 h-4 mr-2" /> Configure Trust Profile
                  </Button>
                </div>
              </GlassCard>

              <GlassCard>
                <h3 className="font-heading text-lg text-white mb-4">Recent Documents</h3>
                {documents.slice(0, 3).map(doc => (
                  <div
                    key={doc.document_id}
                    onClick={() => navigate(`/vault/document/${doc.document_id}`)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-white/40" />
                    <span className="text-white/80 flex-1 truncate">{doc.title}</span>
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  </div>
                ))}
                {documents.length === 0 && (
                  <p className="text-white/40 text-sm">No documents yet</p>
                )}
              </GlassCard>
            </div>
          </motion.div>
        </TabsContent>

        {/* Trust Profile Tab */}
        <TabsContent value="trust-profile" className="mt-6">
          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-lg text-white">Trust Profile</h3>
              <Button
                onClick={() => navigate(`/vault/portfolio/${portfolioId}/trust-profile`)}
                className="btn-primary"
              >
                {trustProfile ? 'Edit Profile' : 'Create Profile'}
              </Button>
            </div>
            
            {trustProfile ? (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Trust Name</p>
                  <p className="text-white">{trustProfile.trust_name}</p>
                </div>
                {trustProfile.rm_record_id && (
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1">RM Record ID</p>
                    <p className="text-vault-gold font-mono">{trustProfile.rm_record_id}</p>
                    <p className="text-white/30 text-xs mt-1">Internal recordkeeping identifier</p>
                  </div>
                )}
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Grantor</p>
                  <p className="text-white">{trustProfile.grantor_name || '-'}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Trustee</p>
                  <p className="text-white">{trustProfile.trustee_name || '-'}</p>
                </div>
              </div>
            ) : (
              <p className="text-white/50">No trust profile configured. Create one to enable RM-ID tracking and document generation.</p>
            )}
          </GlassCard>
        </TabsContent>

        {/* Parties Tab */}
        <TabsContent value="parties" className="mt-6">
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg text-white">Parties Directory</h3>
              <Button className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> Add Party
              </Button>
            </div>
            {parties.length > 0 ? (
              <div className="space-y-2">
                {parties.map(party => (
                  <div key={party.party_id} className="flex items-center gap-4 p-3 rounded-lg bg-white/5">
                    <Users className="w-5 h-5 text-white/40" />
                    <div className="flex-1">
                      <p className="text-white">{party.name}</p>
                      <p className="text-white/40 text-xs">{party.role} • {party.party_type}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/50">No parties added yet.</p>
            )}
          </GlassCard>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets" className="mt-6">
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg text-white">Assets Ledger</h3>
              <Button onClick={() => setShowAssetDialog(true)} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> Add Asset
              </Button>
            </div>
            {assets.length > 0 ? (
              <div className="space-y-2">
                {assets.map(asset => (
                  <div key={asset.asset_id} className="flex items-center gap-4 p-3 rounded-lg bg-white/5">
                    <Briefcase className="w-5 h-5 text-vault-gold" />
                    <div className="flex-1">
                      <p className="text-white">{asset.description}</p>
                      <p className="text-white/40 text-xs">{asset.asset_type}</p>
                    </div>
                    {asset.value && <p className="text-vault-gold">${asset.value}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/50">No assets recorded yet.</p>
            )}
          </GlassCard>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg text-white">Documents</h3>
              <Button onClick={() => navigate('/templates')} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> New Document
              </Button>
            </div>
            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div
                    key={doc.document_id}
                    onClick={() => navigate(`/vault/document/${doc.document_id}`)}
                    className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <FileText className="w-5 h-5 text-white/40" />
                    <div className="flex-1">
                      <p className="text-white">{doc.title}</p>
                      <p className="text-white/40 text-xs">
                        {doc.document_type} • {doc.status}
                        {doc.sub_record_id && ` • ${doc.sub_record_id}`}
                      </p>
                    </div>
                    <span className="text-white/30 text-xs">
                      {new Date(doc.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/50">No documents yet. Create one from templates.</p>
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
              <Input
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

      {/* Add Asset Dialog */}
      <Dialog open={showAssetDialog} onOpenChange={setShowAssetDialog}>
        <DialogContent className="bg-vault-navy border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-heading">Add Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
              <Input
                placeholder="e.g., Real Estate, Vehicle, Securities"
                value={newAssetType}
                onChange={e => setNewAssetType(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
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
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAssetDialog(false)}>Cancel</Button>
            <Button onClick={addAsset} className="btn-primary">Add Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
