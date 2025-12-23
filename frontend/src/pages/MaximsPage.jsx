import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Sparkles, 
  Search, 
  BookOpen, 
  ChevronDown,
  ChevronUp,
  Filter,
  ArrowRight,
  Bookmark
} from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import GlassCard from '../components/shared/GlassCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { staggerContainer, fadeInUp } from '../lib/motion';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Comprehensive maxims synthesized from PDFs
const maximsData = [
  {
    id: 1,
    maxim: "Equity regards as done that which ought to be done",
    latin: "Aequitas facit id fieri quod fieri oportet",
    explanation: "When parties are obligated to perform an act, equity treats it as already accomplished. This principle underlies doctrines like conversion, where equity treats property as transformed based on the parties' obligations.",
    application: "If you contract to sell land, equity treats you as holding it in trust for the buyer even before the deed is executed. The buyer is considered the equitable owner from the moment of contract.",
    relatedDoctrines: ["Conversion", "Specific Performance", "Part Performance"],
    category: "fundamental"
  },
  {
    id: 2,
    maxim: "Equity looks to the intent rather than to the form",
    latin: "Aequitas sequitur legem, sed non servile",
    explanation: "Substance prevails over technicalities. Courts examine the true intention of parties rather than merely the formal expression of documents or transactions.",
    application: "A document titled 'lease' may be treated as a mortgage if its substance shows it was intended as security for a loan. The label parties use doesn't control the equitable characterization.",
    relatedDoctrines: ["Parol Evidence Rule modifications", "Reformation", "Construction of documents"],
    category: "fundamental"
  },
  {
    id: 3,
    maxim: "Equity will not suffer a wrong to be without a remedy",
    latin: "Ubi jus ibi remedium",
    explanation: "Where someone has been wronged but common law offers no relief, equity will fashion an appropriate remedy. This is the origin of constructive trusts, accounting remedies, and injunctions.",
    application: "When someone obtains property through fraud but the statute of limitations has run on the legal claim, equity may impose a constructive trust, treating the wrongdoer as trustee for the victim.",
    relatedDoctrines: ["Constructive Trusts", "Equitable Liens", "Injunctions"],
    category: "fundamental"
  },
  {
    id: 4,
    maxim: "Where there is equal equity, the law must prevail",
    latin: "Aequitas inter pares praevalet lex",
    explanation: "When two parties have equally valid equitable claims, legal title determines the outcome. This maxim establishes priority when equities are balanced.",
    application: "If two innocent purchasers both claim equitable interests but one obtained legal title first, that party prevails because their equities are otherwise equal.",
    relatedDoctrines: ["Priority of interests", "Bona fide purchaser", "Notice doctrine"],
    category: "priority"
  },
  {
    id: 5,
    maxim: "Equity follows the law",
    latin: "Aequitas sequitur legem",
    explanation: "Equity respects and generally follows legal principles. It supplements rather than supplants the law, intervening only when strict legal rules would produce unconscionable results.",
    application: "Equity will enforce legal rights and apply legal rules unless doing so would be unconscionable. It doesn't create new rights against the law but provides more flexible remedies.",
    relatedDoctrines: ["Merger of law and equity", "Equitable discretion"],
    category: "fundamental"
  },
  {
    id: 6,
    maxim: "He who seeks equity must do equity",
    latin: "Qui aequitatem quaerit, aequitatem facere debet",
    explanation: "A party seeking equitable relief must themselves be prepared to act fairly. They cannot ask equity to enforce their rights while refusing to fulfill their own obligations.",
    application: "A buyer seeking specific performance of a land sale must be ready to pay the purchase price. Equity won't help them obtain the land if they won't fulfill their side.",
    relatedDoctrines: ["Mutuality", "Conditional relief", "Terms and conditions"],
    category: "conduct"
  },
  {
    id: 7,
    maxim: "He who comes into equity must come with clean hands",
    latin: "Qui venit ad aequitatem debet venire mundis manibus",
    explanation: "A party seeking equitable relief must not have engaged in inequitable conduct regarding the matter at hand. Past misconduct related to the claim may bar relief.",
    application: "A partner who defrauded the partnership cannot seek equitable dissolution and accounting—their unclean hands bar relief even though dissolution might otherwise be appropriate.",
    relatedDoctrines: ["Unclean hands doctrine", "In pari delicto", "Equitable defenses"],
    category: "conduct"
  },
  {
    id: 8,
    maxim: "Equity delights in equality",
    latin: "Aequitas est aequalitas",
    explanation: "Where there is doubt about distribution, equity prefers equal division among parties with similar claims. This reflects equity's commitment to fairness and impartiality.",
    application: "When a gift is made to 'children' without specifying shares, equity presumes equal distribution among all children rather than favoring any one.",
    relatedDoctrines: ["Partition", "Contribution", "Distribution of estates"],
    category: "distribution"
  },
  {
    id: 9,
    maxim: "Equity will not aid a volunteer",
    latin: "Aequitas non facit jus sed juri auxiliatur",
    explanation: "Generally, equity won't assist someone who has provided nothing of value. A gratuitous promise or incomplete gift cannot be enforced in equity.",
    application: "If a donor promises to give property but never completes the transfer, the intended recipient (a volunteer) cannot compel completion in equity. The gift fails.",
    relatedDoctrines: ["Consideration", "Gift doctrine", "Imperfect gifts"],
    category: "consideration"
  },
  {
    id: 10,
    maxim: "Equity imputes an intention to fulfill an obligation",
    latin: "Aequitas intendit implere obligationem",
    explanation: "Parties are presumed to intend to fulfill their obligations. Equity interprets acts and transactions in light of this presumed good faith intention.",
    application: "If a debtor makes a payment without specifying which debt it applies to, equity may impute an intention to pay the most burdensome debt first.",
    relatedDoctrines: ["Performance", "Satisfaction", "Marshaling"],
    category: "fundamental"
  },
  {
    id: 11,
    maxim: "Equity acts in personam",
    latin: "Aequitas agit in personam",
    explanation: "Equity operates on the conscience of the individual, compelling them to act or refrain from acting, rather than operating directly on property (in rem).",
    application: "A court orders the defendant to convey property—it doesn't transfer title itself. If the defendant disobeys, they're in contempt. The order binds the person, not the property directly.",
    relatedDoctrines: ["Contempt", "Specific performance", "Injunctions"],
    category: "jurisdiction"
  },
  {
    id: 12,
    maxim: "Delay defeats equity (Laches)",
    latin: "Vigilantibus non dormientibus aequitas subvenit",
    explanation: "Unreasonable delay in asserting a right may bar equitable relief. Unlike legal statutes of limitation, laches depends on prejudice caused by delay, not just time elapsed.",
    application: "A beneficiary who knows the trustee is misappropriating funds but waits years to sue may be barred by laches if the delay prejudiced the trustee or third parties.",
    relatedDoctrines: ["Laches", "Statutes of limitation", "Acquiescence"],
    category: "conduct"
  },
  {
    id: 13,
    maxim: "Equity abhors a forfeiture",
    latin: "Aequitas abhorret a poena",
    explanation: "Equity disfavors penalties and forfeitures that are disproportionate to the breach. It will relieve against forfeitures where compensation can make the injured party whole.",
    application: "A tenant who is one day late with rent won't automatically forfeit their lease in equity if they can pay and compensate the landlord—equity looks to compensate, not penalize.",
    relatedDoctrines: ["Relief from forfeiture", "Penalty clauses", "Liquidated damages"],
    category: "relief"
  },
  {
    id: 14,
    maxim: "Equity does not require an idle gesture",
    latin: "Lex non cogit ad impossibilia",
    explanation: "Equity will not compel performance of acts that would be futile or meaningless. Courts don't waste resources on hollow remedies.",
    application: "Equity won't order specific performance of a contract to build on land if the land has been taken by eminent domain—the order would accomplish nothing.",
    relatedDoctrines: ["Futility", "Impossibility", "Mootness"],
    category: "practical"
  },
  {
    id: 15,
    maxim: "Equity delights to do justice and not by halves",
    latin: "Aequitas facit totum quod facere potest",
    explanation: "When equity takes jurisdiction, it provides complete relief, resolving all aspects of the dispute rather than leaving matters partially addressed.",
    application: "A court ordering specific performance won't just order the deed transferred—it will also determine adjustments for taxes, insurance, and other incidents to fully resolve the matter.",
    relatedDoctrines: ["Complete relief", "Ancillary jurisdiction", "Clean-up doctrine"],
    category: "jurisdiction"
  },
  {
    id: 16,
    maxim: "Equity will take jurisdiction to avoid a multiplicity of suits",
    latin: "Multiplicitas litium non est probanda",
    explanation: "Equity may intervene to resolve matters in a single proceeding when multiple separate lawsuits would otherwise be required, promoting judicial efficiency.",
    application: "When multiple parties claim interests in the same property, equity can use interpleader to resolve all claims in one action rather than separate suits.",
    relatedDoctrines: ["Interpleader", "Class actions", "Bills of peace"],
    category: "jurisdiction"
  },
  {
    id: 17,
    maxim: "Equity will not allow a statute to be used as a cloak for fraud",
    latin: "Fraus omnia corrumpit",
    explanation: "While equity follows the law, it won't permit legal rules or statutes to be manipulated to achieve fraudulent ends. Substance trumps statutory technicalities used for fraud.",
    application: "A Statute of Frauds defense fails when the defendant induced the plaintiff to rely on an oral promise, then invokes the statute to escape their promise.",
    relatedDoctrines: ["Estoppel", "Part performance", "Fraud exceptions"],
    category: "fraud"
  },
  {
    id: 18,
    maxim: "Equity will not allow a trust to fail for want of a trustee",
    latin: "Aequitas nunquam contravenit leges",
    explanation: "If a valid trust is created but lacks a trustee—whether because none was named, or the named trustee refuses, dies, or becomes incapacitated—equity will appoint one.",
    application: "A testamentary trust where the named trustee predeceases the testator doesn't fail. The court appoints a substitute trustee to carry out the trust purposes.",
    relatedDoctrines: ["Cy pres", "Court-appointed trustees", "Trust administration"],
    category: "trusts"
  },
  {
    id: 19,
    maxim: "Equity regards the beneficiary as the true owner",
    latin: "Aequitas beneficiarium ut verum dominum considerat",
    explanation: "While the trustee holds legal title, equity recognizes the beneficiary's beneficial interest as the real ownership. The trustee is merely a fiduciary holding for another.",
    application: "When tracing trust property that's been wrongfully converted, equity follows the beneficiary's interest into its proceeds because the beneficiary is the true owner.",
    relatedDoctrines: ["Beneficial ownership", "Tracing", "Cestui que trust"],
    category: "trusts"
  },
  {
    id: 20,
    maxim: "He who occasioned the loss must bear the burden",
    latin: "Qui sentit commodum sentire debet et onus",
    explanation: "Between two innocent parties, the one whose act or omission enabled the loss should bear the consequences. Loss falls on whoever could have prevented it.",
    application: "If an owner's negligence in securing their property enabled a thief to sell it to an innocent purchaser, the loss falls on the negligent owner, not the innocent buyer.",
    relatedDoctrines: ["Estoppel", "Negligence", "Risk allocation"],
    category: "allocation"
  }
];

