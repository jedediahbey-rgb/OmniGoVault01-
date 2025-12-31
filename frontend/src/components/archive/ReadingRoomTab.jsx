import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const api = axios.create({ withCredentials: true });

import { Brain, Sparkle, Clock } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { API } from './constants';

export function ReadingRoomTab() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  
  const handleQuery = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const res = await api.post(`${API}/archive/reading-room/query`, { query });
      setResponse(res.data);
      setHistory([{ query, response: res.data }, ...history.slice(0, 9)]);
    } catch (err) {
      toast.error('Failed to query archive');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto">
      {/* Header with animated icon */}
      <motion.div 
        className="text-center mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div 
          className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-vault-gold/20 to-vault-gold/5 border border-vault-gold/30 flex items-center justify-center mx-auto mb-5"
          whileHover={{ scale: 1.05, borderColor: 'rgba(198, 168, 124, 0.5)' }}
        >
          <motion.div
            className="absolute inset-0 rounded-2xl border border-vault-gold/30"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <Brain className="w-10 h-10 text-vault-gold" weight="duotone" />
        </motion.div>
        
        <h2 className="text-white font-heading text-3xl mb-3">The Archive Desk</h2>
        <p className="text-white/50">Citation-first answers from the Black Archive</p>
      </motion.div>
      
      {/* Query Input */}
      <motion.form 
        onSubmit={handleQuery} 
        className="mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div 
          className={`relative rounded-xl overflow-hidden transition-all duration-300 ${
            isFocused ? 'ring-2 ring-vault-gold/30 shadow-[0_0_30px_rgba(198,168,124,0.15)]' : ''
          }`}
        >
          {isFocused && (
            <motion.div
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(198, 168, 124, 0.1), transparent)',
                backgroundSize: '200% 100%',
              }}
              animate={{ backgroundPosition: ['0% 50%', '200% 50%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          )}
          
          <Input
            placeholder="Ask about doctrine, terms, or legal concepts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="pr-28 py-5 bg-white/5 border-white/10 focus:border-vault-gold text-white text-lg rounded-xl"
          />
          <Button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary rounded-lg"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkle className="w-5 h-5" />
              </motion.div>
            ) : 'Query'}
          </Button>
        </motion.div>
      </motion.form>
      
      {/* Response */}
      <AnimatePresence mode="wait">
        {response && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-2xl p-6 overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-8 h-8">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-vault-gold/50 to-transparent" />
              <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-vault-gold/50 to-transparent" />
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8">
              <div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-l from-vault-gold/50 to-transparent" />
              <div className="absolute bottom-0 right-0 w-px h-full bg-gradient-to-t from-vault-gold/50 to-transparent" />
            </div>
            
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-white/80">{response.response}</div>
            </div>
            
            {response.suggestions?.length > 0 && (
              <div className="mt-6 pt-4 border-t border-white/10">
                <h4 className="text-white/50 text-xs uppercase tracking-wider mb-3">Related Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {response.suggestions.map((s, i) => (
                    <motion.button
                      key={i}
                      onClick={() => setQuery(s)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-vault-gold/10 border border-white/10 hover:border-vault-gold/30 rounded-lg text-white/60 hover:text-vault-gold text-sm transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-white/30 text-xs mt-6 text-center">
              Educational only. Not legal advice.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* History */}
      {history.length > 1 && (
        <motion.div 
          className="mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-white/50 text-xs uppercase tracking-wider mb-4">Recent Queries</h3>
          <div className="space-y-2">
            {history.slice(1).map((h, i) => (
              <motion.button
                key={i}
                onClick={() => setQuery(h.query)}
                className="w-full text-left p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-xl text-white/60 hover:text-white text-sm transition-all group"
                whileHover={{ x: 5 }}
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-white/30 group-hover:text-vault-gold/50 transition-colors" />
                  <span>{h.query}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
