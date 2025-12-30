import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

/**
 * Premium Vault Transition Component
 * 
 * A luxurious, high-end animated transition that makes users feel like
 * they're stepping into a private digital vault holding generational wealth.
 * 
 * Visual direction: Swiss private bank, family office, black card energy
 */

// Golden particle component
const GoldenParticle = ({ delay, x, y, size }) => (
  <motion.div
    className="absolute rounded-full"
    style={{
      width: size,
      height: size,
      left: `${x}%`,
      top: `${y}%`,
      background: 'radial-gradient(circle, rgba(198,168,124,0.8) 0%, rgba(198,168,124,0) 70%)',
    }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ 
      opacity: [0, 1, 1, 0],
      scale: [0, 1, 1.2, 0],
      y: [0, -30, -50, -80],
    }}
    transition={{
      duration: 2,
      delay: delay,
      ease: "easeOut",
    }}
  />
);

// Document silhouette component
const DocumentSilhouette = ({ delay, rotation, x, scale = 1 }) => (
  <motion.div
    className="absolute"
    style={{ 
      left: `${x}%`,
      transform: `rotate(${rotation}deg)`,
    }}
    initial={{ opacity: 0, y: 50, scale: 0.5 }}
    animate={{ 
      opacity: [0, 0.6, 0.4],
      y: [50, 0, -20],
      scale: [0.5, scale, scale * 0.9],
    }}
    transition={{
      duration: 1.2,
      delay: delay,
      ease: "easeOut",
    }}
  >
    <svg 
      width="40" 
      height="50" 
      viewBox="0 0 40 50" 
      fill="none"
      className="drop-shadow-lg"
    >
      {/* Document shape */}
      <path 
        d="M5 0H28L35 7V45C35 47.761 32.761 50 30 50H5C2.239 50 0 47.761 0 45V5C0 2.239 2.239 0 5 0Z" 
        fill="rgba(198,168,124,0.3)"
        stroke="rgba(198,168,124,0.6)"
        strokeWidth="1"
      />
      {/* Fold corner */}
      <path 
        d="M28 0V7H35L28 0Z" 
        fill="rgba(198,168,124,0.4)"
      />
      {/* Lines representing text */}
      <rect x="5" y="12" width="20" height="2" fill="rgba(198,168,124,0.4)" rx="1" />
      <rect x="5" y="18" width="25" height="2" fill="rgba(198,168,124,0.3)" rx="1" />
      <rect x="5" y="24" width="18" height="2" fill="rgba(198,168,124,0.3)" rx="1" />
      <rect x="5" y="30" width="22" height="2" fill="rgba(198,168,124,0.3)" rx="1" />
      {/* Seal/stamp */}
      <circle cx="25" cy="40" r="6" fill="rgba(198,168,124,0.5)" />
    </svg>
  </motion.div>
);

