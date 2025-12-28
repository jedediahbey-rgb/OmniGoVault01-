import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Cog,
  Users as UsersIcon,
  Building2,
  Search,
  Eye,
  Replace,
  Crown,
  AlertTriangle,
  ChevronRight,
  Loader2,
  Clock,
  Activity,
  Settings,
  Lock,
  Unlock,
  FileText,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
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
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Role badge colors
const roleBadgeColors = {
  OMNICOMPETENT: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  SUPPORT_ADMIN: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  BILLING_ADMIN: 'bg-green-500/20 text-green-400 border-green-500/30'
};

const AdminConsolePage = () => {
  const navigate = useNavigate();
  const [adminStatus, setAdminStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('accounts');
  
  // Accounts state
  const [accounts, setAccounts] = useState([]);
  const [accountSearch, setAccountSearch] = useState('');
  const [accountsLoading, setAccountsLoading] = useState(false);
  
  // Users state
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  
  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  
  // Dialogs
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showGrantRoleDialog, setShowGrantRoleDialog] = useState(false);
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [showImpersonateDialog, setShowImpersonateDialog] = useState(false);
  
  // Plans
  const [plans, setPlans] = useState([]);

  // Check admin status on mount
  useEffect(() => {
    checkAdminStatus();
    fetchPlans();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/admin/status`);
      setAdminStatus(response.data);
      
      if (!response.data.is_admin) {
        toast.error('Admin access required');
        navigate('/vault');
        return;
      }
      
      setLoading(false);
      // Load initial data
      fetchAccounts();
    } catch (error) {
      console.error('Error checking admin status:', error);
      toast.error('Failed to verify admin access');
      navigate('/vault');
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/billing/plans`);
      setPlans(response.data.plans || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchAccounts = useCallback(async (search = '') => {
    setAccountsLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/admin/accounts`, {
        params: { search: search || undefined, limit: 50 }
      });
      setAccounts(response.data.accounts || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async (search = '') => {
    setUsersLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/admin/users`, {
        params: { search: search || undefined, limit: 50 }
      });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/admin/audit-logs`, {
        params: { limit: 100 }
      });
      setAuditLogs(response.data.logs || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      if (error.response?.status === 403) {
        toast.error('Omnicompetent access required for audit logs');
      }
    } finally {
      setLogsLoading(false);
    }
  }, []);

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'accounts' && accounts.length === 0) fetchAccounts();
    if (tab === 'users' && users.length === 0) fetchUsers();
    if (tab === 'audit' && auditLogs.length === 0) fetchAuditLogs();
  };

  // Search handlers
  const handleAccountSearch = () => fetchAccounts(accountSearch);
  const handleUserSearch = () => fetchUsers(userSearch);

  // Grant role handler
  const handleGrantRole = async (userId, role, notes) => {
    try {
      await axios.post(`${BACKEND_URL}/api/admin/roles/grant`, {
        user_id: userId,
        role: role,
        notes: notes
      });
      toast.success(`Granted ${role} to user`);
      setShowGrantRoleDialog(false);
      fetchUsers(userSearch);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to grant role');
    }
  };

  // Revoke role handler
  const handleRevokeRole = async (userId, role) => {
    try {
      await axios.post(`${BACKEND_URL}/api/admin/roles/revoke`, {
        user_id: userId,
        role: role,
        reason: 'Revoked via admin console'
      });
      toast.success(`Revoked ${role} from user`);
      fetchUsers(userSearch);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to revoke role');
    }
  };

  // Change plan handler
  const handleChangePlan = async (accountId, planId, reason) => {
    try {
      await axios.post(`${BACKEND_URL}/api/admin/accounts/${accountId}/change-plan`, {
        plan_id: planId,
        reason: reason
      });
      toast.success('Plan changed successfully');
      setShowChangePlanDialog(false);
      fetchAccounts(accountSearch);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change plan');
    }
  };

  // Impersonation handlers
  const handleStartImpersonation = async (userId, reason) => {
    try {
      await axios.post(`${BACKEND_URL}/api/admin/impersonate/start`, {
        target_user_id: userId,
        reason: reason
      });
      toast.success('Impersonation started');
      setShowImpersonateDialog(false);
      checkAdminStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start impersonation');
    }
  };

  const handleStopImpersonation = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/admin/impersonate/stop`);
      toast.success('Impersonation ended');
      checkAdminStatus();
    } catch (error) {
      toast.error('Failed to stop impersonation');
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
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Impersonation Banner */}
        {adminStatus?.active_impersonation && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Replace className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <span className="text-yellow-400 font-medium text-sm sm:text-base">
                Viewing as user: {adminStatus.active_impersonation.target_user_id}
              </span>
            </div>
            <Button
              onClick={handleStopImpersonation}
              variant="outline"
              size="sm"
              className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 w-full sm:w-auto"
            >
              Exit Impersonation
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-vault-light flex items-center gap-2 sm:gap-3">
              <Cog className="w-5 h-5 sm:w-7 sm:h-7 text-purple-400 flex-shrink-0" />
              Admin Console
            </h1>
            <p className="text-vault-muted mt-1 text-sm">Platform administration and oversight</p>
          </div>
          
          {/* Admin Role Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {adminStatus?.global_roles?.map((role) => (
              <Badge
                key={role}
                variant="outline"
                className={`${roleBadgeColors[role] || 'bg-gray-500/20 text-gray-400'} text-xs`}
              >
                {role === 'OMNICOMPETENT' && <Crown className="w-3 h-3 mr-1" />}
                {role}
              </Badge>
            ))}
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="bg-vault-dark border border-vault-gold/20 w-full sm:w-auto flex">
            <TabsTrigger 
              value="accounts" 
              className="flex-1 sm:flex-none data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold text-xs sm:text-sm"
            >
              <Building2 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Accounts</span>
            </TabsTrigger>
            <TabsTrigger 
              value="users"
              className="flex-1 sm:flex-none data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold text-xs sm:text-sm"
            >
              <UsersIcon className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            {adminStatus?.is_omnicompetent && (
              <TabsTrigger 
                value="audit"
                className="flex-1 sm:flex-none data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold text-xs sm:text-sm"
              >
                <FileText className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Audit Logs</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Accounts Tab */}
          <TabsContent value="accounts" className="mt-4 sm:mt-6">
            <Card className="bg-vault-dark border-vault-gold/20">
              <CardHeader className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-vault-light text-base sm:text-lg">All Accounts</CardTitle>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Input
                      placeholder="Search accounts..."
                      value={accountSearch}
                      onChange={(e) => setAccountSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAccountSearch()}
                      className="flex-1 sm:w-64 bg-vault-navy border-vault-gold/20 text-sm"
                    />
                    <Button
                      onClick={handleAccountSearch}
                      variant="outline"
                      size="icon"
                      className="border-vault-gold/30 flex-shrink-0"
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => fetchAccounts(accountSearch)}
                      variant="outline"
                      size="icon"
                      className="border-vault-gold/30"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {accountsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-vault-gold" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {accounts.map((account) => (
                      <AccountRow
                        key={account.account_id}
                        account={account}
                        onViewDetails={() => setSelectedAccount(account)}
                        onChangePlan={() => {
                          setSelectedAccount(account);
                          setShowChangePlanDialog(true);
                        }}
                        isOmnicompetent={adminStatus?.is_omnicompetent}
                      />
                    ))}
                    {accounts.length === 0 && (
                      <p className="text-center text-vault-muted py-8">No accounts found</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-4 sm:mt-6">
            <Card className="bg-vault-dark border-vault-gold/20">
              <CardHeader className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-vault-light text-base sm:text-lg">All Users</CardTitle>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUserSearch()}
                      className="flex-1 sm:w-64 bg-vault-navy border-vault-gold/20 text-sm"
                    />
                    <Button
                      onClick={handleUserSearch}
                      variant="outline"
                      size="icon"
                      className="border-vault-gold/30 flex-shrink-0"
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-vault-gold" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.map((user) => (
                      <UserRow
                        key={user.user_id}
                        user={user}
                        onViewDetails={() => setSelectedUser(user)}
                        onGrantRole={() => {
                          setSelectedUser(user);
                          setShowGrantRoleDialog(true);
                        }}
                        onRevokeRole={(role) => handleRevokeRole(user.user_id, role)}
                        onImpersonate={() => {
                          setSelectedUser(user);
                          setShowImpersonateDialog(true);
                        }}
                        isOmnicompetent={adminStatus?.is_omnicompetent}
                        currentUserId={adminStatus?.user_id}
                      />
                    ))}
                    {users.length === 0 && (
                      <p className="text-center text-vault-muted py-8">No users found</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit" className="mt-6">
            <Card className="bg-vault-dark border-vault-gold/20">
              <CardHeader className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-vault-light text-base sm:text-lg">Admin Audit Logs</CardTitle>
                  <Button
                    onClick={fetchAuditLogs}
                    variant="outline"
                    size="sm"
                    className="border-vault-gold/30 w-full sm:w-auto"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-vault-gold" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.map((log) => (
                      <AuditLogRow key={log.id} log={log} />
                    ))}
                    {auditLogs.length === 0 && (
                      <p className="text-center text-vault-muted py-8">No audit logs found</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Grant Role Dialog */}
        <GrantRoleDialog
          open={showGrantRoleDialog}
          onClose={() => setShowGrantRoleDialog(false)}
          user={selectedUser}
          onGrant={handleGrantRole}
        />

        {/* Change Plan Dialog */}
        <ChangePlanDialog
          open={showChangePlanDialog}
          onClose={() => setShowChangePlanDialog(false)}
          account={selectedAccount}
          plans={plans}
          onChangePlan={handleChangePlan}
        />

        {/* Impersonate Dialog */}
        <ImpersonateDialog
          open={showImpersonateDialog}
          onClose={() => setShowImpersonateDialog(false)}
          user={selectedUser}
          onImpersonate={handleStartImpersonation}
        />
      </div>
    </div>
  );
};

