import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  ArrowRight,
  FileText,
  GitBranch,
  Info,
  Users,
  X
} from '@phosphor-icons/react';
import PageHeader from '../components/shared/PageHeader';
import PageHelpTooltip from '../components/shared/PageHelpTooltip';
import GlassCard from '../components/shared/GlassCard';
import IconBadge from '../components/shared/IconBadge';
import { Button } from '../components/ui/button';

// Custom styles to hide React Flow attribution
const reactFlowStyles = `
  .react-flow__attribution {
    display: none !important;
  }
  .react-flow__controls {
    right: 8px !important;
    bottom: 8px !important;
    left: auto !important;
  }
  @media (max-width: 640px) {
    .react-flow__minimap {
      display: none !important;
    }
    .react-flow__controls {
      right: 6px !important;
      bottom: 6px !important;
    }
    .react-flow__controls button {
      width: 24px !important;
      height: 24px !important;
    }
  }
`;

// Helper function to parse **bold** markdown to JSX
const parseBoldText = (text) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

// Custom node styles
const nodeStyle = {
  padding: '16px 24px',
  borderRadius: '12px',
  fontSize: '14px',
  fontWeight: 500,
  border: '2px solid',
  minWidth: '150px',
  textAlign: 'center',
};

const partyNodeStyle = {
  ...nodeStyle,
  background: 'linear-gradient(135deg, rgba(198, 168, 124, 0.2) 0%, rgba(198, 168, 124, 0.1) 100%)',
  borderColor: 'rgba(198, 168, 124, 0.5)',
  color: '#C6A87C',
};

const trustNodeStyle = {
  ...nodeStyle,
  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
  borderColor: 'rgba(59, 130, 246, 0.5)',
  color: '#3B82F6',
};

const propertyNodeStyle = {
  ...nodeStyle,
  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)',
  borderColor: 'rgba(34, 197, 94, 0.5)',
  color: '#22C55E',
};

const conceptNodeStyle = {
  ...nodeStyle,
  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.1) 100%)',
  borderColor: 'rgba(168, 85, 247, 0.5)',
  color: '#A855F7',
};

// Trust Relationship Diagram
const trustRelationshipNodes = [
  {
    id: 'settlor',
    type: 'default',
    data: { label: '👤 SETTLOR\n(Grantor/Trustor)' },
    position: { x: 50, y: 150 },
    style: partyNodeStyle,
  },
  {
    id: 'trust',
    type: 'default',
    data: { label: '📜 TRUST\n(Legal Entity)' },
    position: { x: 300, y: 150 },
    style: trustNodeStyle,
  },
  {
    id: 'trustee',
    type: 'default',
    data: { label: '🛡️ TRUSTEE\n(Legal Title Holder)' },
    position: { x: 550, y: 50 },
    style: partyNodeStyle,
  },
  {
    id: 'beneficiary',
    type: 'default',
    data: { label: '⭐ BENEFICIARY\n(Equitable Title)' },
    position: { x: 550, y: 250 },
    style: partyNodeStyle,
  },
  {
    id: 'property',
    type: 'default',
    data: { label: '🏠 TRUST PROPERTY\n(Res/Corpus)' },
    position: { x: 300, y: 350 },
    style: propertyNodeStyle,
  },
];

