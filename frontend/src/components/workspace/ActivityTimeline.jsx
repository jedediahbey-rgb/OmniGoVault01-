import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Clock,
  FileText,
  UserPlus,
  Signature,
  ChatCircle,
  Eye,
  PaperPlaneTilt,
  CheckCircle,
  XCircle,
  Warning,
  ArrowsClockwise,
  Funnel,
  CaretDown,
} from '@phosphor-icons/react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';

const API = process.env.REACT_APP_BACKEND_URL;

// Event type configurations
const EVENT_CONFIG = {
  DOCUMENT_CREATED: {
    icon: FileText,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    label: 'Document Created',
  },
  DOCUMENT_UPDATED: {
    icon: ArrowsClockwise,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    label: 'Document Updated',
  },
  DOCUMENT_SUBMITTED: {
    icon: PaperPlaneTilt,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    label: 'Submitted for Review',
  },
  DOCUMENT_SIGNED: {
    icon: Signature,
    color: 'text-vault-gold',
    bg: 'bg-vault-gold/10',
    label: 'Document Signed',
  },
  DOCUMENT_AFFIRMED: {
    icon: CheckCircle,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    label: 'Document Affirmed',
  },
  DOCUMENT_OBJECTED: {
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    label: 'Objection Raised',
  },
  OBJECTION_RESOLVED: {
    icon: CheckCircle,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    label: 'Objection Resolved',
  },
  COMMENT_ADDED: {
    icon: ChatCircle,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    label: 'Comment Added',
  },
  DOCUMENT_VIEWED: {
    icon: Eye,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    label: 'Document Viewed',
  },
  PARTICIPANT_INVITED: {
    icon: UserPlus,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    label: 'Participant Invited',
  },
  PARTICIPANT_JOINED: {
    icon: UserPlus,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    label: 'Participant Joined',
  },
  VAULT_CREATED: {
    icon: FileText,
    color: 'text-vault-gold',
    bg: 'bg-vault-gold/10',
    label: 'Workspace Created',
  },
  VAULT_ACTIVATED: {
    icon: CheckCircle,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    label: 'Workspace Activated',
  },
};

// Event type groups for filtering
const EVENT_GROUPS = {
  documents: ['DOCUMENT_CREATED', 'DOCUMENT_UPDATED', 'DOCUMENT_SUBMITTED'],
  signatures: ['DOCUMENT_SIGNED', 'DOCUMENT_AFFIRMED', 'DOCUMENT_OBJECTED', 'OBJECTION_RESOLVED'],
  collaboration: ['COMMENT_ADDED', 'DOCUMENT_VIEWED'],
  participants: ['PARTICIPANT_INVITED', 'PARTICIPANT_JOINED'],
  workspace: ['VAULT_CREATED', 'VAULT_ACTIVATED'],
};

/**
 * Activity Timeline Component
 * 
 * Displays a chronological timeline of all vault activities.
 * Supports filtering by event type.
 */
export default function ActivityTimeline({ vaultId, documents = [] }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(null); // null = show all
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    documents: true,
    signatures: true,
    collaboration: true,
    participants: true,
    workspace: true,
  });

  useEffect(() => {
    fetchActivityEvents();
  }, [vaultId]);

  const fetchActivityEvents = async () => {
    setLoading(true);
    try {
      // Fetch audit trails for all documents in the vault
      const allEvents = [];
      
      for (const doc of documents) {
        try {
          const response = await axios.get(
            `${API}/api/vaults/documents/${doc.document_id}/audit-trail`,
            { withCredentials: true }
          );
          
          // Add document info to each event
          const docEvents = (response.data.events || []).map(event => ({
            ...event,
            document_title: doc.title,
            document_id: doc.document_id,
          }));
          allEvents.push(...docEvents);
        } catch (err) {
          console.error(`Failed to fetch audit trail for doc ${doc.document_id}:`, err);
        }
      }
      
      // Sort by timestamp descending
      allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setEvents(allEvents);
    } catch (error) {
      console.error('Failed to fetch activity events:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFilter = (group) => {
    setActiveFilters(prev => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  // Filter events based on active filters
  const filteredEvents = events.filter(event => {
    for (const [group, types] of Object.entries(EVENT_GROUPS)) {
      if (types.includes(event.event_type) && !activeFilters[group]) {
        return false;
      }
    }
    return true;
  });

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 minute
    if (diff < 60000) return 'Just now';
    // Less than 1 hour
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    // Less than 24 hours
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    // Less than 7 days
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
    // Otherwise show date
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/50">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
        </p>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
              <Funnel className="w-4 h-4 mr-2" />
              Filter
              <CaretDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-vault-navy border-white/10">
            <DropdownMenuCheckboxItem
              checked={activeFilters.documents}
              onCheckedChange={() => toggleFilter('documents')}
              className="text-white/70"
            >
              Documents
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={activeFilters.signatures}
              onCheckedChange={() => toggleFilter('signatures')}
              className="text-white/70"
            >
              Signatures & Approvals
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={activeFilters.collaboration}
              onCheckedChange={() => toggleFilter('collaboration')}
              className="text-white/70"
            >
              Comments & Views
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={activeFilters.participants}
              onCheckedChange={() => toggleFilter('participants')}
              className="text-white/70"
            >
              Participants
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={activeFilters.workspace}
              onCheckedChange={() => toggleFilter('workspace')}
              className="text-white/70"
            >
              Workspace
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Timeline */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/40">No activity yet</p>
          <p className="text-white/30 text-sm">Events will appear here as actions are taken</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-white/10" />
          
          {/* Events */}
          <div className="space-y-1">
            <AnimatePresence>
              {filteredEvents.map((event, index) => {
                const config = EVENT_CONFIG[event.event_type] || {
                  icon: Clock,
                  color: 'text-white/40',
                  bg: 'bg-white/5',
                  label: event.event_type,
                };
                const Icon = config.icon;

                return (
                  <motion.div
                    key={event.event_id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex gap-4 relative"
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0 z-10`}>
                      <Icon className={`w-5 h-5 ${config.color}`} weight="duotone" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm text-white font-medium">
                            {config.label}
                          </p>
                          {event.document_title && (
                            <p className="text-xs text-white/50 mt-0.5">
                              {event.document_title}
                            </p>
                          )}
                          {event.actor_email && (
                            <p className="text-xs text-white/40 mt-0.5">
                              by {event.actor_email}
                            </p>
                          )}
                          {event.metadata?.note && (
                            <p className="text-xs text-white/50 mt-1 italic">
                              &ldquo;{event.metadata.note}&rdquo;
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-white/30 whitespace-nowrap">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