const categories = [
  { id: 'all', label: 'All Maxims' },
  { id: 'fundamental', label: 'Fundamental' },
  { id: 'conduct', label: 'Conduct' },
  { id: 'trusts', label: 'Trusts' },
  { id: 'jurisdiction', label: 'Jurisdiction' },
  { id: 'priority', label: 'Priority' },
];

export default function MaximsPage({ user }) {
  const [maxims, setMaxims] = useState(maximsData);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [studyMode, setStudyMode] = useState(false);
  const [currentStudyIndex, setCurrentStudyIndex] = useState(0);

  const filteredMaxims = maxims.filter(m => {
    const matchesSearch = searchTerm === '' || 
      m.maxim.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.explanation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (studyMode) {
    const currentMaxim = filteredMaxims[currentStudyIndex];
    
    return (
      <div className="p-8">
        <button
          onClick={() => setStudyMode(false)}
          className="flex items-center gap-2 text-vault-gold mb-6 hover:underline"
        >
          ← Exit Study Mode
        </button>

        <motion.div
          key={currentMaxim.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-3xl mx-auto"
        >
          <GlassCard className="text-center">
            <p className="text-vault-gold text-sm uppercase tracking-widest mb-4">
              Maxim {currentStudyIndex + 1} of {filteredMaxims.length}
            </p>
            <h2 className="text-3xl font-heading text-white mb-6 italic">
              "{currentMaxim.maxim}"
            </h2>
            {currentMaxim.latin && (
              <p className="text-white/40 font-legal italic mb-8">{currentMaxim.latin}</p>
            )}

            <div className="text-left space-y-6">
              <div>
                <h4 className="text-vault-gold uppercase tracking-wider text-sm mb-2">Meaning</h4>
                <p className="text-white/70">{currentMaxim.explanation}</p>
              </div>
              <div>
                <h4 className="text-vault-gold uppercase tracking-wider text-sm mb-2">Application</h4>
                <p className="text-white/70">{currentMaxim.application}</p>
              </div>
              <div>
                <h4 className="text-vault-gold uppercase tracking-wider text-sm mb-2">Related Doctrines</h4>
                <div className="flex flex-wrap gap-2">
                  {currentMaxim.relatedDoctrines.map((doc, idx) => (
                    <span key={idx} className="px-3 py-1 bg-vault-gold/10 text-vault-gold text-sm rounded-full">
                      {doc}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4 mt-8">
              <Button
                onClick={() => setCurrentStudyIndex(Math.max(0, currentStudyIndex - 1))}
                disabled={currentStudyIndex === 0}
                variant="outline"
                className="btn-secondary"
              >
                Previous
              </Button>
              <Button
                onClick={() => setCurrentStudyIndex(Math.min(filteredMaxims.length - 1, currentStudyIndex + 1))}
                disabled={currentStudyIndex === filteredMaxims.length - 1}
                className="btn-primary"
              >
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <PageHeader
        icon={Sparkles}
        title="Maxims of Equity"
        subtitle="The foundational principles governing equitable jurisprudence"
        actions={
          <Button onClick={() => { setStudyMode(true); setCurrentStudyIndex(0); }} className="btn-primary">
            <BookOpen className="w-4 h-4 mr-2" />
            Study Mode
          </Button>
        }
      />

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Search maxims..."
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

      {/* Maxims List */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-4"
      >
        {filteredMaxims.map((maxim) => (
          <motion.div key={maxim.id} variants={fadeInUp}>
            <GlassCard
              className="cursor-pointer"
              onClick={() => setExpandedId(expandedId === maxim.id ? null : maxim.id)}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-vault-gold/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-vault-gold font-mono text-sm">{maxim.id}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-heading text-white mb-1 italic">
                    "{maxim.maxim}"
                  </h3>
                  <p className="text-white/50 text-sm line-clamp-2">
                    {maxim.explanation}
                  </p>
                </div>
                {expandedId === maxim.id ? (
                  <ChevronUp className="w-5 h-5 text-vault-gold" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white/30" />
                )}
              </div>

              <AnimatePresence>
                {expandedId === maxim.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
                      {maxim.latin && (
                        <p className="text-white/40 font-legal italic">Latin: {maxim.latin}</p>
                      )}
                      <div>
                        <h4 className="text-vault-gold uppercase tracking-wider text-xs mb-2">Application</h4>
                        <p className="text-white/60 text-sm">{maxim.application}</p>
                      </div>
                      <div>
                        <h4 className="text-vault-gold uppercase tracking-wider text-xs mb-2">Related Doctrines</h4>
                        <div className="flex flex-wrap gap-2">
                          {maxim.relatedDoctrines.map((doc, idx) => (
                            <span key={idx} className="px-2 py-1 bg-white/5 text-white/50 text-xs rounded">
                              {doc}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {filteredMaxims.length === 0 && (
        <div className="text-center py-16">
          <Sparkles className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/40">No maxims match your search</p>
        </div>
      )}
    </div>
  );
}
