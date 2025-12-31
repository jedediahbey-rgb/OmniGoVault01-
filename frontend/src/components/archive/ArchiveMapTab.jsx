import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow,
  useNodesInitialized,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Scales, Seal, FileText, Brain, MapTrifold, X } from '@phosphor-icons/react';

// Custom Node Types
const DoctrineNode = memo(({ data }) => (
  <motion.div 
    className="px-2 py-1.5 sm:px-4 sm:py-3 bg-gradient-to-br from-vault-gold/20 to-vault-gold/5 border-2 border-vault-gold/50 rounded-lg sm:rounded-xl shadow-lg shadow-vault-gold/10 w-[110px] sm:min-w-[160px]"
    whileHover={{ scale: 1.05, borderColor: 'rgba(198, 168, 124, 0.8)' }}
    style={{ willChange: 'transform' }}
  >
    <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
      <Scales className="w-3 h-3 sm:w-4 sm:h-4 text-vault-gold" weight="fill" />
      <span className="text-[7px] sm:text-[10px] text-vault-gold/70 uppercase tracking-wider">Doctrine</span>
    </div>
    <p className="text-white font-medium text-[10px] sm:text-sm leading-tight">{data.label}</p>
    {data.status && (
      <span className={`inline-block mt-1 sm:mt-2 px-1 sm:px-2 py-0.5 rounded text-[7px] sm:text-[10px] font-medium ${
        data.status === 'VERIFIED' ? 'bg-green-500/20 text-green-400' :
        data.status === 'DISPUTED' ? 'bg-orange-500/20 text-orange-400' :
        'bg-white/10 text-white/50'
      }`}>
        {data.status}
      </span>
    )}
  </motion.div>
));

const CaseNode = memo(({ data }) => (
  <motion.div 
    className="px-2 py-1.5 sm:px-4 sm:py-3 bg-gradient-to-br from-blue-500/20 to-blue-600/5 border-2 border-blue-500/50 rounded-lg sm:rounded-xl shadow-lg shadow-blue-500/10 w-[110px] sm:min-w-[160px]"
    whileHover={{ scale: 1.05, borderColor: 'rgba(59, 130, 246, 0.8)' }}
    style={{ willChange: 'transform' }}
  >
    <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
      <Seal className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" weight="fill" />
      <span className="text-[7px] sm:text-[10px] text-blue-400/70 uppercase tracking-wider">Case</span>
    </div>
    <p className="text-white font-medium text-[10px] sm:text-sm leading-tight">{data.label}</p>
    {data.citation && (
      <p className="text-blue-400/60 text-[7px] sm:text-[10px] font-mono mt-0.5 sm:mt-1">{data.citation}</p>
    )}
  </motion.div>
));

const StatuteNode = memo(({ data }) => (
  <motion.div 
    className="px-2 py-1.5 sm:px-4 sm:py-3 bg-gradient-to-br from-purple-500/20 to-purple-600/5 border-2 border-purple-500/50 rounded-lg sm:rounded-xl shadow-lg shadow-purple-500/10 w-[110px] sm:min-w-[160px]"
    whileHover={{ scale: 1.05, borderColor: 'rgba(139, 92, 246, 0.8)' }}
    style={{ willChange: 'transform' }}
  >
    <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
      <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" weight="fill" />
      <span className="text-[7px] sm:text-[10px] text-purple-400/70 uppercase tracking-wider">Statute</span>
    </div>
    <p className="text-white font-medium text-[10px] sm:text-sm leading-tight">{data.label}</p>
    {data.citation && (
      <p className="text-purple-400/60 text-[7px] sm:text-[10px] font-mono mt-0.5 sm:mt-1">{data.citation}</p>
    )}
  </motion.div>
));

const ConceptNode = memo(({ data }) => (
  <motion.div 
    className="px-2 py-1.5 sm:px-4 sm:py-3 bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border-2 border-emerald-500/50 rounded-lg sm:rounded-xl shadow-lg shadow-emerald-500/10 w-[100px] sm:min-w-[140px]"
    whileHover={{ scale: 1.05, borderColor: 'rgba(16, 185, 129, 0.8)' }}
    style={{ willChange: 'transform' }}
  >
    <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
      <Brain className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" weight="fill" />
      <span className="text-[7px] sm:text-[10px] text-emerald-400/70 uppercase tracking-wider">Concept</span>
    </div>
    <p className="text-white font-medium text-[10px] sm:text-sm leading-tight">{data.label}</p>
  </motion.div>
));

const nodeTypes = {
  doctrine: DoctrineNode,
  case: CaseNode,
  statute: StatuteNode,
  concept: ConceptNode,
};

