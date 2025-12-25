/**
 * Command Palette (⌘K) - Global Search Overlay
 * Provides quick navigation and search across the entire application
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  CaretRight
} from '@phosphor-icons/react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Icon mapping
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
  MagnifyingGlass
};

// Type colors
const typeColors = {
  navigation: 'text-blue-400 bg-blue-500/10',
  action: 'text-emerald-400 bg-emerald-500/10',
  record: 'text-vault-gold bg-vault-gold/10',
  portfolio: 'text-purple-400 bg-purple-500/10',
  template: 'text-cyan-400 bg-cyan-500/10'
};

export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      const items = query ? results : getAllSuggestionItems();
      
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, query, suggestions]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selected = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const getAllSuggestionItems = useCallback(() => {
    if (!suggestions) return [];
    return [
      ...(suggestions.recent || []),
      ...(suggestions.quick_actions || []),
      ...(suggestions.navigation || [])
    ];
  }, [suggestions]);

  const fetchSuggestions = async () => {
    try {
      const res = await axios.get(`${API}/search/suggestions`);
      if (res.data.ok) {
        setSuggestions(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  };

  const search = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
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
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item) => {
    if (item.type === 'action') {
      executeAction(item.action);
    } else if (item.path) {
      navigate(item.path);
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
        toast.info(`Action: ${actionType}`);
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
        key={item.id || index}
        data-index={globalIndex}
        onClick={() => handleSelect(item)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
          isSelected ? 'bg-vault-gold/10' : 'hover:bg-white/5'
        }`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeColor.split(' ')[1]}`}>
          <Icon className={`w-4 h-4 ${typeColor.split(' ')[0]}`} weight="duotone" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium truncate">{item.title}</span>
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Command Palette */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-2xl bg-[#0B1221] border border-vault-gold/20 rounded-xl shadow-2xl overflow-hidden"
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
                  <p>No results found for "{query}"</p>
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
              <div className="py-12 text-center text-vault-muted">
                <Command className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p>Loading...</p>
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
      </motion.div>
    </AnimatePresence>
  );
}
