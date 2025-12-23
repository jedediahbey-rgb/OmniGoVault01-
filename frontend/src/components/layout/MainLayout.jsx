import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { pageTransition } from '../../lib/motion';

export default function MainLayout({ children, user, onLogout }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-vault-navy">
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
      
      {/* Sidebar */}
      <Sidebar user={user} onLogout={onLogout} />
      
      {/* Main Content */}
      <main className="ml-64 min-h-screen relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={pageTransition.initial}
            animate={pageTransition.animate}
            exit={pageTransition.exit}
            transition={pageTransition.transition}
            className="min-h-screen"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
