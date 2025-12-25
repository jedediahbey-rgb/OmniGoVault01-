/**
 * Review Mode Header - Shows status and actions for governance records
 * 
 * Features:
 * - Status badge (Draft/Finalized/Voided)
 * - Amend button (for finalized)
 * - View History button
 * - Export button
 * - Edit button (for drafts only)
 */

import { motion } from 'framer-motion';
import {
  Lock,
  PencilSimple,
  GitBranch,
  Download,
  CheckCircle,
  Warning,
  Trash,
  ArrowLeft,
  ShieldCheck,
  X
} from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const statusConfig = {
  draft: {
    label: 'Draft',
    color: 'bg-slate-500/20 text-slate-300 border-slate-400/30',
    icon: PencilSimple,
    description: 'This record is a draft and can be edited'
  },
  finalized: {
    label: 'Finalized',
    color: 'bg-vault-gold/20 text-vault-gold border-vault-gold/30',
    icon: Lock,
    description: 'This record is locked and immutable'
  },
  voided: {
    label: 'Voided',
    color: 'bg-red-500/20 text-red-400 border-red-400/30',
    icon: X,
    description: 'This record has been voided'
  }
};

export default function ReviewModeHeader({
  status = 'draft',
  version = 1,
  contentHash,
  title,
  onBack,
  onEdit,
  onFinalize,
  onAmend,
  onViewHistory,
  onExport,
  onVoid,
  isLoading = false,
  revisionCount = 1
}) {
  const config = statusConfig[status] || statusConfig.draft;
  const StatusIcon = config.icon;
  const isFinalized = status === 'finalized';
  const isDraft = status === 'draft';
  const isVoided = status === 'voided';

  return (
    <div className="sticky top-0 z-20 bg-vault-dark/95 backdrop-blur-sm border-b border-vault-gold/10 px-4 py-3">
      <div className="max-w-5xl mx-auto">
        {/* Top row: Back + Title + Status */}
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex-shrink-0 text-slate-400 hover:text-white"
            >
              <ArrowLeft weight="bold" className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-semibold text-white truncate">
              {title || 'Untitled'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Version badge */}
            <Badge variant="outline" className="border-slate-600 text-slate-400">
              v{version}
            </Badge>
            
            {/* Status badge */}
            <Badge variant="outline" className={config.color}>
              <StatusIcon weight="fill" className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>

            {/* Hash indicator for finalized */}
            {isFinalized && contentHash && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-400/30 font-mono text-xs">
                      <ShieldCheck weight="fill" className="w-3 h-3 mr-1" />
                      {contentHash.slice(0, 8)}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Tamper-evident hash</p>
                    <p className="text-xs font-mono text-slate-400">{contentHash}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-slate-500">{config.description}</p>

          <div className="flex items-center gap-2">
            {/* History button - always visible if there are revisions */}
            {revisionCount > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewHistory}
                className="border-slate-600 text-slate-300 hover:border-purple-500/50 hover:text-purple-400"
              >
                <GitBranch weight="bold" className="w-4 h-4 mr-1.5" />
                History ({revisionCount})
              </Button>
            )}

            {/* Finalized-only actions */}
            {isFinalized && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAmend}
                  disabled={isLoading}
                  className="border-vault-gold/30 text-vault-gold hover:bg-vault-gold/10"
                >
                  <PencilSimple weight="bold" className="w-4 h-4 mr-1.5" />
                  Amend
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExport}
                  className="border-slate-600 text-slate-300 hover:border-slate-500"
                >
                  <Download weight="bold" className="w-4 h-4 mr-1.5" />
                  Export
                </Button>
              </>
            )}

            {/* Draft-only actions */}
            {isDraft && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  disabled={isLoading}
                  className="border-slate-600 text-slate-300 hover:border-blue-500/50 hover:text-blue-400"
                >
                  <PencilSimple weight="bold" className="w-4 h-4 mr-1.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={onFinalize}
                  disabled={isLoading}
                  className="bg-vault-gold hover:bg-vault-gold/90 text-vault-darker"
                >
                  <CheckCircle weight="bold" className="w-4 h-4 mr-1.5" />
                  Finalize
                </Button>
              </>
            )}

            {/* Void button - not for already voided */}
            {!isVoided && onVoid && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onVoid}
                      disabled={isLoading}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash weight="bold" className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Void this record</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
