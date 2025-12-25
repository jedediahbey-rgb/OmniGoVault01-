/**
 * Trust Health Dashboard - Full Health Analysis Page
 * Shows comprehensive health score breakdown with categories and remediation actions
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowUp,
  ArrowDown,
  CaretDown,
  CaretUp,
  CheckCircle,
  Clock,
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
  ArrowClockwise
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import PageHeader from '../components/shared/PageHeader';
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

// Score color helper
const getScoreColor = (score) => {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
};

const getScoreBgColor = (score) => {
  if (score >= 80) return 'bg-emerald-500/20';
  if (score >= 60) return 'bg-amber-500/20';
  return 'bg-red-500/20';
};

export default function TrustHealthDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [actions, setActions] = useState([]);

  useEffect(() => {
    fetchHealthData();
  }, []);

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
        await runScan(); // Re-scan after fix
      } else {
        toast.error(res.data.error?.message || 'Failed to apply fix');
      }
    } catch (error) {
      console.error('Fix failed:', error);
      toast.error('Failed to apply fix');
    }
  };

  const score = healthData?.overall_score ?? 0;
  const rawScore = healthData?.raw_score ?? 0;
  const blockingConditions = healthData?.blocking_conditions || [];
  const findingsCount = healthData?.findings_count || {};
  const stats = healthData?.stats || {};

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
          subtitle="Comprehensive health analysis and remediation"
          breadcrumbs={[
            { label: 'Dashboard', href: '/vault' },
            { label: 'Trust Health' }
          ]}
        />

        {/* Main Score Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Score Display */}
          <GlassCard className="lg:col-span-1">
            <div className="text-center py-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Pulse className="w-5 h-5 text-emerald-400" weight="fill" />
                <span className="text-xs text-emerald-400 uppercase tracking-wider">Live Score</span>
              </div>
              
              {/* Big Score */}
              <div className={`text-7xl font-bold ${getScoreColor(score)} mb-2`}>
                {Math.round(score)}
              </div>
              <p className="text-vault-muted text-sm mb-4">out of 100</p>

              {/* Score Bar */}
              <div className="w-full h-3 bg-vault-dark/50 rounded-full overflow-hidden mb-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    score >= 80 ? 'bg-emerald-500' :
                    score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                />
              </div>

              {/* Blocking Conditions */}
              {blockingConditions.length > 0 && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
                    <Warning className="w-4 h-4" weight="fill" />
                    <span className="font-medium">Score Capped</span>
                  </div>
                  <p className="text-xs text-red-300">
                    Raw score: {Math.round(rawScore)} → Capped due to: {blockingConditions.join(', ')}
                  </p>
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

            {/* Findings Breakdown */}
            <div className="flex items-center gap-4">
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

            {/* Records by Status */}
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

                  {/* Expanded Content */}
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
            <div className="space-y-3">
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
