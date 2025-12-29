/**
 * Portfolio Decorative Styling System
 * 
 * This configuration defines the visual themes available for portfolio cards.
 * Styles are gated by subscription tier.
 */

// Tier hierarchy (lower number = lower tier)
const TIER_LEVELS = {
  'Free': 0,
  'Testamentary': 1,
  'Revocable': 2,
  'Irrevocable': 3,
  'Dynasty': 4
};

/**
 * Check if a user's tier can access a style
 */
export const canAccessStyle = (userTier, styleTiers) => {
  const userLevel = TIER_LEVELS[userTier] ?? 0;
  return styleTiers.some(tier => TIER_LEVELS[tier] <= userLevel);
};

/**
 * Get the minimum tier required for a style
 */
export const getMinimumTier = (styleTiers) => {
  let minTier = 'Dynasty';
  let minLevel = 4;
  
  styleTiers.forEach(tier => {
    const level = TIER_LEVELS[tier] ?? 4;
    if (level < minLevel) {
      minLevel = level;
      minTier = tier;
    }
  });
  
  return minTier;
};

/**
 * Portfolio Style Presets
 * Each style includes:
 * - name: Display name
 * - description: Short description
 * - tiers: Array of subscription tiers that can access this style
 * - card: Tailwind classes for the portfolio card
 * - chip: Tailwind classes for the MonoChip/badge
 * - icon: Optional icon customization
 * - effects: Special effects (shimmer, glow, etc.)
 */
