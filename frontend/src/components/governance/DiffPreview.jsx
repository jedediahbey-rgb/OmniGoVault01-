/**
 * Diff Preview - Side-by-side comparison of revisions
 * 
 * Features:
 * - Before (prior revision) vs After (current draft)
 * - Highlight changed fields
 * - Field-level diff indicators
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowsLeftRight,
  Plus,
  Minus,
  PencilSimple,
  X
} from '@phosphor-icons/react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const changeTypeColors = {
  added: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: Plus },
  removed: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: Minus },
  modified: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: PencilSimple },
};

function formatValue(value) {
  if (value === null || value === undefined) return <span className="text-slate-500 italic">empty</span>;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return `[${value.length} items]`;
    }
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function formatFieldName(field) {
  return field
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function DiffField({ field, oldValue, newValue, type }) {
  const config = changeTypeColors[type] || changeTypeColors.modified;
  const Icon = config.icon;
  const isComplex = typeof oldValue === 'object' || typeof newValue === 'object';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-lg ${config.bg} border ${config.border} mb-3`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon weight="bold" className={`w-4 h-4 ${config.text}`} />
        <span className="font-medium text-slate-200">{formatFieldName(field)}</span>
        <Badge variant="outline" className={`text-xs ${config.text} border-current/30`}>
          {type}
        </Badge>
      </div>

      {isComplex ? (
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="p-2 rounded bg-vault-darker/50">
            <span className="text-xs text-slate-500 block mb-1">Before</span>
            <pre className="text-xs text-slate-300 overflow-auto max-h-40">
              {oldValue ? JSON.stringify(oldValue, null, 2) : <span className="text-slate-500 italic">empty</span>}
            </pre>
          </div>
          <div className="p-2 rounded bg-vault-darker/50">
            <span className="text-xs text-slate-500 block mb-1">After</span>
            <pre className="text-xs text-slate-300 overflow-auto max-h-40">
              {newValue ? JSON.stringify(newValue, null, 2) : <span className="text-slate-500 italic">empty</span>}
            </pre>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-sm">
          {type !== 'added' && (
            <span className="text-red-400 line-through">{formatValue(oldValue)}</span>
          )}
          {type === 'modified' && <span className="text-slate-500">→</span>}
          {type !== 'removed' && (
            <span className="text-emerald-400">{formatValue(newValue)}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function DiffPreview({
  open,
  onOpenChange,
  beforeVersion,
  afterVersion,
  changes = [],
  beforePayload = {},
  afterPayload = {}
}) {
  const [viewMode, setViewMode] = useState('changes');

  const hasChanges = changes.length > 0;

  const stats = useMemo(() => {
    return {
      added: changes.filter(c => c.type === 'added').length,
      removed: changes.filter(c => c.type === 'removed').length,
      modified: changes.filter(c => c.type === 'modified').length,
    };
  }, [changes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-vault-dark border border-vault-gold/20 max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <ArrowsLeftRight weight="duotone" className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <span className="text-white">Compare Revisions</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs border-slate-600">
                  v{beforeVersion || '?'}
                </Badge>
                <span className="text-slate-500">→</span>
                <Badge variant="outline" className="text-xs border-vault-gold/30 text-vault-gold">
                  v{afterVersion || '?'}
                </Badge>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Stats Bar */}
        <div className="flex gap-4 p-3 rounded-lg bg-vault-darker/50 border border-slate-700/50">
          <div className="flex items-center gap-2">
            <Plus weight="bold" className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400">{stats.added} added</span>
          </div>
          <div className="flex items-center gap-2">
            <Minus weight="bold" className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">{stats.removed} removed</span>
          </div>
          <div className="flex items-center gap-2">
            <PencilSimple weight="bold" className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-400">{stats.modified} modified</span>
          </div>
        </div>

        <Tabs value={viewMode} onValueChange={setViewMode} className="flex-1 flex flex-col">
          <TabsList className="bg-vault-darker/50">
            <TabsTrigger value="changes">Changes ({changes.length})</TabsTrigger>
            <TabsTrigger value="sideBySide">Side by Side</TabsTrigger>
          </TabsList>

          <TabsContent value="changes" className="flex-1 mt-0">
            <ScrollArea className="h-[400px] pr-4">
              {hasChanges ? (
                <div className="py-4">
                  {changes.map((change, index) => (
                    <DiffField
                      key={`${change.field}-${index}`}
                      field={change.field}
                      oldValue={change.old_value}
                      newValue={change.new_value}
                      type={change.type}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <ArrowsLeftRight weight="light" className="w-12 h-12 mb-2" />
                  <p>No changes detected</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="sideBySide" className="flex-1 mt-0">
            <div className="grid grid-cols-2 gap-4 h-[400px]">
              <div className="rounded-lg border border-slate-700 overflow-hidden">
                <div className="px-3 py-2 bg-red-500/10 border-b border-slate-700 text-sm font-medium text-red-400">
                  Before (v{beforeVersion})
                </div>
                <ScrollArea className="h-[calc(100%-36px)]">
                  <pre className="p-3 text-xs text-slate-300 whitespace-pre-wrap">
                    {JSON.stringify(beforePayload, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
              <div className="rounded-lg border border-slate-700 overflow-hidden">
                <div className="px-3 py-2 bg-emerald-500/10 border-b border-slate-700 text-sm font-medium text-emerald-400">
                  After (v{afterVersion})
                </div>
                <ScrollArea className="h-[calc(100%-36px)]">
                  <pre className="p-3 text-xs text-slate-300 whitespace-pre-wrap">
                    {JSON.stringify(afterPayload, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t border-slate-700">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
