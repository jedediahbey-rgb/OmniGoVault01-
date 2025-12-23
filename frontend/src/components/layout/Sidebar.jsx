import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Sparkles,
  BookText,
  FolderArchive,
  FileText,
  Bot,
  LogOut,
  Home,
  ChevronRight,
  Shield
} from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/vault', icon: Home, section: 'main' },
  { name: 'Learn', href: '/learn', icon: BookOpen, section: 'knowledge' },
  { name: 'Maxims', href: '/maxims', icon: Sparkles, section: 'knowledge' },
  { name: 'Glossary', href: '/glossary', icon: BookText, section: 'knowledge' },
  { name: 'Vault', href: '/vault/documents', icon: FolderArchive, section: 'workspace' },
  { name: 'Templates', href: '/templates', icon: FileText, section: 'workspace' },
  { name: 'Assistant', href: '/assistant', icon: Bot, section: 'tools' },
];

const sections = {
  main: 'OVERVIEW',
  knowledge: 'KNOWLEDGE',
  workspace: 'WORKSPACE',
  tools: 'TOOLS'
};

export default function Sidebar({ user, onLogout }) {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    if (onLogout) await onLogout();
    navigate('/login');
  };

  const groupedItems = navItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed left-0 top-0 h-screen w-64 bg-vault-void/80 backdrop-blur-xl border-r border-white/10 flex flex-col z-50"
    >
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-vault-gold to-vault-gold-dim flex items-center justify-center">
            <Shield className="w-5 h-5 text-vault-navy" />
          </div>
          <div>
            <h1 className="font-heading text-lg text-white tracking-tight">Equity Trust</h1>
            <p className="text-xs text-vault-gold uppercase tracking-widest">Portfolio</p>
          </div>
        </div>
      </div>

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
                        'w-4 h-4 transition-colors',
                        isActive ? 'text-vault-gold' : 'text-white/40 group-hover:text-white/70'
                      )} />
                      <span className="text-sm font-medium">{item.name}</span>
                      {isActive && (
                        <ChevronRight className="w-3 h-3 ml-auto text-vault-gold" />
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
              className="w-9 h-9 rounded-lg border border-vault-gold/30"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user.name}</p>
              <p className="text-xs text-white/40 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <NavLink
            to="/login"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-vault-gold/10 text-vault-gold border border-vault-gold/20 rounded-lg hover:bg-vault-gold/20 transition-colors"
          >
            <span className="text-sm font-medium">Sign In</span>
          </NavLink>
        )}
      </div>
    </motion.aside>
  );
}
