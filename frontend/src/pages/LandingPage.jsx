import { Link } from "react-router-dom";
import { Shield, Scale, FileText, Users, ChevronRight, BookOpen, Lock, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";

const LandingPage = () => {
  const features = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Asset Protection",
      description: "Structure your assets within a pure equity trust framework, establishing clear separation between legal and beneficial ownership."
    },
    {
      icon: <Scale className="w-8 h-8" />,
      title: "Equity Principles",
      description: "Built upon centuries of equitable jurisprudence, recognizing the maxim that equity looks to the intent rather than the form."
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Document Generation",
      description: "Generate professional trust documents including Declarations of Trust, Trust Transfer Grant Deeds, and more."
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Role Definition",
      description: "Clearly define the roles of Grantor, Trustee, and Beneficiary within your trust structure."
    }
  ];

  const trustTypes = [
    {
      name: "Declaration of Trust",
      description: "The foundational document establishing your pure equity trust structure."
    },
    {
      name: "Trust Transfer Grant Deed",
      description: "Transfer property and rights into your established trust."
    },
    {
      name: "Notice of Intent",
      description: "Preserve your equitable interests with formal notice."
    },
    {
      name: "Affidavit of Fact",
      description: "Sworn statements establishing facts regarding your trust."
    }
  ];

  const maxims = [
    "Equity regards as done that which ought to be done",
    "Equity looks to the intent rather than to the form",
    "Equity will not suffer a wrong to be without a remedy",
    "Where there is equal equity, the law must prevail",
    "Equity follows the law",
    "He who seeks equity must do equity"
  ];

  return (
    <div className="min-h-screen bg-[#F9F7F1]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#F9F7F1]/95 backdrop-blur-sm border-b border-[#0B1221]/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
              <div className="w-10 h-10 bg-[#0B1221] rounded-sm flex items-center justify-center">
                <Scale className="w-5 h-5 text-[#C6A87C]" />
              </div>
              <span className="font-serif text-2xl font-semibold text-[#0B1221] tracking-tight">
                Sovereign Vault
              </span>
            </Link>
            <div className="flex items-center gap-6">
              <Link 
                to="/education" 
                className="font-sans text-sm font-medium text-[#0B1221]/70 hover:text-[#0B1221] transition-colors"
                data-testid="nav-education"
              >
                Education
              </Link>
              <Link to="/login" data-testid="nav-login">
                <Button className="btn-primary bg-[#0B1221] text-[#F9F7F1] hover:bg-[#0B1221]/90">
                  Access Vault
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B1221]/5 rounded-sm">
                <Lock className="w-4 h-4 text-[#C6A87C]" />
                <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[#0B1221]/70">
                  Pure Equity Trust Structuring
                </span>
              </div>
              <h1 className="font-serif text-5xl md:text-7xl font-medium text-[#0B1221] tracking-tight leading-[0.95]">
                Secure Your Legacy Through{" "}
                <span className="text-[#C6A87C]">Equity</span>
              </h1>
              <p className="font-sans text-lg text-[#0B1221]/70 leading-relaxed max-w-xl">
                Structure pure equity trusts, holding companies, and LLCs for ultimate asset protection. 
                Generate professional legal documents aligned with centuries of equitable jurisprudence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login" data-testid="hero-get-started">
                  <Button className="btn-primary bg-[#0B1221] text-[#F9F7F1] hover:bg-[#0B1221]/90 w-full sm:w-auto">
                    Begin Your Trust
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/education" data-testid="hero-learn-more">
                  <Button variant="outline" className="btn-secondary border-[#0B1221]/30 text-[#0B1221] hover:bg-[#0B1221]/5 w-full sm:w-auto">
                    Learn More
                    <BookOpen className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-sm overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1676312389476-fe01e238b422?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwxfHxmb3VudGFpbiUyMHBlbiUyMHdyaXRpbmclMjBvbiUyMHBhcGVyfGVufDB8fHx8MTc2NjQ4NTAyNXww&ixlib=rb-4.1.0&q=85"
                  alt="Legal document signing"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-[#0B1221] p-6 rounded-sm shadow-xl max-w-xs">
                <p className="font-serif text-lg text-[#C6A87C] italic">
                  "Equity will not suffer a wrong to be without a remedy"
                </p>
                <p className="font-sans text-xs text-[#F9F7F1]/60 mt-2 uppercase tracking-wider">
                  — Maxim of Equity
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-[#0B1221]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-normal text-[#F9F7F1] tracking-tight mb-4">
              The Foundation of <span className="text-[#C6A87C]">Protection</span>
            </h2>
            <p className="font-sans text-[#F9F7F1]/60 max-w-2xl mx-auto">
              Our platform provides the tools to structure and document your pure equity trust with precision and clarity.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="vault-card bg-[#111A2F] border-[#2D3748]/50 p-8 group"
                data-testid={`feature-card-${index}`}
              >
                <div className="text-[#C6A87C] mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="font-serif text-xl text-[#F9F7F1] mb-3">
                  {feature.title}
                </h3>
                <p className="font-sans text-sm text-[#F9F7F1]/60 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Types Section */}
      <section className="py-24 px-6 bg-[#F9F7F1]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <h2 className="font-serif text-4xl md:text-5xl font-normal text-[#0B1221] tracking-tight mb-6">
                Document <span className="text-[#C6A87C]">Templates</span>
              </h2>
              <p className="font-sans text-[#0B1221]/70 mb-8 leading-relaxed">
                Generate professional trust documents with our comprehensive template library. 
                Each document is structured to align with pure equity principles and can be customized for your specific needs.
              </p>
              <Link to="/login" data-testid="templates-cta">
                <Button className="btn-primary bg-[#0B1221] text-[#F9F7F1] hover:bg-[#0B1221]/90">
                  Start Creating
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="space-y-4">
              {trustTypes.map((type, index) => (
                <div 
                  key={index}
                  className="p-6 bg-white border border-[#0B1221]/10 rounded-sm hover:border-[#C6A87C]/50 transition-colors group cursor-pointer"
                  data-testid={`trust-type-${index}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-lg text-[#0B1221] mb-1">
                        {type.name}
                      </h3>
                      <p className="font-sans text-sm text-[#0B1221]/60">
                        {type.description}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#0B1221]/30 group-hover:text-[#C6A87C] group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Maxims Section */}
      <section className="py-24 px-6 bg-[#0B1221] relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <img 
            src="https://images.unsplash.com/photo-1747696766706-5485b39bf358?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwxfHxkYXJrJTIwbWFyYmxlJTIwdGV4dHVyZSUyMGJhY2tncm91bmR8ZW58MHx8fHwxNzY2NDg1MDE5fDA&ixlib=rb-4.1.0&q=85"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-normal text-[#F9F7F1] tracking-tight mb-4">
              Maxims of <span className="text-[#C6A87C]">Equity</span>
            </h2>
            <p className="font-sans text-[#F9F7F1]/60 max-w-2xl mx-auto">
              The foundational principles that guide equitable jurisprudence and inform our trust structures.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {maxims.map((maxim, index) => (
              <div 
                key={index}
                className="p-8 border border-[#C6A87C]/20 rounded-sm hover:border-[#C6A87C]/40 transition-colors"
                data-testid={`maxim-${index}`}
              >
                <p className="font-serif text-xl text-[#C6A87C] italic leading-relaxed">
                  "{maxim}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-[#F9F7F1]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-4xl md:text-5xl font-normal text-[#0B1221] tracking-tight mb-6">
            Begin Your Journey to <span className="text-[#C6A87C]">Protection</span>
          </h2>
          <p className="font-sans text-[#0B1221]/70 mb-8 max-w-2xl mx-auto leading-relaxed">
            Create your secure vault today and start structuring your pure equity trust with professional documents and guided templates.
          </p>
          <Link to="/login" data-testid="cta-get-started">
            <Button className="btn-primary bg-[#0B1221] text-[#F9F7F1] hover:bg-[#0B1221]/90 text-sm px-12 py-4">
              Access Your Vault
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-[#0B1221] border-t border-[#2D3748]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#C6A87C]/20 rounded-sm flex items-center justify-center">
                <Scale className="w-4 h-4 text-[#C6A87C]" />
              </div>
              <span className="font-serif text-lg text-[#F9F7F1]">Sovereign Vault</span>
            </div>
            <div className="flex items-center gap-8">
              <Link to="/education" className="font-sans text-sm text-[#F9F7F1]/60 hover:text-[#C6A87C] transition-colors">
                Education
              </Link>
              <Link to="/login" className="font-sans text-sm text-[#F9F7F1]/60 hover:text-[#C6A87C] transition-colors">
                Login
              </Link>
            </div>
            <p className="font-sans text-xs text-[#F9F7F1]/40">
              © {new Date().getFullYear()} Sovereign Vault. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
