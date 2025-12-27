import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  ArrowLeft,
  CalendarBlank,
  CaretDown,
  CaretRight,
  CaretUp,
  Check,
  CheckCircle,
  Clock,
  DotsThreeVertical,
  Download,
  FileText,
  Gavel,
  HandPalm,
  Hash,
  LinkSimple,
  List,
  Lock,
  NotePencil,
  Paperclip,
  PencilSimple,
  Plus,
  Seal,
  ShieldCheck,
  SignOut,
  Trash,
  User,
  Users,
  Warning,
  X
} from '@phosphor-icons/react';
import PageHeader from '../components/shared/PageHeader';
import GlassCard from '../components/shared/GlassCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
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
import { Checkbox } from '../components/ui/checkbox';
import { staggerContainer, fadeInUp } from '../lib/motion';
import { toast } from 'sonner';
import { AmendmentStudio, RevisionHistory } from '../components/governance';
import { FinalizeConfirmationModal } from '../components/governance/FinalizeConfirmationModal';
import IntegritySealBadge from '../components/shared/IntegritySealBadge';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const API_V2 = `${process.env.REACT_APP_BACKEND_URL}/api/governance/v2`;

// Dynamic Calendar Icon that shows the day number
const DynamicCalendarIcon = ({ day, className = "w-8 h-8" }) => {
  const displayDay = day ? String(day).padStart(2, '0') : '--';
  return (
    <div className={`relative ${className} flex items-center justify-center`}>
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        {/* Outer frame */}
        <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" />
        {/* Top bar */}
        <rect x="2" y="3" width="20" height="5" rx="2" fill="currentColor" opacity="0.2" />
        {/* Calendar pins */}
        <line x1="7" y1="1" x2="7" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="17" y1="1" x2="17" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        {/* Day number */}
        <text x="12" y="16.5" textAnchor="middle" fill="currentColor" fontSize="8" fontFamily="monospace" fontWeight="bold" opacity="0.9">{displayDay}</text>
      </svg>
    </div>
  );
};

