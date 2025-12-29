import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Book,
  BookOpen,
  CaretRight,
  ChartLine,
  ClipboardText,
  CreditCard,
  FilePdf,
  FlowArrow,
  Gavel,
  Gear,
  GearSix,
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
  Users,
  Vault,
  Wrench,
  X
} from '@phosphor-icons/react';
import { cn } from '../../lib/utils';

const navItems = [
  // main - sorted by length: Dashboard (9)
  { name: 'Dashboard', href: '/vault', icon: House, section: 'main' },
  
  // knowledge - sorted by length: Learn (5), Maxims (6), Glossary (8), Diagrams (8)
  { name: 'Learn', href: '/learn', icon: BookOpen, section: 'knowledge' },
  { name: 'Maxims', href: '/maxims', icon: Sparkle, section: 'knowledge' },
  { name: 'Glossary', href: '/glossary', icon: Book, section: 'knowledge' },
  { name: 'Diagrams', href: '/diagrams', icon: Graph, section: 'knowledge' },
  
  // workspace - sorted by length: Vault (5), Ledger (6), Scenarios (9), Templates (9), Node Map (8), Governance (10), Shared Workspaces (17)
  { name: 'Vault', href: '/vault/documents', icon: Vault, section: 'workspace' },
  { name: 'Ledger', href: '/ledger', icon: Scroll, section: 'workspace' },
  { name: 'Scenarios', href: '/scenarios', icon: ChartLine, section: 'workspace' },
  { name: 'Templates', href: '/templates', icon: StackSimple, section: 'workspace' },
  { name: 'Node Map', href: '/node-map', icon: MapTrifold, section: 'workspace' },
  { name: 'Governance', href: '/vault/governance', icon: Gavel, section: 'workspace' },
  { name: 'Shared Workspaces', href: '/vault/workspaces', icon: Users, section: 'workspace' },
  
  // tools - Billing before Binder
  { name: 'Billing', href: '/billing', icon: CreditCard, section: 'tools' },
  { name: 'Binder', href: '/binder', icon: FilePdf, section: 'tools' },
  { name: 'Audit Log', href: '/vault/audit-log', icon: ClipboardText, section: 'tools' },
  { name: 'Assistant', href: '/assistant', icon: Robot, section: 'tools' },
  { name: 'Diagnostics', href: '/diagnostics', icon: Stethoscope, section: 'tools' },
  { name: 'Trust Health', href: '/health', icon: Heartbeat, section: 'tools' },
  { name: 'Thread Manager', href: '/ledger-threads', icon: FlowArrow, section: 'tools' },
  
  // admin section - Settings for all, Admin Console for admins only
  { name: 'Settings', href: '/settings', icon: Gear, section: 'admin' },
  { name: 'Admin Console', href: '/admin', icon: GearSix, section: 'admin', adminOnly: true },
];

// Sidebar nav item - clean, no transitions
const SidebarNavItem = ({ item, onNavClick }) => {
  const location = useLocation();
  const isActive = location.pathname === item.href || 
    (item.href !== '/vault' && location.pathname.startsWith(item.href));
  
  return (
    <NavLink
      to={item.href}
      onClick={onNavClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg group relative',
        isActive
          ? 'bg-vault-gold/10 text-vault-gold border border-vault-gold/20'
          : 'text-white/60 hover:text-white hover:bg-white/5'
      )}
    >
      <item.icon className={cn(
        'w-4 h-4 flex-shrink-0',
        isActive ? 'text-vault-gold' : 'text-white/40 group-hover:text-white/70'
      )} />
      
      <span className="text-sm font-medium">{item.name}</span>
      
      {isActive && (
        <div className="ml-auto">
          <CaretRight className="w-3 h-3 text-vault-gold flex-shrink-0" weight="duotone" />
        </div>
      )}
    </NavLink>
  );
};

const sections = {
  main: 'OVERVIEW',
  knowledge: 'KNOWLEDGE',
  workspace: 'WORKSPACE',
  tools: 'TOOLS'
};

// Allowed admin emails - only these users can see Admin Console
const ADMIN_EMAILS = ['jedediah.bey@gmail.com', 'dev.admin@system.local'];

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

  // Filter nav items - hide admin items unless user is in ADMIN_EMAILS
  const filteredNavItems = navItems.filter(item => {
    if (item.adminOnly) {
      return user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
    }
    return true;
  });

  const groupedItems = filteredNavItems.reduce((acc, item) => {
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
      {/* Logo - Links to Landing Page - MATCHES landing page header exactly */}
      <Link to="/" className="block border-b border-white/10 hover:bg-white/5 transition-colors">
        <div className="flex items-center justify-center gap-2 h-16 px-4">
          <Key className="w-5 h-5 text-[#C6A87C] shrink-0" weight="duotone" />
          <span className="text-sm sm:text-base font-medium text-white whitespace-nowrap">Private Equity & Trusts</span>
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
                <SidebarNavItem key={item.href} item={item} onNavClick={onNavClick} />
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
