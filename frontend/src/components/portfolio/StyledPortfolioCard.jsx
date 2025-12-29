import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Star, 
  DotsThreeVertical, 
  PencilSimple, 
  Trash,
  ArrowRight,
  PaintBrush,
  Sparkle,
  Crown,
  Diamond
} from '@phosphor-icons/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import IconBadge from '../shared/IconBadge';
import { getStyleById } from '../../config/portfolioStyles';

// Visual configurations for each style
const STYLE_VISUALS = {
  standard: {
    cardBg: 'bg-transparent',
    cardBorder: 'border-white/10',
    cardHoverBorder: 'hover:border-vault-gold/40',
    cardHoverBg: 'hover:bg-vault-gold/5',
    defaultBg: 'bg-vault-gold/5',
    defaultBorder: 'border-vault-gold/40',
    chipBg: 'bg-vault-gold/20',
    chipText: 'text-vault-gold',
    chipBorder: 'border-vault-gold/30',
    iconVariant: 'gold',
    showShimmer: false,
    showGlow: false,
    accentIcon: null,
  },
  ledger: {
    cardBg: 'bg-gradient-to-br from-slate-800/30 to-slate-900/20',
    cardBorder: 'border-slate-600/30',
    cardHoverBorder: 'hover:border-slate-500/50',
    cardHoverBg: 'hover:from-slate-700/40 hover:to-slate-800/30',
    defaultBg: 'bg-gradient-to-br from-slate-700/40 to-slate-800/30',
    defaultBorder: 'border-slate-500/50',
    chipBg: 'bg-slate-600/40',
    chipText: 'text-slate-300',
    chipBorder: 'border-slate-500/40',
    iconVariant: 'slate',
    showShimmer: false,
    showGlow: false,
    accentIcon: null,
  },
  familyOffice: {
    cardBg: 'bg-gradient-to-br from-emerald-900/30 to-emerald-950/20',
    cardBorder: 'border-emerald-600/30',
    cardHoverBorder: 'hover:border-emerald-500/50',
    cardHoverBg: 'hover:from-emerald-800/40 hover:to-emerald-900/30',
    defaultBg: 'bg-gradient-to-br from-emerald-800/40 to-emerald-900/30',
    defaultBorder: 'border-emerald-500/50',
    chipBg: 'bg-emerald-600/30',
    chipText: 'text-emerald-400',
    chipBorder: 'border-emerald-500/40',
    iconVariant: 'emerald',
    showShimmer: false,
    showGlow: true,
    glowColor: 'shadow-emerald-500/20',
    accentIcon: null,
  },
  privateVault: {
    cardBg: 'bg-gradient-to-br from-slate-900/60 to-zinc-900/40',
    cardBorder: 'border-slate-500/40',
    cardHoverBorder: 'hover:border-slate-400/60',
    cardHoverBg: 'hover:from-slate-800/70 hover:to-zinc-800/50',
    defaultBg: 'bg-gradient-to-br from-slate-800/70 to-zinc-800/50',
    defaultBorder: 'border-slate-400/60',
    chipBg: 'bg-slate-700/50',
    chipText: 'text-slate-300',
    chipBorder: 'border-slate-500/50',
    iconVariant: 'slate',
    showShimmer: false,
    showGlow: false,
    accentIcon: null,
  },
  dynasty: {
    cardBg: 'bg-gradient-to-br from-amber-900/30 via-yellow-900/20 to-orange-900/30',
    cardBorder: 'border-amber-500/40',
    cardHoverBorder: 'hover:border-amber-400/60',
    cardHoverBg: 'hover:from-amber-800/40 hover:via-yellow-800/30 hover:to-orange-800/40',
    defaultBg: 'bg-gradient-to-br from-amber-800/50 via-yellow-800/40 to-orange-800/50',
    defaultBorder: 'border-amber-400/60',
    chipBg: 'bg-gradient-to-r from-amber-500/30 to-yellow-500/20',
    chipText: 'text-amber-300',
    chipBorder: 'border-amber-400/50',
    iconVariant: 'amber',
    showShimmer: true,
    showGlow: true,
    glowColor: 'shadow-lg shadow-amber-500/20',
    accentIcon: Diamond,
  },
  crownEstate: {
    cardBg: 'bg-gradient-to-br from-purple-900/30 via-indigo-900/20 to-violet-900/30',
    cardBorder: 'border-purple-500/40',
    cardHoverBorder: 'hover:border-purple-400/60',
    cardHoverBg: 'hover:from-purple-800/40 hover:via-indigo-800/30 hover:to-violet-800/40',
    defaultBg: 'bg-gradient-to-br from-purple-800/50 via-indigo-800/40 to-violet-800/50',
    defaultBorder: 'border-purple-400/60',
    chipBg: 'bg-gradient-to-r from-purple-500/30 to-violet-500/20',
    chipText: 'text-purple-300',
    chipBorder: 'border-purple-400/50',
    iconVariant: 'purple',
    showShimmer: true,
    showGlow: true,
    glowColor: 'shadow-lg shadow-purple-500/20',
    accentIcon: Crown,
  },
};

