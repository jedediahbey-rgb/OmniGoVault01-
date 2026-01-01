/**
 * BulkActionBar - Floating action bar for bulk operations
 * Appears when items are selected in a list view
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trash,
  FolderOpen,
  Tag,
  Download,
  CheckSquare,
  Square
} from '@phosphor-icons/react';
import { Button } from '../ui/button';

export default function BulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onMove,
  onTag,
  onDownload,
  isAllSelected,
  actions = ['delete', 'move', 'tag', 'download'] // Available actions
}) {
  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:left-[calc(50%+8rem)]"
      >
        <div className="flex items-center gap-3 px-4 py-3 bg-[#0B1221]/95 backdrop-blur-xl border border-vault-gold/30 rounded-2xl shadow-2xl shadow-black/50">
          {/* Selection Info */}
          <div className="flex items-center gap-2 pr-3 border-r border-white/10">
            <button
              onClick={isAllSelected ? onDeselectAll : onSelectAll}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              title={isAllSelected ? 'Deselect all' : 'Select all'}
            >
              {isAllSelected ? (
                <CheckSquare className="w-5 h-5 text-vault-gold" weight="fill" />
              ) : (
                <Square className="w-5 h-5 text-white/60" weight="duotone" />
              )}
            </button>
            <span className="text-sm text-white font-medium">
              {selectedCount} of {totalCount} selected
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {actions.includes('move') && onMove && (
              <Button
                onClick={onMove}
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <FolderOpen className="w-4 h-4 mr-1.5" weight="duotone" />
                Move
              </Button>
            )}
            
            {actions.includes('tag') && onTag && (
              <Button
                onClick={onTag}
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <Tag className="w-4 h-4 mr-1.5" weight="duotone" />
                Tag
              </Button>
            )}
            
            {actions.includes('download') && onDownload && (
              <Button
                onClick={onDownload}
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <Download className="w-4 h-4 mr-1.5" weight="duotone" />
                Export
              </Button>
            )}
            
            {actions.includes('delete') && onDelete && (
              <Button
                onClick={onDelete}
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash className="w-4 h-4 mr-1.5" weight="duotone" />
                Delete
              </Button>
            )}
          </div>

          {/* Close/Cancel */}
          <button
            onClick={onDeselectAll}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors ml-1"
            title="Cancel selection"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
