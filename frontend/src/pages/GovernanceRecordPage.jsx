/**
 * Governance Record Page - Unified editor using Amendment Studio
 * 
 * This page handles viewing and editing governance records using the new V2 API.
 * Works for all module types: minutes, distribution, dispute, insurance, compensation
 * 
 * Features:
 * - Review Mode (read-only for finalized)
 * - Amendment Studio integration
 * - Revision History
 * - Diff Preview
 * - Audit Trail
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CalendarBlank,
  Users,
  FileText,
  Scales,
  Heart,
  Wallet,
  Plus,
  Clock,
  User,
  Hash,
  Shield,
  Warning
} from '@phosphor-icons/react';

// Shadcn components
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../components/ui/dialog';
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

// Governance components
import {
  AmendmentStudio,
  RevisionHistory,
  DiffPreview,
  ReviewModeHeader
} from '../components/governance';

// Shared components
import GlassCard from '../components/shared/GlassCard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/governance/v2`;

// Module configuration
const moduleConfig = {
  minutes: {
    label: 'Meeting Minutes',
    icon: CalendarBlank,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20'
  },
  distribution: {
    label: 'Distribution',
    icon: Wallet,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20'
  },
  dispute: {
    label: 'Dispute',
    icon: Scales,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20'
  },
  insurance: {
    label: 'Insurance Policy',
    icon: Heart,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20'
  },
  compensation: {
    label: 'Trustee Compensation',
    icon: Users,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20'
  }
};

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

export default function GovernanceRecordPage({ user }) {
  const navigate = useNavigate();
  const { recordId } = useParams();
  const [searchParams] = useSearchParams();
  
  // Mode from URL: edit or review (default)
  const mode = searchParams.get('mode') || 'review';
  const revisionIdParam = searchParams.get('rev');

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [record, setRecord] = useState(null);
  const [currentRevision, setCurrentRevision] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [editedPayload, setEditedPayload] = useState({});
  const [editedTitle, setEditedTitle] = useState('');

  // Dialogs
  const [showAmendStudio, setShowAmendStudio] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  // Diff state
  const [diffData, setDiffData] = useState(null);

  // Computed
  const isFinalized = record?.status === 'finalized';
  const isDraft = record?.status === 'draft';
  const isVoided = record?.status === 'voided';
  const isEditing = mode === 'edit' && isDraft;
  const moduleType = record?.module_type;
  const config = moduleConfig[moduleType] || moduleConfig.minutes;
  const ModuleIcon = config.icon;

  // Fetch record data
  const fetchRecord = useCallback(async () => {
    if (!recordId) return;
    
    setLoading(true);
    try {
      const res = await axios.get(`${API}/records/${recordId}`);
      const data = res.data.data;
      
      setRecord(data.record);
      setCurrentRevision(data.current_revision);
      setEditedPayload(data.current_revision?.payload_json || {});
      setEditedTitle(data.record?.title || '');

      // Fetch revision history
      const historyRes = await axios.get(`${API}/records/${recordId}/revisions`);
      setRevisions(historyRes.data.data.revisions || []);
      
    } catch (err) {
      console.error('Error fetching record:', err);
      toast.error('Failed to load record');
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  // Handle navigation back
  const handleBack = () => {
    navigate(-1);
  };

  // Handle finalize
  const handleFinalize = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/records/${recordId}/finalize`);
      toast.success('Record finalized successfully');
      setShowFinalizeConfirm(false);
      await fetchRecord();
    } catch (err) {
      console.error('Error finalizing:', err);
      toast.error(err.response?.data?.error?.message || 'Failed to finalize');
    } finally {
      setSaving(false);
    }
  };

  // Handle create amendment
  const handleCreateAmendment = async (amendData) => {
    try {
      const res = await axios.post(`${API}/records/${recordId}/amend`, amendData);
      const newRevisionId = res.data.data.revision_id;
      toast.success('Amendment draft created');
      
      // Navigate to edit mode with new revision
      navigate(`/vault/governance/record/${recordId}?mode=edit&rev=${newRevisionId}`);
      await fetchRecord();
    } catch (err) {
      console.error('Error creating amendment:', err);
      throw new Error(err.response?.data?.error?.message || 'Failed to create amendment');
    }
  };

  // Handle save draft
  const handleSaveDraft = async () => {
    if (!currentRevision) return;
    
    setSaving(true);
    try {
      await axios.patch(`${API}/revisions/${currentRevision.id}`, {
        title: editedTitle,
        payload_json: editedPayload
      });
      toast.success('Draft saved');
      await fetchRecord();
    } catch (err) {
      console.error('Error saving draft:', err);
      toast.error(err.response?.data?.error?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Handle void
  const handleVoid = async () => {
    if (!voidReason.trim()) {
      toast.error('Please provide a reason for voiding');
      return;
    }
    
    setSaving(true);
    try {
      await axios.post(`${API}/records/${recordId}/void`, {
        void_reason: voidReason
      });
      toast.success('Record voided');
      setShowVoidConfirm(false);
      await fetchRecord();
    } catch (err) {
      console.error('Error voiding:', err);
      toast.error(err.response?.data?.error?.message || 'Failed to void');
    } finally {
      setSaving(false);
    }
  };

  // Handle view revision
  const handleViewRevision = (revision) => {
    setShowHistory(false);
    navigate(`/vault/governance/record/${recordId}?rev=${revision.id}`);
  };

  // Handle compare revisions
  const handleCompareRevisions = async (revId1, revId2) => {
    try {
      const res = await axios.get(`${API}/revisions/${revId2}/diff?compare_to=${revId1}`);
      setDiffData(res.data.data);
      setShowHistory(false);
      setShowDiff(true);
    } catch (err) {
      console.error('Error getting diff:', err);
      toast.error('Failed to compare revisions');
    }
  };

  // Handle export
  const handleExport = () => {
    toast.info('Export feature coming soon');
  };

  // Toggle edit mode
  const handleEdit = () => {
    navigate(`/vault/governance/record/${recordId}?mode=edit`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-vault-darker flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-vault-gold/30 border-t-vault-gold rounded-full"
        />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-vault-darker flex flex-col items-center justify-center gap-4">
        <Warning weight="fill" className="w-16 h-16 text-amber-400" />
        <p className="text-slate-400">Record not found</p>
        <Button onClick={handleBack} variant="outline">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vault-darker">
      {/* Review Mode Header */}
      <ReviewModeHeader
        status={record.status}
        version={currentRevision?.version || 1}
        contentHash={currentRevision?.content_hash}
        title={record.title}
        onBack={handleBack}
        onEdit={handleEdit}
        onFinalize={() => setShowFinalizeConfirm(true)}
        onAmend={() => setShowAmendStudio(true)}
        onViewHistory={() => setShowHistory(true)}
        onExport={handleExport}
        onVoid={() => setShowVoidConfirm(true)}
        isLoading={saving}
        revisionCount={revisions.length}
      />

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Module Type & Meta Info */}
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                <ModuleIcon weight="duotone" className={`w-5 h-5 ${config.color}`} />
              </div>
              <div>
                <p className="text-sm text-slate-400">{config.label}</p>
                <p className="font-mono text-sm text-vault-gold">{record.rm_id || 'No RM-ID'}</p>
              </div>
            </div>
            <div className="text-right text-sm text-slate-500">
              <p>Created: {formatDate(record.created_at)}</p>
              {record.finalized_at && (
                <p>Finalized: {formatDate(record.finalized_at)}</p>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Title (editable in draft mode) */}
        {isEditing ? (
          <GlassCard className="p-4">
            <label className="text-sm font-medium text-slate-300 mb-2 block">Title</label>
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="bg-vault-darker border-vault-gold/20"
            />
          </GlassCard>
        ) : null}

        {/* Payload Content */}
        <GlassCard className="p-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText weight="duotone" className="w-5 h-5 text-vault-gold" />
            Record Content
          </h3>
          
          {isEditing ? (
            <div className="space-y-4">
              {/* Simple JSON editor for now - can be replaced with module-specific forms */}
              <Textarea
                value={JSON.stringify(editedPayload, null, 2)}
                onChange={(e) => {
                  try {
                    setEditedPayload(JSON.parse(e.target.value));
                  } catch {
                    // Invalid JSON, keep text for editing
                  }
                }}
                className="min-h-[300px] font-mono text-sm bg-vault-darker border-vault-gold/20"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/vault/governance/record/${recordId}`)}
                  className="border-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="bg-vault-gold hover:bg-vault-gold/90 text-vault-darker"
                >
                  {saving ? 'Saving...' : 'Save Draft'}
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <pre className="text-sm text-slate-300 whitespace-pre-wrap">
                {JSON.stringify(currentRevision?.payload_json || {}, null, 2)}
              </pre>
            </ScrollArea>
          )}
        </GlassCard>

        {/* Amendment chain info */}
        {currentRevision?.parent_revision_id && (
          <GlassCard className="p-4 bg-purple-500/5 border-purple-500/20">
            <div className="flex items-center gap-3">
              <Shield weight="duotone" className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-purple-300">
                  This is Amendment v{currentRevision.version}
                </p>
                <p className="text-xs text-purple-400/70">
                  Reason: {currentRevision.change_reason || 'No reason provided'}
                </p>
              </div>
            </div>
          </GlassCard>
        )}
      </div>

      {/* Amendment Studio Modal */}
      <AmendmentStudio
        open={showAmendStudio}
        onOpenChange={setShowAmendStudio}
        recordTitle={record.title}
        currentVersion={currentRevision?.version || 1}
        moduleType={record.module_type}
        onCreateAmendment={handleCreateAmendment}
        isLoading={saving}
      />

      {/* Revision History Modal */}
      <RevisionHistory
        open={showHistory}
        onOpenChange={setShowHistory}
        recordTitle={record.title}
        revisions={revisions}
        currentRevisionId={currentRevision?.id}
        onViewRevision={handleViewRevision}
        onCompare={handleCompareRevisions}
      />

      {/* Diff Preview Modal */}
      {diffData && (
        <DiffPreview
          open={showDiff}
          onOpenChange={setShowDiff}
          beforeVersion={diffData.compare_to_version}
          afterVersion={diffData.revision_version}
          changes={diffData.changes}
          beforePayload={diffData.before_payload}
          afterPayload={diffData.after_payload}
        />
      )}

      {/* Finalize Confirmation */}
      <AlertDialog open={showFinalizeConfirm} onOpenChange={setShowFinalizeConfirm}>
        <AlertDialogContent className="bg-vault-dark border-vault-gold/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will lock the record as <strong>v{currentRevision?.version || 1}</strong>. 
              Once finalized, you cannot edit it directly—only create amendments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinalize}
              className="bg-vault-gold hover:bg-vault-gold/90 text-vault-darker"
            >
              Finalize
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Void Confirmation */}
      <AlertDialog open={showVoidConfirm} onOpenChange={setShowVoidConfirm}>
        <AlertDialogContent className="bg-vault-dark border-vault-gold/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Void Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the record as voided. The history will be preserved but the record 
              will no longer be active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Reason for voiding *
            </label>
            <Textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Explain why this record is being voided..."
              className="bg-vault-darker border-vault-gold/20"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoid}
              disabled={!voidReason.trim()}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Void Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
