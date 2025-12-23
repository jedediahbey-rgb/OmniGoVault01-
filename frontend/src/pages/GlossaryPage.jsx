import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookText, 
  Search, 
  ArrowRight, 
  BookOpen, 
  Sparkles, 
  FileText,
  Link2,
  ChevronDown,
  ChevronUp,
  Filter,
  X
} from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import GlassCard from '../components/shared/GlassCard';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { ExpandableText } from '../components/ui/expandable-text';
import { staggerContainer, fadeInUp } from '../lib/motion';

// Comprehensive glossary with cross-links
const glossaryTerms = [
  {
    id: 'beneficiary',
    term: "Beneficiary",
    aka: "Cestui Que Trust",
    definition: "The person for whose benefit a trust is created. Holds equitable title to trust property while the trustee holds legal title. Equity regards the beneficiary as the true owner.",
    fullExplanation: `The beneficiary is the central figure in any trust arrangement. While the trustee holds legal title to trust property, the beneficiary holds equitable title—meaning they are entitled to the benefits and enjoyment of the property.

Key characteristics of beneficiaries:
• They have enforceable rights against the trustee
• They can trace trust property into its proceeds if misappropriated
• They may be entitled to income, principal, or both
• Multiple beneficiaries may have successive or concurrent interests

The term "cestui que trust" literally means "the one for whose benefit" and is used interchangeably with beneficiary.`,
    category: "parties",
    relatedTerms: ["cestui-que-trust", "trustee", "equitable-title", "fiduciary"],
    relatedMaxims: [19], // "Equity regards the beneficiary as the true owner"
    relatedLessons: ["what-is-trust", "trustee-beneficiary"],
    relatedTemplates: ["declaration-of-trust"]
  },
  {
    id: 'cestui-que-trust',
    term: "Cestui Que Trust",
    aka: "Beneficiary",
    definition: "Latin for 'the one for whose benefit.' The person entitled to the benefits of a trust. Used interchangeably with beneficiary in trust law.",
    fullExplanation: `Cestui que trust (pronounced "setty-kay trust") is the Latin term for the beneficiary of a trust. The phrase literally translates to "the one who trusts" or more accurately "the one for whose benefit."

Historical context:
• The term originated in Norman French legal language
• It was adopted into English common law through the Court of Chancery
• Modern usage prefers "beneficiary" but cestui que trust remains in legal documents

The cestui que trust holds the beneficial or equitable interest, while legal title remains with the trustee.`,
    category: "parties",
    relatedTerms: ["beneficiary", "equitable-title", "trustee"],
    relatedMaxims: [19],
    relatedLessons: ["trustee-beneficiary"],
    relatedTemplates: []
  },
  {
    id: 'clean-hands',
    term: "Clean Hands",
    definition: "The equitable doctrine that a party seeking relief must not have engaged in inequitable conduct regarding the matter at issue. 'He who comes into equity must come with clean hands.'",
    fullExplanation: `The clean hands doctrine is a fundamental principle that bars relief to a plaintiff who has acted inequitably in connection with the matter at issue.

Application of clean hands:
• The misconduct must relate to the matter before the court
• General bad character is insufficient—the inequity must be connected
• The doctrine prevents parties from profiting from their own wrongdoing
• Courts have discretion in applying this defense

This doctrine ensures that equity aids only those who themselves act equitably, maintaining the integrity of the equitable system.`,
    category: "doctrines",
    relatedTerms: ["laches", "estoppel"],
    relatedMaxims: [7], // "He who comes into equity must come with clean hands"
    relatedLessons: ["conduct-maxims"],
    relatedTemplates: []
  },
  {
    id: 'constructive-trust',
    term: "Constructive Trust",
    definition: "A trust imposed by equity to prevent unjust enrichment. Unlike express trusts, it arises by operation of law, not from the parties' intention. Used as a remedy when property is obtained through fraud or breach of fiduciary duty.",
    fullExplanation: `A constructive trust is an equitable remedy imposed by courts to prevent unjust enrichment. It is not a true trust created by intention but rather a remedial device.

When constructive trusts arise:
• Property obtained through fraud or undue influence
• Breach of fiduciary duty resulting in gain
• Secret profits made by an agent or trustee
• Broken promises regarding property (in some jurisdictions)
• Mutual wills cases

The person holding property is treated as a "constructive trustee" and must convey it to the rightful owner. This implements the maxim "Equity will not suffer a wrong to be without a remedy."`,
    category: "trusts",
    relatedTerms: ["resulting-trust", "express-trust", "fiduciary"],
    relatedMaxims: [3], // "Equity will not suffer a wrong to be without a remedy"
    relatedLessons: ["types-of-trusts"],
    relatedTemplates: []
  },
  {
    id: 'conversion',
    term: "Conversion",
    definition: "The equitable doctrine treating property as changed in nature based on what the parties are obligated to do. Money to be used to buy land is treated as land; land to be sold is treated as money.",
    fullExplanation: `Conversion is based on the maxim "Equity regards as done that which ought to be done." When parties are obligated to transform property (such as selling land for money), equity treats the transformation as already accomplished.

Examples of conversion:
• A contract to sell land: the buyer is treated as equitable owner
• A direction in a will to sell land and distribute proceeds: the land is treated as personalty
• Trust funds directed to purchase land: treated as realty

This doctrine has significant implications for:
• Devolution on death (real vs. personal property)
• Rights of spouses and creditors
• Tax treatment in some jurisdictions`,
    category: "doctrines",
    relatedTerms: ["specific-performance", "equitable-interest"],
    relatedMaxims: [1], // "Equity regards as done that which ought to be done"
    relatedLessons: ["primary-maxims"],
    relatedTemplates: []
  },
  {
    id: 'declaration-of-trust',
    term: "Declaration of Trust",
    definition: "The formal document creating a trust, setting forth the identity of parties, trust property, terms, and purposes. The foundational instrument of the trust relationship.",
    fullExplanation: `The Declaration of Trust is the constitutive document that brings a trust into existence. It must contain certain essential elements:

Required contents:
• Identity of the settlor (grantor)
• Identity of the trustee(s)
• Identity or description of beneficiaries
• Description of trust property (res/corpus)
• Trust purposes and terms
• Powers and duties of the trustee
• Duration or termination provisions

The declaration should be in writing, signed, and ideally notarized. While oral trusts of personal property may be valid, written declarations provide essential evidence and clarity.`,
    category: "documents",
    relatedTerms: ["express-trust", "settlor", "trustee", "trust-property"],
    relatedMaxims: [],
    relatedLessons: ["declaration-of-trust"],
    relatedTemplates: ["declaration-of-trust", "trust-amendment"]
  },
  {
    id: 'equitable-interest',
    term: "Equitable Interest",
    definition: "An interest recognized and protected by equity, as distinguished from legal interests protected by common law. The beneficiary's interest in trust property is equitable.",
    fullExplanation: `Equitable interests are property rights recognized and enforced by courts of equity, even though they may not constitute legal title. The most common example is the beneficiary's interest in trust property.

Characteristics of equitable interests:
• Enforceable against the trustee and their successors
• May be defeated by a bona fide purchaser for value without notice
• Can be traced into substitute property
• Subject to equitable defenses (clean hands, laches)

The distinction between legal and equitable interests is fundamental to understanding trust law and the remedies available in equity.`,
    category: "interests",
    relatedTerms: ["equitable-title", "legal-title", "beneficiary", "bona-fide-purchaser"],
    relatedMaxims: [4, 5], // "Where there is equal equity, the law must prevail" and "Equity follows the law"
    relatedLessons: ["what-is-equity", "equity-vs-law"],
    relatedTemplates: []
  },
  {
    id: 'equitable-title',
    term: "Equitable Title",
    definition: "The beneficial ownership interest recognized by equity, giving the holder the right to receive benefits from property even though legal title is held by another (such as a trustee).",
    fullExplanation: `Equitable title represents the beneficial ownership of property—the right to enjoy its benefits—as distinguished from legal title, which is formal ownership recorded in public registries.

The split between legal and equitable title:
• Legal title: held by the trustee, recognized by law courts
• Equitable title: held by the beneficiary, recognized by equity courts
• The trustee has the burdens (management duties)
• The beneficiary has the benefits (enjoyment of property)

This division is the genius of the trust—allowing professional management while protecting beneficial enjoyment.`,
    category: "interests",
    relatedTerms: ["legal-title", "beneficiary", "trustee", "equitable-interest"],
    relatedMaxims: [19],
    relatedLessons: ["what-is-trust"],
    relatedTemplates: []
  },
  {
    id: 'express-trust',
    term: "Express Trust",
    definition: "A trust intentionally created by the express declaration of the settlor, as distinguished from trusts arising by operation of law (resulting or constructive trusts).",
    fullExplanation: `An express trust is created when a settlor intentionally declares their intention to create a trust, either during their lifetime (inter vivos) or by will (testamentary).

Requirements for a valid express trust:
1. Capacity of the settlor
2. Intent to create a trust
3. Definite trust property (res)
4. Ascertainable beneficiaries
5. Lawful purpose
6. Proper formalities (writing for land)

Express trusts may be:
• Revocable or irrevocable
• Inter vivos or testamentary
• Private (for named beneficiaries) or charitable (for public benefit)`,
    category: "trusts",
    relatedTerms: ["constructive-trust", "resulting-trust", "settlor", "declaration-of-trust"],
    relatedMaxims: [18], // "Equity will not allow a trust to fail for want of a trustee"
    relatedLessons: ["types-of-trusts"],
    relatedTemplates: ["declaration-of-trust"]
  },
  {
    id: 'fiduciary',
    term: "Fiduciary",
    definition: "A person in a position of trust and confidence who must act for another's benefit. Trustees, agents, executors, and guardians are fiduciaries. They owe duties of loyalty, care, and good faith.",
    fullExplanation: `A fiduciary relationship is one where one party (the fiduciary) is bound to act in the best interests of another party. It is a relationship of utmost trust and confidence.

Common fiduciary relationships:
• Trustee and beneficiary
• Agent and principal  
• Executor and estate
• Guardian and ward
• Attorney and client
• Director and corporation

Fiduciary duties include:
• Duty of loyalty (no self-dealing)
• Duty of care (prudent management)
• Duty to account (transparency)
• Duty of good faith (honest dealing)`,
    category: "parties",
    relatedTerms: ["trustee", "beneficiary", "duty-of-loyalty"],
    relatedMaxims: [],
    relatedLessons: ["trustee-duties", "agent-principal"],
    relatedTemplates: []
  },
  {
    id: 'settlor',
    term: "Settlor",
    aka: "Grantor, Trustor",
    definition: "The person who creates a trust by transferring property to a trustee for the benefit of a beneficiary. Also called grantor or trustor in different jurisdictions.",
    fullExplanation: `The settlor (also called grantor or trustor) is the person who creates a trust. They must have:

Requirements:
• Legal capacity to create the trust
• Intent to create a trust relationship
• Property to transfer to the trust

The settlor's role:
• Establishes the trust terms
• Transfers property to the trustee
• May reserve certain powers (in revocable trusts)
• Generally cannot be a beneficiary of their own trust in some contexts

Once the trust is created and property transferred, the settlor's role is generally complete (unless they've reserved powers or serve as trustee).`,
    category: "parties",
    relatedTerms: ["trustee", "beneficiary", "declaration-of-trust", "express-trust"],
    relatedMaxims: [],
    relatedLessons: ["what-is-trust"],
    relatedTemplates: ["declaration-of-trust"]
  },
  {
    id: 'trustee',
    term: "Trustee",
    definition: "The person who holds legal title to trust property and manages it for the benefit of the beneficiary. The trustee owes fiduciary duties of loyalty, care, and accountability.",
    fullExplanation: `The trustee is the fiduciary who holds legal title to trust property and manages it according to the trust terms for the beneficiary's benefit.

Trustee duties:
• Duty of loyalty: act solely for beneficiary's benefit
• Duty of care: manage property prudently
• Duty to account: maintain records, provide reports
• Duty of impartiality: balance interests of multiple beneficiaries
• Duty not to delegate: personally exercise discretion

Trustee powers (typically):
• Invest trust assets
• Make distributions
• Employ professionals
• Defend the trust

A trustee may be an individual or institution (bank, trust company).`,
    category: "parties",
    relatedTerms: ["beneficiary", "fiduciary", "legal-title", "settlor"],
    relatedMaxims: [11], // "Equity acts in personam"
    relatedLessons: ["trustee-duties", "trustee-beneficiary"],
    relatedTemplates: ["declaration-of-trust"]
  },
  {
    id: 'in-personam',
    term: "In Personam",
    definition: "Against the person. Equity acts in personam, meaning it operates on the conscience of individuals, compelling them to act or refrain from acting, rather than directly on property (in rem).",
    fullExplanation: `"In personam" (against the person) describes how equity operates—by binding the conscience of individuals rather than directly affecting property.

Implications:
• Equitable orders are directed at persons, not property
• Disobedience is contempt of court
• The order follows the person, not the asset
• Equity can reach persons even if property is elsewhere

Example: A specific performance decree orders the defendant to convey property. It doesn't transfer title itself—if the defendant refuses, they're in contempt. The order operates on their conscience.

This contrasts with legal judgments that may operate directly on property (in rem).`,
    category: "jurisdiction",
    relatedTerms: ["in-rem", "specific-performance", "injunction"],
    relatedMaxims: [11],
    relatedLessons: ["equity-vs-law"],
    relatedTemplates: []
  },
  {
    id: 'in-rem',
    term: "In Rem",
    definition: "Against the thing. Legal actions that operate directly on property, as distinguished from equitable actions that operate on persons. Courts of law often act in rem.",
    fullExplanation: `"In rem" (against the thing) describes legal proceedings that determine rights in property itself, binding all persons whether or not they participated in the proceeding.

Examples of in rem proceedings:
• Admiralty actions against vessels
• Quiet title actions
• Probate proceedings
• Foreclosure actions

Characteristics:
• Operates directly on property
• Binds all persons claiming interests
• Creates judgments "good against the world"
• Contrasts with equity's in personam approach`,
    category: "jurisdiction",
    relatedTerms: ["in-personam"],
    relatedMaxims: [],
    relatedLessons: ["equity-vs-law"],
    relatedTemplates: []
  },
  {
    id: 'injunction',
    term: "Injunction",
    definition: "An equitable remedy ordering a party to do or refrain from doing a specific act. May be temporary (preliminary) or permanent, mandatory (requiring action) or prohibitory (forbidding action).",
    fullExplanation: `An injunction is a court order compelling a party to do something (mandatory) or prohibiting them from doing something (prohibitory). It is a primary equitable remedy.

Types of injunctions:
• Temporary Restraining Order (TRO): emergency, short-term
• Preliminary injunction: pending trial
• Permanent injunction: final remedy after trial
• Mandatory: requires specific action
• Prohibitory: forbids specific action

Requirements for injunction:
• Likelihood of success on the merits
• Irreparable harm without the injunction
• Balance of hardships favors plaintiff
• Public interest not harmed

Injunctions enforce the maxim "Equity acts in personam"—the order binds the defendant personally.`,
    category: "remedies",
    relatedTerms: ["specific-performance", "in-personam"],
    relatedMaxims: [11, 3],
    relatedLessons: ["equity-vs-law"],
    relatedTemplates: []
  },
  {
    id: 'laches',
    term: "Laches",
    definition: "An equitable defense based on unreasonable delay in asserting a claim, resulting in prejudice to the defendant. Distinguished from statutes of limitation by its focus on prejudice rather than mere time elapsed.",
    fullExplanation: `Laches is the equitable principle that unreasonable delay in asserting rights may bar relief. It implements the maxim "Equity aids the vigilant, not those who slumber on their rights."

Elements of laches:
1. Unreasonable delay by the plaintiff
2. Prejudice to the defendant resulting from the delay
3. Knowledge or constructive knowledge by plaintiff of their rights

Distinguished from statutes of limitation:
• Statutes of limitation: fixed time periods, automatic bar
• Laches: flexible, depends on circumstances and prejudice
• Laches may bar relief even before limitation period expires
• Or may not bar relief even after limitation period if no prejudice`,
    category: "doctrines",
    relatedTerms: ["clean-hands", "estoppel"],
    relatedMaxims: [12], // "Delay defeats equity"
    relatedLessons: ["conduct-maxims"],
    relatedTemplates: []
  },
  {
    id: 'legal-title',
    term: "Legal Title",
    definition: "Formal ownership of property recognized by courts of law, as distinguished from equitable title. In a trust, the trustee holds legal title while the beneficiary holds equitable title.",
    fullExplanation: `Legal title is the formal ownership interest in property—the title recorded in registries and recognized by courts of law.

In the trust context:
• Trustee holds legal title
• Can convey property to third parties
• Appears as owner in public records
• Has legal standing to sue regarding the property

But legal title is "bare" title when held by a trustee:
• Must be exercised for beneficiary's benefit
• Subject to fiduciary duties
• Equity will intervene if misused

The split between legal and equitable title is the defining characteristic of the trust.`,
    category: "interests",
    relatedTerms: ["equitable-title", "trustee", "beneficiary"],
    relatedMaxims: [4],
    relatedLessons: ["what-is-trust"],
    relatedTemplates: []
  },
  {
    id: 'resulting-trust',
    term: "Resulting Trust",
    definition: "A trust arising by operation of law when express trust fails or is incomplete, or when purchase money is provided by one person but title taken in another's name. The beneficial interest 'results back' to the person who provided the property.",
    fullExplanation: `A resulting trust arises by operation of law (not express intention) when equity implies that property should be held for the benefit of another.

Situations creating resulting trusts:
1. Failed or incomplete trust: property returns to settlor
2. Purchase money resulting trust: A pays but title goes to B
3. Surplus after trust purposes fulfilled
4. Voluntary conveyance (in some jurisdictions)

The key principle is that equity will not allow property to be held by someone who did not pay for it and was not intended to benefit from it. The beneficial interest "results back" to its source.`,
    category: "trusts",
    relatedTerms: ["constructive-trust", "express-trust"],
    relatedMaxims: [9], // "Equity will not aid a volunteer"
    relatedLessons: ["types-of-trusts"],
    relatedTemplates: []
  },
  {
    id: 'specific-performance',
    term: "Specific Performance",
    definition: "An equitable remedy ordering a party to perform their contractual obligations exactly as promised, rather than paying damages. Typically granted when monetary damages are inadequate, such as in contracts for unique property.",
    fullExplanation: `Specific performance is a court order requiring exact performance of contractual obligations. It is available when monetary damages would be inadequate.

When granted:
• Contracts for land (each parcel is unique)
• Contracts for unique goods (artwork, heirlooms)
• Contracts where damages are speculative
• Long-term contracts where damages are difficult to calculate

Requirements:
• Valid, enforceable contract
• Plaintiff ready, willing, and able to perform
• Inadequacy of legal remedy (damages)
• No undue hardship to defendant
• Contract terms sufficiently certain

Limitations:
• Not for personal services (involuntary servitude concerns)
• Discretionary—subject to equitable defenses
• Mutuality traditionally required`,
    category: "remedies",
    relatedTerms: ["injunction", "in-personam", "conversion"],
    relatedMaxims: [1, 6], // "Equity regards as done..." and "He who seeks equity must do equity"
    relatedLessons: ["equity-vs-law"],
    relatedTemplates: []
  },
  {
    id: 'trust-property',
    term: "Trust Property",
    aka: "Res, Corpus",
    definition: "The property held in trust. Also called the res (Latin for 'thing') or corpus (Latin for 'body'). A valid trust requires identifiable trust property that has been transferred to the trustee.",
    fullExplanation: `Trust property (also called res or corpus) is the asset or assets held in trust. It is one of the essential elements of a valid trust.

Requirements for trust property:
• Must be identifiable and certain
• Must be capable of being held in trust
• Must be transferred to the trustee
• Can be any type of property (real, personal, tangible, intangible)

Types of trust property:
• Real estate
• Securities and investments
• Bank accounts
• Business interests
• Intellectual property
• Life insurance policies

The trust property must be segregated from the trustee's personal property and managed solely for beneficiary benefit.`,
    category: "property",
    relatedTerms: ["declaration-of-trust", "trustee", "beneficiary"],
    relatedMaxims: [],
    relatedLessons: ["what-is-trust", "declaration-of-trust"],
    relatedTemplates: ["declaration-of-trust", "trust-transfer-deed"]
  },
  {
    id: 'estoppel',
    term: "Estoppel",
    definition: "An equitable principle preventing a party from asserting a position inconsistent with their prior conduct when another has reasonably relied on that conduct to their detriment.",
    fullExplanation: `Estoppel prevents a party from going back on their word or conduct when another has relied on it. It implements fairness by preventing parties from taking inconsistent positions.

Types of estoppel:
• Promissory estoppel: preventing denial of a promise relied upon
• Equitable estoppel: preventing denial of facts represented
• Estoppel by deed: grantor bound by deed representations
• Estoppel by silence: when duty to speak exists

Elements (typically):
1. Representation or conduct by one party
2. Reliance by the other party
3. Detriment from the reliance
4. Inequity in allowing the first party to deny

Estoppel is related to the maxim that he who occasioned the loss must bear the burden.`,
    category: "doctrines",
    relatedTerms: ["clean-hands", "laches"],
    relatedMaxims: [17, 20],
    relatedLessons: ["conduct-maxims"],
    relatedTemplates: []
  },
  {
    id: 'bona-fide-purchaser',
    term: "Bona Fide Purchaser",
    aka: "BFP, Good Faith Purchaser",
    definition: "A purchaser who acquires property for value, in good faith, and without notice of prior equitable interests. A BFP takes free of prior equitable claims they didn't know about.",
    fullExplanation: `A bona fide purchaser (BFP) for value without notice is protected against prior equitable interests. This doctrine balances the rights of prior interest holders against the need for secure commercial transactions.

Elements of BFP protection:
1. Purchaser (not donee or heir)
2. For value (consideration given)
3. Good faith (honest dealing)
4. Without notice of prior interests

Types of notice:
• Actual notice: real knowledge
• Constructive notice: recorded documents
• Inquiry notice: facts requiring investigation

The BFP doctrine reflects the maxim "Where there is equal equity, the law must prevail"—when equities are equal, legal title wins.`,
    category: "doctrines",
    relatedTerms: ["equitable-interest", "legal-title"],
    relatedMaxims: [4],
    relatedLessons: ["equity-vs-law"],
    relatedTemplates: []
  }
];

