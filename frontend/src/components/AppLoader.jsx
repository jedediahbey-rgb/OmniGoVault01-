import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

/**
 * AppLoader - Full-screen loading overlay with entitlement-aware messaging
 * 
 * States:
 * 1. BOOTING - Initial state, no data yet
 * 2. ENTITLEMENTS_LOADED - We have user data, still initializing app
 * 3. READY - Fade out and transition to app
 * 
 * Props:
 * - isLoading: boolean - Whether to show the loader
 * - entitlements: object | null - User's entitlements from billing API
 * - planName: string | null - Current plan name
 * - planTier: number | null - Plan tier (0=Free, 1=Starter, 2=Pro, 3=Enterprise)
 * - onLoadComplete: function - Called when loader should dismiss
 */

const AppLoader = ({ 
  isLoading = true, 
  entitlements = null, 
  planName = null,
  planTier = null,
  minDisplayTime = 800 // Minimum display time to prevent flash
}) => {
  const [progress, setProgress] = useState(0);
  const [canDismiss, setCanDismiss] = useState(false);
  const [phase, setPhase] = useState('booting'); // booting | entitled | ready

  // Progress simulation
  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      return;
    }

    const intervals = [
      { target: 30, duration: 200 },
      { target: 60, duration: 400 },
      { target: 85, duration: 600 },
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

  // Phase management
  useEffect(() => {
    if (entitlements && phase === 'booting') {
      setPhase('entitled');
      setProgress(90);
    }
  }, [entitlements, phase]);

  // Minimum display time
  useEffect(() => {
    const timer = setTimeout(() => {
      setCanDismiss(true);
    }, minDisplayTime);
    return () => clearTimeout(timer);
  }, [minDisplayTime]);

  // Complete loading
  useEffect(() => {
    if (!isLoading && canDismiss) {
      setProgress(100);
      setPhase('ready');
    }
  }, [isLoading, canDismiss]);

  // Generate entitlement-aware copy with Matrix theme
  const statusCopy = useMemo(() => {
    if (phase === 'booting') {
      return {
        primary: 'Jacking into the Matrix',
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
          primary: 'Matrix Systems Online',
          secondary: `Full clearance granted · Unlimited trust capacity${analyticsEnabled ? ' · Analytics active' : ''}`
        };
      }

      if (planTier === 2) { // Pro
        const features = [];
        if (analyticsEnabled) features.push('Analytics');
        if (apiEnabled) features.push('API');
        return {
          primary: 'Matrix Systems Online',
          secondary: `${vaultsMax} vaults · ${membersMax} operators${features.length ? ' · ' + features.join(', ') + ' active' : ''}`
        };
      }

      if (planTier === 1) { // Starter
        return {
          primary: 'Matrix Systems Online',
          secondary: `${vaultsMax} vaults · ${membersMax} operators connected`
        };
      }

      // Free tier
      return {
        primary: 'Matrix Systems Online',
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
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-vault-navy"
        >
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 opacity-[0.03]">
            <div 
              className="w-full h-full"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(198, 168, 124, 0.3) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(198, 168, 124, 0.3) 1px, transparent 1px)
                `,
                backgroundSize: '60px 60px'
              }}
            />
          </div>

          {/* Radial gradient overlay */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 0%, rgba(10, 17, 40, 0.8) 70%)'
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center gap-8 px-6">
            {/* Logo / Wordmark with Matrix Jack Icon */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-vault-gold/10 border border-vault-gold/30 flex items-center justify-center relative">
                {/* Matrix Jack/Plug Icon */}
                <svg 
                  viewBox="0 0 24 24" 
                  className="w-6 h-6 text-vault-gold"
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
                    className="absolute inset-0 rounded-lg border border-vault-gold/50"
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0, 0.5]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                )}
              </div>
              <span className="text-lg font-heading text-vault-light tracking-widest font-semibold">
                OMNIGOVAULT
              </span>
            </motion.div>

            {/* Status Text */}
            <div className="flex flex-col items-center gap-2 min-h-[60px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={statusCopy.primary}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <p className="text-vault-light text-sm font-medium tracking-wide">
                    {statusCopy.primary}
                  </p>
                  {statusCopy.secondary && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.15 }}
                      className="text-vault-muted text-xs mt-1.5 tracking-wide"
                    >
                      {statusCopy.secondary}
                    </motion.p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Progress Bar */}
            <div className="w-48 h-[2px] bg-vault-gold/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-vault-gold/60 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ 
                  duration: 0.4, 
                  ease: 'easeOut'
                }}
              />
            </div>

            {/* Plan Badge (shown after entitlements load) */}
            <AnimatePresence>
              {planName && phase !== 'booting' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    'px-3 py-1 rounded-full text-[10px] font-medium tracking-wider uppercase',
                    planTier === 3 && 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
                    planTier === 2 && 'bg-vault-gold/10 text-vault-gold border border-vault-gold/20',
                    planTier === 1 && 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
                    planTier === 0 && 'bg-white/5 text-vault-muted border border-white/10'
                  )}
                >
                  {planName}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppLoader;
