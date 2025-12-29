import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Brain,
  CaretRight,
  Check,
  CheckCircle,
  Circle,
  FileText,
  Play,
  Scales,
  Scroll,
  Trophy,
  Users,
  X
} from '@phosphor-icons/react';
import PageHeader from '../components/shared/PageHeader';
import PageHelpTooltip from '../components/shared/PageHelpTooltip';
import GlassCard from '../components/shared/GlassCard';
import IconBadge from '../components/shared/IconBadge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { ExpandableText } from '../components/ui/expandable-text';
import { staggerContainer, fadeInUp } from '../lib/motion';
import { toast } from 'sonner';

// Helper function to parse **bold** markdown to JSX
const parseBoldText = (text) => {
  if (typeof text !== 'string') return text;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Quiz questions for each lesson
const lessonQuizzes = {
  'what-is-equity': [
    {
      question: "What is the fundamental distinction between equity and common law?",
      options: [
        "Equity focuses on strict rules while law focuses on fairness",
        "Equity looks to substance and fairness while law focuses on strict rules and precedent",
        "They are essentially the same legal system",
        "Equity only applies to property matters"
      ],
      correct: 1,
      explanation: "Equity developed to provide remedies where common law was inadequate, focusing on fairness and conscience rather than rigid rules."
    },
    {
      question: "From which court did equity jurisdiction originally emerge?",
      options: [
        "Court of Common Pleas",
        "Court of King's Bench",
        "Court of Chancery",
        "Court of Exchequer"
      ],
      correct: 2,
      explanation: "The Court of Chancery, headed by the Lord Chancellor, was where equity jurisdiction developed in England."
    }
  ],
  'equity-vs-law': [
    {
      question: "What does the maxim 'Equity follows the law' mean?",
      options: [
        "Equity always overrides legal rules",
        "Equity ignores common law entirely",
        "Equity generally respects legal rights and operates within the legal framework",
        "Legal courts have priority over equitable courts"
      ],
      correct: 2,
      explanation: "This maxim means equity complements rather than opposes common law, intervening only when strict application would produce unconscionable results."
    },
    {
      question: "Which remedy is unique to equity and NOT available at common law?",
      options: [
        "Monetary damages",
        "Specific performance",
        "Compensatory damages",
        "Punitive damages"
      ],
      correct: 1,
      explanation: "Specific performance, ordering a party to fulfill their contractual obligations, is an equitable remedy not available at common law."
    }
  ],
  'primary-maxims': [
    {
      question: "What does 'Equity regards as done that which ought to be done' mean?",
      options: [
        "Equity forces parties to complete their obligations immediately",
        "Equity treats obligations as already accomplished when parties are bound to perform",
        "Done deals cannot be undone in equity",
        "Equity ignores future obligations"
      ],
      correct: 1,
      explanation: "This maxim underlies doctrines like conversion, where equity treats property as transformed based on contractual obligations."
    }
  ],
  'conduct-maxims': [
    {
      question: "What is the 'clean hands' doctrine?",
      options: [
        "Courts require physical cleanliness",
        "A party seeking equity must not have engaged in inequitable conduct regarding the matter",
        "Only innocent parties can sue",
        "Equity courts must be impartial"
      ],
      correct: 1,
      explanation: "The clean hands doctrine means a party's own misconduct related to the claim may bar equitable relief."
    }
  ],
  'what-is-trust': [
    {
      question: "What are the three key parties in a trust arrangement?",
      options: [
        "Judge, Lawyer, Client",
        "Settlor, Trustee, Beneficiary",
        "Owner, Manager, User",
        "Principal, Agent, Third Party"
      ],
      correct: 1,
      explanation: "A trust involves the Settlor (creator), Trustee (legal title holder), and Beneficiary (beneficial interest holder)."
    },
    {
      question: "Who holds legal title in a trust?",
      options: [
        "The beneficiary",
        "The settlor",
        "The trustee",
        "The court"
      ],
      correct: 2,
      explanation: "The trustee holds legal title while the beneficiary holds equitable (beneficial) title."
    }
  ],
  'types-of-trusts': [
    {
      question: "What is a constructive trust?",
      options: [
        "A trust created by written declaration",
        "A trust imposed by equity to prevent unjust enrichment",
        "A trust built from construction materials",
        "A trust created by will"
      ],
      correct: 1,
      explanation: "Constructive trusts are imposed by equity to prevent unjust enrichment when property is obtained through fraud or breach of duty."
    }
  ],
  'trustee-duties': [
    {
      question: "What is the trustee's primary duty?",
      options: [
        "To maximize their own profit",
        "To act solely in the beneficiary's interest",
        "To follow the settlor's wishes above all else",
        "To minimize taxes"
      ],
      correct: 1,
      explanation: "The duty of loyalty requires the trustee to act solely in the beneficiary's interest, prohibiting self-dealing."
    }
  ],
  'trustee-beneficiary': [
    {
      question: "What does 'cestui que trust' refer to?",
      options: [
        "The trustee",
        "The settlor",
        "The beneficiary",
        "The trust property"
      ],
      correct: 2,
      explanation: "Cestui que trust literally means 'the one for whose benefit' - the beneficiary of the trust."
    }
  ],
  'agent-principal': [
    {
      question: "How does agency differ from a trust?",
      options: [
        "Agents are not fiduciaries",
        "A principal can control and direct an agent; beneficiaries generally cannot control trustees",
        "Agency only involves money",
        "They are identical relationships"
      ],
      correct: 1,
      explanation: "A key distinction is that principals can direct agents, while beneficiaries generally cannot control trustee discretion."
    }
  ],
  'declaration-of-trust': [
    {
      question: "What does the Declaration of Trust establish?",
      options: [
        "Only the trust property",
        "The creation and defining terms of the trust including parties, property, and purposes",
        "The tax status of the trust",
        "The trustee's compensation"
      ],
      correct: 1,
      explanation: "The Declaration is the foundational document that creates and defines all aspects of the trust."
    }
  ],
  'transfer-deed': [
    {
      question: "What is the purpose of a Trust Transfer Grant Deed?",
      options: [
        "To create the trust",
        "To convey property into the trust",
        "To dissolve the trust",
        "To appoint beneficiaries"
      ],
      correct: 1,
      explanation: "The TTGD transfers title to property into the trust; the Declaration creates the trust relationship."
    }
  ],
  'notices-affidavits': [
    {
      question: "What is the purpose of a Notice of Interest?",
      options: [
        "To express curiosity",
        "To declare an equitable interest and put third parties on notice",
        "To terminate the trust",
        "To change beneficiaries"
      ],
      correct: 1,
      explanation: "A Notice of Interest establishes priority and triggers constructive notice protections."
    }
  ]
};

// Enhanced learning modules with quizzes
const learningModules = [
  {
    id: 'foundations',
    title: 'Master Equity',
    description: 'Decode the lineage, logic, and living practice of equity jurisprudence.',
    icon: Scales,
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
        ],
        checklist: [
          'Understand the historical origins of equity',
          'Distinguish equity from common law',
          'Recognize equity\'s focus on conscience',
          'Apply the substance over form principle'
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
        ],
        checklist: [
          'Compare legal vs equitable remedies',
          'Understand discretionary nature of equity',
          'Apply the clean hands doctrine',
          'Distinguish in personam from in rem'
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
        ],
        checklist: [
          'Identify exclusive equitable matters',
          'Recognize concurrent jurisdiction situations',
          'Understand modern merger of courts',
          'Apply jurisdictional principles'
        ]
      }
    ]
  },
  {
    id: 'maxims',
    title: 'Maxims of Equity',
    description: 'Innerstand the timeless maxims that shape every equitable judgment.',
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
        ],
        checklist: [
          'Memorize the primary maxims',
          'Apply "equity regards done" to scenarios',
          'Use substance over form analysis',
          'Understand priority rules'
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
        ],
        checklist: [
          'Apply clean hands analysis',
          'Recognize laches situations',
          'Understand the "do equity" requirement',
          'Apply in personam principle'
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
        ],
        checklist: [
          'Identify all six essential elements',
          'Distinguish legal from equitable title',
          'Recognize the three key parties',
          'Understand beneficial ownership'
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

**Exclusive Trust Under Equity**
A trust operating purely under equitable principles, often used for asset protection and estate planning. These trusts emphasize the distinction between legal and equitable title and rely heavily on the maxims of equity for interpretation and enforcement.`,
        keyPoints: [
          'Express trusts created by explicit declaration',
          'Resulting trusts arise from circumstances',
          'Constructive trusts prevent unjust enrichment',
          'Exclusive equity trusts operate on maxim principles'
        ],
        checklist: [
          'Classify trusts by origin',
          'Identify resulting trust situations',
          'Recognize constructive trust scenarios',
          'Apply equity principles to trusts'
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
        ],
        checklist: [
          'Apply duty of loyalty',
          'Understand care standards',
          'Recognize accounting requirements',
          'Identify delegation limits'
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
        ],
        checklist: [
          'List trustee duties',
          'List beneficiary rights',
          'Understand enforcement mechanisms',
          'Apply tracing principles'
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
        ],
        checklist: [
          'Compare agent and trustee duties',
          'Understand principal control',
          'Distinguish from trust relationship',
          'Apply fiduciary principles'
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
        ],
        checklist: [
          'Draft party identification sections',
          'Describe trust property accurately',
          'Include essential trust terms',
          'Incorporate governing principles'
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
        ],
        checklist: [
          'Draft granting clause',
          'Include property description',
          'Add habendum clause',
          'Execute properly'
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
        ],
        checklist: [
          'Draft Notice of Interest',
          'Document delivery properly',
          'Create acknowledgment records',
          'Use affidavits for evidence'
        ]
      }
    ]
  }
];

export default function LearnPage({ user }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(false);

  // Handle direct navigation to a specific lesson via URL parameter
  useEffect(() => {
    const lessonId = searchParams.get('lesson');
    if (lessonId) {
      // Find the module containing this lesson
      for (const module of learningModules) {
        const lesson = module.lessons.find(l => l.id === lessonId);
        if (lesson) {
          setSelectedModule(module);
          setSelectedLesson(lesson);
          // Clear the URL parameter after navigation
          setSearchParams({}, { replace: true });
          break;
        }
      }
    }
  }, [searchParams, setSearchParams]);

  // Scroll to top when lesson/module is selected
  useEffect(() => {
    if (selectedLesson || selectedModule) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      const scrollContainer = document.querySelector('.overflow-y-auto');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
  }, [selectedLesson, selectedModule]);

  useEffect(() => {
    if (user) {
      fetchProgress();
    }
  }, [user]);

  const fetchProgress = async () => {
    try {
      const response = await axios.get(`${API}/learning/progress`);
      const progressMap = {};
      response.data.forEach(p => {
        if (!progressMap[p.module_id]) progressMap[p.module_id] = {};
        progressMap[p.module_id][p.lesson_id] = p;
      });
      setProgress(progressMap);
    } catch (error) {
      // User might not be logged in
    }
  };

  const markComplete = async (moduleId, lessonId) => {
    if (!user) {
      toast.info('Sign in to track your progress');
      return;
    }
    try {
      await axios.post(`${API}/learning/progress?module_id=${moduleId}&lesson_id=${lessonId}&completed=true`);
      setProgress(prev => ({
        ...prev,
        [moduleId]: {
          ...(prev[moduleId] || {}),
          [lessonId]: { ...(prev[moduleId]?.[lessonId] || {}), completed: true }
        }
      }));
      toast.success('Lesson completed!');
    } catch (error) {
      toast.error('Failed to save progress');
    }
  };

  const submitQuiz = async () => {
    if (!selectedLesson) return;
    
    const quiz = lessonQuizzes[selectedLesson.id];
    if (!quiz) return;
    
    let correct = 0;
    quiz.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correct) correct++;
    });
    
    const score = Math.round((correct / quiz.length) * 100);
    setQuizSubmitted(true);
    
    if (user) {
      try {
        await axios.post(`${API}/learning/progress?module_id=${selectedModule.id}&lesson_id=${selectedLesson.id}&quiz_score=${score}`);
        setProgress(prev => ({
          ...prev,
          [selectedModule.id]: {
            ...(prev[selectedModule.id] || {}),
            [selectedLesson.id]: { 
              ...(prev[selectedModule.id]?.[selectedLesson.id] || {}), 
              quiz_score: score 
            }
          }
        }));
      } catch (error) {
        console.error('Failed to save quiz score');
      }
    }
    
    if (score >= 70) {
      toast.success(`Great job! You scored ${score}%`);
    } else {
      toast.info(`You scored ${score}%. Review the material and try again!`);
    }
  };

  const resetQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
  };

  const getModuleProgress = (moduleId) => {
    const module = learningModules.find(m => m.id === moduleId);
    if (!module || !progress[moduleId]) return 0;
    
    const completedCount = module.lessons.filter(
      l => progress[moduleId]?.[l.id]?.completed
    ).length;
    
    return Math.round((completedCount / module.lessons.length) * 100);
  };

  const isLessonComplete = (moduleId, lessonId) => {
    return progress[moduleId]?.[lessonId]?.completed;
  };

  // Quiz View
  if (showQuiz && selectedLesson) {
    const quiz = lessonQuizzes[selectedLesson.id];
    
    if (!quiz) {
      return (
        <div className="p-4 sm:p-8 min-w-0 max-w-full">
          <button
            onClick={() => setShowQuiz(false)}
            className="flex items-center gap-2 text-vault-gold mb-6 hover:underline"
          >
            ← Back to Lesson
          </button>
          <GlassCard className="max-w-2xl mx-auto text-center py-12">
            <Brain className="w-16 h-16 text-white/20 mx-auto mb-4" weight="duotone" />
            <h3 className="text-xl text-white mb-2">Quiz Coming Soon</h3>
            <p className="text-white/50">Quiz questions for this lesson are being developed.</p>
          </GlassCard>
        </div>
      );
    }

    return (
      <div className="p-4 sm:p-8 min-w-0 max-w-full">
        <button
          onClick={() => { setShowQuiz(false); resetQuiz(); }}
          className="flex items-center gap-2 text-vault-gold mb-6 hover:underline"
        >
          ← Back to Lesson
        </button>

        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-heading text-white mb-2">Knowledge Check</h2>
            <p className="text-white/50">{selectedLesson.title}</p>
          </div>

          <div className="space-y-6">
            {quiz.map((q, qIdx) => (
              <GlassCard key={qIdx}>
                <p className="text-white font-medium mb-4">
                  {qIdx + 1}. {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt, oIdx) => {
                    const isSelected = quizAnswers[qIdx] === oIdx;
                    const isCorrect = q.correct === oIdx;
                    const showResult = quizSubmitted;
                    
                    let bgClass = 'bg-white/5 hover:bg-white/10';
                    if (showResult) {
                      if (isCorrect) bgClass = 'bg-green-500/20 border-green-500/50';
                      else if (isSelected && !isCorrect) bgClass = 'bg-red-500/20 border-red-500/50';
                    } else if (isSelected) {
                      bgClass = 'bg-vault-gold/20 border-vault-gold/50';
                    }
                    
                    return (
                      <button
                        key={oIdx}
                        onClick={() => !quizSubmitted && setQuizAnswers({...quizAnswers, [qIdx]: oIdx})}
                        disabled={quizSubmitted}
                        className={`w-full text-left p-3 rounded-lg border border-white/10 transition-all ${bgClass}`}
                      >
                        <div className="flex items-center gap-3">
                          {showResult ? (
                            isCorrect ? (
                              <CheckCircle className="w-5 h-5 text-green-400" weight="duotone" />
                            ) : isSelected ? (
                              <X className="w-5 h-5 text-red-400" weight="duotone" />
                            ) : (
                              <Circle className="w-5 h-5 text-white/30" weight="duotone" />
                            )
                          ) : (
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-vault-gold bg-vault-gold' : 'border-white/30'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-vault-navy" weight="duotone" />}
                            </div>
                          )}
                          <span className={showResult && isCorrect ? 'text-green-400' : 'text-white/80'}>
                            {opt}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {quizSubmitted && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 p-3 rounded-lg bg-vault-gold/10 border border-vault-gold/20"
                  >
                    <p className="text-sm text-white/70">
                      <span className="text-vault-gold font-medium">Explanation: </span>
                      {q.explanation}
                    </p>
                  </motion.div>
                )}
              </GlassCard>
            ))}
          </div>

          <div className="flex justify-center gap-4 mt-8">
            {!quizSubmitted ? (
              <Button
                onClick={submitQuiz}
                disabled={Object.keys(quizAnswers).length < quiz.length}
                className="btn-primary"
              >
                Submit Answers
              </Button>
            ) : (
              <>
                <Button onClick={resetQuiz} variant="outline" className="btn-secondary">
                  <ArrowCounterClockwise className="w-4 h-4 mr-2" weight="duotone" /> Try Again
                </Button>
                <Button onClick={() => { setShowQuiz(false); resetQuiz(); }} className="btn-primary">
                  Continue Learning
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 min-w-0 max-w-full">
      <PageHeader
        icon={BookOpen}
        title="Learn"
        subtitle="Cultivate your equity mindset with guided, real-world lessons."
        subtitleAction={<PageHelpTooltip pageKey="learn" />}
      />

      {!selectedModule ? (
        // Module SquaresFour
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {learningModules.map((module, idx) => {
            const moduleProgress = getModuleProgress(module.id);
            
            return (
              <motion.div key={module.id} variants={fadeInUp}>
                <GlassCard
                  interactive
                  glow
                  onClick={() => setSelectedModule(module)}
                  className="h-full group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <IconBadge icon={module.icon} size="lg" variant="gold" />
                    {moduleProgress > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-vault-gold">{moduleProgress}%</span>
                        {moduleProgress === 100 && (
                          <Trophy className="w-4 h-4 text-vault-gold" weight="duotone" />
                        )}
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-heading text-white mb-2">{module.title}</h3>
                  <ExpandableText 
                    text={module.description}
                    previewLines={2}
                    className="mb-4"
                  />
                  
                  {moduleProgress > 0 && (
                    <div className="mb-4">
                      <Progress value={moduleProgress} className="h-1" />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/40">{module.lessons.length} lessons</span>
                    <span className="text-vault-gold">{module.duration}</span>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
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
            <IconBadge icon={selectedModule.icon} size="xl" variant="gold" />
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-heading text-white">{selectedModule.title}</h2>
              <p className="text-white/50">{selectedModule.description}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-heading text-vault-gold">
                {getModuleProgress(selectedModule.id)}%
              </div>
              <p className="text-white/40 text-sm">Complete</p>
            </div>
          </div>

          <Progress value={getModuleProgress(selectedModule.id)} className="h-2 mb-8" />

          <div className="space-y-3">
            {selectedModule.lessons.map((lesson, idx) => {
              const isComplete = isLessonComplete(selectedModule.id, lesson.id);
              const hasQuiz = !!lessonQuizzes[lesson.id];
              const quizScore = progress[selectedModule.id]?.[lesson.id]?.quiz_score;
              
              return (
                <GlassCard
                  key={lesson.id}
                  interactive
                  onClick={() => setSelectedLesson(lesson)}
                  className="flex items-center gap-4 group"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isComplete 
                      ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30' 
                      : 'bg-gradient-to-br from-vault-gold/20 to-vault-gold/5 border border-vault-gold/30'
                  }`}>
                    {isComplete ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" weight="duotone" />
                    ) : (
                      <span className="text-vault-gold font-mono">{idx + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium">{lesson.title}</h4>
                    <p className="text-white/40 text-sm">{lesson.keyPoints.length} key concepts</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {hasQuiz && (
                      <div className={`px-2 py-1 rounded text-xs ${
                        quizScore >= 70 ? 'bg-green-500/20 text-green-400' :
                        quizScore ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-white/5 text-white/40'
                      }`}>
                        {quizScore ? `${quizScore}%` : 'Quiz'}
                      </div>
                    )}
                    <CaretRight className="w-5 h-5 text-white/30" weight="duotone" />
                  </div>
                </GlassCard>
              );
            })}
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

          <div className="max-w-4xl">
            <GlassCard>
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-3xl font-heading text-white">{selectedLesson.title}</h2>
                {isLessonComplete(selectedModule.id, selectedLesson.id) && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full">
                    <CheckCircle className="w-4 h-4 text-green-400" weight="duotone" />
                    <span className="text-green-400 text-sm">Completed</span>
                  </div>
                )}
              </div>
              
              <div className="prose prose-invert max-w-none">
                {selectedLesson.content.split('\n\n').map((para, idx) => (
                  <p key={idx} className="text-white/70 leading-relaxed mb-4 whitespace-pre-line">
                    {parseBoldText(para)}
                  </p>
                ))}
              </div>

              {/* Key Takeaways */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <h4 className="text-vault-gold uppercase tracking-wider text-sm mb-4">Key Takeaways</h4>
                <ul className="space-y-2">
                  {selectedLesson.keyPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-white/60">
                      <CheckCircle className="w-5 h-5 text-vault-gold flex-shrink-0 mt-0.5" weight="duotone" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Checklist */}
              {selectedLesson.checklist && (
                <div className="mt-8 pt-6 border-t border-white/10">
                  <h4 className="text-vault-gold uppercase tracking-wider text-sm mb-4">Learning Checklist</h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    {selectedLesson.checklist.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-white/50 text-sm">
                        <div className="w-4 h-4 rounded border border-white/20" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-4">
                {!isLessonComplete(selectedModule.id, selectedLesson.id) && (
                  <Button
                    onClick={() => markComplete(selectedModule.id, selectedLesson.id)}
                    className="btn-primary"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" weight="duotone" />
                    Mark Complete
                  </Button>
                )}
                {lessonQuizzes[selectedLesson.id] && (
                  <Button
                    onClick={() => setShowQuiz(true)}
                    variant="outline"
                    className="btn-secondary"
                  >
                    <Brain className="w-4 h-4 mr-2" weight="duotone" />
                    Take Quiz
                  </Button>
                )}
              </div>
            </GlassCard>

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              {selectedModule.lessons.indexOf(selectedLesson) > 0 && (
                <Button
                  onClick={() => {
                    const idx = selectedModule.lessons.indexOf(selectedLesson);
                    setSelectedLesson(selectedModule.lessons[idx - 1]);
                  }}
                  variant="ghost"
                  className="text-white/60 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" weight="duotone" />
                  Previous Lesson
                </Button>
              )}
              <div className="flex-1 min-w-0" />
              {selectedModule.lessons.indexOf(selectedLesson) < selectedModule.lessons.length - 1 && (
                <Button
                  onClick={() => {
                    const idx = selectedModule.lessons.indexOf(selectedLesson);
                    setSelectedLesson(selectedModule.lessons[idx + 1]);
                  }}
                  variant="ghost"
                  className="text-white/60 hover:text-white"
                >
                  Next Lesson
                  <ArrowRight className="w-4 h-4 ml-2" weight="duotone" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
