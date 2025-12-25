/**
 * Amendment Studio - Mobile-optimized Modal for creating amendments
 * 
 * Features:
 * - Solid opaque background (no transparency)
 * - Strong z-index for mobile
 * - Body scroll locked when open
 * - Max height 90vh with internal scrolling
 * - Clear close button with safe padding
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  PencilLine,
  CalendarBlank,
  Info,
  Warning,
  ArrowRight
} from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';

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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [open]);

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
    setReason('');
    setEffectiveDate('');
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop - fully opaque dark overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9998]"
        onClick={handleClose}
        aria-hidden="true"
      />
      
      {/* Modal Container */}
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="amendment-studio-title"
      >
        {/* Modal Content - solid background, max height with internal scroll */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg bg-[#0A0F1A] border border-vault-gold/30 rounded-xl shadow-2xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - fixed at top */}
          <div className="flex items-start justify-between p-4 sm:p-6 border-b border-vault-gold/20 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-vault-gold/20 flex items-center justify-center">
                <PencilLine weight="duotone" className="w-5 h-5 text-vault-gold" />
              </div>
              <div>
                <h2 id="amendment-studio-title" className="text-lg sm:text-xl font-semibold text-white">
                  Create Amendment
                </h2>
                <Badge variant="outline" className="mt-1 text-xs border-vault-gold/30 text-vault-gold">
                  v{currentVersion} → v{currentVersion + 1}
                </Badge>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
              aria-label="Close"
            >
              <X weight="bold" className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 space-y-5">
              {/* Record Title */}
              <p className="text-sm text-slate-400">
                Creating amendment for: <span className="text-vault-gold font-medium">&ldquo;{recordTitle}&rdquo;</span>
              </p>

              {/* Change Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Change Type *</label>
                <Select value={changeType} onValueChange={setChangeType}>
                  <SelectTrigger className="bg-[#0D1422] border-vault-gold/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0D1422] border-vault-gold/30 z-[10000]">
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
                  className="min-h-[100px] bg-[#0D1422] border-vault-gold/20 text-white placeholder:text-slate-500 resize-none"
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
                  className="bg-[#0D1422] border-vault-gold/20 text-white"
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
                    A new draft (v{currentVersion + 1}) will be created. You can edit it and finalize when ready. 
                    The original v{currentVersion} remains unchanged.
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
          </ScrollArea>

          {/* Footer - fixed at bottom */}
          <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-vault-gold/20 flex-shrink-0 bg-[#0A0F1A]">
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
          </div>
        </motion.div>
      </div>
    </>
  );
}
