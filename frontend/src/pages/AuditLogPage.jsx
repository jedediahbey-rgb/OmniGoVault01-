import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  ClipboardText,
  FileText,
  Folder,
  Fingerprint,
  Users,
  Gear,
  Download,
  MagnifyingGlass,
  ArrowClockwise,
  CaretLeft,
  CaretRight,
  Warning,
  Check,
  Info,
  Clock,
  Funnel,
  Export,
  ChartBar,
  Eye,
  X
} from '@phosphor-icons/react';
import PageHelpTooltip from '../components/shared/PageHelpTooltip';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Category icons and colors
const CATEGORY_CONFIG = {
  governance: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  binder: { icon: Folder, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  thread: { icon: ClipboardText, color: 'text-green-400', bg: 'bg-green-500/10' },
  integrity: { icon: Fingerprint, color: 'text-vault-gold', bg: 'bg-vault-gold/10' },
  auth: { icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  system: { icon: Gear, color: 'text-gray-400', bg: 'bg-gray-500/10' },
  export: { icon: Export, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  compliance: { icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
};

// Severity colors
const SEVERITY_CONFIG = {
  info: { color: 'text-gray-400', bg: 'bg-gray-500/10', badge: 'bg-gray-500/30' },
  notice: { color: 'text-blue-400', bg: 'bg-blue-500/10', badge: 'bg-blue-500/30' },
  warning: { color: 'text-amber-400', bg: 'bg-amber-500/10', badge: 'bg-amber-500/30' },
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', badge: 'bg-red-500/30' }
};

export default function AuditLogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  
  // State
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [portfolios, setPortfolios] = useState([]);
  const [exportData, setExportData] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Filters
  const [portfolioId, setPortfolioId] = useState(searchParams.get('portfolio') || '');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  
  const limit = 20;

  // Fetch portfolios
  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        const res = await fetch(`${API_URL}/api/portfolios`, {
          credentials: 'include'
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setPortfolios(data);
        }
      } catch (error) {
        console.error('Error fetching portfolios:', error);
      }
    };
    fetchPortfolios();
  }, []);

  // Fetch audit entries
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(page * limit)
      });
      
      if (portfolioId) params.append('portfolio_id', portfolioId);
      if (category) params.append('category', category);
      if (severity) params.append('severity', severity);
      if (search) params.append('search', search);
      
      const res = await fetch(`${API_URL}/api/audit-log?${params}`, {
        credentials: 'include'
      });
      const data = await res.json();
      
      if (data.ok) {
        setEntries(data.data.entries || []);
        setTotal(data.data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching audit log:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch audit log',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [portfolioId, category, severity, search, page, toast]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams({ days: '30' });
      if (portfolioId) params.append('portfolio_id', portfolioId);
      
      const res = await fetch(`${API_URL}/api/audit-log/summary?${params}`, {
        credentials: 'include'
      });
      const data = await res.json();
      
      if (data.ok) {
        setSummary(data.data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  }, [portfolioId]);

  useEffect(() => {
    fetchEntries();
    fetchSummary();
  }, [fetchEntries, fetchSummary]);

  // Export handler
  const handleExport = async (format, download = true) => {
    try {
      const params = new URLSearchParams({ format });
      if (portfolioId) params.append('portfolio_id', portfolioId);
      
      const res = await fetch(`${API_URL}/api/audit-log/export?${params}`, {
        credentials: 'include'
      });
      const data = await res.json();
      
      if (data.ok) {
        if (download) {
          // Create download
          const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `audit_log_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          toast({
            title: 'Export Complete',
            description: `Downloaded ${data.data.total} audit entries as JSON`
          });
        } else {
          // Show in modal
          setExportData(data.data);
          setShowExportModal(true);
        }
      }
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export audit log',
        variant: 'destructive'
      });
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-vault-dark">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2 sm:gap-3">
              <ClipboardText className="w-5 h-5 sm:w-7 sm:h-7 text-vault-gold" weight="fill" />
              Audit Log
            </h1>
            <p className="text-white/60 text-xs sm:text-sm mt-1 flex items-center gap-1.5">
              <span style={{ whiteSpace: 'nowrap' }}>Track all trust activities and maintain compliance records. <PageHelpTooltip pageKey="auditLog" /></span>
            </p>
          </div>
          
          {/* Action buttons - all on one line */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="border-vault-gold/30 text-vault-muted hover:text-white px-2 sm:px-3 text-xs sm:text-sm"
            >
              <Funnel className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('json', false)}
              className="border-vault-gold/30 text-vault-muted hover:text-white px-2 sm:px-3 text-xs sm:text-sm"
            >
              <Eye className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">View Report</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('json', true)}
              className="border-vault-gold/30 text-vault-muted hover:text-white px-2 sm:px-3 text-xs sm:text-sm"
            >
              <Download className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { fetchEntries(); fetchSummary(); }}
              className="text-vault-muted hover:text-white px-1.5"
            >
              <ArrowClockwise className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="p-3 sm:p-4 rounded-lg bg-[#0A0F1A] border border-vault-gold/10">
              <div className="flex items-center gap-2 mb-2">
                <ChartBar className="w-4 h-4 text-vault-gold" />
                <span className="text-vault-muted text-xs sm:text-sm">Total Events</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">{summary.total_entries}</div>
              <div className="text-xs text-vault-muted">Last 30 days</div>
            </div>
            
            <div className="p-3 sm:p-4 rounded-lg bg-[#0A0F1A] border border-vault-gold/10">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="text-vault-muted text-xs sm:text-sm">Governance</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-blue-400">{summary.by_category?.governance || 0}</div>
            </div>
            
            <div className="p-3 sm:p-4 rounded-lg bg-[#0A0F1A] border border-vault-gold/10">
              <div className="flex items-center gap-2 mb-2">
                <Folder className="w-4 h-4 text-purple-400" />
                <span className="text-vault-muted text-sm">Binders</span>
              </div>
              <div className="text-2xl font-bold text-purple-400">{summary.by_category?.binder || 0}</div>
            </div>
            
            <div className="p-4 rounded-lg bg-[#0A0F1A] border border-vault-gold/10">
              <div className="flex items-center gap-2 mb-2">
                <Warning className="w-4 h-4 text-red-400" />
                <span className="text-vault-muted text-sm">Critical</span>
              </div>
              <div className="text-2xl font-bold text-red-400">{summary.by_severity?.critical || 0}</div>
            </div>
          </div>
        )}

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="p-4 rounded-lg bg-[#0A0F1A] border border-vault-gold/10 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-vault-muted text-xs mb-1 block">Portfolio</label>
                  <Select value={portfolioId} onValueChange={(v) => { setPortfolioId(v === 'all' ? '' : v); setPage(0); }}>
                    <SelectTrigger className="bg-[#0B1221] border-vault-gold/30 text-white">
                      <SelectValue placeholder="All portfolios" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0B1221] border-vault-gold/30">
                      <SelectItem value="all" className="text-white">All portfolios</SelectItem>
                      {portfolios.map(p => (
                        <SelectItem key={p.portfolio_id} value={p.portfolio_id} className="text-white">
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-vault-muted text-xs mb-1 block">Category</label>
                  <Select value={category} onValueChange={(v) => { setCategory(v === 'all' ? '' : v); setPage(0); }}>
                    <SelectTrigger className="bg-[#0B1221] border-vault-gold/30 text-white">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0B1221] border-vault-gold/30">
                      <SelectItem value="all" className="text-white">All categories</SelectItem>
                      {Object.keys(CATEGORY_CONFIG).map(cat => (
                        <SelectItem key={cat} value={cat} className="text-white capitalize">{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-vault-muted text-xs mb-1 block">Severity</label>
                  <Select value={severity} onValueChange={(v) => { setSeverity(v === 'all' ? '' : v); setPage(0); }}>
                    <SelectTrigger className="bg-[#0B1221] border-vault-gold/30 text-white">
                      <SelectValue placeholder="All severities" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0B1221] border-vault-gold/30">
                      <SelectItem value="all" className="text-white">All severities</SelectItem>
                      {Object.keys(SEVERITY_CONFIG).map(sev => (
                        <SelectItem key={sev} value={sev} className="text-white capitalize">{sev}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-vault-muted text-xs mb-1 block">Search</label>
                  <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vault-muted" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search actions..."
                      className="pl-9 bg-[#0B1221] border-vault-gold/30 text-white"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Entries List */}
        <div className="bg-[#0A0F1A] rounded-lg border border-vault-gold/10 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <ArrowClockwise className="w-8 h-8 text-vault-gold animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-20 text-vault-muted">
              <ClipboardText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No audit entries found</p>
              <p className="text-sm mt-1">Activities will appear here as you use the system</p>
            </div>
          ) : (
            <div className="divide-y divide-vault-gold/10">
              {entries.map((entry) => {
                const catConfig = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.system;
                const sevConfig = SEVERITY_CONFIG[entry.severity] || SEVERITY_CONFIG.info;
                const Icon = catConfig.icon;
                
                return (
                  <div key={entry.id} className="p-3 sm:p-4 hover:bg-vault-gold/5 transition-colors">
                    <div className="flex gap-3">
                      {/* Category Icon */}
                      <div className={`p-2 rounded-lg ${catConfig.bg} shrink-0 self-start`}>
                        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${catConfig.color}`} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Action + Severity */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1.5">
                          <span className="text-white font-medium text-sm sm:text-base">{entry.action}</span>
                          <span className={`px-2 py-0.5 text-[10px] sm:text-xs rounded w-fit ${sevConfig.badge} ${sevConfig.color}`}>
                            {entry.severity}
                          </span>
                        </div>
                        
                        {/* Meta info - stack on mobile, row on desktop */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-vault-muted">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            {formatTime(entry.timestamp)}
                          </span>
                          <span className="capitalize">{entry.category}</span>
                          {entry.resource_id && (
                            <span className="font-mono text-vault-gold/70 break-all text-[10px] sm:text-xs">
                              {entry.resource_id}
                            </span>
                          )}
                        </div>
                        
                        {/* Details - key: value stacked on mobile */}
                        {entry.details && Object.keys(entry.details).length > 0 && (
                          <div className="mt-2 text-[10px] sm:text-xs text-vault-muted/70 space-y-1">
                            {Object.entries(entry.details).slice(0, 3).map(([k, v]) => (
                              <div key={k} className="flex flex-col sm:flex-row sm:gap-1">
                                <span className="text-vault-muted">{k.replace(/_/g, ' ')}:</span>
                                <span className="text-white/70 pl-2 sm:pl-0">{String(v).substring(0, 30)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-vault-gold/10">
              <span className="text-vault-muted text-sm">
                Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="text-vault-muted"
                >
                  <CaretLeft className="w-4 h-4" />
                </Button>
                <span className="text-vault-muted text-sm">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="text-vault-muted"
                >
                  <CaretRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && exportData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0A0F1A] rounded-lg border border-vault-gold/20 max-w-5xl w-full max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-vault-gold/10">
                <div>
                  <h2 className="text-lg font-bold text-white">Audit Log Report</h2>
                  <p className="text-vault-muted text-sm">
                    {exportData.total} activities • Generated {new Date(exportData.exported_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Print the report
                      window.print();
                    }}
                    className="border-vault-gold/30 text-vault-muted hover:text-white"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('json', true)}
                    className="border-vault-gold/30 text-vault-muted hover:text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowExportModal(false)}
                    className="text-vault-muted hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-4 overflow-auto max-h-[calc(85vh-80px)]">
                {/* Summary Section */}
                <div className="mb-6 p-4 bg-vault-gold/5 rounded-lg border border-vault-gold/10">
                  <h3 className="text-white font-medium mb-3">Report Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-vault-muted">Total Activities:</span>
                      <span className="text-white ml-2 font-medium">{exportData.total}</span>
                    </div>
                    <div>
                      <span className="text-vault-muted">Report Period:</span>
                      <span className="text-white ml-2">Last 30 days</span>
                    </div>
                    <div>
                      <span className="text-vault-muted">Generated:</span>
                      <span className="text-white ml-2">{new Date(exportData.exported_at).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-vault-muted">Format:</span>
                      <span className="text-white ml-2">Activity Report</span>
                    </div>
                  </div>
                </div>

                {/* Activity Table */}
                <div className="border border-vault-gold/10 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-vault-gold/10">
                      <tr>
                        <th className="text-left p-3 text-vault-muted font-medium">Date & Time</th>
                        <th className="text-left p-3 text-vault-muted font-medium">Activity</th>
                        <th className="text-left p-3 text-vault-muted font-medium">Category</th>
                        <th className="text-left p-3 text-vault-muted font-medium">Priority</th>
                        <th className="text-left p-3 text-vault-muted font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-vault-gold/10">
                      {exportData.entries?.map((entry, idx) => {
                        const catConfig = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.system;
                        const sevConfig = SEVERITY_CONFIG[entry.severity] || SEVERITY_CONFIG.info;
                        
                        return (
                          <tr key={idx} className="hover:bg-vault-gold/5">
                            <td className="p-3 text-vault-muted whitespace-nowrap">
                              {new Date(entry.timestamp).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="p-3 text-white">{entry.action}</td>
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${catConfig.bg} ${catConfig.color}`}>
                                {entry.category}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded text-xs ${sevConfig.badge} ${sevConfig.color}`}>
                                {entry.severity === 'info' ? 'Normal' : 
                                 entry.severity === 'notice' ? 'Notable' :
                                 entry.severity === 'warning' ? 'Warning' : 'Critical'}
                              </span>
                            </td>
                            <td className="p-3 text-vault-muted text-xs max-w-[200px] truncate">
                              {entry.details && Object.keys(entry.details).length > 0 
                                ? Object.entries(entry.details)
                                    .filter(([k]) => !k.startsWith('_'))
                                    .slice(0, 2)
                                    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                                    .join(', ')
                                : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* What is this report? */}
                <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <h4 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    What is this Audit Log?
                  </h4>
                  <p className="text-sm text-vault-muted">
                    The Audit Log tracks all important activities in your trust management system. 
                    This includes when documents are created or modified, when binders are generated, 
                    when records are finalized, and other significant events. This record helps you 
                    maintain compliance and provides a complete history of actions taken.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
