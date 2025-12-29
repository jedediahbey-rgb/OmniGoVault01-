import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkle, PaintBrush, Crown, Vault, Bank, Diamond, Lock as LockIcon } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';

// All available styles - NO tier restrictions for now (owner gets everything)
const ALL_STYLES = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'Clean and minimal design',
    icon: Vault,
    previewBg: 'bg-gradient-to-br from-slate-700 to-slate-800',
    previewBorder: 'border-slate-600',
    previewAccent: 'bg-vault-gold/30 border-vault-gold',
    iconColor: 'text-vault-gold',
    hasShimmer: false,
  },
  {
    id: 'ledger',
    name: 'Ledger',
    description: 'Subtle borders with understated elegance',
    icon: Bank,
    previewBg: 'bg-gradient-to-br from-zinc-700 to-zinc-900',
    previewBorder: 'border-zinc-500',
    previewAccent: 'bg-slate-500/30 border-slate-400',
    iconColor: 'text-slate-300',
    hasShimmer: false,
  },
  {
    id: 'familyOffice',
    name: 'Family Office',
    description: 'Refined frame with soft gradient',
    icon: Crown,
    previewBg: 'bg-gradient-to-br from-emerald-800 to-emerald-950',
    previewBorder: 'border-emerald-600',
    previewAccent: 'bg-emerald-500/30 border-emerald-400',
    iconColor: 'text-emerald-400',
    hasShimmer: false,
  },
  {
    id: 'privateVault',
    name: 'Private Vault',
    description: 'Dark, high-contrast with engraved borders',
    icon: LockIcon,
    previewBg: 'bg-gradient-to-br from-slate-900 to-zinc-950',
    previewBorder: 'border-slate-500',
    previewAccent: 'bg-slate-400/20 border-slate-400',
    iconColor: 'text-slate-300',
    hasShimmer: false,
  },
  {
    id: 'dynasty',
    name: 'Dynasty',
    description: 'Rich gold accents with embossed elegance',
    icon: Diamond,
    previewBg: 'bg-gradient-to-br from-amber-700 via-yellow-800 to-orange-900',
    previewBorder: 'border-amber-500',
    previewAccent: 'bg-amber-400/30 border-amber-300',
    iconColor: 'text-amber-300',
    hasShimmer: true,
  },
  {
    id: 'crownEstate',
    name: 'Crown Estate',
    description: 'Subtle pattern texture with refined corners',
    icon: Crown,
    previewBg: 'bg-gradient-to-br from-purple-800 via-indigo-900 to-violet-950',
    previewBorder: 'border-purple-500',
    previewAccent: 'bg-purple-400/30 border-purple-300',
    iconColor: 'text-purple-300',
    hasShimmer: true,
  },
];

/**
 * Style Preview Card Component
 */
const StylePreviewCard = ({ style, isSelected, onSelect }) => {
  const IconComponent = style.icon;
  
  return (
    <button
      type="button"
      onClick={() => onSelect(style.id)}
      className={`
        relative w-full p-3 rounded-xl border-2 text-left transition-all duration-200
        ${isSelected 
          ? 'border-vault-gold bg-vault-gold/10 ring-2 ring-vault-gold/30' 
          : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
        }
        cursor-pointer
      `}
    >
      {/* Style Preview Box */}
      <div 
        className={`h-20 rounded-lg mb-3 ${style.previewBg} border ${style.previewBorder} flex items-center justify-center relative overflow-hidden`}
      >
        {/* Shimmer effect for premium styles */}
        {style.hasShimmer && (
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          </div>
        )}
        
        {/* Icon with accent background */}
        <div className={`w-12 h-12 rounded-lg border-2 ${style.previewAccent} flex items-center justify-center`}>
          <IconComponent className={`w-6 h-6 ${style.iconColor}`} weight="duotone" />
        </div>
        
        {/* Decorative corners for premium styles */}
        {(style.id === 'dynasty' || style.id === 'crownEstate') && (
          <>
            <div className={`absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 ${style.previewBorder} rounded-tl`} />
            <div className={`absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 ${style.previewBorder} rounded-tr`} />
            <div className={`absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 ${style.previewBorder} rounded-bl`} />
            <div className={`absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 ${style.previewBorder} rounded-br`} />
          </>
        )}
      </div>
      
      {/* Style Info */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-white font-medium text-sm">{style.name}</h4>
            {style.hasShimmer && (
              <Sparkle className="w-3 h-3 text-amber-400" weight="fill" />
            )}
          </div>
          <p className="text-white/50 text-xs mt-0.5 truncate">{style.description}</p>
        </div>
        
        {/* Selected checkmark */}
        {isSelected && (
          <div className="w-6 h-6 rounded-full bg-vault-gold flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-vault-dark" weight="bold" />
          </div>
        )}
      </div>
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
  const [selectedStyle, setSelectedStyle] = useState(currentStyle);
  const [saving, setSaving] = useState(false);
  
  // Reset selected style when modal opens
  useEffect(() => {
    if (open) {
      setSelectedStyle(currentStyle);
    }
  }, [open, currentStyle]);
  
  const handleSave = async () => {
    if (selectedStyle === currentStyle) {
      onOpenChange(false);
      return;
    }
    
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
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-vault-navy border-white/10 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white font-heading flex items-center gap-2">
            <PaintBrush className="w-5 h-5 text-vault-gold" weight="duotone" />
            Customize Portfolio Style
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Choose a decorative theme for <span className="text-white/70 font-medium">{portfolioName}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 max-h-[60vh] overflow-y-auto pr-1">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3">
            Available Styles ({ALL_STYLES.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ALL_STYLES.map(style => (
              <StylePreviewCard
                key={style.id}
                style={style}
                isSelected={selectedStyle === style.id}
                onSelect={setSelectedStyle}
              />
            ))}
          </div>
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
            disabled={saving}
            className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark font-medium"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-vault-dark border-t-transparent rounded-full animate-spin mr-2" />
                Applying...
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
