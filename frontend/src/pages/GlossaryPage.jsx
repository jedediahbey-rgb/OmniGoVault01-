import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookText, Search, ArrowRight } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import GlassCard from '../components/shared/GlassCard';
import { Input } from '../components/ui/input';
import { staggerContainer, fadeInUp } from '../lib/motion';

// Comprehensive glossary synthesized from PDF content
const glossaryTerms = [
  {
    term: "Beneficiary",
    aka: "Cestui Que Trust",
    definition: "The person for whose benefit a trust is created. Holds equitable title to trust property while the trustee holds legal title. Equity regards the beneficiary as the true owner.",
    category: "parties"
  },
  {
    term: "Cestui Que Trust",
    aka: "Beneficiary",
    definition: "Latin for 'the one for whose benefit.' The person entitled to the benefits of a trust. Used interchangeably with beneficiary in trust law.",
    category: "parties"
  },
  {
    term: "Clean Hands",
    definition: "The equitable doctrine that a party seeking relief must not have engaged in inequitable conduct regarding the matter at issue. 'He who comes into equity must come with clean hands.'",
    category: "doctrines"
  },
  {
    term: "Constructive Trust",
    definition: "A trust imposed by equity to prevent unjust enrichment. Unlike express trusts, it arises by operation of law, not from the parties' intention. Used as a remedy when property is obtained through fraud or breach of fiduciary duty.",
    category: "trusts"
  },
  {
    term: "Conversion",
    definition: "The equitable doctrine treating property as changed in nature based on what the parties are obligated to do. Money to be used to buy land is treated as land; land to be sold is treated as money.",
    category: "doctrines"
  },
  {
    term: "Declaration of Trust",
    definition: "The formal document creating a trust, setting forth the identity of parties, trust property, terms, and purposes. The foundational instrument of the trust relationship.",
    category: "documents"
  },
  {
    term: "Equitable Interest",
    definition: "An interest recognized and protected by equity, as distinguished from legal interests protected by common law. The beneficiary's interest in trust property is equitable.",
    category: "interests"
  },
  {
    term: "Equitable Title",
    definition: "The beneficial ownership interest recognized by equity, giving the holder the right to receive benefits from property even though legal title is held by another (such as a trustee).",
    category: "interests"
  },
  {
    term: "Express Trust",
    definition: "A trust intentionally created by the express declaration of the settlor, as distinguished from trusts arising by operation of law (resulting or constructive trusts).",
    category: "trusts"
  },
  {
    term: "Fiduciary",
    definition: "A person in a position of trust and confidence who must act for another's benefit. Trustees, agents, executors, and guardians are fiduciaries. They owe duties of loyalty, care, and good faith.",
    category: "parties"
  },
  {
    term: "Grantor",
    aka: "Settlor, Trustor",
    definition: "The person who creates a trust by transferring property to a trustee for the benefit of a beneficiary. Also called settlor or trustor in different jurisdictions.",
    category: "parties"
  },
  {
    term: "In Personam",
    definition: "Against the person. Equity acts in personam, meaning it operates on the conscience of individuals, compelling them to act or refrain from acting, rather than directly on property (in rem).",
    category: "jurisdiction"
  },
  {
    term: "In Rem",
    definition: "Against the thing. Legal actions that operate directly on property, as distinguished from equitable actions that operate on persons. Courts of law often act in rem.",
    category: "jurisdiction"
  },
  {
    term: "Injunction",
    definition: "An equitable remedy ordering a person to do or refrain from doing a specific act. May be temporary (preliminary) or permanent. Granted when money damages are inadequate.",
    category: "remedies"
  },
  {
    term: "Laches",
    definition: "An equitable defense based on unreasonable delay in asserting rights. Unlike statutes of limitation, laches depends on prejudice caused by delay, not merely time elapsed. 'Equity aids the vigilant.'",
    category: "doctrines"
  },
  {
    term: "Legal Title",
    definition: "Formal ownership of property recognized by courts of law. In a trust, the trustee holds legal title while the beneficiary holds equitable title. Legal title carries management authority.",
    category: "interests"
  },
  {
    term: "Maxim",
    definition: "A general principle or rule of equity jurisprudence. Maxims are not rigid rules but flexible guidelines reflecting equity's conscience-based approach. Examples: 'Equity follows the law,' 'He who seeks equity must do equity.'",
    category: "fundamental"
  },
  {
    term: "Pure Trust",
    definition: "A trust operating under pure equitable principles, often emphasizing the separation between legal and equitable title. Used in estate planning and asset protection contexts.",
    category: "trusts"
  },
  {
    term: "Res",
    definition: "Latin for 'thing.' The trust res is the property held in trust. Also called the trust corpus or trust property. A valid trust requires identifiable res.",
    category: "fundamental"
  },
  {
    term: "Resulting Trust",
    definition: "A trust implied by law from the circumstances, arising when: (1) an express trust fails, (2) purchase money is provided by one but title taken in another's name, or (3) trust property remains after purposes fulfilled.",
    category: "trusts"
  },
  {
    term: "Settlor",
    aka: "Grantor, Trustor",
    definition: "The creator of a trust. The person who transfers property to a trustee for the benefit of beneficiaries. Called grantor in deed-based transfers.",
    category: "parties"
  },
  {
    term: "Specific Performance",
    definition: "An equitable remedy ordering a party to perform their contractual obligations, typically for contracts involving unique property (like real estate) where money damages would be inadequate.",
    category: "remedies"
  },
  {
    term: "Tracing",
    definition: "The equitable remedy allowing a beneficiary to follow trust property through changes in form. If a trustee wrongfully converts trust property, the beneficiary can trace into the proceeds.",
    category: "remedies"
  },
  {
    term: "Trust",
    definition: "A fiduciary relationship where one party (trustee) holds legal title to property for the benefit of another (beneficiary). Created by a settlor through express declaration or arising by operation of law.",
    category: "fundamental"
  },
  {
    term: "Trust Corpus",
    aka: "Trust Res, Trust Property",
    definition: "The property held in a trust. May include real property, personal property, money, securities, or any other transferable asset. Must be identifiable and ascertainable.",
    category: "fundamental"
  },
  {
    term: "Trustee",
    definition: "The person who holds legal title to trust property and manages it for the beneficiary's benefit. Owes fiduciary duties of loyalty, care, prudence, and impartiality.",
    category: "parties"
  },
  {
    term: "TTGD",
    aka: "Trust Transfer Grant Deed",
    definition: "The instrument that conveys property into a trust. Contains granting clause, property description, habendum clause, covenants, and proper execution. Transfers legal title to trustee.",
    category: "documents"
  },
  {
    term: "Volunteer",
    definition: "A person who provides no consideration for a transfer or promise. Equity generally will not aid volunteers—incomplete gifts cannot be enforced, and gratuitous promises have no equitable remedy.",
    category: "doctrines"
  }
];

