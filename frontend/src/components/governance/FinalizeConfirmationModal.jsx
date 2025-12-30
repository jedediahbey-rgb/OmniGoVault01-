/**
 * Global Finalize Confirmation Modal
 * 
 * Displays warnings and confirmation before finalizing any governance record.
 * Works consistently across all module types (Minutes, Distributions, Disputes, etc.)
 * 
 * Features:
 * - Shows what will be locked
 * - Shows what remains editable
 * - Lists any validation errors/warnings
 * - Optional "type FINALIZE" challenge for extra safety
 * - Consistent UI across all governance modules
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Warning,
  Lock,
  Check,
  X,
  ShieldCheck,
  FileText,
  PencilSimple,
  ArrowRight,
} from '@phosphor-icons/react';

// Module type labels
const MODULE_LABELS = {
  minutes: 'Meeting Minutes',
  distribution: 'Distribution',
  dispute: 'Dispute',
  insurance: 'Insurance Policy',
  compensation: 'Compensation Entry',
};

export function FinalizeConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  recordTitle,
  moduleType,
  rmId,
  validation = null, // Optional validation result from API
  isLoading = false,
  requireTypedConfirmation = false, // If true, user must type FINALIZE
}) {
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Reset typed confirmation when modal opens
  useEffect(() => {
    if (open) {
      // Reset with a microtask to avoid synchronous setState in effect
      queueMicrotask(() => setTypedConfirmation(''));
    }
  }, [open]);

  const moduleLabel = MODULE_LABELS[moduleType] || 'Record';
  
  // Default validation if none provided
  const defaultValidation = {
    can_finalize: true,
    errors: [],
    warnings: [],
    missing_required: [],
    will_lock: [
      'Title and core content',
      'RM-ID assignment',
      'Creation date',
      'All current revision data',
    ],
    remains_editable: [
      'Attachments (via amendment)',
      'Attestations (can be added)',
      'Amendments (creates new revision)',
    ],
  };

  const validationData = validation || defaultValidation;
  const canFinalize = validationData.can_finalize !== false && validationData.errors?.length === 0;
  const hasWarnings = validationData.warnings?.length > 0;
  const hasMissingFields = validationData.missing_required?.length > 0;

  // Check if typed confirmation is valid
  const isConfirmationValid = !requireTypedConfirmation || 
    typedConfirmation.toUpperCase() === 'FINALIZE';

  const handleConfirm = () => {
    if (canFinalize && isConfirmationValid) {
      onConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0B1221] border-vault-gold/30 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading flex items-center gap-2">
            <Warning className="w-6 h-6 text-amber-400" weight="duotone" />
            <span className="text-amber-400">Finalize {moduleLabel}</span>
          </DialogTitle>
          <DialogDescription className="text-vault-muted">
            This action will permanently lock the record
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Record Info */}
          <div className="p-3 rounded-lg bg-vault-dark/50 border border-vault-gold/20">
            <div className="text-sm text-vault-muted mb-1">Record</div>
            <div className="text-white font-medium">{recordTitle}</div>
            {rmId && (
              <div className="text-xs font-mono text-vault-gold mt-1">{rmId}</div>
            )}
          </div>

          {/* Errors - Must Fix */}
          {validationData.errors?.length > 0 && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2 text-red-400 font-medium mb-2">
                <X className="w-4 h-4" />
                Cannot Finalize - Errors Found
              </div>
              <ul className="text-sm text-red-300 space-y-1">
                {validationData.errors.map((error, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Required Fields */}
          {hasMissingFields && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2 text-amber-400 font-medium mb-2">
                <Warning className="w-4 h-4" />
                Missing Required Fields
              </div>
              <div className="flex flex-wrap gap-2">
                {validationData.missing_required.map((field, idx) => (
                  <Badge key={idx} className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <div className="flex items-center gap-2 text-yellow-400 font-medium mb-2">
                <Warning className="w-4 h-4" />
                Warnings
              </div>
              <ul className="text-sm text-yellow-300 space-y-1">
                {validationData.warnings.map((warning, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">•</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Main Warning Message */}
          {canFinalize && (
            <div className="p-4 rounded-lg bg-vault-dark/50 border border-vault-gold/30">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-vault-gold mt-0.5" weight="duotone" />
                <div>
                  <div className="text-white font-medium mb-2">
                    Finalizing will lock this record
                  </div>
                  <p className="text-sm text-vault-muted">
                    Once finalized, the record becomes read-only. Any future changes 
                    will require creating an amendment, which creates a new revision 
                    while preserving the original.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* What Will Lock / What Remains Editable - Collapsible */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-vault-muted hover:text-white transition-colors"
            >
              <ArrowRight className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
              {showAdvanced ? 'Hide details' : 'Show what will be affected'}
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {/* Will Lock */}
                    <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                      <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-2">
                        <Lock className="w-4 h-4" />
                        Will Lock
                      </div>
                      <ul className="text-xs text-vault-muted space-y-1">
                        {validationData.will_lock?.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Remains Editable */}
                    <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                      <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-2">
                        <PencilSimple className="w-4 h-4" />
                        Still Available
                      </div>
                      <ul className="text-xs text-vault-muted space-y-1">
                        {validationData.remains_editable?.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Typed Confirmation Challenge */}
          {requireTypedConfirmation && canFinalize && (
            <div className="p-3 rounded-lg bg-vault-dark/50 border border-vault-gold/20">
              <div className="text-sm text-vault-muted mb-2">
                Type <span className="font-mono text-vault-gold">FINALIZE</span> to confirm:
              </div>
              <Input
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder="Type FINALIZE"
                className="bg-vault-dark border-vault-gold/30 text-white font-mono"
                autoFocus
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-vault-gold/30 text-white hover:bg-vault-gold/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canFinalize || !isConfirmationValid || isLoading}
            className={`${
              canFinalize && isConfirmationValid
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <ShieldCheck className="w-4 h-4 mr-2" />
            )}
            {isLoading ? 'Finalizing...' : 'Finalize Record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FinalizeConfirmationModal;
