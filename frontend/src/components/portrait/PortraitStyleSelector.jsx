/**
 * Portrait Style Selector Dialog
 * Allows users to customize their portrait style based on subscription tier
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Check, 
  Lock, 
  Crown, 
  SparkleIcon,
  ArrowRight
} from 'lucide-react';
import { Sparkle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import axios from 'axios';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import StyledPortrait, { PORTRAIT_STYLES, getAvailableStyles, getStyleById } from './StyledPortrait';

const API = process.env.REACT_APP_BACKEND_URL;

// Tier names for display
const TIER_NAMES = {
  0: 'Testamentary',
  1: 'Revocable',
  2: 'Irrevocable',
  3: 'Dynasty',
};

// Tier badge colors
const TIER_COLORS = {
  0: 'bg-slate-600/30 text-slate-300 border-slate-500/40',
  1: 'bg-emerald-600/30 text-emerald-400 border-emerald-500/40',
  2: 'bg-blue-600/30 text-blue-400 border-blue-500/40',
  3: 'bg-purple-600/30 text-purple-400 border-purple-500/40',
};

export default function PortraitStyleSelector({
  isOpen,
  onClose,
  currentStyleId = 'standard',
  userTier = 0,
  userPicture,
  userName,
  onStyleChange,
}) {
  const [selectedStyle, setSelectedStyle] = useState(currentStyleId);
  const [saving, setSaving] = useState(false);
  
  const availableStyles = getAvailableStyles(userTier);
  const allStyles = Object.values(PORTRAIT_STYLES);
  
  const handleSave = async () => {
    if (selectedStyle === currentStyleId) {
      onClose();
      return;
    }
    
    setSaving(true);
    try {
      const res = await axios.put(`${API}/api/user/profile`, {
        portrait_style: selectedStyle,
      });
      
      toast.success('Portrait style updated!');
      onStyleChange?.(selectedStyle);
      onClose();
    } catch (error) {
      console.error('Failed to save portrait style:', error);
      toast.error(error.response?.data?.detail || 'Failed to save portrait style');
    } finally {
      setSaving(false);
    }
  };
  
  const handleStyleClick = (style) => {
    if (style.tier <= userTier) {
      setSelectedStyle(style.id);
    } else {
      toast.info(`Upgrade to ${TIER_NAMES[style.tier]} to unlock this style`);
    }
  };
  
  const isStyleLocked = (style) => style.tier > userTier;
  const isStyleSelected = (style) => selectedStyle === style.id;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-vault-dark border-vault-gold/20 max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-white text-xl">
            <Sparkle className="w-5 h-5 text-vault-gold" weight="fill" />
            Customize Portrait Style
          </DialogTitle>
          <p className="text-sm text-vault-muted mt-1">
            Select a style to enhance your portrait appearance across the platform.
          </p>
        </DialogHeader>
        
        {/* Preview Section */}
        <div className="flex items-center justify-center py-6 border-b border-white/10 flex-shrink-0">
          <div className="flex flex-col items-center gap-3">
            <StyledPortrait
              src={userPicture}
              alt={userName}
              fallbackText={userName || 'U'}
              styleId={selectedStyle}
              size="xl"
              showAccent={true}
            />
            <div className="text-center">
              <p className="text-white font-medium">{getStyleById(selectedStyle).name}</p>
              <p className="text-xs text-vault-muted">{getStyleById(selectedStyle).description}</p>
            </div>
          </div>
        </div>
        
        {/* Styles Grid */}
        <div className="flex-1 overflow-y-auto py-4 px-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {allStyles.map((style) => {
              const locked = isStyleLocked(style);
              const selected = isStyleSelected(style);
              
              return (
                <motion.button
                  key={style.id}
                  onClick={() => handleStyleClick(style)}
                  className={`
                    relative p-3 rounded-xl border-2 transition-all duration-200
                    ${selected 
                      ? 'border-vault-gold bg-vault-gold/10' 
                      : locked 
                        ? 'border-white/10 bg-white/5 opacity-60' 
                        : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                    }
                  `}
                  whileHover={!locked ? { scale: 1.02 } : {}}
                  whileTap={!locked ? { scale: 0.98 } : {}}
                >
                  {/* Lock overlay for locked styles */}
                  {locked && (
                    <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center z-10">
                      <div className="flex flex-col items-center gap-1">
                        <Lock className="w-5 h-5 text-white/60" />
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${TIER_COLORS[style.tier]}`}>
                          {TIER_NAMES[style.tier]}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Selected checkmark */}
                  {selected && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-vault-gold flex items-center justify-center z-20">
                      <Check className="w-3 h-3 text-vault-dark" />
                    </div>
                  )}
                  
                  {/* Style preview */}
                  <div className="flex flex-col items-center gap-2">
                    <StyledPortrait
                      src={userPicture}
                      alt={userName}
                      fallbackText={userName || 'U'}
                      styleId={style.id}
                      size="md"
                      showAccent={true}
                    />
                    <div className="text-center">
                      <p className={`text-xs font-medium ${selected ? 'text-vault-gold' : 'text-white'}`}>
                        {style.name}
                      </p>
                      {!locked && style.tier > 0 && (
                        <span className={`text-[9px] px-1 py-0.5 rounded ${TIER_COLORS[style.tier]}`}>
                          {TIER_NAMES[style.tier]}+
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
          
          {/* Upgrade prompt if on free tier */}
          {userTier < 3 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-pink-900/20"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Crown className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-sm text-white font-medium">Unlock Premium Styles</p>
                    <p className="text-xs text-purple-300/70">
                      Upgrade your plan to access exclusive portrait styles
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    window.location.href = '/billing';
                  }}
                  className="border-purple-500/40 text-purple-300 hover:bg-purple-500/20 flex-shrink-0"
                >
                  Upgrade
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10 flex-shrink-0">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-vault-muted hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || selectedStyle === currentStyleId}
            className="bg-vault-gold text-vault-dark hover:bg-vault-gold/90"
          >
            {saving ? 'Saving...' : 'Save Style'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
