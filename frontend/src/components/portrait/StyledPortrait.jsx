/**
 * Styled Portrait Component
 * Renders a user portrait/avatar with customizable decorative styles
 * Styles are gated by subscription tier/entitlements
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Diamond, Star, Lightning, Shield, Fire } from '@phosphor-icons/react';

// Portrait style configurations - similar to portfolio card styles
export const PORTRAIT_STYLES = {
  standard: {
    id: 'standard',
    name: 'Standard',
    description: 'Clean, classic portrait frame',
    tier: 0, // Free tier
    borderClass: 'border-white/20',
    hoverBorderClass: 'hover:border-white/40',
    ringClass: '',
    glowClass: '',
    bgGradient: '',
    shimmer: false,
    accentIcon: null,
    accentColor: 'text-white/60',
  },
  gold: {
    id: 'gold',
    name: 'Gold Seal',
    description: 'Distinguished gold accent frame',
    tier: 0, // Free tier
    borderClass: 'border-[#C6A87C]/40',
    hoverBorderClass: 'hover:border-[#C6A87C]/70',
    ringClass: 'ring-1 ring-[#C6A87C]/20',
    glowClass: '',
    bgGradient: '',
    shimmer: false,
    accentIcon: null,
    accentColor: 'text-[#C6A87C]',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Trust',
    description: 'Vibrant emerald accents with subtle glow',
    tier: 1, // Revocable tier
    borderClass: 'border-emerald-500/50',
    hoverBorderClass: 'hover:border-emerald-400/70',
    ringClass: 'ring-1 ring-emerald-500/30',
    glowClass: 'shadow-lg shadow-emerald-500/20',
    bgGradient: 'bg-gradient-to-br from-emerald-500/10 to-transparent',
    shimmer: false,
    accentIcon: Shield,
    accentColor: 'text-emerald-400',
  },
  sapphire: {
    id: 'sapphire',
    name: 'Sapphire Elite',
    description: 'Deep sapphire blue with elegant shimmer',
    tier: 2, // Irrevocable tier
    borderClass: 'border-blue-500/50',
    hoverBorderClass: 'hover:border-blue-400/70',
    ringClass: 'ring-2 ring-blue-500/30',
    glowClass: 'shadow-lg shadow-blue-500/25',
    bgGradient: 'bg-gradient-to-br from-blue-500/15 via-cyan-500/10 to-transparent',
    shimmer: true,
    accentIcon: Diamond,
    accentColor: 'text-blue-400',
  },
  amethyst: {
    id: 'amethyst',
    name: 'Amethyst Royale',
    description: 'Regal purple with mystical aura',
    tier: 2, // Irrevocable tier
    borderClass: 'border-purple-500/50',
    hoverBorderClass: 'hover:border-purple-400/70',
    ringClass: 'ring-2 ring-purple-500/30',
    glowClass: 'shadow-lg shadow-purple-500/25',
    bgGradient: 'bg-gradient-to-br from-purple-500/15 via-violet-500/10 to-transparent',
    shimmer: true,
    accentIcon: Star,
    accentColor: 'text-purple-400',
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian Shadow',
    description: 'Dark, mysterious presence with subtle fire',
    tier: 2, // Irrevocable tier
    borderClass: 'border-slate-400/50',
    hoverBorderClass: 'hover:border-slate-300/70',
    ringClass: 'ring-2 ring-slate-500/40',
    glowClass: 'shadow-lg shadow-orange-500/15',
    bgGradient: 'bg-gradient-to-br from-slate-700/30 via-zinc-800/20 to-orange-900/10',
    shimmer: false,
    pulseGlow: true,
    accentIcon: Fire,
    accentColor: 'text-orange-400',
  },
  dynasty: {
    id: 'dynasty',
    name: 'Dynasty Legacy',
    description: 'Ultimate prestige with animated golden aura',
    tier: 3, // Dynasty tier
    borderClass: 'border-amber-400/60',
    hoverBorderClass: 'hover:border-amber-300/80',
    ringClass: 'ring-2 ring-amber-500/40',
    glowClass: 'shadow-xl shadow-amber-500/30',
    bgGradient: 'bg-gradient-to-br from-amber-500/20 via-yellow-500/15 to-orange-500/20',
    shimmer: true,
    pulseGlow: true,
    accentIcon: Diamond,
    accentColor: 'text-amber-300',
  },
  crown: {
    id: 'crown',
    name: 'Crown Estate',
    description: 'Royal crown insignia with majestic presence',
    tier: 3, // Dynasty tier
    borderClass: 'border-purple-400/60',
    hoverBorderClass: 'hover:border-purple-300/80',
    ringClass: 'ring-2 ring-purple-500/40 ring-offset-1 ring-offset-purple-900/50',
    glowClass: 'shadow-xl shadow-purple-500/30',
    bgGradient: 'bg-gradient-to-br from-purple-500/20 via-pink-500/15 to-violet-500/20',
    shimmer: true,
    pulseGlow: true,
    accentIcon: Crown,
    accentColor: 'text-purple-300',
  },
};

// Get styles available for a given tier
export const getAvailableStyles = (userTier = 0) => {
  return Object.values(PORTRAIT_STYLES).filter(style => style.tier <= userTier);
};

// Get style by ID with fallback
export const getStyleById = (styleId) => {
  return PORTRAIT_STYLES[styleId] || PORTRAIT_STYLES.standard;
};

/**
 * StyledPortrait Component
 * @param {string} src - Image source URL
 * @param {string} alt - Alt text
 * @param {string} fallbackText - Text to show if no image (usually first letter of name)
 * @param {string} styleId - Portrait style ID
 * @param {string} size - Size variant: 'sm' | 'md' | 'lg' | 'xl'
 * @param {boolean} showAccent - Show accent icon badge
 * @param {function} onClick - Click handler
 * @param {string} className - Additional classes
 */
