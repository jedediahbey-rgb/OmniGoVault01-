import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom styles for React Flow - mobile optimized
const reactFlowStyles = `
  .react-flow__attribution {
    display: none !important;
  }
  .react-flow__minimap {
    width: 100px !important;
    height: 65px !important;
    right: 8px !important;
    top: 8px !important;
    border-radius: 6px !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
    overflow: hidden !important;
  }
  .react-flow__controls {
    right: 8px !important;
    bottom: 8px !important;
    left: auto !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 2px !important;
  }
  .react-flow__controls button {
    width: 28px !important;
    height: 28px !important;
  }
  @media (max-width: 640px) {
    .react-flow__minimap {
      display: none !important;
    }
    .react-flow__controls {
      right: 4px !important;
      bottom: 4px !important;
    }
    .react-flow__controls button {
      width: 24px !important;
      height: 24px !important;
    }
  }
`;
import axios from 'axios';
import {
  ArrowLeft,
  Buildings,
  CaretDown,
  Eye,
  FileText,
  Folder,
  GitBranch,
  HandCoins,
  House,
  Info,
  MapPin,
  Newspaper,
  Plus,
  Scales,
  ShieldCheck,
  User,
  Users,
  X,
} from '@phosphor-icons/react';
import PageHeader from '../components/shared/PageHeader';
import PageHelpTooltip from '../components/shared/PageHelpTooltip';
import GlassCard from '../components/shared/GlassCard';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Node style configurations - responsive function
const getNodeStyles = (isMobile = false) => ({
  trust: {
    background: 'linear-gradient(135deg, rgba(198, 168, 124, 0.3) 0%, rgba(198, 168, 124, 0.15) 100%)',
    border: '2px solid rgba(198, 168, 124, 0.6)',
    color: '#C6A87C',
    padding: isMobile ? '12px 16px' : '14px 20px',
    borderRadius: isMobile ? '12px' : '14px',
    fontSize: isMobile ? '12px' : '13px',
    fontWeight: 600,
    minWidth: isMobile ? '120px' : '140px',
    maxWidth: isMobile ? '140px' : '160px',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(198, 168, 124, 0.2)',
  },
  party: {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
    border: '2px solid rgba(59, 130, 246, 0.5)',
    color: '#3B82F6',
    padding: isMobile ? '10px 14px' : '12px 16px',
    borderRadius: isMobile ? '10px' : '10px',
    fontSize: isMobile ? '11px' : '12px',
    fontWeight: 500,
    minWidth: isMobile ? '100px' : '120px',
    maxWidth: isMobile ? '120px' : '140px',
    textAlign: 'center',
  },
  grantor: {
    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.1) 100%)',
    border: '2px solid rgba(168, 85, 247, 0.5)',
    color: '#A855F7',
    padding: isMobile ? '10px 14px' : '12px 16px',
    borderRadius: isMobile ? '10px' : '10px',
    fontSize: isMobile ? '11px' : '12px',
    fontWeight: 500,
    minWidth: isMobile ? '100px' : '120px',
    maxWidth: isMobile ? '120px' : '140px',
    textAlign: 'center',
  },
  trustee: {
    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)',
    border: '2px solid rgba(34, 197, 94, 0.5)',
    color: '#22C55E',
    padding: isMobile ? '10px 14px' : '12px 16px',
    borderRadius: isMobile ? '10px' : '10px',
    fontSize: isMobile ? '11px' : '12px',
    fontWeight: 500,
    minWidth: isMobile ? '100px' : '120px',
    maxWidth: isMobile ? '120px' : '140px',
    textAlign: 'center',
  },
  beneficiary: {
    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(251, 191, 36, 0.1) 100%)',
    border: '2px solid rgba(251, 191, 36, 0.5)',
    color: '#FBBF24',
    padding: isMobile ? '10px 14px' : '12px 16px',
    borderRadius: isMobile ? '10px' : '10px',
    fontSize: isMobile ? '11px' : '12px',
    fontWeight: 500,
    minWidth: isMobile ? '100px' : '120px',
    maxWidth: isMobile ? '130px' : '150px',
    textAlign: 'center',
  },
  asset: {
    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%)',
    border: '2px solid rgba(239, 68, 68, 0.5)',
    color: '#EF4444',
    padding: isMobile ? '8px 12px' : '10px 14px',
    borderRadius: isMobile ? '8px' : '8px',
    fontSize: isMobile ? '10px' : '11px',
    fontWeight: 500,
    minWidth: isMobile ? '80px' : '100px',
    maxWidth: isMobile ? '100px' : '120px',
    textAlign: 'center',
  },
  governance: {
    background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(14, 165, 233, 0.1) 100%)',
    border: '2px solid rgba(14, 165, 233, 0.5)',
    color: '#0EA5E9',
    padding: isMobile ? '8px 12px' : '10px 14px',
    borderRadius: isMobile ? '8px' : '8px',
    fontSize: isMobile ? '10px' : '11px',
    fontWeight: 500,
    minWidth: isMobile ? '80px' : '100px',
    maxWidth: isMobile ? '100px' : '120px',
    textAlign: 'center',
  },
});

