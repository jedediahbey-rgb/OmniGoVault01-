import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Check, Sparkle, PaintBrush } from '@phosphor-icons/react';
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
  PORTFOLIO_STYLES,
  getAllStyles,
  canAccessStyle,
  getMinimumTier,
} from '../../config/portfolioStyles';
import { useBilling } from '../../contexts/BillingContext';

/**
 * Style Preview Card Component
 */
const StylePreviewCard = ({ style, isSelected, isLocked, onSelect }) => {
  const { preview, effects, name, description } = style;
  
  return (
    <motion.button
      onClick={() => !isLocked && onSelect(style.id)}
      disabled={isLocked}
      whileHover={!isLocked ? { scale: 1.02 } : {}}
      whileTap={!isLocked ? { scale: 0.98 } : {}}
      className={`
        relative w-full p-4 rounded-xl border-2 text-left transition-all
        ${isSelected 
          ? 'border-vault-gold bg-vault-gold/10' 
          : isLocked 
            ? 'border-white/10 bg-white/5 opacity-60 cursor-not-allowed' 
            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 cursor-pointer'
        }
      `}
    >
      {/* Style Preview Box */}
      <div 
        className={`h-16 rounded-lg mb-3 bg-gradient-to-br ${preview.gradient} border border-white/10 flex items-center justify-center overflow-hidden`}
      >
        {effects.shimmer && (
          <div className="absolute inset-0 shimmer-effect opacity-50" />
        )}
        <div 
          className="w-8 h-8 rounded-lg border-2"
          style={{ 
            borderColor: preview.accent,
            backgroundColor: `${preview.accent}20`
          }}
        />
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
          <p className="text-white/50 text-xs mt-0.5 line-clamp-1">{description}</p>
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
      
      {/* Locked Overlay */}
      {isLocked && (
        <div className="absolute inset-0 flex items-end justify-center pb-2">
          <span className="text-[10px] text-white/40 bg-black/60 px-2 py-0.5 rounded-full">
            {getMinimumTier(style.tiers)} tier
          </span>
        </div>
      )}
    </motion.button>
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
      <DialogContent className="bg-vault-navy border-white/10 max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white font-heading flex items-center gap-2">
            <PaintBrush className="w-5 h-5 text-vault-gold" weight="duotone" />
            Customize Portfolio Style
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Choose a decorative theme for <span className="text-white/70">{portfolioName}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          {/* Available Styles */}
          <div className="mb-6">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">
              Available Styles
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
                Premium Styles
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
            className="btn-primary"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
