import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  GitBranch,
  GitMerge,
  GitFork,
  ArrowsLeftRight,
  Trash,
  PencilSimple,
  Plus,
  MagnifyingGlass,
  CaretRight,
  Check,
  X,
  FileText,
  Warning,
  Info,
  ArrowLeft
} from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CATEGORY_COLORS = {
  minutes: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  distribution: 'bg-green-500/20 text-green-400 border-green-500/30',
  dispute: 'bg-red-500/20 text-red-400 border-red-500/30',
  insurance: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  trustee_compensation: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  policy: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  misc: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
};

const CATEGORY_LABELS = {
  minutes: 'Meeting Minutes',
  distribution: 'Distributions',
  dispute: 'Disputes',
  insurance: 'Insurance',
  trustee_compensation: 'Compensation',
  policy: 'Policies',
  misc: 'Miscellaneous'
};

export default function LedgerThreadsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const portfolioId = searchParams.get('portfolio') || '';
  const { toast } = useToast();

  // Data state
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Selection state for operations
  const [selectedThreads, setSelectedThreads] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);

  // Modal state
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  // Active thread for operations
  const [activeThread, setActiveThread] = useState(null);
  const [threadRecords, setThreadRecords] = useState([]);

  // Form state
  const [mergeReason, setMergeReason] = useState('');
  const [splitTitle, setSplitTitle] = useState('');
  const [splitReason, setSplitReason] = useState('');
  const [reassignTarget, setReassignTarget] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [editForm, setEditForm] = useState({ title: '', external_ref: '', primary_party_name: '' });
  const [newThreadForm, setNewThreadForm] = useState({ title: '', category: 'misc', party_name: '', external_ref: '' });

  // Processing state
  const [processing, setProcessing] = useState(false);

  // Fetch threads
  const fetchThreads = useCallback(async () => {
    if (!portfolioId) {
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({ portfolio_id: portfolioId });
      if (search) params.set('search', search);
      if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter);

      const res = await fetch(`${API_URL}/api/ledger-threads?${params}`);
      const data = await res.json();

      if (data.ok) {
        setThreads(data.data.items || []);
      }
    } catch (error) {
      console.error('Error fetching threads:', error);
      toast({ title: 'Error', description: 'Failed to load ledger threads', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [portfolioId, search, categoryFilter, toast]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Fetch records for a thread
  const fetchThreadRecords = async (threadId) => {
    try {
      const res = await fetch(`${API_URL}/api/ledger-threads/${threadId}`);
      const data = await res.json();
      if (data.ok) {
        setThreadRecords(data.data.records || []);
      }
    } catch (error) {
      console.error('Error fetching thread records:', error);
    }
  };

  // Toggle thread selection
  const toggleThreadSelection = (threadId) => {
    setSelectedThreads(prev =>
      prev.includes(threadId)
        ? prev.filter(id => id !== threadId)
        : [...prev, threadId]
    );
  };

  // Toggle record selection
  const toggleRecordSelection = (recordId) => {
    setSelectedRecords(prev =>
      prev.includes(recordId)
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  // Handle Merge
  const handleMerge = async () => {
    if (!activeThread || selectedThreads.length === 0) return;

    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/ledger-threads/${activeThread.id}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_thread_ids: selectedThreads,
          merge_reason: mergeReason
        })
      });
      const data = await res.json();

      if (data.ok) {
        toast({
          title: 'Threads Merged',
          description: data.message || `Merged ${data.data.records_merged} records`
        });
        setShowMergeModal(false);
        setSelectedThreads([]);
        setMergeReason('');
        fetchThreads();
      } else {
        toast({ title: 'Error', description: data.error?.message || 'Merge failed', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to merge threads', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  // Handle Split
  const handleSplit = async () => {
    if (!activeThread || selectedRecords.length === 0 || !splitTitle.trim()) return;

    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/ledger-threads/${activeThread.id}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_ids: selectedRecords,
          new_thread_title: splitTitle,
          split_reason: splitReason
        })
      });
      const data = await res.json();

      if (data.ok) {
        toast({
          title: 'Thread Split',
          description: data.message || `Moved ${data.data.records_moved} records to new thread`
        });
        setShowSplitModal(false);
        setSelectedRecords([]);
        setSplitTitle('');
        setSplitReason('');
        fetchThreads();
      } else {
        toast({ title: 'Error', description: data.error?.message || 'Split failed', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to split thread', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  // Handle Reassign
  const handleReassign = async () => {
    if (selectedRecords.length === 0 || !reassignTarget) return;

    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/ledger-threads/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_ids: selectedRecords,
          target_thread_id: reassignTarget,
          reassign_reason: reassignReason
        })
      });
      const data = await res.json();

      if (data.ok) {
        toast({
          title: 'Records Reassigned',
          description: data.message || `Reassigned ${data.data.records_reassigned} records`
        });
        setShowReassignModal(false);
        setSelectedRecords([]);
        setReassignTarget('');
        setReassignReason('');
        fetchThreads();
      } else {
        toast({ title: 'Error', description: data.error?.message || 'Reassign failed', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reassign records', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  // Handle Edit
  const handleEdit = async () => {
    if (!activeThread) return;

    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/ledger-threads/${activeThread.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();

      if (data.ok) {
        toast({ title: 'Thread Updated', description: 'Thread details updated successfully' });
        setShowEditModal(false);
        fetchThreads();
      } else {
        toast({ title: 'Error', description: data.error?.message || 'Update failed', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update thread', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!activeThread) return;

    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/ledger-threads/${activeThread.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.ok) {
        toast({ title: 'Thread Deleted', description: 'Thread deleted successfully' });
        setShowDeleteModal(false);
        setActiveThread(null);
        fetchThreads();
      } else {
        toast({ title: 'Error', description: data.error?.message || 'Delete failed', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete thread', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  // Handle Create New Thread
  const handleCreateThread = async () => {
    if (!newThreadForm.title.trim()) return;

    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/ledger-threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolio_id: portfolioId,
          title: newThreadForm.title,
          category: newThreadForm.category,
          party_name: newThreadForm.party_name,
          external_ref: newThreadForm.external_ref
        })
      });
      const data = await res.json();

      if (data.ok) {
        toast({ title: 'Thread Created', description: `New thread created: ${data.data.rm_id_preview}` });
        setShowNewModal(false);
        setNewThreadForm({ title: '', category: 'misc', party_name: '', external_ref: '' });
        fetchThreads();
      } else {
        toast({ title: 'Error', description: data.error?.message || 'Create failed', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create thread', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  // Open modals with context
  const openMergeModal = (thread) => {
    setActiveThread(thread);
    setSelectedThreads([]);
    setShowMergeModal(true);
  };

  const openSplitModal = async (thread) => {
    setActiveThread(thread);
    setSelectedRecords([]);
    await fetchThreadRecords(thread.id);
    setShowSplitModal(true);
  };

  const openReassignModal = async (thread) => {
    setActiveThread(thread);
    setSelectedRecords([]);
    await fetchThreadRecords(thread.id);
    setShowReassignModal(true);
  };

  const openEditModal = (thread) => {
    setActiveThread(thread);
    setEditForm({
      title: thread.title,
      external_ref: thread.external_ref || '',
      primary_party_name: thread.primary_party_name || ''
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (thread) => {
    setActiveThread(thread);
    setShowDeleteModal(true);
  };

  if (!portfolioId) {
    return (
      <div className="min-h-screen bg-vault-dark p-6">
        <div className="max-w-4xl mx-auto text-center py-20">
          <GitBranch className="w-16 h-16 text-vault-gold mx-auto mb-4" />
          <h1 className="text-2xl font-heading text-white mb-2">Ledger Thread Manager</h1>
          <p className="text-vault-muted mb-6">Select a portfolio to manage ledger threads</p>
          <Button onClick={() => navigate('/vault')} className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark">
            Go to Vault
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vault-dark p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-vault-muted hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-heading text-white flex items-center gap-2">
                <GitBranch className="w-6 h-6 text-vault-gold" />
                Ledger Thread Manager
              </h1>
              <p className="text-vault-muted text-sm">Merge, split, and reassign records between threads</p>
            </div>
          </div>

          <Button
            onClick={() => setShowNewModal(true)}
            className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Thread
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vault-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search threads..."
              className="pl-10 bg-[#05080F] border-vault-gold/20 text-white"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48 bg-[#05080F] border-vault-gold/20 text-white">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-[#0B1221] border-vault-gold/30">
              <SelectItem value="all" className="text-white hover:bg-vault-gold/20">All Categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-white hover:bg-vault-gold/20">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Threads Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-20 bg-[#0B1221]/50 rounded-lg border border-vault-gold/10">
            <GitBranch className="w-12 h-12 text-vault-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Ledger Threads</h3>
            <p className="text-vault-muted mb-4">Create your first ledger thread to organize records</p>
            <Button onClick={() => setShowNewModal(true)} className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark">
              <Plus className="w-4 h-4 mr-2" />
              Create Thread
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {threads.map((thread) => (
              <motion.div
                key={thread.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0B1221]/80 rounded-lg border border-vault-gold/10 p-4 hover:border-vault-gold/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-vault-gold text-sm bg-vault-gold/10 px-2 py-0.5 rounded">
                        {thread.rm_id_preview}
                      </span>
                      <Badge className={`text-xs ${CATEGORY_COLORS[thread.category] || CATEGORY_COLORS.misc}`}>
                        {CATEGORY_LABELS[thread.category] || thread.category}
                      </Badge>
                      <span className="text-vault-muted text-xs">
                        {thread.record_count} record{thread.record_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <h3 className="text-white font-medium mb-1">{thread.title}</h3>
                    {thread.primary_party_name && (
                      <p className="text-vault-muted text-sm">Party: {thread.primary_party_name}</p>
                    )}
                    {thread.external_ref && (
                      <p className="text-vault-muted text-sm">Ref: {thread.external_ref}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openMergeModal(thread)}
                      className="text-vault-muted hover:text-blue-400 hover:bg-blue-500/10"
                      title="Merge into this thread"
                    >
                      <GitMerge className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openSplitModal(thread)}
                      className="text-vault-muted hover:text-green-400 hover:bg-green-500/10"
                      title="Split records from this thread"
                      disabled={thread.record_count === 0}
                    >
                      <GitFork className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openReassignModal(thread)}
                      className="text-vault-muted hover:text-purple-400 hover:bg-purple-500/10"
                      title="Reassign records"
                      disabled={thread.record_count === 0}
                    >
                      <ArrowsLeftRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(thread)}
                      className="text-vault-muted hover:text-amber-400 hover:bg-amber-500/10"
                      title="Edit thread"
                    >
                      <PencilSimple className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteModal(thread)}
                      className="text-vault-muted hover:text-red-400 hover:bg-red-500/10"
                      title="Delete thread"
                      disabled={thread.record_count > 0}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Merge Modal */}
        <Dialog open={showMergeModal} onOpenChange={setShowMergeModal}>
          <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-heading text-vault-gold flex items-center gap-2">
                <GitMerge className="w-5 h-5" />
                Merge Threads
              </DialogTitle>
              <DialogDescription className="text-vault-muted">
                Select threads to merge into: <span className="text-vault-gold">{activeThread?.title}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-400 flex gap-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Records from selected threads will be moved to the target thread. Source threads will be archived.</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {threads.filter(t => t.id !== activeThread?.id).map((thread) => (
                  <label
                    key={thread.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-vault-gold/10 hover:border-vault-gold/30 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedThreads.includes(thread.id)}
                      onCheckedChange={() => toggleThreadSelection(thread.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-vault-gold">{thread.rm_id_preview}</span>
                        <span className="text-white text-sm">{thread.title}</span>
                      </div>
                      <span className="text-vault-muted text-xs">{thread.record_count} records</span>
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <label className="text-sm text-vault-muted mb-1 block">Merge Reason (optional)</label>
                <Textarea
                  value={mergeReason}
                  onChange={(e) => setMergeReason(e.target.value)}
                  placeholder="Why are you merging these threads?"
                  className="bg-[#05080F] border-vault-gold/20 text-white min-h-[60px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMergeModal(false)} className="border-vault-gold/30 text-white">
                Cancel
              </Button>
              <Button
                onClick={handleMerge}
                disabled={processing || selectedThreads.length === 0}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {processing ? 'Merging...' : `Merge ${selectedThreads.length} Thread${selectedThreads.length !== 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Split Modal */}
        <Dialog open={showSplitModal} onOpenChange={setShowSplitModal}>
          <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-heading text-vault-gold flex items-center gap-2">
                <GitFork className="w-5 h-5" />
                Split Thread
              </DialogTitle>
              <DialogDescription className="text-vault-muted">
                Select records to move to a new thread from: <span className="text-vault-gold">{activeThread?.title}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm text-vault-muted mb-1 block">New Thread Title *</label>
                <Input
                  value={splitTitle}
                  onChange={(e) => setSplitTitle(e.target.value)}
                  placeholder="Name for the new thread"
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                <label className="text-sm text-vault-muted">Select Records to Move:</label>
                {threadRecords.map((record) => (
                  <label
                    key={record.id}
                    className="flex items-center gap-3 p-2 rounded-lg border border-vault-gold/10 hover:border-vault-gold/30 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedRecords.includes(record.id)}
                      onCheckedChange={() => toggleRecordSelection(record.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-vault-gold">{record.rm_id}</span>
                        <span className="text-white text-sm">{record.title}</span>
                      </div>
                    </div>
                  </label>
                ))}
                {threadRecords.length === 0 && (
                  <p className="text-vault-muted text-sm text-center py-4">No records in this thread</p>
                )}
              </div>

              <div>
                <label className="text-sm text-vault-muted mb-1 block">Split Reason (optional)</label>
                <Textarea
                  value={splitReason}
                  onChange={(e) => setSplitReason(e.target.value)}
                  placeholder="Why are you splitting these records?"
                  className="bg-[#05080F] border-vault-gold/20 text-white min-h-[60px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSplitModal(false)} className="border-vault-gold/30 text-white">
                Cancel
              </Button>
              <Button
                onClick={handleSplit}
                disabled={processing || selectedRecords.length === 0 || !splitTitle.trim()}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {processing ? 'Splitting...' : `Split ${selectedRecords.length} Record${selectedRecords.length !== 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reassign Modal */}
        <Dialog open={showReassignModal} onOpenChange={setShowReassignModal}>
          <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-heading text-vault-gold flex items-center gap-2">
                <ArrowsLeftRight className="w-5 h-5" />
                Reassign Records
              </DialogTitle>
              <DialogDescription className="text-vault-muted">
                Move records from <span className="text-vault-gold">{activeThread?.title}</span> to another thread
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2 max-h-40 overflow-y-auto">
                <label className="text-sm text-vault-muted">Select Records:</label>
                {threadRecords.map((record) => (
                  <label
                    key={record.id}
                    className="flex items-center gap-3 p-2 rounded-lg border border-vault-gold/10 hover:border-vault-gold/30 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedRecords.includes(record.id)}
                      onCheckedChange={() => toggleRecordSelection(record.id)}
                    />
                    <div className="flex-1">
                      <span className="font-mono text-xs text-vault-gold mr-2">{record.rm_id}</span>
                      <span className="text-white text-sm">{record.title}</span>
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <label className="text-sm text-vault-muted mb-1 block">Target Thread *</label>
                <Select value={reassignTarget} onValueChange={setReassignTarget}>
                  <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                    <SelectValue placeholder="Select target thread" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1221] border-vault-gold/30 max-h-48">
                    {threads.filter(t => t.id !== activeThread?.id).map((thread) => (
                      <SelectItem key={thread.id} value={thread.id} className="text-white hover:bg-vault-gold/20">
                        <span className="font-mono text-xs text-vault-gold mr-2">{thread.rm_id_preview}</span>
                        {thread.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-vault-muted mb-1 block">Reassign Reason (optional)</label>
                <Textarea
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="Why are you reassigning these records?"
                  className="bg-[#05080F] border-vault-gold/20 text-white min-h-[60px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReassignModal(false)} className="border-vault-gold/30 text-white">
                Cancel
              </Button>
              <Button
                onClick={handleReassign}
                disabled={processing || selectedRecords.length === 0 || !reassignTarget}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                {processing ? 'Reassigning...' : `Reassign ${selectedRecords.length} Record${selectedRecords.length !== 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-heading text-vault-gold flex items-center gap-2">
                <PencilSimple className="w-5 h-5" />
                Edit Thread
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Title *</label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Party Name</label>
                <Input
                  value={editForm.primary_party_name}
                  onChange={(e) => setEditForm({ ...editForm, primary_party_name: e.target.value })}
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-vault-muted mb-1 block">External Reference</label>
                <Input
                  value={editForm.external_ref}
                  onChange={(e) => setEditForm({ ...editForm, external_ref: e.target.value })}
                  placeholder="Case number, policy ID, etc."
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditModal(false)} className="border-vault-gold/30 text-white">
                Cancel
              </Button>
              <Button
                onClick={handleEdit}
                disabled={processing || !editForm.title.trim()}
                className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark"
              >
                {processing ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Modal */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-heading text-red-400 flex items-center gap-2">
                <Warning className="w-5 h-5" />
                Delete Thread
              </DialogTitle>
              <DialogDescription className="text-vault-muted">
                Are you sure you want to delete <span className="text-white">{activeThread?.title}</span>?
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                This action cannot be undone. The thread will be permanently archived.
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="border-vault-gold/30 text-white">
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={processing}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {processing ? 'Deleting...' : 'Delete Thread'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Thread Modal */}
        <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
          <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-heading text-vault-gold flex items-center gap-2">
                <Plus className="w-5 h-5" />
                New Ledger Thread
              </DialogTitle>
              <DialogDescription className="text-vault-muted">
                Create a new thread to organize related records
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Title *</label>
                <Input
                  value={newThreadForm.title}
                  onChange={(e) => setNewThreadForm({ ...newThreadForm, title: e.target.value })}
                  placeholder="e.g., John Smith Trust Administration"
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Category</label>
                <Select
                  value={newThreadForm.category}
                  onValueChange={(value) => setNewThreadForm({ ...newThreadForm, category: value })}
                >
                  <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]" position="popper" sideOffset={5}>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key} className="text-white hover:bg-vault-gold/20">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-vault-muted mb-1 block">Party Name (optional)</label>
                <Input
                  value={newThreadForm.party_name}
                  onChange={(e) => setNewThreadForm({ ...newThreadForm, party_name: e.target.value })}
                  placeholder="Associated person or entity"
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-vault-muted mb-1 block">External Reference (optional)</label>
                <Input
                  value={newThreadForm.external_ref}
                  onChange={(e) => setNewThreadForm({ ...newThreadForm, external_ref: e.target.value })}
                  placeholder="Case number, policy ID, etc."
                  className="bg-[#05080F] border-vault-gold/20 text-white"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewModal(false)} className="border-vault-gold/30 text-white">
                Cancel
              </Button>
              <Button
                onClick={handleCreateThread}
                disabled={processing || !newThreadForm.title.trim()}
                className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark"
              >
                {processing ? 'Creating...' : 'Create Thread'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
