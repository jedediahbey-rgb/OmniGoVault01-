import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

/**
 * AppLoader - Full-screen loading overlay with Matrix-style background
 * and entitlement-aware messaging
 */

// Matrix Rain Canvas Component
const MatrixRain = () => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Matrix characters - mix of numbers, letters, and symbols
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?~`αβγδεζηθικλμνξοπρστυφχψω';
    const charArray = chars.split('');
    
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    
    // Array to track y position of each column
    const drops = Array(columns).fill(1);
    
    // Gold/amber color for our vault theme
    const matrixColor = 'rgba(198, 168, 124, '; // vault-gold base
    
    const draw = () => {
      // Semi-transparent black to create fade effect
      ctx.fillStyle = 'rgba(10, 17, 40, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.font = `${fontSize}px monospace`;
      
      for (let i = 0; i < drops.length; i++) {
        // Random character
        const char = charArray[Math.floor(Math.random() * charArray.length)];
        
        // Varying opacity for depth effect
        const opacity = Math.random() * 0.5 + 0.1;
        ctx.fillStyle = matrixColor + opacity + ')';
        
        // Draw character
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        
        // Reset drop to top randomly after reaching bottom
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        
        drops[i]++;
      }
    };
    
    const interval = setInterval(draw, 50);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 opacity-70"
      style={{ background: 'transparent' }}
    />
  );
};

const AppLoader = ({ 
  isLoading = true, 
  entitlements = null, 
  planName = null,
  planTier = null,
  minDisplayTime = 3500 // Increased significantly to allow reading Matrix effects
}) => {
  const [progress, setProgress] = useState(0);
  const [canDismiss, setCanDismiss] = useState(false);
  const [phase, setPhase] = useState('booting'); // booting | entitled | ready

  // Progress simulation - much slower for Matrix effect visibility
  useEffect(() => {
    if (!isLoading) {
      // Don't immediately jump to 100 - let the animation play
      return;
    }

    const intervals = [
      { target: 15, duration: 600 },
      { target: 30, duration: 700 },
      { target: 45, duration: 600 },
      { target: 60, duration: 700 },
      { target: 75, duration: 600 },
      { target: 85, duration: 500 },
    ];

    let currentIndex = 0;
    const runProgress = () => {
      if (currentIndex >= intervals.length) return;
      
      const { target, duration } = intervals[currentIndex];
      setTimeout(() => {
        setProgress(target);
        currentIndex++;
        runProgress();
      }, duration);
    };

    runProgress();
  }, [isLoading]);

  // Phase management with longer delay for readability
  useEffect(() => {
    if (entitlements && phase === 'booting') {
      // Much longer delay to let Matrix effects be seen
      setTimeout(() => {
        setPhase('entitled');
        setProgress(90);
      }, 1500);
    }
  }, [entitlements, phase]);

  // Minimum display time
  useEffect(() => {
    const timer = setTimeout(() => {
      setCanDismiss(true);
    }, minDisplayTime);
    return () => clearTimeout(timer);
  }, [minDisplayTime]);

  // Complete loading - phase becomes 'ready' when data loaded and min time passed
  useEffect(() => {
    if (!isLoading && canDismiss && phase === 'entitled') {
      setProgress(100);
      // Longer delay to show 100% progress and let user read the entitlement message
      const timer = setTimeout(() => {
        setPhase('ready');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isLoading, canDismiss, phase]);

  // Handle case where entitlements haven't loaded yet but we're past min time
  useEffect(() => {
    if (!isLoading && canDismiss && phase === 'booting') {
      // If we're still booting but loading is done, give more time
      setTimeout(() => {
        setPhase('entitled');
      }, 500);
    }
  }, [isLoading, canDismiss, phase]);

  // Generate entitlement-aware copy with Network theme
  const statusCopy = useMemo(() => {
    if (phase === 'booting') {
      return {
        primary: 'Jacking into the Network',
        secondary: 'Establishing secure connection...'
      };
    }

    if (phase === 'entitled' || phase === 'ready') {
      const vaultsMax = entitlements?.['vaults.max'] ?? 1;
      const membersMax = entitlements?.['teamMembers.max'] ?? 1;
      const analyticsEnabled = entitlements?.['features.analytics.enabled'] ?? false;
      const apiEnabled = entitlements?.['features.api.enabled'] ?? false;
      const isUnlimited = vaultsMax === -1;

      // Tier-specific messaging with Matrix theme
      if (planTier === 3) { // Enterprise
        return {
          primary: 'Matrix System Online',
          secondary: `Full clearance granted · Unlimited trust capacity${analyticsEnabled ? ' · Analytics active' : ''}`
        };
      }

      if (planTier === 2) { // Pro
        const features = [];
        if (analyticsEnabled) features.push('Analytics');
        if (apiEnabled) features.push('API');
        return {
          primary: 'Matrix System Online',
          secondary: `${vaultsMax} vaults · ${membersMax} operators${features.length ? ' · ' + features.join(', ') + ' active' : ''}`
        };
      }

      if (planTier === 1) { // Starter
        return {
          primary: 'Matrix System Online',
          secondary: `${vaultsMax} vaults · ${membersMax} operators connected`
        };
      }

      // Free tier
      return {
        primary: 'Matrix System Online',
        secondary: `${vaultsMax} vault · Solo operator mode`
      };
    }

    return { primary: 'Connecting', secondary: null };
  }, [phase, entitlements, planTier]);

  const shouldShow = isLoading || !canDismiss || phase !== 'ready';

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.0, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-vault-navy"
        >
          {/* Matrix Rain Background - More visible */}
          <MatrixRain />
          
          {/* Lighter gradient overlay - allows more Matrix visibility */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(10, 17, 40, 0.3) 0%, rgba(10, 17, 40, 0.75) 60%, rgba(10, 17, 40, 0.9) 100%)'
            }}
          />

          {/* Scanline effect */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(198, 168, 124, 0.15) 2px, rgba(198, 168, 124, 0.15) 4px)'
            }}
          />

          {/* Content - Fixed size container to prevent layout shift */}
          <div 
            className="relative z-10 flex flex-col items-center justify-between px-8 py-8 rounded-2xl bg-vault-navy/60 backdrop-blur-sm border border-vault-gold/10"
            style={{ width: '300px', height: '320px', minHeight: '320px', maxHeight: '320px' }}
          >
            {/* Logo / Wordmark */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col items-center gap-3"
            >
              <span className="text-xl font-heading text-vault-gold tracking-[0.3em] font-bold">
                OMNIGOVAULT
              </span>
              {/* Jack In Icon - positioned under OMNIGOVAULT */}
              <div className="w-12 h-12 rounded-lg bg-vault-gold/10 border border-vault-gold/40 flex items-center justify-center relative">
                {/* Matrix Jack/Plug Icon */}
                <svg 
                  viewBox="0 0 24 24" 
                  className="w-7 h-7 text-vault-gold"
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {/* Main connector body */}
                  <rect x="7" y="2" width="10" height="8" rx="1" />
                  {/* Prongs */}
                  <line x1="10" y1="10" x2="10" y2="14" />
                  <line x1="14" y1="10" x2="14" y2="14" />
                  {/* Base plate */}
                  <rect x="6" y="14" width="12" height="3" rx="0.5" />
                  {/* Connection lines going down */}
                  <line x1="9" y1="17" x2="9" y2="22" />
                  <line x1="12" y1="17" x2="12" y2="20" />
                  <line x1="15" y1="17" x2="15" y2="22" />
                </svg>
                {/* Pulse effect when loading */}
                {phase === 'booting' && (
                  <motion.div
                    className="absolute inset-0 rounded-lg border-2 border-vault-gold/50"
                    animate={{ 
                      scale: [1, 1.3, 1],
                      opacity: [0.6, 0, 0.6]
                    }}
                    transition={{ 
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                )}
              </div>
            </motion.div>

            {/* Status Text - Larger and more prominent - Fixed height to prevent layout shift */}
            <div className="flex flex-col items-center gap-3 h-[80px] mt-2 justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={statusCopy.primary}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                  className="text-center"
                >
                  <p className="text-vault-light text-lg font-medium tracking-wider">
                    {statusCopy.primary}
                  </p>
                  {statusCopy.secondary && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="text-vault-muted text-sm mt-2 tracking-wide"
                    >
                      {statusCopy.secondary}
                    </motion.p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Progress Bar - Wider */}
            <div className="w-64 h-[3px] bg-vault-gold/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-vault-gold/40 via-vault-gold to-vault-gold/40 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ 
                  duration: 0.5, 
                  ease: 'easeOut'
                }}
              />
            </div>

            {/* Plan Badge - Always reserve space to prevent layout shift */}
            <div className="h-[28px] flex items-center justify-center">
              <AnimatePresence>
                {planName && phase !== 'booting' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4 }}
                    className={cn(
                      'px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase',
                      planTier === 3 && 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
                      planTier === 2 && 'bg-vault-gold/20 text-vault-gold border border-vault-gold/30',
                      planTier === 1 && 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
                      planTier === 0 && 'bg-white/10 text-vault-muted border border-white/20'
                    )}
                  >
                    {planName}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppLoader;
