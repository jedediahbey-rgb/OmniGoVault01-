import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Archive,
  Books,
  BookOpen,
  Brain,
  CaretRight,
  Certificate,
  Clock,
  File,
  FileText,
  Folders,
  GitBranch,
  Lightning,
  MagnifyingGlass,
  MapTrifold,
  Scales,
  Seal,
  SealCheck,
  ShieldWarning,
  Sparkle,
  Stack,
  Tag,
  TreeStructure,
  Warning,
  X
} from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Tab configurations
const TABS = [
  { id: 'index', label: 'The Black Index', icon: Books },
  { id: 'trails', label: 'Doctrine Tracks', icon: GitBranch },
  { id: 'claims', label: 'Dossiers', icon: FileText },
  { id: 'map', label: 'Archive Map', icon: MapTrifold },
  { id: 'reading', label: 'Archive Desk', icon: Brain }
];

// Type badges
const TYPE_BADGES = {
  PRIMARY_SOURCE: { label: 'Primary', color: 'bg-vault-gold/20 text-vault-gold border-vault-gold/30' },
  SUPPORTED_INTERPRETATION: { label: 'Interpretation', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  HYPOTHESIS: { label: 'Hypothesis', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' }
};

// Status badges
const STATUS_BADGES = {
  VERIFIED: { label: 'Verified', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: SealCheck },
  DISPUTED: { label: 'Disputed', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Warning },
  UNVERIFIED: { label: 'Unverified', color: 'bg-white/10 text-white/50 border-white/20', icon: ShieldWarning }
};

// Topic options
const TOPICS = [
  'Trusts', 'Equity', 'Fiduciary Duties', 'Negotiable Instruments', 
  'Monetary History', 'Legal Tender', 'Constitutional Structure'
];

// Era options
const ERAS = ['1600-1900', '1900-1932', '1933-1945', 'Modern'];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Source Card
function SourceCard({ source, onClick }) {
  const badge = TYPE_BADGES[source.source_type] || TYPE_BADGES.HYPOTHESIS;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="p-4 bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-xl cursor-pointer hover:border-vault-gold/30 transition-all group"
    >
      <div className="flex items-start gap-3">
        {source.source_type === 'PRIMARY_SOURCE' && (
          <div className="w-10 h-10 rounded-lg bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center shrink-0">
            <Seal className="w-5 h-5 text-vault-gold" weight="fill" />
          </div>
        )}
        {source.source_type !== 'PRIMARY_SOURCE' && (
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-white/50" weight="duotone" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-white font-medium text-sm line-clamp-2">{source.title}</h3>
            <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium border ${badge.color}`}>
              {badge.label}
            </span>
          </div>
          
          <p className="text-vault-gold/60 text-xs font-mono mb-2">{source.citation}</p>
          
          {source.excerpt && (
            <p className="text-white/50 text-xs line-clamp-2">{source.excerpt}</p>
          )}
          
          <div className="flex items-center gap-2 mt-2">
            {source.jurisdiction && (
              <span className="text-white/30 text-[10px]">{source.jurisdiction}</span>
            )}
            {source.era_tags?.[0] && (
              <span className="text-white/30 text-[10px]">• {source.era_tags[0]}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Claim Card (Dossier)
function ClaimCard({ claim, onClick }) {
  const status = STATUS_BADGES[claim.status] || STATUS_BADGES.UNVERIFIED;
  const StatusIcon = status.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="p-5 bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-xl cursor-pointer hover:border-vault-gold/30 transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-[#0a0f1a] border border-white/10 flex items-center justify-center shrink-0">
          <Certificate className="w-6 h-6 text-vault-gold" weight="duotone" />
        </div>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${status.color}`}>
          <StatusIcon className="w-3.5 h-3.5" weight="fill" />
          {status.label}
        </span>
      </div>
      
      <h3 className="text-white font-heading text-base mb-2 line-clamp-2">{claim.title}</h3>
      <p className="text-white/50 text-sm line-clamp-3 mb-3">{claim.body}</p>
      
      <div className="flex items-center gap-3 text-xs">
        <span className="text-vault-gold/60 flex items-center gap-1">
          <Stack className="w-3.5 h-3.5" />
          {claim.evidence_source_ids?.length || 0} sources
        </span>
        {claim.counter_source_ids?.length > 0 && (
          <span className="text-orange-400/60 flex items-center gap-1">
            <Warning className="w-3.5 h-3.5" />
            {claim.counter_source_ids.length} counter
          </span>
        )}
      </div>
    </motion.div>
  );
}

// Trail Card
function TrailCard({ trail, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="p-5 bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-xl cursor-pointer hover:border-vault-gold/30 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center shrink-0">
          <TreeStructure className="w-7 h-7 text-vault-gold" weight="duotone" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-heading text-lg mb-1">{trail.title}</h3>
          <p className="text-white/50 text-sm line-clamp-2 mb-3">{trail.description}</p>
          
          <div className="flex items-center gap-4 text-xs">
            <span className="text-vault-gold/60 flex items-center gap-1">
              <Lightning className="w-3.5 h-3.5" />
              {trail.steps?.length || 0} steps
            </span>
            <span className="text-white/40 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              {trail.topic_tags?.join(', ')}
            </span>
          </div>
        </div>
        
        <CaretRight className="w-5 h-5 text-white/20 group-hover:text-vault-gold transition-colors shrink-0" weight="bold" />
      </div>
    </motion.div>
  );
}

// ============================================================================
// INDEX TAB
// ============================================================================

function IndexTab() {
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
      
      const res = await axios.get(`${API}/archive/sources?${params}`);
      setSources(res.data.sources || []);
    } catch (err) {
      console.error('Failed to fetch sources:', err);
      // Try seeding if empty
      if (err.response?.status === 401) return;
      try {
        await axios.post(`${API}/archive/seed`);
        const res = await axios.get(`${API}/archive/sources`);
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
    <div>
      {/* Search & Filters */}
      <div className="mb-6 space-y-4">
        <form onSubmit={handleSearch} className="relative">
          <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <Input
            placeholder="Search sources, citations, excerpts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 py-3 bg-white/5 border-white/10 focus:border-vault-gold text-white"
          />
        </form>
        
        <div className="flex flex-wrap gap-2">
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-vault-gold outline-none"
          >
            <option value="">All Types</option>
            <option value="PRIMARY_SOURCE">Primary Source</option>
            <option value="SUPPORTED_INTERPRETATION">Interpretation</option>
            <option value="HYPOTHESIS">Hypothesis</option>
          </select>
          
          <select
            value={filters.topic}
            onChange={(e) => setFilters({ ...filters, topic: e.target.value })}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-vault-gold outline-none"
          >
            <option value="">All Topics</option>
            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          
          <select
            value={filters.era}
            onChange={(e) => setFilters({ ...filters, era: e.target.value })}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-vault-gold outline-none"
          >
            <option value="">All Eras</option>
            {ERAS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>
      
      {/* Results */}
      {loading ? (
        <div className="grid gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sources.length > 0 ? (
        <div className="grid gap-4">
          {sources.map(source => (
            <SourceCard key={source.source_id} source={source} onClick={() => setSelectedSource(source)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Archive className="w-16 h-16 text-white/10 mx-auto mb-4" weight="duotone" />
          <h3 className="text-white text-lg mb-2">No Sources Found</h3>
          <p className="text-white/50 text-sm">Try adjusting your search or filters</p>
        </div>
      )}
      
      {/* Source Detail Modal */}
      <AnimatePresence>
        {selectedSource && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedSource(null)}
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
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border mb-2 ${TYPE_BADGES[selectedSource.source_type]?.color}`}>
                    {TYPE_BADGES[selectedSource.source_type]?.label}
                  </span>
                  <h2 className="text-white font-heading text-xl">{selectedSource.title}</h2>
                  <p className="text-vault-gold font-mono text-sm mt-1">{selectedSource.citation}</p>
                </div>
                <button onClick={() => setSelectedSource(null)} className="text-white/40 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {selectedSource.excerpt && (
                  <div>
                    <h4 className="text-white/60 text-xs uppercase tracking-wider mb-2">Excerpt</h4>
                    <p className="text-white/80 text-sm italic border-l-2 border-vault-gold/30 pl-4">
                      "{selectedSource.excerpt}"
                    </p>
                  </div>
                )}
                
                {selectedSource.notes && (
                  <div>
                    <h4 className="text-white/60 text-xs uppercase tracking-wider mb-2">Notes</h4>
                    <p className="text-white/70 text-sm">{selectedSource.notes}</p>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                  {selectedSource.jurisdiction && (
                    <span className="px-2 py-1 bg-white/5 rounded text-xs text-white/50">
                      {selectedSource.jurisdiction}
                    </span>
                  )}
                  {selectedSource.era_tags?.map(era => (
                    <span key={era} className="px-2 py-1 bg-white/5 rounded text-xs text-white/50">
                      {era}
                    </span>
                  ))}
                  {selectedSource.topic_tags?.map(topic => (
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
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// TRAILS TAB
// ============================================================================

function TrailsTab() {
  const [trails, setTrails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrail, setSelectedTrail] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  useEffect(() => {
    fetchTrails();
  }, []);
  
  const fetchTrails = async () => {
    try {
      const res = await axios.get(`${API}/archive/trails`);
      setTrails(res.data.trails || []);
    } catch (err) {
      console.error('Failed to fetch trails:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const openTrail = async (trail) => {
    try {
      const res = await axios.get(`${API}/archive/trails/${trail.trail_id}`);
      setSelectedTrail(res.data);
      setCurrentStep(0);
    } catch (err) {
      toast.error('Failed to load trail');
    }
  };
  
  if (loading) {
    return (
      <div className="grid gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }
  
  if (selectedTrail) {
    const step = selectedTrail.steps?.[currentStep];
    
    return (
      <div>
        <button
          onClick={() => setSelectedTrail(null)}
          className="flex items-center gap-2 text-white/50 hover:text-white mb-6 text-sm"
        >
          <CaretRight className="w-4 h-4 rotate-180" />
          Back to Tracks
        </button>
        
        <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
          {/* Trail Header */}
          <div className="p-6 border-b border-white/10">
            <h2 className="text-white font-heading text-2xl mb-2">{selectedTrail.title}</h2>
            <p className="text-white/50">{selectedTrail.description}</p>
            
            {/* Progress */}
            <div className="flex items-center gap-2 mt-4">
              {selectedTrail.steps?.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                    i === currentStep 
                      ? 'bg-vault-gold text-black' 
                      : i < currentStep 
                        ? 'bg-vault-gold/20 text-vault-gold' 
                        : 'bg-white/5 text-white/30'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
          
          {/* Current Step */}
          {step && (
            <div className="p-6">
              <h3 className="text-vault-gold font-heading text-xl mb-4">{step.title}</h3>
              <p className="text-white/70 leading-relaxed mb-6">{step.content}</p>
              
              {step.key_definitions?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-white/50 text-xs uppercase tracking-wider mb-2">Key Terms</h4>
                  <div className="flex flex-wrap gap-2">
                    {step.key_definitions.map(term => (
                      <span key={term} className="px-3 py-1 bg-vault-gold/10 border border-vault-gold/20 rounded-lg text-vault-gold text-sm">
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-white/10">
                <Button
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  variant="outline"
                  className="text-white/60 border-white/20 disabled:opacity-30"
                >
                  Previous
                </Button>
                
                {currentStep < (selectedTrail.steps?.length || 0) - 1 ? (
                  <Button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="btn-primary"
                  >
                    Next Step
                  </Button>
                ) : (
                  <Button
                    onClick={() => setSelectedTrail(null)}
                    className="btn-primary"
                  >
                    Complete Trail
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {/* Reality Check */}
          {selectedTrail.reality_check && currentStep === (selectedTrail.steps?.length || 0) - 1 && (
            <div className="p-6 bg-orange-500/5 border-t border-orange-500/20">
              <h4 className="text-orange-400 font-medium flex items-center gap-2 mb-2">
                <Warning className="w-5 h-5" />
                Reality Check
              </h4>
              <p className="text-white/70 text-sm">{selectedTrail.reality_check}</p>
            </div>
          )}
        </div>
        
        <p className="text-white/30 text-xs text-center mt-6">
          Educational only. Not legal advice.
        </p>
      </div>
    );
  }
  
  return (
    <div>
      {trails.length > 0 ? (
        <div className="grid gap-4">
          {trails.map(trail => (
            <TrailCard key={trail.trail_id} trail={trail} onClick={() => openTrail(trail)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <TreeStructure className="w-16 h-16 text-white/10 mx-auto mb-4" weight="duotone" />
          <h3 className="text-white text-lg mb-2">No Tracks Available</h3>
          <p className="text-white/50 text-sm">Doctrine tracks are being curated</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CLAIMS (DOSSIERS) TAB
// ============================================================================

function ClaimsTab() {
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
      const res = await axios.get(`${API}/archive/claims?${params}`);
      setClaims(res.data.claims || []);
    } catch (err) {
      console.error('Failed to fetch claims:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const openClaim = async (claim) => {
    try {
      const res = await axios.get(`${API}/archive/claims/${claim.claim_id}`);
      setSelectedClaim(res.data);
    } catch (err) {
      toast.error('Failed to load dossier');
    }
  };
  
  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-48 bg-white/5 rounded-xl animate-pulse" />
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
          {claims.map(claim => (
            <ClaimCard key={claim.claim_id} claim={claim} onClick={() => openClaim(claim)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Certificate className="w-16 h-16 text-white/10 mx-auto mb-4" weight="duotone" />
          <h3 className="text-white text-lg mb-2">No Dossiers Found</h3>
          <p className="text-white/50 text-sm">Try adjusting your filters</p>
        </div>
      )}
      
      {/* Claim Detail Modal */}
      <AnimatePresence>
        {selectedClaim && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedClaim(null)}
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
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border mb-3 ${STATUS_BADGES[selectedClaim.status]?.color}`}>
                      {STATUS_BADGES[selectedClaim.status]?.icon && (
                        <span>{React.createElement(STATUS_BADGES[selectedClaim.status].icon, { className: 'w-3.5 h-3.5', weight: 'fill' })}</span>
                      )}
                      {STATUS_BADGES[selectedClaim.status]?.label}
                    </span>
                    <h2 className="text-white font-heading text-xl">{selectedClaim.title}</h2>
                  </div>
                  <button onClick={() => setSelectedClaim(null)} className="text-white/40 hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-6">
                <div>
                  <p className="text-white/80 leading-relaxed">{selectedClaim.body}</p>
                </div>
                
                {/* Evidence Spine */}
                {selectedClaim.evidence_sources?.length > 0 && (
                  <div>
                    <h4 className="text-vault-gold text-sm font-medium flex items-center gap-2 mb-3">
                      <Stack className="w-4 h-4" />
                      Evidence Spine ({selectedClaim.evidence_sources.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedClaim.evidence_sources.map(source => (
                        <div key={source.source_id} className="p-3 bg-vault-gold/5 border border-vault-gold/20 rounded-lg">
                          <p className="text-white text-sm font-medium">{source.title}</p>
                          <p className="text-vault-gold/60 text-xs font-mono">{source.citation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Counter Spine */}
                {selectedClaim.counter_sources?.length > 0 && (
                  <div>
                    <h4 className="text-orange-400 text-sm font-medium flex items-center gap-2 mb-3">
                      <Warning className="w-4 h-4" />
                      Counter-Spine ({selectedClaim.counter_sources.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedClaim.counter_sources.map(source => (
                        <div key={source.source_id} className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                          <p className="text-white text-sm font-medium">{source.title}</p>
                          <p className="text-orange-400/60 text-xs font-mono">{source.citation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Reality Check */}
                {selectedClaim.reality_check && (
                  <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                    <h4 className="text-blue-400 text-sm font-medium flex items-center gap-2 mb-2">
                      <Scales className="w-4 h-4" />
                      Reality Check
                    </h4>
                    <p className="text-white/70 text-sm">{selectedClaim.reality_check}</p>
                  </div>
                )}
                
                {/* Practical Takeaway */}
                {selectedClaim.practical_takeaway && (
                  <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                    <h4 className="text-green-400 text-sm font-medium flex items-center gap-2 mb-2">
                      <Lightning className="w-4 h-4" />
                      Practical Takeaway
                    </h4>
                    <p className="text-white/70 text-sm">{selectedClaim.practical_takeaway}</p>
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
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// READING ROOM TAB
// ============================================================================

function ReadingRoomTab() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  
  const handleQuery = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const res = await axios.post(`${API}/archive/reading-room/query`, { query });
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
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center mx-auto mb-4">
          <Brain className="w-8 h-8 text-vault-gold" weight="duotone" />
        </div>
        <h2 className="text-white font-heading text-2xl mb-2">The Archive Desk</h2>
        <p className="text-white/50">Citation-first answers from the Black Archive</p>
      </div>
      
      <form onSubmit={handleQuery} className="mb-8">
        <div className="relative">
          <Input
            placeholder="Ask about doctrine, terms, or legal concepts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pr-24 py-4 bg-white/5 border-white/10 focus:border-vault-gold text-white text-lg"
          />
          <Button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary"
          >
            {loading ? <Sparkle className="w-5 h-5 animate-spin" /> : 'Query'}
          </Button>
        </div>
      </form>
      
      {response && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl p-6"
        >
          <div className="prose prose-invert prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-white/80">{response.response}</div>
          </div>
          
          {response.suggestions?.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <h4 className="text-white/50 text-xs uppercase tracking-wider mb-2">Suggestions</h4>
              <div className="flex flex-wrap gap-2">
                {response.suggestions.map((s, i) => (
                  <span key={i} className="px-3 py-1 bg-white/5 rounded-lg text-white/60 text-sm">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <p className="text-white/30 text-xs mt-6 text-center">
            Educational only. Not legal advice.
          </p>
        </motion.div>
      )}
      
      {history.length > 1 && (
        <div className="mt-8">
          <h3 className="text-white/50 text-xs uppercase tracking-wider mb-4">Recent Queries</h3>
          <div className="space-y-2">
            {history.slice(1).map((h, i) => (
              <button
                key={i}
                onClick={() => setQuery(h.query)}
                className="w-full text-left p-3 bg-white/5 rounded-lg text-white/60 text-sm hover:bg-white/10 transition-colors"
              >
                {h.query}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ARCHIVE MAP TAB (Placeholder - Phase B)
// ============================================================================

function ArchiveMapTab() {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
        <MapTrifold className="w-10 h-10 text-white/20" weight="duotone" />
      </div>
      <h3 className="text-white font-heading text-xl mb-2">Archive Map</h3>
      <p className="text-white/50 mb-4">Interactive doctrine relationship visualization</p>
      <span className="px-4 py-2 bg-vault-gold/10 border border-vault-gold/20 rounded-lg text-vault-gold text-sm">
        Coming in Phase B
      </span>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function BlackArchivePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'index';
  
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };
  
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-[#0a0f1a] border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-black border border-vault-gold/30 flex items-center justify-center">
              <Archive className="w-7 h-7 text-vault-gold" weight="fill" />
            </div>
            <div>
              <h1 className="text-white font-heading text-2xl sm:text-3xl">Black Archive</h1>
              <p className="text-white/50 text-sm">Primary sources. Doctrine trails. Citation-first learning.</p>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex overflow-x-auto gap-1 mt-6 pb-2 -mx-4 px-4 scrollbar-hide">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-vault-gold text-black'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <tab.icon className="w-4 h-4" weight="duotone" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'index' && <IndexTab />}
        {activeTab === 'trails' && <TrailsTab />}
        {activeTab === 'claims' && <ClaimsTab />}
        {activeTab === 'map' && <ArchiveMapTab />}
        {activeTab === 'reading' && <ReadingRoomTab />}
      </div>
    </div>
  );
}
