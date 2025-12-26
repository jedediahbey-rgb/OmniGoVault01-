import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom styles to hide React Flow attribution and optimize mobile
const reactFlowStyles = `
  .react-flow__attribution {
    display: none !important;
  }
  .react-flow__minimap {
    width: 120px !important;
    height: 80px !important;
  }
  @media (max-width: 768px) {
    .react-flow__minimap {
      width: 100px !important;
      height: 65px !important;
    }
    .react-flow__controls {
      transform: scale(0.85);
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

// Node style configurations
const nodeStyles = {
  trust: {
    background: 'linear-gradient(135deg, rgba(198, 168, 124, 0.3) 0%, rgba(198, 168, 124, 0.15) 100%)',
    border: '2px solid rgba(198, 168, 124, 0.6)',
    color: '#C6A87C',
    padding: '20px 28px',
    borderRadius: '16px',
    fontSize: '15px',
    fontWeight: 600,
    minWidth: '180px',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(198, 168, 124, 0.2)',
  },
  party: {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
    border: '2px solid rgba(59, 130, 246, 0.5)',
    color: '#3B82F6',
    padding: '16px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 500,
    minWidth: '150px',
    textAlign: 'center',
  },
  grantor: {
    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.1) 100%)',
    border: '2px solid rgba(168, 85, 247, 0.5)',
    color: '#A855F7',
    padding: '16px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 500,
    minWidth: '150px',
    textAlign: 'center',
  },
  trustee: {
    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)',
    border: '2px solid rgba(34, 197, 94, 0.5)',
    color: '#22C55E',
    padding: '16px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 500,
    minWidth: '150px',
    textAlign: 'center',
  },
  beneficiary: {
    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(251, 191, 36, 0.1) 100%)',
    border: '2px solid rgba(251, 191, 36, 0.5)',
    color: '#FBBF24',
    padding: '16px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 500,
    minWidth: '150px',
    textAlign: 'center',
  },
  asset: {
    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%)',
    border: '2px solid rgba(239, 68, 68, 0.5)',
    color: '#EF4444',
    padding: '14px 20px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 500,
    minWidth: '130px',
    textAlign: 'center',
  },
  governance: {
    background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(14, 165, 233, 0.1) 100%)',
    border: '2px solid rgba(14, 165, 233, 0.5)',
    color: '#0EA5E9',
    padding: '14px 20px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 500,
    minWidth: '130px',
    textAlign: 'center',
  },
};

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
  const navigate = useNavigate();
  const { portfolioId } = useParams();
  
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

    // Responsive layout constants - more compact for mobile
    const centerX = isMobile ? 300 : 450;
    const centerY = isMobile ? 200 : 280;
    const horizontalSpacing = isMobile ? 150 : 220;
    const verticalSpacing = isMobile ? 100 : 140;

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
        position: { x: 80 + idx * 160, y: centerY + verticalSpacing + 100 },
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

    // Assets below trust - evenly distributed
    const assetCount = Math.min(assets.length, 5);
    const assetSpacing = 150;
    const assetStartX = centerX - ((assetCount - 1) * assetSpacing) / 2;
    assets.slice(0, 5).forEach((asset, idx) => {
      const nodeId = `asset-${asset.asset_id}`;
      newNodes.push({
        id: nodeId,
        type: 'default',
        data: { 
          label: `🏠 ${asset.description?.slice(0, 18) || 'Asset'}${asset.description?.length > 18 ? '...' : ''}`,
          asset,
          type: 'asset',
        },
        position: { x: assetStartX + idx * assetSpacing, y: centerY + verticalSpacing + 60 },
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
    const govStartX = centerX + horizontalSpacing - 60;
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
        position: { x: govStartX + idx * 130, y: centerY + verticalSpacing + 60 },
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
        position: { x: centerX - horizontalSpacing - 80, y: centerY },
        style: { ...nodeStyles.grantor, opacity: 0.5, border: '2px dashed rgba(168, 85, 247, 0.3)' },
      });
      newNodes.push({
        id: 'placeholder-trustee',
        type: 'default',
        data: { label: '+ Add Trustee', type: 'placeholder' },
        position: { x: centerX, y: centerY - verticalSpacing - 40 },
        style: { ...nodeStyles.trustee, opacity: 0.5, border: '2px dashed rgba(34, 197, 94, 0.3)' },
      });
      newNodes.push({
        id: 'placeholder-beneficiary',
        type: 'default',
        data: { label: '+ Add Beneficiary', type: 'placeholder' },
        position: { x: centerX + horizontalSpacing + 100, y: centerY },
        style: { ...nodeStyles.beneficiary, opacity: 0.5, border: '2px dashed rgba(251, 191, 36, 0.3)' },
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [loading, selectedPortfolio, portfolios, trustProfile, parties, assets, governanceRecords, setNodes, setEdges]);

  const onNodeClick = useCallback((event, node) => {
    if (node.data.type === 'placeholder') {
      navigate(`/vault/trust-profile?portfolio=${selectedPortfolio}`);
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
            to={`/vault/trust-profile?portfolio=${selectedPortfolio}`}
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
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <Link
            to="/vault"
            className="flex items-center gap-2 text-vault-gold hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div>
            <h1 className="text-2xl font-heading text-white">Trust Node Map</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-white/50 text-sm">Visual representation of trust relationships</p>
              <PageHelpTooltip pageKey="nodeMap" />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
            <SelectTrigger className="w-[200px] bg-vault-dark border-vault-gold/30">
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
            onClick={() => navigate(`/vault/trust-profile?portfolio=${selectedPortfolio}`)}
            variant="outline"
            className="border-vault-gold/30 text-vault-gold hover:bg-vault-gold/10"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Party
          </Button>
        </div>
      </div>

      <div className="flex-1 relative rounded-xl overflow-hidden border border-white/10">
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
            fitView
            fitViewOptions={{ padding: 0.2, minZoom: 0.5, maxZoom: 1.5 }}
            minZoom={0.3}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            style={{ background: 'rgba(11, 18, 33, 0.95)' }}
          >
            <Controls 
              position="bottom-right"
              showInteractive={false}
              className="!bg-vault-dark/90 !border-vault-gold/30 !rounded-lg !shadow-lg [&>button]:!bg-vault-dark/90 [&>button]:!border-vault-gold/30 [&>button]:!text-vault-gold [&>button:hover]:!bg-vault-gold/20 [&>button]:!w-8 [&>button]:!h-8"
            />
            <MiniMap 
              style={{ 
                backgroundColor: 'rgba(11, 18, 33, 0.9)',
                border: '1px solid rgba(198, 168, 124, 0.3)',
                borderRadius: '8px',
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
              position="top-right"
              pannable
              zoomable
            />
            <Background color="rgba(255,255,255,0.05)" gap={25} />
            
            {/* Legend Panel */}
            <Panel position="bottom-left" className="!m-3 !mb-4">
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

      <div className="mt-3 text-center text-white/40 text-sm">
        Click on nodes for details • Drag to rearrange • Scroll to zoom
      </div>
    </div>
  );
}
