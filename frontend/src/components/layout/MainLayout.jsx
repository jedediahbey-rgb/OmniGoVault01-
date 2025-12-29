import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Vault,
  X,
  Key,
  SignOut,
  User,
  Gear
} from '@phosphor-icons/react';
import Sidebar from './Sidebar';
import { pageTransition } from '../../lib/motion';
import { useBilling } from '../../contexts/BillingContext';
import NotificationBell from '../notifications/NotificationBell';

// Set theme color for browser chrome
const setThemeColor = (color) => {
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', color);
  }
};

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
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const scrollContainerRef = useRef(null);
  const userMenuRef = useRef(null);
  
  // Get user's subscription tier for logout screen
  const { subscription } = useBilling();
  const userTier = subscription?.plan_name || 'Free';

  // Set theme color on mount to match app background
  useEffect(() => {
    setThemeColor('#0B1221');
  }, []);

  // Reset scroll to top on route change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo(0, 0);
    }
    // Also reset window scroll for any edge cases
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#05080F]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Menu Toggle - Left */}
            <div className="w-10">
              <VaultToggle 
                isOpen={sidebarOpen} 
                onClick={() => setSidebarOpen(!sidebarOpen)} 
              />
            </div>
            
            {/* Logo - Centered - Links to landing page - MATCHES landing page exactly */}
            <Link to="/" className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
              <Key className="w-5 h-5 text-[#C6A87C] shrink-0" weight="duotone" />
              <span className="text-sm sm:text-base font-medium text-white whitespace-nowrap">Private Equity & Trusts</span>
            </Link>
            
            {/* User Menu - Right */}
            <div className="flex items-center gap-2" ref={userMenuRef}>
              {user && (
                <>
                  {/* Notification Bell */}
                  <NotificationBell />
                  
                  {/* User Avatar Button */}
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="w-8 h-8 rounded-full overflow-hidden border border-[#C6A87C]/30 hover:border-[#C6A87C]/60 transition-colors"
                    >
                      {user.picture ? (
                        <img 
                          src={user.picture} 
                          alt={user.name || 'User'} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#C6A87C]/20 flex items-center justify-center">
                          <span className="text-[#C6A87C] text-sm font-medium">
                            {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </button>
                  
                    {/* Dropdown Menu */}
                    <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-12 w-48 bg-[#0B1221] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
                      >
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-white/10">
                          <p className="text-sm text-white font-medium truncate">{user.name}</p>
                          <p className="text-xs text-white/40 truncate">{user.email}</p>
                        </div>
                        
                        {/* Menu Items */}
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setUserMenuOpen(false);
                              window.location.href = '/settings';
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                          >
                            <Gear className="w-4 h-4" weight="duotone" />
                            Settings
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setUserMenuOpen(false);
                              onLogout(userTier);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors text-left"
                          >
                            <SignOut className="w-4 h-4" weight="duotone" />
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  </div>
                </>
              )}
            </div>
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
