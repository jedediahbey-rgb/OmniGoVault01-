import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  ArrowRight,
  Calculator,
  CaretDown,
  CaretRight,
  ChartLine,
  Check,
  Clock,
  CurrencyDollar,
  FileText,
  Gavel,
  HandCoins,
  Info,
  Lightning,
  ListBullets,
  Play,
  Plus,
  Question,
  Scales,
  ShieldCheck,
  Sparkle,
  Timer,
  Trash,
  Users,
  Warning,
  X,
} from '@phosphor-icons/react';
import PageHeader from '../components/shared/PageHeader';
import PageHelpTooltip from '../components/shared/PageHelpTooltip';
import GlassCard from '../components/shared/GlassCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { toast } from 'sonner';
import { staggerContainer, fadeInUp } from '../lib/motion';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Pre-built scenario templates
const scenarioTemplates = [
  {
    id: 'sibling-dispute',
    title: 'Sibling Dispute Resolution',
    description: 'Model resolution outcomes when beneficiaries disagree on asset distribution',
    icon: Gavel,
    color: 'red',
    category: 'dispute',
    variables: [
      { name: 'totalEstate', label: 'Total Estate Value', type: 'currency', default: 1000000 },
      { name: 'numBeneficiaries', label: 'Number of Beneficiaries', type: 'number', default: 3 },
      { name: 'disputedAmount', label: 'Disputed Amount', type: 'currency', default: 200000 },
      { name: 'mediationCost', label: 'Mediation Cost', type: 'currency', default: 15000 },
    ],
    outcomes: ['equal-split', 'proportional', 'mediated', 'litigation'],
  },
  {
    id: 'trustee-compensation',
    title: 'Trustee Compensation Planning',
    description: 'Calculate fair compensation based on trust assets and time investment',
    icon: Users,
    color: 'blue',
    category: 'compensation',
    variables: [
      { name: 'trustAssets', label: 'Trust Assets Under Management', type: 'currency', default: 2000000 },
      { name: 'hoursPerMonth', label: 'Hours Per Month', type: 'number', default: 10 },
      { name: 'hourlyRate', label: 'Hourly Rate', type: 'currency', default: 150 },
      { name: 'percentageFee', label: 'Annual Percentage Fee (%)', type: 'percentage', default: 1 },
    ],
    outcomes: ['hourly', 'percentage', 'hybrid', 'statutory'],
  },
  {
    id: 'insurance-proceeds',
    title: 'Insurance Proceeds Distribution',
    description: 'Model how life insurance payouts flow through the trust',
    icon: ShieldCheck,
    color: 'green',
    category: 'distribution',
    variables: [
      { name: 'deathBenefit', label: 'Death Benefit Amount', type: 'currency', default: 500000 },
      { name: 'existingAssets', label: 'Existing Trust Assets', type: 'currency', default: 300000 },
      { name: 'numBeneficiaries', label: 'Number of Beneficiaries', type: 'number', default: 2 },
      { name: 'immediateNeeds', label: 'Immediate Expenses', type: 'currency', default: 50000 },
    ],
    outcomes: ['immediate-distribution', 'staggered', 'income-only', 'accumulate'],
  },
  {
    id: 'distribution-timing',
    title: 'Distribution Timing Analysis',
    description: 'Compare immediate vs. staggered distribution strategies',
    icon: Timer,
    color: 'amber',
    category: 'distribution',
    variables: [
      { name: 'principalAmount', label: 'Principal Amount', type: 'currency', default: 750000 },
      { name: 'expectedReturn', label: 'Expected Annual Return (%)', type: 'percentage', default: 6 },
      { name: 'distributionYears', label: 'Distribution Period (Years)', type: 'number', default: 10 },
      { name: 'inflationRate', label: 'Inflation Rate (%)', type: 'percentage', default: 3 },
    ],
    outcomes: ['lump-sum', 'annual-equal', 'graduated', 'income-preserve'],
  },
  {
    id: 'successor-trustee',
    title: 'Successor Trustee Planning',
    description: 'Evaluate trustee succession scenarios and transitions',
    icon: Users,
    color: 'purple',
    category: 'succession',
    variables: [
      { name: 'currentAge', label: 'Current Trustee Age', type: 'number', default: 65 },
      { name: 'transitionPeriod', label: 'Transition Period (Months)', type: 'number', default: 6 },
      { name: 'trainingCost', label: 'Training/Transition Cost', type: 'currency', default: 5000 },
      { name: 'trustComplexity', label: 'Trust Complexity (1-10)', type: 'number', default: 5 },
    ],
    outcomes: ['family-successor', 'professional', 'corporate', 'co-trustees'],
  },
  {
    id: 'tax-optimization',
    title: 'Distribution Tax Optimization',
    description: 'Model tax implications of different distribution strategies',
    icon: Calculator,
    color: 'cyan',
    category: 'tax',
    variables: [
      { name: 'distributionAmount', label: 'Annual Distribution', type: 'currency', default: 100000 },
      { name: 'beneficiaryIncome', label: 'Beneficiary Other Income', type: 'currency', default: 50000 },
      { name: 'trustIncome', label: 'Trust Income', type: 'currency', default: 80000 },
      { name: 'capitalGains', label: 'Capital Gains', type: 'currency', default: 30000 },
    ],
    outcomes: ['maximize-dni', 'minimize-beneficiary', 'split-strategy', 'defer'],
  },
];

