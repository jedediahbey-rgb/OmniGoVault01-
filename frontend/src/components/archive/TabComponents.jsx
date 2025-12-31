import { useState, useMemo, memo } from 'react';
import { motion } from 'framer-motion';

export const MobileSegmentedTabs = memo(({ tabs, activeTab, onTabChange }) => {
  const primaryTabs = useMemo(() => tabs.slice(0, 2), [tabs]);
  const secondaryTabs = useMemo(() => tabs.slice(2), [tabs]);
  
  return (
    <div className="space-y-3">
      {/* Primary tabs - 2-column grid */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-white/[0.03] backdrop-blur-md rounded-xl border border-white/10">
        {primaryTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center justify-center gap-2 py-3 px-3 rounded-lg text-sm font-medium transition-all overflow-hidden ${
                isActive ? 'text-black' : 'text-white/60'
              }`}
              whileTap={{ scale: 0.98 }}
              style={{ willChange: 'transform' }}
            >
              {isActive && (
                <motion.div
                  layoutId="mobileActiveTab"
                  className="absolute inset-0 bg-gradient-to-r from-vault-gold via-amber-400 to-vault-gold rounded-lg"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent rounded-lg"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                  />
                </motion.div>
              )}
              <tab.icon className="w-4 h-4 relative z-10 shrink-0" weight={isActive ? 'fill' : 'duotone'} />
              <span className="relative z-10 truncate">{tab.label}</span>
            </motion.button>
          );
        })}
      </div>
      
      {/* Secondary tabs - horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {secondaryTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center gap-2 py-2.5 px-4 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-vault-gold/20 text-vault-gold border border-vault-gold/30'
                  : 'bg-white/[0.03] text-white/50 border border-white/10 hover:bg-white/[0.06] hover:text-white/70'
              }`}
              whileTap={{ scale: 0.98 }}
            >
              <tab.icon className="w-3.5 h-3.5" weight={isActive ? 'fill' : 'duotone'} />
              <span>{tab.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});

export const DesktopPremiumTab = memo(({ tab, isActive, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.button
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`relative flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-colors overflow-hidden ${
        isActive ? 'text-black' : 'text-white/60 hover:text-white'
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {isActive && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-vault-gold via-amber-400 to-vault-gold"
          layoutId="desktopActiveTab"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}
      
      {!isActive && isHovered && (
        <motion.div
          className="absolute inset-0 bg-white/5 rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}
      
      <motion.div
        animate={isActive ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        <tab.icon className="w-4 h-4" weight={isActive ? 'fill' : 'duotone'} />
      </motion.div>
      
      <span className="relative z-10">{tab.label}</span>
      
      {!isActive && (
        <motion.div
          className="absolute inset-0 rounded-xl border border-vault-gold/0"
          animate={{ borderColor: isHovered ? 'rgba(198, 168, 124, 0.3)' : 'rgba(198, 168, 124, 0)' }}
        />
      )}
    </motion.button>
  );
});
