/**
 * Amendment Studio - Modal/Drawer for creating amendments
 * 
 * Features:
 * - Change Type: Amendment / Correction
 * - Reason (required, multiline)
 * - Effective Date (optional)
 * - Evidence upload placeholder
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  PencilLine,
  CalendarBlank,
  FileText,
  Info,
  Warning,
  ArrowRight
} from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const changeTypeConfig = {
  amendment: {
    label: 'Amendment',
    description: 'Formal change to the record (e.g., new terms, updated allocations)',
    icon: PencilLine,
    color: 'text-vault-gold'
  },
  correction: {
    label: 'Correction',
    description: 'Fix an error in the original record',
    icon: Warning,
    color: 'text-amber-400'
  }
};

export default function AmendmentStudio({
  open,
  onOpenChange,
  recordTitle,
  currentVersion,
  moduleType,
  onCreateAmendment,
  isLoading = false
}) {
  const [changeType, setChangeType] = useState('amendment');
  const [reason, setReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for this amendment');
      return;
    }
    
    setError('');
    
    try {
      await onCreateAmendment({
        change_type: changeType,
        change_reason: reason.trim(),
        effective_at: effectiveDate || null
      });
      
      // Reset form
      setChangeType('amendment');
      setReason('');
      setEffectiveDate('');
      onOpenChange(false);
    } catch (err) {
      setError(err.message || 'Failed to create amendment');
    }
  };

  const handleClose = () => {
    setError('');
    onOpenChange(false);
  };

  const TypeIcon = changeTypeConfig[changeType]?.icon || PencilLine;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg bg-vault-dark border border-vault-gold/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-lg bg-vault-gold/20 flex items-center justify-center">
              <PencilLine weight="duotone" className="w-5 h-5 text-vault-gold" />
            </div>
            <div>
              <span className="text-white">Create Amendment</span>
              <Badge variant="outline" className="ml-2 text-xs border-vault-gold/30 text-vault-gold">
                v{currentVersion} → v{currentVersion + 1}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription className="text-slate-400 mt-2">
            Create a new revision of <span className="text-vault-gold">&ldquo;{recordTitle}&rdquo;</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Change Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Change Type *</label>
            <Select value={changeType} onValueChange={setChangeType}>
              <SelectTrigger className="bg-vault-darker border-vault-gold/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-vault-darker border-vault-gold/20">
                {Object.entries(changeTypeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <config.icon weight="duotone" className={`w-4 h-4 ${config.color}`} />
                      <span>{config.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              {changeTypeConfig[changeType]?.description}
            </p>
          </div>

          {/* Reason (Required) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Reason for Change *</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why this amendment is needed..."
              className="min-h-[100px] bg-vault-darker border-vault-gold/20 resize-none"
            />
            <p className="text-xs text-slate-500">
              This will be recorded in the audit trail
            </p>
          </div>

          {/* Effective Date (Optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <CalendarBlank weight="duotone" className="w-4 h-4" />
              Effective Date
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">Optional</Badge>
            </label>
            <Input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="bg-vault-darker border-vault-gold/20"
            />
            <p className="text-xs text-slate-500">
              When this amendment takes effect (defaults to immediately)
            </p>
          </div>

          {/* Info Banner */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex gap-3">
            <Info weight="fill" className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-300">
              <p className="font-medium">What happens next?</p>
              <p className="text-blue-400/80 mt-1">
                A new draft (v{currentVersion + 1}) will be created with the current content. 
                You can edit it and finalize when ready. The original v{currentVersion} remains unchanged.
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !reason.trim()}
            className="bg-vault-gold hover:bg-vault-gold/90 text-vault-darker font-medium"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-vault-darker/30 border-t-vault-darker rounded-full"
                />
                Creating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Create Draft Amendment
                <ArrowRight weight="bold" className="w-4 h-4" />
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
