/**
 * Diagnostics Page - Admin UI for Integrity Tools
 * Phase 1: Data Integrity & Repair Tools
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Warning,
  Trash,
  ArrowClockwise,
  CheckCircle,
  XCircle,
  Database,
  MagnifyingGlass,
  CaretDown,
  CaretUp,
  Lightning
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import GlassCard from '../components/shared/GlassCard';
import PageHeader from '../components/shared/PageHeader';

const API = process.env.REACT_APP_BACKEND_URL;

// Severity color mapping
const severityColors = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
};

// Issue type labels
const issueTypeLabels = {
  orphan_record: 'Orphan Record',
  orphan_revision: 'Orphan Revision',
  missing_fk: 'Missing Reference',
  duplicate_rmid: 'Duplicate RM-ID',
  invalid_status: 'Invalid Status',
  missing_required: 'Missing Field',
  broken_hash_chain: 'Broken Hash Chain',
  inconsistent_version: 'Version Mismatch',
  stale_reference: 'Stale Reference',
  missing_portfolio: 'Missing Portfolio',
  invalid_thread_link: 'Invalid Thread'
};

export default function DiagnosticsPage() {
  const [scanning, setScanning] = useState(false);
  const [currentScan, setCurrentScan] = useState(null);
  const [error, setError] = useState(null);
  const [selectedIssues, setSelectedIssues] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [expandedIssue, setExpandedIssue] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('all');

  const runScan = async () => {
    setScanning(true);
    setError(null);
    setSelectedIssues(new Set());
    try {
      const res = await axios.post(`${API}/api/integrity/scan`);
      if (res.data.ok) {
        setCurrentScan(res.data.data);
        if (res.data.data.total_issues_found === 0) {
          toast.success('System is healthy - no issues found!');
        } else {
          toast.warning(`Found ${res.data.data.total_issues_found} issues`);
        }
      } else {
        setError('Scan failed');
        toast.error('Scan failed');
      }
    } catch (err) {
      console.error('Scan failed:', err);
      setError(err.message);
      toast.error('Failed to run integrity scan');
    } finally {
      setScanning(false);
    }
  };

  const toggleIssueSelection = (recordId) => {
    setSelectedIssues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  const selectAllIssues = () => {
    if (!currentScan?.issues) return;
    const allIds = currentScan.issues
      .filter(i => i.issue_type === 'missing_fk')
      .map(i => i.record_id);
    setSelectedIssues(new Set(allIds));
  };

  const deselectAll = () => {
    setSelectedIssues(new Set());
  };

  const deleteSelectedRecords = async () => {
    if (selectedIssues.size === 0) {
      toast.error('No records selected');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIssues.size} orphaned record(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await axios.delete(`${API}/api/integrity/records/bulk`, {
        data: { record_ids: Array.from(selectedIssues) }
      });

      if (res.data.ok) {
        toast.success(`Deleted ${res.data.data.deleted_count} records`);
        // Re-run scan to refresh the list
        await runScan();
      } else {
        toast.error('Failed to delete records');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete selected records');
    } finally {
      setDeleting(false);
    }
  };

  const deleteSingleRecord = async (recordId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this orphaned record? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      const res = await axios.delete(`${API}/api/integrity/records/${recordId}`);
      if (res.data.ok) {
        toast.success('Record deleted successfully');
        // Remove from current scan results
        setCurrentScan(prev => ({
          ...prev,
          issues: prev.issues.filter(i => i.record_id !== recordId),
          total_issues_found: prev.total_issues_found - 1
        }));
        setSelectedIssues(prev => {
          const newSet = new Set(prev);
          newSet.delete(recordId);
          return newSet;
        });
      }
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete record');
    }
  };

  const filteredIssues = currentScan?.issues?.filter(issue => {
    if (filterSeverity === 'all') return true;
    return issue.severity === filterSeverity;
  }) || [];

  const fixableCount = filteredIssues.filter(i => i.issue_type === 'missing_fk').length;

  return (
    <div className="min-h-screen bg-vault-void p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <PageHeader
          title="System Diagnostics"
          subtitle="Data integrity tools and repair utilities"
          breadcrumbs={[
            { label: 'Dashboard', href: '/vault' },
            { label: 'Diagnostics' }
          ]}
        />

        {/* Action Bar */}
        <GlassCard className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-vault-gold/10 border border-vault-gold/20">
              <ShieldCheck className="w-6 h-6 text-vault-gold" weight="duotone" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Integrity Scanner</h2>
              <p className="text-sm text-vault-muted">Scan database for data integrity issues</p>
            </div>
          </div>
          
          <button
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-2 px-5 py-2.5 bg-vault-gold text-vault-dark font-medium rounded-lg hover:bg-vault-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {scanning ? (
              <>
                <ArrowClockwise className="w-5 h-5 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <MagnifyingGlass className="w-5 h-5" weight="duotone" />
                Run Full Scan
              </>
            )}
          </button>
        </GlassCard>

        {/* Error State */}
        {error && (
          <GlassCard className="border-red-500/30 bg-red-500/5">
            <div className="flex items-center gap-3 text-red-400">
              <XCircle className="w-5 h-5" weight="duotone" />
              <span>{error}</span>
            </div>
          </GlassCard>
        )}

        {/* Scan Results */}
        <AnimatePresence mode="wait">
          {currentScan && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassCard>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Database className="w-5 h-5 text-blue-400" weight="duotone" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{currentScan.total_records_scanned}</div>
                      <div className="text-xs text-vault-muted">Records Scanned</div>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${currentScan.total_issues_found > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                      {currentScan.total_issues_found > 0 ? (
                        <Warning className="w-5 h-5 text-red-400" weight="duotone" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-green-400" weight="duotone" />
                      )}
                    </div>
                    <div>
                      <div className={`text-2xl font-bold ${currentScan.total_issues_found > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {currentScan.total_issues_found}
                      </div>
                      <div className="text-xs text-vault-muted">Issues Found</div>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <Warning className="w-5 h-5 text-orange-400" weight="duotone" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-400">
                        {currentScan.issues_by_severity?.high || 0}
                      </div>
                      <div className="text-xs text-vault-muted">High Severity</div>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-vault-gold/10">
                      <Lightning className="w-5 h-5 text-vault-gold" weight="duotone" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-vault-gold">{fixableCount}</div>
                      <div className="text-xs text-vault-muted">Fixable Issues</div>
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Issues List */}
              {currentScan.issues?.length > 0 && (
                <GlassCard className="overflow-hidden">
                  {/* Issues Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-semibold text-white">Issues ({filteredIssues.length})</h3>
                      
                      {/* Severity Filter */}
                      <select
                        value={filterSeverity}
                        onChange={(e) => setFilterSeverity(e.target.value)}
                        className="px-3 py-1.5 bg-vault-dark/50 border border-vault-gold/20 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-vault-gold/30"
                      >
                        <option value="all">All Severities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>

                    {/* Bulk Actions */}
                    <div className="flex items-center gap-2">
                      {selectedIssues.size > 0 && (
                        <span className="text-sm text-vault-gold mr-2">
                          {selectedIssues.size} selected
                        </span>
                      )}
                      <button
                        onClick={selectAllIssues}
                        className="px-3 py-1.5 text-sm bg-vault-dark/50 text-white/70 hover:text-white rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                      >
                        Select All Fixable
                      </button>
                      {selectedIssues.size > 0 && (
                        <>
                          <button
                            onClick={deselectAll}
                            className="px-3 py-1.5 text-sm bg-vault-dark/50 text-white/70 hover:text-white rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                          >
                            Clear
                          </button>
                          <button
                            onClick={deleteSelectedRecords}
                            disabled={deleting}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg border border-red-500/30 transition-colors disabled:opacity-50"
                          >
                            <Trash className="w-4 h-4" weight="duotone" />
                            {deleting ? 'Deleting...' : `Delete ${selectedIssues.size}`}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Issues List */}
                  <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                    {filteredIssues.map((issue, idx) => {
                      const isFixable = issue.issue_type === 'missing_fk';
                      const isSelected = selectedIssues.has(issue.record_id);
                      const isExpanded = expandedIssue === idx;

                      return (
                        <motion.div
                          key={`${issue.record_id}-${idx}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className={`p-4 rounded-lg border transition-colors ${
                            isSelected 
                              ? 'bg-vault-gold/10 border-vault-gold/30' 
                              : 'bg-vault-dark/30 border-vault-gold/10 hover:border-vault-gold/20'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Checkbox for fixable issues */}
                            {isFixable && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleIssueSelection(issue.record_id)}
                                className="mt-1 w-4 h-4 rounded border-vault-gold/30 bg-vault-dark text-vault-gold focus:ring-vault-gold/50"
                              />
                            )}

                            <div className="flex-1 min-w-0">
                              {/* Issue Header */}
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded border ${severityColors[issue.severity]}`}>
                                  {issue.severity.toUpperCase()}
                                </span>
                                <span className="px-2 py-0.5 text-xs bg-vault-dark/50 text-white/60 rounded">
                                  {issueTypeLabels[issue.issue_type] || issue.issue_type}
                                </span>
                              </div>

                              {/* Description */}
                              <p className="text-sm text-white mb-1">{issue.description}</p>
                              
                              {/* Record ID */}
                              <p className="text-xs text-vault-muted font-mono">{issue.record_id}</p>

                              {/* Expanded Details */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mt-3 pt-3 border-t border-white/10"
                                  >
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      {Object.entries(issue.details || {}).map(([key, value]) => (
                                        <div key={key}>
                                          <span className="text-vault-muted">{key}:</span>
                                          <span className="ml-2 text-white font-mono">{String(value)}</span>
                                        </div>
                                      ))}
                                    </div>
                                    {issue.suggested_fix && (
                                      <p className="mt-2 text-xs text-vault-gold">
                                        💡 Suggested fix: {issue.suggested_fix}
                                      </p>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setExpandedIssue(isExpanded ? null : idx)}
                                className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors"
                              >
                                {isExpanded ? (
                                  <CaretUp className="w-4 h-4" />
                                ) : (
                                  <CaretDown className="w-4 h-4" />
                                )}
                              </button>
                              
                              {isFixable && (
                                <button
                                  onClick={() => deleteSingleRecord(issue.record_id)}
                                  className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                  title="Delete this orphaned record"
                                >
                                  <Trash className="w-4 h-4" weight="duotone" />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </GlassCard>
              )}

              {/* Healthy State */}
              {currentScan.total_issues_found === 0 && (
                <GlassCard className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" weight="duotone" />
                  <h3 className="text-xl font-semibold text-white mb-2">System is Healthy</h3>
                  <p className="text-vault-muted">No data integrity issues were found.</p>
                </GlassCard>
              )}

              {/* Scan Metadata */}
              <div className="text-center text-xs text-vault-muted">
                Scan ID: {currentScan.scan_id} • 
                Completed: {new Date(currentScan.completed_at).toLocaleString()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Initial State */}
        {!currentScan && !scanning && (
          <GlassCard className="text-center py-16">
            <Database className="w-16 h-16 text-vault-gold/40 mx-auto mb-4" weight="duotone" />
            <h3 className="text-xl font-semibold text-white mb-2">Ready to Scan</h3>
            <p className="text-vault-muted mb-6 max-w-md mx-auto">
              Run a full integrity scan to check for orphaned records, missing references, 
              and other data consistency issues.
            </p>
            <button
              onClick={runScan}
              className="inline-flex items-center gap-2 px-6 py-3 bg-vault-gold text-vault-dark font-medium rounded-lg hover:bg-vault-gold/90 transition-colors"
            >
              <MagnifyingGlass className="w-5 h-5" weight="duotone" />
              Start Scan
            </button>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
