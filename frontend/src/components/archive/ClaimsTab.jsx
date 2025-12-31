import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const api = axios.create({ withCredentials: true });

import { Certificate, Stack, Warning, X, Scales, Lightning } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { API, STATUS_BADGES } from './constants';
import { ClaimCard } from './Cards';

export function ClaimsTab() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  
  useEffect(() => {
    fetchClaims();
  }, [statusFilter]);
  
  const fetchClaims = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      const res = await api.get(`${API}/archive/claims?${params}`);
      setClaims(res.data.claims || []);
    } catch (err) {
      console.error('Failed to fetch claims:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const openClaim = async (claim) => {
    try {
      const res = await api.get(`${API}/archive/claims/${claim.claim_id}`);
      setSelectedClaim(res.data);
    } catch (err) {
      toast.error('Failed to load dossier');
    }
  };
  
  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-48 bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden relative">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {['', 'VERIFIED', 'DISPUTED', 'UNVERIFIED'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-vault-gold text-black'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {status || 'All'}
          </button>
        ))}
      </div>
      
      {claims.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {claims.map((claim, index) => (
            <ClaimCard key={claim.claim_id} claim={claim} index={index} onClick={() => openClaim(claim)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/30 animate-spin-slow"
                 style={{ animationDuration: '20s' }} />
            <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/30" />
            <div className="absolute inset-2 rounded-xl bg-amber-500/10 animate-pulse-slow" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Certificate className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500" weight="duotone" />
            </div>
          </div>
          
          <h3 className="text-white font-heading text-lg sm:text-xl mb-2">No Dossiers Found</h3>
          <p className="text-white/40 text-sm">Try adjusting your filters</p>
        </div>
      )}
      
      {/* Claim Detail Modal */}
      <AnimatePresence>
        {selectedClaim && (
          <ClaimDetailModal claim={selectedClaim} onClose={() => setSelectedClaim(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ClaimDetailModal({ claim, onClose }) {
  const statusBadge = STATUS_BADGES[claim.status];
  const StatusIcon = statusBadge?.icon;
  
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
        className="w-full max-w-3xl bg-[#0a0f1a] border border-white/10 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 sticky top-0 bg-[#0a0f1a]">
          <div className="flex items-start justify-between">
            <div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border mb-3 ${statusBadge?.color}`}>
                {StatusIcon && <StatusIcon className="w-3.5 h-3.5" weight="fill" />}
                {statusBadge?.label}
              </span>
              <h2 className="text-white font-heading text-xl">{claim.title}</h2>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          <div>
            <p className="text-white/80 leading-relaxed">{claim.body}</p>
          </div>
          
          {/* Evidence Spine */}
          {claim.evidence_sources?.length > 0 && (
            <div>
              <h4 className="text-vault-gold text-sm font-medium flex items-center gap-2 mb-3">
                <Stack className="w-4 h-4" />
                Evidence Spine ({claim.evidence_sources.length})
              </h4>
              <div className="space-y-2">
                {claim.evidence_sources.map(source => (
                  <div key={source.source_id} className="p-3 bg-vault-gold/5 border border-vault-gold/20 rounded-lg">
                    <p className="text-white text-sm font-medium">{source.title}</p>
                    <p className="text-vault-gold/60 text-xs font-mono">{source.citation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Counter Spine */}
          {claim.counter_sources?.length > 0 && (
            <div>
              <h4 className="text-orange-400 text-sm font-medium flex items-center gap-2 mb-3">
                <Warning className="w-4 h-4" />
                Counter-Spine ({claim.counter_sources.length})
              </h4>
              <div className="space-y-2">
                {claim.counter_sources.map(source => (
                  <div key={source.source_id} className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                    <p className="text-white text-sm font-medium">{source.title}</p>
                    <p className="text-orange-400/60 text-xs font-mono">{source.citation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Reality Check */}
          {claim.reality_check && (
            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <h4 className="text-blue-400 text-sm font-medium flex items-center gap-2 mb-2">
                <Scales className="w-4 h-4" />
                Reality Check
              </h4>
              <p className="text-white/70 text-sm">{claim.reality_check}</p>
            </div>
          )}
          
          {/* Practical Takeaway */}
          {claim.practical_takeaway && (
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
              <h4 className="text-green-400 text-sm font-medium flex items-center gap-2 mb-2">
                <Lightning className="w-4 h-4" />
                Practical Takeaway
              </h4>
              <p className="text-white/70 text-sm">{claim.practical_takeaway}</p>
            </div>
          )}
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
