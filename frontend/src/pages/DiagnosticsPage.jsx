/**
 * Diagnostics Page - Admin UI for Integrity Tools
 * 
 * Provides:
 * - Run integrity scans
 * - View scan results and issues
 * - Execute repair actions
 * - Monitor system health
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import PageHeader from '../components/shared/PageHeader';
import GlassCard from '../components/shared/GlassCard';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Activity,
  ArrowClockwise,
  Bug,
  Check,
  CheckCircle,
  Database,
  FileSearch,
  Lightning,
  ShieldCheck,
  Warning,
  Wrench,
  X,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';

const API = process.env.REACT_APP_BACKEND_URL;

// Severity colors
const severityColors = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

// Issue type labels
const issueTypeLabels = {
  orphan_record: 'Orphan Record',
  orphan_revision: 'Orphan Revision',
  missing_fk: 'Missing Reference',
  duplicate_rmid: 'Duplicate RM-ID',
  invalid_status: 'Invalid Status',
  missing_required: 'Missing Required',
  broken_hash_chain: 'Broken Hash Chain',
  inconsistent_version: 'Version Mismatch',
  stale_reference: 'Stale Reference',
  missing_portfolio: 'Missing Portfolio',
  invalid_thread_link: 'Invalid Thread Link',
};

export default function DiagnosticsPage() {
  const [scanning, setScanning] = useState(false);
  const [currentScan, setCurrentScan] = useState(null);
  const [previousScans, setPreviousScans] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [repairing, setRepairing] = useState(false);

  // Fetch previous scans on load
  useEffect(() => {
    fetchPreviousScans();
  }, []);

  const fetchPreviousScans = async () => {
    try {
      const res = await axios.get(`${API}/api/integrity/scans`);
      if (res.data.ok) {
        setPreviousScans(res.data.data.scans || []);
      }
    } catch (error) {
      console.error('Failed to fetch scans:', error);
    }
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await axios.post(`${API}/api/integrity/scan`);
      if (res.data.ok) {
        setCurrentScan(res.data.data);
        toast.success(`Scan complete: ${res.data.data.total_issues_found} issues found`);
        fetchPreviousScans();
      } else {
        toast.error('Scan failed');
      }
    } catch (error) {
      console.error('Scan failed:', error);
      toast.error('Failed to run scan');
    } finally {
      setScanning(false);
    }
  };

  const loadScan = async (scanId) => {
    try {
      const res = await axios.get(`${API}/api/integrity/scans/${scanId}`);
      if (res.data.ok) {
        setCurrentScan(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load scan:', error);
      toast.error('Failed to load scan details');
    }
  };

  const repairIssue = async (issue) => {
    setRepairing(true);
    try {
      let endpoint = '';
      
      if (issue.issue_type === 'invalid_status') {
        endpoint = `${API}/api/integrity/repair/invalid-status/${issue.record_id}?new_status=draft`;
      } else if (issue.issue_type === 'orphan_record' && issue.auto_fixable) {
        endpoint = `${API}/api/integrity/repair/missing-revision/${issue.record_id}`;
      } else if (issue.issue_type === 'orphan_revision') {
        endpoint = `${API}/api/integrity/repair/orphan-revision/${issue.record_id}`;
      } else {
        toast.error('This issue requires manual repair');
        setRepairing(false);
        return;
      }

      const res = await axios.post(endpoint);
      if (res.data.ok) {
        toast.success(res.data.data.message || 'Issue repaired');
        // Re-run scan to verify fix
        await runScan();
      } else {
        toast.error(res.data.error?.message || 'Repair failed');
      }
    } catch (error) {
      console.error('Repair failed:', error);
      toast.error('Failed to repair issue');
    } finally {
      setRepairing(false);
    }
  };

  return (
    <div className="min-h-screen bg-vault-void">
      <PageHeader 
        title="System Diagnostics" 
        subtitle="Data integrity monitoring and repair tools"
        icon={<Activity className="w-8 h-8 text-vault-gold" weight="duotone" />}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Action Bar */}
        <GlassCard className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-vault-gold/20">
                <ShieldCheck className="w-6 h-6 text-vault-gold" weight="duotone" />
              </div>
              <div>
                <h2 className="text-lg font-heading text-white">Integrity Scanner</h2>
                <p className="text-sm text-vault-muted">Check data consistency and find issues</p>
              </div>
            </div>
            
            <Button 
              onClick={runScan} 
              disabled={scanning}
              className="bg-vault-gold hover:bg-vault-gold/90 text-vault-dark"
            >
              {scanning ? (
                <>
                  <ArrowClockwise className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <FileSearch className="w-4 h-4 mr-2" />
                  Run Full Scan
                </>
              )}
            </Button>
          </div>
        </GlassCard>

        {/* Current Scan Results */}
        {currentScan && (
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading text-white">Scan Results</h3>
              <Badge className="bg-vault-dark/50 text-vault-muted border-vault-gold/30">
                {currentScan.scan_id}
              </Badge>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-3 rounded-lg bg-vault-dark/50 border border-vault-gold/20">
                <div className="text-2xl font-heading text-white">
                  {currentScan.total_records_scanned}
                </div>
                <div className="text-xs text-vault-muted">Records Scanned</div>
              </div>
              <div className="p-3 rounded-lg bg-vault-dark/50 border border-vault-gold/20">
                <div className={`text-2xl font-heading ${currentScan.total_issues_found > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {currentScan.total_issues_found}
                </div>
                <div className="text-xs text-vault-muted">Issues Found</div>
              </div>
              <div className="p-3 rounded-lg bg-vault-dark/50 border border-vault-gold/20">
                <div className="text-2xl font-heading text-amber-400">
                  {currentScan.auto_fixable_count}
                </div>
                <div className="text-xs text-vault-muted">Auto-Fixable</div>
              </div>
              <div className="p-3 rounded-lg bg-vault-dark/50 border border-vault-gold/20">
                <div className="text-2xl font-heading text-red-400">
                  {currentScan.issues_by_severity?.critical || 0}
                </div>
                <div className="text-xs text-vault-muted">Critical</div>
              </div>
            </div>

            {/* Severity Breakdown */}
            {currentScan.total_issues_found > 0 && (
              <div className="mb-4">
                <div className="text-sm text-vault-muted mb-2">Issues by Severity</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(currentScan.issues_by_severity || {}).map(([severity, count]) => (
                    count > 0 && (
                      <Badge key={severity} className={`${severityColors[severity]} border`}>
                        {severity}: {count}
                      </Badge>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Issues List */}
            {currentScan.issues?.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {currentScan.issues.map((issue, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="p-3 rounded-lg bg-vault-dark/30 border border-vault-gold/10 hover:border-vault-gold/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`${severityColors[issue.severity]} border text-xs`}>
                            {issue.severity}
                          </Badge>
                          <Badge className="bg-vault-dark/50 text-vault-muted border-vault-gold/20 text-xs">
                            {issueTypeLabels[issue.issue_type] || issue.issue_type}
                          </Badge>
                          {issue.auto_fixable && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                              <Wrench className="w-3 h-3 mr-1" />
                              Auto-fix
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-white mb-1">{issue.description}</div>
                        <div className="text-xs text-vault-muted font-mono">
                          {issue.record_type}: {issue.record_id}
                        </div>
                        {issue.suggested_fix && (
                          <div className="text-xs text-vault-gold mt-1">
                            → {issue.suggested_fix}
                          </div>
                        )}
                      </div>
                      
                      {issue.auto_fixable && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => repairIssue(issue)}
                          disabled={repairing}
                          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                        >
                          <Wrench className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-2" weight="duotone" />
                <div className="text-white font-medium">All Clear!</div>
                <div className="text-sm text-vault-muted">No integrity issues found</div>
              </div>
            )}
          </GlassCard>
        )}

        {/* Previous Scans */}
        {previousScans.length > 0 && (
          <GlassCard className="p-4">
            <h3 className="text-lg font-heading text-white mb-4">Scan History</h3>
            <div className="space-y-2">
              {previousScans.slice(0, 5).map((scan, idx) => (
                <div
                  key={scan.scan_id}
                  onClick={() => loadScan(scan.scan_id)}
                  className="p-3 rounded-lg bg-vault-dark/30 border border-vault-gold/10 hover:border-vault-gold/30 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm text-white font-mono">{scan.scan_id}</div>
                    <div className="text-xs text-vault-muted">
                      {new Date(scan.started_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={scan.total_issues_found > 0 ? severityColors.high : 'bg-green-500/20 text-green-400 border-green-500/30'}>
                      {scan.total_issues_found} issues
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Quick Actions */}
        <GlassCard className="p-4">
          <h3 className="text-lg font-heading text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="border-vault-gold/30 text-white hover:bg-vault-gold/10 justify-start"
              onClick={() => toast.info('Feature coming soon')}
            >
              <Database className="w-4 h-4 mr-2 text-vault-gold" />
              Export Scan Report
            </Button>
            <Button
              variant="outline"
              className="border-vault-gold/30 text-white hover:bg-vault-gold/10 justify-start"
              onClick={() => toast.info('Feature coming soon')}
            >
              <Lightning className="w-4 h-4 mr-2 text-vault-gold" />
              Auto-Fix All Safe Issues
            </Button>
            <Button
              variant="outline"
              className="border-vault-gold/30 text-white hover:bg-vault-gold/10 justify-start"
              onClick={() => toast.info('Feature coming soon')}
            >
              <Bug className="w-4 h-4 mr-2 text-vault-gold" />
              View API Errors
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