const trustRelationshipEdges = [
  {
    id: 'e1',
    source: 'settlor',
    target: 'trust',
    label: 'Creates & Funds',
    animated: true,
    style: { stroke: '#C6A87C' },
    labelStyle: { fill: '#C6A87C', fontSize: 12, fontWeight: 600 },
    labelBgStyle: { fill: '#0F172A', fillOpacity: 0.95 },
    labelBgPadding: [8, 4],
    labelBgBorderRadius: 4,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#C6A87C' },
  },
  {
    id: 'e2',
    source: 'trust',
    target: 'trustee',
    label: 'Legal Title',
    style: { stroke: '#3B82F6' },
    labelStyle: { fill: '#3B82F6', fontSize: 12, fontWeight: 600 },
    labelBgStyle: { fill: '#0F172A', fillOpacity: 0.95 },
    labelBgPadding: [8, 4],
    labelBgBorderRadius: 4,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3B82F6' },
  },
  {
    id: 'e3',
    source: 'trust',
    target: 'beneficiary',
    label: 'Equitable Title',
    style: { stroke: '#C6A87C' },
    labelStyle: { fill: '#C6A87C', fontSize: 12, fontWeight: 600 },
    labelBgStyle: { fill: '#0F172A', fillOpacity: 0.95 },
    labelBgPadding: [8, 4],
    labelBgBorderRadius: 4,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#C6A87C' },
  },
  {
    id: 'e4',
    source: 'trustee',
    target: 'beneficiary',
    label: 'Fiduciary Duty',
    style: { stroke: '#A855F7', strokeDasharray: '5,5' },
    labelStyle: { fill: '#A855F7', fontSize: 12, fontWeight: 600 },
    labelBgStyle: { fill: '#0F172A', fillOpacity: 0.95 },
    labelBgPadding: [8, 4],
    labelBgBorderRadius: 4,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#A855F7' },
  },
  {
    id: 'e5',
    source: 'property',
    target: 'trust',
    label: 'Held by',
    style: { stroke: '#22C55E' },
    labelStyle: { fill: '#22C55E', fontSize: 12, fontWeight: 600 },
    labelBgStyle: { fill: '#0F172A', fillOpacity: 0.95 },
    labelBgPadding: [8, 4],
    labelBgBorderRadius: 4,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#22C55E' },
  },
];

