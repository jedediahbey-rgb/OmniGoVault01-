import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  ArrowRight,
  Calendar,
  CalendarBlank,
  CaretDown,
  Check,
  Clock,
  CurrencyDollar,
  Eye,
  FileText,
  Funnel,
  Gavel,
  HandCoins,
  ListBullets,
  MagnifyingGlass,
  Newspaper,
  PencilSimple,
  Scales,
  Scroll,
  ShieldCheck,
  User,
  X,
} from '@phosphor-icons/react';
import PageHeader from '../components/shared/PageHeader';
import GlassCard from '../components/shared/GlassCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { staggerContainer, fadeInUp } from '../lib/motion';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Module type configurations
const moduleConfig = {
  minutes: {
    icon: Newspaper,
    color: 'blue',
    label: 'Meeting Minutes',
    bgClass: 'bg-blue-500/20',
    borderClass: 'border-blue-500/30',
    textClass: 'text-blue-400',
    dotClass: 'bg-blue-400',
  },
  distribution: {
    icon: HandCoins,
    color: 'green',
    label: 'Distribution',
    bgClass: 'bg-green-500/20',
    borderClass: 'border-green-500/30',
    textClass: 'text-green-400',
    dotClass: 'bg-green-400',
  },
  dispute: {
    icon: Scales,
    color: 'red',
    label: 'Dispute',
    bgClass: 'bg-red-500/20',
    borderClass: 'border-red-500/30',
    textClass: 'text-red-400',
    dotClass: 'bg-red-400',
  },
  insurance: {
    icon: ShieldCheck,
    color: 'purple',
    label: 'Insurance',
    bgClass: 'bg-purple-500/20',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-400',
    dotClass: 'bg-purple-400',
  },
  compensation: {
    icon: CurrencyDollar,
    color: 'amber',
    label: 'Compensation',
    bgClass: 'bg-amber-500/20',
    borderClass: 'border-amber-500/30',
    textClass: 'text-amber-400',
    dotClass: 'bg-amber-400',
  },
};

// Status badge configurations
const statusConfig = {
  draft: { label: 'Draft', bgClass: 'bg-amber-500/20', textClass: 'text-amber-400', borderClass: 'border-amber-500/30' },
  finalized: { label: 'Finalized', bgClass: 'bg-green-500/20', textClass: 'text-green-400', borderClass: 'border-green-500/30' },
  voided: { label: 'Voided', bgClass: 'bg-red-500/20', textClass: 'text-red-400', borderClass: 'border-red-500/30' },
  amended: { label: 'Amended', bgClass: 'bg-blue-500/20', textClass: 'text-blue-400', borderClass: 'border-blue-500/30' },
};

// Event type icons
const eventTypeIcons = {
  created: PencilSimple,
  finalized: Check,
  amended: FileText,
  voided: X,
  updated: PencilSimple,
};

