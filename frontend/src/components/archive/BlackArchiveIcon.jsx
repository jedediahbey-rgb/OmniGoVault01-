import { memo } from 'react';
import { motion } from 'framer-motion';

export const BlackArchiveIcon = memo(({ size = 'lg', animate = true }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };
  
  return (
    <div className={`${sizeClasses[size]} relative`}>
      {/* Outer rotating ring */}
      <motion.div
        className="absolute inset-0 rounded-xl"
        style={{
          background: 'conic-gradient(from 0deg, transparent, rgba(198, 168, 124, 0.3), transparent, rgba(198, 168, 124, 0.1), transparent)',
          willChange: 'transform',
        }}
        animate={animate ? { rotate: 360 } : {}}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Inner counter-rotating ring */}
      <motion.div
        className="absolute inset-1 rounded-lg"
        style={{
          background: 'conic-gradient(from 180deg, transparent, rgba(139, 92, 246, 0.2), transparent, rgba(198, 168, 124, 0.2), transparent)',
          willChange: 'transform',
        }}
        animate={animate ? { rotate: -360 } : {}}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Core background */}
      <div className="absolute inset-2 rounded-lg bg-black/90 border border-vault-gold/30" />
      
      {/* Mystical eye symbol */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative"
          animate={animate ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg viewBox="0 0 40 40" className="w-8 h-8" style={{ filter: 'drop-shadow(0 0 8px rgba(198, 168, 124, 0.5))' }}>
            {/* Decorative outer triangles */}
            <motion.path
              d="M20 4 L24 12 L16 12 Z"
              fill="none"
              stroke="rgba(198, 168, 124, 0.6)"
              strokeWidth="0.5"
              animate={animate ? { opacity: [0.4, 1, 0.4] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.path
              d="M20 36 L24 28 L16 28 Z"
              fill="none"
              stroke="rgba(198, 168, 124, 0.6)"
              strokeWidth="0.5"
              animate={animate ? { opacity: [0.4, 1, 0.4] } : {}}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            />
            
            {/* Eye shape */}
            <path
              d="M6 20 Q20 8 34 20 Q20 32 6 20"
              fill="none"
              stroke="rgba(198, 168, 124, 0.8)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            
            {/* Pupil */}
            <motion.circle
              cx="20"
              cy="20"
              r="5"
              fill="rgba(198, 168, 124, 0.3)"
              stroke="rgba(198, 168, 124, 1)"
              strokeWidth="1"
              animate={animate ? { r: [5, 6, 5] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            
            {/* Inner dot */}
            <motion.circle
              cx="20"
              cy="20"
              r="2"
              fill="rgba(198, 168, 124, 1)"
              animate={animate ? { opacity: [0.6, 1, 0.6] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </svg>
        </motion.div>
      </div>
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-vault-gold/50 rounded-tl" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-vault-gold/50 rounded-tr" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-vault-gold/50 rounded-bl" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-vault-gold/50 rounded-br" />
    </div>
  );
});
