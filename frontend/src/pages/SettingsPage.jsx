/**
 * Settings Page - System Configuration
 * Includes Trust Score Rules Editor and Checklist Configuration
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
  PencilSimple
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import PageHeader from '../components/shared/PageHeader';
import PageHelpTooltip from '../components/shared/PageHelpTooltip';
import GlassCard from '../components/shared/GlassCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Category display config
const categoryConfig = {
  governance_hygiene: { name: 'Governance Hygiene', color: 'text-blue-400', icon: Scales },
  financial_integrity: { name: 'Financial Integrity', color: 'text-emerald-400', icon: CurrencyDollar },
  compliance_recordkeeping: { name: 'Compliance & Records', color: 'text-purple-400', icon: CheckCircle },
  risk_exposure: { name: 'Risk & Exposure', color: 'text-amber-400', icon: Warning },
  data_integrity: { name: 'Data Integrity', color: 'text-cyan-400', icon: Info }
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
  
  // Health rules state
  const [healthConfig, setHealthConfig] = useState(null);
  const [isDefault, setIsDefault] = useState(true);
  const [expandedSection, setExpandedSection] = useState('weights');
  
  // Checklists state
  const [checklists, setChecklists] = useState(null);
  const [selectedModule, setSelectedModule] = useState('minutes');

  useEffect(() => {
    fetchUserProfile();
    fetchHealthRules();
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

  const fetchHealthRules = async () => {
    try {
      const res = await axios.get(`${API}/config/health-rules`);
      if (res.data.ok) {
        setHealthConfig(res.data.data.config);
        setIsDefault(res.data.data.is_default);
      }
    } catch (error) {
      console.error('Failed to fetch health rules:', error);
      toast.error('Failed to load health rules');
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

  const saveHealthRules = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API}/config/health-rules`, healthConfig);
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

  const resetHealthRules = async () => {
    if (!window.confirm('Reset all health rules to defaults?')) return;
    
    try {
      const res = await axios.post(`${API}/config/health-rules/reset`);
      if (res.data.ok) {
        setHealthConfig(res.data.data.config);
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

  const updateBlockingCap = (capName, field, value) => {
    const newCaps = { ...healthConfig.blocking_caps };
    newCaps[capName] = { ...newCaps[capName], [field]: value };
    setHealthConfig({ ...healthConfig, blocking_caps: newCaps });
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
                  <div className="flex gap-3">
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={userProfile?.name || "Enter your preferred name or title"}
                      className="bg-vault-dark border-vault-gold/20 text-white flex-1"
                      maxLength={50}
                    />
                    <Button
                      onClick={saveDisplayName}
                      disabled={profileSaving}
                      className="bg-vault-gold hover:bg-vault-gold/80 text-vault-dark"
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
                    {displayName ? `Current: "${displayName}"` : `Using default: "${userProfile?.name || 'User'}"`}
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

        {/* Health Rules Tab */}
        {activeTab === 'health-rules' && healthConfig && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Info Banner */}
            {isDefault && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center gap-3">
                <Info className="w-5 h-5 text-blue-400" />
                <p className="text-sm text-blue-300">
                  Using default configuration. Changes will create a custom configuration.
                </p>
              </div>
            )}

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

                  {Object.entries(healthConfig.category_weights).map(([category, weight]) => {
                    const config = categoryConfig[category] || {};
                    const Icon = config.icon || Scales;
                    
                    return (
                      <div key={category} className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center`}>
                          <Icon className={`w-4 h-4 ${config.color || 'text-white'}`} />
                        </div>
                        <div className="flex-1">
                          <label className="text-sm text-white">{config.name || category}</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="50"
                            value={weight}
                            onChange={(e) => updateWeight(category, e.target.value)}
                            className="w-32 accent-vault-gold"
                          />
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={weight}
                            onChange={(e) => updateWeight(category, e.target.value)}
                            className="w-16 text-center bg-vault-dark/50 border-vault-gold/20"
                          />
                          <span className="text-vault-muted text-sm w-4">%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>

            {/* Blocking Caps */}
            <GlassCard>
              <button
                onClick={() => setExpandedSection(expandedSection === 'caps' ? null : 'caps')}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Warning className="w-5 h-5 text-amber-400" />
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

              {expandedSection === 'caps' && (
                <div className="mt-6 space-y-4">
                  {Object.entries(healthConfig.blocking_caps).map(([capName, cap]) => (
                    <div key={capName} className="p-4 bg-vault-dark/30 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={cap.enabled}
                            onCheckedChange={(checked) => updateBlockingCap(capName, 'enabled', checked)}
                          />
                          <span className="text-white font-medium">{cap.description || capName}</span>
                        </div>
                      </div>
                      
                      {cap.enabled && (
                        <div className="flex items-center gap-4 ml-12">
                          <span className="text-sm text-vault-muted">Cap score at:</span>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={cap.cap}
                            onChange={(e) => updateBlockingCap(capName, 'cap', parseInt(e.target.value) || 0)}
                            className="w-20 text-center bg-vault-dark/50 border-vault-gold/20"
                          />
                          <span className="text-vault-muted text-sm">/ 100</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
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
