/**
 * Black Archive Admin Page
 * 
 * Comprehensive admin interface for managing the Black Archive:
 * - Source CRUD (Primary Sources, Interpretations, Hypotheses)
 * - Claim/Dossier CRUD with conflict detection
 * - Trail CRUD for doctrine tracks
 * - Bulk operations and conflict scanning
 * - Statistics and overview
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import api from '../lib/api';
import {
  Archive,
  FileText,
  Folder,
  BookOpen,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Edit,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Upload,
  Download,
  Settings,
  BarChart3,
  Shield,
  Flag,
  Link as LinkIcon
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

// Source type options
const SOURCE_TYPES = [
  { value: 'PRIMARY_SOURCE', label: 'Primary Source', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'SUPPORTED_INTERPRETATION', label: 'Interpretation', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'HYPOTHESIS', label: 'Hypothesis', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
];

// Claim status options
const CLAIM_STATUSES = [
  { value: 'VERIFIED', label: 'Verified', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  { value: 'DISPUTED', label: 'Disputed', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertTriangle },
  { value: 'UNVERIFIED', label: 'Unverified', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Flag },
];

export default function ArchiveAdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Stats
  const [stats, setStats] = useState(null);
  
  // Sources
  const [sources, setSources] = useState([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState('');
  
  // Claims
  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimSearch, setClaimSearch] = useState('');
  const [claimStatusFilter, setClaimStatusFilter] = useState('');
  
  // Trails
  const [trails, setTrails] = useState([]);
  const [trailsLoading, setTrailsLoading] = useState(false);
  
  // Dialogs
  const [showSourceDialog, setShowSourceDialog] = useState(false);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [showTrailDialog, setShowTrailDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showConflictScan, setShowConflictScan] = useState(false);
  
  // Edit states
  const [editingSource, setEditingSource] = useState(null);
  const [editingClaim, setEditingClaim] = useState(null);
  const [editingTrail, setEditingTrail] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  
  // Conflict scan results
  const [conflictResults, setConflictResults] = useState(null);
  const [conflictLoading, setConflictLoading] = useState(false);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/api/archive/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Fetch sources
  const fetchSources = useCallback(async () => {
    setSourcesLoading(true);
    try {
      const params = new URLSearchParams();
      if (sourceSearch) params.append('search', sourceSearch);
      if (sourceTypeFilter) params.append('source_type', sourceTypeFilter);
      params.append('limit', '100');
      
      const response = await api.get(`/api/archive/sources?${params}`);
      setSources(response.data.sources || []);
    } catch (error) {
      console.error('Error fetching sources:', error);
      toast.error('Failed to load sources');
    } finally {
      setSourcesLoading(false);
    }
  }, [sourceSearch, sourceTypeFilter]);

  // Fetch claims
  const fetchClaims = useCallback(async () => {
    setClaimsLoading(true);
    try {
      const params = new URLSearchParams();
      if (claimSearch) params.append('search', claimSearch);
      if (claimStatusFilter) params.append('status', claimStatusFilter);
      params.append('limit', '100');
      
      const response = await api.get(`/api/archive/claims?${params}`);
      setClaims(response.data.claims || []);
    } catch (error) {
      console.error('Error fetching claims:', error);
      toast.error('Failed to load claims');
    } finally {
      setClaimsLoading(false);
    }
  }, [claimSearch, claimStatusFilter]);

  // Fetch trails
  const fetchTrails = useCallback(async () => {
    setTrailsLoading(true);
    try {
      const response = await api.get('/api/archive/trails');
      setTrails(response.data.trails || []);
    } catch (error) {
      console.error('Error fetching trails:', error);
      toast.error('Failed to load trails');
    } finally {
      setTrailsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      await fetchStats();
      setLoading(false);
    };
    init();
  }, [fetchStats]);

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'sources' && sources.length === 0) fetchSources();
    if (activeTab === 'claims' && claims.length === 0) fetchClaims();
    if (activeTab === 'trails' && trails.length === 0) fetchTrails();
  }, [activeTab, sources.length, claims.length, trails.length, fetchSources, fetchClaims, fetchTrails]);

  // Source CRUD
  const handleSaveSource = async (sourceData) => {
    try {
      if (editingSource?.source_id) {
        await api.put(`/api/archive/sources/${editingSource.source_id}`, sourceData);
        toast.success('Source updated');
      } else {
        await api.post('/api/archive/sources', sourceData);
        toast.success('Source created');
      }
      setShowSourceDialog(false);
      setEditingSource(null);
      fetchSources();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save source');
    }
  };

  const handleDeleteSource = async () => {
    if (!deleteItem?.source_id) return;
    try {
      await api.delete(`/api/archive/sources/${deleteItem.source_id}`);
      toast.success('Source deleted');
      setShowDeleteConfirm(false);
      setDeleteItem(null);
      fetchSources();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete source');
    }
  };

  // Claim CRUD
  const handleSaveClaim = async (claimData) => {
    try {
      if (editingClaim?.claim_id) {
        await api.put(`/api/archive/claims/${editingClaim.claim_id}`, claimData);
        toast.success('Claim updated');
      } else {
        await api.post('/api/archive/claims', claimData);
        toast.success('Claim created');
      }
      setShowClaimDialog(false);
      setEditingClaim(null);
      fetchClaims();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save claim');
    }
  };

  const handleDeleteClaim = async () => {
    if (!deleteItem?.claim_id) return;
    try {
      await api.delete(`/api/archive/claims/${deleteItem.claim_id}`);
      toast.success('Claim deleted');
      setShowDeleteConfirm(false);
      setDeleteItem(null);
      fetchClaims();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete claim');
    }
  };

  // Trail CRUD
  const handleSaveTrail = async (trailData) => {
    try {
      if (editingTrail?.trail_id) {
        await api.put(`/api/archive/trails/${editingTrail.trail_id}`, trailData);
        toast.success('Trail updated');
      } else {
        await api.post('/api/archive/trails', trailData);
        toast.success('Trail created');
      }
      setShowTrailDialog(false);
      setEditingTrail(null);
      fetchTrails();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save trail');
    }
  };

  const handleDeleteTrail = async () => {
    if (!deleteItem?.trail_id) return;
    try {
      await api.delete(`/api/archive/trails/${deleteItem.trail_id}`);
      toast.success('Trail deleted');
      setShowDeleteConfirm(false);
      setDeleteItem(null);
      fetchTrails();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete trail');
    }
  };

  // Conflict scan
  const handleConflictScan = async () => {
    setConflictLoading(true);
    try {
      const response = await api.post('/api/archive/admin/scan-conflicts');
      setConflictResults(response.data);
      setShowConflictScan(true);
      fetchClaims();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to scan conflicts');
    } finally {
      setConflictLoading(false);
    }
  };

  // Delete confirmation
  const confirmDelete = (item, type) => {
    setDeleteItem({ ...item, _type: type });
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (deleteItem?._type === 'source') handleDeleteSource();
    else if (deleteItem?._type === 'claim') handleDeleteClaim();
    else if (deleteItem?._type === 'trail') handleDeleteTrail();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-vault-navy flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-vault-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vault-navy p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-vault-light flex items-center gap-2 sm:gap-3">
              <Archive className="w-5 h-5 sm:w-7 sm:h-7 text-vault-gold flex-shrink-0" />
              Black Archive Admin
            </h1>
            <p className="text-vault-muted mt-1 text-xs sm:text-sm">
              Manage sources, claims, and doctrine trails.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/archive')}
              variant="outline"
              className="border-vault-gold/30 text-vault-gold hover:bg-vault-gold/10"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Archive
            </Button>
            <Button
              onClick={handleConflictScan}
              disabled={conflictLoading}
              variant="outline"
              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            >
              {conflictLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <AlertTriangle className="w-4 h-4 mr-2" />
              )}
              Scan Conflicts
            </Button>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-vault-dark border border-vault-gold/20 w-full sm:w-auto flex">
            <TabsTrigger 
              value="overview" 
              className="flex-1 sm:flex-none data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold text-xs sm:text-sm"
            >
              <BarChart3 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="sources"
              className="flex-1 sm:flex-none data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold text-xs sm:text-sm"
            >
              <FileText className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sources</span>
            </TabsTrigger>
            <TabsTrigger 
              value="claims"
              className="flex-1 sm:flex-none data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold text-xs sm:text-sm"
            >
              <Folder className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Claims</span>
            </TabsTrigger>
            <TabsTrigger 
              value="trails"
              className="flex-1 sm:flex-none data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold text-xs sm:text-sm"
            >
              <BookOpen className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Trails</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 sm:mt-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                title="Total Sources"
                value={stats?.total_sources || 0}
                icon={FileText}
                color="text-vault-gold"
              />
              <StatCard
                title="Total Claims"
                value={stats?.total_claims || 0}
                icon={Folder}
                color="text-blue-400"
              />
              <StatCard
                title="Doctrine Trails"
                value={stats?.total_trails || 0}
                icon={BookOpen}
                color="text-purple-400"
              />
              <StatCard
                title="Disputed Claims"
                value={stats?.by_status?.disputed || 0}
                icon={AlertTriangle}
                color="text-red-400"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {/* Sources by Type */}
              <Card className="bg-vault-dark border-vault-gold/20">
                <CardHeader className="p-4">
                  <CardTitle className="text-vault-light text-base">Sources by Type</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-3">
                    <TypeBar label="Primary Sources" value={stats?.by_type?.primary || 0} total={stats?.total_sources || 1} color="bg-emerald-500" />
                    <TypeBar label="Interpretations" value={stats?.by_type?.interpretation || 0} total={stats?.total_sources || 1} color="bg-blue-500" />
                    <TypeBar label="Hypotheses" value={stats?.by_type?.hypothesis || 0} total={stats?.total_sources || 1} color="bg-purple-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Claims by Status */}
              <Card className="bg-vault-dark border-vault-gold/20">
                <CardHeader className="p-4">
                  <CardTitle className="text-vault-light text-base">Claims by Status</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-3">
                    <TypeBar label="Verified" value={stats?.by_status?.verified || 0} total={stats?.total_claims || 1} color="bg-emerald-500" />
                    <TypeBar label="Disputed" value={stats?.by_status?.disputed || 0} total={stats?.total_claims || 1} color="bg-red-500" />
                    <TypeBar label="Unverified" value={(stats?.total_claims || 0) - (stats?.by_status?.verified || 0) - (stats?.by_status?.disputed || 0)} total={stats?.total_claims || 1} color="bg-amber-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sources Tab */}
          <TabsContent value="sources" className="mt-4 sm:mt-6">
            <Card className="bg-vault-dark border-vault-gold/20">
              <CardHeader className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-vault-light text-base sm:text-lg">Archive Sources</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      placeholder="Search..."
                      value={sourceSearch}
                      onChange={(e) => setSourceSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchSources()}
                      className="w-full sm:w-48 bg-vault-navy border-vault-gold/20 text-sm"
                    />
                    <Select value={sourceTypeFilter} onValueChange={setSourceTypeFilter}>
                      <SelectTrigger className="w-full sm:w-40 bg-vault-navy border-vault-gold/20">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {SOURCE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={fetchSources} variant="outline" size="icon" className="border-vault-gold/30">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button 
                      onClick={() => { setEditingSource(null); setShowSourceDialog(true); }}
                      className="bg-vault-gold/20 text-vault-gold hover:bg-vault-gold/30"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Source
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                {sourcesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-vault-gold" />
                  </div>
                ) : sources.length === 0 ? (
                  <div className="text-center py-8 text-vault-muted">
                    No sources found. Add your first source to get started.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sources.map((source) => (
                      <SourceRow
                        key={source.source_id}
                        source={source}
                        onEdit={() => { setEditingSource(source); setShowSourceDialog(true); }}
                        onDelete={() => confirmDelete(source, 'source')}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Claims Tab */}
          <TabsContent value="claims" className="mt-4 sm:mt-6">
            <Card className="bg-vault-dark border-vault-gold/20">
              <CardHeader className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-vault-light text-base sm:text-lg">Claims & Dossiers</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      placeholder="Search..."
                      value={claimSearch}
                      onChange={(e) => setClaimSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchClaims()}
                      className="w-full sm:w-48 bg-vault-navy border-vault-gold/20 text-sm"
                    />
                    <Select value={claimStatusFilter} onValueChange={setClaimStatusFilter}>
                      <SelectTrigger className="w-full sm:w-40 bg-vault-navy border-vault-gold/20">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {CLAIM_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={fetchClaims} variant="outline" size="icon" className="border-vault-gold/30">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button 
                      onClick={() => { setEditingClaim(null); setShowClaimDialog(true); }}
                      className="bg-vault-gold/20 text-vault-gold hover:bg-vault-gold/30"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Claim
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                {claimsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-vault-gold" />
                  </div>
                ) : claims.length === 0 ? (
                  <div className="text-center py-8 text-vault-muted">
                    No claims found. Add your first claim to get started.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {claims.map((claim) => (
                      <ClaimRow
                        key={claim.claim_id}
                        claim={claim}
                        onEdit={() => { setEditingClaim(claim); setShowClaimDialog(true); }}
                        onDelete={() => confirmDelete(claim, 'claim')}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trails Tab */}
          <TabsContent value="trails" className="mt-4 sm:mt-6">
            <Card className="bg-vault-dark border-vault-gold/20">
              <CardHeader className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-vault-light text-base sm:text-lg">Doctrine Trails</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button onClick={fetchTrails} variant="outline" size="icon" className="border-vault-gold/30">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button 
                      onClick={() => { setEditingTrail(null); setShowTrailDialog(true); }}
                      className="bg-vault-gold/20 text-vault-gold hover:bg-vault-gold/30"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Trail
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                {trailsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-vault-gold" />
                  </div>
                ) : trails.length === 0 ? (
                  <div className="text-center py-8 text-vault-muted">
                    No trails found. Add your first doctrine trail to get started.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {trails.map((trail) => (
                      <TrailRow
                        key={trail.trail_id}
                        trail={trail}
                        onEdit={() => { setEditingTrail(trail); setShowTrailDialog(true); }}
                        onDelete={() => confirmDelete(trail, 'trail')}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Source Dialog */}
        <SourceDialog
          open={showSourceDialog}
          onClose={() => { setShowSourceDialog(false); setEditingSource(null); }}
          source={editingSource}
          onSave={handleSaveSource}
        />

        {/* Claim Dialog */}
        <ClaimDialog
          open={showClaimDialog}
          onClose={() => { setShowClaimDialog(false); setEditingClaim(null); }}
          claim={editingClaim}
          sources={sources}
          onSave={handleSaveClaim}
        />

        {/* Trail Dialog */}
        <TrailDialog
          open={showTrailDialog}
          onClose={() => { setShowTrailDialog(false); setEditingTrail(null); }}
          trail={editingTrail}
          onSave={handleSaveTrail}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent className="bg-vault-dark border-vault-gold/20">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-vault-light">Confirm Delete</AlertDialogTitle>
              <AlertDialogDescription className="text-vault-muted">
                Are you sure you want to delete "{deleteItem?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-vault-navy border-vault-gold/20">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-500/20 text-red-400 hover:bg-red-500/30">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Conflict Scan Results */}
        <Dialog open={showConflictScan} onOpenChange={setShowConflictScan}>
          <DialogContent className="bg-vault-dark border-vault-gold/20 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-vault-light flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Conflict Scan Results
              </DialogTitle>
            </DialogHeader>
            {conflictResults && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-vault-navy p-3 rounded-lg">
                    <p className="text-2xl font-bold text-amber-400">{conflictResults.newly_disputed}</p>
                    <p className="text-xs text-vault-muted">Newly Disputed</p>
                  </div>
                  <div className="bg-vault-navy p-3 rounded-lg">
                    <p className="text-2xl font-bold text-emerald-400">{conflictResults.reverted_to_unverified}</p>
                    <p className="text-xs text-vault-muted">Reverted</p>
                  </div>
                </div>
                {conflictResults.disputed_claims?.length > 0 && (
                  <div>
                    <p className="text-sm text-vault-light mb-2">Newly Disputed Claims:</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {conflictResults.disputed_claims.map((c) => (
                        <div key={c.claim_id} className="text-xs text-vault-muted bg-vault-navy p-2 rounded">
                          {c.title} ({c.counter_sources_count} counter sources)
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setShowConflictScan(false)} className="bg-vault-gold/20 text-vault-gold">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon: Icon, color }) {
  return (
    <Card className="bg-vault-dark border-vault-gold/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-vault-navy flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-vault-light">{value}</p>
            <p className="text-xs text-vault-muted">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Type Bar Component
function TypeBar({ label, value, total, color }) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-vault-muted">{label}</span>
        <span className="text-vault-light">{value}</span>
      </div>
      <div className="h-2 bg-vault-navy rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

// Source Row Component
function SourceRow({ source, onEdit, onDelete }) {
  const typeConfig = SOURCE_TYPES.find((t) => t.value === source.source_type) || SOURCE_TYPES[0];
  
  return (
    <div className="flex items-center justify-between p-3 bg-vault-navy/50 rounded-lg border border-vault-gold/10 hover:border-vault-gold/20 transition-colors gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className={`${typeConfig.color} text-xs`}>
            {typeConfig.label}
          </Badge>
          {source.jurisdiction && (
            <span className="text-xs text-vault-muted">{source.jurisdiction}</span>
          )}
        </div>
        <p className="font-medium text-vault-light text-sm truncate">{source.title}</p>
        <p className="text-xs text-vault-muted truncate">{source.citation}</p>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
          <Edit className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0 text-red-400 hover:text-red-300">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Claim Row Component
function ClaimRow({ claim, onEdit, onDelete }) {
  const statusConfig = CLAIM_STATUSES.find((s) => s.value === claim.status) || CLAIM_STATUSES[2];
  const StatusIcon = statusConfig.icon;
  
  return (
    <div className="flex items-center justify-between p-3 bg-vault-navy/50 rounded-lg border border-vault-gold/10 hover:border-vault-gold/20 transition-colors gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className={`${statusConfig.color} text-xs`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusConfig.label}
          </Badge>
          {claim.auto_disputed && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
              Auto
            </Badge>
          )}
        </div>
        <p className="font-medium text-vault-light text-sm truncate">{claim.title}</p>
        <p className="text-xs text-vault-muted truncate">{claim.body?.substring(0, 100)}...</p>
      </div>
      <div className="flex items-center gap-2">
        {(claim.evidence_source_ids?.length > 0 || claim.counter_source_ids?.length > 0) && (
          <div className="text-xs text-vault-muted">
            <span className="text-emerald-400">{claim.evidence_source_ids?.length || 0}</span>
            /
            <span className="text-red-400">{claim.counter_source_ids?.length || 0}</span>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
          <Edit className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0 text-red-400 hover:text-red-300">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Trail Row Component
function TrailRow({ trail, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-between p-3 bg-vault-navy/50 rounded-lg border border-vault-gold/10 hover:border-vault-gold/20 transition-colors gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-vault-light text-sm truncate">{trail.title}</p>
        <p className="text-xs text-vault-muted truncate">{trail.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs">
            {trail.steps?.length || 0} steps
          </Badge>
          {trail.topic_tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="bg-vault-gold/10 text-vault-gold border-vault-gold/30 text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
          <Edit className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0 text-red-400 hover:text-red-300">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Source Dialog Component
function SourceDialog({ open, onClose, source, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    source_type: 'PRIMARY_SOURCE',
    jurisdiction: 'General',
    era_tags: [],
    topic_tags: [],
    citation: '',
    url: '',
    excerpt: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (source) {
      setFormData({
        title: source.title || '',
        source_type: source.source_type || 'PRIMARY_SOURCE',
        jurisdiction: source.jurisdiction || 'General',
        era_tags: source.era_tags || [],
        topic_tags: source.topic_tags || [],
        citation: source.citation || '',
        url: source.url || '',
        excerpt: source.excerpt || '',
        notes: source.notes || '',
      });
    } else {
      setFormData({
        title: '',
        source_type: 'PRIMARY_SOURCE',
        jurisdiction: 'General',
        era_tags: [],
        topic_tags: [],
        citation: '',
        url: '',
        excerpt: '',
        notes: '',
      });
    }
  }, [source, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.citation) {
      toast.error('Title and citation are required');
      return;
    }
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-vault-dark border-vault-gold/20 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-vault-light">
            {source ? 'Edit Source' : 'Add New Source'}
          </DialogTitle>
          <DialogDescription className="text-vault-muted">
            {source ? 'Update the source details.' : 'Add a new primary source, interpretation, or hypothesis.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-vault-muted">Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-vault-navy border-vault-gold/20"
              placeholder="e.g., Earl of Oxford's Case (1615)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-vault-muted">Type *</Label>
              <Select value={formData.source_type} onValueChange={(v) => setFormData({ ...formData, source_type: v })}>
                <SelectTrigger className="bg-vault-navy border-vault-gold/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-vault-muted">Jurisdiction</Label>
              <Input
                value={formData.jurisdiction}
                onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                className="bg-vault-navy border-vault-gold/20"
                placeholder="e.g., England, US Federal"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-vault-muted">Citation *</Label>
            <Input
              value={formData.citation}
              onChange={(e) => setFormData({ ...formData, citation: e.target.value })}
              className="bg-vault-navy border-vault-gold/20"
              placeholder="e.g., 1 Rep Ch 1, 21 ER 485"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-vault-muted">URL (optional)</Label>
            <Input
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="bg-vault-navy border-vault-gold/20"
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-vault-muted">Excerpt</Label>
            <Textarea
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              className="bg-vault-navy border-vault-gold/20 min-h-[80px]"
              placeholder="Key passage or summary..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-vault-muted">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-vault-navy border-vault-gold/20 min-h-[60px]"
              placeholder="Additional notes..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-vault-muted">Topic Tags (comma-separated)</Label>
            <Input
              value={formData.topic_tags.join(', ')}
              onChange={(e) => setFormData({ ...formData, topic_tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
              className="bg-vault-navy border-vault-gold/20"
              placeholder="Equity, Trusts, Fiduciary Duties"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-vault-gold/20">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-vault-gold/20 text-vault-gold hover:bg-vault-gold/30">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {source ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Claim Dialog Component
function ClaimDialog({ open, onClose, claim, sources, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    status: 'UNVERIFIED',
    body: '',
    evidence_source_ids: [],
    counter_source_ids: [],
    topic_tags: [],
    reality_check: '',
    practical_takeaway: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (claim) {
      setFormData({
        title: claim.title || '',
        status: claim.status || 'UNVERIFIED',
        body: claim.body || '',
        evidence_source_ids: claim.evidence_source_ids || [],
        counter_source_ids: claim.counter_source_ids || [],
        topic_tags: claim.topic_tags || [],
        reality_check: claim.reality_check || '',
        practical_takeaway: claim.practical_takeaway || '',
      });
    } else {
      setFormData({
        title: '',
        status: 'UNVERIFIED',
        body: '',
        evidence_source_ids: [],
        counter_source_ids: [],
        topic_tags: [],
        reality_check: '',
        practical_takeaway: '',
      });
    }
  }, [claim, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.body) {
      toast.error('Title and body are required');
      return;
    }
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-vault-dark border-vault-gold/20 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-vault-light">
            {claim ? 'Edit Claim' : 'Add New Claim'}
          </DialogTitle>
          <DialogDescription className="text-vault-muted">
            {claim ? 'Update the claim details.' : 'Add a new legal claim or dossier.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-vault-muted">Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-vault-navy border-vault-gold/20"
              placeholder="e.g., Equity Prevails Over Common Law"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-vault-muted">Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
              <SelectTrigger className="bg-vault-navy border-vault-gold/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLAIM_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-vault-muted">Note: Status may auto-update to DISPUTED if counter sources are added.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-vault-muted">Body *</Label>
            <Textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              className="bg-vault-navy border-vault-gold/20 min-h-[100px]"
              placeholder="Detailed claim explanation..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-vault-muted">Reality Check</Label>
            <Textarea
              value={formData.reality_check}
              onChange={(e) => setFormData({ ...formData, reality_check: e.target.value })}
              className="bg-vault-navy border-vault-gold/20 min-h-[60px]"
              placeholder="Practical reality check..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-vault-muted">Practical Takeaway</Label>
            <Textarea
              value={formData.practical_takeaway}
              onChange={(e) => setFormData({ ...formData, practical_takeaway: e.target.value })}
              className="bg-vault-navy border-vault-gold/20 min-h-[60px]"
              placeholder="Actionable takeaway..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-vault-muted">Topic Tags (comma-separated)</Label>
            <Input
              value={formData.topic_tags.join(', ')}
              onChange={(e) => setFormData({ ...formData, topic_tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
              className="bg-vault-navy border-vault-gold/20"
              placeholder="Equity, Trusts, Fiduciary Duties"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-vault-gold/20">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-vault-gold/20 text-vault-gold hover:bg-vault-gold/30">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {claim ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Trail Dialog Component
function TrailDialog({ open, onClose, trail, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topic_tags: [],
    steps: [],
    reality_check: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (trail) {
      setFormData({
        title: trail.title || '',
        description: trail.description || '',
        topic_tags: trail.topic_tags || [],
        steps: trail.steps || [],
        reality_check: trail.reality_check || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        topic_tags: [],
        steps: [],
        reality_check: '',
      });
    }
  }, [trail, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      toast.error('Title and description are required');
      return;
    }
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-vault-dark border-vault-gold/20 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-vault-light">
            {trail ? 'Edit Trail' : 'Add New Trail'}
          </DialogTitle>
          <DialogDescription className="text-vault-muted">
            {trail ? 'Update the doctrine trail.' : 'Create a new learning path for doctrine exploration.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-vault-muted">Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-vault-navy border-vault-gold/20"
              placeholder="e.g., Foundations of Equity"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-vault-muted">Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-vault-navy border-vault-gold/20 min-h-[80px]"
              placeholder="What this trail covers..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-vault-muted">Reality Check</Label>
            <Textarea
              value={formData.reality_check}
              onChange={(e) => setFormData({ ...formData, reality_check: e.target.value })}
              className="bg-vault-navy border-vault-gold/20 min-h-[60px]"
              placeholder="Important caveats or reality checks..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-vault-muted">Topic Tags (comma-separated)</Label>
            <Input
              value={formData.topic_tags.join(', ')}
              onChange={(e) => setFormData({ ...formData, topic_tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
              className="bg-vault-navy border-vault-gold/20"
              placeholder="Equity, Trusts, History"
            />
          </div>

          <div className="bg-vault-navy/50 p-3 rounded-lg">
            <p className="text-xs text-vault-muted">
              <strong>Note:</strong> Trail steps can be managed after creation via the detailed view.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-vault-gold/20">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-vault-gold/20 text-vault-gold hover:bg-vault-gold/30">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {trail ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
