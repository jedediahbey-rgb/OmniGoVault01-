import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { cardHover } from '../../lib/motion';

export default function GlassCard({ 
  children, 
  className, 
  interactive = false,
  glow = false,
  ...props 
}) {
  const Component = interactive ? motion.div : 'div';
  const motionProps = interactive ? {
    initial: 'rest',
    whileHover: 'hover',
    variants: cardHover
  } : {};

  return (
    <Component
      className={cn(
        'glass-card rounded-xl p-6',
        interactive && 'cursor-pointer',
        glow && 'hover:shadow-[0_0_30px_rgba(198,168,124,0.15)]',
        className
      )}
      {...motionProps}
      {...props}
    >
      {children}
    </Component>
  );
}
