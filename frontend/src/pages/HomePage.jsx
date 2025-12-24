import { Link } from "react-router-dom";
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
    <div className="min-h-screen bg-[#0B1221]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B1221]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 sm:gap-3" data-testid="logo-link">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#C6A87C]/20 rounded-sm flex items-center justify-center flex-shrink-0">
                <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-[#C6A87C]" weight="duotone" />
              </div>
              <span className="font-serif text-lg sm:text-2xl font-semibold text-[#F8FAFC] tracking-tight truncate">
                Equity Trust
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link to="/knowledge" className="font-sans text-sm text-slate-400 hover:text-[#C6A87C] transition-colors" data-testid="nav-knowledge">
                Knowledge
              </Link>
              <Link to="/maxims" className="font-sans text-sm text-slate-400 hover:text-[#C6A87C] transition-colors" data-testid="nav-maxims">
                Maxims
              </Link>
              <Link to="/templates" className="font-sans text-sm text-slate-400 hover:text-[#C6A87C] transition-colors" data-testid="nav-templates">
                Templates
              </Link>
              <Link to="/assistant" className="font-sans text-sm text-slate-400 hover:text-[#C6A87C] transition-colors" data-testid="nav-assistant">
                Assistant
              </Link>
              <Link to="/login" data-testid="nav-login">
                <Button className="bg-[#C6A87C] text-[#0B1221] hover:bg-[#E8D5B5] font-sans font-bold uppercase tracking-wider text-xs px-6 py-2 rounded-sm">
                  Access Vault
                </Button>
              </Link>
            </div>
            {/* Mobile: Just show Access Vault button */}
            <Link to="/login" data-testid="nav-login-mobile" className="md:hidden">
              <Button className="bg-[#C6A87C] text-[#0B1221] hover:bg-[#E8D5B5] font-sans font-bold uppercase tracking-wider text-xs px-4 py-2 rounded-sm">
                Vault
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C6A87C] rounded-full blur-[150px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#C6A87C] rounded-full blur-[100px]"></div>
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-6 sm:mb-8">
              <Sparkle className="w-4 h-4 text-[#C6A87C]" weight="duotone" />
              <span className="font-sans text-xs text-slate-400 uppercase tracking-wider">
                AI-Powered · Source-Grounded
              </span>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl font-medium text-[#F8FAFC] tracking-tight leading-[1.1] sm:leading-[0.95] mb-6 sm:mb-8">
              Master <span className="text-[#C6A87C]">Equity</span>,<br />
              Structure Your <span className="text-[#C6A87C]">Trust</span>
            </h1>
            <p className="font-sans text-base sm:text-lg text-slate-400 leading-relaxed mb-8 sm:mb-10 max-w-2xl">
              A comprehensive platform for learning pure equity trust law, managing trust portfolios, 
              and creating professional documents — all grounded in authoritative source materials.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link to="/knowledge" data-testid="hero-learn" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-[#C6A87C] text-[#0B1221] hover:bg-[#E8D5B5] font-sans font-bold uppercase tracking-wider text-xs px-6 sm:px-8 py-3 rounded-sm shadow-[0_0_20px_rgba(198,168,124,0.3)]">
                  Start Learning
                  <BookOpen className="w-4 h-4 ml-2" weight="duotone" />
                </Button>
              </Link>
              <Link to="/vault" data-testid="hero-vault" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto border-[#C6A87C]/30 text-[#C6A87C] hover:bg-[#C6A87C]/10 font-sans font-semibold uppercase tracking-wider text-xs px-6 sm:px-8 py-3 rounded-sm">
                  Create Portfolio
                  <Shield className="w-4 h-4 ml-2" weight="duotone" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[#0F172A]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="font-serif text-2xl sm:text-4xl text-[#F8FAFC] mb-4">
              Your Complete <span className="text-[#C6A87C]">Trust Platform</span>
            </h2>
            <p className="font-sans text-sm sm:text-base text-slate-400 max-w-2xl mx-auto px-4">
              Everything you need to understand equity law and manage your trust documents in one secure platform.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <Link
                key={index}
                to={feature.link}
                className="group bg-[#111827] border border-white/5 p-6 sm:p-8 rounded-sm hover:border-[#C6A87C]/30 transition-all duration-300"
                data-testid={`feature-${index}`}
              >
                <div className="text-[#C6A87C] mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="font-serif text-lg sm:text-xl text-[#F8FAFC] mb-2 sm:mb-3">{feature.title}</h3>
                <p className="font-sans text-sm text-slate-400 mb-4 sm:mb-6 leading-relaxed">{feature.description}</p>
                <span className="inline-flex items-center gap-2 text-[#C6A87C] font-sans text-sm font-medium group-hover:gap-3 transition-all">
                  {feature.cta}
                  <ArrowRight className="w-4 h-4" weight="bold" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Source Documents Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[#0B1221]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <h2 className="font-serif text-2xl sm:text-4xl text-[#F8FAFC] mb-4 sm:mb-6">
                Grounded in <span className="text-[#C6A87C]">Authority</span>
              </h2>
              <p className="font-sans text-sm sm:text-base text-slate-400 mb-6 sm:mb-8 leading-relaxed">
                Every piece of knowledge on this platform is sourced from authoritative documents 
                on equity jurisprudence. Every claim includes a citation — no hallucinations, no guessing.
              </p>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-[#111827] border border-white/5 rounded-sm">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#C6A87C] mt-1 flex-shrink-0" weight="duotone" />
                  <div className="min-w-0">
                    <h4 className="font-sans font-semibold text-[#F8FAFC] mb-1 text-sm sm:text-base">Kingdom vs Empire (Roark)</h4>
                    <p className="font-sans text-xs sm:text-sm text-slate-400">Comprehensive guide to equity jurisprudence, maxims, and trust relationships.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-[#111827] border border-white/5 rounded-sm">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#C6A87C] mt-1 flex-shrink-0" weight="duotone" />
                  <div className="min-w-0">
                    <h4 className="font-sans font-semibold text-[#F8FAFC] mb-1 text-sm sm:text-base">Pure Trust Under Equity</h4>
                    <p className="font-sans text-xs sm:text-sm text-slate-400">Template documents and forms for establishing pure equity trusts.</p>
                  </div>
                </div>
              </div>
              <Link to="/sources" className="inline-flex items-center gap-2 mt-6 sm:mt-8 text-[#C6A87C] font-sans font-medium text-sm hover:gap-3 transition-all" data-testid="view-sources">
                View Source Library
                <ArrowRight className="w-4 h-4" weight="bold" />
              </Link>
            </div>
            <div className="relative hidden lg:block">
              <div className="aspect-square bg-gradient-to-br from-[#1E293B] to-[#0F172A] rounded-sm p-12 flex items-center justify-center">
                <div className="text-center">
                  <Users className="w-24 h-24 text-[#C6A87C]/20 mx-auto mb-6" weight="duotone" />
                  <p className="font-serif text-2xl text-[#C6A87C] italic">
                    "Equity looks to the intent rather than to the form"
                  </p>
                  <p className="font-sans text-xs text-slate-500 mt-4 uppercase tracking-wider">
                    — Maxim of Equity, Roark p.6
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[#0F172A]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-2xl sm:text-4xl text-[#F8FAFC] mb-4 sm:mb-6">
            Ready to Begin Your <span className="text-[#C6A87C]">Journey</span>?
          </h2>
          <p className="font-sans text-sm sm:text-base text-slate-400 mb-8 sm:mb-10 max-w-2xl mx-auto px-4">
            Create your secure vault, explore the knowledge base, or chat with our AI assistant 
            to start learning about pure equity trusts today.
          </p>
          <div className="flex flex-wrap justify-center gap-4 px-4">
            <Link to="/vault" data-testid="cta-vault" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-[#C6A87C] text-[#0B1221] hover:bg-[#E8D5B5] font-sans font-bold uppercase tracking-wider text-xs px-8 sm:px-10 py-3 sm:py-4 rounded-sm shadow-[0_0_20px_rgba(198,168,124,0.3)]">
                Create Your Vault
                <ArrowRight className="w-4 h-4 ml-2" weight="bold" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 sm:px-6 bg-[#0B1221] border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center gap-4 sm:gap-6 text-center md:flex-row md:justify-between md:text-left">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#C6A87C]/20 rounded-sm flex items-center justify-center">
                <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C6A87C]" weight="duotone" />
              </div>
              <span className="font-serif text-base sm:text-lg text-[#F8FAFC]">Equity Trust</span>
            </div>
            <p className="font-sans text-xs text-slate-500">
              Educational Platform · Not Legal Advice
            </p>
            <p className="font-sans text-xs text-slate-600">
              © {new Date().getFullYear()} All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
