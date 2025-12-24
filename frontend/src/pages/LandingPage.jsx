import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  BookOpen, 
  Sparkle, 
  FolderSimple, 
  Robot, 
  ArrowRight,
  Scales,
  FileText,
  Users
} from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { staggerContainer, fadeInUp } from '../lib/motion';

const features = [
  {
    icon: BookOpen,
    title: 'Learn',
    description: 'Master equity jurisprudence through structured modules and interactive lessons'
  },
  {
    icon: Sparkle,
    title: 'Maxims',
    description: 'Study the foundational principles that govern equitable relationships'
  },
  {
    icon: FolderSimple,
    title: 'Vault',
    description: 'Manage your trust portfolios, documents, and assets in one secure workspace'
  },
  {
    icon: Robot,
    title: 'Assistant',
    description: 'AI-powered guidance grounded in trust law and equitable principles'
  }
];

const stats = [
  { value: '20+', label: 'Maxims of Equity' },
  { value: '7', label: 'Document Templates' },
  { value: '4', label: 'Trust Relationships' },
  { value: '∞', label: 'Learning Resources' }
];

export default function LandingPage() {
  const navigate = useNavigate();

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleLogin = () => {
    const redirectUrl = window.location.origin + '/vault';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-vault-navy overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-vault-navy via-vault-navy to-vault-void" />
      <div 
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(198, 168, 124, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(198, 168, 124, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px'
        }}
      />
      
      {/* Gold accent orb */}
      <div className="fixed top-1/4 right-1/4 w-96 h-96 bg-vault-gold/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-1/4 left-1/4 w-64 h-64 bg-vault-blue/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-vault-gold to-vault-gold-dim flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-vault-navy" />
            </div>
            <span className="font-heading text-lg sm:text-xl text-white truncate">Equity Trust</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => navigate('/learn')}
              className="text-white/60 hover:text-white transition-colors"
            >
              Learn
            </button>
            <button 
              onClick={() => navigate('/maxims')}
              className="text-white/60 hover:text-white transition-colors"
            >
              Maxims
            </button>
            <Button 
              onClick={handleLogin}
              className="btn-primary"
            >
              Enter Vault
            </Button>
          </div>
          {/* Mobile: Just show Enter Vault button */}
          <Button 
            onClick={handleLogin}
            className="btn-primary md:hidden text-sm px-4"
          >
            Enter Vault
          </Button>
        </nav>

        {/* Hero Section */}
        <motion.section 
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="px-4 sm:px-8 pt-12 sm:pt-20 pb-16 sm:pb-32 max-w-7xl mx-auto"
        >
          <motion.div variants={fadeInUp} className="max-w-3xl">
            <p className="text-vault-gold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-xs sm:text-sm mb-4 sm:mb-6">
              The Sovereign's Workspace
            </p>
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-heading text-white leading-tight mb-4 sm:mb-6">
              Master <span className="text-gold-gradient italic">Equity</span>,
              <br />Build Your Trust
            </h1>
            <p className="text-base sm:text-xl text-white/60 leading-relaxed mb-8 sm:mb-10 max-w-2xl">
              A comprehensive platform for understanding equity jurisprudence, 
              managing trust portfolios, and creating legally-structured documents 
              with AI-powered assistance.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button 
                onClick={handleLogin}
                className="btn-primary text-sm sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto"
              >
                Get Started <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
              <Button 
                onClick={() => navigate('/learn')}
                variant="outline"
                className="btn-secondary text-sm sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto"
              >
                Explore Learning
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div 
            variants={fadeInUp}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mt-12 sm:mt-20"
          >
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <p className="text-2xl sm:text-4xl font-heading text-vault-gold mb-1 sm:mb-2">{stat.value}</p>
                <p className="text-xs sm:text-sm text-white/40 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.section>

        {/* Features */}
        <section className="px-4 sm:px-8 py-16 sm:py-24 bg-vault-void/50">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10 sm:mb-16"
            >
              <p className="text-vault-gold uppercase tracking-[0.2em] text-xs sm:text-sm mb-3 sm:mb-4">Platform Features</p>
              <h2 className="text-2xl sm:text-4xl font-heading text-white">Everything You Need</h2>
            </motion.div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass-card p-5 sm:p-6 rounded-xl group hover:border-vault-gold/30 transition-all duration-300"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-vault-gold/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-vault-gold/20 transition-colors">
                    <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-vault-gold" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-heading text-white mb-2">{feature.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 sm:px-8 py-16 sm:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="glass-panel p-6 sm:p-12 rounded-2xl"
            >
              <Scale className="w-12 h-12 sm:w-16 sm:h-16 text-vault-gold mx-auto mb-4 sm:mb-6" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading text-white mb-3 sm:mb-4">
                Begin Your Journey in Equity
              </h2>
              <p className="text-white/60 text-sm sm:text-base mb-6 sm:mb-8 max-w-xl mx-auto">
                Access structured learning, manage your trust portfolios, and get AI-powered 
                assistance—all grounded in centuries of equitable jurisprudence.
              </p>
              <Button onClick={handleLogin} className="btn-primary text-sm sm:text-lg px-8 sm:px-10 py-3 sm:py-4 w-full sm:w-auto">
                Enter the Vault <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-4 sm:px-8 py-6 sm:py-8 border-t border-white/5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <p className="text-white/30 text-xs sm:text-sm">
              © 2025 Equity Trust Portfolio
            </p>
            <p className="text-white/30 text-xs sm:text-sm">
              Educational purposes only · Not legal advice
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
