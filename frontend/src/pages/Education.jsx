import { Link } from "react-router-dom";
import { Scale, ArrowLeft, BookOpen, Users, Shield, FileText, ChevronRight, Scroll } from "lucide-react";
import { Button } from "../components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";

const Education = () => {
  const maxims = [
    {
      maxim: "Equity regards as done that which ought to be done",
      explanation: "When parties have agreed to do something, equity will treat it as already accomplished. This maxim is foundational to trust law, as it allows equity to recognize beneficial interests even before formal transfers."
    },
    {
      maxim: "Equity looks to the intent rather than to the form",
      explanation: "The substance of a transaction matters more than its outward appearance. Courts will look at the true intention behind a trust arrangement rather than being bound by technical formalities."
    },
    {
      maxim: "Equity will not suffer a wrong to be without a remedy",
      explanation: "If someone has been wronged but cannot find relief under common law, equity will provide a remedy. This ensures the beneficiary's interests are always protected."
    },
    {
      maxim: "Where there is equal equity, the law must prevail",
      explanation: "When two parties have equally valid equitable claims, the legal title holder will prevail. This emphasizes the importance of proper documentation in trust structures."
    },
    {
      maxim: "Equity follows the law",
      explanation: "Equity works alongside, not against, the legal system. Pure equity trusts operate within the legal framework while leveraging equitable principles."
    },
    {
      maxim: "He who seeks equity must do equity",
      explanation: "A party seeking equitable relief must act fairly and in good faith. This is essential in trust relationships where all parties must fulfill their obligations."
    },
    {
      maxim: "Equity delights in equality",
      explanation: "Where there is doubt, equity will prefer equal division. This principle guides the fair treatment of multiple beneficiaries."
    },
    {
      maxim: "Equity will not aid a volunteer",
      explanation: "Someone who provides something without receiving consideration may not receive equitable assistance. This underscores the importance of proper trust funding and consideration."
    }
  ];

  const roles = [
    {
      title: "Grantor (Settlor)",
      icon: <Users className="w-6 h-6" />,
      description: "The creator and original funder of the trust",
      responsibilities: [
        "Creates the trust document and establishes its terms",
        "Transfers property or assets into the trust",
        "Defines the purposes and beneficiaries of the trust",
        "May retain certain powers depending on trust type",
        "Establishes the intent that governs trust interpretation"
      ]
    },
    {
      title: "Trustee",
      icon: <Shield className="w-6 h-6" />,
      description: "The legal title holder who manages the trust",
      responsibilities: [
        "Holds legal title to trust assets",
        "Manages and administers trust property",
        "Acts as a fiduciary with duties of loyalty and care",
        "Distributes assets according to trust terms",
        "Keeps accurate records and accounts"
      ]
    },
    {
      title: "Beneficiary",
      icon: <Scroll className="w-6 h-6" />,
      description: "The true owner in equity who receives benefits",
      responsibilities: [
        "Holds equitable title to trust property",
        "Receives distributions according to trust terms",
        "Has the right to enforce the trust",
        "May be entitled to accounting from trustee",
        "Protected by equity's maxims and principles"
      ]
    }
  ];

  const documentTypes = [
    {
      title: "Declaration of Trust",
      description: "The foundational document that establishes the pure equity trust. It defines the trust's purpose, identifies the parties, and sets forth the terms under which the trust operates.",
      keyElements: [
        "Identification of Grantor, Trustee, and Beneficiary",
        "Statement of trust purpose",
        "Description of trust property",
        "Powers and duties of the trustee",
        "Distribution provisions",
        "Amendment and termination clauses"
      ]
    },
    {
      title: "Trust Transfer Grant Deed (TTGD)",
      description: "A legal instrument used to transfer real property into the trust. It conveys title from the grantor to the trustee while preserving the beneficiary's equitable interest.",
      keyElements: [
        "Legal description of property",
        "Grant clause transferring title",
        "Reference to trust declaration",
        "Habendum clause defining estate transferred",
        "Covenants of title",
        "Notarization requirements"
      ]
    },
    {
      title: "Notice of Intent to Preserve Interest",
      description: "A recorded notice that puts third parties on notice of the trust's equitable interest in property. This document helps protect the beneficiary's rights against subsequent purchasers.",
      keyElements: [
        "Description of equitable interest",
        "Identification of affected property",
        "Statement of preservation intent",
        "Contact information for trust",
        "Recording information"
      ]
    },
    {
      title: "Affidavit of Fact",
      description: "A sworn statement establishing factual matters relevant to the trust. Used to document events, changes, or clarify matters of record.",
      keyElements: [
        "Identity of affiant",
        "Statement of facts under oath",
        "Date and location",
        "Notarization",
        "Supporting documentation references"
      ]
    }
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
                to="/" 
                className="flex items-center gap-2 font-sans text-sm font-medium text-[#0B1221]/70 hover:text-[#0B1221] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
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

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B1221]/5 rounded-sm mb-6">
            <BookOpen className="w-4 h-4 text-[#C6A87C]" />
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[#0B1221]/70">
              Educational Resources
            </span>
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-medium text-[#0B1221] tracking-tight leading-[0.95] mb-6">
            Understanding <span className="text-[#C6A87C]">Pure Equity Trusts</span>
          </h1>
          <p className="font-sans text-lg text-[#0B1221]/70 leading-relaxed max-w-2xl mx-auto">
            Learn about the foundational principles, roles, and documents that form the basis 
            of pure equity trust structures for asset protection.
          </p>
        </div>
      </section>

      {/* Equity vs. Law Section */}
      <section className="py-16 px-6 bg-[#0B1221]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-serif text-4xl text-[#F9F7F1] mb-6">
                Equity vs. <span className="text-[#C6A87C]">Law</span>
              </h2>
              <div className="space-y-4 font-sans text-[#F9F7F1]/70 leading-relaxed">
                <p>
                  The distinction between Law and Equity forms the foundation of pure equity trust structures. 
                  While common law focuses on legal title and formal ownership, equity recognizes 
                  beneficial interests and the intent behind transactions.
                </p>
                <p>
                  In a pure equity trust, the trustee holds <strong className="text-[#C6A87C]">legal title</strong> to 
                  the property, while the beneficiary holds <strong className="text-[#C6A87C]">equitable title</strong>. 
                  This separation creates powerful asset protection while maintaining beneficial use.
                </p>
                <p>
                  Equity operates on conscience and fairness. It developed historically to provide 
                  remedies where common law was inadequate, and its principles continue to govern 
                  trust relationships today.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="vault-card bg-[#111A2F] border-[#2D3748]/50 p-6">
                <h3 className="font-serif text-xl text-[#C6A87C] mb-3">Legal (Law) Side</h3>
                <ul className="space-y-2 font-sans text-sm text-[#F9F7F1]/60">
                  <li>• Formal title and ownership</li>
                  <li>• Bound by strict rules and procedures</li>
                  <li>• Public record and registration</li>
                  <li>• Liable for debts and claims</li>
                </ul>
              </div>
              <div className="vault-card bg-[#111A2F] border-[#C6A87C]/30 p-6">
                <h3 className="font-serif text-xl text-[#C6A87C] mb-3">Equitable (Private) Side</h3>
                <ul className="space-y-2 font-sans text-sm text-[#F9F7F1]/60">
                  <li>• Beneficial interest and use</li>
                  <li>• Governed by conscience and intent</li>
                  <li>• Private arrangements</li>
                  <li>• Protected from external claims</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Roles Section */}
      <section className="py-16 px-6 bg-[#F9F7F1]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl text-[#0B1221] mb-4">
              Trust <span className="text-[#C6A87C]">Roles</span>
            </h2>
            <p className="font-sans text-[#0B1221]/60 max-w-2xl mx-auto">
              A pure equity trust involves three distinct roles, each with specific rights and responsibilities.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {roles.map((role, index) => (
              <div 
                key={index} 
                className="bg-white border border-[#0B1221]/10 rounded-sm p-8 hover:border-[#C6A87C]/50 transition-colors"
                data-testid={`role-card-${index}`}
              >
                <div className="text-[#C6A87C] mb-4">{role.icon}</div>
                <h3 className="font-serif text-2xl text-[#0B1221] mb-2">{role.title}</h3>
                <p className="font-sans text-sm text-[#0B1221]/60 mb-6">{role.description}</p>
                <ul className="space-y-2">
                  {role.responsibilities.map((resp, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-[#C6A87C] mt-0.5 flex-shrink-0" />
                      <span className="font-sans text-sm text-[#0B1221]/70">{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Maxims of Equity */}
      <section className="py-16 px-6 bg-[#0B1221]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl text-[#F9F7F1] mb-4">
              Maxims of <span className="text-[#C6A87C]">Equity</span>
            </h2>
            <p className="font-sans text-[#F9F7F1]/60 max-w-2xl mx-auto">
              These foundational principles guide equitable jurisprudence and inform how trusts are interpreted and enforced.
            </p>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {maxims.map((item, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="vault-card bg-[#111A2F] border-[#2D3748]/50 px-6 overflow-hidden"
                data-testid={`maxim-accordion-${index}`}
              >
                <AccordionTrigger className="font-serif text-lg text-[#C6A87C] hover:no-underline py-6">
                  "{item.maxim}"
                </AccordionTrigger>
                <AccordionContent className="font-sans text-[#F9F7F1]/70 pb-6 leading-relaxed">
                  {item.explanation}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Document Types */}
      <section className="py-16 px-6 bg-[#F9F7F1]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl text-[#0B1221] mb-4">
              Trust <span className="text-[#C6A87C]">Documents</span>
            </h2>
            <p className="font-sans text-[#0B1221]/60 max-w-2xl mx-auto">
              Understanding the key documents used in establishing and maintaining a pure equity trust structure.
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            {documentTypes.map((doc, index) => (
              <div 
                key={index}
                className="bg-white border border-[#0B1221]/10 rounded-sm p-8 hover:border-[#C6A87C]/50 transition-colors"
                data-testid={`doc-type-${index}`}
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-[#0B1221] rounded-sm flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-[#C6A87C]" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl text-[#0B1221] mb-2">{doc.title}</h3>
                    <p className="font-sans text-sm text-[#0B1221]/60 leading-relaxed">
                      {doc.description}
                    </p>
                  </div>
                </div>
                <div className="bg-[#F9F7F1] rounded-sm p-4">
                  <p className="font-sans text-xs text-[#0B1221]/50 uppercase tracking-wider mb-3">
                    Key Elements
                  </p>
                  <ul className="grid grid-cols-2 gap-2">
                    {doc.keyElements.map((element, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-[#C6A87C] rounded-full"></div>
                        <span className="font-sans text-xs text-[#0B1221]/70">{element}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-[#0B1221]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-4xl text-[#F9F7F1] mb-6">
            Ready to Create Your <span className="text-[#C6A87C]">Trust</span>?
          </h2>
          <p className="font-sans text-[#F9F7F1]/60 mb-8 max-w-2xl mx-auto">
            Use our secure platform to generate professional trust documents aligned with pure equity principles.
          </p>
          <Link to="/login" data-testid="edu-cta">
            <Button className="btn-primary">
              Access Your Vault
              <ChevronRight className="w-4 h-4 ml-2" />
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
              <Link to="/" className="font-sans text-sm text-[#F9F7F1]/60 hover:text-[#C6A87C] transition-colors">
                Home
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

export default Education;