const outcomeDetails = {
  // Sibling Dispute
  'equal-split': { label: 'Equal Split', description: 'Divide equally regardless of claims', risk: 'low', time: 'fast' },
  'proportional': { label: 'Proportional to Claims', description: 'Distribute based on documented contributions', risk: 'medium', time: 'medium' },
  'mediated': { label: 'Mediated Settlement', description: 'Professional mediator facilitates agreement', risk: 'low', time: 'medium' },
  'litigation': { label: 'Court Litigation', description: 'Let the court decide distribution', risk: 'high', time: 'slow' },
  
  // Compensation
  'hourly': { label: 'Hourly Rate', description: 'Pay based on documented time', risk: 'low', time: 'ongoing' },
  'percentage': { label: 'Percentage of Assets', description: 'Annual fee based on AUM', risk: 'low', time: 'annual' },
  'hybrid': { label: 'Hybrid Model', description: 'Base fee plus hourly for extra work', risk: 'low', time: 'ongoing' },
  'statutory': { label: 'Statutory Rate', description: 'Follow state-mandated rates', risk: 'low', time: 'annual' },
  
  // Distribution
  'immediate-distribution': { label: 'Immediate Distribution', description: 'Distribute all at once', risk: 'medium', time: 'immediate' },
  'staggered': { label: 'Staggered Payments', description: 'Distribute over time periods', risk: 'low', time: 'years' },
  'income-only': { label: 'Income Only', description: 'Distribute income, preserve principal', risk: 'low', time: 'ongoing' },
  'accumulate': { label: 'Accumulate & Grow', description: 'Reinvest for future growth', risk: 'medium', time: 'long-term' },
  
  // Timing
  'lump-sum': { label: 'Lump Sum', description: 'Single distribution of entire amount', risk: 'high', time: 'immediate' },
  'annual-equal': { label: 'Equal Annual Payments', description: 'Same amount each year', risk: 'low', time: 'years' },
  'graduated': { label: 'Graduated Payments', description: 'Increasing amounts over time', risk: 'low', time: 'years' },
  'income-preserve': { label: 'Income Preservation', description: 'Distribute income only', risk: 'low', time: 'perpetual' },
  
  // Successor
  'family-successor': { label: 'Family Member', description: 'Transition to family successor', risk: 'medium', time: 'months' },
  'professional': { label: 'Professional Trustee', description: 'Hire licensed fiduciary', risk: 'low', time: 'weeks' },
  'corporate': { label: 'Corporate Trustee', description: 'Bank or trust company', risk: 'low', time: 'weeks' },
  'co-trustees': { label: 'Co-Trustees', description: 'Share duties with multiple trustees', risk: 'medium', time: 'months' },
  
  // Tax
  'maximize-dni': { label: 'Maximize DNI', description: 'Distribute all income to beneficiaries', risk: 'low', time: 'annual' },
  'minimize-beneficiary': { label: 'Minimize Beneficiary Tax', description: 'Time distributions strategically', risk: 'low', time: 'annual' },
  'split-strategy': { label: 'Split Strategy', description: 'Divide between trust and beneficiary', risk: 'low', time: 'annual' },
  'defer': { label: 'Defer Distributions', description: 'Accumulate and defer taxes', risk: 'medium', time: 'years' },
};

