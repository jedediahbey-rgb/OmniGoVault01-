import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  FileText,
  FolderSimple,
  House,
  MagnifyingGlass,
  Plus,
  Robot,
  Settings,
  Sparkle
} from '@phosphor-icons/react';
import { Input } from '../ui/input';

const commands = [
  { id: 'dashboard', name: 'Go to Dashboard', icon: House, action: '/vault', type: 'nav' },
  { id: 'learn', name: 'Go to Learn', icon: BookOpen, action: '/learn', type: 'nav' },
  { id: 'maxims', name: 'Go to Maxims', icon: Sparkle, action: '/maxims', type: 'nav' },
  { id: 'glossary', name: 'Go to Glossary', icon: BookOpen, action: '/glossary', type: 'nav' },
  { id: 'vault', name: 'Go to Vault', icon: FolderSimple, action: '/vault/documents', type: 'nav' },
  { id: 'templates', name: 'Go to Templates', icon: FileText, action: '/templates', type: 'nav' },
  { id: 'assistant', name: 'Open AI Assistant', icon: Robot, action: '/assistant', type: 'nav' },
  { id: 'new-doc', name: 'Create New Document', icon: Plus, action: '/templates', type: 'action' },
  { id: 'new-portfolio', name: 'Create New Portfolio', icon: Plus, action: 'new-portfolio', type: 'action' },
];

export default function CommandPalette({ isOpen, onClose, onAction }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredCommands = commands.filter(cmd =>
    cmd.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      e.preventDefault();
      const cmd = filteredCommands[selectedIndex];
      if (cmd.type === 'nav') {
        navigate(cmd.action);
      } else if (onAction) {
        onAction(cmd.action);
      }
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filteredCommands, selectedIndex, navigate, onClose, onAction]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[20vh]"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-vault-navy border border-white/10 rounded-xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                autoFocus
                placeholder="Type a command or search..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10 bg-white/5 border-white/10 focus:border-vault-gold"
              />
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {filteredCommands.map((cmd, idx) => (
              <button
                key={cmd.id}
                onClick={() => {
                  if (cmd.type === 'nav') navigate(cmd.action);
                  else if (onAction) onAction(cmd.action);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  idx === selectedIndex
                    ? 'bg-vault-gold/10 text-vault-gold'
                    : 'text-white/70 hover:bg-white/5'
                }`}
              >
                <cmd.icon className="w-4 h-4" />
                <span className="flex-1">{cmd.name}</span>
                {idx === selectedIndex && <ArrowRight className="w-4 h-4" />}
              </button>
            ))}
            {filteredCommands.length === 0 && (
              <p className="text-white/40 text-center py-8">No commands found</p>
            )}
          </div>
          
          <div className="p-3 border-t border-white/10 flex items-center justify-between text-xs text-white/30">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