// Icon badge variants
const ICON_VARIANTS = {
  gold: 'bg-vault-gold/20 text-vault-gold border-vault-gold/30',
  slate: 'bg-slate-600/30 text-slate-300 border-slate-500/30',
  emerald: 'bg-emerald-600/30 text-emerald-400 border-emerald-500/30',
  amber: 'bg-amber-600/30 text-amber-400 border-amber-500/30',
  purple: 'bg-purple-600/30 text-purple-400 border-purple-500/30',
};

/**
 * Styled Portfolio Card Component
 * Renders a portfolio card with the user's selected decorative style
 */
export default function StyledPortfolioCard({
  portfolio,
  isDefault = false,
  styleId = 'standard',
  onSetDefault,
  onClearDefault,
  onEdit,
  onDelete,
  onCustomize,
}) {
  const navigate = useNavigate();
  const visuals = STYLE_VISUALS[styleId] || STYLE_VISUALS.standard;
  const AccentIcon = visuals.accentIcon;
  
  // Build card classes
  const cardClasses = `
    relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 cursor-pointer group min-h-[72px] overflow-hidden
    ${isDefault ? `${visuals.defaultBg} ${visuals.defaultBorder}` : `${visuals.cardBg} ${visuals.cardBorder} ${visuals.cardHoverBorder} ${visuals.cardHoverBg}`}
    ${visuals.showGlow ? visuals.glowColor : ''}
  `;
  
  return (
    <motion.div
      onClick={() => navigate(`/vault/portfolio/${portfolio.portfolio_id}`)}
      className={cardClasses}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2 }}
    >
      {/* Shimmer Effect for Premium Styles */}
      {visuals.showShimmer && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      )}
      
      {/* Icon Badge with style-specific color */}
      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 ${ICON_VARIANTS[visuals.iconVariant]}`}>
        <ShieldCheck className="w-6 h-6" weight="duotone" />
      </div>
      
      {/* Portfolio Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-white font-medium">{portfolio.name}</p>
          {isDefault && (
            <span className={`
              px-2 py-0.5 text-[10px] font-semibold rounded-full shrink-0 border uppercase tracking-wide
              ${visuals.chipBg} ${visuals.chipText} ${visuals.chipBorder}
            `}>
              Default
            </span>
          )}
          {/* Premium style indicator */}
          {AccentIcon && (
            <AccentIcon className={`w-4 h-4 ${visuals.chipText}`} weight="fill" />
          )}
        </div>
        <p className="text-white/40 text-sm truncate mt-0.5">
          {portfolio.description || 'No description'}
        </p>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden md:inline text-white/30 text-xs">
          {new Date(portfolio.created_at).toLocaleDateString()}
        </span>
        
        {/* Set as Default Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            isDefault ? onClearDefault?.(e) : onSetDefault?.(portfolio.portfolio_id, e);
          }}
          className={`p-2 rounded-lg transition-colors ${
            isDefault 
              ? `${visuals.chipText} hover:opacity-70` 
              : 'text-white/30 hover:text-vault-gold hover:bg-white/5'
          }`}
          title={isDefault ? 'Remove as default' : 'Set as default portfolio'}
        >
          <Star className="w-4 h-4" weight={isDefault ? 'fill' : 'regular'} />
        </button>
        
        {/* Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              onClick={e => e.stopPropagation()}
              className="p-2 text-white/30 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <DotsThreeVertical className="w-5 h-5" weight="bold" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-vault-navy border-white/10 min-w-[180px]">
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onCustomize?.(portfolio);
              }}
              className="text-vault-gold hover:text-vault-gold focus:text-vault-gold cursor-pointer"
            >
              <PaintBrush className="w-4 h-4 mr-2" weight="duotone" />
              Customize Style
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                isDefault ? onClearDefault?.(e) : onSetDefault?.(portfolio.portfolio_id, e);
              }}
              className="text-white/70 hover:text-white focus:text-white cursor-pointer"
            >
              <Star className="w-4 h-4 mr-2" weight={isDefault ? 'fill' : 'regular'} /> 
              {isDefault ? 'Remove Default' : 'Set as Default'}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(portfolio, e);
              }}
              className="text-white/70 hover:text-white focus:text-white cursor-pointer"
            >
              <PencilSimple className="w-4 h-4 mr-2" weight="duotone" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(portfolio);
              }}
              className="text-red-400 hover:text-red-300 focus:text-red-300 cursor-pointer"
            >
              <Trash className="w-4 h-4 mr-2" weight="duotone" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-vault-gold transition-colors" weight="bold" />
      </div>
    </motion.div>
  );
}
