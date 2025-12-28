import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * InitialLoadingScreen - Matrix-style loading screen shown on initial app load
 * 
 * Shows "Jacking into the Network" with Matrix rain effect before landing page appears
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
    
    // Matrix characters
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?~`αβγδεζηθικλμνξοπρστυφχψω';
    const charArray = chars.split('');
    
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    
    const drops = Array(columns).fill(1);
    
    // Gold/amber color for vault theme
    const matrixColor = 'rgba(198, 168, 124, ';
    
    const draw = () => {
      ctx.fillStyle = 'rgba(10, 17, 40, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.font = `${fontSize}px monospace`;
      
      for (let i = 0; i < drops.length; i++) {
        const char = charArray[Math.floor(Math.random() * charArray.length)];
        const opacity = Math.random() * 0.5 + 0.1;
        ctx.fillStyle = matrixColor + opacity + ')';
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        
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

const InitialLoadingScreen = ({ onComplete, planName = 'DYNASTY' }) => {
  const [phase, setPhase] = useState('jacking'); // jacking -> establishing -> online -> complete
  
  useEffect(() => {
    // Animation sequence
    const timer1 = setTimeout(() => setPhase('establishing'), 800);
    const timer2 = setTimeout(() => setPhase('online'), 1800);
    const timer3 = setTimeout(() => {
      setPhase('complete');
      if (onComplete) onComplete();
    }, 2800);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'complete' && (
        <motion.div
          className="fixed inset-0 z-[9999] bg-[#0a1128]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Matrix Rain Background */}
          <MatrixRain />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a1128]/50 to-[#0a1128]" />
          
          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* Main Card */}
            <motion.div
              className="relative bg-[#0d1526]/80 border border-[#C6A87C]/30 rounded-2xl p-8 sm:p-12 backdrop-blur-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#C6A87C]/50 rounded-tl" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#C6A87C]/50 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#C6A87C]/50 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#C6A87C]/50 rounded-br" />
              
              {/* Logo */}
              <motion.h1
                className="text-[#C6A87C] text-2xl sm:text-3xl font-bold tracking-[0.3em] text-center mb-6"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                OMNIGOVAULT
              </motion.h1>
              
              {/* Jack-in Icon */}
              <motion.div
                className="flex justify-center mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="w-16 h-12 border-2 border-[#C6A87C]/60 rounded-lg flex items-center justify-center">
                  <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
                    <rect x="4" y="2" width="24" height="16" rx="2" stroke="#C6A87C" strokeWidth="1.5" fill="none" />
                    <rect x="8" y="6" width="4" height="4" fill="#C6A87C" opacity="0.6" />
                    <rect x="14" y="6" width="4" height="4" fill="#C6A87C" opacity="0.6" />
                    <rect x="20" y="6" width="4" height="4" fill="#C6A87C" opacity="0.6" />
                    <line x1="16" y1="18" x2="16" y2="22" stroke="#C6A87C" strokeWidth="2" />
                    <circle cx="16" cy="23" r="1" fill="#C6A87C" />
                  </svg>
                </div>
              </motion.div>
              
              {/* Status Text */}
              <div className="text-center space-y-2">
                <motion.h2
                  className="text-white text-xl sm:text-2xl font-semibold tracking-wide"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {phase === 'jacking' && 'Jacking into the Network'}
                  {phase === 'establishing' && 'Establishing secure connection...'}
                  {phase === 'online' && 'Matrix System Online'}
                </motion.h2>
                
                {/* Progress bar */}
                <motion.div
                  className="w-64 h-1 bg-[#C6A87C]/20 rounded-full mx-auto mt-4 overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#C6A87C] to-[#E8D5B5]"
                    initial={{ width: '0%' }}
                    animate={{ 
                      width: phase === 'jacking' ? '30%' : phase === 'establishing' ? '70%' : '100%' 
                    }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </motion.div>
              </div>
              
              {/* Plan Badge */}
              <motion.div
                className="flex justify-center mt-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: phase === 'online' ? 1 : 0, y: phase === 'online' ? 0 : 10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="px-6 py-2 bg-purple-600/20 border border-purple-500/40 rounded-full">
                  <span className="text-purple-300 text-sm font-medium tracking-wider">{planName}</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InitialLoadingScreen;
