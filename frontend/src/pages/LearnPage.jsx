import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  BookOpen, 
  ChevronRight, 
  CheckCircle, 
  Circle,
  Play,
  FileText,
  Users,
  Scale,
  Scroll
} from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import GlassCard from '../components/shared/GlassCard';
import { staggerContainer, fadeInUp } from '../lib/motion';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Synthesized educational content from PDFs
const learningModules = [
  {
    id: 'foundations',
    title: 'Foundations of Equity',
    description: 'Understand the origins and principles of equity jurisprudence',
    icon: Scale,
    duration: '45 min',
    lessons: [
      {
        id: 'what-is-equity',
        title: 'What is Equity?',
        content: `Equity represents a body of jurisprudence developed to provide remedies and relief where the common law was inadequate or inflexible. Unlike the rigid rules of common law courts, equity operates on principles of fairness, conscience, and natural justice.

Historically, equity emerged from the English Court of Chancery, where the Lord Chancellor—often called the "keeper of the King's conscience"—would hear petitions from subjects who could not obtain adequate relief from common law courts.

The fundamental distinction lies in approach: while law focuses on strict rules and precedent, equity looks to the substance of matters, asking what is fair and just in each particular circumstance. This is captured in the maxim "Equity looks to the intent rather than to the form."`,
        keyPoints: [
          'Equity provides remedies where law is insufficient',
          'Operates on principles of fairness and conscience',
          'Looks to substance over form',
          'Originated in the Court of Chancery'
        ]
      },
      {
        id: 'equity-vs-law',
        title: 'Equity vs Common Law',
        content: `The relationship between equity and common law is one of complementarity, not opposition. As the maxim states, "Equity follows the law"—meaning equity generally respects legal rights and operates within the legal framework, but it will intervene when strict application of law would produce unconscionable results.

Key distinctions include:

1. **Remedies**: Law typically offers monetary damages; equity provides specific performance, injunctions, rescission, and reformation.

2. **Discretion**: Legal remedies are often automatic upon proving a case; equitable remedies are discretionary—the court considers all circumstances.

3. **Conscience**: Equity binds the conscience of parties. One seeking equity must "come with clean hands" and must "do equity" themselves.

4. **In Personam vs In Rem**: Equity acts on the person (in personam), compelling them to act or refrain from acting, rather than directly on property.`,
        keyPoints: [
          'Equity complements, not opposes, common law',
          'Different remedies: injunctions, specific performance',
          'Discretionary vs automatic relief',
          'Focuses on conscience and fairness'
        ]
      },
      {
        id: 'courts-of-equity',
        title: 'Courts of Equity & Jurisdiction',
        content: `Equity jurisdiction encompasses matters where common law remedies are inadequate. The Court of Chancery established several categories of equitable jurisdiction:

**Exclusive Jurisdiction**: Matters only equity could address, such as trusts, specific performance of contracts for unique goods, and administration of deceased estates.

**Concurrent Jurisdiction**: Where both law and equity could provide relief, but equity offered superior remedies (e.g., fraud, mistake, accident).

**Auxiliary Jurisdiction**: Where equity aided common law proceedings through discovery, preservation of evidence, or perpetuating testimony.

Today, most jurisdictions have merged law and equity procedurally, but the substantive distinctions remain. Understanding whether a matter is "purely equitable" or "purely legal" affects available remedies and procedural rights.`,
        keyPoints: [
          'Exclusive, concurrent, and auxiliary jurisdiction',
          'Trust matters are exclusively equitable',
          'Modern courts merged but distinctions remain',
          'Jurisdiction affects available remedies'
        ]
      }
    ]
  },
  {
    id: 'maxims',
    title: 'Maxims of Equity',
    description: 'Master the foundational principles governing equitable decisions',
    icon: Scroll,
    duration: '60 min',
    lessons: [
      {
        id: 'primary-maxims',
        title: 'Primary Maxims',
        content: `The maxims of equity are guiding principles that courts apply when exercising equitable jurisdiction. They are not rigid rules but flexible guidelines reflecting the conscience-based nature of equity.

**"Equity regards as done that which ought to be done"**
When parties are obligated to perform an act, equity treats it as already accomplished. This underlies doctrines like conversion (treating land as money or vice versa based on contractual obligations).

**"Equity looks to the intent rather than to the form"**
Substance prevails over technicalities. If the true intention of parties is clear, equity will give effect to that intention regardless of formal defects.

**"Equity will not suffer a wrong to be without a remedy"**
Where someone has been wronged but common law offers no relief, equity will fashion an appropriate remedy. This is the origin of constructive trusts and other equitable remedies.

**"Where there is equal equity, the law must prevail"**
When two parties have equally valid equitable claims, legal title determines the outcome.`,
        keyPoints: [
          'Maxims are flexible guidelines, not rigid rules',
          'Equity treats obligations as performed',
          'Substance prevails over form',
          'Every wrong has a remedy in equity'
        ]
      },
      {
        id: 'conduct-maxims',
        title: 'Maxims of Conduct',
        content: `Several maxims govern the conduct required of parties seeking equitable relief:

**"He who seeks equity must do equity"**
A party seeking equitable relief must themselves act fairly. They cannot ask the court to enforce rights while refusing to fulfill their own obligations.

**"He who comes into equity must come with clean hands"**
The plaintiff's own conduct is scrutinized. If they have engaged in inequitable behavior related to the matter at hand, relief may be denied.

**"Equity aids the vigilant, not those who slumber on their rights"**
Unreasonable delay in asserting rights (laches) may bar equitable relief. This differs from statutes of limitation—even if the legal period hasn't expired, equity may refuse relief for unreasonable delay.

**"Equity imputes an intention to fulfill an obligation"**
Parties are presumed to intend to fulfill their obligations. This underlies the doctrine of satisfaction and other presumptions.

**"Equity acts in personam"**
Equitable orders bind the person, compelling them to act or refrain from acting, rather than operating directly on property.`,
        keyPoints: [
          'Must do equity to receive equity',
          'Clean hands doctrine bars inequitable plaintiffs',
          'Delay can bar relief (laches)',
          'Equity presumes good faith intentions'
        ]
      }
    ]
  },
  {
    id: 'trusts',
    title: 'Trust Fundamentals',
    description: 'Learn the essential concepts of trust law and structure',
    icon: FileText,
    duration: '75 min',
    lessons: [
      {
        id: 'what-is-trust',
        title: 'What is a Trust?',
        content: `A trust is a fiduciary arrangement where one party (the trustee) holds legal title to property for the benefit of another (the beneficiary). The person who creates the trust is the grantor, settlor, or trustor.

The essential elements of a valid trust are:

1. **Capacity**: The settlor must have legal capacity to create the trust
2. **Intent**: Clear intention to create a trust relationship
3. **Trust Property (Res)**: Identifiable property to be held in trust
4. **Trustee**: Someone capable of holding and managing the property
5. **Beneficiary**: Identifiable person(s) who will benefit
6. **Purpose**: A lawful purpose for the trust

The beauty of the trust lies in the separation of legal and equitable title. The trustee holds legal title—the formal ownership recognized by courts of law. But the beneficiary holds equitable title—the beneficial interest that equity will enforce.

As the maxim states, "Equity regards the beneficiary as the true owner." This means that while the trustee has legal control, they must exercise it solely for the beneficiary's benefit.`,
        keyPoints: [
          'Separation of legal and equitable title',
          'Three key parties: Settlor, Trustee, Beneficiary',
          'Six essential elements must be present',
          'Beneficiary holds equitable (beneficial) interest'
        ]
      },
      {
        id: 'types-of-trusts',
        title: 'Types of Trusts',
        content: `Trusts are classified by how they arise:

**Express Trusts**
Created by explicit declaration of the settlor. They may be:
- Inter vivos (created during lifetime)
- Testamentary (created by will)
- Private (for specific beneficiaries)
- Charitable (for public benefit)

**Implied Trusts**
Arise by operation of law from the circumstances:

*Resulting Trusts*: Arise when:
- A trust fails or is incomplete
- Purchase money is provided by one but title taken in another's name
- Trust property remains after the trust purpose is fulfilled

*Constructive Trusts*: Imposed by equity to prevent unjust enrichment:
- When property is obtained through fraud or breach of fiduciary duty
- Secret profits made by fiduciaries
- Mutual wills cases

**Pure Trust Under Equity**
A trust operating purely under equitable principles, often used for asset protection and estate planning. These trusts emphasize the distinction between legal and equitable title and rely heavily on the maxims of equity for interpretation and enforcement.`,
        keyPoints: [
          'Express trusts created by explicit declaration',
          'Resulting trusts arise from circumstances',
          'Constructive trusts prevent unjust enrichment',
          'Pure equity trusts operate on maxim principles'
        ]
      },
      {
        id: 'trustee-duties',
        title: 'Trustee Duties',
        content: `The trustee occupies a fiduciary position—a role of utmost trust and confidence. The duties imposed reflect equity's insistence on conscience and good faith:

**Duty of Loyalty**
The trustee must act solely in the beneficiary's interest. Self-dealing is prohibited. The trustee cannot purchase trust property, sell their own property to the trust, or otherwise place themselves in a position of conflict.

**Duty of Care**
Manage trust property with reasonable care, skill, and caution—the standard of a prudent person managing their own affairs.

**Duty to Account**
Maintain accurate records and provide accountings to beneficiaries. Transparency is fundamental to the trust relationship.

**Duty of Impartiality**
When there are multiple beneficiaries, the trustee must balance their interests fairly, not favoring one over another.

**Duty Not to Delegate**
The trustee cannot delegate duties requiring discretion unless authorized by the trust instrument. However, they may employ agents for ministerial tasks.

**Duty to Preserve and Protect**
Safeguard trust assets, maintain appropriate insurance, and defend against threats to trust property.`,
        keyPoints: [
          'Fiduciary relationship of utmost trust',
          'No self-dealing or conflicts of interest',
          'Must account to beneficiaries',
          'Balance interests of multiple beneficiaries'
        ]
      }
    ]
  },
  {
    id: 'relationships',
    title: 'Trust Relationships',
    description: 'Understand the paired duties and rights in equitable relationships',
    icon: Users,
    duration: '50 min',
    lessons: [
      {
        id: 'trustee-beneficiary',
        title: 'Trustee & Beneficiary',
        content: `The trustee-beneficiary relationship is the paradigm fiduciary relationship in equity. Understanding this pairing illuminates all other fiduciary relationships.

**Trustee Duties:**
- Hold legal title to trust property
- Manage property prudently for beneficiary's benefit
- Act with undivided loyalty
- Keep accurate accounts
- Distribute according to trust terms
- Defend trust against claims

**Beneficiary Rights:**
- Equitable title/beneficial interest
- Enforce the trust in court
- Receive distributions per trust terms
- Demand accountings
- Sue trustee for breach
- Trace trust property into its proceeds

The term "cestui que trust" refers to the beneficiary—literally "the one for whose benefit" the trust exists. Equity regards this person as the true owner because they hold the beneficial interest, even though the trustee holds legal title.

This split between legal and equitable ownership is the genius of the trust—allowing professional management (trustee) while protecting beneficial enjoyment (beneficiary).`,
        keyPoints: [
          'Paradigm fiduciary relationship',
          'Trustee: legal title and duties',
          'Beneficiary: equitable title and rights',
          'Beneficiary can trace and enforce'
        ]
      },
      {
        id: 'agent-principal',
        title: 'Agent & Principal',
        content: `The agent-principal relationship shares characteristics with the trust relationship but differs in important ways:

**Agent Duties:**
- Act within the scope of authority granted
- Exercise reasonable care and skill
- Loyalty to principal's interests
- Account for all property received
- Follow principal's lawful instructions
- Keep principal informed

**Principal Rights:**
- Control and direct the agent
- Receive benefits of agent's actions
- Ratify unauthorized acts
- Recover secret profits
- Sue agent for breach of duty
- Terminate the agency

**Key Distinctions from Trust:**
1. An agent acts on behalf of the principal; a trustee acts in their own name for the beneficiary
2. A principal can control and direct the agent; a beneficiary generally cannot control the trustee
3. Agency typically involves third-party transactions; trusts focus on property management

Both relationships are fiduciary, meaning both agent and trustee must exercise utmost good faith and loyalty. Neither may profit at their principal's/beneficiary's expense.`,
        keyPoints: [
          'Agent acts on behalf of principal',
          'Principal can direct and control',
          'Both are fiduciary relationships',
          'Different from trust in control aspects'
        ]
      }
    ]
  },
  {
    id: 'documents',
    title: 'Trust Documents',
    description: 'Learn about essential documents in trust administration',
    icon: FileText,
    duration: '40 min',
    lessons: [
      {
        id: 'declaration-of-trust',
        title: 'Declaration of Trust',
        content: `The Declaration of Trust is the foundational document that creates and defines the trust. It sets forth:

**Identification of Parties:**
- Grantor/Settlor: Who creates the trust
- Trustee: Who will manage trust property
- Beneficiaries: Who will benefit from the trust

**Trust Property:**
Clear description of assets being placed in trust. Property must be identified with sufficient specificity.

**Trust Terms:**
- Purpose of the trust
- Duration or term
- Distribution standards and timing
- Trustee powers and limitations
- Conditions for modification or revocation
- Successor trustee provisions

**Governing Principles:**
Many declarations incorporate the maxims of equity as interpretive guidelines, ensuring the trust operates according to equitable principles.

The declaration should be in writing, properly executed, and ideally notarized. While oral trusts are possible for personal property, written declarations provide certainty and evidence.`,
        keyPoints: [
          'Creates and defines the trust',
          'Identifies all parties and their roles',
          'Describes trust property clearly',
          'Sets forth governing terms and powers'
        ]
      },
      {
        id: 'transfer-deed',
        title: 'Trust Transfer Grant Deed',
        content: `The Trust Transfer Grant Deed (TTGD) is the instrument that conveys property into the trust. While the Declaration creates the trust relationship, the TTGD transfers title to trust property.

**Essential Components:**

**Granting Clause:**
Words of conveyance from the grantor to the trustee. Must clearly express intent to transfer.

**Property Description:**
For real property: legal description including metes and bounds, lot numbers, or other sufficient identification.
For personal property: detailed description enabling identification.

**Habendum Clause:**
"To have and to hold" language defining the nature and extent of the interest conveyed.

**Covenants:**
Promises regarding title quality—that the grantor has authority to convey, that title is clear, etc.

**Consideration:**
Statement of valuable consideration received. In trust transfers, this may be the undertaking of fiduciary duties by the trustee.

**Execution:**
Proper signatures, witnesses, and notarization as required by jurisdiction for the type of property.`,
        keyPoints: [
          'Conveys property into the trust',
          'Must clearly describe property',
          'Includes covenants about title',
          'Requires proper execution'
        ]
      },
      {
        id: 'notices-affidavits',
        title: 'Notices & Affidavits',
        content: `Various notices and affidavits support trust administration:

**Notice of Interest**
Declares an equitable interest in property. Used to:
- Put third parties on notice of trust claims
- Establish priority over subsequent purchasers
- Trigger "constructive notice" protections

**Notice of Delivery**
Documents the delivery of property to the trust. Important because delivery is essential to complete a transfer—the grantor must relinquish dominion and control.

**Acknowledgement / Receipt / Acceptance**
Trustee's formal acknowledgment of receiving trust property and accepting fiduciary duties. Creates evidence of:
- What was received
- When it was received
- Trustee's acceptance of responsibility

**Affidavit of Fact**
Sworn statement establishing facts under oath. Used in trust administration to:
- Prove delivery of property
- Establish residence or identity
- Document events or transactions
- Support recording of documents

The jurat (notary attestation) verifies the affiant swore to the truth of statements.`,
        keyPoints: [
          'Notice of Interest establishes claims',
          'Delivery must be documented',
          'Trustee acknowledges receipt formally',
          'Affidavits provide sworn evidence'
        ]
      }
    ]
  }
];

