import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const api = axios.create({ withCredentials: true });

import { Books, MagnifyingGlass, X, Sparkle } from '@phosphor-icons/react';
import { Input } from '../../components/ui/input';
import { API, TOPICS, ERAS, TYPE_BADGES } from './constants';
import { SourceCard } from './Cards';

export function IndexTab() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    topic: '',
    jurisdiction: '',
    era: ''
  });
  const [selectedSource, setSelectedSource] = useState(null);
  
  const hasActiveFilters = filters.type || filters.topic || filters.era;
  
  const clearFilters = () => {
    setFilters({ type: '', topic: '', jurisdiction: '', era: '' });
    setSearch('');
  };
  
  useEffect(() => {
    fetchSources();
  }, [filters]);
  
  const fetchSources = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filters.type) params.append('source_type', filters.type);
      if (filters.topic) params.append('topic', filters.topic);
      if (filters.jurisdiction) params.append('jurisdiction', filters.jurisdiction);
      if (filters.era) params.append('era', filters.era);
      
      const res = await api.get(`${API}/archive/sources?${params}`);
      setSources(res.data.sources || []);
    } catch (err) {
      console.error('Failed to fetch sources:', err);
      if (err.response?.status === 401) return;
      try {
        await api.post(`${API}/archive/seed`);
        const res = await api.get(`${API}/archive/sources`);
        setSources(res.data.sources || []);
      } catch (seedErr) {
        console.log('Could not seed archive');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    fetchSources();
  };
  
  return (
    <div className="w-full">
      {/* Search & Filters */}
      <div className="mb-6 space-y-3">
        <form onSubmit={handleSearch} className="relative w-full">
          <MagnifyingGlass className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-white/40" />
          <Input
            placeholder="Search sources, citations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 sm:pl-12 py-3 bg-white/[0.04] backdrop-blur-sm border-white/10 focus:border-vault-gold/50 focus:bg-white/[0.06] text-white text-sm sm:text-base rounded-xl transition-all"
          />
        </form>
        
        <div className="grid grid-cols-3 gap-2 w-full">
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="w-full px-2.5 sm:px-3 py-2.5 bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-xl text-white text-xs sm:text-sm focus:border-vault-gold/50 focus:bg-white/[0.06] outline-none transition-all appearance-none cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23ffffff50' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em', paddingRight: '2rem' }}
          >
            <option value="">All Types</option>
            <option value="PRIMARY_SOURCE">Primary</option>
            <option value="SUPPORTED_INTERPRETATION">Interp.</option>
            <option value="HYPOTHESIS">Hypothesis</option>
          </select>
          
          <select
            value={filters.topic}
            onChange={(e) => setFilters({ ...filters, topic: e.target.value })}
            className="w-full px-2.5 sm:px-3 py-2.5 bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-xl text-white text-xs sm:text-sm focus:border-vault-gold/50 focus:bg-white/[0.06] outline-none transition-all appearance-none cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23ffffff50' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em', paddingRight: '2rem' }}
          >
            <option value="">All Topics</option>
            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          
          <select
            value={filters.era}
            onChange={(e) => setFilters({ ...filters, era: e.target.value })}
            className="w-full px-2.5 sm:px-3 py-2.5 bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-xl text-white text-xs sm:text-sm focus:border-vault-gold/50 focus:bg-white/[0.06] outline-none transition-all appearance-none cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23ffffff50' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em', paddingRight: '2rem' }}
          >
            <option value="">All Eras</option>
            {ERAS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>
      
      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-vault-gold/30 border-t-vault-gold rounded-full animate-spin" />
            <span className="text-vault-muted text-sm">Loading sources...</span>
          </div>
        </div>
      ) : sources.length > 0 ? (
        <div className="grid gap-3 sm:gap-4">
          {sources.map((source, index) => (
            <SourceCard key={source.source_id} source={source} index={index} onClick={() => setSelectedSource(source)} />
          ))}
        </div>
      ) : (
        <EmptyState hasActiveFilters={hasActiveFilters} clearFilters={clearFilters} />
      )}
      
      {/* Source Detail Modal */}
      <AnimatePresence>
        {selectedSource && (
          <SourceDetailModal source={selectedSource} onClose={() => setSelectedSource(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ hasActiveFilters, clearFilters }) {
  return (
    <div className="text-center py-12 sm:py-16">
      <motion.div 
        className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-6"
        whileHover={{ scale: 1.05 }}
      >
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'conic-gradient(from 0deg, transparent, rgba(198, 168, 124, 0.4), transparent, rgba(198, 168, 124, 0.2), transparent)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-1 rounded-xl"
          style={{
            background: 'conic-gradient(from 180deg, transparent, rgba(139, 92, 246, 0.2), transparent, rgba(198, 168, 124, 0.15), transparent)',
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-2 rounded-xl border border-vault-gold/30"
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div className="absolute inset-3 rounded-lg bg-gradient-to-br from-vault-gold/20 to-vault-gold/5 border border-vault-gold/40 backdrop-blur-sm overflow-hidden">
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(45deg, transparent 30%, rgba(198, 168, 124, 0.15) 50%, transparent 70%)',
              backgroundSize: '200% 200%',
            }}
            animate={{ backgroundPosition: ['0% 0%', '200% 200%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        <motion.div
          className="absolute top-1 right-1 w-2 h-2"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0 }}
        >
          <Sparkle className="w-full h-full text-vault-gold" weight="fill" />
        </motion.div>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Books className="w-10 h-10 sm:w-12 sm:h-12 text-vault-gold drop-shadow-[0_0_10px_rgba(198,168,124,0.5)]" weight="duotone" />
          </motion.div>
        </div>
      </motion.div>
      
      <h3 className="text-white font-heading text-lg sm:text-xl mb-2">No Sources Found</h3>
      <p className="text-white/40 text-sm mb-5 max-w-xs mx-auto">
        {hasActiveFilters ? 'Try adjusting your filters' : 'Sources will appear here once available'}
      </p>
      
      {hasActiveFilters && (
        <motion.button
          onClick={clearFilters}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-vault-gold/30 rounded-lg text-white/60 hover:text-white text-sm transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <X className="w-4 h-4" />
          Clear filters
        </motion.button>
      )}
    </div>
  );
}

function SourceDetailModal({ source, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0a0f1a] border border-white/10 rounded-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-white/10 flex items-start justify-between">
          <div>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border mb-2 ${TYPE_BADGES[source.source_type]?.color}`}>
              {TYPE_BADGES[source.source_type]?.label}
            </span>
            <h2 className="text-white font-heading text-xl">{source.title}</h2>
            <p className="text-vault-gold font-mono text-sm mt-1">{source.citation}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {source.excerpt && (
            <div>
              <h4 className="text-white/60 text-xs uppercase tracking-wider mb-2">Excerpt</h4>
              <p className="text-white/80 text-sm italic border-l-2 border-vault-gold/30 pl-4">
                &ldquo;{source.excerpt}&rdquo;
              </p>
            </div>
          )}
          
          {source.notes && (
            <div>
              <h4 className="text-white/60 text-xs uppercase tracking-wider mb-2">Notes</h4>
              <p className="text-white/70 text-sm">{source.notes}</p>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
            {source.jurisdiction && (
              <span className="px-2 py-1 bg-white/5 rounded text-xs text-white/50">
                {source.jurisdiction}
              </span>
            )}
            {source.era_tags?.map(era => (
              <span key={era} className="px-2 py-1 bg-white/5 rounded text-xs text-white/50">
                {era}
              </span>
            ))}
            {source.topic_tags?.map(topic => (
              <span key={topic} className="px-2 py-1 bg-vault-gold/10 rounded text-xs text-vault-gold/70">
                {topic}
              </span>
            ))}
          </div>
        </div>
        
        <div className="p-4 border-t border-white/10 bg-white/[0.02]">
          <p className="text-white/30 text-xs text-center">
            Educational only. Not legal advice.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