const categories = [
  { id: 'all', label: 'All Terms' },
  { id: 'fundamental', label: 'Fundamental' },
  { id: 'parties', label: 'Parties' },
  { id: 'trusts', label: 'Trusts' },
  { id: 'doctrines', label: 'Doctrines' },
  { id: 'remedies', label: 'Remedies' },
  { id: 'documents', label: 'Documents' },
];

export default function GlossaryPage({ user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTerm, setSelectedTerm] = useState(null);

  const filteredTerms = glossaryTerms
    .filter(t => {
      const matchesSearch = searchTerm === '' || 
        t.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.aka && t.aka.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => a.term.localeCompare(b.term));

  // Group by first letter
  const groupedTerms = filteredTerms.reduce((acc, term) => {
    const letter = term.term[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(term);
    return acc;
  }, {});

  return (
    <div className="p-8">
      <PageHeader
        icon={BookText}
        title="Glossary"
        subtitle="Essential terms and definitions in equity and trust law"
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

      {/* Alphabet Navigation */}
      <div className="flex flex-wrap gap-1 mb-8">
        {Object.keys(groupedTerms).sort().map(letter => (
          <a
            key={letter}
            href={`#letter-${letter}`}
            className="w-8 h-8 flex items-center justify-center rounded bg-white/5 text-white/60 hover:bg-vault-gold/20 hover:text-vault-gold transition-colors text-sm font-mono"
          >
            {letter}
          </a>
        ))}
      </div>

      {/* Terms List */}
      <div className="space-y-8">
        {Object.entries(groupedTerms).sort().map(([letter, terms]) => (
          <div key={letter} id={`letter-${letter}`}>
            <h2 className="text-3xl font-heading text-vault-gold mb-4">{letter}</h2>
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid md:grid-cols-2 gap-4"
            >
              {terms.map((term) => (
                <motion.div key={term.term} variants={fadeInUp}>
                  <GlassCard
                    interactive
                    onClick={() => setSelectedTerm(selectedTerm?.term === term.term ? null : term)}
                    className={selectedTerm?.term === term.term ? 'border-vault-gold/50' : ''}
                  >
                    <h3 className="text-lg font-heading text-white mb-1">
                      {term.term}
                    </h3>
                    {term.aka && (
                      <p className="text-vault-gold/60 text-sm mb-2">Also: {term.aka}</p>
                    )}
                    <p className="text-white/50 text-sm line-clamp-2">
                      {term.definition}
                    </p>
                    
                    {selectedTerm?.term === term.term && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 pt-4 border-t border-white/10"
                      >
                        <p className="text-white/70 text-sm">
                          {term.definition}
                        </p>
                        <div className="mt-3">
                          <span className="px-2 py-1 bg-vault-gold/10 text-vault-gold text-xs rounded">
                            {categories.find(c => c.id === term.category)?.label || term.category}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
          </div>
        ))}
      </div>

      {filteredTerms.length === 0 && (
        <div className="text-center py-16">
          <BookText className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/40">No terms match your search</p>
        </div>
      )}
    </div>
  );
}
