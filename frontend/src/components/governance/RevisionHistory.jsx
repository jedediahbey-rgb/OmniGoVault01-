/**
 * Revision History - Timeline showing all versions
 * 
 * Features:
 * - Version list with who/when/reason/hash
 * - Click to view read-only
 * - Compare between versions
 * - Visual hash chain indicator
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  User,
  Hash,
  FileText,
  Eye,
  GitBranch,
  CheckCircle,
  PencilSimple,
  ArrowsLeftRight,
  X,
  ShieldCheck,
  Warning
} from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';

const changeTypeConfig = {
  initial: { label: 'Original', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30', icon: FileText },
  amendment: { label: 'Amendment', color: 'bg-vault-gold/20 text-vault-gold border-vault-gold/30', icon: PencilSimple },
  correction: { label: 'Correction', color: 'bg-amber-500/20 text-amber-400 border-amber-400/30', icon: Warning },
  void: { label: 'Voided', color: 'bg-red-500/20 text-red-400 border-red-400/30', icon: X },
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

function truncateHash(hash) {
  if (!hash) return 'N/A';
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

export default function RevisionHistory({
  open,
  onOpenChange,
  recordTitle,
  revisions = [],
  currentRevisionId,
  onViewRevision,
  onCompare
}) {
  const [selectedForCompare, setSelectedForCompare] = useState(null);
  const [compareMode, setCompareMode] = useState(false);

  const handleCompareClick = (revision) => {
    if (!compareMode) {
      setCompareMode(true);
      setSelectedForCompare(revision);
    } else if (selectedForCompare && selectedForCompare.id !== revision.id) {
      // Perform comparison
      onCompare?.(selectedForCompare.id, revision.id);
      setCompareMode(false);
      setSelectedForCompare(null);
    }
  };

  const cancelCompare = () => {
    setCompareMode(false);
    setSelectedForCompare(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-vault-dark border border-vault-gold/20 max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <GitBranch weight="duotone" className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <span className="text-white">Revision History</span>
              <Badge variant="outline" className="ml-2 text-xs border-slate-600 text-slate-400">
                {revisions.length} version{revisions.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {recordTitle}
          </DialogDescription>
        </DialogHeader>

        {/* Compare Mode Banner */}
        {compareMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 text-sm text-blue-300">
              <ArrowsLeftRight weight="bold" className="w-4 h-4" />
              <span>Select another version to compare with v{selectedForCompare?.version}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={cancelCompare}
              className="text-blue-400 hover:text-blue-300"
            >
              Cancel
            </Button>
          </motion.div>
        )}

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="relative space-y-4 py-4">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-vault-gold/50 via-slate-600 to-slate-700" />

            {revisions.map((revision, index) => {
              const config = changeTypeConfig[revision.change_type] || changeTypeConfig.initial;
              const TypeIcon = config.icon;
              const isCurrent = revision.id === currentRevisionId;
              const isFinalized = !!revision.finalized_at;
              const isSelected = selectedForCompare?.id === revision.id;

              return (
                <motion.div
                  key={revision.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative flex gap-4 p-4 rounded-lg transition-all ${
                    isSelected
                      ? 'bg-blue-500/20 border border-blue-500/30'
                      : isCurrent
                      ? 'bg-vault-gold/10 border border-vault-gold/20'
                      : 'bg-vault-darker/50 border border-transparent hover:border-slate-700'
                  }`}
                >
                  {/* Version indicator */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                    isCurrent ? 'bg-vault-gold text-vault-darker' : 'bg-vault-darker border border-slate-600 text-slate-300'
                  }`}>
                    <span className="text-sm font-bold">v{revision.version}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge variant="outline" className={config.color}>
                        <TypeIcon weight="bold" className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                      {isCurrent && (
                        <Badge className="bg-vault-gold/20 text-vault-gold border-vault-gold/30">
                          Current
                        </Badge>
                      )}
                      {isFinalized ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-400/30">
                          <CheckCircle weight="fill" className="w-3 h-3 mr-1" />
                          Finalized
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                          Draft
                        </Badge>
                      )}
                    </div>

                    {/* Reason */}
                    {revision.change_reason && (
                      <p className="text-sm text-slate-300 mb-2 line-clamp-2">
                        "{revision.change_reason}"
                      </p>
                    )}

                    {/* Meta info */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User weight="fill" className="w-3 h-3" />
                        {revision.created_by || 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock weight="fill" className="w-3 h-3" />
                        {formatDate(revision.finalized_at || revision.created_at)}
                      </span>
                      {revision.content_hash && (
                        <span className="flex items-center gap-1 font-mono">
                          <ShieldCheck weight="fill" className="w-3 h-3 text-emerald-500" />
                          {truncateHash(revision.content_hash)}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewRevision?.(revision)}
                        className="text-xs border-slate-600 hover:border-vault-gold/50"
                      >
                        <Eye weight="bold" className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      {isFinalized && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCompareClick(revision)}
                          className={`text-xs ${
                            isSelected
                              ? 'border-blue-500 text-blue-400'
                              : 'border-slate-600 hover:border-blue-500/50'
                          }`}
                        >
                          <ArrowsLeftRight weight="bold" className="w-3 h-3 mr-1" />
                          {isSelected ? 'Selected' : 'Compare'}
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