// Account Row Component
const AccountRow = ({ account, onViewDetails, onChangePlan, isOmnicompetent }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-vault-navy/50 rounded-lg border border-vault-gold/10 hover:border-vault-gold/20 transition-colors gap-3">
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-vault-gold/10 flex items-center justify-center flex-shrink-0">
        <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-vault-gold" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-vault-light text-sm sm:text-base truncate">{account.name}</p>
        <p className="text-xs text-vault-muted truncate">{account.account_id}</p>
      </div>
    </div>
    
    <div className="flex items-center gap-2 sm:gap-4 ml-11 sm:ml-0 flex-wrap">
      <Badge variant="outline" className="border-vault-gold/30 text-vault-gold text-xs">
        {account.plan_name}
      </Badge>
      <span className="text-xs sm:text-sm text-vault-muted">
        {account.member_count} member{account.member_count !== 1 ? 's' : ''}
      </span>
      {account.is_suspended && (
        <Badge variant="outline" className="border-red-500/30 text-red-400 text-xs">
          <Lock className="w-3 h-3 mr-1" />
          Suspended
        </Badge>
      )}
      <div className="flex gap-1 sm:gap-2 ml-auto">
        <Button variant="ghost" size="sm" onClick={onViewDetails} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
          <Eye className="w-4 h-4" />
        </Button>
        {isOmnicompetent && (
          <Button variant="ghost" size="sm" onClick={onChangePlan} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
            <Settings className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  </div>
);

// User Row Component
const UserRow = ({ user, onViewDetails, onGrantRole, onRevokeRole, onImpersonate, isOmnicompetent, currentUserId }) => {
  if (!user) return null;
  
  const handleRevokeRole = (role) => {
    if (isOmnicompetent && user.user_id !== currentUserId && onRevokeRole) {
      onRevokeRole(role);
    }
  };
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-vault-navy/50 rounded-lg border border-vault-gold/10 hover:border-vault-gold/20 transition-colors gap-3">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-vault-gold/10 flex items-center justify-center flex-shrink-0">
          {user.is_omnicompetent ? (
            <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
          ) : (
            <UsersIcon className="w-4 h-4 sm:w-5 sm:h-5 text-vault-gold" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-vault-light text-sm sm:text-base truncate">{user.email || user.name || 'Unknown'}</p>
          <p className="text-xs text-vault-muted truncate">{user.user_id}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-3 ml-11 sm:ml-0 flex-wrap">
        {(user.global_roles || []).map((role) => (
          <Badge
            key={role}
            variant="outline"
            className={`${roleBadgeColors[role] || 'bg-gray-500/20 text-gray-400'} cursor-pointer hover:opacity-80`}
            onClick={() => handleRevokeRole(role)}
          >
            {role}
            {isOmnicompetent && user.user_id !== currentUserId && (
              <span className="ml-1 text-xs">×</span>
            )}
          </Badge>
        ))}
        
        <div className="flex gap-1 sm:gap-2 ml-auto">
          <Button variant="ghost" size="sm" onClick={onViewDetails || (() => {})} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
            <Eye className="w-4 h-4" />
          </Button>
          {isOmnicompetent && (
            <Button variant="ghost" size="sm" onClick={onGrantRole || (() => {})} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
              <ShieldCheck className="w-4 h-4" />
            </Button>
          )}
          {user.user_id !== currentUserId && (
            <Button variant="ghost" size="sm" onClick={onImpersonate || (() => {})} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
              <Replace className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// Audit Log Row Component
const AuditLogRow = ({ log }) => {
  const actionColors = {
    GRANT_GLOBAL_ROLE: 'text-green-400',
    REVOKE_GLOBAL_ROLE: 'text-red-400',
    IMPERSONATION_START: 'text-yellow-400',
    IMPERSONATION_END: 'text-yellow-400',
    CHANGE_PLAN: 'text-blue-400',
    UPDATE_ENTITLEMENT: 'text-purple-400',
    SUSPEND_ACCOUNT: 'text-red-400',
    VIEW_AUDIT_LOGS: 'text-cyan-400'
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-vault-navy/30 rounded-lg text-sm">
      <div className="flex items-center gap-2 sm:gap-4">
        <Clock className="w-4 h-4 text-vault-muted flex-shrink-0" />
        <span className="text-vault-muted text-xs sm:text-sm">
          {new Date(log.timestamp).toLocaleString()}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap ml-6 sm:ml-0">
        <Badge 
          variant="outline" 
          className={`${actionColors[log.action_type] || 'text-vault-light'} border-current/30 text-xs`}
        >
          {log.action_type}
        </Badge>
        {!log.success && (
          <Badge variant="outline" className="border-red-500/30 text-red-400 text-xs">
            Failed
          </Badge>
        )}
      </div>
      <span className="text-vault-light text-xs ml-6 sm:ml-0 sm:flex-1 truncate">
        {log.target_user_id && `User: ${log.target_user_id.substring(0, 12)}...`}
        {log.account_id && ` Account: ${log.account_id.substring(0, 12)}...`}
      </span>
    </div>
  );
};

// Grant Role Dialog
const GrantRoleDialog = ({ open, onClose, user, onGrant }) => {
  const [selectedRole, setSelectedRole] = useState('');
  const [notes, setNotes] = useState('');

  const handleGrant = () => {
    if (!selectedRole) return;
    onGrant(user?.user_id, selectedRole, notes);
    setSelectedRole('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-vault-dark border-vault-gold/30">
        <DialogHeader>
          <DialogTitle className="text-vault-light">Grant Access to User</DialogTitle>
          <DialogDescription className="text-vault-muted">
            Assign access permissions to {user?.email}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-vault-light">Access Level</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="bg-vault-navy border-vault-gold/20">
                <SelectValue placeholder="Select access level" />
              </SelectTrigger>
              <SelectContent className="bg-vault-dark border-vault-gold/20">
                <SelectItem value="OMNICOMPETENT">
                  <div className="flex flex-col">
                    <span className="font-medium">OMNICOMPETENT - All Features Free</span>
                    <span className="text-xs text-vault-muted">Access all platform features without billing</span>
                  </div>
                </SelectItem>
                <SelectItem value="SUPPORT_ADMIN">
                  <div className="flex flex-col">
                    <span className="font-medium">SUPPORT_ADMIN - Limited Admin</span>
                    <span className="text-xs text-vault-muted">View accounts and assist users (no control)</span>
                  </div>
                </SelectItem>
                <SelectItem value="BILLING_ADMIN">
                  <div className="flex flex-col">
                    <span className="font-medium">BILLING_ADMIN - Billing Only</span>
                    <span className="text-xs text-vault-muted">Manage billing and pricing</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-vault-light">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for granting this access..."
              className="bg-vault-navy border-vault-gold/20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-vault-gold/30">
            Cancel
          </Button>
          <Button
            onClick={handleGrant}
            disabled={!selectedRole}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            Grant Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Change Plan Dialog
const ChangePlanDialog = ({ open, onClose, account, plans, onChangePlan }) => {
  const [selectedPlan, setSelectedPlan] = useState('');
  const [reason, setReason] = useState('');

  const handleChange = () => {
    if (!selectedPlan) return;
    onChangePlan(account?.account_id, selectedPlan, reason);
    setSelectedPlan('');
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-vault-dark border-vault-gold/30">
        <DialogHeader>
          <DialogTitle className="text-vault-light">Change Account Plan</DialogTitle>
          <DialogDescription className="text-vault-muted">
            Change the subscription plan for {account?.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-vault-light">New Plan</Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger className="bg-vault-navy border-vault-gold/20">
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent className="bg-vault-dark border-vault-gold/20">
                {plans.map((plan) => (
                  <SelectItem key={plan.plan_id} value={plan.plan_id}>
                    {plan.name} - ${plan.price_monthly}/mo
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-vault-light">Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for plan change..."
              className="bg-vault-navy border-vault-gold/20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-vault-gold/30">
            Cancel
          </Button>
          <Button
            onClick={handleChange}
            disabled={!selectedPlan}
            className="bg-vault-gold hover:bg-vault-gold/90 text-vault-navy"
          >
            Change Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Impersonate Dialog
const ImpersonateDialog = ({ open, onClose, user, onImpersonate }) => {
  const [reason, setReason] = useState('');

  const handleImpersonate = () => {
    onImpersonate(user?.user_id, reason);
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-vault-dark border-vault-gold/30">
        <DialogHeader>
          <DialogTitle className="text-vault-light flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            Start Impersonation
          </DialogTitle>
          <DialogDescription className="text-vault-muted">
            You are about to view the platform as {user?.email}. All actions will be logged.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
            This action is fully audited. Only use for legitimate support or debugging purposes.
          </div>
          
          <div className="space-y-2">
            <Label className="text-vault-light">Reason (required)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Support ticket #, debugging issue, etc..."
              className="bg-vault-navy border-vault-gold/20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-vault-gold/30">
            Cancel
          </Button>
          <Button
            onClick={handleImpersonate}
            disabled={!reason.trim()}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            <Replace className="w-4 h-4 mr-2" />
            Start Impersonation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminConsolePage;
