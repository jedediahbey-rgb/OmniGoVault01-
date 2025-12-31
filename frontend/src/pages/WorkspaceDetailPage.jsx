import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  ArrowLeft,
  Plus,
  Vault,
  Users,
  FileText,
  Clock,
  CaretRight,
  DotsThree,
  Lock,
  CheckCircle,
  Warning,
  PencilSimple,
  Trash,
  UserPlus,
  Eye,
  Download,
  Signature,
  ChatCircle,
  ShieldCheck,
  Sparkle,
  Check,
  X,
  ArrowClockwise,
  Gear,
  EnvelopeSimple
} from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
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
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { staggerContainer, fadeInUp } from '../lib/motion';
import SignDocumentDialog from '../components/workspace/SignDocumentDialog';
import ActivityTimeline from '../components/workspace/ActivityTimeline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Status colors
const statusConfig = {
  DRAFT: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Draft', icon: Clock },
  ACTIVE: { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Active', icon: CheckCircle },
  SUSPENDED: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Suspended', icon: Warning },
  CLOSED: { color: 'bg-vault-muted/20 text-vault-muted border-vault-muted/30', label: 'Closed', icon: Lock },
  ARCHIVED: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: 'Archived', icon: Lock }
};

// Document status colors
const docStatusConfig = {
  DRAFT: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Draft' },
  UNDER_REVIEW: { color: 'bg-blue-500/20 text-blue-400', label: 'Under Review' },
  APPROVED: { color: 'bg-green-500/20 text-green-400', label: 'Approved' },
  PENDING_SIGNATURES: { color: 'bg-purple-500/20 text-purple-400', label: 'Pending Signatures' },
  EXECUTED: { color: 'bg-emerald-500/20 text-emerald-400', label: 'Executed' },
  SUPERSEDED: { color: 'bg-gray-500/20 text-gray-400', label: 'Superseded' }
};

// Role colors
const roleColors = {
  OWNER: 'bg-vault-gold/20 text-vault-gold',
  TRUSTEE: 'bg-purple-500/20 text-purple-400',
  BENEFICIARY: 'bg-blue-500/20 text-blue-400',
  GRANTOR: 'bg-green-500/20 text-green-400',
  PROTECTOR: 'bg-orange-500/20 text-orange-400',
  ADVISOR: 'bg-cyan-500/20 text-cyan-400',
  ATTORNEY: 'bg-indigo-500/20 text-indigo-400',
  ACCOUNTANT: 'bg-pink-500/20 text-pink-400',
  VIEWER: 'bg-gray-500/20 text-gray-400'
};

