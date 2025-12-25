import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ShieldWarning,
  Seal,
  Check,
  X,
  ArrowsClockwise,
  Clock,
  Hash,
  Link,
  Info
} from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '../ui/tooltip';
import { useToast } from '../../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SEAL_STATUS_CONFIG = {
  valid: {
    icon: ShieldCheck,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    label: 'Verified',
    description: 'Record integrity confirmed - no tampering detected'
  },
  tampered: {
    icon: ShieldWarning,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'Tampered',
    description: 'INTEGRITY VIOLATION: Record has been modified after sealing'
  },
  never_sealed: {
    icon: Seal,
    color: 'text-vault-muted',
    bgColor: 'bg-vault-gold/5',
    borderColor: 'border-vault-gold/20',
    label: 'Not Sealed',
    description: 'This record has not been sealed yet'
  },
  missing: {
    icon: ShieldWarning,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    label: 'Missing',
    description: 'Seal record is missing - possible data corruption'
  }
};

export default function IntegritySealBadge({
  recordId,
  sealId,
  sealedAt,
  verifiedAt,
  status = 'never_sealed',
  isFinalized = false,
  compact = false,
  onSealCreated,
  onVerified
}) {
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSealing, setIsSealing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [lastVerified, setLastVerified] = useState(verifiedAt);

  const config = SEAL_STATUS_CONFIG[currentStatus] || SEAL_STATUS_CONFIG.never_sealed;
  const StatusIcon = config.icon;

  const handleCreateSeal = async () => {
    if (!recordId || !isFinalized) return;
    
    setIsSealing(true);
    try {
      const res = await fetch(`${API_URL}/api/integrity/seal/${recordId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (data.ok) {
        setCurrentStatus('valid');
        setLastVerified(data.data.seal?.sealed_at);
        toast({
          title: 'Integrity Seal Created',
          description: 'Record has been cryptographically sealed'
        });
        onSealCreated?.(data.data.seal);
      } else {
        toast({
          title: 'Seal Failed',
          description: data.error?.message || 'Failed to create seal',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create integrity seal',
        variant: 'destructive'
      });
    } finally {
      setIsSealing(false);
    }
  };

  const handleVerify = async () => {
    if (!recordId) return;
    
    setIsVerifying(true);
    try {
      const res = await fetch(`${API_URL}/api/integrity/seal/${recordId}/verify`);
      const data = await res.json();

      if (data.ok) {
        const newStatus = data.data.status || 'valid';
        setCurrentStatus(newStatus);
        setLastVerified(data.data.verified_at);
        
        if (newStatus === 'valid') {
          toast({
            title: 'Integrity Verified',
            description: 'No tampering detected'
          });
        } else if (newStatus === 'tampered') {
          toast({
            title: 'INTEGRITY VIOLATION',
            description: 'Record has been modified after sealing!',
            variant: 'destructive'
          });
        }
        
        onVerified?.(data.data);
      } else {
        toast({
          title: 'Verification Failed',
          description: data.error?.message || 'Failed to verify seal',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to verify integrity',
        variant: 'destructive'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Compact badge for list views
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.bgColor} ${config.borderColor} border`}>
              <StatusIcon className={`w-3 h-3 ${config.color}`} weight="fill" />
              <span className={config.color}>{config.label}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-[#0B1221] border-vault-gold/30 text-white">
            <p>{config.description}</p>
            {lastVerified && (
              <p className="text-vault-muted text-xs mt-1">
                Last verified: {new Date(lastVerified).toLocaleString()}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full badge with actions
  return (
    <div className={`rounded-lg border p-3 ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${config.bgColor}`}>
            <StatusIcon className={`w-5 h-5 ${config.color}`} weight="fill" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-medium ${config.color}`}>{config.label}</span>
              {currentStatus === 'valid' && sealId && (
                <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">
                  <Hash className="w-3 h-3 mr-1" />
                  SHA-256
                </Badge>
              )}
            </div>
            <p className="text-xs text-vault-muted mt-0.5">
              {config.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentStatus === 'never_sealed' && isFinalized && (
            <Button
              size="sm"
              onClick={handleCreateSeal}
              disabled={isSealing}
              className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark text-xs"
            >
              {isSealing ? (
                <>
                  <ArrowsClockwise className="w-3 h-3 mr-1 animate-spin" />
                  Sealing...
                </>
              ) : (
                <>
                  <Seal className="w-3 h-3 mr-1" />
                  Create Seal
                </>
              )}
            </Button>
          )}

          {(currentStatus === 'valid' || currentStatus === 'tampered' || sealId) && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleVerify}
              disabled={isVerifying}
              className="border-vault-gold/30 text-vault-muted hover:text-white text-xs"
            >
              {isVerifying ? (
                <>
                  <ArrowsClockwise className="w-3 h-3 mr-1 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Verify
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Verification details */}
      {lastVerified && (
        <div className="mt-3 pt-3 border-t border-vault-gold/10 flex items-center gap-4 text-xs text-vault-muted">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Verified: {new Date(lastVerified).toLocaleString()}</span>
          </div>
          {sealedAt && (
            <div className="flex items-center gap-1">
              <Seal className="w-3 h-3" />
              <span>Sealed: {new Date(sealedAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// Portfolio-level seal status card
export function PortfolioSealStatus({ portfolioId }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [report, setReport] = useState(null);

  const fetchReport = async () => {
    if (!portfolioId) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/integrity/seal/report/${portfolioId}`);
      const data = await res.json();
      
      if (data.ok) {
        setReport(data.data);
      }
    } catch (error) {
      console.error('Error fetching seal report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSeal = async () => {
    if (!portfolioId) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/integrity/seal/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio_id: portfolioId })
      });
      const data = await res.json();

      if (data.ok) {
        toast({
          title: 'Batch Sealing Complete',
          description: data.data.message
        });
        fetchReport();
      } else {
        toast({
          title: 'Error',
          description: data.error?.message || 'Batch sealing failed',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to seal records',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAll = async () => {
    if (!portfolioId) return;
    
    setVerifying(true);
    try {
      const res = await fetch(`${API_URL}/api/integrity/seal/verify-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio_id: portfolioId })
      });
      const data = await res.json();

      if (data.ok) {
        const { valid_count, tampered_count } = data.data;
        if (tampered_count > 0) {
          toast({
            title: 'INTEGRITY ISSUES DETECTED',
            description: `${tampered_count} record(s) show signs of tampering!`,
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'All Seals Verified',
            description: `${valid_count} record(s) passed integrity check`
          });
        }
        fetchReport();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to verify seals',
        variant: 'destructive'
      });
    } finally {
      setVerifying(false);
    }
  };

  // Auto-fetch on mount
  useState(() => {
    fetchReport();
  }, [portfolioId]);

  if (!portfolioId) return null;

  return (
    <div className="bg-[#0B1221]/80 rounded-lg border border-vault-gold/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-vault-gold" />
          <h3 className="font-medium text-white">Integrity Seals</h3>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={fetchReport}
          disabled={loading}
          className="text-vault-muted hover:text-white"
        >
          <ArrowsClockwise className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {report ? (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="text-2xl font-bold text-green-400">{report.sealed_count}</div>
              <div className="text-xs text-green-400/70">Sealed</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="text-2xl font-bold text-amber-400">{report.unsealed_count}</div>
              <div className="text-xs text-amber-400/70">Unsealed</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-vault-gold/10 border border-vault-gold/20">
              <div className="text-2xl font-bold text-vault-gold">{report.seal_coverage}</div>
              <div className="text-xs text-vault-gold/70">Coverage</div>
            </div>
          </div>

          {report.status_breakdown?.tampered > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
              <ShieldWarning className="w-5 h-5 text-red-400" />
              <span className="text-red-400 text-sm font-medium">
                {report.status_breakdown.tampered} record(s) show tampering!
              </span>
            </div>
          )}

          <div className="flex gap-2">
            {report.unsealed_count > 0 && (
              <Button
                size="sm"
                onClick={handleBatchSeal}
                disabled={loading}
                className="flex-1 bg-vault-gold hover:bg-vault-gold/90 text-vault-dark text-xs"
              >
                <Seal className="w-3 h-3 mr-1" />
                Seal All ({report.unsealed_count})
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleVerifyAll}
              disabled={verifying || report.sealed_count === 0}
              className="flex-1 border-vault-gold/30 text-vault-muted hover:text-white text-xs"
            >
              {verifying ? (
                <>
                  <ArrowsClockwise className="w-3 h-3 mr-1 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Verify All
                </>
              )}
            </Button>
          </div>
        </>
      ) : (
        <div className="text-center py-4 text-vault-muted text-sm">
          {loading ? 'Loading seal status...' : 'No seal data available'}
        </div>
      )}
    </div>
  );
}