const colorClasses = {
  red: 'text-red-400 bg-red-500/20 border-red-500/30',
  blue: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  green: 'text-green-400 bg-green-500/20 border-green-500/30',
  amber: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
  purple: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
  cyan: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30',
};

export default function ScenariosPage() {
  const [activeTab, setActiveTab] = useState('explore');
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [variables, setVariables] = useState({});
  const [results, setResults] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState(() => {
    // Initialize from localStorage
    const saved = localStorage.getItem('omnigovault_scenarios');
    return saved ? JSON.parse(saved) : [];
  });

  // Ref for scrolling to top
  const pageTopRef = useRef(null);

  // Scroll to top when scenario changes
  useEffect(() => {
    if (selectedScenario !== null || selectedScenario === null) {
      // Use multiple scroll methods for maximum compatibility
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // Also try scrollIntoView on the ref
      if (pageTopRef.current) {
        pageTopRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }
  }, [selectedScenario]);

  const selectScenario = (scenario) => {
    setSelectedScenario(scenario);
    const defaults = {};
    scenario.variables.forEach(v => {
      defaults[v.name] = v.default;
    });
    setVariables(defaults);
    setResults(null);
  };

  const updateVariable = (name, value) => {
    setVariables(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const calculateResults = () => {
    if (!selectedScenario) return;
    
    setCalculating(true);
    
    // Simulate calculation delay
    setTimeout(() => {
      const outcomeResults = selectedScenario.outcomes.map(outcomeId => {
        const outcome = outcomeDetails[outcomeId];
        let projectedValue = 0;
        let recommendation = '';
        let score = 0;
        
        // Calculate based on scenario type
        switch (selectedScenario.id) {
          case 'sibling-dispute':
            const perBeneficiary = variables.totalEstate / variables.numBeneficiaries;
            if (outcomeId === 'equal-split') {
              projectedValue = perBeneficiary;
              recommendation = 'Fastest resolution, may not satisfy all parties';
              score = 70;
            } else if (outcomeId === 'mediated') {
              projectedValue = perBeneficiary - (variables.mediationCost / variables.numBeneficiaries);
              recommendation = 'Balanced approach with professional guidance';
              score = 85;
            } else if (outcomeId === 'litigation') {
              projectedValue = perBeneficiary * 0.7; // 30% to legal fees
              recommendation = 'Most expensive and time-consuming option';
              score = 40;
            } else {
              projectedValue = variables.disputedAmount / variables.numBeneficiaries + (variables.totalEstate - variables.disputedAmount) / variables.numBeneficiaries;
              recommendation = 'Based on documented claims';
              score = 75;
            }
            break;
            
          case 'trustee-compensation':
            const annualHours = variables.hoursPerMonth * 12;
            if (outcomeId === 'hourly') {
              projectedValue = annualHours * variables.hourlyRate;
              recommendation = 'Fair for variable workloads';
              score = 80;
            } else if (outcomeId === 'percentage') {
              projectedValue = variables.trustAssets * (variables.percentageFee / 100);
              recommendation = 'Scales with trust growth';
              score = 75;
            } else if (outcomeId === 'hybrid') {
              projectedValue = (variables.trustAssets * 0.005) + (annualHours * variables.hourlyRate * 0.5);
              recommendation = 'Best of both models';
              score = 90;
            } else {
              projectedValue = variables.trustAssets * 0.01; // Assume 1% statutory
              recommendation = 'Follows state guidelines';
              score = 70;
            }
            break;
            
          case 'insurance-proceeds':
            const totalPool = variables.deathBenefit + variables.existingAssets - variables.immediateNeeds;
            if (outcomeId === 'immediate-distribution') {
              projectedValue = totalPool / variables.numBeneficiaries;
              recommendation = 'Quick but no growth potential';
              score = 65;
            } else if (outcomeId === 'staggered') {
              projectedValue = (totalPool * 1.15) / variables.numBeneficiaries; // Assume 15% growth over stagger period
              recommendation = 'Allows for growth and planning';
              score = 85;
            } else if (outcomeId === 'income-only') {
              projectedValue = totalPool * 0.04 / variables.numBeneficiaries; // 4% annual income
              recommendation = 'Preserves principal for generations';
              score = 80;
            } else {
              projectedValue = (totalPool * 1.3) / variables.numBeneficiaries; // Assume 30% growth
              recommendation = 'Maximum growth, delayed benefit';
              score = 70;
            }
            break;
            
          case 'distribution-timing':
            const growthRate = variables.expectedReturn / 100;
            const inflation = variables.inflationRate / 100;
            const realReturn = growthRate - inflation;
            if (outcomeId === 'lump-sum') {
              projectedValue = variables.principalAmount;
              recommendation = 'Full amount immediately, no growth';
              score = 50;
            } else if (outcomeId === 'annual-equal') {
              projectedValue = variables.principalAmount * (1 + realReturn * variables.distributionYears / 2) / variables.distributionYears;
              recommendation = 'Predictable payments';
              score = 75;
            } else if (outcomeId === 'graduated') {
              projectedValue = variables.principalAmount * (1 + realReturn * variables.distributionYears * 0.7);
              recommendation = 'Payments grow with inflation';
              score = 85;
            } else {
              projectedValue = variables.principalAmount * realReturn;
              recommendation = 'Principal preserved indefinitely';
              score = 80;
            }
            break;
            
          default:
            projectedValue = Object.values(variables).reduce((a, b) => a + b, 0) / selectedScenario.outcomes.length;
            recommendation = 'Standard calculation';
            score = 75;
        }
        
        return {
          id: outcomeId,
          ...outcome,
          projectedValue,
          recommendation,
          score,
        };
      });
      
      // Sort by score
      outcomeResults.sort((a, b) => b.score - a.score);
      
      setResults({
        timestamp: new Date().toISOString(),
        scenario: selectedScenario.id,
        variables: { ...variables },
        outcomes: outcomeResults,
        bestOption: outcomeResults[0],
      });
      
      setCalculating(false);
    }, 800);
  };

  const saveScenario = () => {
    if (!results) return;
    
    const saved = {
      id: `scenario_${Date.now()}`,
      name: `${selectedScenario.title} - ${new Date().toLocaleDateString()}`,
      ...results,
    };
    
    const updated = [saved, ...savedScenarios].slice(0, 10); // Keep last 10
    setSavedScenarios(updated);
    localStorage.setItem('omnigovault_scenarios', JSON.stringify(updated));
    toast.success('Scenario saved');
  };

  const deleteScenario = (id) => {
    const updated = savedScenarios.filter(s => s.id !== id);
    setSavedScenarios(updated);
    localStorage.setItem('omnigovault_scenarios', JSON.stringify(updated));
    toast.success('Scenario deleted');
  };

  const renderVariableInput = (variable) => {
    const value = variables[variable.name] || 0;
    
    if (variable.type === 'currency') {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-white/70">{variable.label}</label>
            <span className="text-vault-gold font-mono">{formatCurrency(value)}</span>
          </div>
          <Input
            type="number"
            value={value}
            onChange={(e) => updateVariable(variable.name, e.target.value)}
            className="bg-vault-dark border-vault-gold/30"
          />
        </div>
      );
    }
    
    if (variable.type === 'percentage') {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-white/70">{variable.label}</label>
            <span className="text-vault-gold font-mono">{value}%</span>
          </div>
          <Slider
            value={[value]}
            onValueChange={([v]) => updateVariable(variable.name, v)}
            min={0}
            max={20}
            step={0.5}
            className="[&_[role=slider]]:bg-vault-gold"
          />
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-white/70">{variable.label}</label>
          <span className="text-vault-gold font-mono">{value}</span>
        </div>
        <Input
          type="number"
          value={value}
          onChange={(e) => updateVariable(variable.name, e.target.value)}
          className="bg-vault-dark border-vault-gold/30"
        />
      </div>
    );
  };

  return (
    <motion.div
      ref={pageTopRef}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="p-4 sm:p-6 lg:p-8"
    >
      <PageHeader
        icon={ChartLine}
        title="Scenario Planning"
        subtitle="Model trust decisions and compare outcomes with what-if analysis"
        subtitleAction={<PageHelpTooltip pageKey="scenarios" />}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-vault-dark/50 border border-vault-gold/20">
          <TabsTrigger value="explore" className="data-[state=active]:bg-vault-gold data-[state=active]:text-vault-dark">
            <Sparkle className="w-4 h-4 mr-2" />
            Explore Scenarios
          </TabsTrigger>
          <TabsTrigger value="saved" className="data-[state=active]:bg-vault-gold data-[state=active]:text-vault-dark">
            <FileText className="w-4 h-4 mr-2" />
            Saved ({savedScenarios.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="explore" className="space-y-6">
          {!selectedScenario ? (
            // Scenario Selection Grid
            <motion.div 
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
              initial="initial"
              animate="animate"
              variants={staggerContainer}
            >
              {scenarioTemplates.map((scenario, index) => {
                const Icon = scenario.icon;
                return (
                  <motion.div 
                    key={scenario.id} 
                    variants={fadeInUp}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: index * 0.05 }}
                  >
                    <GlassCard
                      interactive
                      glow
                      onClick={() => selectScenario(scenario)}
                      className="h-full"
                    >
                      <div className={`w-12 h-12 rounded-xl ${colorClasses[scenario.color]} flex items-center justify-center mb-4`}>
                        <Icon className="w-6 h-6" weight="duotone" />
                      </div>
                      <h3 className="text-lg font-heading text-white mb-2">{scenario.title}</h3>
                      <p className="text-white/50 text-sm mb-4">{scenario.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-white/40 border-white/20">
                          {scenario.category}
                        </Badge>
                        <div className="flex items-center text-vault-gold text-sm">
                          <span>Run Scenario</span>
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            // Scenario Calculator
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Input Panel */}
              <GlassCard>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setSelectedScenario(null);
                        setResults(null);
                      }}
                      className="text-vault-gold hover:underline text-sm"
                    >
                      ← Back
                    </button>
                    <div className={`w-10 h-10 rounded-lg ${colorClasses[selectedScenario.color]} flex items-center justify-center`}>
                      <selectedScenario.icon className="w-5 h-5" weight="duotone" />
                    </div>
                    <div>
                      <h2 className="text-xl font-heading text-white">{selectedScenario.title}</h2>
                      <p className="text-white/50 text-sm">{selectedScenario.description}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">Variables</h3>
                  {selectedScenario.variables.map((variable) => (
                    <div key={variable.name}>
                      {renderVariableInput(variable)}
                    </div>
                  ))}

                  <Button
                    onClick={calculateResults}
                    disabled={calculating}
                    className="w-full bg-vault-gold text-vault-dark hover:bg-vault-gold/90"
                  >
                    {calculating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-vault-dark border-t-transparent rounded-full animate-spin mr-2" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" weight="fill" />
                        Run Scenario Analysis
                      </>
                    )}
                  </Button>
                </div>
              </GlassCard>

              {/* Results Panel */}
              <GlassCard>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-heading text-white">Analysis Results</h3>
                  {results && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={saveScenario}
                      className="border-vault-gold/30 text-vault-gold hover:bg-vault-gold/10"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  )}
                </div>

                {!results ? (
                  <div className="text-center py-12">
                    <Calculator className="w-16 h-16 mx-auto text-vault-gold/30 mb-4" />
                    <p className="text-white/50">Configure variables and run analysis to see results</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Best Option */}
                    <div className="p-4 rounded-lg bg-vault-gold/10 border border-vault-gold/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkle className="w-5 h-5 text-vault-gold" weight="fill" />
                        <span className="text-vault-gold font-medium">Recommended Option</span>
                      </div>
                      <h4 className="text-white text-lg font-heading">{results.bestOption.label}</h4>
                      <p className="text-white/60 text-sm mt-1">{results.bestOption.recommendation}</p>
                      <div className="mt-3 flex items-center gap-4">
                        <div>
                          <div className="text-xs text-white/40">Projected Value</div>
                          <div className="text-vault-gold font-mono text-lg">
                            {formatCurrency(results.bestOption.projectedValue)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-white/40">Score</div>
                          <div className="text-green-400 font-mono text-lg">
                            {results.bestOption.score}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* All Outcomes */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-white/70 uppercase tracking-wider">All Options</h4>
                      {results.outcomes.map((outcome, idx) => (
                        <div
                          key={outcome.id}
                          className={`p-3 rounded-lg border ${
                            idx === 0
                              ? 'bg-vault-gold/5 border-vault-gold/30'
                              : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {idx === 0 && <Check className="w-4 h-4 text-vault-gold" weight="bold" />}
                              <span className={idx === 0 ? 'text-white font-medium' : 'text-white/80'}>
                                {outcome.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-vault-gold font-mono text-sm">
                                {formatCurrency(outcome.projectedValue)}
                              </span>
                              <Badge
                                variant="outline"
                                className={
                                  outcome.score >= 80
                                    ? 'text-green-400 border-green-500/30'
                                    : outcome.score >= 60
                                    ? 'text-amber-400 border-amber-500/30'
                                    : 'text-red-400 border-red-500/30'
                                }
                              >
                                {outcome.score}%
                              </Badge>
                            </div>
                          </div>
                          <p className="text-white/50 text-xs mt-1">{outcome.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span className="text-white/40">
                              Risk: <span className={
                                outcome.risk === 'low' ? 'text-green-400' :
                                outcome.risk === 'medium' ? 'text-amber-400' : 'text-red-400'
                              }>{outcome.risk}</span>
                            </span>
                            <span className="text-white/40">
                              Timeline: <span className="text-blue-400">{outcome.time}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-4">
          {savedScenarios.length === 0 ? (
            <GlassCard className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-vault-gold/30 mb-4" />
              <h3 className="text-lg font-heading text-white mb-2">No Saved Scenarios</h3>
              <p className="text-white/50 text-sm mb-4">Run a scenario analysis and save it for future reference</p>
              <Button
                onClick={() => setActiveTab('explore')}
                className="bg-vault-gold text-vault-dark"
              >
                <Plus className="w-4 h-4 mr-2" />
                Explore Scenarios
              </Button>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {savedScenarios.map((saved) => {
                const template = scenarioTemplates.find(s => s.id === saved.scenario);
                const Icon = template?.icon || FileText;
                
                return (
                  <GlassCard key={saved.id}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg ${colorClasses[template?.color || 'blue']} flex items-center justify-center`}>
                          <Icon className="w-6 h-6" weight="duotone" />
                        </div>
                        <div>
                          <h3 className="text-white font-medium">{saved.name}</h3>
                          <p className="text-white/50 text-sm">
                            {new Date(saved.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteScenario(saved.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {saved.bestOption && (
                        <div className="p-3 bg-vault-gold/10 rounded-lg">
                          <div className="text-xs text-vault-gold/70">Best Option</div>
                          <div className="text-white font-medium">{saved.bestOption.label}</div>
                        </div>
                      )}
                      {saved.bestOption && (
                        <div className="p-3 bg-white/5 rounded-lg">
                          <div className="text-xs text-white/50">Projected Value</div>
                          <div className="text-vault-gold font-mono">{formatCurrency(saved.bestOption.projectedValue)}</div>
                        </div>
                      )}
                      {saved.bestOption && (
                        <div className="p-3 bg-white/5 rounded-lg">
                          <div className="text-xs text-white/50">Score</div>
                          <div className="text-green-400 font-mono">{saved.bestOption.score}%</div>
                        </div>
                      )}
                      <div className="p-3 bg-white/5 rounded-lg">
                        <div className="text-xs text-white/50">Options Analyzed</div>
                        <div className="text-white font-mono">{saved.outcomes?.length || 0}</div>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Info Section */}
      <motion.div variants={fadeInUp} className="mt-8">
        <GlassCard>
          <h3 className="font-heading text-lg text-white mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-vault-gold" weight="duotone" />
            About Scenario Planning
          </h3>
          <p className="text-white/60 text-sm mb-4">
            Use these tools to model different trust management decisions before implementing them. 
            Each scenario compares multiple approaches and recommends the best option based on your specific variables.
          </p>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-vault-gold mb-1 flex items-center gap-2">
                <Calculator className="w-4 h-4" /> Calculations
              </div>
              <div className="text-white/40">Based on financial modeling best practices</div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-vault-gold mb-1 flex items-center gap-2">
                <Warning className="w-4 h-4" /> Disclaimer
              </div>
              <div className="text-white/40">For planning purposes only, not financial advice</div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-vault-gold mb-1 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Save & Compare
              </div>
              <div className="text-white/40">Store scenarios for future reference</div>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