export default function LedgerTimelinePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState(searchParams.get('module') || 'all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' or 'list'

  // Fetch all governance records
  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/governance/v2/records?limit=100`);
        if (res.data.ok) {
          setRecords(res.data.data.items || []);
        }
      } catch (error) {
        console.error('Failed to fetch records:', error);
        toast.error('Failed to load governance ledger');
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (moduleFilter !== 'all') params.set('module', moduleFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    setSearchParams(params, { replace: true });
  }, [moduleFilter, statusFilter, setSearchParams]);

  // Filter and sort records
  const filteredRecords = records
    .filter(record => {
      if (moduleFilter !== 'all' && record.module_type !== moduleFilter) return false;
      if (statusFilter !== 'all' && record.status !== statusFilter) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          record.title?.toLowerCase().includes(search) ||
          record.rm_id?.toLowerCase().includes(search)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  // Group records by date
  const groupedByDate = filteredRecords.reduce((groups, record) => {
    const date = new Date(record.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(record);
    return groups;
  }, {});

  const getRecordLink = (record) => {
    const moduleMap = {
      minutes: 'meetings',
      distribution: 'distributions',
      dispute: 'disputes',
      insurance: 'insurance',
      compensation: 'compensation',
    };
    const module = moduleMap[record.module_type] || record.module_type;
    return `/vault/governance/${module}/${record.id}`;
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatRelativeTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const stats = {
    total: records.length,
    drafts: records.filter(r => r.status === 'draft').length,
    finalized: records.filter(r => r.status === 'finalized').length,
    thisMonth: records.filter(r => {
      const date = new Date(r.created_at);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="p-4 sm:p-6 lg:p-8"
    >
      <PageHeader
        icon={Scroll}
        title="Governance Ledger"
        subtitle="Unified timeline of all trust governance activities"
      />

      {/* Stats Bar */}
      <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <GlassCard className="!p-4">
          <div className="text-2xl font-heading text-vault-gold">{stats.total}</div>
          <div className="text-white/50 text-sm">Total Records</div>
        </GlassCard>
        <GlassCard className="!p-4">
          <div className="text-2xl font-heading text-amber-400">{stats.drafts}</div>
          <div className="text-white/50 text-sm">Drafts</div>
        </GlassCard>
        <GlassCard className="!p-4">
          <div className="text-2xl font-heading text-green-400">{stats.finalized}</div>
          <div className="text-white/50 text-sm">Finalized</div>
        </GlassCard>
        <GlassCard className="!p-4">
          <div className="text-2xl font-heading text-blue-400">{stats.thisMonth}</div>
          <div className="text-white/50 text-sm">This Month</div>
        </GlassCard>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeInUp}>
        <GlassCard className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Search by title or RM-ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-vault-dark border-vault-gold/30"
              />
            </div>

            {/* Module Filter */}
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-[180px] bg-vault-dark border-vault-gold/30">
                <Funnel className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent className="!bg-[#0a0a0f] bg-opacity-100 border-vault-gold/30 backdrop-blur-none z-50">
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="minutes">Meeting Minutes</SelectItem>
                <SelectItem value="distribution">Distributions</SelectItem>
                <SelectItem value="dispute">Disputes</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="compensation">Compensation</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] bg-vault-dark border-vault-gold/30">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="!bg-[#0a0a0f] bg-opacity-100 border-vault-gold/30 backdrop-blur-none z-50">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="finalized">Finalized</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="border-vault-gold/30 text-white"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
            </Button>

            {/* View Mode Toggle */}
            <div className="flex border border-vault-gold/30 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-2 ${viewMode === 'timeline' ? 'bg-vault-gold text-vault-dark' : 'text-white/60 hover:bg-white/5'}`}
              >
                <Clock className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-vault-gold text-vault-dark' : 'text-white/60 hover:bg-white/5'}`}
              >
                <ListBullets className="w-4 h-4" />
              </button>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Timeline/List View */}
      {filteredRecords.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Gavel className="w-16 h-16 mx-auto text-vault-gold/30 mb-4" />
          <h3 className="text-lg font-heading text-white mb-2">No Records Found</h3>
          <p className="text-white/50 text-sm mb-4">
            {searchTerm || moduleFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Start by creating governance records'}
          </p>
          <Link to="/vault/governance">
            <Button className="bg-vault-gold text-vault-dark">
              Go to Governance
            </Button>
          </Link>
        </GlassCard>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === 'timeline' ? (
            // Timeline View
            <motion.div 
              key="timeline-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              {/* Timeline line */}
              <div className="absolute left-4 md:left-8 top-0 bottom-0 w-0.5 bg-vault-gold/20" />

          {Object.entries(groupedByDate).map(([date, dateRecords], dateIdx) => (
            <motion.div
              key={date}
              variants={fadeInUp}
              className="mb-8"
            >
              {/* Date Header */}
              <div className="flex items-center gap-4 mb-4 pl-0 md:pl-4">
                <div className="w-8 h-8 rounded-full bg-vault-gold/20 border-2 border-vault-gold flex items-center justify-center z-10">
                  <CalendarBlank className="w-4 h-4 text-vault-gold" />
                </div>
                <div>
                  <div className="text-white font-heading">{date}</div>
                  <div className="text-white/40 text-sm">{formatRelativeTime(dateRecords[0].created_at)}</div>
                </div>
              </div>

              {/* Records for this date */}
              <div className="space-y-3 ml-8 md:ml-12 pl-4 md:pl-8">
                {dateRecords.map((record, idx) => {
                  const config = moduleConfig[record.module_type] || moduleConfig.minutes;
                  const status = statusConfig[record.status] || statusConfig.draft;
                  const Icon = config.icon;

                  return (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Link to={getRecordLink(record)}>
                        <GlassCard
                          interactive
                          className="relative overflow-hidden group"
                        >
                          {/* Timeline dot */}
                          <div className={`absolute -left-[25px] md:-left-[33px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${config.dotClass} border-2 border-vault-dark`} />
                          
                          <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className={`w-10 h-10 rounded-lg ${config.bgClass} ${config.borderClass} border flex items-center justify-center flex-shrink-0`}>
                              <Icon className={`w-5 h-5 ${config.textClass}`} weight="duotone" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-white font-medium truncate group-hover:text-vault-gold transition-colors pr-2">
                                    {record.title}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1 text-sm flex-wrap">
                                    <span className={`${config.textClass} flex-shrink-0`}>{config.label}</span>
                                    {record.rm_id && (
                                      <>
                                        <span className="text-white/20">•</span>
                                        <span className="text-white/40 font-mono text-xs truncate max-w-[120px] sm:max-w-none">{record.rm_id}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 mt-2 sm:mt-0">
                                  <Badge className={`${status.bgClass} ${status.textClass} ${status.borderClass} border text-xs`}>
                                    {status.label}
                                  </Badge>
                                  <span className="text-white/40 text-xs whitespace-nowrap">
                                    {formatTime(record.created_at)}
                                  </span>
                                </div>
                              </div>

                              {/* Version info */}
                              {record.revision > 1 && (
                                <div className="mt-2 text-xs text-white/40">
                                  Version {record.revision}
                                </div>
                              )}
                            </div>

                            {/* Arrow */}
                            <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-vault-gold transition-colors flex-shrink-0" />
                          </div>
                        </GlassCard>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        // List View
        <div className="space-y-2">
          {filteredRecords.map((record, idx) => {
            const config = moduleConfig[record.module_type] || moduleConfig.minutes;
            const status = statusConfig[record.status] || statusConfig.draft;
            const Icon = config.icon;

            return (
              <motion.div
                key={record.id}
                variants={fadeInUp}
              >
                <Link to={getRecordLink(record)}>
                  <GlassCard interactive className="group">
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-lg ${config.bgClass} ${config.borderClass} border flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${config.textClass}`} weight="duotone" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-white font-medium truncate group-hover:text-vault-gold transition-colors">
                              {record.title}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-white/40 flex-wrap">
                              <span className="flex-shrink-0">{config.label}</span>
                              {record.rm_id && (
                                <>
                                  <span className="text-white/20">•</span>
                                  <span className="font-mono text-xs truncate max-w-[120px] sm:max-w-none">{record.rm_id}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Status & Date */}
                          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                            <Badge className={`${status.bgClass} ${status.textClass} ${status.borderClass} border text-xs`}>
                              {status.label}
                            </Badge>
                            <div className="text-right">
                              <div className="text-white/60 text-xs sm:text-sm">
                                {new Date(record.created_at).toLocaleDateString()}
                              </div>
                              <div className="text-white/40 text-xs">
                                {formatTime(record.created_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Arrow */}
                      <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-vault-gold transition-colors flex-shrink-0 hidden sm:block" />
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Summary Footer */}
      <motion.div variants={fadeInUp} className="mt-8 text-center text-white/40 text-sm">
        Showing {filteredRecords.length} of {records.length} records
        {(moduleFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
          <button
            onClick={() => {
              setModuleFilter('all');
              setStatusFilter('all');
              setSearchTerm('');
            }}
            className="ml-2 text-vault-gold hover:underline"
          >
            Clear filters
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