export default function StyledPortrait({
  src,
  alt = 'User',
  fallbackText = 'U',
  styleId = 'standard',
  size = 'md',
  showAccent = true,
  onClick,
  className = '',
}) {
  const style = getStyleById(styleId);
  const AccentIcon = style.accentIcon;
  
  // Size configurations
  const sizes = {
    sm: { container: 'w-8 h-8', text: 'text-sm', icon: 'w-3 h-3', badge: 'w-4 h-4 -right-1 -bottom-1' },
    md: { container: 'w-10 h-10', text: 'text-base', icon: 'w-4 h-4', badge: 'w-5 h-5 -right-1 -bottom-1' },
    lg: { container: 'w-12 h-12', text: 'text-lg', icon: 'w-5 h-5', badge: 'w-6 h-6 -right-1.5 -bottom-1.5' },
    xl: { container: 'w-16 h-16', text: 'text-xl', icon: 'w-6 h-6', badge: 'w-7 h-7 -right-2 -bottom-2' },
  };
  
  const sizeConfig = sizes[size] || sizes.md;
  
  // Build container classes
  const containerClasses = `
    relative rounded-full overflow-visible
    ${sizeConfig.container}
    ${style.glowClass}
    ${className}
  `;
  
  // Build image wrapper classes
  const imageWrapperClasses = `
    relative rounded-full overflow-hidden border-2 transition-all duration-300
    ${sizeConfig.container}
    ${style.borderClass}
    ${style.hoverBorderClass}
    ${style.ringClass}
    ${style.bgGradient}
  `;
  
  return (
    <motion.div
      className={containerClasses}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {/* Pulse glow effect for premium styles */}
      {style.pulseGlow && (
        <motion.div
          className={`absolute inset-0 rounded-full ${style.glowClass}`}
          animate={{
            opacity: [0.5, 0.8, 0.5],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
      
      {/* Main portrait container */}
      <div
        onClick={onClick}
        className={imageWrapperClasses}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        {/* Shimmer effect for premium styles */}
        {style.shimmer && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
        )}
        
        {/* Image or fallback */}
        {src ? (
          <img 
            src={src} 
            alt={alt} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${style.bgGradient || 'bg-[#C6A87C]/20'}`}>
            <span className={`${style.accentColor || 'text-[#C6A87C]'} font-medium ${sizeConfig.text}`}>
              {fallbackText.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      
      {/* Accent icon badge */}
      {showAccent && AccentIcon && (
        <motion.div
          className={`absolute ${sizeConfig.badge} rounded-full bg-vault-dark border border-white/20 flex items-center justify-center z-20`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          <AccentIcon className={`${sizeConfig.icon} ${style.accentColor}`} weight="fill" />
        </motion.div>
      )}
    </motion.div>
  );
}
