import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Plus,
  UsersThree,
  Users,
  FileText,
  PencilSimpleLine,
  CaretRight,
  MagnifyingGlass,
  FunnelSimple,
  DotsThree,
  Lock,
  CheckCircle,
  Warning,
  Sparkle,
  ShieldCheck,
  Buildings,
  Scales,
  Bank,
  Briefcase,
  House,
  Handshake,
  Clock
} from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
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
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { staggerContainer, fadeInUp } from '../lib/motion';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Vault type icons
const vaultTypeIcons = {
  TRUST: Handshake,
  ESTATE: House,
  LOAN: Bank,
  PRIVATE_EQUITY: Briefcase,
  REAL_ESTATE: Buildings,
  LITIGATION: Scales,
  CORPORATE: Buildings,
  OTHER: UsersThree
};

// Status colors and labels
const statusConfig = {
  DRAFT: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Draft' },
  ACTIVE: { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Active' },
  SUSPENDED: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Suspended' },
  CLOSED: { color: 'bg-vault-muted/20 text-vault-muted border-vault-muted/30', label: 'Closed' },
  ARCHIVED: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: 'Archived' }
};

export default function WorkspacesPage({ user }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [vaults, setVaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // Create vault modal
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('create') === 'true');
  const [creating, setCreating] = useState(false);
  const [newVault, setNewVault] = useState({
    name: '',
    description: '',
    vault_type: 'TRUST'
  });
  
  // Vault types for selection
  const [vaultTypes, setVaultTypes] = useState([]);

  // Fetch vaults
  const fetchVaults = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/vaults`, { withCredentials: true });
      setVaults(response.data.vaults || []);
    } catch (error) {
      console.error('Error fetching vaults:', error);
      toast.error('Failed to load vaults');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch vault types
  const fetchVaultTypes = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/vaults/vault-types`);
      setVaultTypes(response.data.types || []);
    } catch (error) {
      console.error('Error fetching vault types:', error);
    }
  }, []);

  useEffect(() => {
    fetchVaults();
    fetchVaultTypes();
  }, [fetchVaults, fetchVaultTypes]);

  // Create new vault
  const handleCreateVault = async () => {
    if (!newVault.name.trim()) {
      toast.error('Please enter a vault name');
      return;
    }

    try {
      setCreating(true);
      const response = await axios.post(`${API}/vaults`, newVault, { withCredentials: true });
      toast.success('Vault created successfully');
      setShowCreateModal(false);
      setNewVault({ name: '', description: '', vault_type: 'TRUST' });
      // Navigate to the new vault
      navigate(`/vault/workspaces/${response.data.vault_id}`);
    } catch (error) {
      console.error('Error creating vault:', error);
      const message = error.response?.data?.detail || 'Failed to create vault';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  // Filter vaults
  const filteredVaults = vaults.filter(vault => {
    const matchesSearch = vault.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vault.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vault.status === statusFilter;
    const matchesType = typeFilter === 'all' || vault.vault_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Group vaults by status
  const activeVaults = filteredVaults.filter(v => v.status === 'ACTIVE');
  const draftVaults = filteredVaults.filter(v => v.status === 'DRAFT');
  const otherVaults = filteredVaults.filter(v => !['ACTIVE', 'DRAFT'].includes(v.status));

  return (
    <div className="min-h-screen bg-vault-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
              <UsersThree className="w-6 h-6 sm:w-7 sm:h-7 text-vault-gold" weight="duotone" />
              Shared Workspaces
            </h1>
            <p className="text-vault-muted text-xs sm:text-sm mt-1">
              Collaborative vaults for trust governance and document{' '}
              <span style={{ whiteSpace: 'nowrap' }}>management.</span>
            </p>
          </div>
          
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-vault-gold hover:bg-vault-gold/90 text-vault-navy font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" weight="bold" />
            New Vault
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vault-muted" />
            <Input
              placeholder="Search vaults..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-vault-navy border-vault-gold/20 text-white"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-vault-navy border-vault-gold/20">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-vault-navy border-vault-gold/20">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {vaultTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && vaults.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center">
              <UsersThree className="w-10 h-10 text-vault-gold" weight="duotone" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No vaults yet</h3>
            <p className="text-vault-muted mb-6 max-w-md mx-auto">
              Create your first shared vault to start collaborating on trust documents with your team.
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-vault-gold hover:bg-vault-gold/90 text-vault-navy font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" weight="bold" />
              Create Your First Vault
            </Button>
          </motion.div>
        )}

        {/* Vaults Grid */}
        {!loading && vaults.length > 0 && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-8"
          >
            {/* Active Vaults */}
            {activeVaults.length > 0 && (
              <VaultSection
                title="Active Vaults"
                icon={<CheckCircle className="w-5 h-5 text-green-400" weight="fill" />}
                vaults={activeVaults}
                onVaultClick={(v) => navigate(`/vault/workspaces/${v.vault_id}`)}
              />
            )}

            {/* Draft Vaults */}
            {draftVaults.length > 0 && (
              <VaultSection
                title="Draft Vaults"
                icon={<PencilSimpleLine className="w-5 h-5 text-yellow-400" weight="duotone" />}
                vaults={draftVaults}
                onVaultClick={(v) => navigate(`/vault/workspaces/${v.vault_id}`)}
              />
            )}

            {/* Other Vaults */}
            {otherVaults.length > 0 && (
              <VaultSection
                title="Archived & Closed"
                icon={<Lock className="w-5 h-5 text-vault-muted" />}
                vaults={otherVaults}
                onVaultClick={(v) => navigate(`/vault/workspaces/${v.vault_id}`)}
              />
            )}

            {/* No Results */}
            {filteredVaults.length === 0 && (
              <div className="text-center py-12">
                <p className="text-vault-muted">No vaults match your filters</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Create Vault Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="bg-vault-dark border-vault-gold/20 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-vault-gold" />
                Create New Vault
              </DialogTitle>
              <DialogDescription className="text-vault-muted">
                Set up a shared workspace for collaborative governance
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm text-vault-muted block mb-2">Vault Name *</label>
                <Input
                  placeholder="e.g., Smith Family Trust"
                  value={newVault.name}
                  onChange={(e) => setNewVault({ ...newVault, name: e.target.value })}
                  className="bg-vault-navy border-vault-gold/20"
                />
              </div>

              <div>
                <label className="text-sm text-vault-muted block mb-2">Description</label>
                <Textarea
                  placeholder="Brief description of this vault's purpose..."
                  value={newVault.description}
                  onChange={(e) => setNewVault({ ...newVault, description: e.target.value })}
                  className="bg-vault-navy border-vault-gold/20 min-h-[80px]"
                />
              </div>

              <div>
                <label className="text-sm text-vault-muted block mb-2">Vault Type</label>
                <Select
                  value={newVault.vault_type}
                  onValueChange={(value) => setNewVault({ ...newVault, vault_type: value })}
                >
                  <SelectTrigger className="bg-vault-navy border-vault-gold/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {vaultTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          {(() => {
                            const Icon = vaultTypeIcons[type.value] || Lock;
                            return <Icon className="w-4 h-4" />;
                          })()}
                          {type.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setShowCreateModal(false)}
                className="text-vault-muted"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateVault}
                disabled={creating || !newVault.name.trim()}
                className="bg-vault-gold hover:bg-vault-gold/90 text-vault-navy"
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-vault-navy border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Vault
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Vault Section Component
function VaultSection({ title, icon, vaults, onVaultClick }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <Badge variant="outline" className="border-vault-gold/30 text-vault-muted text-xs">
          {vaults.length}
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vaults.map((vault) => (
          <VaultCard key={vault.vault_id} vault={vault} onClick={() => onVaultClick(vault)} />
        ))}
      </div>
    </div>
  );
}

// Vault Card Component
function VaultCard({ vault, onClick }) {
  const Icon = vaultTypeIcons[vault.vault_type] || Lock;
  const status = statusConfig[vault.status] || statusConfig.DRAFT;
  
  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className="bg-vault-navy/50 border-vault-gold/10 hover:border-vault-gold/30 transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center">
              <Icon className="w-5 h-5 text-vault-gold" weight="duotone" />
            </div>
            <Badge variant="outline" className={status.color}>
              {status.label}
            </Badge>
          </div>
          
          <h3 className="font-semibold text-white mb-1 line-clamp-1">{vault.name}</h3>
          {vault.description && (
            <p className="text-sm text-vault-muted line-clamp-2 mb-3">{vault.description}</p>
          )}
          
          <div className="flex items-center gap-4 text-xs text-vault-muted">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {vault.participant_count || 1}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {vault.document_count || 0}
            </span>
            <span className="flex items-center gap-1 ml-auto">
              <Clock className="w-3.5 h-3.5" />
              {new Date(vault.updated_at || vault.created_at).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
