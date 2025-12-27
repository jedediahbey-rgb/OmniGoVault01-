import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  Scales, 
  Shield, 
  ChatCircle, 
  FileText, 
  Users, 
  ArrowRight, 
  Sparkle 
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";

const HomePage = () => {
  const features = [
    {
      icon: <BookOpen className="w-8 h-8" weight="duotone" />,
      title: "Knowledge Base",
      description: "Structured learning from authoritative sources on equity jurisprudence, maxims, and trust law.",
      link: "/knowledge",
      cta: "Explore Topics"
    },
    {
      icon: <Scales className="w-8 h-8" weight="duotone" />,
      title: "Maxims of Equity",
      description: "Discover the foundational principles that govern equitable jurisprudence with citations.",
      link: "/maxims",
      cta: "View Maxims"
    },
    {
      icon: <Shield className="w-8 h-8" weight="duotone" />,
      title: "Portfolio Vault",
      description: "Secure workspace to create, store, and manage your trust documents with version history.",
      link: "/vault",
      cta: "Open Vault"
    },
    {
      icon: <ChatCircle className="w-8 h-8" weight="duotone" />,
      title: "AI Assistant",
      description: "Ask questions about equity trusts with answers grounded in source documents and citations.",
      link: "/assistant",
      cta: "Start Chat"
    }
  ];

  return (
    <div className="min-h-screen bg-vault-dark">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-vault-dark/80 backdrop-blur-md border-b border-vault-gold/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 sm:gap-3" data-testid="logo-link">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-vault-gold/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Scales className="w-4 h-4 sm:w-5 sm:h-5 text-vault-gold" weight="duotone" />
              </div>
              <span className="font-heading text-lg sm:text-2xl font-semibold text-white tracking-tight truncate">
                Equity Trust
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link to="/knowledge" className="text-sm text-vault-muted hover:text-vault-gold transition-colors" data-testid="nav-knowledge">
                Knowledge
              </Link>
              <Link to="/maxims" className="text-sm text-vault-muted hover:text-vault-gold transition-colors" data-testid="nav-maxims">
                Maxims
              </Link>
              <Link to="/templates" className="text-sm text-vault-muted hover:text-vault-gold transition-colors" data-testid="nav-templates">
                Templates
              </Link>
              <Link to="/assistant" className="text-sm text-vault-muted hover:text-vault-gold transition-colors" data-testid="nav-assistant">
                Assistant
              </Link>
              <Link to="/login" data-testid="nav-login">
                <Button className="bg-vault-gold text-vault-dark hover:bg-vault-gold/90 font-bold uppercase tracking-wider text-xs px-6 py-2 rounded-lg">
                  Access Vault
                </Button>
              </Link>
            </div>
            {/* Mobile: Just show Access Vault button */}
            <Link to="/login" data-testid="nav-login-mobile" className="md:hidden">
              <Button className="bg-vault-gold text-vault-dark hover:bg-vault-gold/90 font-bold uppercase tracking-wider text-xs px-4 py-2 rounded-lg">
                Vault
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-vault-gold rounded-full blur-[150px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-vault-gold rounded-full blur-[100px]"></div>
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl mx-auto relative z-10"
        >
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 border border-vault-gold/20 rounded-full mb-6 sm:mb-8">
              <Sparkle className="w-4 h-4 text-vault-gold" weight="duotone" />
              <span className="text-xs text-vault-muted uppercase tracking-wider">
                AI-Powered · Source-Grounded
              </span>
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl md:text-7xl font-medium text-white tracking-tight leading-[1.1] sm:leading-[0.95] mb-6 sm:mb-8">
              Master <span className="text-vault-gold">Equity</span>,<br />
              Structure Your <span className="text-vault-gold">Trust</span>
            </h1>
            <p className="text-base sm:text-lg text-vault-muted leading-relaxed mb-8 sm:mb-10 max-w-2xl">
              A comprehensive platform for learning exclusive equity trust law, managing trust portfolios, 
              and creating professional documents — all grounded in authoritative source materials.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link to="/knowledge" data-testid="hero-learn" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-vault-gold text-vault-dark hover:bg-vault-gold/90 font-bold uppercase tracking-wider text-xs px-6 sm:px-8 py-3 rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                  Start Learning
                  <BookOpen className="w-4 h-4 ml-2" weight="duotone" />
                </Button>
              </Link>
              <Link to="/vault" data-testid="hero-vault" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto border-vault-gold/30 text-vault-gold hover:bg-vault-gold/10 font-semibold uppercase tracking-wider text-xs px-6 sm:px-8 py-3 rounded-lg">
                  Create Portfolio
                  <Shield className="w-4 h-4 ml-2" weight="duotone" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[#0B1221]/80">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mb-10 sm:mb-16"
          >
            <h2 className="font-heading text-2xl sm:text-4xl text-white mb-4">
              Your Complete <span className="text-vault-gold">Trust Platform</span>
            </h2>
            <p className="text-sm sm:text-base text-vault-muted max-w-2xl mx-auto px-4">
              Everything you need to understand equity law and manage your trust documents in one secure platform.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
              >
                <Link
                  to={feature.link}
                  className="group block bg-[#0B1221] border border-vault-gold/10 p-6 sm:p-8 rounded-xl hover:border-vault-gold/30 transition-all duration-300"
                  data-testid={`feature-${index}`}
                >
                  <div className="text-vault-gold mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="font-heading text-lg sm:text-xl text-white mb-2 sm:mb-3">{feature.title}</h3>
                  <p className="text-sm text-vault-muted mb-4 sm:mb-6 leading-relaxed">{feature.description}</p>
                  <span className="inline-flex items-center gap-2 text-vault-gold text-sm font-medium group-hover:gap-3 transition-all">
                    {feature.cta}
                    <ArrowRight className="w-4 h-4" weight="bold" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Source Documents Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-vault-dark">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="font-heading text-2xl sm:text-4xl text-white mb-4 sm:mb-6">
                Grounded in <span className="text-vault-gold">Authority</span>
              </h2>
              <p className="text-sm sm:text-base text-vault-muted mb-6 sm:mb-8 leading-relaxed">
                Every piece of knowledge on this platform is sourced from authoritative documents 
                on equity jurisprudence. Every claim includes a citation — no hallucinations, no guessing.
              </p>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-[#0B1221]/80 border border-vault-gold/10 rounded-xl">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-vault-gold mt-1 flex-shrink-0" weight="duotone" />
                  <div className="min-w-0">
                    <h4 className="font-semibold text-white mb-1 text-sm sm:text-base">Kingdom vs Empire (Roark)</h4>
                    <p className="text-xs sm:text-sm text-vault-muted">Comprehensive guide to equity jurisprudence, maxims, and trust relationships.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-[#0B1221]/80 border border-vault-gold/10 rounded-xl">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-vault-gold mt-1 flex-shrink-0" weight="duotone" />
                  <div className="min-w-0">
                    <h4 className="font-semibold text-white mb-1 text-sm sm:text-base">Exclusive Trust Under Equity</h4>
                    <p className="text-xs sm:text-sm text-vault-muted">Template documents and forms for establishing exclusive equity trusts.</p>
                  </div>
                </div>
              </div>
              <Link to="/sources" className="inline-flex items-center gap-2 mt-6 sm:mt-8 text-vault-gold font-medium text-sm hover:gap-3 transition-all" data-testid="view-sources">
                View Source Library
                <ArrowRight className="w-4 h-4" weight="bold" />
              </Link>
            </motion.div>
            <div className="relative hidden lg:block">
              <div className="aspect-square bg-gradient-to-br from-[#1E293B] to-vault-dark rounded-xl p-12 flex items-center justify-center border border-vault-gold/10">
                <div className="text-center">
                  <Users className="w-24 h-24 text-vault-gold/20 mx-auto mb-6" weight="duotone" />
                  <p className="font-heading text-2xl text-vault-gold italic">
                    "Equity looks to the intent rather than to the form"
                  </p>
                  <p className="text-xs text-vault-muted mt-4 uppercase tracking-wider">
                    — Maxim of Equity, Roark p.6
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[#0B1221]/80">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="font-heading text-2xl sm:text-4xl text-white mb-4 sm:mb-6">
            Ready to Begin Your <span className="text-vault-gold">Journey</span>?
          </h2>
          <p className="text-sm sm:text-base text-vault-muted mb-8 sm:mb-10 max-w-2xl mx-auto px-4">
            Create your secure vault, explore the knowledge base, or chat with our AI assistant 
            to start learning about exclusive equity trusts today.
          </p>
          <div className="flex flex-wrap justify-center gap-4 px-4">
            <Link to="/vault" data-testid="cta-vault" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-vault-gold text-vault-dark hover:bg-vault-gold/90 font-bold uppercase tracking-wider text-xs px-8 sm:px-10 py-3 sm:py-4 rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                Create Your Vault
                <ArrowRight className="w-4 h-4 ml-2" weight="bold" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 sm:px-6 bg-vault-dark border-t border-vault-gold/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center gap-4 sm:gap-6 text-center md:flex-row md:justify-between md:text-left">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-vault-gold/20 rounded-lg flex items-center justify-center">
                <Scales className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-vault-gold" weight="duotone" />
              </div>
              <span className="font-heading text-base sm:text-lg text-white">Equity Trust</span>
            </div>
            <p className="text-xs text-vault-muted">
              Educational Platform · Not Legal Advice
            </p>
            <p className="text-xs text-vault-muted/60">
              © {new Date().getFullYear()} All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
