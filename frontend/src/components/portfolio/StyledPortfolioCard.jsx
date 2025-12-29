import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Star, 
  DotsThreeVertical, 
  PencilSimple, 
  Trash,
  ArrowRight,
  PaintBrush,
  Sparkle
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
  const style = getStyleById(styleId);
  const { card, chip, effects } = style;
  
  // Combine card classes based on default state
  const cardClasses = `
    flex-1 flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer group min-h-[60px] relative overflow-hidden
    ${isDefault ? card.default : card.base}
    ${!isDefault ? card.hover : ''}
    ${effects.glow ? effects.glowColor : ''}
  `;
  
  return (
    <motion.div
      onClick={() => navigate(`/vault/portfolio/${portfolio.portfolio_id}`)}
      className={cardClasses}
      whileHover={{ scale: 1.005 }}
      transition={{ duration: 0.2 }}
    >
      {/* Shimmer Effect for Premium Styles */}
      {effects.shimmer && (
        <div 
          className={`absolute inset-0 shimmer-effect ${effects.shimmerColor || 'via-white/10'} pointer-events-none`}
        />
      )}
      
      {/* Icon Badge */}
      <IconBadge icon={ShieldCheck} size="lg" variant="gold" />
      
      {/* Portfolio Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-white font-medium text-sm">{portfolio.name}</p>
          {isDefault && (
            <span className={`
              px-2 py-0.5 text-[10px] font-medium rounded-full shrink-0 border
              ${chip.base} ${chip.border}
            `}>
              Default
            </span>
          )}
          {/* Style indicator for premium styles */}
          {effects.shimmer && (
            <Sparkle className="w-3 h-3 text-amber-400" weight="fill" />
          )}
        </div>
        <p className="text-white/40 text-xs truncate">
          {portfolio.description || 'No description'}
        </p>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <span className="hidden sm:inline text-white/30 text-xs">
          {new Date(portfolio.created_at).toLocaleDateString()}
        </span>
        
        {/* Set as Default Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            isDefault ? onClearDefault?.(e) : onSetDefault?.(portfolio.portfolio_id, e);
          }}
          className={`p-2 rounded transition-colors ${
            isDefault 
              ? 'text-vault-gold hover:text-vault-gold/70' 
              : 'text-white/30 hover:text-vault-gold'
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
              className="p-1.5 text-white/30 hover:text-white hover:bg-white/10 rounded"
            >
              <DotsThreeVertical className="w-4 h-4" weight="duotone" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-vault-navy border-white/10">
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onCustomize?.(portfolio);
              }}
              className="text-vault-gold hover:text-vault-gold focus:text-vault-gold"
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
              className="text-white/70 hover:text-white focus:text-white"
            >
              <Star className="w-4 h-4 mr-2" weight={isDefault ? 'fill' : 'regular'} /> 
              {isDefault ? 'Remove Default' : 'Set as Default'}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(portfolio, e);
              }}
              className="text-white/70 hover:text-white focus:text-white"
            >
              <PencilSimple className="w-4 h-4 mr-2" weight="duotone" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(portfolio);
              }}
              className="text-red-400 hover:text-red-300 focus:text-red-300"
            >
              <Trash className="w-4 h-4 mr-2" weight="duotone" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-vault-gold transition-colors" weight="duotone" />
      </div>
    </motion.div>
  );
}
