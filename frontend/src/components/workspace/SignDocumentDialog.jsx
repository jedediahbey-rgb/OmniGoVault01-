import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import {
  Signature,
  ShieldCheck,
  Clock,
  User,
  At,
  MapPin,
  WarningCircle,
  CheckCircle,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Sign Document Dialog
 * 
 * Implements a click-to-sign pattern with full audit trail.
 * Captures: User ID, Name, Email, Role, Timestamp, IP, Document version
 */
export default function SignDocumentDialog({
  open,
  onOpenChange,
  document,
  userRole,
  onSignatureComplete,
}) {
  const [step, setStep] = useState(1); // 1: Review, 2: Sign
  const [legalName, setLegalName] = useState('');
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const [electronicConsentAcknowledged, setElectronicConsentAcknowledged] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signatureComplete, setSignatureComplete] = useState(false);

  const handleSign = async () => {
    if (!legalName.trim()) {
      toast.error('Please enter your legal name');
      return;
    }
    if (!consentAcknowledged || !electronicConsentAcknowledged) {
      toast.error('Please acknowledge both consent statements');
      return;
    }

    setSigning(true);
    try {
      const response = await axios.post(
        `${API}/api/vaults/documents/${document.document_id}/sign`,
        {
          legal_name: legalName,
          signature_type: 'ELECTRONIC_CONSENT',
          signature_data: JSON.stringify({
            consent_text: 'I agree to the terms of this document and consent to electronic records and signatures.',
            typed_name: legalName,
          }),
          consent_acknowledged: true,
        },
        { withCredentials: true }
      );

      setSignatureComplete(true);
      toast.success('Document signed successfully');

      // Delay to show success state, then close
      setTimeout(() => {
        onSignatureComplete?.(response.data);
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Signing error:', error);
      // Handle Pydantic validation errors which come as an array
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        // Pydantic validation error format
        const errorMessages = detail.map(err => err.msg || err.message || 'Validation error').join(', ');
        toast.error(errorMessages || 'Failed to sign document');
      } else if (typeof detail === 'string') {
        toast.error(detail);
      } else {
        toast.error('Failed to sign document');
      }
    } finally {
      setSigning(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setLegalName('');
    setConsentAcknowledged(false);
    setElectronicConsentAcknowledged(false);
    setSignatureComplete(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-vault-navy border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white font-heading flex items-center gap-2">
            <Signature className="w-5 h-5 text-vault-gold" weight="duotone" />
            Sign Document
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {document?.title}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {signatureComplete ? (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" weight="fill" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Signature Recorded</h3>
              <p className="text-white/50 text-sm">
                Your signature has been securely recorded with timestamp and verification details.
              </p>
            </motion.div>
          ) : step === 1 ? (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Document Info */}
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <h4 className="text-sm font-medium text-white mb-3">Document Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/50">Title:</span>
                    <span className="text-white">{document?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Category:</span>
                    <span className="text-white">
                      {document?.category?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Version:</span>
                    <span className="text-white">v{document?.version || 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Your Role:</span>
                    <span className="text-vault-gold">{userRole?.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex gap-3">
                  <WarningCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" weight="fill" />
                  <div>
                    <h4 className="text-sm font-medium text-amber-300 mb-1">Legal Notice</h4>
                    <p className="text-xs text-amber-200/70">
                      By signing this document, you are legally agreeing to its terms. 
                      Your signature will be recorded with your identity information and timestamp.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setStep(2)}
                  className="bg-vault-gold hover:bg-vault-gold/90 text-vault-navy"
                >
                  Continue to Sign
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="sign"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Legal Name Input */}
              <div>
                <Label className="text-white/70 text-sm">Your Legal Name</Label>
                <Input
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Enter your full legal name"
                  className="mt-1.5 bg-white/5 border-white/10 text-white"
                />
                <p className="text-xs text-white/40 mt-1">
                  This must match the name on your account
                </p>
              </div>

              {/* Consent Checkboxes */}
              <div className="space-y-3 p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consent"
                    checked={consentAcknowledged}
                    onCheckedChange={setConsentAcknowledged}
                    className="mt-0.5"
                  />
                  <Label htmlFor="consent" className="text-sm text-white/80 leading-relaxed cursor-pointer">
                    I have read and agree to the terms of this document.
                  </Label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="electronic-consent"
                    checked={electronicConsentAcknowledged}
                    onCheckedChange={setElectronicConsentAcknowledged}
                    className="mt-0.5"
                  />
                  <Label htmlFor="electronic-consent" className="text-sm text-white/80 leading-relaxed cursor-pointer">
                    I consent to electronic records and signatures, and acknowledge that my signature
                    will be legally binding.
                  </Label>
                </div>
              </div>

              {/* Signature Preview */}
              {legalName && (
                <div className="p-4 rounded-lg border border-dashed border-vault-gold/30 bg-vault-gold/5">
                  <p className="text-xs text-white/50 mb-2">Signature Preview</p>
                  <p className="text-xl font-serif text-vault-gold italic">
                    {legalName}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date().toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Verified Identity
                    </span>
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button variant="ghost" onClick={() => setStep(1)} className="text-white/60">
                  Back
                </Button>
                <Button
                  onClick={handleSign}
                  disabled={signing || !legalName || !consentAcknowledged || !electronicConsentAcknowledged}
                  className="bg-vault-gold hover:bg-vault-gold/90 text-vault-navy"
                >
                  {signing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-vault-navy border-t-transparent rounded-full animate-spin mr-2" />
                      Signing...
                    </>
                  ) : (
                    <>
                      <Signature className="w-4 h-4 mr-2" />
                      Sign Document
                    </>
                  )}
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
