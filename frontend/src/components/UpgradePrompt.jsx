import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Zap } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

/**
 * UpgradePrompt - Shows when user hits an entitlement limit
 * 
 * Usage:
 * <UpgradePrompt
 *   open={showPrompt}
 *   onClose={() => setShowPrompt(false)}
 *   limitType="vaults"
 *   current={5}
 *   limit={5}
 * />
 */
export const UpgradePrompt = ({ 
  open, 
  onClose, 
  limitType = 'vaults',
  current = 0,
  limit = 0,
  featureName = null
}) => {
  const navigate = useNavigate();

  const limitMessages = {
    vaults: {
      title: "Vault Limit Reached",
      description: `You've used ${current} of ${limit} vaults on your current plan.`,
      cta: "Upgrade to create more vaults and unlock additional features."
    },
    teamMembers: {
      title: "Team Member Limit Reached",
      description: `You've invited ${current} of ${limit} team members on your current plan.`,
      cta: "Upgrade to invite more team members and collaborate with your organization."
    },
    storage: {
      title: "Storage Limit Reached",
      description: `You've used ${current} MB of ${limit} MB storage on your current plan.`,
      cta: "Upgrade for more storage space and keep all your documents secure."
    },
    feature: {
      title: "Feature Not Available",
      description: `${featureName || 'This feature'} is not included in your current plan.`,
      cta: "Upgrade to unlock this feature and more."
    }
  };

  const message = limitMessages[limitType] || limitMessages.vaults;

  const handleUpgrade = () => {
    onClose();
    navigate('/billing');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-vault-dark border-vault-gold/30 sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-vault-gold/10">
              <AlertCircle className="w-6 h-6 text-vault-gold" />
            </div>
            <DialogTitle className="text-vault-light text-lg">
              {message.title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-vault-muted pt-2">
            {message.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-vault-light">{message.cta}</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-vault-gold/30 text-vault-muted hover:text-vault-light"
          >
            Maybe Later
          </Button>
          <Button 
            onClick={handleUpgrade}
            className="bg-vault-gold hover:bg-vault-gold/90 text-vault-navy font-semibold"
          >
            <Zap className="w-4 h-4 mr-2" />
            Upgrade Now
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * UpgradeBanner - Inline banner for showing upgrade prompts
 */
export const UpgradeBanner = ({ 
  message = "Upgrade your plan to unlock more features",
  compact = false
}) => {
  const navigate = useNavigate();

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-vault-gold/10 border border-vault-gold/30 rounded-lg text-sm">
        <Zap className="w-4 h-4 text-vault-gold flex-shrink-0" />
        <span className="text-vault-light flex-1">{message}</span>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => navigate('/billing')}
          className="text-vault-gold hover:text-vault-gold/80 hover:bg-vault-gold/10 h-7"
        >
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-r from-vault-gold/10 to-transparent border border-vault-gold/30 rounded-lg">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-vault-gold/20">
            <Zap className="w-5 h-5 text-vault-gold" />
          </div>
          <div>
            <p className="font-medium text-vault-light">{message}</p>
            <p className="text-sm text-vault-muted">Get more vaults, team members, and premium features.</p>
          </div>
        </div>
        <Button 
          onClick={() => navigate('/billing')}
          className="bg-vault-gold hover:bg-vault-gold/90 text-vault-navy font-semibold"
        >
          View Plans
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default UpgradePrompt;