const categories = [
  { id: 'all', label: 'All Terms', icon: BookText },
  { id: 'parties', label: 'Parties', icon: BookText },
  { id: 'trusts', label: 'Trusts', icon: BookText },
  { id: 'doctrines', label: 'Doctrines', icon: BookText },
  { id: 'interests', label: 'Interests', icon: BookText },
  { id: 'remedies', label: 'Remedies', icon: BookText },
  { id: 'documents', label: 'Documents', icon: BookText },
  { id: 'jurisdiction', label: 'Jurisdiction', icon: BookText },
];

export default function GlossaryPage({ user }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedTerm, setExpandedTerm] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const detailRef = useRef(null);

  // Scroll to top when a term is selected
  useEffect(() => {
    if (selectedTerm) {
      // Scroll the page container to top
      window.scrollTo({ top: 0, behavior: 'instant' });
      // Also try to scroll any parent scroll containers
      const scrollContainer = document.querySelector('[data-scroll-container]') || 
                              document.querySelector('.overflow-y-auto');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: 0, behavior: 'instant' });
      }
      // Focus the detail container without scrolling
      if (detailRef.current) {
        detailRef.current.focus({ preventScroll: true });
      }
    }
  }, [selectedTerm]);

  const filteredTerms = glossaryTerms.filter(t => {
    const matchesSearch = searchTerm === '' || 
      t.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.aka && t.aka.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => a.term.localeCompare(b.term));

  const getTermById = (id) => glossaryTerms.find(t => t.id === id);

  const handleRelatedTermClick = (termId) => {
    const term = getTermById(termId);
    if (term) {
      setSelectedTerm(term);
      setExpandedTerm(null);
    }
  };

  const handleMaximClick = (maximId) => {
    navigate(`/maxims?highlight=${maximId}`);
  };

  const handleLessonClick = (lessonId) => {
    navigate(`/learn?lesson=${lessonId}`);
  };

  // Detail Modal View
  if (selectedTerm) {
    return (
      <div ref={detailRef} tabIndex={-1} className="p-4 sm:p-8 outline-none">
        <button
          onClick={() => setSelectedTerm(null)}
          className="flex items-center gap-2 text-vault-gold mb-6 hover:underline"
        >
          ← Back to Glossary
        </button>

        <div className="max-w-4xl">
          <GlassCard>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div className="min-w-0">
                <h2 className="text-2xl sm:text-3xl font-heading text-white break-words">{selectedTerm.term}</h2>
                {selectedTerm.aka && (
                  <p className="text-vault-gold text-sm mt-1">Also known as: {selectedTerm.aka}</p>
                )}
              </div>
              <span className="px-3 py-1 bg-vault-gold/10 text-vault-gold text-sm rounded-full capitalize">
                {selectedTerm.category}
              </span>
            </div>

            <div className="prose prose-invert max-w-none mb-8">
              <p className="text-white/80 text-lg mb-6">{selectedTerm.definition}</p>
              {selectedTerm.fullExplanation && (
                <div className="text-white/60 whitespace-pre-line">
                  {selectedTerm.fullExplanation}
                </div>
              )}
            </div>

            {/* Cross-Links Section */}
            <div className="space-y-6 pt-6 border-t border-white/10">
              {/* Related Terms */}
              {selectedTerm.relatedTerms && selectedTerm.relatedTerms.length > 0 && (
                <div>
                  <h4 className="text-vault-gold uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Related Terms
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTerm.relatedTerms.map(termId => {
                      const related = getTermById(termId);
                      return related ? (
                        <button
                          key={termId}
                          onClick={() => handleRelatedTermClick(termId)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-vault-gold/30 rounded-lg text-sm text-white/70 hover:text-white transition-all"
                        >
                          {related.term}
                        </button>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Related Maxims */}
              {selectedTerm.relatedMaxims && selectedTerm.relatedMaxims.length > 0 && (
                <div>
                  <h4 className="text-vault-gold uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Related Maxims
                  </h4>
                  <div className="space-y-2">
                    {selectedTerm.relatedMaxims.map(maximId => (
                      <button
                        key={maximId}
                        onClick={() => handleMaximClick(maximId)}
                        className="w-full text-left p-3 bg-vault-gold/5 hover:bg-vault-gold/10 border border-vault-gold/20 hover:border-vault-gold/40 rounded-lg transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white/70 group-hover:text-white text-sm">
                            Maxim #{maximId}
                          </span>
                          <ArrowRight className="w-4 h-4 text-vault-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Lessons */}
              {selectedTerm.relatedLessons && selectedTerm.relatedLessons.length > 0 && (
                <div>
                  <h4 className="text-vault-gold uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Related Lessons
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTerm.relatedLessons.map(lessonId => (
                      <button
                        key={lessonId}
                        onClick={() => handleLessonClick(lessonId)}
                        className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 rounded-lg text-sm text-blue-400 hover:text-blue-300 transition-all flex items-center gap-2"
                      >
                        <BookOpen className="w-3 h-3" />
                        {lessonId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Templates */}
              {selectedTerm.relatedTemplates && selectedTerm.relatedTemplates.length > 0 && (
                <div>
                  <h4 className="text-vault-gold uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Related Templates
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTerm.relatedTemplates.map(templateId => (
                      <button
                        key={templateId}
                        onClick={() => navigate('/templates')}
                        className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 rounded-lg text-sm text-green-400 hover:text-green-300 transition-all flex items-center gap-2"
                      >
                        <FileText className="w-3 h-3" />
                        {templateId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // Main Glossary List
  return (
    <div className="p-8">
      <PageHeader
        icon={BookText}
        title="Glossary"
        subtitle="Comprehensive definitions with cross-links to lessons, maxims, and templates"
      />

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Search terms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 focus:border-vault-gold"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                selectedCategory === cat.id
                  ? 'bg-vault-gold/20 text-vault-gold border border-vault-gold/30'
                  : 'bg-white/5 text-white/60 border border-white/10 hover:border-white/20'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alphabet Quick Jump */}
      <div className="flex flex-wrap gap-1 mb-6">
        {Array.from(new Set(filteredTerms.map(t => t.term[0].toUpperCase()))).sort().map(letter => (
          <button
            key={letter}
            onClick={() => {
              const element = document.getElementById(`letter-${letter}`);
              if (element) element.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-8 h-8 rounded bg-white/5 hover:bg-vault-gold/20 text-white/40 hover:text-vault-gold text-sm font-mono transition-all"
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Terms List */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-3"
      >
        {filteredTerms.map((term, idx) => {
          const isFirstOfLetter = idx === 0 || 
            filteredTerms[idx - 1].term[0].toUpperCase() !== term.term[0].toUpperCase();
          
          return (
            <motion.div key={term.id} variants={fadeInUp}>
              {isFirstOfLetter && (
                <div 
                  id={`letter-${term.term[0].toUpperCase()}`}
                  className="text-vault-gold font-heading text-2xl mt-6 mb-3 first:mt-0"
                >
                  {term.term[0].toUpperCase()}
                </div>
              )}
              <GlassCard
                interactive
                onClick={() => setSelectedTerm(term)}
                className="group"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-lg font-heading text-white group-hover:text-vault-gold transition-colors">
                        {term.term}
                      </h3>
                      {term.aka && (
                        <span className="text-white/30 text-sm">({term.aka})</span>
                      )}
                    </div>
                    <ExpandableText 
                      text={term.definition}
                      previewLines={3}
                      className="mt-1"
                    />
                    
                    {/* Quick Links */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {term.relatedMaxims && term.relatedMaxims.length > 0 && (
                        <span className="px-2 py-0.5 bg-vault-gold/10 text-vault-gold text-xs rounded">
                          {term.relatedMaxims.length} maxim{term.relatedMaxims.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {term.relatedLessons && term.relatedLessons.length > 0 && (
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded">
                          {term.relatedLessons.length} lesson{term.relatedLessons.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {term.relatedTemplates && term.relatedTemplates.length > 0 && (
                        <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded">
                          {term.relatedTemplates.length} template{term.relatedTemplates.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-vault-gold transition-colors" />
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </motion.div>

      {filteredTerms.length === 0 && (
        <div className="text-center py-16">
          <BookText className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/40">No terms match your search</p>
        </div>
      )}

      {/* Stats */}
      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="text-center py-4">
          <div className="text-2xl font-heading text-vault-gold">{glossaryTerms.length}</div>
          <div className="text-white/40 text-sm">Total Terms</div>
        </GlassCard>
        <GlassCard className="text-center py-4">
          <div className="text-2xl font-heading text-vault-gold">
            {glossaryTerms.filter(t => t.relatedMaxims?.length > 0).length}
          </div>
          <div className="text-white/40 text-sm">Linked to Maxims</div>
        </GlassCard>
        <GlassCard className="text-center py-4">
          <div className="text-2xl font-heading text-vault-gold">
            {glossaryTerms.filter(t => t.relatedLessons?.length > 0).length}
          </div>
          <div className="text-white/40 text-sm">Linked to Lessons</div>
        </GlassCard>
        <GlassCard className="text-center py-4">
          <div className="text-2xl font-heading text-vault-gold">
            {new Set(glossaryTerms.map(t => t.category)).size}
          </div>
          <div className="text-white/40 text-sm">Categories</div>
        </GlassCard>
      </div>
    </div>
  );
}
