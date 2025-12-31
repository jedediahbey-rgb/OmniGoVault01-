/**
 * Black Archive Constants and Configuration
 */
import {
  Books,
  GitBranch,
  FileText,
  MapTrifold,
  Brain,
  SealCheck,
  Warning,
  ShieldWarning
} from '@phosphor-icons/react';

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Tab configurations
export const TABS = [
  { id: 'index', label: 'Black Index', icon: Books, shortLabel: 'Index' },
  { id: 'trails', label: 'Doctrine Tracks', icon: GitBranch, shortLabel: 'Tracks' },
  { id: 'claims', label: 'Dossiers', icon: FileText, shortLabel: 'Dossiers' },
  { id: 'map', label: 'Archive Map', icon: MapTrifold, shortLabel: 'Map' },
  { id: 'reading', label: 'Archive Desk', icon: Brain, shortLabel: 'Desk' }
];

// Type badges for sources
export const TYPE_BADGES = {
  PRIMARY_SOURCE: { label: 'Primary', color: 'bg-vault-gold/20 text-vault-gold border-vault-gold/30' },
  SUPPORTED_INTERPRETATION: { label: 'Interpretation', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  HYPOTHESIS: { label: 'Hypothesis', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' }
};

// Status badges for claims
export const STATUS_BADGES = {
  VERIFIED: { label: 'Verified', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: SealCheck },
  DISPUTED: { label: 'Disputed', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Warning },
  UNVERIFIED: { label: 'Unverified', color: 'bg-white/10 text-white/50 border-white/20', icon: ShieldWarning }
};

// Topic options
export const TOPICS = [
  'Trusts', 'Equity', 'Fiduciary Duties', 'Negotiable Instruments', 
  'Monetary History', 'Legal Tender', 'Constitutional Structure'
];

// Era options
export const ERAS = ['1600-1900', '1900-1932', '1933-1945', 'Modern'];
