/**
 * Trust Health Dashboard - Full Health Analysis Page
 * Shows comprehensive health score breakdown with categories, timeline, and audit readiness
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowUp,
  ArrowDown,
  CalendarBlank,
  CaretDown,
  CaretUp,
  CheckCircle,
  Clock,
  ClipboardText,
  Download,
  FileText,
  Gavel,
  Lightning,
  Pulse,
  Scales,
  ShieldCheck,
  Warning,
  Wrench,
  XCircle,
  Database,
  CurrencyDollar,
  ArrowClockwise,
  ChartLine,
  Certificate,
  Notebook,
  Shield
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import PageHeader from '../components/shared/PageHeader';
import PageHelpTooltip from '../components/shared/PageHelpTooltip';
import GlassCard from '../components/shared/GlassCard';
import { Button } from '../components/ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Category icons and colors
const categoryConfig = {
  governance_hygiene: {
    name: 'Governance Hygiene',
    icon: Scales,
    description: 'Meeting minutes, signatures, amendments',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  },
  financial_integrity: {
    name: 'Financial Integrity',
    icon: CurrencyDollar,
    description: 'Distributions, compensation, ledger balance',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30'
  },
  compliance_recordkeeping: {
    name: 'Compliance & Records',
    icon: FileText,
    description: 'Required documents, attestations, audit trail',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30'
  },
  risk_exposure: {
    name: 'Risk & Exposure',
    icon: Warning,
    description: 'Disputes, insurance gaps, aging items',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30'
  },
  data_integrity: {
    name: 'Data Integrity',
    icon: Database,
    description: 'Orphan records, RM-ID validity, lifecycle',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30'
  }
};

// Audit category icons
const auditCategoryIcons = {
  governance: Notebook,
  financial: CurrencyDollar,
  insurance: Shield,
  documents: FileText,
  integrity: Database
};

// Score color helper
const getScoreColor = (score) => {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
};

const getScoreBgColor = (score) => {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
};

// Tab component
const TabButton = ({ active, onClick, children, icon: Icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
      active
        ? 'bg-vault-gold text-vault-dark font-medium'
        : 'text-vault-muted hover:text-white hover:bg-white/5'
    }`}
  >
    {Icon && <Icon className="w-4 h-4" weight={active ? 'fill' : 'regular'} />}
    {children}
  </button>
);

export default function TrustHealthDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('health');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [actions, setActions] = useState([]);
  
  // Timeline state
  const [timelineData, setTimelineData] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  
  // Audit state
  const [auditData, setAuditData] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    fetchHealthData();
  }, []);

  useEffect(() => {
    if (activeTab === 'timeline' && !timelineData) {
      fetchTimeline();
    }
    if (activeTab === 'audit' && !auditData) {
      fetchAuditData();
    }
  }, [activeTab]);

  const fetchHealthData = async () => {
    try {
      const [scoreRes, categoriesRes, actionsRes] = await Promise.all([
        axios.get(`${API}/health/score`),
        axios.get(`${API}/health/categories`),
        axios.get(`${API}/health/actions?limit=20`)
      ]);

      if (scoreRes.data.ok) {
        setHealthData(scoreRes.data.data);
      }
      if (categoriesRes.data.ok) {
        setCategories(categoriesRes.data.data.categories || []);
      }
      if (actionsRes.data.ok) {
        setActions(actionsRes.data.data.actions || []);
      }
    } catch (error) {
      console.error('Failed to fetch health data:', error);
      toast.error('Failed to load health data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    setTimelineLoading(true);
    try {
      const res = await axios.get(`${API}/health/timeline?days=30`);
      if (res.data.ok) {
        setTimelineData(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
      toast.error('Failed to load timeline');
    } finally {
      setTimelineLoading(false);
    }
  };

  const fetchAuditData = async () => {
    setAuditLoading(true);
    try {
      const res = await axios.get(`${API}/health/audit`);
      if (res.data.ok) {
        setAuditData(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch audit data:', error);
      toast.error('Failed to load audit data');
    } finally {
      setAuditLoading(false);
    }
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await axios.post(`${API}/health/scan`);
      if (res.data.ok) {
        toast.success('Health scan completed');
        await fetchHealthData();
      }
    } catch (error) {
      console.error('Scan failed:', error);
      toast.error('Failed to run health scan');
    } finally {
      setScanning(false);
    }
  };

  const executeAutoFix = async (actionId) => {
    try {
      const res = await axios.post(`${API}/health/fix/${actionId}`);
      if (res.data.ok) {
        toast.success(res.data.data.message || 'Fix applied successfully');
        await runScan();
      } else {
        toast.error(res.data.error?.message || 'Failed to apply fix');
      }
    } catch (error) {
      console.error('Fix failed:', error);
      toast.error('Failed to apply fix');
    }
  };

  const exportAuditReport = async () => {
    try {
      const res = await axios.get(`${API}/health/audit/export`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_readiness_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Audit report exported');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export report');
    }
  };

  const downloadPdfReport = async () => {
    try {
      toast.info('Generating PDF report...');
      const res = await axios.get(`${API}/health/report/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `trust_health_report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF report downloaded');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF report');
    }
  };

  const score = healthData?.final_score ?? healthData?.overall_score ?? 0;
  const rawScore = healthData?.raw_score ?? 0;
  // Support both V1 (blocking_conditions) and V2 (blockers_triggered) formats
  const blockersTriggered = healthData?.blockers_triggered || [];
  const blockingConditions = healthData?.blocking_conditions || blockersTriggered.map(b => b.name);
  const isCapped = healthData?.is_capped || blockingConditions.length > 0;
  // Support both V1 (findings_count) and V2 (findings_summary) formats
  const findingsCount = healthData?.findings_summary || healthData?.findings_count || {};
  // V2 next_actions (prioritized)
  const nextActions = healthData?.next_actions || [];
  const stats = healthData?.stats || {};
  const version = healthData?.version || 'v1';

  if (loading) {
    return (
      <div className="min-h-screen bg-vault-void p-6 flex items-center justify-center">
        <div className="text-center">
          <ArrowClockwise className="w-8 h-8 text-vault-gold animate-spin mx-auto mb-4" />
          <p className="text-vault-muted">Loading health data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vault-void p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <PageHeader
          title="Trust Health Dashboard"
          subtitle="Comprehensive health analysis, timeline, and audit readiness"
          subtitleAction={<PageHelpTooltip pageKey="health" />}
          breadcrumbs={[
            { label: 'Dashboard', href: '/vault' },
            { label: 'Trust Health' }
          ]}
        />

        {/* Tabs */}
        <div className="flex items-center gap-2 p-1 bg-vault-dark/50 rounded-lg w-fit">
          <TabButton
            active={activeTab === 'health'}
            onClick={() => setActiveTab('health')}
            icon={Pulse}
          >
            Health Score
          </TabButton>
          <TabButton
            active={activeTab === 'timeline'}
            onClick={() => setActiveTab('timeline')}
            icon={ChartLine}
          >
            Timeline
          </TabButton>
          <TabButton
            active={activeTab === 'audit'}
            onClick={() => setActiveTab('audit')}
            icon={ClipboardText}
          >
            Audit Readiness
          </TabButton>
        </div>

        {/* Health Tab */}
        {activeTab === 'health' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Main Score Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Score Display */}
              <GlassCard className="lg:col-span-1">
                <div className="text-center py-6">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Pulse className="w-5 h-5 text-emerald-400" weight="fill" />
                    <span className="text-xs text-emerald-400 uppercase tracking-wider">Live Score</span>
                  </div>
                  
                  <div className={`text-7xl font-bold ${getScoreColor(score)} mb-2`}>
                    {Math.round(score)}
                  </div>
                  <p className="text-vault-muted text-sm mb-4">out of 100</p>

                  <div className="w-full h-3 bg-vault-dark/50 rounded-full overflow-hidden mb-4">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={`h-full rounded-full ${getScoreBgColor(score)}`}
                    />
                  </div>

                  {isCapped && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
                        <Warning className="w-4 h-4" weight="fill" />
                        <span className="font-medium">Score Capped</span>
                      </div>
                      <p className="text-xs text-red-300 mb-2">
                        Raw score: {Math.round(rawScore)} → Capped at: {Math.round(score)}
                      </p>
                      {blockersTriggered.length > 0 ? (
                        <div className="space-y-1">
                          {blockersTriggered.map((blocker, idx) => (
                            <div key={idx} className="text-xs text-red-200 flex items-center gap-1">
                              <span>•</span>
                              <span>{blocker.name} (max {blocker.cap_value})</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-red-200">
                          {blockingConditions.join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={runScan}
                    disabled={scanning}
                    className="mt-4 bg-vault-gold text-vault-dark hover:bg-vault-gold/90"
                  >
                    {scanning ? (
                      <>
                        <ArrowClockwise className="w-4 h-4 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <ArrowClockwise className="w-4 h-4 mr-2" />
                        Re-scan Now
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={downloadPdfReport}
                    variant="outline"
                    className="mt-2 w-full border-vault-gold/30 text-vault-gold hover:bg-vault-gold/10"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF Report
                  </Button>
                </div>
              </GlassCard>

              {/* Stats & Findings */}
              <GlassCard className="lg:col-span-2">
                <h3 className="text-lg font-semibold text-white mb-4">Scan Summary</h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="p-3 bg-vault-dark/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-white">{stats.total_records || 0}</div>
                    <div className="text-xs text-vault-muted">Records</div>
                  </div>
                  <div className="p-3 bg-vault-dark/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-white">{stats.total_portfolios || 0}</div>
                    <div className="text-xs text-vault-muted">Portfolios</div>
                  </div>
                  <div className="p-3 bg-vault-dark/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-white">{stats.total_documents || 0}</div>
                    <div className="text-xs text-vault-muted">Documents</div>
                  </div>
                  <div className="p-3 bg-vault-dark/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-vault-gold">
                      {(findingsCount.critical || 0) + (findingsCount.warning || 0)}
                    </div>
                    <div className="text-xs text-vault-muted">Issues</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm text-white">{findingsCount.critical || 0} Critical</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-sm text-white">{findingsCount.warning || 0} Warnings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm text-white">{findingsCount.info || 0} Info</span>
                  </div>
                </div>

                {stats.records_by_status && Object.keys(stats.records_by_status).length > 0 && (
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <p className="text-xs text-vault-muted uppercase tracking-wider mb-3">Records by Status</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(stats.records_by_status).map(([status, count]) => (
                        <span
                          key={status}
                          className={`px-3 py-1 rounded-full text-xs ${
                            status === 'finalized' ? 'bg-emerald-500/20 text-emerald-400' :
                            status === 'draft' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-white/10 text-white/60'
                          }`}
                        >
                          {status}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Category Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {categories.map((cat) => {
                const config = categoryConfig[cat.id] || {};
                const Icon = config.icon || Scales;
                const isExpanded = expandedCategory === cat.id;

                return (
                  <motion.div
                    key={cat.id}
                    layout
                    className={`${isExpanded ? 'md:col-span-2 lg:col-span-5' : ''}`}
                  >
                    <GlassCard
                      className={`cursor-pointer transition-all ${config.borderColor} border`}
                      onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-2 rounded-lg ${config.bgColor}`}>
                          <Icon className={`w-5 h-5 ${config.color}`} weight="duotone" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`text-2xl font-bold ${getScoreColor(cat.score)}`}>
                            {Math.round(cat.score)}
                          </span>
                          {isExpanded ? (
                            <CaretUp className="w-4 h-4 text-vault-muted" />
                          ) : (
                            <CaretDown className="w-4 h-4 text-vault-muted" />
                          )}
                        </div>
                      </div>

                      <h4 className="text-sm font-semibold text-white mb-1">{config.name}</h4>
                      <p className="text-xs text-vault-muted mb-2">{config.description}</p>
                      
                      <div className="text-xs text-white/40">
                        Weight: {cat.weight}% • {cat.finding_count} findings
                      </div>

                      <AnimatePresence>
                        {isExpanded && cat.findings && cat.findings.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-white/10"
                          >
                            <p className="text-xs text-vault-muted uppercase tracking-wider mb-3">Top Issues</p>
                            <div className="space-y-2">
                              {cat.findings.map((finding, idx) => (
                                <div
                                  key={idx}
                                  className={`p-3 rounded-lg ${
                                    finding.severity === 'critical' ? 'bg-red-500/10 border border-red-500/30' :
                                    finding.severity === 'warning' ? 'bg-amber-500/10 border border-amber-500/30' :
                                    'bg-blue-500/10 border border-blue-500/30'
                                  }`}
                                >
                                  <div className="flex items-start gap-2">
                                    {finding.severity === 'critical' ? (
                                      <XCircle className="w-4 h-4 text-red-400 mt-0.5" weight="fill" />
                                    ) : finding.severity === 'warning' ? (
                                      <Warning className="w-4 h-4 text-amber-400 mt-0.5" weight="fill" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5" weight="fill" />
                                    )}
                                    <div className="flex-1">
                                      <p className="text-sm text-white">{finding.title}</p>
                                      <p className="text-xs text-vault-muted mt-1">{finding.description}</p>
                                    </div>
                                    <span className="text-xs text-vault-gold">+{finding.impact_points}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>

            {/* Next Best Actions */}
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Next Best Actions</h3>
                  <p className="text-sm text-vault-muted">Prioritized tasks to improve your health score</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-vault-gold">
                    +{actions.reduce((sum, a) => sum + (a.impact_points || 0), 0).toFixed(1)}
                  </div>
                  <div className="text-xs text-vault-muted">potential points</div>
                </div>
              </div>

              {actions.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" weight="duotone" />
                  <p className="text-white font-medium">All clear!</p>
                  <p className="text-sm text-vault-muted">No actions needed at this time.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {actions.map((action, idx) => (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`p-4 rounded-lg border ${
                        action.priority === 'high' 
                          ? 'bg-red-500/5 border-red-500/30' 
                          : 'bg-vault-dark/30 border-vault-gold/20'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          action.priority === 'high' ? 'bg-red-500/20' : 'bg-vault-gold/20'
                        }`}>
                          <span className={`text-sm font-bold ${
                            action.priority === 'high' ? 'text-red-400' : 'text-vault-gold'
                          }`}>
                            {idx + 1}
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              action.priority === 'high' 
                                ? 'bg-red-500/20 text-red-400' 
                                : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {action.priority}
                            </span>
                            <span className="text-xs text-vault-muted">
                              {categoryConfig[action.category]?.name || action.category}
                            </span>
                          </div>
                          <h4 className="text-white font-medium">{action.title}</h4>
                          <p className="text-sm text-vault-muted mt-1">{action.description}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-lg font-bold text-vault-gold">+{action.impact_points}</div>
                          <div className="text-xs text-vault-muted">points</div>
                          
                          {action.auto_fixable && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                executeAutoFix(action.id);
                              }}
                              className="mt-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs"
                            >
                              <Wrench className="w-3 h-3 mr-1" />
                              Auto Fix
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {timelineLoading ? (
              <div className="text-center py-12">
                <ArrowClockwise className="w-8 h-8 text-vault-gold animate-spin mx-auto mb-4" />
                <p className="text-vault-muted">Loading timeline...</p>
              </div>
            ) : (
              <>
                {/* Score History Chart */}
                <GlassCard>
                  <h3 className="text-lg font-semibold text-white mb-4">Score History (30 Days)</h3>
                  
                  {timelineData?.history?.length > 0 ? (
                    <div className="h-48 flex items-end gap-1">
                      {timelineData.history.map((point, idx) => (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center gap-1"
                        >
                          <span className="text-xs text-vault-muted">{Math.round(point.score)}</span>
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(point.score, 10)}%` }}
                            transition={{ delay: idx * 0.02, duration: 0.3 }}
                            className={`w-full rounded-t ${
                              idx === timelineData.history.length - 1
                                ? 'bg-vault-gold'
                                : point.score >= 80 ? 'bg-emerald-500/40' :
                                  point.score >= 60 ? 'bg-amber-500/40' : 'bg-red-500/40'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-vault-muted">
                      <ChartLine className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No history data yet. Run more scans to build history.</p>
                    </div>
                  )}
                </GlassCard>

                {/* Events Timeline */}
                <GlassCard>
                  <h3 className="text-lg font-semibold text-white mb-4">Recent Events</h3>
                  
                  {timelineData?.events?.length > 0 ? (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                      {timelineData.events.map((event, idx) => (
                        <div key={idx} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              event.impact === 'positive' ? 'bg-emerald-500/20' :
                              event.impact === 'negative' ? 'bg-red-500/20' : 'bg-vault-dark/50'
                            }`}>
                              {event.type === 'record_finalized' ? (
                                <CheckCircle className="w-4 h-4 text-emerald-400" weight="fill" />
                              ) : event.type === 'record_created' ? (
                                <FileText className="w-4 h-4 text-vault-gold" />
                              ) : (
                                <CalendarBlank className="w-4 h-4 text-vault-muted" />
                              )}
                            </div>
                            {idx < timelineData.events.length - 1 && (
                              <div className="w-px h-full bg-white/10 my-2" />
                            )}
                          </div>
                          
                          <div className="flex-1 pb-4">
                            <p className="text-white font-medium">{event.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-vault-muted">
                                {new Date(event.date).toLocaleDateString()}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                event.module === 'minutes' ? 'bg-blue-500/20 text-blue-400' :
                                event.module === 'distribution' ? 'bg-emerald-500/20 text-emerald-400' :
                                event.module === 'insurance' ? 'bg-purple-500/20 text-purple-400' :
                                event.module === 'compensation' ? 'bg-amber-500/20 text-amber-400' :
                                event.module === 'dispute' ? 'bg-red-500/20 text-red-400' :
                                'bg-white/10 text-white/60'
                              }`}>
                                {event.module}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-vault-muted">
                      <CalendarBlank className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No events recorded yet.</p>
                    </div>
                  )}
                </GlassCard>
              </>
            )}
          </motion.div>
        )}

        {/* Audit Readiness Tab */}
        {activeTab === 'audit' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {auditLoading ? (
              <div className="text-center py-12">
                <ArrowClockwise className="w-8 h-8 text-vault-gold animate-spin mx-auto mb-4" />
                <p className="text-vault-muted">Running audit checks...</p>
              </div>
            ) : auditData ? (
              <>
                {/* Audit Score Card */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <GlassCard className="lg:col-span-1">
                    <div className="text-center py-6">
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <ClipboardText className="w-5 h-5 text-vault-gold" weight="fill" />
                        <span className="text-xs text-vault-gold uppercase tracking-wider">Audit Readiness</span>
                      </div>
                      
                      <div className={`text-6xl font-bold ${getScoreColor(auditData.audit_score)} mb-2`}>
                        {Math.round(auditData.audit_score)}%
                      </div>
                      
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                        auditData.ready_for_audit 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {auditData.ready_for_audit ? (
                          <>
                            <CheckCircle className="w-4 h-4" weight="fill" />
                            Ready for Audit
                          </>
                        ) : (
                          <>
                            <Warning className="w-4 h-4" weight="fill" />
                            Not Ready
                          </>
                        )}
                      </div>
                      
                      <div className="mt-4 text-sm text-vault-muted">
                        {auditData.passed_items} / {auditData.total_items} items passed
                      </div>

                      <Button
                        onClick={exportAuditReport}
                        variant="outline"
                        className="mt-4 border-vault-gold/30 text-vault-gold hover:bg-vault-gold/10"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                      </Button>
                    </div>
                  </GlassCard>

                  <GlassCard className="lg:col-span-2">
                    <h3 className="text-lg font-semibold text-white mb-4">Audit Checklist Summary</h3>
                    
                    <div className="space-y-4">
                      {Object.entries(auditData.checklist || {}).map(([category, items]) => {
                        const Icon = auditCategoryIcons[category] || ClipboardText;
                        const passedCount = items.filter(i => i.status === 'pass').length;
                        const totalCount = items.length;
                        const allPassed = passedCount === totalCount;
                        
                        return (
                          <div key={category} className={`p-4 rounded-lg border ${
                            allPassed ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-amber-500/5 border-amber-500/30'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Icon className={`w-5 h-5 ${allPassed ? 'text-emerald-400' : 'text-amber-400'}`} />
                                <span className="text-white font-medium capitalize">{category}</span>
                              </div>
                              <span className={`text-sm ${allPassed ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {passedCount}/{totalCount}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                </div>

                {/* Detailed Checklist */}
                <GlassCard>
                  <h3 className="text-lg font-semibold text-white mb-4">Detailed Checklist</h3>
                  
                  <div className="space-y-6">
                    {Object.entries(auditData.checklist || {}).map(([category, items]) => {
                      const Icon = auditCategoryIcons[category] || ClipboardText;
                      
                      return (
                        <div key={category}>
                          <div className="flex items-center gap-2 mb-3">
                            <Icon className="w-5 h-5 text-vault-gold" />
                            <h4 className="text-white font-medium capitalize">{category}</h4>
                          </div>
                          
                          <div className="space-y-2 ml-7">
                            {items.map((item, idx) => (
                              <div
                                key={idx}
                                className={`flex items-center justify-between p-3 rounded-lg ${
                                  item.status === 'pass' ? 'bg-emerald-500/10' :
                                  item.status === 'fail' ? 'bg-red-500/10' : 'bg-white/5'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {item.status === 'pass' ? (
                                    <CheckCircle className="w-5 h-5 text-emerald-400" weight="fill" />
                                  ) : item.status === 'fail' ? (
                                    <XCircle className="w-5 h-5 text-red-400" weight="fill" />
                                  ) : (
                                    <Warning className="w-5 h-5 text-amber-400" weight="fill" />
                                  )}
                                  <div>
                                    <p className="text-white text-sm">{item.name}</p>
                                    <p className="text-xs text-vault-muted">{item.details}</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {item.required && (
                                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                                      Required
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              </>
            ) : (
              <div className="text-center py-12">
                <ClipboardText className="w-12 h-12 text-vault-muted mx-auto mb-4" />
                <p className="text-vault-muted">Failed to load audit data</p>
                <Button onClick={fetchAuditData} className="mt-4">
                  Retry
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* Scan Metadata */}
        {healthData?.scanned_at && (
          <div className="text-center text-xs text-vault-muted">
            <Clock className="w-3 h-3 inline mr-1" />
            Last scan: {new Date(healthData.scanned_at).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