export const PORTFOLIO_STYLES = {
  standard: {
    id: 'standard',
    name: 'Standard',
    description: 'Clean and minimal design',
    tiers: ['Free', 'Testamentary', 'Revocable', 'Irrevocable', 'Dynasty'],
    card: {
      base: 'border-white/5 bg-transparent',
      hover: 'hover:border-vault-gold/30 hover:bg-vault-gold/5',
      default: 'border-vault-gold/40 bg-vault-gold/5 hover:bg-vault-gold/10'
    },
    chip: {
      base: 'bg-vault-gold/20 text-vault-gold',
      border: 'border-vault-gold/30'
    },
    effects: {
      shimmer: false,
      glow: false,
      animation: null
    },
    preview: {
      gradient: 'from-slate-800/50 to-slate-900/50',
      accent: '#C6A87C'
    }
  },
  
  ledger: {
    id: 'ledger',
    name: 'Ledger',
    description: 'Subtle borders with understated elegance',
    tiers: ['Free', 'Testamentary', 'Revocable', 'Irrevocable', 'Dynasty'],
    card: {
      base: 'border-white/10 bg-gradient-to-br from-slate-900/30 to-slate-800/20',
      hover: 'hover:border-white/20 hover:from-slate-800/40 hover:to-slate-700/30',
      default: 'border-vault-gold/30 bg-gradient-to-br from-vault-gold/5 to-amber-900/10'
    },
    chip: {
      base: 'bg-slate-700/50 text-white/80',
      border: 'border-slate-600/50'
    },
    effects: {
      shimmer: false,
      glow: false,
      animation: null
    },
    preview: {
      gradient: 'from-slate-700/50 to-slate-800/50',
      accent: '#94A3B8'
    }
  },
  
  familyOffice: {
    id: 'familyOffice',
    name: 'Family Office',
    description: 'Refined frame with soft gradient',
    tiers: ['Revocable', 'Irrevocable', 'Dynasty'],
    card: {
      base: 'border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-slate-900/40',
      hover: 'hover:border-emerald-400/40 hover:from-emerald-900/30 hover:to-slate-800/50',
      default: 'border-emerald-400/50 bg-gradient-to-br from-emerald-900/30 to-emerald-950/40'
    },
    chip: {
      base: 'bg-emerald-500/20 text-emerald-400',
      border: 'border-emerald-500/30'
    },
    effects: {
      shimmer: false,
      glow: true,
      glowColor: 'shadow-emerald-500/10',
      animation: null
    },
    preview: {
      gradient: 'from-emerald-900/40 to-emerald-950/60',
      accent: '#10B981'
    }
  },
  
  privateVault: {
    id: 'privateVault',
    name: 'Private Vault',
    description: 'Dark, high-contrast with engraved borders',
    tiers: ['Irrevocable', 'Dynasty'],
    card: {
      base: 'border-slate-600/40 bg-gradient-to-br from-slate-950/80 to-zinc-900/60 shadow-inner',
      hover: 'hover:border-slate-500/50 hover:from-slate-900/90 hover:to-zinc-800/70',
      default: 'border-slate-500/60 bg-gradient-to-br from-slate-900/90 to-zinc-900/80 shadow-lg shadow-black/30'
    },
    chip: {
      base: 'bg-slate-600/40 text-slate-300',
      border: 'border-slate-500/50 shadow-inner'
    },
    effects: {
      shimmer: false,
      glow: false,
      animation: 'border-pulse'
    },
    preview: {
      gradient: 'from-slate-900/80 to-zinc-900/90',
      accent: '#64748B'
    }
  },
  
  dynasty: {
    id: 'dynasty',
    name: 'Dynasty',
    description: 'Rich gold accents with embossed elegance',
    tiers: ['Dynasty'],
    card: {
      base: 'border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-yellow-950/20 to-orange-950/30',
      hover: 'hover:border-amber-400/50 hover:from-amber-900/40 hover:via-yellow-900/30 hover:to-orange-900/40',
      default: 'border-amber-400/60 bg-gradient-to-br from-amber-900/50 via-yellow-900/40 to-orange-900/50 shadow-lg shadow-amber-500/10'
    },
    chip: {
      base: 'bg-gradient-to-r from-amber-500/30 to-yellow-500/20 text-amber-300',
      border: 'border-amber-400/40'
    },
    effects: {
      shimmer: true,
      shimmerColor: 'via-amber-400/20',
      glow: true,
      glowColor: 'shadow-amber-500/20',
      animation: 'gold-shimmer'
    },
    preview: {
      gradient: 'from-amber-900/50 to-yellow-950/60',
      accent: '#F59E0B'
    }
  },
  
  crownEstate: {
    id: 'crownEstate',
    name: 'Crown Estate',
    description: 'Subtle pattern texture with refined corners',
    tiers: ['Dynasty'],
    card: {
      base: 'border-purple-500/25 bg-gradient-to-br from-purple-950/25 via-indigo-950/20 to-violet-950/30 crown-pattern',
      hover: 'hover:border-purple-400/40 hover:from-purple-900/35 hover:via-indigo-900/30 hover:to-violet-900/40',
      default: 'border-purple-400/50 bg-gradient-to-br from-purple-900/40 via-indigo-900/35 to-violet-900/50 shadow-lg shadow-purple-500/10'
    },
    chip: {
      base: 'bg-gradient-to-r from-purple-500/25 to-violet-500/20 text-purple-300',
      border: 'border-purple-400/35'
    },
    effects: {
      shimmer: true,
      shimmerColor: 'via-purple-400/15',
      glow: true,
      glowColor: 'shadow-purple-500/15',
      animation: 'royal-glow'
    },
    preview: {
      gradient: 'from-purple-900/40 to-violet-950/60',
      accent: '#A855F7'
    }
  }
};

/**
 * Get all styles sorted by tier requirement
 */
export const getAllStyles = () => {
  return Object.values(PORTFOLIO_STYLES).sort((a, b) => {
    const aMin = getMinimumTier(a.tiers);
    const bMin = getMinimumTier(b.tiers);
    return (TIER_LEVELS[aMin] ?? 0) - (TIER_LEVELS[bMin] ?? 0);
  });
};

/**
 * Get accessible styles for a user's tier
 */
export const getAccessibleStyles = (userTier) => {
  return getAllStyles().filter(style => canAccessStyle(userTier, style.tiers));
};

/**
 * Get style by ID with fallback to standard
 */
export const getStyleById = (styleId) => {
  return PORTFOLIO_STYLES[styleId] || PORTFOLIO_STYLES.standard;
};

export default PORTFOLIO_STYLES;