const edgeStyles = {
  ownership: { stroke: '#C6A87C', strokeWidth: 2 },
  fiduciary: { stroke: '#22C55E', strokeWidth: 2, strokeDasharray: '5,5' },
  benefit: { stroke: '#FBBF24', strokeWidth: 2 },
  governance: { stroke: '#0EA5E9', strokeWidth: 1.5, strokeDasharray: '3,3' },
};

const roleIcons = {
  grantor: '👤',
  trustee: '🛡️',
  beneficiary: '⭐',
  agent: '📋',
  other: '👥',
};

export default function NodeMapPage() {
  return (
    <ReactFlowProvider>
      <NodeMapContent />
    </ReactFlowProvider>
  );
}

function NodeMapContent() {
  const navigate = useNavigate();
  const { portfolioId } = useParams();
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  
  // Inject custom styles to hide React Flow attribution
  useEffect(() => {
    const styleId = 'react-flow-custom-styles';
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

  // Lock body scroll on mobile for this page
  useEffect(() => {
    const isMobileDevice = window.innerWidth < 768;
    if (isMobileDevice) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, []);

  // Detect mobile for responsive layout
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Get default portfolio from localStorage
  const defaultPortfolioId = localStorage.getItem('defaultPortfolioId') || '';
  
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState(portfolioId || defaultPortfolioId || '');
  const [trustProfile, setTrustProfile] = useState(null);
  const [parties, setParties] = useState([]);
  const [assets, setAssets] = useState([]);
  const [governanceRecords, setGovernanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Fit view handler with debouncing
  const fitViewTimeoutRef = useRef(null);
  const fitView = useCallback(() => {
    if (!reactFlowInstance) return;
    
    if (fitViewTimeoutRef.current) {
      clearTimeout(fitViewTimeoutRef.current);
    }
    
    fitViewTimeoutRef.current = setTimeout(() => {
      reactFlowInstance.fitView({
        padding: isMobile ? 0.15 : 0.2,
        includeHiddenNodes: true,
        duration: 200,
      });
    }, 100);
  }, [reactFlowInstance, isMobile]);

  // Fit view when nodes change or container resizes
  useEffect(() => {
    if (nodes.length > 0 && reactFlowInstance) {
      fitView();
    }
  }, [nodes.length, reactFlowInstance, fitView]);

  // ResizeObserver for container
  useEffect(() => {
    if (!reactFlowWrapper.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      fitView();
    });
    
    resizeObserver.observe(reactFlowWrapper.current);
    
    return () => {
      resizeObserver.disconnect();
      if (fitViewTimeoutRef.current) {
        clearTimeout(fitViewTimeoutRef.current);
      }
    };
  }, [fitView]);

  // Handle orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      setTimeout(fitView, 300);
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    return () => window.removeEventListener('orientationchange', handleOrientationChange);
  }, [fitView]);

  // Fetch portfolios
  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        const res = await axios.get(`${API}/portfolios`);
        setPortfolios(res.data || []);
        if (!selectedPortfolio && res.data?.length > 0) {
          // Prioritize: URL param > default portfolio > first portfolio
          const defaultId = localStorage.getItem('defaultPortfolioId');
          const hasDefault = defaultId && res.data.some(p => p.portfolio_id === defaultId);
          setSelectedPortfolio(hasDefault ? defaultId : res.data[0].portfolio_id);
        }
      } catch (error) {
        console.error('Failed to fetch portfolios:', error);
      }
    };
    fetchPortfolios();
  }, [selectedPortfolio]);

  // Fetch portfolio data
  useEffect(() => {
    if (!selectedPortfolio) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [profileRes, partiesRes, assetsRes, govRes] = await Promise.all([
          axios.get(`${API}/trust-profiles/${selectedPortfolio}`).catch(() => ({ data: null })),
          axios.get(`${API}/portfolios/${selectedPortfolio}/parties`).catch(() => ({ data: [] })),
          axios.get(`${API}/portfolios/${selectedPortfolio}/assets`).catch(() => ({ data: [] })),
          axios.get(`${API}/governance/v2/records?portfolio_id=${selectedPortfolio}&limit=20`).catch(() => ({ data: { data: { items: [] } } })),
        ]);

        setTrustProfile(profileRes.data);
        setParties(partiesRes.data || []);
        setAssets(assetsRes.data || []);
        setGovernanceRecords(govRes.data?.data?.items || []);
      } catch (error) {
        console.error('Failed to fetch portfolio data:', error);
        toast.error('Failed to load portfolio data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedPortfolio]);

  // Build the node map
  useEffect(() => {
    if (loading) return;

    const newNodes = [];
    const newEdges = [];
    
    const portfolio = portfolios.find(p => p.portfolio_id === selectedPortfolio);
    const trustName = trustProfile?.trust_name || portfolio?.name || 'Trust';

    // Get responsive node styles
    const nodeStyles = getNodeStyles(isMobile);

    // Calculate dynamic spacing based on data volume
    const totalNodes = parties.length + assets.length + Object.keys(governanceRecords.reduce((acc, r) => { acc[r.module_type || 'other'] = true; return acc; }, {})).length;
    const hasLotsOfData = totalNodes > 5;
    
    // Responsive layout - much wider spacing for desktop with data
    const centerX = isMobile ? 300 : 550;
    const centerY = isMobile ? 200 : 200;
    const horizontalSpacing = isMobile ? 150 : (hasLotsOfData ? 350 : 280);
    const verticalSpacing = isMobile ? 100 : (hasLotsOfData ? 180 : 150);

    // Central Trust Node
    newNodes.push({
      id: 'trust-center',
      type: 'default',
      data: { 
        label: `📜 ${trustName}`,
        type: 'trust',
      },
      position: { x: centerX, y: centerY },
      style: nodeStyles.trust,
    });

    // Group parties by role
    const grantors = parties.filter(p => p.role === 'grantor');
    const trustees = parties.filter(p => p.role === 'trustee');
    const beneficiaries = parties.filter(p => p.role === 'beneficiary');
    const otherParties = parties.filter(p => !['grantor', 'trustee', 'beneficiary'].includes(p.role));

    // Position parties around the trust - Grantors on the left
    const grantorStartY = centerY - ((grantors.length - 1) * verticalSpacing) / 2;
    grantors.forEach((party, idx) => {
      const nodeId = `party-${party.party_id}`;
      newNodes.push({
        id: nodeId,
        type: 'default',
        data: { 
          label: `${roleIcons.grantor} ${party.name}\n(Grantor)`,
          party,
          type: 'grantor',
        },
        position: { x: centerX - horizontalSpacing - 80, y: grantorStartY + idx * verticalSpacing },
        style: nodeStyles.grantor,
      });
      newEdges.push({
        id: `e-${nodeId}-trust`,
        source: nodeId,
        target: 'trust-center',
        label: 'Created',
        animated: true,
        style: edgeStyles.ownership,
        labelStyle: { fill: '#A855F7', fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: '#0F172A', fillOpacity: 0.95 },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 4,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#A855F7' },
      });
    });

    // Trustees on top - centered above trust
    const trusteeStartX = centerX - ((trustees.length - 1) * horizontalSpacing) / 2;
    trustees.forEach((party, idx) => {
      const nodeId = `party-${party.party_id}`;
      newNodes.push({
        id: nodeId,
        type: 'default',
        data: { 
          label: `${roleIcons.trustee} ${party.name}\n(Trustee)`,
          party,
          type: 'trustee',
        },
        position: { x: trusteeStartX + idx * horizontalSpacing, y: centerY - verticalSpacing - 40 },
        style: nodeStyles.trustee,
      });
      newEdges.push({
        id: `e-trust-${nodeId}`,
        source: 'trust-center',
        target: nodeId,
        label: 'Legal Title',
        style: edgeStyles.fiduciary,
        labelStyle: { fill: '#22C55E', fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: '#0F172A', fillOpacity: 0.95 },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 4,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#22C55E' },
      });
    });

    // Beneficiaries on the right
    const beneficiaryStartY = centerY - ((beneficiaries.length - 1) * verticalSpacing) / 2;
    beneficiaries.forEach((party, idx) => {
      const nodeId = `party-${party.party_id}`;
      newNodes.push({
        id: nodeId,
        type: 'default',
        data: { 
          label: `${roleIcons.beneficiary} ${party.name}\n(Beneficiary)`,
          party,
          type: 'beneficiary',
        },
        position: { x: centerX + horizontalSpacing + 100, y: beneficiaryStartY + idx * verticalSpacing },
        style: nodeStyles.beneficiary,
      });
      newEdges.push({
        id: `e-trust-${nodeId}`,
        source: 'trust-center',
        target: nodeId,
        label: 'Equitable Title',
        style: edgeStyles.benefit,
        labelStyle: { fill: '#FBBF24', fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: '#0F172A', fillOpacity: 0.95 },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 4,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#FBBF24' },
      });
    });

    // Other parties at bottom left area
    const otherPartySpacing = isMobile ? 130 : 180;
    otherParties.forEach((party, idx) => {
      const nodeId = `party-${party.party_id}`;
      newNodes.push({
        id: nodeId,
        type: 'default',
        data: { 
          label: `${roleIcons[party.role] || roleIcons.other} ${party.name}\n(${party.role || 'Party'})`,
          party,
          type: 'party',
        },
        position: { x: (isMobile ? 50 : 100) + idx * otherPartySpacing, y: centerY + verticalSpacing + (isMobile ? 80 : 120) },
        style: nodeStyles.party,
      });
      newEdges.push({
        id: `e-${nodeId}-trust`,
        source: nodeId,
        target: 'trust-center',
        style: { stroke: '#3B82F6', strokeWidth: 1 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3B82F6' },
      });
    });

    // Assets below trust - wider spacing to avoid overlap
    const assetCount = Math.min(assets.length, 5);
    const assetSpacing = isMobile ? 120 : 180;
    const assetStartX = centerX - ((assetCount - 1) * assetSpacing) / 2;
    assets.slice(0, 5).forEach((asset, idx) => {
      const nodeId = `asset-${asset.asset_id}`;
      newNodes.push({
        id: nodeId,
        type: 'default',
        data: { 
          label: `🏠 ${asset.description?.slice(0, isMobile ? 10 : 12) || 'Asset'}${asset.description?.length > (isMobile ? 10 : 12) ? '...' : ''}`,
          asset,
          type: 'asset',
        },
        position: { x: assetStartX + idx * assetSpacing, y: centerY + verticalSpacing + (isMobile ? 40 : 60) },
        style: nodeStyles.asset,
      });
      newEdges.push({
        id: `e-trust-${nodeId}`,
        source: 'trust-center',
        target: nodeId,
        label: 'Holds',
        style: { stroke: '#EF4444', strokeWidth: 1.5 },
        labelStyle: { fill: '#EF4444', fontSize: 10 },
        labelBgStyle: { fill: '#0F172A', fillOpacity: 0.9 },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 3,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#EF4444' },
      });
    });

    // Governance records as small nodes - positioned to the right of assets
    const govByType = {};
    governanceRecords.forEach(rec => {
      const type = rec.module_type || 'other';
      if (!govByType[type]) govByType[type] = [];
      govByType[type].push(rec);
    });

    const govTypes = Object.entries(govByType).slice(0, 4);
    const govSpacing = isMobile ? 100 : 160;
    const govStartX = centerX - ((govTypes.length - 1) * govSpacing) / 2;
    govTypes.forEach(([type, records], idx) => {
      const nodeId = `gov-${type}`;
      const icons = {
        minutes: '📋',
        distribution: '💰',
        dispute: '⚖️',
        insurance: '🛡️',
        compensation: '💵',
      };
      newNodes.push({
        id: nodeId,
        type: 'default',
        data: { 
          label: `${icons[type] || '📄'} ${type}\n(${records.length})`,
          records,
          type: 'governance',
        },
        position: { x: govStartX + idx * govSpacing, y: centerY + verticalSpacing + (isMobile ? 140 : 180) },
        style: nodeStyles.governance,
      });
      newEdges.push({
        id: `e-trust-${nodeId}`,
        source: 'trust-center',
        target: nodeId,
        style: edgeStyles.governance,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#0EA5E9' },
      });
    });

    // If no parties exist, show placeholder nodes
    if (parties.length === 0) {
      newNodes.push({
        id: 'placeholder-grantor',
        type: 'default',
        data: { label: '+ Add Grantor', type: 'placeholder' },
        position: { x: centerX - horizontalSpacing - (isMobile ? 60 : 50), y: centerY },
        style: { ...nodeStyles.grantor, opacity: 0.5, border: '2px dashed rgba(168, 85, 247, 0.3)' },
      });
      newNodes.push({
        id: 'placeholder-trustee',
        type: 'default',
        data: { label: '+ Add Trustee', type: 'placeholder' },
        position: { x: centerX, y: centerY - verticalSpacing - (isMobile ? 30 : 40) },
        style: { ...nodeStyles.trustee, opacity: 0.5, border: '2px dashed rgba(34, 197, 94, 0.3)' },
      });
      newNodes.push({
        id: 'placeholder-beneficiary',
        type: 'default',
        data: { label: '+ Add Beneficiary', type: 'placeholder' },
        position: { x: centerX + horizontalSpacing + (isMobile ? 60 : 50), y: centerY },
        style: { ...nodeStyles.beneficiary, opacity: 0.5, border: '2px dashed rgba(251, 191, 36, 0.3)' },
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [loading, selectedPortfolio, portfolios, trustProfile, parties, assets, governanceRecords, setNodes, setEdges, isMobile]);

  const onNodeClick = useCallback((event, node) => {
    if (node.data.type === 'placeholder') {
      navigate(`/vault/portfolio/${selectedPortfolio}/trust-profile`);
      return;
    }
    setSelectedNode(node);
    setShowInfo(true);
  }, [navigate, selectedPortfolio]);

  const renderNodeDetails = () => {
    if (!selectedNode) return null;
    
    const { data } = selectedNode;
    
    if (data.type === 'trust') {
      return (
        <div className="space-y-3">
          <div className="text-vault-gold font-heading text-lg">Trust Details</div>
          <div className="text-white/80">
            <strong>Name:</strong> {trustProfile?.trust_name || 'Not configured'}
          </div>
          {trustProfile?.trust_type && (
            <div className="text-white/60">
              <strong>Type:</strong> {trustProfile.trust_type}
            </div>
          )}
          {trustProfile?.rm_base && (
            <div className="text-white/60">
              <strong>RM-ID Base:</strong> {trustProfile.rm_base}
            </div>
          )}
          <Link 
            to={`/vault/portfolio/${selectedPortfolio}/trust-profile`}
            className="inline-flex items-center gap-2 text-vault-gold hover:underline text-sm mt-2"
          >
            <Eye className="w-4 h-4" /> View Full Profile
          </Link>
        </div>
      );
    }
    
    if (data.party) {
      return (
        <div className="space-y-3">
          <div className="text-vault-gold font-heading text-lg">{data.party.name}</div>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            {data.party.role || 'Party'}
          </Badge>
          {data.party.email && (
            <div className="text-white/60 text-sm">
              <strong>Email:</strong> {data.party.email}
            </div>
          )}
          {data.party.phone && (
            <div className="text-white/60 text-sm">
              <strong>Phone:</strong> {data.party.phone}
            </div>
          )}
          {data.party.notes && (
            <div className="text-white/60 text-sm">
              <strong>Notes:</strong> {data.party.notes}
            </div>
          )}
        </div>
      );
    }
    
    if (data.asset) {
      return (
        <div className="space-y-3">
          <div className="text-vault-gold font-heading text-lg">Asset</div>
          <div className="text-white/80">{data.asset.description}</div>
          {data.asset.value && (
            <div className="text-white/60 text-sm">
              <strong>Value:</strong> ${data.asset.value.toLocaleString()}
            </div>
          )}
          <Badge className={data.asset.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
            {data.asset.status}
          </Badge>
        </div>
      );
    }
    
    if (data.records) {
      return (
        <div className="space-y-3">
          <div className="text-vault-gold font-heading text-lg capitalize">{data.records[0]?.module_type || 'Governance'} Records</div>
          <div className="text-white/60 text-sm">{data.records.length} record(s)</div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {data.records.slice(0, 5).map(rec => (
              <div key={rec.id} className="p-2 bg-white/5 rounded text-sm">
                <div className="text-white/80">{rec.title}</div>
                <div className="text-white/40 text-xs">{rec.status}</div>
              </div>
            ))}
          </div>
          <Link 
            to={`/vault/governance?portfolio=${selectedPortfolio}&tab=${data.records[0]?.module_type === 'minutes' ? 'meetings' : data.records[0]?.module_type + 's'}`}
            className="inline-flex items-center gap-2 text-vault-gold hover:underline text-sm"
          >
            <Eye className="w-4 h-4" /> View All
          </Link>
        </div>
      );
    }
    
    return null;
  };

  if (loading && !portfolios.length) {
    return (
      <div 
        className="h-full flex flex-col overflow-hidden"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-4 p-2 sm:p-4 lg:p-6 pb-1 sm:pb-2 shrink-0">
          <Link
            to="/vault"
            className="flex items-center gap-1 sm:gap-2 text-vault-gold hover:underline text-xs sm:text-base"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" /> Back
          </Link>
          <h1 className="text-base sm:text-2xl font-heading text-white">Trust Node Map</h1>
        </div>

        {/* Loading state */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-full flex flex-col overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Header - More compact on mobile */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-4 p-2 sm:p-4 lg:p-6 pb-1 sm:pb-2 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/vault"
            className="flex items-center gap-1 sm:gap-2 text-vault-gold hover:underline text-xs sm:text-base"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" /> Back
          </Link>
          <h1 className="text-base sm:text-2xl font-heading text-white">Trust Node Map</h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-[200px] bg-vault-dark border-vault-gold/30 h-7 sm:h-10 text-xs sm:text-sm">
              <SelectValue placeholder="Select Portfolio" />
            </SelectTrigger>
            <SelectContent className="bg-vault-dark border-vault-gold/30">
              {portfolios.map(p => (
                <SelectItem key={p.portfolio_id} value={p.portfolio_id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            onClick={() => {
              if (selectedPortfolio) {
                navigate(`/vault/portfolio/${selectedPortfolio}/trust-profile`);
              } else {
                navigate('/vault');
              }
            }}
            variant="outline"
            size="sm"
            className="border-vault-gold/30 text-vault-gold hover:bg-vault-gold/10 h-7 sm:h-10 text-xs sm:text-sm px-2 sm:px-4"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Party</span>
          </Button>
        </div>
      </div>

      {/* ReactFlow Canvas - Takes remaining space */}
      <div ref={reactFlowWrapper} className="flex-1 relative mx-2 sm:mx-4 lg:mx-6 mb-2 sm:mb-4 rounded-lg sm:rounded-xl overflow-hidden border border-white/10 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onInit={setReactFlowInstance}
            fitView
            fitViewOptions={{ padding: isMobile ? 0.12 : 0.18, includeHiddenNodes: true }}
            minZoom={isMobile ? 0.1 : 0.2}
            maxZoom={isMobile ? 1.0 : 1.5}
            panOnScroll={false}
            zoomOnScroll={false}
            zoomOnPinch={true}
            panOnDrag={true}
            preventScrolling={true}
            proOptions={{ hideAttribution: true }}
            style={{ background: 'rgba(11, 18, 33, 0.95)' }}
          >
            <Controls 
              position="bottom-right"
              showInteractive={false}
              className="!bg-vault-dark/95 !border-vault-gold/30 !rounded-lg !shadow-lg !m-2 [&>button]:!bg-vault-dark/95 [&>button]:!border-vault-gold/30 [&>button]:!text-vault-gold [&>button:hover]:!bg-vault-gold/20 [&>button]:!w-6 [&>button]:!h-6 sm:[&>button]:!w-7 sm:[&>button]:!h-7"
            />
            {/* MiniMap - hidden on mobile */}
            {!isMobile && (
              <MiniMap 
                style={{ 
                  backgroundColor: 'rgba(11, 18, 33, 0.98)',
                  border: '1px solid rgba(198, 168, 124, 0.4)',
                  borderRadius: '6px',
                  width: 100,
                  height: 65,
                  margin: '8px',
                }}
                nodeColor={(node) => {
                  const colors = {
                    trust: '#C6A87C',
                    grantor: '#A855F7',
                    trustee: '#22C55E',
                    beneficiary: '#FBBF24',
                    party: '#3B82F6',
                    asset: '#EF4444',
                    governance: '#0EA5E9',
                  };
                  return colors[node.data?.type] || '#666';
                }}
                maskColor="rgba(11, 18, 33, 0.7)"
                position="top-right"
                pannable={false}
                zoomable={false}
              />
            )}
            <Background color="rgba(255,255,255,0.05)" gap={isMobile ? 20 : 25} />
            
            {/* Legend Panel - Only inside ReactFlow on desktop */}
            {!isMobile && (
              <Panel position="bottom-left" className="!m-3">
                <GlassCard className="!p-3 !bg-vault-dark/95 !border-vault-gold/20">
                  <div className="text-xs text-white/70 mb-2 font-semibold">Legend</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-[#C6A87C]" />
                      <span className="text-white/80">Trust</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-[#A855F7]" />
                      <span className="text-white/80">Grantor</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-[#22C55E]" />
                      <span className="text-white/80">Trustee</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-[#FBBF24]" />
                      <span className="text-white/80">Beneficiary</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-[#EF4444]" />
                      <span className="text-white/80">Asset</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-[#0EA5E9]" />
                      <span className="text-white/80">Governance</span>
                    </div>
                  </div>
                </GlassCard>
              </Panel>
            )}
          </ReactFlow>
        )}

        {/* Info Panel */}
        {showInfo && selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute right-4 top-4 w-72 max-h-[80%] overflow-y-auto z-10"
          >
            <GlassCard className="relative">
              <button
                onClick={() => setShowInfo(false)}
                className="absolute top-2 right-2 text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              {renderNodeDetails()}
            </GlassCard>
          </motion.div>
        )}
      </div>

      {/* Mobile Legend - Inside the fixed container */}
      {isMobile && (
        <div className="shrink-0 py-1 px-1">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[9px]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-[#C6A87C]" />
              <span className="text-white/70">Trust</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-[#A855F7]" />
              <span className="text-white/70">Grantor</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-[#22C55E]" />
              <span className="text-white/70">Trustee</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-[#FBBF24]" />
              <span className="text-white/70">Beneficiary</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-[#EF4444]" />
              <span className="text-white/70">Asset</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-[#0EA5E9]" />
              <span className="text-white/70">Gov</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
