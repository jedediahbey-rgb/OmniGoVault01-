import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkle, PaintBrush, Crown, Vault, Bank, Diamond, Lock as LockIcon } from '@phosphor-icons/react';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Style definitions with visual config
const STYLE_DEFINITIONS = {
  standard: {
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
  ledger: {
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
  familyOffice: {
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
  privateVault: {
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
  dynasty: {
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
  crownEstate: {
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
};

/**
 * Style Preview Card Component
 */
const StylePreviewCard = ({ style, isSelected, isLocked, requiredTier, onSelect }) => {
  const styleConfig = STYLE_DEFINITIONS[style.id] || STYLE_DEFINITIONS.standard;
  const IconComponent = styleConfig.icon;
  
  const handleClick = () => {
    if (isLocked) {
      toast.error(`${styleConfig.name} requires ${requiredTier} tier or higher`);
      return;
    }
    onSelect(style.id);
  };
  
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLocked}
      className={`
        relative w-full p-3 rounded-xl border-2 text-left transition-all duration-200
        ${isLocked 
          ? 'border-white/5 bg-white/[0.02] opacity-60 cursor-not-allowed' 
          : isSelected 
            ? 'border-vault-gold bg-vault-gold/10 ring-2 ring-vault-gold/30' 
            : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10 cursor-pointer'
        }
      `}
    >
      {/* Locked overlay */}
      {isLocked && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white/50 text-[10px]">
            <LockIcon className="w-3 h-3" weight="fill" />
            <span>{requiredTier}</span>
          </div>
        </div>
      )}
      
      {/* Style Preview Box */}
      <div 
        className={`h-20 rounded-lg mb-3 ${styleConfig.previewBg} border ${styleConfig.previewBorder} flex items-center justify-center relative overflow-hidden ${isLocked ? 'grayscale' : ''}`}
      >
        {/* Shimmer effect for premium styles */}
        {styleConfig.hasShimmer && !isLocked && (
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          </div>
        )}
        
        {/* Icon with accent background */}
        <div className={`w-12 h-12 rounded-lg border-2 ${styleConfig.previewAccent} flex items-center justify-center`}>
          <IconComponent className={`w-6 h-6 ${styleConfig.iconColor}`} weight="duotone" />
        </div>
        
        {/* Decorative corners for premium styles */}
        {(style.id === 'dynasty' || style.id === 'crownEstate') && !isLocked && (
          <>
            <div className={`absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 ${styleConfig.previewBorder} rounded-tl`} />
            <div className={`absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 ${styleConfig.previewBorder} rounded-tr`} />
            <div className={`absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 ${styleConfig.previewBorder} rounded-bl`} />
            <div className={`absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 ${styleConfig.previewBorder} rounded-br`} />
          </>
        )}
      </div>
      
      {/* Style Info */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`font-medium text-sm ${isLocked ? 'text-white/50' : 'text-white'}`}>{styleConfig.name}</h4>
            {styleConfig.hasShimmer && !isLocked && (
              <Sparkle className="w-3 h-3 text-amber-400" weight="fill" />
            )}
          </div>
          <p className={`text-xs mt-0.5 truncate ${isLocked ? 'text-white/30' : 'text-white/50'}`}>{styleConfig.description}</p>
        </div>
        
        {/* Selected checkmark */}
        {isSelected && !isLocked && (
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
  const [loading, setLoading] = useState(true);
  const [availableStyles, setAvailableStyles] = useState(null);
  const [isOmnicompetent, setIsOmnicompetent] = useState(false);
  
  // Fetch available styles when modal opens
  useEffect(() => {
    if (open) {
      setSelectedStyle(currentStyle);
      fetchAvailableStyles();
    }
  }, [open, currentStyle]);
  
  const fetchAvailableStyles = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/portfolio-styles/available`, {
        withCredentials: true
      });
      setAvailableStyles(response.data.styles);
      setIsOmnicompetent(response.data.is_omnicompetent);
    } catch (error) {
      console.error('Failed to fetch available styles:', error);
      // Default: unlock only free styles
      setAvailableStyles({
        standard: { unlocked: true },
        ledger: { unlocked: true },
        familyOffice: { unlocked: false, required_tier: 'Revocable' },
        privateVault: { unlocked: false, required_tier: 'Irrevocable' },
        dynasty: { unlocked: false, required_tier: 'Dynasty' },
        crownEstate: { unlocked: false, required_tier: 'Dynasty' },
      });
    } finally {
      setLoading(false);
    }
  };
  
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
  
  // Get all style IDs
  const allStyleIds = Object.keys(STYLE_DEFINITIONS);
  
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
            {isOmnicompetent && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs">
                <Sparkle className="w-3 h-3" weight="fill" />
                All Styles Unlocked
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">
                Available Styles ({allStyleIds.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {allStyleIds.map(styleId => {
                  const styleInfo = availableStyles?.[styleId] || { unlocked: false, required_tier: 'Unknown' };
                  return (
                    <StylePreviewCard
                      key={styleId}
                      style={{ id: styleId }}
                      isSelected={selectedStyle === styleId}
                      isLocked={!styleInfo.unlocked}
                      requiredTier={styleInfo.required_tier}
                      onSelect={setSelectedStyle}
                    />
                  );
                })}
              </div>
            </>
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
            disabled={saving || loading}
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