export default function WorkspaceDetailPage({ user }) {
  const { vaultId } = useParams();
  const navigate = useNavigate();
  
  const [vault, setVault] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('documents');
  
  // Modals
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [showInviteParticipant, setShowInviteParticipant] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showSignDialog, setShowSignDialog] = useState(false);
  
  // Form states
  const [newDocument, setNewDocument] = useState({
    title: '',
    description: '',
    category: 'OTHER',
    content: ''
  });
  const [newParticipant, setNewParticipant] = useState({
    email: '',
    role: 'VIEWER',
    display_name: ''
  });
  
  // Available options
  const [documentCategories, setDocumentCategories] = useState([]);
  const [participantRoles, setParticipantRoles] = useState([]);
  
  const [creating, setCreating] = useState(false);

  // Fetch vault details
  const fetchVault = useCallback(async () => {
    // Guard against undefined or invalid vaultId
    if (!vaultId || vaultId === 'undefined') {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.get(`${API}/vaults/${vaultId}`, { withCredentials: true });
      setVault(response.data);
    } catch (error) {
      console.error('Error fetching vault:', error);
      if (error.response?.status === 404) {
        toast.error('Vault not found');
        navigate('/vault/workspaces');
      } else if (error.response?.status === 403) {
        toast.error('Access denied');
        navigate('/vault/workspaces');
      } else {
        toast.error('Failed to load vault');
      }
    } finally {
      setLoading(false);
    }
  }, [vaultId, navigate]);

  // Fetch options
  const fetchOptions = useCallback(async () => {
    try {
      const [categoriesRes, rolesRes] = await Promise.all([
        axios.get(`${API}/vaults/document-categories`),
        axios.get(`${API}/vaults/roles`)
      ]);
      setDocumentCategories(categoriesRes.data.categories || []);
      setParticipantRoles(rolesRes.data.roles || []);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  }, []);

  useEffect(() => {
    fetchVault();
    fetchOptions();
  }, [fetchVault, fetchOptions]);

  // Create document
  const handleCreateDocument = async () => {
    if (!newDocument.title.trim()) {
      toast.error('Please enter a document title');
      return;
    }

    try {
      setCreating(true);
      await axios.post(`${API}/vaults/${vaultId}/documents`, newDocument, { withCredentials: true });
      toast.success('Document created');
      setShowAddDocument(false);
      setNewDocument({ title: '', description: '', category: 'OTHER', content: '' });
      await fetchVault();  // Wait for refresh to complete
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error(
            typeof error.response?.data?.detail === 'string' 
              ? error.response.data.detail 
              : 'Failed to create document'
          );
    } finally {
      setCreating(false);
    }
  };

  // Invite participant
  const handleInviteParticipant = async () => {
    if (!newParticipant.email.trim()) {
      toast.error('Please enter an email');
      return;
    }

    try {
      setCreating(true);
      await axios.post(`${API}/vaults/${vaultId}/participants`, newParticipant, { withCredentials: true });
      toast.success('Invitation sent');
      setShowInviteParticipant(false);
      setNewParticipant({ email: '', role: 'VIEWER', display_name: '' });
      await fetchVault();
    } catch (error) {
      console.error('Error inviting participant:', error);
      toast.error(
            typeof error.response?.data?.detail === 'string' 
              ? error.response.data.detail 
              : 'Failed to send invitation'
          );
    } finally {
      setCreating(false);
    }
  };

  // Activate vault
  const handleActivateVault = async () => {
    try {
      await axios.post(`${API}/vaults/${vaultId}/activate`, {}, { withCredentials: true });
      toast.success('Vault activated');
      await fetchVault();
    } catch (error) {
      toast.error(
            typeof error.response?.data?.detail === 'string' 
              ? error.response.data.detail 
              : 'Failed to activate vault'
          );
    }
  };

  // View document
  const handleViewDocument = async (doc) => {
    try {
      const response = await axios.get(`${API}/vaults/documents/${doc.document_id}`, { withCredentials: true });
      setSelectedDocument(response.data);
      setShowDocumentViewer(true);
    } catch (error) {
      toast.error('Failed to load document');
    }
  };

  // Submit document for review
  const handleSubmitForReview = async (docId) => {
    try {
      await axios.post(`${API}/vaults/documents/${docId}/submit-for-review`, {}, { withCredentials: true });
      toast.success('Document submitted for review');
      fetchVault();
    } catch (error) {
      toast.error(
            typeof error.response?.data?.detail === 'string' 
              ? error.response.data.detail 
              : 'Failed to submit'
          );
    }
  };

  // Affirm document
  const handleAffirmDocument = async (docId) => {
    try {
      await axios.post(`${API}/vaults/documents/${docId}/affirm`, { note: '' }, { withCredentials: true });
      toast.success('Document affirmed');
      if (selectedDocument) {
        handleViewDocument({ document_id: docId });
      }
      fetchVault();
    } catch (error) {
      toast.error(
            typeof error.response?.data?.detail === 'string' 
              ? error.response.data.detail 
              : 'Failed to affirm'
          );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-vault-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!vault) {
    return null;
  }

  const status = statusConfig[vault.status] || statusConfig.DRAFT;
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-vault-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/vault/workspaces')}
            className="text-vault-muted hover:text-white mt-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <Vault className="w-6 h-6 text-vault-gold" weight="duotone" />
                {vault.name}
              </h1>
              <Badge variant="outline" className={status.color}>
                <StatusIcon className="w-3.5 h-3.5 mr-1" />
                {status.label}
              </Badge>
            </div>
            {vault.description && (
              <p className="text-vault-muted text-sm mt-1">{vault.description}</p>
            )}
            
            {/* Your Role */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-vault-muted">Your role:</span>
              <Badge variant="outline" className={roleColors[vault.user_role] || roleColors.VIEWER}>
                {vault.user_role?.replace('_', ' ')}
              </Badge>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {vault.status === 'DRAFT' && vault.user_permissions?.includes('MANAGE_VAULT') && (
              <Button
                onClick={handleActivateVault}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Activate
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <DotsThree className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => toast.info('Workspace settings coming soon')}>
                  <Gear className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => fetchVault()}>
                  <ArrowClockwise className="w-4 h-4 mr-2" />
                  Refresh
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="bg-vault-navy/50 border-vault-gold/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{vault.participants?.length || 0}</p>
                  <p className="text-xs text-vault-muted">Participants</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-vault-navy/50 border-vault-gold/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{vault.documents?.length || 0}</p>
                  <p className="text-xs text-vault-muted">Documents</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-vault-navy/50 border-vault-gold/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {vault.documents?.filter(d => d.status === 'EXECUTED').length || 0}
                  </p>
                  <p className="text-xs text-vault-muted">Executed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-vault-navy/50 border-vault-gold/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {vault.documents?.filter(d => ['DRAFT', 'UNDER_REVIEW'].includes(d.status)).length || 0}
                  </p>
                  <p className="text-xs text-vault-muted">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-vault-navy border border-vault-gold/20 mb-6">
            <TabsTrigger value="documents" className="data-[state=active]:bg-vault-gold/20">
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="participants" className="data-[state=active]:bg-vault-gold/20">
              <Users className="w-4 h-4 mr-2" />
              Participants
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-vault-gold/20">
              <Clock className="w-4 h-4 mr-2" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Documents</h2>
              {vault.user_permissions?.includes('UPLOAD_DOC') && (
                <Button
                  onClick={() => setShowAddDocument(true)}
                  className="bg-vault-gold hover:bg-vault-gold/90 text-vault-navy"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Document
                </Button>
              )}
            </div>

            {vault.documents?.length === 0 ? (
              <Card className="bg-vault-navy/30 border-vault-gold/10">
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 text-vault-muted mx-auto mb-4" />
                  <p className="text-vault-muted mb-4">No documents yet</p>
                  {vault.user_permissions?.includes('UPLOAD_DOC') && (
                    <Button
                      onClick={() => setShowAddDocument(true)}
                      variant="outline"
                      className="border-vault-gold/30"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Document
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {vault.documents.map((doc) => (
                  <DocumentRow
                    key={doc.document_id}
                    document={doc}
                    onView={() => handleViewDocument(doc)}
                    onSubmitForReview={() => handleSubmitForReview(doc.document_id)}
                    canEdit={vault.user_permissions?.includes('EDIT_DOC')}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Participants Tab */}
          <TabsContent value="participants">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Participants</h2>
              {vault.user_permissions?.includes('MANAGE_PARTICIPANTS') && (
                <Button
                  onClick={() => setShowInviteParticipant(true)}
                  className="bg-vault-gold hover:bg-vault-gold/90 text-vault-navy"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {vault.participants?.map((participant) => (
                <ParticipantRow key={participant.id} participant={participant} />
              ))}
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card className="bg-vault-navy/30 border-vault-gold/10">
              <CardContent className="p-6">
                <ActivityTimeline 
                  vaultId={vaultId} 
                  documents={vault?.documents || []} 
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Document Modal */}
        <Dialog open={showAddDocument} onOpenChange={setShowAddDocument}>
          <DialogContent className="bg-vault-dark border-vault-gold/20 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-vault-gold" />
                Add Document
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm text-vault-muted block mb-2">Title *</label>
                <Input
                  placeholder="Document title"
                  value={newDocument.title}
                  onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                  className="bg-vault-navy border-vault-gold/20"
                />
              </div>

              <div>
                <label className="text-sm text-vault-muted block mb-2">Category</label>
                <Select
                  value={newDocument.category}
                  onValueChange={(value) => setNewDocument({ ...newDocument, category: value })}
                >
                  <SelectTrigger className="bg-vault-navy border-vault-gold/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentCategories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-vault-muted block mb-2">Description</label>
                <Textarea
                  placeholder="Brief description..."
                  value={newDocument.description}
                  onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                  className="bg-vault-navy border-vault-gold/20 min-h-[80px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowAddDocument(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateDocument}
                disabled={creating}
                className="bg-vault-gold hover:bg-vault-gold/90 text-vault-navy"
              >
                {creating ? 'Creating...' : 'Create Document'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invite Participant Modal */}
        <Dialog open={showInviteParticipant} onOpenChange={setShowInviteParticipant}>
          <DialogContent className="bg-vault-dark border-vault-gold/20 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-vault-gold" />
                Invite Participant
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm text-vault-muted block mb-2">Email *</label>
                <Input
                  type="email"
                  placeholder="participant@example.com"
                  value={newParticipant.email}
                  onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
                  className="bg-vault-navy border-vault-gold/20"
                />
              </div>

              <div>
                <label className="text-sm text-vault-muted block mb-2">Role</label>
                <Select
                  value={newParticipant.role}
                  onValueChange={(value) => setNewParticipant({ ...newParticipant, role: value })}
                >
                  <SelectTrigger className="bg-vault-navy border-vault-gold/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {participantRoles.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-vault-muted block mb-2">Display Name (optional)</label>
                <Input
                  placeholder="How they'll appear in the vault"
                  value={newParticipant.display_name}
                  onChange={(e) => setNewParticipant({ ...newParticipant, display_name: e.target.value })}
                  className="bg-vault-navy border-vault-gold/20"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowInviteParticipant(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleInviteParticipant}
                disabled={creating}
                className="bg-vault-gold hover:bg-vault-gold/90 text-vault-navy"
              >
                <EnvelopeSimple className="w-4 h-4 mr-2" />
                {creating ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Document Viewer Modal */}
        <Dialog open={showDocumentViewer} onOpenChange={setShowDocumentViewer}>
          <DialogContent className="bg-vault-dark border-vault-gold/20 max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedDocument && (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <DialogTitle className="text-white">{selectedDocument.title}</DialogTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={docStatusConfig[selectedDocument.status]?.color}>
                          {docStatusConfig[selectedDocument.status]?.label}
                        </Badge>
                        <span className="text-xs text-vault-muted">
                          v{selectedDocument.current_version?.version_number || 1}
                        </span>
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                <div className="py-4 space-y-4">
                  {selectedDocument.description && (
                    <p className="text-vault-muted text-sm">{selectedDocument.description}</p>
                  )}

                  {/* Document Content */}
                  <div className="bg-vault-navy/50 rounded-lg p-4 min-h-[200px]">
                    {selectedDocument.current_version?.content ? (
                      <div 
                        className="prose prose-invert prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: selectedDocument.current_version.content }}
                      />
                    ) : (
                      <p className="text-vault-muted text-center py-8">No content yet</p>
                    )}
                  </div>

                  {/* Signatures */}
                  {selectedDocument.signatures?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-white mb-2">Signatures</h4>
                      <div className="space-y-2">
                        {selectedDocument.signatures.map((sig) => (
                          <div key={sig.id} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-vault-light">{sig.legal_name}</span>
                            <span className="text-vault-muted">
                              {new Date(sig.signed_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comments */}
                  {selectedDocument.comments?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-white mb-2">Comments</h4>
                      <div className="space-y-2">
                        {selectedDocument.comments.map((comment) => (
                          <div key={comment.id} className="bg-vault-navy/30 rounded p-3">
                            <p className="text-sm text-vault-light">{comment.content}</p>
                            <p className="text-xs text-vault-muted mt-1">
                              {new Date(comment.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className="flex-wrap gap-2">
                  {selectedDocument.status === 'DRAFT' && selectedDocument.can_edit && (
                    <Button
                      onClick={() => handleSubmitForReview(selectedDocument.document_id)}
                      variant="outline"
                      className="border-blue-500/30 text-blue-400"
                    >
                      Submit for Review
                    </Button>
                  )}
                  {selectedDocument.status === 'UNDER_REVIEW' && (
                    <Button
                      onClick={() => handleAffirmDocument(selectedDocument.document_id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Affirm
                    </Button>
                  )}
                  {selectedDocument.can_sign && !selectedDocument.has_user_signed && (
                    <Button 
                      className="bg-vault-gold hover:bg-vault-gold/90 text-vault-navy"
                      onClick={() => setShowSignDialog(true)}
                    >
                      <Signature className="w-4 h-4 mr-2" />
                      Sign Document
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Sign Document Dialog */}
        <SignDocumentDialog
          open={showSignDialog}
          onOpenChange={setShowSignDialog}
          document={selectedDocument}
          userRole={vault?.current_user_role}
          onSignatureComplete={(signature) => {
            // Refresh the document details
            fetchVault();
            setSelectedDocument(prev => ({
              ...prev,
              has_user_signed: true,
              signatures: [...(prev.signatures || []), signature]
            }));
          }}
        />
      </div>
    </div>
  );
}

// Document Row Component
function DocumentRow({ document, onView, onSubmitForReview, canEdit }) {
  const status = docStatusConfig[document.status] || docStatusConfig.DRAFT;
  
  return (
    <Card className="bg-vault-navy/30 border-vault-gold/10 hover:border-vault-gold/20 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-vault-gold/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-vault-gold" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-white truncate">{document.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${status.color} text-xs`}>{status.label}</Badge>
                <span className="text-xs text-vault-muted">
                  {document.category?.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {document.status === 'DRAFT' && canEdit && (
              <Button
                onClick={onSubmitForReview}
                variant="ghost"
                size="sm"
                className="text-blue-400 hover:text-blue-300"
              >
                Submit
              </Button>
            )}
            <Button
              onClick={onView}
              variant="ghost"
              size="icon"
              className="text-vault-muted hover:text-white"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Participant Row Component
function ParticipantRow({ participant }) {
  const roleColor = roleColors[participant.role] || roleColors.VIEWER;
  
  return (
    <Card className="bg-vault-navy/30 border-vault-gold/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-vault-gold/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-vault-gold" />
            </div>
            <div>
              <p className="font-medium text-white">
                {participant.display_name || participant.user_email || 'Invited User'}
              </p>
              {participant.user_email && (
                <p className="text-xs text-vault-muted">{participant.user_email}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={roleColor}>
              {participant.role?.replace('_', ' ')}
            </Badge>
            {participant.status === 'pending' && (
              <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 text-xs">
                Pending
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
