/**
 * LedgerThreadSelector - RM-ID Subject Matter Linking Component
 * 
 * Global component for selecting or creating RM Subject (Ledger Thread) 
 * when creating any governance record.
 * 
 * Features:
 * - Attach to Existing Thread (default) - dropdown with search
 * - Auto-suggest based on party/recipient selection
 * - Spawn New Thread - inline mini-form
 * - Sequence Preview - shows the generated .00X
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Link, Plus, CaretDown, MagnifyingGlass, Check,
  ArrowsLeftRight, Sparkle, HashStraight, Info, Warning
} from '@phosphor-icons/react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Category labels and icons
const CATEGORY_CONFIG = {
  minutes: { label: 'Meeting Minutes', icon: '📋' },
  distribution: { label: 'Distribution', icon: '💰' },
  dispute: { label: 'Dispute', icon: '⚖️' },
  insurance: { label: 'Insurance', icon: '🛡️' },
  trustee_compensation: { label: 'Trustee Compensation', icon: '💵' },
  policy: { label: 'Policy', icon: '📄' },
  misc: { label: 'Miscellaneous', icon: '📁' },
};

// Map module types to categories
const MODULE_TO_CATEGORY = {
  minutes: 'minutes',
  distribution: 'distribution',
  dispute: 'dispute',
  insurance: 'insurance',
  compensation: 'trustee_compensation',
};

export default function LedgerThreadSelector({
  portfolioId,
  moduleType,
  selectedSubject,
  onSubjectChange,
  partyId = null,
  partyName = null,
  disabled = false,
  className = '',
}) {
  const [mode, setMode] = useState('select'); // 'select' | 'create'
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [nextRmIdPreview, setNextRmIdPreview] = useState(null);
  const [autoSuggestApplied, setAutoSuggestApplied] = useState(false);
  const [userManuallyChanged, setUserManuallyChanged] = useState(false);
  
  // New subject form state
  const [newSubject, setNewSubject] = useState({
    title: '',
    category: MODULE_TO_CATEGORY[moduleType] || 'misc',
    primary_party_name: partyName || '',
    external_ref: '',
  });

  // Get category from module type
  const category = useMemo(() => 
    MODULE_TO_CATEGORY[moduleType] || 'misc', 
    [moduleType]
  );

  // Fetch subjects for dropdown - use new ledger-threads API
  const fetchSubjects = useCallback(async () => {
    if (!portfolioId) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        portfolio_id: portfolioId,
        limit: '50',
      });
      
      if (category) {
        params.append('category', category);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      const res = await axios.get(`${API}/ledger-threads?${params.toString()}`);
      
      if (res.data.ok) {
        setSubjects(res.data.data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch threads:', error);
    } finally {
      setLoading(false);
    }
  }, [portfolioId, category, searchQuery]);

  // Auto-suggest based on party - use new ledger-threads suggest API
  const autoSuggest = useCallback(async () => {
    if (!portfolioId || !partyId || autoSuggestApplied || userManuallyChanged) return;
    
    try {
      const params = new URLSearchParams({
        portfolio_id: portfolioId,
      });
      
      if (category) {
        params.append('category', category);
      }
      if (partyId) {
        params.append('party_id', partyId);
      }
      
      const res = await axios.get(`${API}/ledger-threads/suggest?${params.toString()}`);
      
      if (res.data.ok) {
        const items = res.data.data.items || [];
        
        if (items.length === 1) {
          // Single match - still show picker for confirmation (per user spec)
          setSubjects(items);
          setShowDropdown(true);
        } else if (items.length > 1) {
          // Multiple matches - show dropdown
          setSubjects(items);
          setShowDropdown(true);
        } else {
          // No matches - switch to create mode
          setMode('create');
          setNewSubject(prev => ({
            ...prev,
            primary_party_name: partyName || '',
          }));
        }
        setAutoSuggestApplied(true);
      }
    } catch (error) {
      console.error('Auto-suggest failed:', error);
    }
  }, [portfolioId, partyId, partyName, category, autoSuggestApplied, userManuallyChanged]);

  // Fetch next RM-ID preview when subject is selected
  const fetchNextRmIdPreview = useCallback(async (subjectId) => {
    try {
      const res = await axios.get(`${API}/ledger-threads/${subjectId}`);
      if (res.data.ok && res.data.data.thread) {
        const thread = res.data.data.thread;
        setNextRmIdPreview(`${thread.rm_id_preview}${thread.next_sub ? `.${String(thread.next_sub).padStart(3, '0')}` : ''}`);
      }
    } catch (error) {
      console.error('Failed to fetch RM-ID preview:', error);
    }
  }, []);

  // Effects
  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    if (partyId && !userManuallyChanged) {
      autoSuggest();
    }
  }, [partyId, autoSuggest, userManuallyChanged]);

  useEffect(() => {
    if (selectedSubject?.id && !selectedSubject.is_new) {
      fetchNextRmIdPreview(selectedSubject.id);
    } else {
      setNextRmIdPreview(null);
    }
  }, [selectedSubject, fetchNextRmIdPreview]);

  // Handlers
  const handleSelectSubject = (subject) => {
    setUserManuallyChanged(true);
    onSubjectChange({
      id: subject.id,
      title: subject.title,
      rm_group: subject.rm_group,
      next_sub_preview: subject.next_sub_preview,
      rm_id_preview: subject.rm_id_preview,
      is_new: false,
    });
    setShowDropdown(false);
    setSearchQuery('');
  };

  const handleCreateNewSubject = () => {
    if (!newSubject.title.trim()) return;
    
    setUserManuallyChanged(true);
    onSubjectChange({
      is_new: true,
      title: newSubject.title,
      category: newSubject.category,
      primary_party_name: newSubject.primary_party_name,
      external_ref: newSubject.external_ref,
    });
    setMode('select');
  };

  const handleClearSelection = () => {
    setUserManuallyChanged(true);
    onSubjectChange(null);
    setNextRmIdPreview(null);
    setAutoSuggestApplied(false);
  };

  const handleAutoMatch = () => {
    setUserManuallyChanged(false);
    setAutoSuggestApplied(false);
    autoSuggest();
  };

  // Filter subjects based on search
  const filteredSubjects = useMemo(() => {
    if (!searchQuery) return subjects;
    const query = searchQuery.toLowerCase();
    return subjects.filter(s => 
      s.title.toLowerCase().includes(query) ||
      s.primary_party_name?.toLowerCase().includes(query) ||
      s.rm_id_preview?.toLowerCase().includes(query) ||
      s.rm_group?.toString().includes(query)
    );
  }, [subjects, searchQuery]);

  return (
    <div className={`mb-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <HashStraight weight="bold" className="w-4 h-4 text-emerald-400" />
          Ledger Thread (RM-ID)
        </label>
        
        {/* Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('select')}
            disabled={disabled}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              mode === 'select'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-300 border border-zinc-700'
            }`}
          >
            <Link weight="bold" className="w-3 h-3 inline mr-1" />
            Attach
          </button>
          <button
            type="button"
            onClick={() => setMode('create')}
            disabled={disabled}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              mode === 'create'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-300 border border-zinc-700'
            }`}
          >
            <Plus weight="bold" className="w-3 h-3 inline mr-1" />
            Spawn New
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {mode === 'select' ? (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Selected Subject Display */}
            {selectedSubject && !selectedSubject.is_new ? (
              <div className="bg-zinc-900/50 border border-emerald-500/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-lg">
                        {CATEGORY_CONFIG[category]?.icon || '📁'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-emerald-400 text-sm">
                          #{selectedSubject.rm_group}
                        </span>
                        <span className="text-white font-medium">
                          {selectedSubject.title}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500">
                        {selectedSubject.rm_id_preview}
                        <span className="text-emerald-400 ml-1">
                          {selectedSubject.next_sub_preview}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {partyId && (
                      <button
                        type="button"
                        onClick={handleAutoMatch}
                        disabled={disabled}
                        className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
                      >
                        Auto-match
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      disabled={disabled}
                      className="text-xs text-zinc-400 hover:text-red-400 transition-colors"
                    >
                      Change
                    </button>
                  </div>
                </div>
                
                {/* Sequence Preview */}
                {nextRmIdPreview && (
                  <div className="mt-3 pt-3 border-t border-zinc-700/50">
                    <div className="flex items-center gap-2 text-sm">
                      <Sparkle weight="fill" className="w-4 h-4 text-amber-400" />
                      <span className="text-zinc-400">Sequence Preview:</span>
                      <span className="font-mono text-amber-400 font-medium">
                        {nextRmIdPreview}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : selectedSubject?.is_new ? (
              /* New Subject Preview */
              <div className="bg-zinc-900/50 border border-amber-500/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                      <Plus weight="bold" className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                          NEW THREAD
                        </span>
                        <span className="text-white font-medium">
                          {selectedSubject.title}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500">
                        Will be assigned a new RM-ID group (1-99)
                        <span className="text-amber-400 ml-1">.001</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    disabled={disabled}
                    className="text-xs text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : (
              /* Dropdown Selector */
              <div className="relative">
                <div
                  onClick={() => !disabled && setShowDropdown(!showDropdown)}
                  className={`
                    w-full bg-zinc-900/50 border border-zinc-700 rounded-lg p-3
                    flex items-center justify-between cursor-pointer
                    hover:border-zinc-600 transition-colors
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Link weight="bold" className="w-4 h-4" />
                    <span>Select existing thread or spawn new...</span>
                  </div>
                  <CaretDown 
                    weight="bold" 
                    className={`w-4 h-4 text-zinc-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} 
                  />
                </div>
                
                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-h-64 overflow-hidden"
                    >
                      {/* Search Input */}
                      <div className="p-2 border-b border-zinc-700">
                        <div className="relative">
                          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search threads..."
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 pl-9 pr-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                      
                      {/* Subject List */}
                      <div className="max-h-48 overflow-y-auto">
                        {loading ? (
                          <div className="p-4 text-center text-zinc-500">
                            Loading...
                          </div>
                        ) : filteredSubjects.length === 0 ? (
                          <div className="p-4 text-center">
                            <Info weight="bold" className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                            <p className="text-sm text-zinc-400">No existing threads found</p>
                            <button
                              type="button"
                              onClick={() => {
                                setMode('create');
                                setShowDropdown(false);
                              }}
                              className="mt-2 text-sm text-emerald-400 hover:text-emerald-300"
                            >
                              Spawn a new thread
                            </button>
                          </div>
                        ) : (
                          filteredSubjects.map((subject) => (
                            <div
                              key={subject.id}
                              onClick={() => handleSelectSubject(subject)}
                              className="px-3 py-2 hover:bg-zinc-800 cursor-pointer border-b border-zinc-800 last:border-0"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-emerald-400 text-xs bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                    #{subject.rm_group}
                                  </span>
                                  <span className="text-white text-sm">
                                    {subject.title}
                                  </span>
                                </div>
                                <span className="text-xs text-zinc-500">
                                  {subject.record_count} records
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                                <span>{subject.rm_id_preview}</span>
                                <span className="text-emerald-400">
                                  Next: {subject.next_sub_preview}
                                </span>
                                {subject.primary_party_name && (
                                  <span className="text-zinc-600">
                                    • {subject.primary_party_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Helper Text */}
            {!selectedSubject && (
              <p className="mt-2 text-xs text-zinc-500 flex items-center gap-1">
                <Info weight="bold" className="w-3 h-3" />
                Select an existing thread to add sequenced entries, or spawn a new thread.
              </p>
            )}
          </motion.div>
        ) : (
          /* Create New Subject Form */
          <motion.div
            key="create"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-zinc-900/50 border border-amber-500/30 rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkle weight="fill" className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-medium">Spawn New Ledger Thread</span>
            </div>
            
            <div className="space-y-3">
              {/* Title */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Thread Title *</label>
                <input
                  type="text"
                  value={newSubject.title}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Trustee Compensation — John Smith"
                  disabled={disabled}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              
              {/* Category */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Category</label>
                <select
                  value={newSubject.category}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, category: e.target.value }))}
                  disabled={disabled}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  {Object.entries(CATEGORY_CONFIG).map(([key, { label, icon }]) => (
                    <option key={key} value={key}>
                      {icon} {label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Primary Party */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Primary Party (Optional)</label>
                <input
                  type="text"
                  value={newSubject.primary_party_name}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, primary_party_name: e.target.value }))}
                  placeholder="e.g., John Smith"
                  disabled={disabled}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              
              {/* External Reference */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">External Reference (Optional)</label>
                <input
                  type="text"
                  value={newSubject.external_ref}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, external_ref: e.target.value }))}
                  placeholder="e.g., Case #2024-CV-1234, Policy #POL-123456"
                  disabled={disabled}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-700">
              <button
                type="button"
                onClick={() => setMode('select')}
                disabled={disabled}
                className="text-sm text-zinc-400 hover:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewSubject}
                disabled={disabled || !newSubject.title.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-md text-sm font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus weight="bold" className="w-4 h-4" />
                Spawn Thread
              </button>
            </div>
            
            {/* Preview */}
            <div className="mt-3 p-2 bg-zinc-800/50 rounded text-xs text-zinc-500">
              <span className="text-amber-400">Preview:</span> A new RM-ID group (1-99) will be assigned.
              First entry will be <span className="text-amber-400 font-mono">.001</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
