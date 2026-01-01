/**
 * Support Admin Page
 * 
 * UI for SUPPORT_ADMIN role features:
 * - View/Add support notes
 * - Extend trial periods
 * - Unlock accounts
 * - Reset 2FA
 * - View support permissions
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import api from '../lib/api';
import {
  Headset,
  Search,
  Plus,
  RefreshCw,
  Loader2,
  FileText,
  Clock,
  Unlock,
  KeyRound,
  AlertTriangle,
  CheckCircle,
  User,
  Building,
  Calendar,
  MessageSquare,
  Tag,
  Shield,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
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

// Note type options
const NOTE_TYPES = [
  { value: 'GENERAL', label: 'General', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'ISSUE', label: 'Issue', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'RESOLUTION', label: 'Resolution', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'BILLING', label: 'Billing', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'FEATURE_REQUEST', label: 'Feature Request', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
];

export default function SupportAdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notes');
  
  // Permissions
  const [permissions, setPermissions] = useState(null);
  
  // Notes
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteSearch, setNoteSearch] = useState('');
  
  // Users/Accounts for actions
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  
  // Dialogs
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [showExtendTrialDialog, setShowExtendTrialDialog] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [showReset2FADialog, setShowReset2FADialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  
  // Action states
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch support permissions
  const fetchPermissions = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/support/permissions');
      setPermissions(response.data);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      if (error.response?.status === 403) {
        toast.error('Support Admin access required');
        navigate('/vault');
      }
    }
  }, [navigate]);

  // Fetch support notes
  const fetchNotes = useCallback(async (accountId = null, userId = null) => {
    setNotesLoading(true);
    try {
      const params = new URLSearchParams();
      if (accountId) params.append('account_id', accountId);
      if (userId) params.append('user_id', userId);
      params.append('limit', '50');
      
      const response = await api.get(`/api/admin/support/notes?${params}`);
      setNotes(response.data.notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load support notes');
    } finally {
      setNotesLoading(false);
    }
  }, []);

  // Fetch users for support actions
  const fetchUsers = useCallback(async (search = '') => {
    setUsersLoading(true);
    try {
      const response = await api.get('/api/admin/users', {
        params: { search: search || undefined, limit: 30 }
      });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      await fetchPermissions();
      await fetchNotes();
      setLoading(false);
    };
    init();
  }, [fetchPermissions, fetchNotes]);

  // Add support note
  const handleAddNote = async (noteData) => {
    setActionLoading(true);
    try {
      await api.post('/api/admin/support/notes', noteData);
      toast.success('Support note added');
      setShowAddNoteDialog(false);
      fetchNotes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add note');
    } finally {
      setActionLoading(false);
    }
  };

  // Extend trial
  const handleExtendTrial = async (accountId, days, reason) => {
    setActionLoading(true);
    try {
      await api.post('/api/admin/support/extend-trial', {
        account_id: accountId,
        days: days,
        reason: reason
      });
      toast.success(`Trial extended by ${days} days`);
      setShowExtendTrialDialog(false);
      setSelectedAccount(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to extend trial');
    } finally {
      setActionLoading(false);
    }
  };

  // Unlock account
  const handleUnlockAccount = async (userId, reason) => {
    setActionLoading(true);
    try {
      await api.post('/api/admin/support/unlock-account', {
        user_id: userId,
        reason: reason
      });
      toast.success('Account unlocked');
      setShowUnlockDialog(false);
      setSelectedUser(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to unlock account');
    } finally {
      setActionLoading(false);
    }
  };

  // Reset 2FA
  const handleReset2FA = async (userId, reason) => {
    setActionLoading(true);
    try {
      await api.post('/api/admin/support/reset-2fa', {
        user_id: userId,
        reason: reason
      });
      toast.success('2FA reset successfully');
      setShowReset2FADialog(false);
      setSelectedUser(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset 2FA');
    } finally {
      setActionLoading(false);
    }
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
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-vault-light flex items-center gap-2 sm:gap-3">
              <Headset className="w-5 h-5 sm:w-7 sm:h-7 text-vault-gold flex-shrink-0" />
              Support Admin
            </h1>
            <p className="text-vault-muted mt-1 text-xs sm:text-sm">
              Manage support notes, trials, and account access.
            </p>
          </div>
          
          {/* Permissions Badge */}
          {permissions && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-vault-gold/10 text-vault-gold border-vault-gold/30">
                <Shield className="w-3 h-3 mr-1" />
                {permissions.role || 'SUPPORT_ADMIN'}
              </Badge>
            </div>
          )}
        </div>

        {/* Permissions Overview */}
        {permissions?.allowed_actions && (
          <Card className="bg-vault-dark border-vault-gold/20">
            <CardHeader className="p-4">
              <CardTitle className="text-vault-light text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-vault-gold" />
                Your Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex flex-wrap gap-2">
                {permissions.allowed_actions.map((action) => (
                  <Badge key={action} variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {action.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
              {permissions.restrictions?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-vault-gold/10">
                  <p className="text-xs text-vault-muted mb-2">Restrictions:</p>
                  <div className="flex flex-wrap gap-2">
                    {permissions.restrictions.map((restriction, i) => (
                      <Badge key={i} variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {restriction}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-vault-dark border border-vault-gold/20 w-full sm:w-auto flex">
            <TabsTrigger 
              value="notes" 
              className="flex-1 sm:flex-none data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold text-xs sm:text-sm"
            >
              <MessageSquare className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Support Notes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="actions"
              className="flex-1 sm:flex-none data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold text-xs sm:text-sm"
            >
              <Headset className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Support Actions</span>
            </TabsTrigger>
          </TabsList>

          {/* Notes Tab */}
          <TabsContent value="notes" className="mt-4 sm:mt-6">
            <Card className="bg-vault-dark border-vault-gold/20">
              <CardHeader className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-vault-light text-base sm:text-lg">Support Notes</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button onClick={fetchNotes} variant="outline" size="icon" className="border-vault-gold/30">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button 
                      onClick={() => setShowAddNoteDialog(true)}
                      className="bg-vault-gold/20 text-vault-gold hover:bg-vault-gold/30"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Note
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                {notesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-vault-gold" />
                  </div>
                ) : notes.length === 0 ? (
                  <div className="text-center py-8 text-vault-muted">
                    No support notes found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <NoteCard key={note.id} note={note} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="mt-4 sm:mt-6">
            <div className="space-y-4">
              {/* User Search */}
              <Card className="bg-vault-dark border-vault-gold/20">
                <CardHeader className="p-4">
                  <CardTitle className="text-vault-light text-base">Find User</CardTitle>
                  <CardDescription className="text-vault-muted text-sm">
                    Search for a user to perform support actions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search by email or name..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchUsers(userSearch)}
                      className="bg-vault-navy border-vault-gold/20"
                    />
                    <Button 
                      onClick={() => fetchUsers(userSearch)}
                      className="bg-vault-gold/20 text-vault-gold hover:bg-vault-gold/30"
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {usersLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-vault-gold" />
                    </div>
                  ) : users.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {users.map((user) => (
                        <UserActionCard
                          key={user.user_id}
                          user={user}
                          onExtendTrial={() => { setSelectedUser(user); setShowExtendTrialDialog(true); }}
                          onUnlock={() => { setSelectedUser(user); setShowUnlockDialog(true); }}
                          onReset2FA={() => { setSelectedUser(user); setShowReset2FADialog(true); }}
                          onAddNote={() => { setSelectedUser(user); setShowAddNoteDialog(true); }}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="grid sm:grid-cols-3 gap-4">
                <ActionCard
                  icon={Clock}
                  title="Extend Trial"
                  description="Extend trial period (max 30 days)"
                  onClick={() => setShowExtendTrialDialog(true)}
                  color="text-blue-400"
                />
                <ActionCard
                  icon={Unlock}
                  title="Unlock Account"
                  description="Unlock a locked user account"
                  onClick={() => setShowUnlockDialog(true)}
                  color="text-emerald-400"
                />
                <ActionCard
                  icon={KeyRound}
                  title="Reset 2FA"
                  description="Reset two-factor authentication"
                  onClick={() => setShowReset2FADialog(true)}
                  color="text-amber-400"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Add Note Dialog */}
        <AddNoteDialog
          open={showAddNoteDialog}
          onClose={() => { setShowAddNoteDialog(false); setSelectedUser(null); }}
          user={selectedUser}
          onSave={handleAddNote}
          loading={actionLoading}
        />

        {/* Extend Trial Dialog */}
        <ExtendTrialDialog
          open={showExtendTrialDialog}
          onClose={() => { setShowExtendTrialDialog(false); setSelectedUser(null); }}
          user={selectedUser}
          onConfirm={handleExtendTrial}
          loading={actionLoading}
        />

        {/* Unlock Account Dialog */}
        <UnlockAccountDialog
          open={showUnlockDialog}
          onClose={() => { setShowUnlockDialog(false); setSelectedUser(null); }}
          user={selectedUser}
          onConfirm={handleUnlockAccount}
          loading={actionLoading}
        />

        {/* Reset 2FA Dialog */}
        <Reset2FADialog
          open={showReset2FADialog}
          onClose={() => { setShowReset2FADialog(false); setSelectedUser(null); }}
          user={selectedUser}
          onConfirm={handleReset2FA}
          loading={actionLoading}
        />
      </div>
    </div>
  );
}

// Note Card Component
function NoteCard({ note }) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = NOTE_TYPES.find(t => t.value === note.note_type) || NOTE_TYPES[0];
  
  return (
    <div className="p-3 rounded-lg bg-vault-navy/50 border border-vault-gold/10">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={`${typeConfig.color} text-xs`}>
              {typeConfig.label}
            </Badge>
            {note.is_internal && (
              <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 text-xs">
                Internal
              </Badge>
            )}
          </div>
          <p className={`text-sm text-vault-light ${!expanded && 'line-clamp-2'}`}>
            {note.content}
          </p>
          {note.content.length > 150 && (
            <button 
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-vault-gold mt-1"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-vault-muted">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {note.created_by_name || 'Admin'}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {new Date(note.created_at).toLocaleDateString()}
        </span>
        {note.tags?.length > 0 && (
          <span className="flex items-center gap-1">
            <Tag className="w-3 h-3" />
            {note.tags.join(', ')}
          </span>
        )}
      </div>
    </div>
  );
}

// User Action Card Component
function UserActionCard({ user, onExtendTrial, onUnlock, onReset2FA, onAddNote }) {
  return (
    <div className="p-3 rounded-lg bg-vault-navy/50 border border-vault-gold/10 hover:border-vault-gold/20 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-vault-gold/20 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-vault-gold" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-vault-light truncate">{user.name || 'Unknown'}</p>
            <p className="text-xs text-vault-muted truncate">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button onClick={onAddNote} variant="ghost" size="sm" className="h-8 px-2" title="Add Note">
            <MessageSquare className="w-4 h-4" />
          </Button>
          <Button onClick={onExtendTrial} variant="ghost" size="sm" className="h-8 px-2 text-blue-400" title="Extend Trial">
            <Clock className="w-4 h-4" />
          </Button>
          <Button onClick={onUnlock} variant="ghost" size="sm" className="h-8 px-2 text-emerald-400" title="Unlock">
            <Unlock className="w-4 h-4" />
          </Button>
          <Button onClick={onReset2FA} variant="ghost" size="sm" className="h-8 px-2 text-amber-400" title="Reset 2FA">
            <KeyRound className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Action Card Component
function ActionCard({ icon: Icon, title, description, onClick, color }) {
  return (
    <Card 
      className="bg-vault-dark border-vault-gold/20 hover:border-vault-gold/30 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-vault-navy flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-vault-light">{title}</p>
            <p className="text-xs text-vault-muted">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Add Note Dialog
function AddNoteDialog({ open, onClose, user, onSave, loading }) {
  const [formData, setFormData] = useState({
    account_id: '',
    user_id: '',
    note_type: 'GENERAL',
    content: '',
    is_internal: false,
    tags: []
  });

  // Reset form when dialog opens with user
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open) {
      setFormData({
        account_id: user?.account_id || '',
        user_id: user?.user_id || '',
        note_type: 'GENERAL',
        content: '',
        is_internal: false,
        tags: []
      });
    }
  }, [open, user?.user_id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.content.trim()) {
      toast.error('Note content is required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-vault-dark border-vault-gold/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-vault-light">Add Support Note</DialogTitle>
          <DialogDescription className="text-vault-muted">
            {user ? `Adding note for ${user.email}` : 'Add a support note to an account or user.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-vault-muted">Note Type</Label>
            <Select value={formData.note_type} onValueChange={(v) => setFormData({ ...formData, note_type: v })}>
              <SelectTrigger className="bg-vault-navy border-vault-gold/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-vault-dark border-vault-gold/20">
                {NOTE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-vault-muted">Content</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Enter support note..."
              className="bg-vault-navy border-vault-gold/20 min-h-[100px]"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <Label className="text-vault-muted">Internal Note (admin only)</Label>
            <Switch
              checked={formData.is_internal}
              onCheckedChange={(checked) => setFormData({ ...formData, is_internal: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-vault-gold/20">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-vault-gold/20 text-vault-gold hover:bg-vault-gold/30">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Note
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Extend Trial Dialog
function ExtendTrialDialog({ open, onClose, user, onConfirm, loading }) {
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    onConfirm(user?.account_id || '', days, reason);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-vault-dark border-vault-gold/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-vault-light flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Extend Trial
          </DialogTitle>
          <DialogDescription className="text-vault-muted">
            {user ? `Extending trial for ${user.email}` : 'Extend trial period for an account.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-vault-muted">Days to Extend (max 30)</Label>
            <Input
              type="number"
              value={days}
              onChange={(e) => setDays(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
              min={1}
              max={30}
              className="bg-vault-navy border-vault-gold/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-vault-muted">Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for extending trial..."
              className="bg-vault-navy border-vault-gold/20 min-h-[80px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-vault-gold/20">Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Extend Trial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Unlock Account Dialog
function UnlockAccountDialog({ open, onClose, user, onConfirm, loading }) {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    onConfirm(user?.user_id || '', reason);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-vault-dark border-vault-gold/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-vault-light flex items-center gap-2">
            <Unlock className="w-5 h-5 text-emerald-400" />
            Unlock Account
          </DialogTitle>
          <DialogDescription className="text-vault-muted">
            {user ? `Unlocking account for ${user.email}` : 'Unlock a locked user account.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-vault-muted">Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for unlocking..."
              className="bg-vault-navy border-vault-gold/20 min-h-[80px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-vault-gold/20">Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Unlock Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Reset 2FA Dialog
function Reset2FADialog({ open, onClose, user, onConfirm, loading }) {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    onConfirm(user?.user_id || '', reason);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-vault-dark border-vault-gold/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-vault-light flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-400" />
            Reset 2FA
          </DialogTitle>
          <DialogDescription className="text-vault-muted">
            {user ? `Resetting 2FA for ${user.email}` : 'Reset two-factor authentication for a user.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-400">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              This will disable 2FA for the user. They will need to set it up again.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-vault-muted">Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for resetting 2FA..."
              className="bg-vault-navy border-vault-gold/20 min-h-[80px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-vault-gold/20">Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Reset 2FA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
