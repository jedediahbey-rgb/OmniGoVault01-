/**
 * Diagnostics Page - Admin UI for Integrity Tools
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

export default function DiagnosticsPage() {
  const [scanning, setScanning] = useState(false);
  const [currentScan, setCurrentScan] = useState(null);
  const [error, setError] = useState(null);

  const runScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await axios.post(`${API}/api/integrity/scan`);
      if (res.data.ok) {
        setCurrentScan(res.data.data);
      } else {
        setError('Scan failed');
      }
    } catch (err) {
      console.error('Scan failed:', err);
      setError(err.message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-vault-void p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">System Diagnostics</h1>
        
        <button 
          onClick={runScan}
          disabled={scanning}
          className="px-4 py-2 bg-vault-gold text-vault-dark rounded-lg hover:bg-vault-gold/90 disabled:opacity-50"
        >
          {scanning ? 'Scanning...' : 'Run Full Scan'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {currentScan && (
          <div className="mt-6 p-4 bg-vault-dark/50 border border-vault-gold/20 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Scan Results</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-vault-dark/30 rounded-lg">
                <div className="text-2xl font-bold text-white">{currentScan.total_records_scanned}</div>
                <div className="text-sm text-vault-muted">Records Scanned</div>
              </div>
              <div className="p-3 bg-vault-dark/30 rounded-lg">
                <div className={`text-2xl font-bold ${currentScan.total_issues_found > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {currentScan.total_issues_found}
                </div>
                <div className="text-sm text-vault-muted">Issues Found</div>
              </div>
            </div>

            {currentScan.issues?.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {currentScan.issues.map((issue, idx) => (
                  <div key={idx} className="p-3 bg-vault-dark/30 rounded-lg border border-vault-gold/10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        issue.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                        issue.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {issue.severity}
                      </span>
                      <span className="text-xs text-vault-muted">{issue.issue_type}</span>
                    </div>
                    <div className="text-sm text-white">{issue.description}</div>
                    <div className="text-xs text-vault-muted font-mono mt-1">{issue.record_id}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
