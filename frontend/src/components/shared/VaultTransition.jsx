/**
 * VaultTransition - Secure vault door transition effect
 * 
 * Creates an immersive "entering a secure vault" experience
 * with golden shimmer, door animations, and lock effects
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import React, { useState, useEffect, useMemo } from 'react';
import { Lock, LockOpen, ShieldCheck, Vault } from '@phosphor-icons/react';

// Vault door opening animation variants
const vaultDoorVariants = {
  closed: {
    scaleX: 1,
    opacity: 1,
  },
  opening: {
    scaleX: 0,
    opacity: 0,
    transition: {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

// Gold shimmer overlay
const shimmerVariants = {
  initial: {
    opacity: 0,
    background: 'linear-gradient(90deg, transparent 0%, rgba(198, 168, 124, 0) 40%, rgba(198, 168, 124, 0.3) 50%, rgba(198, 168, 124, 0) 60%, transparent 100%)',
    backgroundSize: '200% 100%',
    backgroundPosition: '200% 0',
  },
  animate: {
    opacity: [0, 1, 1, 0],
    backgroundPosition: ['-100% 0', '200% 0'],
    transition: {
      duration: 0.8,
      ease: 'easeInOut',
    },
  },
};

// Lock icon animation
const lockVariants = {
  locked: {
    scale: 1,
    rotate: 0,
  },
  unlocking: {
    scale: [1, 1.2, 1],
    rotate: [0, -10, 10, 0],
    transition: {
      duration: 0.4,
    },
  },
};

// Page content fade in
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    filter: 'blur(10px)',
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.5,
      delay: 0.2,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    filter: 'blur(5px)',
    transition: {
      duration: 0.3,
    },
  },
};

// Gold particles effect
const GoldParticles = () => {
  // Pre-generate stable random values to avoid impure function calls during render
  const particleData = React.useMemo(() => 
    [...Array(12)].map(() => ({
      initialX: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
      duration: 1.5 + Math.random() * 0.5,
      delay: Math.random() * 0.3,
      leftPercent: 10 + Math.random() * 80,
    })), []
  );
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particleData.map((particle, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-vault-gold"
          initial={{
            x: particle.initialX,
            y: typeof window !== 'undefined' ? window.innerHeight + 10 : 810,
            opacity: 0,
          }}
          animate={{
            y: -10,
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: 'easeOut',
          }}
          style={{
            left: `${particle.leftPercent}%`,
          }}
        />
      ))}
    </div>
  );
};

// Vault door visual
const VaultDoor = ({ isOpening }) => {
  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-vault-dark"
      initial="closed"
      animate={isOpening ? 'opening' : 'closed'}
      variants={vaultDoorVariants}
    >
      {/* Door pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-vault-navy via-vault-dark to-black">
        {/* Vault texture lines */}
        <div className="absolute inset-0 opacity-10">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute h-px bg-vault-gold/30"
              style={{
                top: `${(i + 1) * 5}%`,
                left: 0,
                right: 0,
              }}
            />
          ))}
        </div>
        
        {/* Center emblem */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="relative"
            variants={lockVariants}
            initial="locked"
            animate={isOpening ? 'unlocking' : 'locked'}
          >
            {/* Outer ring */}
            <motion.div
              className="w-32 h-32 rounded-full border-4 border-vault-gold/40 flex items-center justify-center"
              animate={{
                boxShadow: isOpening
                  ? '0 0 60px rgba(198, 168, 124, 0.6), inset 0 0 30px rgba(198, 168, 124, 0.2)'
                  : '0 0 20px rgba(198, 168, 124, 0.2)',
              }}
            >
              {/* Inner circle */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-vault-gold/20 to-transparent flex items-center justify-center">
                {isOpening ? (
                  <LockOpen className="w-12 h-12 text-vault-gold" weight="duotone" />
                ) : (
                  <Lock className="w-12 h-12 text-vault-gold" weight="duotone" />
                )}
              </div>
            </motion.div>
            
            {/* Rotating ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-dashed border-vault-gold/20"
              animate={{
                rotate: isOpening ? 180 : 0,
              }}
              transition={{ duration: 0.6 }}
            />
          </motion.div>
        </div>
      </div>
      
      {/* Gold shimmer sweep */}
      <motion.div
        className="absolute inset-0"
        variants={shimmerVariants}
        initial="initial"
        animate={isOpening ? 'animate' : 'initial'}
      />
      
      {/* Particles */}
      {isOpening && <GoldParticles />}
    </motion.div>
  );
};

/**
 * VaultPageTransition - Wraps page content with vault transition effect
 */
export function VaultPageTransition({ children }) {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showContent, setShowContent] = useState(true);

  useEffect(() => {
    // Don't animate on initial load
    if (location.key === 'default') return;

    setIsTransitioning(true);
    setShowContent(false);

    // Show vault door briefly then reveal content
    const timer = setTimeout(() => {
      setShowContent(true);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 600);
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <>
      <AnimatePresence mode="wait">
        {isTransitioning && <VaultDoor isOpening={showContent} />}
      </AnimatePresence>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="min-h-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

/**
 * VaultShimmer - Subtle gold shimmer effect for page loads
 * Use this for lighter transitions between related pages
 */
export function VaultShimmer({ children, className = '' }) {
  const location = useLocation();

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: 1,
        transition: { duration: 0.3 }
      }}
      exit={{ opacity: 0 }}
      className={className}
    >
      {/* Shimmer overlay on enter */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-50"
        initial={{
          background: 'linear-gradient(90deg, transparent, rgba(198, 168, 124, 0.1), transparent)',
          x: '-100%',
        }}
        animate={{
          x: '100%',
        }}
        transition={{
          duration: 0.6,
          ease: 'easeInOut',
        }}
      />
      {children}
    </motion.div>
  );
}

/**
 * VaultUnlockEffect - Quick unlock effect for entering vault sections
 */
export function VaultUnlockEffect({ show, onComplete }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onAnimationComplete={onComplete}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: [0.8, 1.1, 1],
              opacity: 1,
            }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 20px rgba(198, 168, 124, 0.3)',
                  '0 0 60px rgba(198, 168, 124, 0.6)',
                  '0 0 20px rgba(198, 168, 124, 0.3)',
                ],
              }}
              transition={{ duration: 1, repeat: 1 }}
              className="w-20 h-20 rounded-full bg-vault-gold/10 border-2 border-vault-gold flex items-center justify-center"
            >
              <Vault className="w-10 h-10 text-vault-gold" weight="duotone" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-vault-gold font-heading text-lg"
            >
              Accessing Vault...
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default VaultPageTransition;