export default function LearnPage({ user }) {
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);

  return (
    <div className="p-8">
      <PageHeader
        icon={BookOpen}
        title="Learn"
        subtitle="Master equity jurisprudence through structured lessons"
      />

      {!selectedModule ? (
        // Module Grid
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {learningModules.map((module, idx) => (
            <motion.div key={module.id} variants={fadeInUp}>
              <GlassCard
                interactive
                glow
                onClick={() => setSelectedModule(module)}
                className="h-full"
              >
                <div className="w-12 h-12 rounded-xl bg-vault-gold/10 flex items-center justify-center mb-4">
                  <module.icon className="w-6 h-6 text-vault-gold" />
                </div>
                <h3 className="text-xl font-heading text-white mb-2">{module.title}</h3>
                <p className="text-white/50 text-sm mb-4">{module.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/40">{module.lessons.length} lessons</span>
                  <span className="text-vault-gold">{module.duration}</span>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      ) : !selectedLesson ? (
        // Lesson List
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => setSelectedModule(null)}
            className="flex items-center gap-2 text-vault-gold mb-6 hover:underline"
          >
            ← Back to Modules
          </button>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-xl bg-vault-gold/10 flex items-center justify-center">
              <selectedModule.icon className="w-7 h-7 text-vault-gold" />
            </div>
            <div>
              <h2 className="text-2xl font-heading text-white">{selectedModule.title}</h2>
              <p className="text-white/50">{selectedModule.description}</p>
            </div>
          </div>

          <div className="space-y-3">
            {selectedModule.lessons.map((lesson, idx) => (
              <GlassCard
                key={lesson.id}
                interactive
                onClick={() => setSelectedLesson(lesson)}
                className="flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-vault-gold/10 flex items-center justify-center text-vault-gold font-mono">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium">{lesson.title}</h4>
                  <p className="text-white/40 text-sm">{lesson.keyPoints.length} key concepts</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/30" />
              </GlassCard>
            ))}
          </div>
        </motion.div>
      ) : (
        // Lesson Content
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => setSelectedLesson(null)}
            className="flex items-center gap-2 text-vault-gold mb-6 hover:underline"
          >
            ← Back to {selectedModule.title}
          </button>

          <GlassCard className="max-w-4xl">
            <h2 className="text-3xl font-heading text-white mb-6">{selectedLesson.title}</h2>
            
            <div className="prose prose-invert max-w-none">
              {selectedLesson.content.split('\n\n').map((para, idx) => (
                <p key={idx} className="text-white/70 leading-relaxed mb-4 whitespace-pre-line">
                  {para}
                </p>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <h4 className="text-vault-gold uppercase tracking-wider text-sm mb-4">Key Takeaways</h4>
              <ul className="space-y-2">
                {selectedLesson.keyPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-white/60">
                    <CheckCircle className="w-5 h-5 text-vault-gold flex-shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
