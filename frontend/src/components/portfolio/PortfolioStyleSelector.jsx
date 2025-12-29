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
    description: 'Clean and minimal design with gold accents',
    icon: Vault,
    previewBg: 'bg-gradient-to-br from-slate-700 to-slate-800',
    previewBorder: 'border-slate-600',
    previewAccent: 'bg-vault-gold/30 border-vault-gold',
    iconColor: 'text-vault-gold',
    isPremium: false,
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
    isPremium: false,
  },
  familyOffice: {
    id: 'familyOffice',
    name: 'Family Office',
    description: 'Refined frame with soft emerald gradient',
    icon: Crown,
    previewBg: 'bg-gradient-to-br from-emerald-800 to-emerald-950',
    previewBorder: 'border-emerald-600',
    previewAccent: 'bg-emerald-500/30 border-emerald-400',
    iconColor: 'text-emerald-400',
    isPremium: false,
  },
  privateVault: {
    id: 'privateVault',
    name: 'Private Vault',
    description: 'Dark high-contrast with engraved borders',
    icon: LockIcon,
    previewBg: 'bg-gradient-to-br from-slate-900 to-zinc-950',
    previewBorder: 'border-slate-500',
    previewAccent: 'bg-slate-400/20 border-slate-400',
    iconColor: 'text-slate-300',
    isPremium: false,
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
    isPremium: true,
  },
  crownEstate: {
    id: 'crownEstate',
    name: 'Crown Estate',
    description: 'Royal purple with refined pattern texture',
    icon: Crown,
    previewBg: 'bg-gradient-to-br from-purple-800 via-indigo-900 to-violet-950',
    previewBorder: 'border-purple-500',
    previewAccent: 'bg-purple-400/30 border-purple-300',
    iconColor: 'text-purple-300',
    isPremium: true,
  },
};

/**
 * Style Preview Card Component - Clean aligned layout
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
      {/* Locked badge - top right */}
      {isLocked && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white/50 text-[10px]">
            <LockIcon className="w-3 h-3" weight="fill" />
            <span>{requiredTier}</span>
          </div>
        </div>
      )}
      
      {/* Selected checkmark - top right */}
      {isSelected && !isLocked && (
        <div className="absolute top-2 right-2 z-10">
          <div className="w-6 h-6 rounded-full bg-vault-gold flex items-center justify-center">
            <Check className="w-4 h-4 text-vault-dark" weight="bold" />
          </div>
        </div>
      )}
      
      {/* Style Preview Box */}
      <div 
        className={`h-16 rounded-lg mb-2 ${styleConfig.previewBg} border ${styleConfig.previewBorder} flex items-center justify-center relative overflow-hidden ${isLocked ? 'grayscale' : ''}`}
      >
        {/* Shimmer effect for premium styles */}
        {styleConfig.isPremium && !isLocked && (
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          </div>
        )}
        
        {/* Icon with accent background */}
        <div className={`w-10 h-10 rounded-lg border-2 ${styleConfig.previewAccent} flex items-center justify-center`}>
          <IconComponent className={`w-5 h-5 ${styleConfig.iconColor}`} weight="duotone" />
        </div>
        
        {/* Decorative corners for premium styles */}
        {styleConfig.isPremium && !isLocked && (
          <>
            <div className={`absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 ${styleConfig.previewBorder} rounded-tl`} />
            <div className={`absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 ${styleConfig.previewBorder} rounded-tr`} />
            <div className={`absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 ${styleConfig.previewBorder} rounded-bl`} />
            <div className={`absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 ${styleConfig.previewBorder} rounded-br`} />
          </>
        )}
      </div>
      
      {/* Style Name with premium sparkle */}
      <div className="flex items-center gap-1.5 mb-0.5">
        <h4 className={`font-medium text-sm ${isLocked ? 'text-white/50' : 'text-white'}`}>
          {styleConfig.name}
        </h4>
        {styleConfig.isPremium && !isLocked && (
          <Sparkle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" weight="fill" />
        )}
      </div>
      
      {/* Description - full text, wraps naturally */}
      <p className={`text-[11px] leading-tight ${isLocked ? 'text-white/30' : 'text-white/50'}`}>
        {styleConfig.description}
      </p>
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
      <DialogContent className="bg-vault-navy border-white/10 max-w-lg mx-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-white font-heading flex items-center gap-2 text-lg">
            <PaintBrush className="w-5 h-5 text-vault-gold" weight="duotone" />
            Customize Style
          </DialogTitle>
          <DialogDescription className="text-white/50 text-sm">
            Choose a theme for <span className="text-white/70 font-medium">{portfolioName}</span>
            {isOmnicompetent && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs">
                <Sparkle className="w-3 h-3" weight="fill" />
                All Unlocked
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-2 max-h-[55vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
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
          )}
        </div>
        
        <DialogFooter className="border-t border-white/10 pt-3 gap-2 sm:gap-2">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-white/60 hover:text-white flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark font-medium flex-1 sm:flex-none"
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
