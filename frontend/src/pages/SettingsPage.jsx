/**
 * Settings Page - System Configuration
 * Includes Trust Score Rules Editor V2 and Checklist Configuration
 * V2 features: Bounded penalties, severity multipliers, readiness modes
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  Gear,
  Scales,
  Sliders,
  ArrowClockwise,
  CheckCircle,
  Warning,
  Info,
  CaretDown,
  CaretUp,
  Plus,
  Trash,
  FloppyDisk,
  ArrowCounterClockwise,
  Notebook,
  CurrencyDollar,
  Shield,
  Users,
  Gavel,
  User,
  PencilSimple,
  Lightning,
  ShieldCheck,
  Gauge,
  Eye,
  Lock
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import PageHeader from '../components/shared/PageHeader';
import PageHelpTooltip from '../components/shared/PageHelpTooltip';
import GlassCard from '../components/shared/GlassCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Category display config (V2)
const categoryConfig = {
  governance_hygiene: { name: 'Governance Hygiene', color: 'text-blue-400', icon: Scales, description: 'Minutes, finalization, attestations' },
  financial_integrity: { name: 'Financial Integrity', color: 'text-emerald-400', icon: CurrencyDollar, description: 'Ledger, distributions, reconciliation' },
  compliance_recordkeeping: { name: 'Compliance & Records', color: 'text-purple-400', icon: CheckCircle, description: 'Essential docs, audit trails' },
  risk_exposure: { name: 'Risk & Exposure', color: 'text-amber-400', icon: Warning, description: 'Disputes, insurance coverage' },
  data_integrity: { name: 'Data Integrity', color: 'text-cyan-400', icon: Shield, description: 'Orphans, RM-IDs, lifecycle' }
};

// Severity config (V2)
const severityConfig = {
  info: { name: 'Info', color: 'text-blue-400', bgColor: 'bg-blue-500/20', default: 0.5 },
  warning: { name: 'Warning', color: 'text-amber-400', bgColor: 'bg-amber-500/20', default: 1.0 },
  critical: { name: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500/20', default: 1.5 }
};

// Readiness modes (V2)
const readinessModes = {
  normal: { name: 'Normal', description: 'Standard scoring', icon: Gauge },
  audit: { name: 'Audit Ready', description: 'Strict checks for audit compliance', icon: ShieldCheck },
  court: { name: 'Court Ready', description: 'Litigation-grade requirements', icon: Gavel }
};

// Module icons
const moduleIcons = {
  minutes: Notebook,
  distribution: CurrencyDollar,
  insurance: Shield,
  compensation: Users,
  dispute: Gavel
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile state
  const [userProfile, setUserProfile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  
  // Health rules V2 state
  const [healthConfig, setHealthConfig] = useState(null);
  const [isDefault, setIsDefault] = useState(true);
  const [expandedSection, setExpandedSection] = useState('weights');
  const [healthVersion, setHealthVersion] = useState('v2');
  
  // Checklists state
  const [checklists, setChecklists] = useState(null);
  const [selectedModule, setSelectedModule] = useState('minutes');

  useEffect(() => {
    fetchUserProfile();
    fetchHealthRulesV2();
    fetchChecklists();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const res = await axios.get(`${API}/user/profile`);
      setUserProfile(res.data);
      setDisplayName(res.data?.display_name || '');
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const saveDisplayName = async () => {
    setProfileSaving(true);
    try {
      const res = await axios.put(`${API}/user/profile`, { display_name: displayName.trim() || null });
      setUserProfile(res.data);
      toast.success('Display name updated');
    } catch (error) {
      console.error('Failed to save display name:', error);
      toast.error(error.response?.data?.detail || 'Failed to save display name');
    } finally {
      setProfileSaving(false);
    }
  };

  // V2 Health Rules fetch
  const fetchHealthRulesV2 = async () => {
    try {
      const res = await axios.get(`${API}/health/v2/ruleset`);
      if (res.data.ok) {
        setHealthConfig(res.data.data);
        setIsDefault(!res.data.data.custom);
        setHealthVersion('v2');
      }
    } catch (error) {
      console.error('Failed to fetch V2 health rules:', error);
      // Fallback to V1 endpoint
      try {
        const fallback = await axios.get(`${API}/config/health-rules`);
        if (fallback.data.ok) {
          setHealthConfig(fallback.data.data.config);
          setIsDefault(fallback.data.data.is_default);
          setHealthVersion('v1');
        }
      } catch (e) {
        toast.error('Failed to load health rules');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchChecklists = async () => {
    try {
      const res = await axios.get(`${API}/config/checklists`);
      if (res.data.ok) {
        setChecklists(res.data.data.checklists);
      }
    } catch (error) {
      console.error('Failed to fetch checklists:', error);
    }
  };

  // V2 Save
  const saveHealthRules = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API}/health/v2/ruleset`, healthConfig);
      if (res.data.ok) {
        toast.success('Health rules saved');
        setIsDefault(false);
      } else {
        toast.error(res.data.error?.message || 'Failed to save');
      }
    } catch (error) {
      console.error('Save failed:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to save health rules');
    } finally {
      setSaving(false);
    }
  };

  // V2 Reset
  const resetHealthRules = async () => {
    if (!window.confirm('Reset all health rules to defaults?')) return;
    
    try {
      const res = await axios.post(`${API}/health/v2/ruleset/reset`);
      if (res.data.ok) {
        setHealthConfig(res.data.data);
        setIsDefault(true);
        toast.success('Health rules reset to defaults');
      }
    } catch (error) {
      toast.error('Failed to reset');
    }
  };

  const updateWeight = (category, value) => {
    const newWeights = { ...healthConfig.category_weights };
    newWeights[category] = parseInt(value) || 0;
    setHealthConfig({ ...healthConfig, category_weights: newWeights });
  };

  const updateSeverityMultiplier = (severity, value) => {
    const newMultipliers = { ...healthConfig.severity_multipliers };
    newMultipliers[severity] = parseFloat(value) || 1.0;
    setHealthConfig({ ...healthConfig, severity_multipliers: newMultipliers });
  };

  const updateBlockingCap = (capId, field, value) => {
    const newCaps = { ...healthConfig.blocking_caps };
    if (!newCaps[capId]) newCaps[capId] = {};
    newCaps[capId] = { ...newCaps[capId], [field]: value };
    setHealthConfig({ ...healthConfig, blocking_caps: newCaps });
  };

  const updateReadinessMode = (mode) => {
    setHealthConfig({ ...healthConfig, readiness_mode: mode });
  };

  const saveChecklist = async (moduleType) => {
    setSaving(true);
    try {
      const res = await axios.put(`${API}/config/checklists/${moduleType}`, checklists[moduleType]);
      if (res.data.ok) {
        toast.success('Checklist saved');
      }
    } catch (error) {
      toast.error('Failed to save checklist');
    } finally {
      setSaving(false);
    }
  };

  const addChecklistItem = (moduleType) => {
    const newItem = {
      id: `item_${Date.now()}`,
      label: 'New item',
      required: false
    };
    const updated = { ...checklists };
    updated[moduleType].items = [...updated[moduleType].items, newItem];
    setChecklists(updated);
  };

  const updateChecklistItem = (moduleType, index, field, value) => {
    const updated = { ...checklists };
    updated[moduleType].items[index][field] = value;
    setChecklists(updated);
  };

  const removeChecklistItem = (moduleType, index) => {
    const updated = { ...checklists };
    updated[moduleType].items.splice(index, 1);
    setChecklists(updated);
  };

  const totalWeight = healthConfig ? Object.values(healthConfig.category_weights).reduce((a, b) => a + b, 0) : 0;
  const weightValid = totalWeight === 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-vault-void p-6 flex items-center justify-center">
        <ArrowClockwise className="w-8 h-8 text-vault-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vault-void p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <PageHeader
          title="Settings"
          subtitle="Configure trust health rules and governance checklists."
          subtitleAction={<PageHelpTooltip pageKey="settings" />}
          breadcrumbs={[
            { label: 'Dashboard', href: '/vault' },
            { label: 'Settings' }
          ]}
        />

        {/* Tabs - Enhanced visibility */}
        <div className="border border-vault-gold/20 rounded-xl bg-vault-dark/80 p-1.5 w-fit">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all text-sm sm:text-base font-medium ${
                activeTab === 'profile'
                  ? 'bg-vault-gold text-vault-dark shadow-lg shadow-vault-gold/20'
                  : 'text-vault-muted hover:text-white hover:bg-white/10 border border-transparent hover:border-vault-gold/20'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </button>
            <button
              onClick={() => setActiveTab('health-rules')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all text-sm sm:text-base font-medium ${
                activeTab === 'health-rules'
                  ? 'bg-vault-gold text-vault-dark shadow-lg shadow-vault-gold/20'
                  : 'text-vault-muted hover:text-white hover:bg-white/10 border border-transparent hover:border-vault-gold/20'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span className="hidden xs:inline">Health Score</span>
              <span className="xs:hidden">Health</span>
            </button>
            <button
              onClick={() => setActiveTab('checklists')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all text-sm sm:text-base font-medium ${
                activeTab === 'checklists'
                  ? 'bg-vault-gold text-vault-dark shadow-lg shadow-vault-gold/20'
                  : 'text-vault-muted hover:text-white hover:bg-white/10 border border-transparent hover:border-vault-gold/20'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Governance Checklists</span>
              <span className="sm:hidden">Checklists</span>
            </button>
          </div>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <GlassCard>
              <div className="flex items-center gap-3 mb-6">
                <User className="w-5 h-5 text-vault-gold" />
                <div>
                  <h3 className="text-lg font-semibold text-white">User Profile</h3>
                  <p className="text-sm text-vault-muted">Customize how you appear in the app</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Display Name */}
                <div className="space-y-2">
                  <Label className="text-white">Display Name / Title</Label>
                  <p className="text-xs text-vault-muted mb-2">
                    This name will appear in &quot;Welcome back&quot; messages and throughout the app
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={userProfile?.name || "Enter your preferred name or title"}
                      className="bg-vault-dark border-vault-gold/20 text-white flex-1 w-full"
                      maxLength={50}
                    />
                    <Button
                      onClick={saveDisplayName}
                      disabled={profileSaving}
                      className="bg-vault-gold hover:bg-vault-gold/80 text-vault-dark w-full sm:w-auto flex-shrink-0"
                    >
                      {profileSaving ? (
                        <ArrowClockwise className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <FloppyDisk className="w-4 h-4 mr-2" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-vault-muted">
                    {displayName ? (
                      <span className="inline-flex items-center gap-1">
                        Current:{' '}
                        <span 
                          className="font-semibold tracking-wide relative overflow-hidden"
                          style={{
                            background: 'linear-gradient(90deg, #C6A87C 0%, #E8D5B7 25%, #C6A87C 50%, #8B7355 75%, #C6A87C 100%)',
                            backgroundSize: '200% 100%',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            animation: 'shimmer 2.5s ease-in-out infinite',
                            filter: 'drop-shadow(0 1px 2px rgba(198, 168, 124, 0.4))'
                          }}
                        >
                          &ldquo;{displayName}&rdquo;
                        </span>
                        <style>{`
                          @keyframes shimmer {
                            0% { background-position: 200% 0; }
                            100% { background-position: -200% 0; }
                          }
                        `}</style>
                      </span>
                    ) : (
                      `Using default: "${userProfile?.name || 'User'}"`
                    )}
                  </p>
                </div>

                {/* User Info (Read-only) */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <div>
                    <Label className="text-vault-muted text-xs">Email</Label>
                    <p className="text-white">{userProfile?.email || 'Not available'}</p>
                  </div>
                  <div>
                    <Label className="text-vault-muted text-xs">Account Name</Label>
                    <p className="text-white">{userProfile?.name || 'Not available'}</p>
                  </div>
                  {userProfile?.global_roles && userProfile.global_roles.length > 0 && (
                    <div>
                      <Label className="text-vault-muted text-xs">Roles</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {userProfile.global_roles.map((role) => (
                          <span 
                            key={role} 
                            className={`px-2 py-1 text-xs rounded ${
                              role === 'OMNICOMPETENT_OWNER' 
                                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]' 
                                : role === 'OMNICOMPETENT'
                                  ? 'bg-purple-500/20 text-purple-300'
                                  : 'bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Health Rules Tab - V2 */}
        {activeTab === 'health-rules' && healthConfig && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* V2 Badge + Info Banner */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 text-xs font-bold bg-vault-gold/20 text-vault-gold rounded border border-vault-gold/30">
                  V2 ENGINE
                </span>
                {isDefault && (
                  <span className="text-sm text-blue-400">Using defaults</span>
                )}
              </div>
              
              {/* Readiness Mode Selector */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-vault-muted">Mode:</span>
                <Select
                  value={healthConfig.readiness_mode || 'normal'}
                  onValueChange={updateReadinessMode}
                >
                  <SelectTrigger className="w-[160px] bg-vault-dark border-vault-gold/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-vault-dark border-vault-gold/30">
                    {Object.entries(readinessModes).map(([key, mode]) => {
                      const Icon = mode.icon;
                      return (
                        <SelectItem key={key} value={key} className="text-white">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <span>{mode.name}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Category Weights */}
            <GlassCard>
              <button
                onClick={() => setExpandedSection(expandedSection === 'weights' ? null : 'weights')}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Scales className="w-5 h-5 text-vault-gold" />
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-white">Category Weights</h3>
                    <p className="text-sm text-vault-muted">Adjust how each category affects the total score</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${weightValid ? 'text-emerald-400' : 'text-red-400'}`}>
                    Total: {totalWeight}%
                  </span>
                  {expandedSection === 'weights' ? (
                    <CaretUp className="w-5 h-5 text-vault-muted" />
                  ) : (
                    <CaretDown className="w-5 h-5 text-vault-muted" />
                  )}
                </div>
              </button>

              {expandedSection === 'weights' && (
                <div className="mt-6 space-y-4">
                  {!weightValid && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                      ⚠ Weights must sum to 100%. Current total: {totalWeight}%
                    </div>
                  )}

                  {Object.entries(healthConfig.category_weights || {}).map(([category, weight]) => {
                    const config = categoryConfig[category] || {};
                    const Icon = config.icon || Scales;
                    
                    return (
                      <div key={category} className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${config.color || 'text-white'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="text-sm text-white font-medium">{config.name || category}</label>
                          <p className="text-xs text-vault-muted truncate">{config.description}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <input
                            type="range"
                            min="0"
                            max="50"
                            value={weight}
                            onChange={(e) => updateWeight(category, e.target.value)}
                            className="w-24 sm:w-32 accent-vault-gold"
                          />
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={weight}
                            onChange={(e) => updateWeight(category, e.target.value)}
                            className="w-14 text-center bg-vault-dark/50 border-vault-gold/20"
                          />
                          <span className="text-vault-muted text-sm w-4">%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>

            {/* Severity Multipliers (V2) */}
            <GlassCard>
              <button
                onClick={() => setExpandedSection(expandedSection === 'severity' ? null : 'severity')}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Lightning className="w-5 h-5 text-amber-400" />
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-white">Severity Multipliers</h3>
                    <p className="text-sm text-vault-muted">Adjust penalty weight by severity level</p>
                  </div>
                </div>
                {expandedSection === 'severity' ? (
                  <CaretUp className="w-5 h-5 text-vault-muted" />
                ) : (
                  <CaretDown className="w-5 h-5 text-vault-muted" />
                )}
              </button>

              {expandedSection === 'severity' && healthConfig.severity_multipliers && (
                <div className="mt-6 space-y-4">
                  <p className="text-xs text-vault-muted mb-4">
                    Multipliers affect how much each finding impacts the score. Higher = more impact.
                  </p>
                  
                  {Object.entries(severityConfig).map(([severity, config]) => {
                    const currentValue = healthConfig.severity_multipliers[severity] ?? config.default;
                    
                    return (
                      <div key={severity} className="flex items-center gap-4 p-3 bg-vault-dark/30 rounded-lg">
                        <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                          {severity === 'info' && <Info className={`w-5 h-5 ${config.color}`} />}
                          {severity === 'warning' && <Warning className={`w-5 h-5 ${config.color}`} />}
                          {severity === 'critical' && <Lightning className={`w-5 h-5 ${config.color}`} weight="fill" />}
                        </div>
                        <div className="flex-1">
                          <label className={`text-sm font-medium ${config.color}`}>{config.name}</label>
                          <p className="text-xs text-vault-muted">
                            Default: ×{config.default.toFixed(1)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-vault-muted">×</span>
                          <Input
                            type="number"
                            min="0"
                            max="3"
                            step="0.1"
                            value={currentValue}
                            onChange={(e) => updateSeverityMultiplier(severity, e.target.value)}
                            className="w-20 text-center bg-vault-dark/50 border-vault-gold/20"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>

            {/* Blocking Caps (V2) */}
            <GlassCard>
              <button
                onClick={() => setExpandedSection(expandedSection === 'caps' ? null : 'caps')}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-red-400" />
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-white">Blocking Conditions</h3>
                    <p className="text-sm text-vault-muted">Critical issues that cap the maximum score</p>
                  </div>
                </div>
                {expandedSection === 'caps' ? (
                  <CaretUp className="w-5 h-5 text-vault-muted" />
                ) : (
                  <CaretDown className="w-5 h-5 text-vault-muted" />
                )}
              </button>

              {expandedSection === 'caps' && healthConfig.blocking_caps && (
                <div className="mt-6 space-y-4">
                  <p className="text-xs text-vault-muted mb-4">
                    When triggered, these conditions limit your maximum possible score regardless of other factors.
                  </p>
                  
                  {Object.entries(healthConfig.blocking_caps).map(([capId, cap]) => (
                    <div key={capId} className="p-4 bg-vault-dark/30 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={cap.enabled !== false}
                            onCheckedChange={(checked) => updateBlockingCap(capId, 'enabled', checked)}
                          />
                          <div>
                            <span className="text-white font-medium">{cap.name || capId}</span>
                            <p className="text-xs text-vault-muted">{cap.description}</p>
                          </div>
                        </div>
                      </div>
                      
                      {cap.enabled !== false && (
                        <div className="flex items-center gap-4 ml-12 mt-2">
                          <span className="text-sm text-vault-muted">Cap score at:</span>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={cap.cap_value ?? cap.cap ?? 60}
                            onChange={(e) => updateBlockingCap(capId, 'cap_value', parseInt(e.target.value) || 0)}
                            className="w-20 text-center bg-vault-dark/50 border-vault-gold/20"
                          />
                          <div className="flex-1 h-2 bg-vault-dark/50 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full transition-all"
                              style={{ width: `${cap.cap_value ?? cap.cap ?? 60}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Checks Preview (V2) - Collapsed by default */}
            {healthConfig.checks && Object.keys(healthConfig.checks).length > 0 && (
              <GlassCard>
                <button
                  onClick={() => setExpandedSection(expandedSection === 'checks' ? null : 'checks')}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-cyan-400" />
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-white">Active Checks</h3>
                      <p className="text-sm text-vault-muted">{Object.keys(healthConfig.checks).length} checks configured</p>
                    </div>
                  </div>
                  {expandedSection === 'checks' ? (
                    <CaretUp className="w-5 h-5 text-vault-muted" />
                  ) : (
                    <CaretDown className="w-5 h-5 text-vault-muted" />
                  )}
                </button>

                {expandedSection === 'checks' && (
                  <div className="mt-6 space-y-3 max-h-[400px] overflow-y-auto">
                    {Object.entries(healthConfig.checks).map(([checkId, check]) => {
                      const catConfig = categoryConfig[check.category] || {};
                      const sevConfig = severityConfig[check.severity] || severityConfig.warning;
                      
                      return (
                        <div key={checkId} className="p-3 bg-vault-dark/30 rounded-lg border border-white/5 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 text-xs rounded ${sevConfig.bgColor} ${sevConfig.color}`}>
                                {check.severity?.toUpperCase()}
                              </span>
                              <span className="text-white font-medium">{check.name}</span>
                            </div>
                            <span className="text-xs text-vault-muted">{checkId}</span>
                          </div>
                          <p className="text-vault-muted text-xs mb-2">{check.description}</p>
                          <div className="flex items-center gap-4 text-xs text-vault-muted">
                            <span className={catConfig.color}>{catConfig.name}</span>
                            <span>Base: -{check.base_deduction}</span>
                            <span>Max: -{check.max_penalty}</span>
                            <span>Effort: {check.effort}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <Button
                variant="outline"
                onClick={resetHealthRules}
                disabled={isDefault}
                className="border-white/20 text-vault-muted hover:text-white"
              >
                <ArrowCounterClockwise className="w-4 h-4 mr-2" />
                Reset to Defaults
              </Button>
              
              <Button
                onClick={saveHealthRules}
                disabled={saving || !weightValid}
                className="bg-vault-gold text-vault-dark hover:bg-vault-gold/90"
              >
                {saving ? (
                  <>
                    <ArrowClockwise className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FloppyDisk className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Checklists Tab */}
        {activeTab === 'checklists' && checklists && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Module Selector */}
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(checklists).map(([moduleType, checklist]) => {
                const Icon = moduleIcons[moduleType] || CheckCircle;
                const isSelected = selectedModule === moduleType;
                
                return (
                  <button
                    key={moduleType}
                    onClick={() => setSelectedModule(moduleType)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isSelected
                        ? 'bg-vault-gold/20 text-vault-gold border border-vault-gold/30'
                        : 'bg-vault-dark/30 text-vault-muted hover:text-white border border-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="capitalize">{moduleType}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Checklist */}
            {selectedModule && checklists[selectedModule] && (
              <GlassCard>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {checklists[selectedModule].name}
                    </h3>
                    <p className="text-sm text-vault-muted">
                      {checklists[selectedModule].items.length} items
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addChecklistItem(selectedModule)}
                    className="border-vault-gold/30 text-vault-gold hover:bg-vault-gold/10"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {checklists[selectedModule].items.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="flex items-center gap-3 p-3 bg-vault-dark/30 rounded-lg border border-white/10"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.required}
                          onChange={(e) => updateChecklistItem(selectedModule, index, 'required', e.target.checked)}
                          className="w-4 h-4 accent-vault-gold"
                          title="Required"
                        />
                        <span className="text-xs text-vault-muted">Req</span>
                      </div>
                      
                      <Input
                        value={item.label}
                        onChange={(e) => updateChecklistItem(selectedModule, index, 'label', e.target.value)}
                        className="flex-1 bg-transparent border-0 text-white focus:ring-0"
                        placeholder="Checklist item label"
                      />
                      
                      <button
                        onClick={() => removeChecklistItem(selectedModule, index)}
                        className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={() => saveChecklist(selectedModule)}
                    disabled={saving}
                    className="bg-vault-gold text-vault-dark hover:bg-vault-gold/90"
                  >
                    {saving ? (
                      <>
                        <ArrowClockwise className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FloppyDisk className="w-4 h-4 mr-2" />
                        Save Checklist
                      </>
                    )}
                  </Button>
                </div>
              </GlassCard>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