// Vault door component
const VaultDoor = ({ isOpening, onComplete }) => {
  const prefersReducedMotion = useReducedMotion();
  
  return (
    <div className="relative w-64 h-64 sm:w-80 sm:h-80">
      {/* Outer ring glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(198,168,124,0.3) 0%, transparent 70%)',
        }}
        animate={isOpening ? {
          scale: [1, 1.5, 2],
          opacity: [0.3, 0.5, 0],
        } : {}}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
      
      {/* Vault door outer frame */}
      <motion.div
        className="absolute inset-0 rounded-full border-4 border-[#C6A87C]/40"
        style={{
          background: 'linear-gradient(145deg, #1a1f2e 0%, #0d1117 50%, #1a1f2e 100%)',
          boxShadow: `
            0 0 60px rgba(198,168,124,0.1),
            inset 0 0 30px rgba(0,0,0,0.5),
            0 4px 20px rgba(0,0,0,0.5)
          `,
        }}
        animate={isOpening ? {
          rotateY: [0, -75],
          scale: [1, 1.1],
          x: [0, -50],
        } : {}}
        transition={{ 
          duration: 0.8, 
          delay: 0.4,
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        {/* Inner decorative rings */}
        <div className="absolute inset-4 rounded-full border border-[#C6A87C]/20" />
        <div className="absolute inset-8 rounded-full border border-[#C6A87C]/15" />
        <div className="absolute inset-12 rounded-full border border-[#C6A87C]/10" />
        
        {/* Center vault wheel */}
        <motion.div
          className="absolute inset-16 sm:inset-20 rounded-full border-2 border-[#C6A87C]/50"
          style={{
            background: 'linear-gradient(145deg, #252b3b 0%, #1a1f2e 100%)',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
          }}
          animate={isOpening ? {
            rotate: [0, 90, 180],
          } : {
            rotate: [0, 0],
          }}
          transition={{ 
            duration: 0.6, 
            ease: [0.4, 0, 0.2, 1],
          }}
        >
          {/* Wheel spokes */}
          {[0, 45, 90, 135].map((angle) => (
            <div
              key={angle}
              className="absolute w-full h-0.5 bg-[#C6A87C]/30 top-1/2 -translate-y-1/2"
              style={{ transform: `rotate(${angle}deg)` }}
            />
          ))}
          
          {/* Center emblem */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#C6A87C]/20 border border-[#C6A87C]/40 flex items-center justify-center">
              <span className="text-[#C6A87C] text-xs font-bold tracking-wider">OV</span>
            </div>
          </div>
        </motion.div>
        
        {/* Locking bolts */}
        {[30, 90, 150, 210, 270, 330].map((angle, i) => (
          <motion.div
            key={angle}
            className="absolute w-3 h-6 bg-gradient-to-b from-[#3a4152] to-[#252b3b] rounded-sm border border-[#C6A87C]/20"
            style={{
              top: '50%',
              left: '50%',
              transformOrigin: '50% -80px',
              transform: `rotate(${angle}deg) translateY(-100px)`,
            }}
            animate={isOpening ? {
              scaleY: [1, 0.3],
            } : {}}
            transition={{ 
              duration: 0.3, 
              delay: 0.1 + i * 0.05,
              ease: "easeIn",
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};

// Main VaultTransition component
const VaultTransition = ({ 
  isActive, 
  onComplete, 
  message = null,
  showWelcomeBack = false 
}) => {
  const [phase, setPhase] = useState('idle'); // idle | entering | opening | zooming | complete
  const prefersReducedMotion = useReducedMotion();
  const hasTriggeredComplete = useRef(false);
  
  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      hasTriggeredComplete.current = false;
      return;
    }
    
    // Start the animation sequence
    setPhase('entering');
    
    const timers = [];
    
    if (prefersReducedMotion) {
      // Reduced motion: quick fade
      timers.push(setTimeout(() => setPhase('complete'), 500));
      timers.push(setTimeout(() => {
        if (!hasTriggeredComplete.current) {
          hasTriggeredComplete.current = true;
          onComplete?.();
        }
      }, 600));
    } else {
      // Full animation sequence
      timers.push(setTimeout(() => setPhase('opening'), 400));
      timers.push(setTimeout(() => setPhase('zooming'), 1200));
      timers.push(setTimeout(() => setPhase('complete'), 1600));
      timers.push(setTimeout(() => {
        if (!hasTriggeredComplete.current) {
          hasTriggeredComplete.current = true;
          onComplete?.();
        }
      }, 1800));
    }
    
    return () => timers.forEach(clearTimeout);
  }, [isActive, onComplete, prefersReducedMotion]);

  // Generate particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: 30 + Math.random() * 40,
    y: 40 + Math.random() * 30,
    size: 2 + Math.random() * 4,
    delay: 0.8 + Math.random() * 0.6,
  }));

  // Generate document silhouettes
  const documents = [
    { x: 25, rotation: -15, delay: 0.9, scale: 0.8 },
    { x: 45, rotation: 5, delay: 1.0, scale: 1 },
    { x: 65, rotation: 12, delay: 1.1, scale: 0.9 },
  ];

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Background overlay */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, #05080F 0%, #0a0f1a 50%, #05080F 100%)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
          
          {/* Ambient glow behind vault */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            animate={phase === 'opening' || phase === 'zooming' ? {
              opacity: [0, 0.8, 1],
            } : { opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div 
              className="w-[600px] h-[600px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(198,168,124,0.15) 0%, rgba(198,168,124,0.05) 30%, transparent 60%)',
                filter: 'blur(40px)',
              }}
            />
          </motion.div>
          
          {/* Welcome message (if returning user) */}
          <AnimatePresence>
            {showWelcomeBack && phase === 'entering' && (
              <motion.div
                className="absolute top-1/4 text-center z-10"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-[#C6A87C] text-lg sm:text-xl font-light tracking-wide">
                  Welcome back
                </p>
                <p className="text-white/60 text-sm mt-1">
                  Entering your secured vault...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Custom message */}
          <AnimatePresence>
            {message && phase === 'entering' && (
              <motion.div
                className="absolute top-1/4 text-center z-10 px-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-[#C6A87C] text-lg sm:text-xl font-light tracking-wide">
                  {message}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Vault Door */}
          <motion.div
            className="relative z-10"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={
              phase === 'zooming' || phase === 'complete'
                ? { scale: 3, opacity: 0, y: 0 }
                : { scale: 1, opacity: 1, y: 0 }
            }
            transition={{ 
              duration: phase === 'zooming' ? 0.5 : 0.4,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            <VaultDoor 
              isOpening={phase === 'opening' || phase === 'zooming' || phase === 'complete'} 
            />
          </motion.div>
          
          {/* Golden light spill */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={phase === 'opening' || phase === 'zooming' ? {
              opacity: [0, 0.6, 0.8, 1],
            } : { opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div 
              className="w-32 h-96 sm:w-48 sm:h-[500px]"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(198,168,124,0.1) 20%, rgba(198,168,124,0.15) 50%, rgba(198,168,124,0.1) 80%, transparent 100%)',
                filter: 'blur(20px)',
                transform: 'perspective(500px) rotateY(-10deg)',
              }}
            />
          </motion.div>
          
          {/* Document silhouettes */}
          {(phase === 'opening' || phase === 'zooming') && !prefersReducedMotion && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {documents.map((doc, i) => (
                <DocumentSilhouette key={i} {...doc} />
              ))}
            </div>
          )}
          
          {/* Golden particles */}
          {(phase === 'opening' || phase === 'zooming') && !prefersReducedMotion && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {particles.map((particle) => (
                <GoldenParticle key={particle.id} {...particle} />
              ))}
            </div>
          )}
          
          {/* Final flash/fade to white-gold */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, rgba(198,168,124,0.3) 0%, transparent 50%)',
            }}
            initial={{ opacity: 0 }}
            animate={phase === 'complete' ? { opacity: [0, 1, 0] } : { opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VaultTransition;
