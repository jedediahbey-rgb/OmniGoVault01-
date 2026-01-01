/**
 * Black Archive Page - Premium Research Vault
 * 
 * Refactored into modular components in /components/archive/
 * This file contains only the main page layout and composition.
 */
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkle } from '@phosphor-icons/react';

// Import all archive components from the barrel export
import {
  TABS,
  BlackArchiveIcon,
  FloatingParticles,
  MobileSegmentedTabs,
  DesktopPremiumTab,
  IndexTab,
  TrailsTab,
  ClaimsTab,
  ReadingRoomTab,
  ArchiveMapTab,
} from '../components/archive';

export default function BlackArchivePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'index';
  
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };
  
  return (
    <div 
      className="min-h-screen relative w-full"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      {/* Premium Header with Obsidian Glass Effect */}
      <div className="relative bg-[#030508]/80 sm:backdrop-blur-xl border-b border-vault-gold/10 overflow-hidden">
        {/* Animated background gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-vault-gold/[0.08] via-transparent to-purple-900/[0.1]" />
          
          {/* Animated gold orb */}
          <motion.div 
            className="absolute -top-10 -left-10 w-40 sm:w-72 md:w-96 h-40 sm:h-72 md:h-96 rounded-full will-change-transform"
            style={{
              background: 'radial-gradient(circle, rgba(198, 168, 124, 0.15) 0%, rgba(198, 168, 124, 0.05) 40%, transparent 70%)',
            }}
            animate={{ opacity: [0.6, 0.8, 0.6] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          
          {/* Purple orb - hidden on mobile */}
          <motion.div 
            className="hidden sm:block absolute -bottom-10 -right-10 w-48 md:w-64 h-48 md:h-64 rounded-full will-change-transform"
            style={{
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.04) 40%, transparent 70%)',
            }}
            animate={{ opacity: [0.5, 0.7, 0.5] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        
        {/* Floating particles */}
        <FloatingParticles />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(198, 168, 124, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(198, 168, 124, 0.5) 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }}
        />
        
        {/* Specular highlight */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-vault-gold/20 to-transparent" />
        
        {/* Header Content */}
        <div className="relative w-full max-w-6xl mx-auto px-4 pt-6 pb-5 sm:py-8 lg:py-10">
          {/* Title section */}
          <motion.div 
            className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left gap-4 sm:gap-6 mb-6 sm:mb-8"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="shrink-0">
              <BlackArchiveIcon size="lg" animate={true} />
            </div>
            
            <div className="flex-1 min-w-0">
              {/* Premium badge */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-vault-gold/10 border border-vault-gold/20 text-vault-gold text-[10px] sm:text-xs font-medium mb-2 sm:mb-3">
                  <Sparkle className="w-2.5 sm:w-3 h-2.5 sm:h-3" weight="fill" />
                  Premium Research Vault
                </span>
              </motion.div>
              
              {/* Title */}
              <motion.h1 
                className="text-white font-heading mb-1 sm:mb-2"
                style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)', lineHeight: 1.1 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-vault-gold/90 to-white">
                  The Black Archive
                </span>
              </motion.h1>
              
              {/* Subtitle */}
              <motion.p 
                className="text-white/45 text-xs sm:text-sm max-w-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
              >
                Primary sources. Doctrine trails. Citation-first learning.
              </motion.p>
            </div>
            
            {/* Admin Link */}
            <motion.a
              href="/archive/admin"
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-vault-gold/10 border border-vault-gold/20 hover:bg-vault-gold/20 transition-colors text-vault-gold text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Admin
            </motion.a>
          </motion.div>
          
          {/* Tabs - Mobile vs Desktop */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            {/* Mobile: Segmented control + chips */}
            <div className="block sm:hidden">
              <MobileSegmentedTabs
                tabs={TABS}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>
            
            {/* Desktop: Horizontal premium tabs */}
            <div className="hidden sm:flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {TABS.map((tab, index) => (
                <motion.div
                  key={tab.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + index * 0.05 }}
                >
                  <DesktopPremiumTab
                    tab={tab}
                    isActive={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
        
        {/* Bottom decorative line */}
        <motion.div 
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent 5%, rgba(198, 168, 124, 0.4) 50%, transparent 95%)'
          }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      </div>
      
      {/* Content Area - Tabs stay mounted to prevent reload flash */}
      <div className="w-full max-w-6xl mx-auto px-4 py-5 sm:py-8">
        <div className={activeTab === 'index' ? 'block' : 'hidden'}>
          <IndexTab />
        </div>
        <div className={activeTab === 'trails' ? 'block' : 'hidden'}>
          <TrailsTab />
        </div>
        <div className={activeTab === 'claims' ? 'block' : 'hidden'}>
          <ClaimsTab />
        </div>
        <div className={activeTab === 'map' ? 'block' : 'hidden'}>
          <ArchiveMapTab />
        </div>
        <div className={activeTab === 'reading' ? 'block' : 'hidden'}>
          <ReadingRoomTab />
        </div>
      </div>
    </div>
  );
}