// Meeting type config
const meetingTypeConfig = {
  regular: { icon: CalendarBlank, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Regular Meeting' },
  special: { icon: Gavel, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Special Meeting' },
  emergency: { icon: Warning, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Emergency Meeting' },
};

// Status config
const statusConfig = {
  draft: { label: 'Draft', color: 'bg-amber-500/20 text-amber-400 border-amber-400/30', icon: PencilSimple },
  finalized: { label: 'Finalized', color: 'bg-vault-gold/30 text-vault-gold border-vault-gold/30', icon: Lock },
  attested: { label: 'Attested', color: 'bg-emerald-500/30 text-emerald-400 border-emerald-400/30', icon: CheckCircle },
  amended: { label: 'Amended', color: 'bg-purple-500/30 text-purple-400 border-purple-400/30', icon: FileText },
};

// Role options
const roleOptions = [
  { value: 'trustee', label: 'Trustee' },
  { value: 'co_trustee', label: 'Co-Trustee' },
  { value: 'beneficiary', label: 'Beneficiary' },
  { value: 'grantor', label: 'Grantor' },
  { value: 'protector', label: 'Protector' },
  { value: 'counsel', label: 'Counsel' },
  { value: 'observer', label: 'Observer' },
];

// Role badge colors
const roleColors = {
  trustee: 'bg-vault-gold/20 text-vault-gold border-vault-gold/30',
  co_trustee: 'bg-amber-500/20 text-amber-400 border-amber-400/30',
  beneficiary: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30',
  grantor: 'bg-blue-500/20 text-blue-400 border-blue-400/30',
  protector: 'bg-purple-500/20 text-purple-400 border-purple-400/30',
  counsel: 'bg-cyan-500/20 text-cyan-400 border-cyan-400/30',
  observer: 'bg-slate-500/20 text-slate-400 border-slate-400/30',
};

// Motion status options
const motionStatusOptions = [
  { value: 'proposed', label: 'Proposed', color: 'bg-slate-500/30 text-slate-300' },
  { value: 'seconded', label: 'Seconded', color: 'bg-blue-500/30 text-blue-400' },
  { value: 'passed', label: 'Passed', color: 'bg-emerald-500/30 text-emerald-400' },
  { value: 'failed', label: 'Failed', color: 'bg-red-500/30 text-red-400' },
  { value: 'tabled', label: 'Tabled', color: 'bg-amber-500/30 text-amber-400' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'bg-slate-500/30 text-slate-400' },
];

export default function MeetingEditorPage({ user }) {
  const navigate = useNavigate();
  const { meetingId } = useParams();
  
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState([]);
  
  // Edit states
  const [editingHeader, setEditingHeader] = useState(false);
  const [editedHeader, setEditedHeader] = useState({});
  
  // Dialogs
  const [showAddAttendee, setShowAddAttendee] = useState(false);
  const [newAttendee, setNewAttendee] = useState({ name: '', role: 'observer', present: true });
  
  const [showAddAgenda, setShowAddAgenda] = useState(false);
  const [newAgenda, setNewAgenda] = useState({ title: '', discussion_summary: '' });
  
  const [showAddMotion, setShowAddMotion] = useState(false);
  const [motionAgendaId, setMotionAgendaId] = useState(null);
  const [newMotion, setNewMotion] = useState({ text: '', proposed_by_name: '' });
  
  const [showFinalize, setShowFinalize] = useState(false);
  const [finalizeBy, setFinalizeBy] = useState('');
  const [finalizeLoading, setFinalizeLoading] = useState(false);
  
  const [showAttest, setShowAttest] = useState(false);
  const [attestation, setAttestation] = useState({ party_name: '', party_role: 'trustee', signature_data: '' });
  
  // Amendment Studio V2
  const [showAmendmentStudio, setShowAmendmentStudio] = useState(false);
  const [showRevisionHistory, setShowRevisionHistory] = useState(false);
  const [revisions, setRevisions] = useState([]);
  const [amendLoading, setAmendLoading] = useState(false);

  // Expanded agenda items
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    // Guard: don't fetch with undefined meetingId
    if (!meetingId) {
      setLoading(false);
      return;
    }
    
    const abortController = new AbortController();
    let isMounted = true;
    
    const fetchMeeting = async () => {
      try {
        // Use V2 API for meetings
        const res = await axios.get(`${API}/governance/v2/records/${meetingId}`, {
          signal: abortController.signal
        });
        
        if (!isMounted) return;
        
        const data = res.data;
        if (!data.ok || !data.data?.record) {
          throw new Error(data.error?.message || 'Failed to load meeting');
        }
        
        const record = data.data.record;
        const revision = data.data.current_revision;
        const payload = revision?.payload_json || {};
        
        // Transform V2 record to expected meeting format
        const meetingData = {
          id: record.id,
          meeting_id: record.id,
          title: record.title,
          rm_id: record.rm_id,
          status: record.status,
          locked: record.status === 'finalized',
          portfolio_id: record.portfolio_id,
          created_at: record.created_at,
          finalized_at: record.finalized_at,
          // Extract from payload
          meeting_type: payload.meeting_type || 'regular',
          date_time: payload.date_time || '',
          location: payload.location || '',
          called_by: payload.called_by || '',
          agenda_items: payload.agenda_items || [],
          attendees: payload.attendees || [],
          notes: payload.notes || '',
          resolutions: payload.resolutions || [],
          // V2 specific
          current_version: revision?.version || 1,
          current_revision_id: record.current_revision_id
        };
        
        setMeeting(meetingData);
        setEditedHeader({
          title: meetingData.title,
          meeting_type: meetingData.meeting_type,
          date_time: meetingData.date_time?.slice(0, 16) || '',
          location: meetingData.location || '',
          called_by: meetingData.called_by || '',
        });
        
        // Fetch parties for this portfolio
        if (meetingData.portfolio_id && isMounted) {
          try {
            const partiesRes = await axios.get(`${API}/portfolios/${meetingData.portfolio_id}/parties`, {
              signal: abortController.signal
            });
            if (isMounted) {
              setParties(partiesRes.data || []);
            }
          } catch (partiesError) {
            // Ignore parties fetch errors
            if (partiesError?.name !== 'CanceledError') {
              console.warn('Failed to fetch parties:', partiesError);
            }
          }
        }
        
        // Expand all agenda items by default
        if (isMounted) {
          const expanded = {};
          (meetingData.agenda_items || []).forEach(item => {
            expanded[item.item_id] = true;
          });
          setExpandedItems(expanded);
        }
      } catch (error) {
        // Silently ignore aborted requests (happens on navigation)
        if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED' || !isMounted) {
          return;
        }
        console.error('Failed to fetch meeting:', error);
        // Only show error if still mounted and not a cancellation
        if (isMounted && error?.response?.status !== 0) {
          toast.error('Failed to load meeting details');
          navigate('/vault/governance');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchMeeting();
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [meetingId, navigate]);

  // Refetch meeting data
  const refetchMeeting = async () => {
    if (!meetingId) return;
    
    try {
      const res = await axios.get(`${API}/governance/v2/records/${meetingId}`);
      const data = res.data;
      if (!data.ok || !data.data?.record) {
        throw new Error('Failed to load meeting');
      }
      
      const record = data.data.record;
      const revision = data.data.current_revision;
      const payload = revision?.payload_json || {};
      
      const meetingData = {
        id: record.id,
        meeting_id: record.id,
        title: record.title,
        rm_id: record.rm_id,
        status: record.status,
        locked: record.status === 'finalized',
        portfolio_id: record.portfolio_id,
        created_at: record.created_at,
        finalized_at: record.finalized_at,
        meeting_type: payload.meeting_type || 'regular',
        date_time: payload.date_time || '',
        location: payload.location || '',
        called_by: payload.called_by || '',
        agenda_items: payload.agenda_items || [],
        attendees: payload.attendees || [],
        notes: payload.notes || '',
        resolutions: payload.resolutions || [],
        current_version: revision?.version || 1,
        current_revision_id: record.current_revision_id
      };
      
      setMeeting(meetingData);
      setEditedHeader({
        title: meetingData.title,
        meeting_type: meetingData.meeting_type,
        date_time: meetingData.date_time?.slice(0, 16) || '',
        location: meetingData.location || '',
        called_by: meetingData.called_by || '',
      });
      
      const expanded = {};
      (meetingData.agenda_items || []).forEach(item => {
        expanded[item.item_id] = true;
      });
      setExpandedItems(expanded);
    } catch (error) {
      console.error('Failed to refetch meeting:', error);
    }
  };

  // Save meeting using V2 API - updates the current revision's payload
  const saveMeeting = async (updates) => {
    setSaving(true);
    try {
      // Build the full payload from current meeting + updates
      const payload = {
        title: updates.title || meeting.title,
        meeting_type: updates.meeting_type || meeting.meeting_type,
        date_time: updates.date_time || meeting.date_time,
        location: updates.location !== undefined ? updates.location : meeting.location,
        called_by: updates.called_by !== undefined ? updates.called_by : meeting.called_by,
        agenda_items: updates.agenda_items || meeting.agenda_items || [],
        attendees: updates.attendees || meeting.attendees || [],
        notes: updates.notes !== undefined ? updates.notes : meeting.notes,
        resolutions: updates.resolutions || meeting.resolutions || [],
      };
      
      // Use V2 update endpoint
      await axios.put(`${API}/governance/v2/records/${meetingId}`, {
        title: payload.title,
        payload_json: payload
      });
      
      await refetchMeeting();
      toast.success('Changes saved');
    } catch (error) {
      console.error('Failed to save:', error);
      // Handle 409 Conflict (meeting locked)
      if (error.response?.status === 409) {
        toast.error('This meeting is finalized and cannot be edited. Use "Amend" to create a new revision.');
        await refetchMeeting();
      } else {
        toast.error(error.response?.data?.error?.message || 'Failed to save changes');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHeader = async () => {
    await saveMeeting({
      title: editedHeader.title,
      meeting_type: editedHeader.meeting_type,
      date_time: new Date(editedHeader.date_time).toISOString(),
      location: editedHeader.location,
      called_by: editedHeader.called_by,
    });
    setEditingHeader(false);
  };

  const handleAddAttendee = async () => {
    if (!newAttendee.name.trim()) {
      toast.error('Please enter attendee name');
      return;
    }
    
    const updatedAttendees = [...(meeting.attendees || []), newAttendee];
    await saveMeeting({ attendees: updatedAttendees });
    setShowAddAttendee(false);
    setNewAttendee({ name: '', role: 'observer', present: true });
  };

  const handleRemoveAttendee = async (index) => {
    const updatedAttendees = meeting.attendees.filter((_, i) => i !== index);
    await saveMeeting({ attendees: updatedAttendees });
  };

  const handleTogglePresent = async (index) => {
    const updatedAttendees = [...meeting.attendees];
    updatedAttendees[index] = { ...updatedAttendees[index], present: !updatedAttendees[index].present };
    await saveMeeting({ attendees: updatedAttendees });
  };

  const handleAddAgenda = async () => {
    if (!newAgenda.title.trim()) {
      toast.error('Please enter agenda item title');
      return;
    }
    
    try {
      // Create new agenda item
      const newItem = {
        item_id: `agenda_${Date.now()}`,
        title: newAgenda.title.trim(),
        discussion_summary: newAgenda.discussion_summary || '',
        order: (meeting.agenda_items?.length || 0) + 1,
        status: 'pending'
      };
      
      // Update meeting with new agenda items using V2 API
      const updatedAgendaItems = [...(meeting.agenda_items || []), newItem];
      
      // Build the full payload with all existing fields plus updated agenda_items
      const currentPayload = {
        meeting_type: meeting.meeting_type || 'regular',
        date_time: meeting.date_time,
        location: meeting.location,
        attendees: meeting.attendees || [],
        agenda_items: updatedAgendaItems,
        motions: meeting.motions || [],
        notes: meeting.notes || ''
      };
      
      await axios.put(`${API}/governance/v2/records/${meetingId}`, {
        payload_json: currentPayload
      });
      
      await refetchMeeting();
      setShowAddAgenda(false);
      setNewAgenda({ title: '', discussion_summary: '' });
      toast.success('Agenda item added');
    } catch (error) {
      console.error('Failed to add agenda item:', error);
      toast.error('Failed to add agenda item');
    }
  };

  const handleUpdateAgendaItem = async (itemId, updates) => {
    try {
      // Update the specific agenda item in the array
      const updatedAgendaItems = (meeting.agenda_items || []).map(item => 
        item.item_id === itemId ? { ...item, ...updates } : item
      );
      
      const currentPayload = {
        meeting_type: meeting.meeting_type || 'regular',
        date_time: meeting.date_time,
        location: meeting.location,
        attendees: meeting.attendees || [],
        agenda_items: updatedAgendaItems,
        motions: meeting.motions || [],
        notes: meeting.notes || ''
      };
      
      await axios.put(`${API}/governance/v2/records/${meetingId}`, {
        payload_json: currentPayload
      });
      await refetchMeeting();
    } catch (error) {
      console.error('Failed to update agenda item:', error);
      toast.error('Failed to update agenda item');
    }
  };

  const handleDeleteAgendaItem = async (itemId) => {
    try {
      // Remove the agenda item from the array
      const updatedAgendaItems = (meeting.agenda_items || []).filter(item => 
        item.item_id !== itemId
      );
      
      const currentPayload = {
        meeting_type: meeting.meeting_type || 'regular',
        date_time: meeting.date_time,
        location: meeting.location,
        attendees: meeting.attendees || [],
        agenda_items: updatedAgendaItems,
        motions: meeting.motions || [],
        notes: meeting.notes || ''
      };
      
      await axios.put(`${API}/governance/v2/records/${meetingId}`, {
        payload_json: currentPayload
      });
      await refetchMeeting();
      toast.success('Agenda item deleted');
    } catch (error) {
      console.error('Failed to delete agenda item:', error);
      toast.error('Failed to delete agenda item');
    }
  };

  const handleAddMotion = async () => {
    if (!newMotion.text.trim()) {
      toast.error('Please enter motion text');
      return;
    }
    
    const agendaItem = meeting.agenda_items.find(a => a.item_id === motionAgendaId);
    if (!agendaItem) return;
    
    const newMotionObj = {
      motion_id: `mot_${Date.now().toString(36)}`,
      text: newMotion.text,
      proposed_by_name: newMotion.proposed_by_name,
      status: 'proposed',
      votes: [],
    };
    
    const updatedMotions = [...(agendaItem.motions || []), newMotionObj];
    await handleUpdateAgendaItem(motionAgendaId, { motions: updatedMotions });
    
    setShowAddMotion(false);
    setNewMotion({ text: '', proposed_by_name: '' });
    toast.success('Motion added');
  };

  const handleUpdateMotionStatus = async (agendaItemId, motionId, newStatus) => {
    const agendaItem = meeting.agenda_items.find(a => a.item_id === agendaItemId);
    if (!agendaItem) return;
    
    const updatedMotions = agendaItem.motions.map(m => 
      m.motion_id === motionId ? { ...m, status: newStatus } : m
    );
    
    await handleUpdateAgendaItem(agendaItemId, { motions: updatedMotions });
  };

  const handleFinalize = async () => {
    setFinalizeLoading(true);
    try {
      await axios.post(`${API}/governance/v2/records/${meetingId}/finalize`);
      await refetchMeeting();
      setShowFinalize(false);
      toast.success('Meeting minutes finalized');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to finalize');
    } finally {
      setFinalizeLoading(false);
    }
  };

  const handleAttest = async () => {
    if (!attestation.party_name.trim() || !attestation.signature_data.trim()) {
      toast.error('Please fill in all attestation fields');
      return;
    }
    
    try {
      // Use V2 API - add attestation to array and save
      const attestationWithId = {
        ...attestation,
        attestation_id: `attest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        attested_at: new Date().toISOString()
      };
      
      const updatedAttestations = [...(meeting.attestations || []), attestationWithId];
      await saveMeeting({ attestations: updatedAttestations });
      
      setShowAttest(false);
      setAttestation({ party_name: '', party_role: 'trustee', signature_data: '' });
      toast.success('Attestation added');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to add attestation');
    }
  };

  // V2 Amendment Studio handler - uses unified V2 API
  const handleAmendV2 = async (amendData) => {
    setAmendLoading(true);
    try {
      const res = await axios.post(`${API}/governance/v2/records/${meetingId}/amend`, {
        change_reason: amendData.change_reason,
        change_type: amendData.change_type || 'amendment',
        effective_at: amendData.effective_at
      });
      
      const data = res.data;
      if (data.ok) {
        toast.success('Amendment draft created - you can now edit the new version');
        setShowAmendmentStudio(false);
        // Refetch to show the new draft version
        await refetchMeeting();
      } else {
        throw new Error(data.error?.message || 'Failed to create amendment');
      }
    } catch (error) {
      console.error('Amendment error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to create amendment');
    } finally {
      setAmendLoading(false);
    }
  };

  // Delete meeting handler
  const handleDeleteMeeting = async () => {
    try {
      await axios.post(`${API}/governance/v2/records/${meetingId}/void`, {
        void_reason: 'Deleted by user'
      });
      toast.success('Meeting deleted');
      navigate('/vault/governance');
    } catch (error) {
      console.error('Failed to delete meeting:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to delete meeting');
    }
  };

  // Fetch revision history (using V2 API)
  const fetchRevisions = async () => {
    try {
      const res = await axios.get(`${API}/governance/v2/records/${meetingId}/revisions`);
      const data = res.data;
      const versions = data.data?.revisions || [];
      
      // Transform to revision format for RevisionHistory component
      const formattedRevisions = versions.map(v => ({
        id: v.id || meetingId,
        version: v.version || 1,
        change_type: v.change_type || 'initial',
        change_reason: v.change_reason || '',
        created_at: v.created_at,
        created_by: v.created_by || 'Unknown',
        finalized_at: v.finalized_at,
        finalized_by: v.finalized_by,
        content_hash: v.content_hash || ''
      }));
      
      setRevisions(formattedRevisions);
    } catch (error) {
      console.error('Failed to fetch revisions:', error);
      // Fallback: show current version only
      setRevisions([{
        id: meetingId,
        version: meeting?.current_version || 1,
        change_type: 'initial',
        change_reason: '',
        created_at: meeting?.created_at,
        created_by: 'Unknown'
      }]);
    }
  };

  const handleViewRevision = (revision) => {
    setShowRevisionHistory(false);
    navigate(`/vault/governance/meetings/${revision.id}`);
  };

  const toggleAgendaItem = (itemId) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <Warning className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h2 className="text-xl text-white">Meeting not found</h2>
          <Button onClick={() => navigate('/vault/governance')} className="mt-4 bg-vault-gold text-vault-dark">
            Back to Governance
          </Button>
        </GlassCard>
      </div>
    );
  }

  const typeConfig = meetingTypeConfig[meeting.meeting_type] || meetingTypeConfig.regular;
  const TypeIcon = typeConfig.icon;
  const status = statusConfig[meeting.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  // Use locked field from backend (more reliable than status check)
  const isLocked = meeting.locked === true || meeting.locked_at !== null;
  // Status checks - based only on status field, not locked flag
  const isDraft = meeting.status === 'draft';
  const isFinalized = meeting.status === 'finalized' || meeting.status === 'attested' || meeting.status === 'amended';

  return (
    <motion.div 
      className="min-h-screen p-4 md:p-6 lg:p-8 w-full max-w-full overflow-x-hidden"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Back Button */}
      <motion.div variants={fadeInUp} className="mb-4">
        <Button
          variant="ghost"
          onClick={() => {
            // Navigate with portfolio context to prevent unnecessary fetches
            const portfolioId = meeting?.portfolio_id;
            navigate(portfolioId ? `/vault/governance?portfolio=${portfolioId}` : '/vault/governance');
          }}
          className="text-vault-muted hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Governance
        </Button>
      </motion.div>

      {/* Header Card */}
      <motion.div variants={fadeInUp} className="mb-6">
        <GlassCard className="p-6">
          {editingHeader && isDraft ? (
            // Editing mode
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-xl ${typeConfig.bg}`}>
                  <TypeIcon className={`w-8 h-8 ${typeConfig.color}`} />
                </div>
                <div className="flex-1">
                  <Input
                    value={editedHeader.title}
                    onChange={(e) => setEditedHeader(prev => ({ ...prev, title: e.target.value }))}
                    className="text-2xl font-heading bg-[#05080F] border-vault-gold/20 text-white"
                    placeholder="Meeting Title"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm text-vault-muted block mb-1">Meeting Type</label>
                  <Select 
                    value={editedHeader.meeting_type} 
                    onValueChange={(v) => setEditedHeader(prev => ({ ...prev, meeting_type: v }))}
                  >
                    <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                      <SelectItem value="regular" className="text-white hover:bg-vault-gold/20">Regular</SelectItem>
                      <SelectItem value="special" className="text-white hover:bg-vault-gold/20">Special</SelectItem>
                      <SelectItem value="emergency" className="text-white hover:bg-vault-gold/20">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-vault-muted block mb-1">Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={editedHeader.date_time}
                    onChange={(e) => setEditedHeader(prev => ({ ...prev, date_time: e.target.value }))}
                    className="bg-[#05080F] border-vault-gold/20 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-vault-muted block mb-1">Location</label>
                  <Input
                    value={editedHeader.location}
                    onChange={(e) => setEditedHeader(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Location or Zoom link"
                    className="bg-[#05080F] border-vault-gold/20 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-vault-muted block mb-1">Called By</label>
                  <Input
                    value={editedHeader.called_by}
                    onChange={(e) => setEditedHeader(prev => ({ ...prev, called_by: e.target.value }))}
                    placeholder="Who called this meeting"
                    className="bg-[#05080F] border-vault-gold/20 text-white"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingHeader(false)} className="border-vault-gold/30">
                  Cancel
                </Button>
                <Button onClick={handleSaveHeader} className="bg-vault-gold text-vault-dark">
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            // View mode
            <div className="flex flex-col gap-4">
              {/* Header content */}
              <div className="flex items-start gap-4">
                <div className={`p-4 rounded-xl ${typeConfig.bg} shrink-0`}>
                  {meeting.meeting_type === 'regular' ? (
                    <DynamicCalendarIcon 
                      day={meeting.date_time ? new Date(meeting.date_time).getDate() : null} 
                      className={`w-8 h-8 ${typeConfig.color}`} 
                    />
                  ) : (
                    <TypeIcon className={`w-8 h-8 ${typeConfig.color}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge className={`${status.color} border`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {status.label}
                    </Badge>
                    {meeting.is_amendment && (
                      <Badge className="bg-purple-500/20 text-purple-400 border border-purple-400/30">
                        v{meeting.revision || meeting.amendment_number + 1}
                      </Badge>
                    )}
                    <Badge className="bg-vault-dark/50 text-vault-muted border border-vault-gold/20">
                      {typeConfig.label}
                    </Badge>
                  </div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white mb-2 break-words">
                    {meeting.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-vault-muted">
                    {meeting.rm_id && (
                      <span className="font-mono bg-vault-dark/50 px-2 py-0.5 rounded text-xs">
                        {meeting.rm_id}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDate(meeting.date_time)}
                    </span>
                    {meeting.location && (
                      <span>📍 {meeting.location}</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Action buttons - properly aligned */}
              <div className="flex items-center gap-2 justify-end">
                {/* History button - show version count if > 1 */}
                {meeting.revision > 1 && (
                  <Button
                    onClick={() => {
                      fetchRevisions();
                      setShowRevisionHistory(true);
                    }}
                    size="sm"
                    variant="outline"
                    className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    v{meeting.revision}
                  </Button>
                )}
                
                {/* Finalize button - prominent for draft meetings */}
                {isDraft && (
                  <Button
                    onClick={() => setShowFinalize(true)}
                    size="sm"
                    className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Finalize
                  </Button>
                )}
                
                {/* Amend button - prominent for finalized meetings */}
                {isFinalized && !meeting.amended_by_id && (
                  <Button
                    onClick={() => setShowAmendmentStudio(true)}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Amend
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-vault-gold/30">
                      <DotsThreeVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                    {isDraft && (
                      <>
                        <DropdownMenuItem 
                          onClick={() => setEditingHeader(true)} 
                          className="text-white hover:bg-vault-gold/20"
                        >
                          <PencilSimple className="w-4 h-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-vault-gold/20" />
                      </>
                    )}
                    {isFinalized && (
                      <>
                        <DropdownMenuItem 
                          className="text-emerald-400 hover:bg-emerald-500/20"
                          onClick={() => setShowAttest(true)}
                        >
                          <Seal className="w-4 h-4 mr-2" />
                          Add Attestation
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-vault-gold/20" />
                      </>
                    )}
                    <DropdownMenuItem className="text-vault-muted hover:bg-vault-gold/20">
                      <Download className="w-4 h-4 mr-2" />
                      Export PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-vault-gold/20" />
                    <DropdownMenuItem 
                      className="text-red-400 hover:bg-red-500/20"
                      onClick={handleDeleteMeeting}
                    >
                      <Trash className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
          
          {/* Integrity Seal for finalized meetings */}
          {isFinalized && (
            <div className="mt-4 pt-4 border-t border-vault-gold/20">
              <IntegritySealBadge
                recordId={meeting.id}
                sealId={meeting.integrity_seal_id}
                sealedAt={meeting.integrity_sealed_at}
                verifiedAt={meeting.integrity_verified_at}
                status={meeting.integrity_seal_id ? 'valid' : 'never_sealed'}
                isFinalized={true}
              />
              {/* Legacy hash display */}
              {meeting.finalized_hash && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-vault-muted">
                    <Hash className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="shrink-0">Content hash:</span>
                    <code className="bg-vault-dark/50 px-2 py-0.5 rounded font-mono break-all">
                      {meeting.finalized_hash.slice(0, 16)}...{meeting.finalized_hash.slice(-16)}
                    </code>
                  </div>
                  {meeting.finalized_by && (
                    <div className="text-xs text-vault-muted pl-6">
                      Finalized by <span className="text-white">{meeting.finalized_by}</span> on {formatDate(meeting.finalized_at)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Agenda Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Agenda Items */}
          <motion.div variants={fadeInUp}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-heading text-white flex items-center gap-2">
                <List className="w-5 h-5 text-vault-gold" />
                Agenda Items
              </h2>
              {isDraft && (
                <Button
                  onClick={() => setShowAddAgenda(true)}
                  className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              )}
            </div>
            
            {(meeting.agenda_items || []).length === 0 ? (
              <GlassCard className="p-8 text-center">
                <List className="w-12 h-12 mx-auto text-vault-gold/50 mb-3" />
                <p className="text-vault-muted">No agenda items yet</p>
                {isDraft && (
                  <Button
                    onClick={() => setShowAddAgenda(true)}
                    variant="outline"
                    className="mt-4 border-vault-gold/30"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Item
                  </Button>
                )}
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {meeting.agenda_items.map((item, index) => (
                  <AgendaItemCard
                    key={item.item_id}
                    item={item}
                    index={index}
                    expanded={expandedItems[item.item_id]}
                    onToggle={() => toggleAgendaItem(item.item_id)}
                    isDraft={isDraft}
                    onUpdate={(updates) => handleUpdateAgendaItem(item.item_id, updates)}
                    onDelete={() => handleDeleteAgendaItem(item.item_id)}
                    onAddMotion={() => {
                      setMotionAgendaId(item.item_id);
                      setShowAddMotion(true);
                    }}
                    onUpdateMotionStatus={(motionId, status) => handleUpdateMotionStatus(item.item_id, motionId, status)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Sidebar - Attendees & Attestations */}
        <div className="space-y-6">
          {/* Attendees */}
          <motion.div variants={fadeInUp}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-vault-gold" />
                Attendees
              </h2>
              {isDraft && (
                <Button
                  onClick={() => setShowAddAttendee(true)}
                  variant="outline"
                  size="sm"
                  className="border-vault-gold/30"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            <GlassCard className="p-4">
              {(meeting.attendees || []).length === 0 ? (
                <p className="text-center text-vault-muted py-4">No attendees added</p>
              ) : (
                <div className="space-y-2">
                  {meeting.attendees.map((att, i) => (
                    <div 
                      key={i}
                      className="p-2.5 rounded-lg bg-vault-dark/30"
                    >
                      {/* Row 1: Name with presence indicator and actions */}
                      <div className="flex items-center gap-2">
                        {/* Presence dot */}
                        <div className={`w-2 h-2 rounded-full shrink-0 ${att.present ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        
                        {/* Name - takes remaining space */}
                        <span className="text-white text-sm font-medium flex-1 min-w-0 truncate">{att.name}</span>
                        
                        {/* Actions - far right */}
                        {isDraft && (
                          <div className="flex items-center shrink-0 ml-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTogglePresent(i)}
                              className="h-6 w-6 p-0 text-vault-muted hover:text-white"
                            >
                              {att.present ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAttendee(i)}
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {/* Row 2: Role badge */}
                      <div className="mt-1.5 pl-4">
                        <Badge className={`text-[10px] ${roleColors[att.role] || roleColors.observer} border`}>
                          {att.role?.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* Attestations */}
          {isFinalized && (
            <motion.div variants={fadeInUp}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-heading text-white flex items-center gap-2">
                  <Seal className="w-5 h-5 text-vault-gold" />
                  Attestations
                </h2>
                <Button
                  onClick={() => setShowAttest(true)}
                  variant="outline"
                  size="sm"
                  className="border-vault-gold/30"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              <GlassCard className="p-4">
                {(meeting.attestations || []).length === 0 ? (
                  <div className="text-center py-4">
                    <Seal className="w-8 h-8 mx-auto text-vault-gold/50 mb-2" />
                    <p className="text-vault-muted text-sm">No attestations yet</p>
                    <Button
                      onClick={() => setShowAttest(true)}
                      variant="outline"
                      size="sm"
                      className="mt-3 border-vault-gold/30"
                    >
                      Add Attestation
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {meeting.attestations.map((att, i) => (
                      <div key={i} className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{att.party_name}</p>
                            <p className="text-xs text-vault-muted capitalize">{att.party_role?.replace('_', ' ')}</p>
                          </div>
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-xs text-vault-muted mt-2">
                          Signed: {formatDate(att.attested_at)}
                        </p>
                        {att.signature_data && (
                          <p className="text-sm text-emerald-400 mt-1 italic">
                            &ldquo;{att.signature_data}&rdquo;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}

          {/* Amendment History */}
          {meeting.is_amendment && meeting.prior_hash && (
            <motion.div variants={fadeInUp}>
              <GlassCard className="p-4">
                <h3 className="text-sm font-heading text-vault-gold mb-2 flex items-center gap-2">
                  <LinkSimple className="w-4 h-4" />
                  Amendment Chain
                </h3>
                <div className="text-xs text-vault-muted">
                  <p>Prior document hash:</p>
                  <code className="bg-vault-dark/50 px-2 py-1 rounded block mt-1 break-all">
                    {meeting.prior_hash}
                  </code>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>
      </div>

      {/* Add Attendee Dialog */}
      <Dialog open={showAddAttendee} onOpenChange={setShowAddAttendee}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-vault-gold">Add Attendee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Name</label>
              <Input
                value={newAttendee.name}
                onChange={(e) => setNewAttendee(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Attendee name"
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Role</label>
              <Select 
                value={newAttendee.role} 
                onValueChange={(v) => setNewAttendee(prev => ({ ...prev, role: v }))}
              >
                <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                  {roleOptions.map(r => (
                    <SelectItem key={r.value} value={r.value} className="text-white hover:bg-vault-gold/20">
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={newAttendee.present}
                onCheckedChange={(c) => setNewAttendee(prev => ({ ...prev, present: c }))}
                className="border-vault-gold/30 data-[state=checked]:bg-vault-gold"
              />
              <label className="text-sm text-white">Present at meeting</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAttendee(false)} className="border-vault-gold/30">
              Cancel
            </Button>
            <Button onClick={handleAddAttendee} className="bg-vault-gold text-vault-dark">
              Add Attendee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Agenda Item Dialog */}
      <Dialog open={showAddAgenda} onOpenChange={setShowAddAgenda}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-vault-gold">Add Agenda Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Title</label>
              <Input
                value={newAgenda.title}
                onChange={(e) => setNewAgenda(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Review of Q4 Financial Statements"
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Discussion Summary (optional)</label>
              <Textarea
                value={newAgenda.discussion_summary}
                onChange={(e) => setNewAgenda(prev => ({ ...prev, discussion_summary: e.target.value }))}
                placeholder="Summary of discussion..."
                className="bg-[#05080F] border-vault-gold/20 text-white min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAgenda(false)} className="border-vault-gold/30">
              Cancel
            </Button>
            <Button onClick={handleAddAgenda} className="bg-vault-gold text-vault-dark">
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Motion Dialog */}
      <Dialog open={showAddMotion} onOpenChange={setShowAddMotion}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-vault-gold">Add Motion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Motion Text</label>
              <Textarea
                value={newMotion.text}
                onChange={(e) => setNewMotion(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Motion to approve..."
                className="bg-[#05080F] border-vault-gold/20 text-white min-h-[100px]"
              />
            </div>
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Proposed By</label>
              <Input
                value={newMotion.proposed_by_name}
                onChange={(e) => setNewMotion(prev => ({ ...prev, proposed_by_name: e.target.value }))}
                placeholder="Name of proposer"
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMotion(false)} className="border-vault-gold/30">
              Cancel
            </Button>
            <Button onClick={handleAddMotion} className="bg-vault-gold text-vault-dark">
              Add Motion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finalize Confirmation Modal */}
      <FinalizeConfirmationModal
        open={showFinalize}
        onOpenChange={setShowFinalize}
        onConfirm={handleFinalize}
        recordTitle={meeting?.title}
        moduleType="minutes"
        rmId={meeting?.rm_id}
        isLoading={finalizeLoading}
      />

      {/* Attestation Dialog */}
      <Dialog open={showAttest} onOpenChange={setShowAttest}>
        <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-vault-gold flex items-center gap-2">
              <Seal className="w-5 h-5" />
              Add Attestation
            </DialogTitle>
            <DialogDescription className="text-vault-muted">
              Attest that these minutes are accurate and complete.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Your Name</label>
              <Input
                value={attestation.party_name}
                onChange={(e) => setAttestation(prev => ({ ...prev, party_name: e.target.value }))}
                placeholder="Full legal name"
                className="bg-[#05080F] border-vault-gold/20 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Your Role</label>
              <Select 
                value={attestation.party_role} 
                onValueChange={(v) => setAttestation(prev => ({ ...prev, party_role: v }))}
              >
                <SelectTrigger className="bg-[#05080F] border-vault-gold/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                  {roleOptions.slice(0, 4).map(r => (
                    <SelectItem key={r.value} value={r.value} className="text-white hover:bg-vault-gold/20">
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-vault-muted mb-1 block">Typed Signature</label>
              <Input
                value={attestation.signature_data}
                onChange={(e) => setAttestation(prev => ({ ...prev, signature_data: e.target.value }))}
                placeholder="Type your full name as signature"
                className="bg-[#05080F] border-vault-gold/20 text-white italic"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAttest(false)} className="border-vault-gold/30">
              Cancel
            </Button>
            <Button onClick={handleAttest} className="bg-emerald-600 hover:bg-emerald-500 text-white">
              <CheckCircle className="w-4 h-4 mr-2" />
              Sign & Attest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Amendment Studio V2 */}
      <AmendmentStudio
        open={showAmendmentStudio}
        onOpenChange={setShowAmendmentStudio}
        recordTitle={meeting?.title || 'Meeting Minutes'}
        currentVersion={meeting?.revision || 1}
        moduleType="minutes"
        onCreateAmendment={handleAmendV2}
        isLoading={amendLoading}
      />

      {/* Revision History */}
      <RevisionHistory
        open={showRevisionHistory}
        onOpenChange={setShowRevisionHistory}
        recordTitle={meeting?.title || 'Meeting Minutes'}
        revisions={revisions}
        currentRevisionId={meeting?.meeting_id}
        onViewRevision={handleViewRevision}
      />
    </motion.div>
  );
}

// Agenda Item Card Component
function AgendaItemCard({ 
  item, 
  index, 
  expanded, 
  onToggle, 
  isDraft, 
  onUpdate, 
  onDelete,
  onAddMotion,
  onUpdateMotionStatus
}) {
  const [editing, setEditing] = useState(false);
  const [editedItem, setEditedItem] = useState({
    title: item.title,
    discussion_summary: item.discussion_summary || '',
  });

  const handleSave = () => {
    onUpdate(editedItem);
    setEditing(false);
  };

  return (
    <GlassCard className="overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-vault-gold/5 transition-colors"
        onClick={onToggle}
      >
        <div className="w-8 h-8 rounded-full bg-vault-gold/20 flex items-center justify-center text-vault-gold font-bold shrink-0">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium truncate">{item.title}</h3>
          {!expanded && item.discussion_summary && (
            <p className="text-sm text-vault-muted truncate">{item.discussion_summary}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item.motions?.length > 0 && (
            <Badge className="bg-vault-gold/20 text-vault-gold border-vault-gold/30">
              {item.motions.length} motion{item.motions.length !== 1 ? 's' : ''}
            </Badge>
          )}
          {expanded ? <CaretUp className="w-5 h-5 text-vault-muted" /> : <CaretDown className="w-5 h-5 text-vault-muted" />}
        </div>
      </div>
      
      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-vault-gold/20"
          >
            <div className="p-4 space-y-4">
              {/* Discussion Summary */}
              {editing ? (
                <div className="space-y-3">
                  <Input
                    value={editedItem.title}
                    onChange={(e) => setEditedItem(prev => ({ ...prev, title: e.target.value }))}
                    className="bg-[#05080F] border-vault-gold/20 text-white"
                    placeholder="Title"
                  />
                  <Textarea
                    value={editedItem.discussion_summary}
                    onChange={(e) => setEditedItem(prev => ({ ...prev, discussion_summary: e.target.value }))}
                    className="bg-[#05080F] border-vault-gold/20 text-white min-h-[100px]"
                    placeholder="Discussion summary..."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="border-vault-gold/30">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} className="bg-vault-gold text-vault-dark">
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {item.discussion_summary ? (
                    <div>
                      <h4 className="text-xs uppercase tracking-wide text-vault-muted mb-2">Discussion Summary</h4>
                      <p className="text-white whitespace-pre-wrap">{item.discussion_summary}</p>
                    </div>
                  ) : (
                    <p className="text-vault-muted italic">No discussion summary</p>
                  )}
                </>
              )}
              
              {/* Motions */}
              {(item.motions || []).length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-vault-muted mb-2">Motions & Resolutions</h4>
                  <div className="space-y-2">
                    {item.motions.map((motion, mi) => {
                      const statusOpt = motionStatusOptions.find(s => s.value === motion.status) || motionStatusOptions[0];
                      return (
                        <div key={motion.motion_id || mi} className="p-3 rounded-lg bg-vault-dark/50 border border-vault-gold/10">
                          <p className="text-white">{motion.text}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2 text-xs text-vault-muted">
                              {motion.proposed_by_name && <span>Proposed by: {motion.proposed_by_name}</span>}
                              {motion.seconded_by_name && <span>• Seconded by: {motion.seconded_by_name}</span>}
                            </div>
                            {isDraft ? (
                              <Select 
                                value={motion.status} 
                                onValueChange={(v) => onUpdateMotionStatus(motion.motion_id, v)}
                              >
                                <SelectTrigger className={`h-7 text-xs w-28 ${statusOpt.color}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#0B1221] border-vault-gold/30 z-[100]">
                                  {motionStatusOptions.map(s => (
                                    <SelectItem key={s.value} value={s.value} className="text-white text-xs hover:bg-vault-gold/20">
                                      {s.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge className={`${statusOpt.color}`}>{statusOpt.label}</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Actions */}
              {isDraft && !editing && (
                <div className="flex items-center gap-2 pt-2 border-t border-vault-gold/10">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setEditing(true)}
                    className="border-vault-gold/30 text-white"
                  >
                    <PencilSimple className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={onAddMotion}
                    className="border-vault-gold/30 text-white"
                  >
                    <Gavel className="w-4 h-4 mr-1" />
                    Add Motion
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={onDelete}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-auto"
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
