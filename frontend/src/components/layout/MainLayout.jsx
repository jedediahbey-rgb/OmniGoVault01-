import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, Link } from 'react-router-dom';
import {
  Vault,
  X,
  Key
} from '@phosphor-icons/react';
import Sidebar from './Sidebar';
import { pageTransition } from '../../lib/motion';

// Futuristic Vault Toggle Button
const VaultToggle = ({ isOpen, onClick }) => (
  <button
    onClick={onClick}
    className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#C6A87C]/20 to-transparent border border-[#C6A87C]/30 hover:border-[#C6A87C]/60 transition-all duration-300 group"
    aria-label={isOpen ? "Close menu" : "Open menu"}
  >
    {/* Glow effect */}
    <div className="absolute inset-0 rounded-xl bg-[#C6A87C]/10 opacity-0 group-hover:opacity-100 blur-sm transition-opacity" />
    
    {/* Animated icon */}
    <motion.div
      animate={{ 
        rotate: isOpen ? 180 : 0,
        scale: isOpen ? 0.9 : 1
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="relative z-10"
    >
      <Vault 
        className={`w-5 h-5 transition-colors duration-300 ${isOpen ? 'text-[#C6A87C]' : 'text-[#C6A87C]/70 group-hover:text-[#C6A87C]'}`}
        weight={isOpen ? "fill" : "duotone"}
      />
    </motion.div>
    
    {/* Scan line animation */}
    <motion.div
      className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
      initial={false}
    >
      <motion.div
        className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#C6A87C]/50 to-transparent"
        animate={{ 
          top: isOpen ? ['0%', '100%'] : ['100%', '0%']
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      />
    </motion.div>
  </button>
);

export default function MainLayout({ children, user, onLogout }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollContainerRef = useRef(null);

  // Reset scroll to top on route change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo(0, 0);
    }
    // Also reset window scroll for any edge cases
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-vault-navy">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-vault-navy via-vault-navy to-vault-void pointer-events-none" />
      
      {/* Subtle grid overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(198, 168, 124, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(198, 168, 124, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#05080F]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-16 relative">
            {/* Menu Toggle - Absolute left */}
            <div className="absolute left-0">
              <VaultToggle 
                isOpen={sidebarOpen} 
                onClick={() => setSidebarOpen(!sidebarOpen)} 
              />
            </div>
            
            {/* Logo - Centered - Links to landing page */}
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Key className="w-5 h-5 text-vault-gold" weight="fill" />
              <span className="text-base font-medium text-white">Private Equity & Trusts</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 z-40"
          />
        )}
      </AnimatePresence>
      
      {/* Sidebar - drawer on mobile, fixed on desktop */}
      <Sidebar 
        user={user} 
        onLogout={onLogout} 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      {/* Main Content */}
      <main className="lg:ml-64 flex-1 min-h-0 relative pt-14 lg:pt-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            ref={scrollContainerRef}
            data-scroll-container="true"
            initial={pageTransition.initial}
            animate={pageTransition.animate}
            exit={pageTransition.exit}
            transition={pageTransition.transition}
            className="h-full min-w-0 w-full max-w-full overflow-y-auto overflow-x-hidden"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
