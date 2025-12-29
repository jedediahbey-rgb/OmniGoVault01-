import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Check, Sparkle, PaintBrush, Crown, Vault, Bank, Diamond } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import {
  getAllStyles,
  canAccessStyle,
  getMinimumTier,
} from '../../config/portfolioStyles';
import { useBilling } from '../../contexts/BillingContext';

// Style-specific icons for visual distinction
const STYLE_ICONS = {
  standard: Vault,
  ledger: Bank,
  familyOffice: Crown,
  privateVault: Lock,
  dynasty: Diamond,
  crownEstate: Crown,
};

// Distinct visual themes for each style preview
const PREVIEW_THEMES = {
  standard: {
    bg: 'bg-gradient-to-br from-slate-700 to-slate-800',
    border: 'border-slate-600',
    accent: 'bg-vault-gold/30 border-vault-gold',
    iconColor: 'text-vault-gold',
  },
  ledger: {
    bg: 'bg-gradient-to-br from-zinc-700 to-zinc-900',
    border: 'border-zinc-500',
    accent: 'bg-slate-500/30 border-slate-400',
    iconColor: 'text-slate-300',
  },
  familyOffice: {
    bg: 'bg-gradient-to-br from-emerald-800 to-emerald-950',
    border: 'border-emerald-600',
    accent: 'bg-emerald-500/30 border-emerald-400',
    iconColor: 'text-emerald-400',
  },
  privateVault: {
    bg: 'bg-gradient-to-br from-slate-900 to-zinc-950',
    border: 'border-slate-500',
    accent: 'bg-slate-400/20 border-slate-400',
    iconColor: 'text-slate-300',
  },
  dynasty: {
    bg: 'bg-gradient-to-br from-amber-700 via-yellow-800 to-orange-900',
    border: 'border-amber-500',
    accent: 'bg-amber-400/30 border-amber-300',
    iconColor: 'text-amber-300',
  },
  crownEstate: {
    bg: 'bg-gradient-to-br from-purple-800 via-indigo-900 to-violet-950',
    border: 'border-purple-500',
    accent: 'bg-purple-400/30 border-purple-300',
    iconColor: 'text-purple-300',
  },
};

/**
 * Style Preview Card Component
 */
const StylePreviewCard = ({ style, isSelected, isLocked, onSelect }) => {
  const { name, description, effects } = style;
  const theme = PREVIEW_THEMES[style.id] || PREVIEW_THEMES.standard;
  const IconComponent = STYLE_ICONS[style.id] || Vault;
  
  return (
    <button
      type="button"
      onClick={() => !isLocked && onSelect(style.id)}
      disabled={isLocked}
      className={`
        relative w-full p-3 rounded-xl border-2 text-left transition-all duration-200
        ${isSelected 
          ? 'border-vault-gold bg-vault-gold/10 ring-2 ring-vault-gold/30' 
          : isLocked 
            ? 'border-white/10 bg-white/5 opacity-50 cursor-not-allowed' 
            : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10 cursor-pointer'
        }
      `}
    >
      {/* Style Preview Box - More visually distinct */}
      <div 
        className={`h-20 rounded-lg mb-3 ${theme.bg} border ${theme.border} flex items-center justify-center relative overflow-hidden`}
      >
        {/* Pattern overlay for premium styles */}
        {effects.shimmer && (
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          </div>
        )}
        
        {/* Icon with accent background */}
        <div className={`w-12 h-12 rounded-lg border-2 ${theme.accent} flex items-center justify-center`}>
          <IconComponent className={`w-6 h-6 ${theme.iconColor}`} weight="duotone" />
        </div>
        
        {/* Decorative corners for premium styles */}
        {(style.id === 'dynasty' || style.id === 'crownEstate') && (
          <>
            <div className={`absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 ${theme.border} rounded-tl`} />
            <div className={`absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 ${theme.border} rounded-tr`} />
            <div className={`absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 ${theme.border} rounded-bl`} />
            <div className={`absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 ${theme.border} rounded-br`} />
          </>
        )}
      </div>
      
      {/* Style Info */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-white font-medium text-sm">{name}</h4>
            {effects.shimmer && (
              <Sparkle className="w-3 h-3 text-amber-400" weight="fill" />
            )}
          </div>
          <p className="text-white/50 text-xs mt-0.5 truncate">{description}</p>
        </div>
        
        {/* Status Icon */}
        <div className="shrink-0">
          {isLocked ? (
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
              <Lock className="w-3 h-3 text-white/40" weight="fill" />
            </div>
          ) : isSelected ? (
            <div className="w-6 h-6 rounded-full bg-vault-gold flex items-center justify-center">
              <Check className="w-3 h-3 text-vault-dark" weight="bold" />
            </div>
          ) : null}
        </div>
      </div>
      
      {/* Locked Badge */}
      {isLocked && (
        <div className="mt-2 text-center">
          <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
            Requires {getMinimumTier(style.tiers)} tier
          </span>
        </div>
      )}
    </button>
  );
};

/**
 * Portfolio Style Selector Modal
 */
export default function PortfolioStyleSelector({ 
  open, 
  onOpenChange, 
  currentStyle = 'standard',
  onStyleSelect,
  portfolioName = 'Portfolio'
}) {
  const { subscription } = useBilling();
  const userTier = subscription?.plan_name || 'Free';
  const [selectedStyle, setSelectedStyle] = useState(currentStyle);
  const [saving, setSaving] = useState(false);
  
  // Reset selected style when modal opens
  useEffect(() => {
    if (open) {
      setSelectedStyle(currentStyle);
    }
  }, [open, currentStyle]);
  
  const allStyles = getAllStyles();
  
  const handleSave = async () => {
    setSaving(true);
    try {
      await onStyleSelect(selectedStyle);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save style:', error);
    } finally {
      setSaving(false);
    }
  };
  
  // Group styles by access
  const accessibleStyles = allStyles.filter(s => canAccessStyle(userTier, s.tiers));
  const lockedStyles = allStyles.filter(s => !canAccessStyle(userTier, s.tiers));
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-vault-navy border-white/10 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white font-heading flex items-center gap-2">
            <PaintBrush className="w-5 h-5 text-vault-gold" weight="duotone" />
            Customize Portfolio Style
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Choose a decorative theme for <span className="text-white/70">{portfolioName}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6 max-h-[60vh] overflow-y-scroll pr-2">
          {/* Available Styles */}
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">
              Available Styles ({accessibleStyles.length})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {accessibleStyles.map(style => (
                <StylePreviewCard
                  key={style.id}
                  style={style}
                  isSelected={selectedStyle === style.id}
                  isLocked={false}
                  onSelect={setSelectedStyle}
                />
              ))}
            </div>
          </div>
          
          {/* Locked Styles */}
          {lockedStyles.length > 0 && (
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                <Lock className="w-3 h-3" weight="fill" />
                Premium Styles ({lockedStyles.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {lockedStyles.map(style => (
                  <StylePreviewCard
                    key={style.id}
                    style={style}
                    isSelected={false}
                    isLocked={true}
                    onSelect={() => {}}
                  />
                ))}
              </div>
              <p className="text-white/30 text-xs text-center mt-3">
                Upgrade your plan to unlock premium portfolio styles
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter className="border-t border-white/10 pt-4">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-white/60 hover:text-white"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving || selectedStyle === currentStyle}
            className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-vault-dark border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Apply Style'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
