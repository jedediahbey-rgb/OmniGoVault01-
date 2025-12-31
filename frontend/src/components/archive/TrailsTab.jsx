import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

const api = axios.create({ withCredentials: true });

import { CaretRight, GitBranch, Warning } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { API } from './constants';
import { TrailCard } from './Cards';

export function TrailsTab() {
  const [trails, setTrails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrail, setSelectedTrail] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  useEffect(() => {
    fetchTrails();
  }, []);
  
  const fetchTrails = async () => {
    try {
      const res = await api.get(`${API}/archive/trails`);
      setTrails(res.data.trails || []);
    } catch (err) {
      console.error('Failed to fetch trails:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const openTrail = async (trail) => {
    try {
      const res = await api.get(`${API}/archive/trails/${trail.trail_id}`);
      setSelectedTrail(res.data);
      setCurrentStep(0);
    } catch (err) {
      toast.error('Failed to load trail');
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-vault-gold/30 border-t-vault-gold rounded-full animate-spin" />
          <span className="text-vault-muted text-sm">Loading doctrine trails...</span>
        </div>
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
          {trails.map((trail, index) => (
            <TrailCard key={trail.trail_id} trail={trail} index={index} onClick={() => openTrail(trail)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5">
            <div className="absolute inset-0 rounded-2xl border border-purple-500/30 animate-spin-slow" 
                 style={{ animationDuration: '10s' }} />
            <div className="absolute inset-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-vault-gold/10 border border-purple-500/40" />
            <div className="absolute inset-2 rounded-lg border border-purple-400/30 animate-pulse-slow" />
            <div className="absolute inset-0 flex items-center justify-center">
              <GitBranch className="w-10 h-10 sm:w-12 sm:h-12 text-purple-400" weight="duotone" />
            </div>
          </div>
          
          <h3 className="text-white font-heading text-lg sm:text-xl mb-2">No Tracks Available</h3>
          <p className="text-white/40 text-sm">Doctrine tracks are being curated</p>
        </div>
      )}
    </div>
  );
}