// Equity vs Law Diagram
const equityLawNodes = [
  {
    id: 'common-law',
    type: 'default',
    data: { label: '⚖️ COMMON LAW\n(Courts of Law)' },
    position: { x: 100, y: 100 },
    style: { ...nodeStyle, background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.5)', color: '#EF4444', minWidth: '180px' },
  },
  {
    id: 'equity',
    type: 'default',
    data: { label: '💫 EQUITY\n(Court of Chancery)' },
    position: { x: 450, y: 100 },
    style: { ...nodeStyle, background: 'rgba(198, 168, 124, 0.1)', borderColor: 'rgba(198, 168, 124, 0.5)', color: '#C6A87C', minWidth: '180px' },
  },
  {
    id: 'damages',
    type: 'default',
    data: { label: '💰 Monetary Damages' },
    position: { x: 50, y: 250 },
    style: { ...nodeStyle, background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#EF4444' },
  },
  {
    id: 'specific-perf',
    type: 'default',
    data: { label: '📝 Specific Performance' },
    position: { x: 400, y: 250 },
    style: { ...nodeStyle, background: 'rgba(198, 168, 124, 0.05)', borderColor: 'rgba(198, 168, 124, 0.3)', color: '#C6A87C' },
  },
  {
    id: 'injunction',
    type: 'default',
    data: { label: '🛑 Injunctions' },
    position: { x: 550, y: 250 },
    style: { ...nodeStyle, background: 'rgba(198, 168, 124, 0.05)', borderColor: 'rgba(198, 168, 124, 0.3)', color: '#C6A87C' },
  },
  {
    id: 'in-rem',
    type: 'default',
    data: { label: '🏛️ In Rem\n(Against Property)' },
    position: { x: 50, y: 350 },
    style: { ...nodeStyle, background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#EF4444' },
  },
  {
    id: 'in-personam',
    type: 'default',
    data: { label: '👤 In Personam\n(Against Person)' },
    position: { x: 450, y: 350 },
    style: { ...nodeStyle, background: 'rgba(198, 168, 124, 0.05)', borderColor: 'rgba(198, 168, 124, 0.3)', color: '#C6A87C' },
  },
];

const equityLawEdges = [
  {
    id: 'el1',
    source: 'common-law',
    target: 'damages',
    style: { stroke: '#EF4444' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#EF4444' },
  },
  {
    id: 'el2',
    source: 'common-law',
    target: 'in-rem',
    style: { stroke: '#EF4444' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#EF4444' },
  },
  {
    id: 'el3',
    source: 'equity',
    target: 'specific-perf',
    style: { stroke: '#C6A87C' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#C6A87C' },
  },
  {
    id: 'el4',
    source: 'equity',
    target: 'injunction',
    style: { stroke: '#C6A87C' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#C6A87C' },
  },
  {
    id: 'el5',
    source: 'equity',
    target: 'in-personam',
    style: { stroke: '#C6A87C' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#C6A87C' },
  },
  {
    id: 'el6',
    source: 'common-law',
    target: 'equity',
    label: 'Supplements',
    style: { stroke: '#A855F7', strokeDasharray: '5,5' },
    labelStyle: { fill: '#A855F7', fontSize: 12, fontWeight: 600 },
    labelBgStyle: { fill: '#0F172A', fillOpacity: 0.95 },
    labelBgPadding: [8, 4],
    labelBgBorderRadius: 4,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#A855F7' },
  },
];

// Fiduciary Relationships Diagram
const fiduciaryNodes = [
  {
    id: 'fiduciary-center',
    type: 'default',
    data: { label: '🤝 FIDUCIARY\nRELATIONSHIPS' },
    position: { x: 300, y: 150 },
    style: conceptNodeStyle,
  },
  {
    id: 'trustee-ben',
    type: 'default',
    data: { label: 'Trustee ↔ Beneficiary' },
    position: { x: 100, y: 50 },
    style: partyNodeStyle,
  },
  {
    id: 'agent-principal',
    type: 'default',
    data: { label: 'Agent ↔ Principal' },
    position: { x: 500, y: 50 },
    style: partyNodeStyle,
  },
  {
    id: 'executor-estate',
    type: 'default',
    data: { label: 'Executor ↔ Estate' },
    position: { x: 100, y: 280 },
    style: partyNodeStyle,
  },
  {
    id: 'guardian-ward',
    type: 'default',
    data: { label: 'Guardian ↔ Ward' },
    position: { x: 500, y: 280 },
    style: partyNodeStyle,
  },
  {
    id: 'duty-loyalty',
    type: 'default',
    data: { label: '❤️ Duty of Loyalty' },
    position: { x: 200, y: 380 },
    style: { ...nodeStyle, background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#EF4444', fontSize: '12px' },
  },
  {
    id: 'duty-care',
    type: 'default',
    data: { label: '🛡️ Duty of Care' },
    position: { x: 350, y: 380 },
    style: { ...nodeStyle, background: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)', color: '#22C55E', fontSize: '12px' },
  },
  {
    id: 'duty-account',
    type: 'default',
    data: { label: '📊 Duty to Account' },
    position: { x: 500, y: 380 },
    style: { ...nodeStyle, background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)', color: '#3B82F6', fontSize: '12px' },
  },
];

const fiduciaryEdges = [
  { id: 'f1', source: 'fiduciary-center', target: 'trustee-ben', style: { stroke: '#C6A87C' } },
  { id: 'f2', source: 'fiduciary-center', target: 'agent-principal', style: { stroke: '#C6A87C' } },
  { id: 'f3', source: 'fiduciary-center', target: 'executor-estate', style: { stroke: '#C6A87C' } },
  { id: 'f4', source: 'fiduciary-center', target: 'guardian-ward', style: { stroke: '#C6A87C' } },
  { id: 'f5', source: 'fiduciary-center', target: 'duty-loyalty', style: { stroke: '#A855F7', strokeDasharray: '3,3' } },
  { id: 'f6', source: 'fiduciary-center', target: 'duty-care', style: { stroke: '#A855F7', strokeDasharray: '3,3' } },
  { id: 'f7', source: 'fiduciary-center', target: 'duty-account', style: { stroke: '#A855F7', strokeDasharray: '3,3' } },
];

const diagrams = [
  {
    id: 'trust-relationships',
    title: 'Trust Relationship Structure',
    description: 'Visualize the relationships between settlor, trustee, beneficiary, and trust property',
    icon: Users,
    nodes: trustRelationshipNodes,
    edges: trustRelationshipEdges,
    info: `This diagram illustrates the core relationships in a trust arrangement:

• **Settlor** creates and funds the trust
• **Trustee** holds legal title and manages property
• **Beneficiary** holds equitable title and receives benefits
• **Trust Property** (res/corpus) is held within the trust

The trustee owes fiduciary duties to the beneficiary, managing the property for their benefit.`
  },
  {
    id: 'equity-vs-law',
    title: 'Equity vs Common Law',
    description: 'Compare the remedies and approaches of equity and common law courts',
    icon: GitBranch,
    nodes: equityLawNodes,
    edges: equityLawEdges,
    info: `This diagram shows the key distinctions between equity and common law:

• **Common Law** offers monetary damages and acts "in rem" (against property)
• **Equity** provides specific performance, injunctions, and acts "in personam" (against the person)
• Equity supplements common law where its remedies are inadequate

The maxim "Equity follows the law" means equity generally respects legal principles but intervenes when strict application would be unconscionable.`
  },
  {
    id: 'fiduciary',
    title: 'Fiduciary Relationships',
    description: 'Explore the various fiduciary relationships and their common duties',
    icon: FileText,
    nodes: fiduciaryNodes,
    edges: fiduciaryEdges,
    info: `Fiduciary relationships involve one party acting for the benefit of another with utmost good faith:

• **Trustee-Beneficiary**: The paradigm fiduciary relationship
• **Agent-Principal**: Agent acts on behalf of principal
• **Executor-Estate**: Administers deceased's estate
• **Guardian-Ward**: Protects incapacitated person

All fiduciaries share common duties: loyalty, care, and accountability.`
  },
];

export default function DiagramsPage() {
  const [selectedDiagram, setSelectedDiagram] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Inject custom styles to hide React Flow attribution
  useEffect(() => {
    const styleId = 'react-flow-diagrams-custom-styles';
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = reactFlowStyles;
      document.head.appendChild(styleElement);
    }
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) existingStyle.remove();
    };
  }, []);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const loadDiagram = (diagram) => {
    setSelectedDiagram(diagram);
    setNodes(diagram.nodes);
    setEdges(diagram.edges);
    setShowInfo(false);
  };

  if (selectedDiagram) {
    return (
      <div className="h-full flex flex-col p-2 sm:p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-2 sm:mb-4 gap-2 shrink-0">
          <button
            onClick={() => setSelectedDiagram(null)}
            className="flex items-center gap-1 sm:gap-2 text-vault-gold hover:underline text-xs sm:text-base shrink-0"
          >
            ← Back
          </button>
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <h2 className="text-sm sm:text-xl font-heading text-white truncate">{selectedDiagram.title}</h2>
            <Button
              onClick={() => setShowInfo(!showInfo)}
              variant="outline"
              size="sm"
              className="btn-secondary h-7 sm:h-9 text-xs sm:text-sm px-2 sm:px-3 shrink-0"
            >
              <Info className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" weight="duotone" />
              <span className="hidden sm:inline">{showInfo ? 'Hide' : 'Show'} Info</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 relative rounded-lg sm:rounded-xl overflow-hidden border border-white/10 min-h-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            proOptions={{ hideAttribution: true }}
            style={{ background: 'rgba(11, 18, 33, 0.95)' }}
          >
            <Controls 
              position="bottom-right"
              showInteractive={false}
              className="!bg-vault-dark/95 !border-vault-gold/30 !rounded-lg !shadow-lg !m-2 sm:!m-3 [&>button]:!bg-vault-dark/95 [&>button]:!border-vault-gold/30 [&>button]:!text-vault-gold [&>button:hover]:!bg-vault-gold/20 [&>button]:!w-6 [&>button]:!h-6 sm:[&>button]:!w-8 sm:[&>button]:!h-8"
            />
            {/* Hide MiniMap on mobile */}
            <MiniMap 
              style={{ 
                backgroundColor: 'rgba(11, 18, 33, 0.95)',
                border: '1px solid rgba(198, 168, 124, 0.3)',
                borderRadius: '6px',
                width: 100,
                height: 70,
                margin: '12px',
              }}
              nodeColor={(node) => {
                if (node.style?.borderColor?.includes('C6A87C')) return '#C6A87C';
                if (node.style?.borderColor?.includes('3B82F6')) return '#3B82F6';
                if (node.style?.borderColor?.includes('22C55E')) return '#22C55E';
                if (node.style?.borderColor?.includes('A855F7')) return '#A855F7';
                return '#EF4444';
              }}
              position="top-right"
              pannable={false}
              zoomable={false}
              className="hidden sm:block"
            />
            <Background color="rgba(255,255,255,0.05)" gap={20} />
          </ReactFlow>

          {/* Info Panel - immediate appearance with high z-index */}
          {showInfo && (
            <div
              className="absolute right-2 sm:right-4 top-2 sm:top-4 w-[calc(100%-1rem)] sm:w-80 max-h-[60%] sm:max-h-[80%] overflow-y-auto z-50"
              style={{ zIndex: 1000 }}
            >
              <GlassCard className="relative !bg-vault-dark/98 backdrop-blur-xl shadow-2xl border-vault-gold/30">
                <button
                  onClick={() => setShowInfo(false)}
                  className="absolute top-2 right-2 text-white/40 hover:text-white p-1"
                >
                  <X className="w-4 h-4" weight="duotone" />
                </button>
                <h3 className="font-heading text-base sm:text-lg text-white mb-3 sm:mb-4 pr-6">{selectedDiagram.title}</h3>
                <div className="prose prose-sm prose-invert">
                  {selectedDiagram.info.split('\n\n').map((para, idx) => (
                    <p key={idx} className="text-white/70 text-xs sm:text-sm whitespace-pre-line">{parseBoldText(para)}</p>
                  ))}
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-3.5rem)] sm:h-auto p-3 sm:p-8 overflow-hidden sm:overflow-auto">
      <PageHeader
        icon={GitBranch}
        title="Interactive Diagrams"
        subtitle="Visualize trust relationships and legal structures"
        subtitleAction={<PageHelpTooltip pageKey="diagrams" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {diagrams.map((diagram) => (
          <motion.div
            key={diagram.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard
              interactive
              glow
              onClick={() => loadDiagram(diagram)}
              className="h-full group !p-3 sm:!p-6"
            >
              <IconBadge icon={diagram.icon} size="md" variant="gold" className="mb-2 sm:mb-4" />
              <h3 className="text-base sm:text-xl font-heading text-white mb-1 sm:mb-2">{diagram.title}</h3>
              <p className="text-white/50 text-xs sm:text-sm mb-2 sm:mb-4 line-clamp-2">{diagram.description}</p>
              <div className="flex items-center text-vault-gold text-xs sm:text-sm">
                <span>Explore</span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" weight="duotone" />
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* About section - Hidden on mobile to prevent scrolling */}
      <div className="hidden sm:block mt-12">
        <GlassCard>
          <h3 className="font-heading text-lg text-white mb-4">About Interactive Diagrams</h3>
          <p className="text-white/60 text-sm mb-4">
            These diagrams are designed to help you visualize complex legal relationships and concepts. 
            Each diagram is interactive—you can drag nodes, zoom in and out, and explore the connections 
            between different elements.
          </p>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-vault-gold mb-1">🖱️ Drag</div>
              <div className="text-white/40">Move nodes to rearrange the diagram</div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-vault-gold mb-1">🔍 Zoom</div>
              <div className="text-white/40">Scroll or use controls to zoom in/out</div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-vault-gold mb-1">ℹ️ Info</div>
              <div className="text-white/40">Click info button for explanations</div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