// Mobile-optimized nodes - 2x4 grid layout
const mobileNodes = [
  { id: '1', type: 'doctrine', position: { x: 20, y: 20 }, data: { label: 'Equity Follows the Law', status: 'VERIFIED' } },
  { id: '4', type: 'doctrine', position: { x: 155, y: 20 }, data: { label: 'Fiduciary Duty', status: 'VERIFIED' } },
  { id: '2', type: 'case', position: { x: 20, y: 95 }, data: { label: "Earl of Oxford's Case", citation: '1 Rep Ch 1 (1615)' } },
  { id: '7', type: 'concept', position: { x: 155, y: 95 }, data: { label: "Chancellor's Conscience" } },
  { id: '3', type: 'case', position: { x: 20, y: 170 }, data: { label: 'Keech v Sandford', citation: '25 ER 223 (1726)' } },
  { id: '8', type: 'concept', position: { x: 155, y: 170 }, data: { label: 'No-Profit Rule' } },
  { id: '6', type: 'statute', position: { x: 20, y: 245 }, data: { label: 'Restatement (Third) of Trusts', citation: '2003' } },
  { id: '5', type: 'doctrine', position: { x: 155, y: 245 }, data: { label: 'Constructive Trust', status: 'VERIFIED' } },
];

// Desktop nodes - 3-row layout
const desktopNodes = [
  { id: '2', type: 'case', position: { x: 60, y: 40 }, data: { label: "Earl of Oxford's Case", citation: '1 Rep Ch 1 (1615)' } },
  { id: '1', type: 'doctrine', position: { x: 300, y: 40 }, data: { label: 'Equity Follows the Law', status: 'VERIFIED' } },
  { id: '4', type: 'doctrine', position: { x: 540, y: 40 }, data: { label: 'Fiduciary Duty', status: 'VERIFIED' } },
  { id: '7', type: 'concept', position: { x: 120, y: 160 }, data: { label: "Chancellor's Conscience" } },
  { id: '6', type: 'statute', position: { x: 340, y: 160 }, data: { label: 'Restatement (Third) of Trusts', citation: '2003' } },
  { id: '8', type: 'concept', position: { x: 560, y: 160 }, data: { label: 'No-Profit Rule' } },
  { id: '3', type: 'case', position: { x: 200, y: 280 }, data: { label: 'Keech v Sandford', citation: '25 ER 223 (1726)' } },
  { id: '5', type: 'doctrine', position: { x: 460, y: 280 }, data: { label: 'Constructive Trust', status: 'VERIFIED' } },
];

