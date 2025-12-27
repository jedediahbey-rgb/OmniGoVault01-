import { NavLink, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Book,
  BookOpen,
  CaretRight,
  ChartLine,
  ClipboardText,
  FilePdf,
  FlowArrow,
  Gavel,
  Gear,
  Graph,
  Heartbeat,
  House,
  Key,
  MapTrifold,
  Robot,
  Scroll,
  Shield,
  ShieldCheck,
  SignOut,
  Sparkle,
  StackSimple,
  Stethoscope,
  TreeView,
  Vault,
  X
} from '@phosphor-icons/react';
import { cn } from '../../lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/vault', icon: House, section: 'main' },
  { name: 'Learn', href: '/learn', icon: BookOpen, section: 'knowledge' },
  { name: 'Maxims', href: '/maxims', icon: Sparkle, section: 'knowledge' },
  { name: 'Glossary', href: '/glossary', icon: Book, section: 'knowledge' },
  { name: 'Diagrams', href: '/diagrams', icon: Graph, section: 'knowledge' },
  { name: 'Node Map', href: '/node-map', icon: MapTrifold, section: 'workspace' },
  { name: 'Scenarios', href: '/scenarios', icon: ChartLine, section: 'workspace' },
  { name: 'Ledger', href: '/ledger', icon: Scroll, section: 'workspace' },
  { name: 'Vault', href: '/vault/documents', icon: Vault, section: 'workspace' },
  { name: 'Governance', href: '/vault/governance', icon: Gavel, section: 'workspace' },
  { name: 'Templates', href: '/templates', icon: StackSimple, section: 'workspace' },
  { name: 'Assistant', href: '/assistant', icon: Robot, section: 'tools' },
  { name: 'Trust Health', href: '/health', icon: Heartbeat, section: 'tools' },
  { name: 'Diagnostics', href: '/diagnostics', icon: Stethoscope, section: 'tools' },
  { name: 'Thread Manager', href: '/ledger-threads', icon: FlowArrow, section: 'tools' },
  { name: 'Binder', href: '/binder', icon: FilePdf, section: 'tools' },
  { name: 'Audit Log', href: '/audit-log', icon: ClipboardText, section: 'tools' },
  { name: 'Settings', href: '/settings', icon: Gear, section: 'tools' },
];

const sections = {
  main: 'OVERVIEW',
  knowledge: 'KNOWLEDGE',
  workspace: 'WORKSPACE',
  tools: 'TOOLS'
};

export default function Sidebar({ user, onLogout, isOpen, onClose }) {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    if (onLogout) await onLogout();
    navigate('/login');
  };

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    if (onClose) onClose();
  };

  const groupedItems = navItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  return (
    <>
      {/* Desktop Sidebar - always visible */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-vault-void/80 backdrop-blur-xl border-r border-white/10 flex-col z-50"
      >
        <SidebarContent 
          user={user} 
          groupedItems={groupedItems} 
          handleLogout={handleLogout}
          onNavClick={handleNavClick}
        />
      </motion.aside>

      {/* Mobile Sidebar - drawer overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="lg:hidden fixed left-0 top-0 h-screen w-[280px] bg-vault-void/95 backdrop-blur-xl border-r border-white/10 flex flex-col z-50"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" weight="duotone" />
            </button>
            <SidebarContent 
              user={user} 
              groupedItems={groupedItems} 
              handleLogout={handleLogout}
              onNavClick={handleNavClick}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarContent({ user, groupedItems, handleLogout, onNavClick }) {
  return (
    <>
      {/* Logo - Links to Landing Page */}
      <Link to="/" className="block p-6 border-b border-white/10 hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-vault-gold" weight="fill" />
          <div className="min-w-0 flex-1">
            <span className="font-heading text-base text-white tracking-tight block truncate">Private Equity & Trusts</span>
          </div>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        {Object.entries(groupedItems).map(([section, items]) => (
          <div key={section} className="mb-6">
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-3 px-3">
              {sections[section]}
            </p>
            <div className="space-y-1">
              {items.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={onNavClick}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                      isActive
                        ? 'bg-vault-gold/10 text-vault-gold border border-vault-gold/20'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={cn(
                        'w-4 h-4 transition-colors flex-shrink-0',
                        isActive ? 'text-vault-gold' : 'text-white/40 group-hover:text-white/70'
                      )} />
                      <span className="text-sm font-medium">{item.name}</span>
                      {isActive && (
                        <CaretRight className="w-3 h-3 ml-auto text-vault-gold flex-shrink-0" weight="duotone" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-white/10">
        {user ? (
          <div className="flex items-center gap-3">
            <img
              src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=C6A87C&color=0B1221`}
              alt={user.name}
              className="w-9 h-9 rounded-lg border border-vault-gold/30 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user.name}</p>
              <p className="text-xs text-white/40 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors flex-shrink-0"
              title="Sign out"
            >
              <SignOut className="w-4 h-4" weight="duotone" />
            </button>
          </div>
        ) : (
          <NavLink
            to="/login"
            onClick={onNavClick}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-vault-gold/10 text-vault-gold border border-vault-gold/20 rounded-lg hover:bg-vault-gold/20 transition-colors"
          >
            <span className="text-sm font-medium">Sign In</span>
          </NavLink>
        )}
      </div>
    </>
  );
}
