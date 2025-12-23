import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  FolderArchive, 
  FileText, 
  Briefcase, 
  Bell,
  Plus,
  ArrowRight,
  BookOpen,
  Sparkles,
  Clock
} from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import StatCard from '../components/shared/StatCard';
import GlassCard from '../components/shared/GlassCard';
import { Button } from '../components/ui/button';
import { staggerContainer, fadeInUp } from '../lib/motion';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DashboardPage({ user }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { icon: Plus, label: 'New Portfolio', action: () => navigate('/vault/documents'), color: 'gold' },
    { icon: FileText, label: 'New Document', action: () => navigate('/templates'), color: 'blue' },
    { icon: BookOpen, label: 'Start Learning', action: () => navigate('/learn'), color: 'default' },
    { icon: Sparkles, label: 'Study Maxims', action: () => navigate('/maxims'), color: 'gold' },
  ];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'User'}`}
        subtitle="Your trust portfolio overview and quick actions"
      />

      {/* Stats Grid */}
      <motion.div 
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <motion.div variants={fadeInUp}>
          <StatCard
            label="Portfolios"
            value={stats?.portfolios || 0}
            icon={FolderArchive}
            variant="gold"
          />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <StatCard
            label="Documents"
            value={stats?.documents || 0}
            icon={FileText}
            variant="default"
          />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <StatCard
            label="Assets"
            value={stats?.assets || 0}
            icon={Briefcase}
            variant="blue"
          />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <StatCard
            label="Pending Notices"
            value={stats?.pending_notices || 0}
            icon={Bell}
            variant="default"
          />
        </motion.div>
      </motion.div>

      {/* Main Content Grid - Bento Style */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Actions - 4 cols */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-4"
        >
          <GlassCard className="h-full">
            <h3 className="font-heading text-lg text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.action}
                  className={`p-4 rounded-lg border transition-all duration-200 flex flex-col items-center gap-2 group ${
                    action.color === 'gold' 
                      ? 'border-vault-gold/20 hover:bg-vault-gold/10 hover:border-vault-gold/40' 
                      : action.color === 'blue'
                      ? 'border-vault-blue/20 hover:bg-vault-blue/10 hover:border-vault-blue/40'
                      : 'border-white/10 hover:bg-white/5 hover:border-white/20'
                  }`}
                >
                  <action.icon className={`w-5 h-5 ${
                    action.color === 'gold' ? 'text-vault-gold' :
                    action.color === 'blue' ? 'text-vault-blue' : 'text-white/60'
                  }`} />
                  <span className="text-xs text-white/70 group-hover:text-white">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Recent Documents - 8 cols */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-8"
        >
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg text-white">Recent Documents</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/vault/documents')}
                className="text-vault-gold hover:text-vault-gold"
              >
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            {stats?.recent_documents?.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_documents.map((doc, idx) => (
                  <div 
                    key={doc.document_id}
                    onClick={() => navigate(`/vault/document/${doc.document_id}`)}
                    className="flex items-center gap-4 p-3 rounded-lg border border-white/5 hover:border-vault-gold/30 hover:bg-vault-gold/5 cursor-pointer transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white/40" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white truncate">{doc.title}</p>
                      <p className="text-xs text-white/40 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(doc.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/20" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/40">No documents yet</p>
                <Button 
                  onClick={() => navigate('/templates')}
                  className="mt-4 btn-secondary text-sm"
                >
                  Create Your First Document
                </Button>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Learning Progress - 6 cols */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-6"
        >
          <GlassCard className="h-full">
            <h3 className="font-heading text-lg text-white mb-4">Continue Learning</h3>
            <div className="space-y-4">
              <div 
                onClick={() => navigate('/learn')}
                className="p-4 rounded-lg bg-vault-gold/5 border border-vault-gold/20 hover:border-vault-gold/40 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <BookOpen className="w-5 h-5 text-vault-gold" />
                  <span className="text-white">Foundations of Equity</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="w-1/4 h-full bg-vault-gold rounded-full" />
                </div>
                <p className="text-xs text-white/40 mt-2">Module 1 of 5</p>
              </div>
              
              <div 
                onClick={() => navigate('/maxims')}
                className="p-4 rounded-lg bg-vault-blue/5 border border-vault-blue/20 hover:border-vault-blue/40 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="w-5 h-5 text-vault-blue" />
                  <span className="text-white">Maxims of Equity</span>
                </div>
                <p className="text-white/40 text-sm">20+ principles to master</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* AI Assistant Promo - 6 cols */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-6"
        >
          <GlassCard 
            className="h-full bg-gradient-to-br from-vault-gold/10 to-transparent border-vault-gold/20"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-vault-gold/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-vault-gold" />
              </div>
              <div>
                <h3 className="font-heading text-lg text-white mb-2">AI Assistant</h3>
                <p className="text-white/60 text-sm mb-4">
                  Get help drafting documents, understanding equity principles, 
                  or navigating trust relationships.
                </p>
                <Button 
                  onClick={() => navigate('/assistant')}
                  className="btn-primary text-sm"
                >
                  Ask a Question <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
