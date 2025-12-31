import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Seal,
  BookOpen,
  Eye,
  Certificate,
  Stack,
  Warning,
  TreeStructure,
  Lightning,
  Tag,
  CaretRight
} from '@phosphor-icons/react';
import { TYPE_BADGES, STATUS_BADGES } from './constants';

export function SourceCard({ source, onClick }) {
  const badge = TYPE_BADGES[source.source_type] || TYPE_BADGES.HYPOTHESIS;
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className="relative p-4 bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-xl cursor-pointer group overflow-hidden"
      whileHover={{ y: -2, borderColor: 'rgba(198, 168, 124, 0.4)' }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-vault-gold/5 to-transparent opacity-0"
        animate={{ opacity: isHovered ? 1 : 0 }}
      />
      
      {/* Scanning line effect on hover */}
      {isHovered && (
        <motion.div
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-vault-gold/50 to-transparent"
          initial={{ top: 0 }}
          animate={{ top: '100%' }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
      
      <div className="relative flex items-start gap-3">
        {source.source_type === 'PRIMARY_SOURCE' && (
          <motion.div 
            className="w-10 h-10 rounded-lg bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center shrink-0"
            animate={isHovered ? { scale: [1, 1.1, 1], rotate: [0, 5, 0] } : {}}
            transition={{ duration: 0.5 }}
          >
            <Seal className="w-5 h-5 text-vault-gold" weight="fill" />
          </motion.div>
        )}
        {source.source_type !== 'PRIMARY_SOURCE' && (
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-white/20 transition-colors">
            <BookOpen className="w-5 h-5 text-white/50 group-hover:text-white/70 transition-colors" weight="duotone" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-white font-medium text-sm line-clamp-2 group-hover:text-vault-gold/90 transition-colors">{source.title}</h3>
            <motion.span 
              className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium border ${badge.color}`}
              whileHover={{ scale: 1.05 }}
            >
              {badge.label}
            </motion.span>
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
        
        {/* View indicator */}
        <motion.div
          className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
          initial={{ x: -10 }}
          animate={{ x: isHovered ? 0 : -10 }}
        >
          <Eye className="w-4 h-4 text-vault-gold/50" weight="duotone" />
        </motion.div>
      </div>
    </motion.div>
  );
}

export function ClaimCard({ claim, onClick }) {
  const status = STATUS_BADGES[claim.status] || STATUS_BADGES.UNVERIFIED;
  const StatusIcon = status.icon;
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className="relative p-5 bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-xl cursor-pointer overflow-hidden group"
      whileHover={{ y: -4, boxShadow: '0 20px 40px -20px rgba(198, 168, 124, 0.2)' }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Animated border gradient */}
      <motion.div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'linear-gradient(135deg, rgba(198, 168, 124, 0.2) 0%, transparent 50%, rgba(198, 168, 124, 0.1) 100%)',
        }}
      />
      
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-4 h-4">
        <motion.div
          className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-vault-gold/50 to-transparent"
          animate={{ scaleX: isHovered ? 1 : 0.5 }}
        />
        <motion.div
          className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-vault-gold/50 to-transparent"
          animate={{ scaleY: isHovered ? 1 : 0.5 }}
        />
      </div>
      <div className="absolute bottom-0 right-0 w-4 h-4">
        <motion.div
          className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-l from-vault-gold/50 to-transparent"
          animate={{ scaleX: isHovered ? 1 : 0.5 }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-px h-full bg-gradient-to-t from-vault-gold/50 to-transparent"
          animate={{ scaleY: isHovered ? 1 : 0.5 }}
        />
      </div>
      
      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-3">
          <motion.div 
            className="w-12 h-12 rounded-xl bg-[#0a0f1a] border border-white/10 flex items-center justify-center shrink-0 group-hover:border-vault-gold/30 transition-colors"
            animate={isHovered ? { rotate: [0, -5, 5, 0] } : {}}
            transition={{ duration: 0.5 }}
          >
            <Certificate className="w-6 h-6 text-vault-gold" weight="duotone" />
          </motion.div>
          <motion.span 
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${status.color}`}
            whileHover={{ scale: 1.05 }}
          >
            <StatusIcon className="w-3.5 h-3.5" weight="fill" />
            {status.label}
          </motion.span>
        </div>
        
        <h3 className="text-white font-heading text-base mb-2 line-clamp-2 group-hover:text-vault-gold/90 transition-colors">{claim.title}</h3>
        <p className="text-white/50 text-sm line-clamp-3 mb-3">{claim.body}</p>
        
        <div className="flex items-center gap-3 text-xs">
          <motion.span 
            className="text-vault-gold/60 flex items-center gap-1"
            animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
          >
            <Stack className="w-3.5 h-3.5" />
            {claim.evidence_source_ids?.length || 0} sources
          </motion.span>
          {claim.counter_source_ids?.length > 0 && (
            <motion.span 
              className="text-orange-400/60 flex items-center gap-1"
              animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
            >
              <Warning className="w-3.5 h-3.5" />
              {claim.counter_source_ids.length} counter
            </motion.span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function TrailCard({ trail, onClick }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className="relative p-5 bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-xl cursor-pointer group overflow-hidden"
      whileHover={{ 
        y: -3, 
        borderColor: 'rgba(198, 168, 124, 0.4)',
        boxShadow: '0 15px 30px -10px rgba(198, 168, 124, 0.15)'
      }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Animated path line */}
      <motion.div
        className="absolute left-8 top-0 bottom-0 w-px"
        style={{
          background: isHovered 
            ? 'linear-gradient(to bottom, transparent, rgba(198, 168, 124, 0.5), transparent)'
            : 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.1), transparent)'
        }}
      />
      
      {/* Moving dot on path */}
      {isHovered && (
        <motion.div
          className="absolute left-[30px] w-2 h-2 rounded-full bg-vault-gold shadow-[0_0_10px_rgba(198,168,124,0.8)]"
          initial={{ top: 0 }}
          animate={{ top: '100%' }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      )}
      
      <div className="flex items-start gap-4">
        <motion.div 
          className="w-14 h-14 rounded-xl bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center shrink-0 group-hover:bg-vault-gold/20 transition-colors"
          animate={isHovered ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.4 }}
        >
          <TreeStructure className="w-7 h-7 text-vault-gold" weight="duotone" />
        </motion.div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-heading text-lg mb-1 group-hover:text-vault-gold transition-colors">{trail.title}</h3>
          <p className="text-white/50 text-sm line-clamp-2 mb-3">{trail.description}</p>
          
          <div className="flex items-center gap-4 text-xs">
            <motion.span 
              className="text-vault-gold/60 flex items-center gap-1"
              animate={isHovered ? { x: [0, 3, 0] } : {}}
              transition={{ duration: 0.5 }}
            >
              <Lightning className="w-3.5 h-3.5" />
              {trail.steps?.length || 0} steps
            </motion.span>
            <span className="text-white/40 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              {trail.topic_tags?.join(', ')}
            </span>
          </div>
        </div>
        
        <motion.div
          className="shrink-0"
          animate={{ x: isHovered ? 5 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <CaretRight className="w-5 h-5 text-white/20 group-hover:text-vault-gold transition-colors" weight="bold" />
        </motion.div>
      </div>
    </motion.div>
  );
}
