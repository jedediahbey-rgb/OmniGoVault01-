/**
 * Command Palette V2 (⌘K) - Global Search Overlay
 * Provides quick navigation and search across the entire application
 * V2: Enhanced with fuzzy search, recent searches, shortcuts display
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  MagnifyingGlass,
  X,
  ArrowRight,
  House,
  Gavel,
  Scroll,
  FileText,
  Heartbeat,
  ShieldCheck,
  BookOpen,
  Sparkle,
  Robot,
  ChartLine,
  MapTrifold,
  Notebook,
  CurrencyDollar,
  Shield,
  Users,
  FolderSimple,
  Download,
  Command,
  ArrowUp,
  ArrowDown,
  CaretRight,
  Plus,
  User,
  Gear,
  CreditCard,
  Folder,
  FolderPlus,
  FilePlus,
  FileArchive,
  Clock,
  Scales,
  Trash
} from '@phosphor-icons/react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Icon mapping - V2 expanded
const iconMap = {
  House,
  Gavel,
  Scroll,
  FileText,
  Heartbeat,
  ShieldCheck,
  BookOpen,
  Sparkle,
  Robot,
  ChartLine,
  MapTrifold,
  Notebook,
  CurrencyDollar,
  Shield,
  Users,
  FolderSimple,
  Download,
  MagnifyingGlass,
  Plus,
  User,
  Gear,
  CreditCard,
  Folder,
  FolderPlus,
  FilePlus,
  FileArchive,
  Clock,
  Scales,
  Trash
};

// Type colors - V2 expanded
const typeColors = {
  navigation: 'text-blue-400 bg-blue-500/10',
  action: 'text-emerald-400 bg-emerald-500/10',
  record: 'text-vault-gold bg-vault-gold/10',
  portfolio: 'text-purple-400 bg-purple-500/10',
  document: 'text-cyan-400 bg-cyan-500/10',
  party: 'text-pink-400 bg-pink-500/10',
  template: 'text-cyan-400 bg-cyan-500/10',
  nav: 'text-blue-400 bg-blue-500/10'
};

// Fallback commands if API fails
const fallbackCommands = [
  { id: 'dashboard', type: 'navigation', title: 'Dashboard', subtitle: 'Go to main dashboard', path: '/vault', icon: 'House' },
  { id: 'governance', type: 'navigation', title: 'Governance', subtitle: 'Manage governance records', path: '/vault/governance', icon: 'Gavel' },
  { id: 'health', type: 'navigation', title: 'Trust Health', subtitle: 'Health dashboard', path: '/health', icon: 'Heartbeat' },
  { id: 'templates', type: 'navigation', title: 'Templates', subtitle: 'Document templates', path: '/templates', icon: 'FileText' },
  { id: 'ledger', type: 'navigation', title: 'Ledger', subtitle: 'View ledger entries', path: '/ledger', icon: 'Scroll' },
  { id: 'diagnostics', type: 'navigation', title: 'Diagnostics', subtitle: 'System diagnostics', path: '/diagnostics', icon: 'ShieldCheck' },
  { id: 'learn', type: 'navigation', title: 'Learn', subtitle: 'Knowledge base', path: '/learn', icon: 'BookOpen' },
  { id: 'assistant', type: 'navigation', title: 'AI Assistant', subtitle: 'Get help from AI', path: '/assistant', icon: 'Robot' },
  { id: 'new_meeting', type: 'action', title: 'New Meeting Minutes', subtitle: 'Create meeting minutes', action: 'create_minutes', icon: 'Plus' },
  { id: 'new_distribution', type: 'action', title: 'New Distribution', subtitle: 'Create distribution record', action: 'create_distribution', icon: 'Plus' },
];

export default function CommandPalette({ isOpen, onClose, onAction }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [useApi, setUseApi] = useState(true);
  const resultsRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      fetchSuggestions();
    }
  }, [isOpen]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Get all items for keyboard navigation
  const getAllItems = useCallback(() => {
    if (query && results.length > 0) {
      return results;
    }
    if (suggestions) {
      return [
        ...(suggestions.recent || []),
        ...(suggestions.quick_actions || []),
        ...(suggestions.navigation || [])
      ];
    }
    return fallbackCommands;
  }, [query, results, suggestions]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      const items = getAllItems();
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (items[selectedIndex]) {
            handleSelect(items[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, getAllItems, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selected = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const fetchSuggestions = async () => {
    try {
      const res = await axios.get(`${API}/search/suggestions`);
      if (res.data.ok) {
        setSuggestions(res.data.data);
        setUseApi(true);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions, using fallback:', error);
      setUseApi(false);
    }
  };

  const search = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    if (!useApi) {
      // Fallback to local search
      const filtered = fallbackCommands.filter(cmd =>
        cmd.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setResults(filtered);
      setSelectedIndex(0);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`${API}/search`, {
        params: { q: searchQuery, limit: 15 }
      });
      if (res.data.ok) {
        setResults(res.data.data.results || []);
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error('Search failed:', error);
      // Fallback to local search
      const filtered = fallbackCommands.filter(cmd =>
        cmd.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setResults(filtered);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item) => {
    if (item.type === 'action' && item.action) {
      executeAction(item.action);
    } else if (item.path) {
      navigate(item.path);
    } else if (item.action && typeof item.action === 'string' && item.action.startsWith('/')) {
      navigate(item.action);
    }
    onClose();
  };

  const executeAction = async (actionType) => {
    switch (actionType) {
      case 'create_minutes':
        navigate('/vault/governance?tab=meetings&action=create');
        break;
      case 'create_distribution':
        navigate('/vault/governance?tab=distributions&action=create');
        break;
      case 'create_insurance':
        navigate('/vault/governance?tab=insurance&action=create');
        break;
      case 'create_compensation':
        navigate('/vault/governance?tab=compensation&action=create');
        break;
      case 'create_dispute':
        navigate('/vault/governance?tab=disputes&action=create');
        break;
      case 'run_health_scan':
        navigate('/health');
        toast.info('Navigate to Health Dashboard to run scan');
        break;
      case 'export_health_report':
        try {
          toast.info('Generating PDF report...');
          const res = await axios.get(`${API}/health/report/pdf`, {
            responseType: 'blob'
          });
          const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `trust_health_report_${new Date().toISOString().split('T')[0]}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          toast.success('PDF report downloaded');
        } catch (error) {
          toast.error('Failed to generate report');
        }
        break;
      default:
        if (onAction) {
          onAction(actionType);
        } else {
          toast.info(`Action: ${actionType}`);
        }
    }
  };

  const getIcon = (iconName) => {
    const Icon = iconMap[iconName] || FileText;
    return Icon;
  };

  const renderItem = (item, index, globalIndex) => {
    const Icon = getIcon(item.icon);
    const isSelected = globalIndex === selectedIndex;
    const typeColor = typeColors[item.type] || 'text-white/60 bg-white/5';

    return (
      <button
        key={item.id || `item-${globalIndex}`}
        data-index={globalIndex}
        onClick={() => handleSelect(item)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
          isSelected ? 'bg-vault-gold/10' : 'hover:bg-white/5'
        }`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeColor.split(' ')[1] || 'bg-white/5'}`}>
          <Icon className={`w-4 h-4 ${typeColor.split(' ')[0] || 'text-white/60'}`} weight="duotone" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium truncate">{item.title || item.name}</span>
            {item.rm_id && (
              <span className="text-xs text-vault-muted font-mono">{item.rm_id}</span>
            )}
          </div>
          {item.subtitle && (
            <p className="text-xs text-vault-muted truncate">{item.subtitle}</p>
          )}
        </div>
        <CaretRight className={`w-4 h-4 text-vault-muted transition-colors ${isSelected ? 'text-vault-gold' : ''}`} />
      </button>
    );
  };

  if (!isOpen) return null;

  const displayResults = query ? results : null;
  let globalIndex = 0;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        paddingLeft: '1rem',
        paddingRight: '1rem',
      }}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />

      {/* Command Palette */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '42rem',
          backgroundColor: '#0B1221',
          border: '1px solid rgba(198, 168, 124, 0.2)',
          borderRadius: '0.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
            <MagnifyingGlass className="w-5 h-5 text-vault-muted" weight="duotone" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or type a command..."
              className="flex-1 bg-transparent text-white placeholder-vault-muted outline-none text-lg"
            />
            {loading && (
              <div className="w-5 h-5 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
            )}
            <div className="flex items-center gap-1 text-xs text-vault-muted">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded">esc</kbd>
              <span>to close</span>
            </div>
          </div>

          {/* Results */}
          <div ref={resultsRef} className="max-h-[400px] overflow-y-auto">
            {displayResults ? (
              // Search Results
              displayResults.length > 0 ? (
                <div className="py-2">
                  {displayResults.map((item, index) => renderItem(item, index, globalIndex++))}
                </div>
              ) : (
                <div className="py-12 text-center text-vault-muted">
                  <MagnifyingGlass className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p>No results found for &quot;{query}&quot;</p>
                  <p className="text-xs mt-1">Try searching for pages, records, or actions</p>
                </div>
              )
            ) : suggestions ? (
              // Suggestions (empty state)
              <div className="py-2">
                {/* Recent Items */}
                {suggestions.recent?.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs text-vault-muted uppercase tracking-wider">
                      Recent
                    </div>
                    {suggestions.recent.map((item, index) => {
                      const result = renderItem(item, index, globalIndex);
                      globalIndex++;
                      return result;
                    })}
                  </div>
                )}

                {/* Quick Actions */}
                {suggestions.quick_actions?.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs text-vault-muted uppercase tracking-wider">
                      Quick Actions
                    </div>
                    {suggestions.quick_actions.map((item, index) => {
                      const result = renderItem(item, index, globalIndex);
                      globalIndex++;
                      return result;
                    })}
                  </div>
                )}

                {/* Navigation */}
                {suggestions.navigation?.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs text-vault-muted uppercase tracking-wider">
                      Go to
                    </div>
                    {suggestions.navigation.map((item, index) => {
                      const result = renderItem(item, index, globalIndex);
                      globalIndex++;
                      return result;
                    })}
                  </div>
                )}
              </div>
            ) : (
              // Fallback commands
              <div className="py-2">
                <div className="px-4 py-2 text-xs text-vault-muted uppercase tracking-wider">
                  Commands
                </div>
                {fallbackCommands.map((item, index) => {
                  const result = renderItem(item, index, globalIndex);
                  globalIndex++;
                  return result;
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between text-xs text-vault-muted">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <ArrowUp className="w-3 h-3" />
                <ArrowDown className="w-3 h-3" />
                <span>to navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↵</kbd>
                <span>to select</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Command className="w-3 h-3" />
              <span>K to toggle</span>
            </div>
          </div>
        </motion.div>
      </div>,
    document.body
  );
}