const initialEdges = [
  { id: 'e1-2', source: '2', target: '1', type: 'smoothstep', animated: true, style: { stroke: '#C6A87C' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#C6A87C' }, label: 'establishes' },
  { id: 'e1-3', source: '3', target: '1', type: 'smoothstep', style: { stroke: '#C6A87C' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#C6A87C' }, label: 'develops' },
  { id: 'e1-4', source: '1', target: '4', type: 'smoothstep', style: { stroke: '#8B5CF6' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#8B5CF6' }, label: 'leads to' },
  { id: 'e1-5', source: '1', target: '5', type: 'smoothstep', style: { stroke: '#8B5CF6' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#8B5CF6' }, label: 'creates' },
  { id: 'e3-4', source: '3', target: '4', type: 'smoothstep', style: { stroke: '#3B82F6' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#3B82F6' }, label: 'defines' },
  { id: 'e6-1', source: '6', target: '1', type: 'smoothstep', style: { stroke: '#10B981', strokeDasharray: '5,5' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10B981' }, label: 'codifies' },
  { id: 'e7-1', source: '7', target: '1', type: 'smoothstep', style: { stroke: '#10B981' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10B981' } },
  { id: 'e8-4', source: '8', target: '4', type: 'smoothstep', style: { stroke: '#10B981' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10B981' } },
];

function ArchiveMapFlow({ nodes, edges, onNodesChange, onEdgesChange, onNodeClick, isMobile }) {
  const nodesInitialized = useNodesInitialized();
  const { fitView } = useReactFlow();
  const fitViewCalled = useRef(false);

  useEffect(() => {
    if (!nodesInitialized || fitViewCalled.current) return;
    fitViewCalled.current = true;

    const timers = [];
    
    requestAnimationFrame(() => {
      fitView({
        padding: 0.08,
        includeHiddenNodes: true,
        duration: 0,
        minZoom: 0.4,
        maxZoom: 0.95,
      });
    });

    timers.push(setTimeout(() => {
      requestAnimationFrame(() => {
        fitView({
          padding: 0.08,
          includeHiddenNodes: true,
          duration: 300,
          minZoom: 0.4,
          maxZoom: 0.95,
        });
      });
    }, 200));

    timers.push(setTimeout(() => {
      requestAnimationFrame(() => {
        fitView({
          padding: 0.08,
          includeHiddenNodes: true,
          duration: 350,
          minZoom: 0.4,
          maxZoom: 0.95,
        });
      });
    }, 500));

    return () => timers.forEach(t => clearTimeout(t));
  }, [nodesInitialized, fitView]);

  useEffect(() => {
    fitViewCalled.current = false;
  }, [nodes.length]);

  const defaultViewport = isMobile 
    ? { x: 10, y: 5, zoom: 0.85 }
    : { x: 40, y: 20, zoom: 0.8 };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      defaultViewport={defaultViewport}
      fitViewOptions={{
        padding: 0.08,
        minZoom: 0.4,
        maxZoom: 0.95,
        includeHiddenNodes: true
      }}
      minZoom={0.3}
      maxZoom={2}
      attributionPosition="bottom-left"
      className="archive-map-flow"
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#1a1a2e" gap={20} />
      <Controls 
        position="bottom-left"
        style={{
          margin: 20,
          marginBottom: 'calc(20px + env(safe-area-inset-bottom))',
          marginLeft: 'calc(20px + env(safe-area-inset-left))',
        }}
        className="archive-map-controls !bg-black/80 !border-vault-gold/30 !rounded-lg !shadow-xl [&>button]:!bg-white/10 [&>button]:!border-vault-gold/20 [&>button]:!text-white/70 [&>button:hover]:!bg-vault-gold/20 [&>button:hover]:!text-vault-gold"
        showInteractive={false}
      />
      <MiniMap 
        position="bottom-right"
        style={{
          margin: 16,
          marginBottom: 'calc(16px + env(safe-area-inset-bottom))',
          marginRight: 'calc(16px + env(safe-area-inset-right))',
          width: 140,
          height: 100,
        }}
        nodeColor={(node) => {
          switch (node.type) {
            case 'doctrine': return '#C6A87C';
            case 'case': return '#3B82F6';
            case 'statute': return '#8B5CF6';
            case 'concept': return '#10B981';
            default: return '#666';
          }
        }}
        nodeStrokeWidth={0}
        nodeBorderRadius={50}
        maskColor="rgba(0, 0, 0, 0.8)"
        className="archive-map-minimap !bg-black/80 !border-vault-gold/30 !rounded-lg"
        pannable
        zoomable
      />
    </ReactFlow>
  );
}

export function ArchiveMapTab() {
  const [isMobile, setIsMobile] = useState(false);
  const initialNodesForDevice = isMobile ? mobileNodes : desktopNodes;
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodesForDevice);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const newNodes = isMobile ? mobileNodes : desktopNodes;
    setNodes(newNodes);
  }, [isMobile, setNodes]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="relative">
      {/* Map Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-white font-heading text-xl sm:text-2xl mb-1">Interactive Archive Map</h2>
          <p className="text-white/50 text-sm">Explore doctrine relationships and connections</p>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-vault-gold/30 border border-vault-gold/50" />
            <span className="text-white/60">Doctrine</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-500/30 border border-blue-500/50" />
            <span className="text-white/60">Case</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-purple-500/30 border border-purple-500/50" />
            <span className="text-white/60">Statute</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
            <span className="text-white/60">Concept</span>
          </div>
        </div>
      </div>
      
      {/* React Flow Map Container */}
      <div className="relative mt-2">
        {/* Animated outer glow */}
        <motion.div 
          className="absolute -inset-2 rounded-3xl opacity-60"
          style={{
            background: 'linear-gradient(135deg, rgba(198, 168, 124, 0.15), rgba(139, 92, 246, 0.1), rgba(198, 168, 124, 0.15))',
            filter: 'blur(8px)',
          }}
          animate={{ opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        {/* Corner accents */}
        <CornerAccent position="top-left" />
        <CornerAccent position="top-right" />
        <CornerAccent position="bottom-left" />
        <CornerAccent position="bottom-right" />
        
        {/* Scanning line effect */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-vault-gold/60 to-transparent z-20 pointer-events-none"
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Inner double border frame */}
        <div className="absolute inset-0 rounded-2xl border border-vault-gold/40 pointer-events-none z-10" />
        <div className="absolute inset-[3px] rounded-xl border border-vault-gold/20 pointer-events-none z-10" />
        
        {/* Corner brackets */}
        <CornerBracket position="top-left" />
        <CornerBracket position="top-right" />
        <CornerBracket position="bottom-left" />
        <CornerBracket position="bottom-right" />
        
        {/* Top center ornament */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          <div className="w-8 h-px bg-gradient-to-r from-transparent to-vault-gold/50" />
          <div className="bg-[#0a0f1a] px-3 py-1 border border-vault-gold/30 rounded-full flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            >
              <MapTrifold className="w-3 h-3 text-vault-gold" weight="fill" />
            </motion.div>
            <span className="text-vault-gold/80 text-[10px] font-medium uppercase tracking-widest">Doctrine Map</span>
          </div>
          <div className="w-8 h-px bg-gradient-to-l from-transparent to-vault-gold/50" />
        </div>
        
        {/* React Flow Map container */}
        <div 
          style={{ 
            position: 'relative',
            width: '100%',
            height: isMobile ? 480 : 550,
            overflow: 'hidden',
            borderRadius: 18
          }} 
          className="bg-gradient-to-b from-[#050810] to-[#080d18]"
        >
          <div className="absolute inset-0 pointer-events-none z-10" style={{
            background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)'
          }} />
          
          <ReactFlowProvider>
            <ArchiveMapFlow
              key={isMobile ? 'mobile' : 'desktop'}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              isMobile={isMobile}
            />
          </ReactFlowProvider>
          
          <div 
            className="absolute left-1/2 -translate-x-1/2 sm:hidden text-white/40 text-[10px] bg-black/60 px-3 py-1 rounded-full border border-white/10 z-20"
            style={{ bottom: 'calc(8px + env(safe-area-inset-bottom))' }}
          >
            Pinch to zoom • Drag to pan
          </div>
        </div>
        
        {/* Bottom status indicator */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-[#0a0f1a] px-2 py-0.5 border border-vault-gold/20 rounded-full">
          <motion.div 
            className="w-1.5 h-1.5 rounded-full bg-emerald-500"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-white/40 text-[9px] uppercase tracking-wider">Live</span>
        </div>
      </div>
      
      {/* Selected Node Details */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-4 p-4 bg-white/[0.03] border border-white/10 rounded-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs text-white/40 uppercase tracking-wider">{selectedNode.type}</span>
                <h3 className="text-white font-heading text-lg">{selectedNode.data.label}</h3>
                {selectedNode.data.citation && (
                  <p className="text-vault-gold/60 text-sm font-mono">{selectedNode.data.citation}</p>
                )}
                {selectedNode.data.status && (
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                    selectedNode.data.status === 'VERIFIED' ? 'bg-green-500/20 text-green-400' :
                    selectedNode.data.status === 'DISPUTED' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-white/10 text-white/50'
                  }`}>
                    {selectedNode.data.status}
                  </span>
                )}
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <p className="text-white/30 text-xs text-center mt-4">
        Click and drag to pan • Scroll to zoom • Click nodes to view details
      </p>
    </div>
  );
}

// Helper components
function CornerAccent({ position }) {
  const positionClasses = {
    'top-left': '-top-1 -left-1',
    'top-right': '-top-1 -right-1',
    'bottom-left': '-bottom-1 -left-1',
    'bottom-right': '-bottom-1 -right-1'
  };
  
  const gradientDeg = {
    'top-left': '0deg',
    'top-right': '90deg',
    'bottom-left': '270deg',
    'bottom-right': '180deg'
  };
  
  const rotateDir = position.includes('right') ? -360 : 360;
  
  return (
    <div className={`absolute ${positionClasses[position]} w-8 h-8`}>
      <motion.div
        className="absolute inset-0"
        style={{
          background: `conic-gradient(from ${gradientDeg[position]}, transparent 0deg, rgba(198, 168, 124, 0.6) 90deg, transparent 90deg)`,
        }}
        animate={{ rotate: rotateDir }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute inset-1 bg-[#0a0f1a]" />
    </div>
  );
}

function CornerBracket({ position }) {
  const positionClasses = {
    'top-left': 'top-0 left-0',
    'top-right': 'top-0 right-0',
    'bottom-left': 'bottom-0 left-0',
    'bottom-right': 'bottom-0 right-0'
  };
  
  const paths = {
    'top-left': { d: 'M4 20 L4 4 L20 4', cx: 4, cy: 4 },
    'top-right': { d: 'M44 20 L44 4 L28 4', cx: 44, cy: 4 },
    'bottom-left': { d: 'M4 28 L4 44 L20 44', cx: 4, cy: 44 },
    'bottom-right': { d: 'M44 28 L44 44 L28 44', cx: 44, cy: 44 }
  };
  
  const { d, cx, cy } = paths[position];
  
  return (
    <svg className={`absolute ${positionClasses[position]} w-12 h-12 text-vault-gold/50 pointer-events-none z-10`} viewBox="0 0 48 48">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="2" fill="currentColor" />
    </svg>
  );
}
