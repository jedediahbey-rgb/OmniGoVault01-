import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';

// Pre-generated particle positions - Desktop
const PARTICLE_POSITIONS_DESKTOP = [
  { left: 12, top: 8, duration: 5.2, delay: 0.3, size: 'lg' },
  { left: 85, top: 15, duration: 4.8, delay: 1.2, size: 'md' },
  { left: 23, top: 45, duration: 6.1, delay: 0.8, size: 'sm' },
  { left: 67, top: 72, duration: 5.5, delay: 1.8, size: 'lg' },
  { left: 45, top: 28, duration: 4.3, delay: 0.5, size: 'md' },
  { left: 91, top: 55, duration: 5.9, delay: 1.1, size: 'sm' },
  { left: 34, top: 82, duration: 4.6, delay: 0.2, size: 'lg' },
  { left: 78, top: 38, duration: 5.3, delay: 1.5, size: 'md' },
  { left: 56, top: 91, duration: 6.4, delay: 0.9, size: 'sm' },
  { left: 8, top: 62, duration: 4.9, delay: 1.7, size: 'lg' },
  { left: 42, top: 12, duration: 5.7, delay: 0.4, size: 'md' },
  { left: 95, top: 85, duration: 4.2, delay: 1.3, size: 'sm' },
  { left: 18, top: 33, duration: 6.0, delay: 0.6, size: 'lg' },
  { left: 72, top: 19, duration: 5.1, delay: 1.9, size: 'md' },
  { left: 51, top: 68, duration: 4.7, delay: 0.1, size: 'sm' },
  { left: 29, top: 95, duration: 5.8, delay: 1.4, size: 'lg' },
  { left: 83, top: 42, duration: 4.4, delay: 0.7, size: 'md' },
  { left: 6, top: 78, duration: 6.2, delay: 1.6, size: 'sm' },
  { left: 61, top: 5, duration: 5.0, delay: 1.0, size: 'lg' },
  { left: 38, top: 58, duration: 4.5, delay: 0.0, size: 'md' },
];

// Only 6 particles for mobile - lighter
const PARTICLE_POSITIONS_MOBILE = [
  { left: 15, top: 20, duration: 6, delay: 0, size: 'md' },
  { left: 75, top: 15, duration: 7, delay: 1, size: 'lg' },
  { left: 45, top: 60, duration: 5.5, delay: 0.5, size: 'md' },
  { left: 85, top: 70, duration: 6.5, delay: 1.5, size: 'sm' },
  { left: 25, top: 80, duration: 5, delay: 2, size: 'lg' },
  { left: 60, top: 35, duration: 7, delay: 0.8, size: 'md' },
];

const Particle = memo(({ particle, index }) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2'
  };
  
  return (
    <motion.div
      className={`absolute rounded-full ${sizeClasses[particle.size]}`}
      style={{
        left: `${particle.left}%`,
        top: `${particle.top}%`,
        background: index % 3 === 0 
          ? 'rgba(198, 168, 124, 0.4)' 
          : index % 3 === 1 
            ? 'rgba(255, 255, 255, 0.2)' 
            : 'rgba(198, 168, 124, 0.2)',
        willChange: 'transform, opacity',
      }}
      animate={{
        y: [0, -20, 0],
        opacity: [0.3, 0.7, 0.3],
      }}
      transition={{
        duration: particle.duration,
        delay: particle.delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
});

export const FloatingParticles = memo(() => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  useEffect(() => {
    let timeoutId;
    const checkMobile = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth < 640);
      }, 150);
    };
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(timeoutId);
    };
  }, []);
  
  const particles = isMobile ? PARTICLE_POSITIONS_MOBILE : PARTICLE_POSITIONS_DESKTOP;
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle, i) => (
        <Particle key={i} particle={particle} index={i} />
      ))}
    </div>
  );
});
