/**
 * useReactFlowFitView - Reusable hook for React Flow fit-to-viewport behavior
 * 
 * Features:
 * - Calls fitView() reliably after nodes load
 * - Uses ResizeObserver to re-fit on orientation/size changes
 * - Avoids infinite loops/jitter
 * - Mobile-optimized with proper zoom constraints
 */

import { useCallback, useEffect, useRef } from 'react';

const DEFAULT_FIT_OPTIONS = {
  padding: 0.18,
  includeHiddenNodes: true,
  duration: 0,
};

/**
 * Hook to manage React Flow fit-to-viewport behavior
 * @param {Object} options
 * @param {Object} options.reactFlowInstance - The React Flow instance from onInit
 * @param {Array} options.nodes - Current nodes array
 * @param {boolean} options.enabled - Whether fit behavior is enabled
 * @param {Object} options.fitOptions - Custom fitView options
 * @param {number} options.debounceMs - Debounce delay for resize events
 */
export function useReactFlowFitView({
  reactFlowInstance,
  nodes,
  enabled = true,
  fitOptions = DEFAULT_FIT_OPTIONS,
  debounceMs = 150,
}) {
  const containerRef = useRef(null);
  const fitTimeoutRef = useRef(null);
  const lastFitRef = useRef(0);

  // Fit view with debouncing to prevent jitter
  const fitView = useCallback(() => {
    if (!reactFlowInstance || !enabled) return;
    
    const now = Date.now();
    // Prevent fitting more than once per 100ms to avoid jitter
    if (now - lastFitRef.current < 100) return;
    
    lastFitRef.current = now;
    
    // Clear any pending fit
    if (fitTimeoutRef.current) {
      clearTimeout(fitTimeoutRef.current);
    }
    
    fitTimeoutRef.current = setTimeout(() => {
      try {
        reactFlowInstance.fitView(fitOptions);
      } catch (e) {
        console.debug('fitView error:', e);
      }
    }, debounceMs);
  }, [reactFlowInstance, enabled, fitOptions, debounceMs]);

  // Fit when nodes change
  useEffect(() => {
    if (nodes?.length > 0 && reactFlowInstance) {
      // Small delay to ensure nodes are rendered
      const timer = setTimeout(fitView, 50);
      return () => clearTimeout(timer);
    }
  }, [nodes?.length, reactFlowInstance, fitView]);

  // ResizeObserver for container size changes
  useEffect(() => {
    if (!containerRef.current || !enabled) return;

    const resizeObserver = new ResizeObserver(() => {
      fitView();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (fitTimeoutRef.current) {
        clearTimeout(fitTimeoutRef.current);
      }
    };
  }, [enabled, fitView]);

  // Handle orientation changes
  useEffect(() => {
    if (!enabled) return;

    const handleOrientationChange = () => {
      // Delay fit to allow browser to settle
      setTimeout(fitView, 300);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', fitView);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', fitView);
    };
  }, [enabled, fitView]);

  return {
    containerRef,
    fitView,
  };
}

/**
 * Hook to lock body scroll on mobile (for full-viewport pages)
 * @param {boolean} enabled - Whether to lock scroll
 */
export function useBodyScrollLock(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalHeight = document.body.style.height;
    
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.height = '100%';
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.height = originalHeight;
    };
  }, [enabled]);
}

/**
 * Get mobile-optimized React Flow props
 * @param {boolean} isMobile - Whether current viewport is mobile
 * @param {string} type - 'nodeMap' | 'diagramCard'
 */
export function getMobileReactFlowProps(isMobile, type = 'nodeMap') {
  const baseProps = {
    panOnScroll: false,
    zoomOnScroll: false,
    zoomOnPinch: true,
    panOnDrag: true,
    preventScrolling: true,
  };

  if (type === 'nodeMap') {
    return {
      ...baseProps,
      minZoom: isMobile ? 0.15 : 0.2,
      maxZoom: isMobile ? 1.0 : 1.5,
    };
  }

  // Diagram card previews
  return {
    ...baseProps,
    minZoom: 0.1,
    maxZoom: 1.0,
    nodesDraggable: !isMobile, // Disable drag on mobile for cards
    nodesConnectable: false,
    elementsSelectable: !isMobile,
  };
}

/**
 * Calculate deterministic node positions for mobile
 * Uses radial hub-and-spoke layout
 * @param {Array} nodes - Original nodes
 * @param {Object} options - Layout options
 */
export function calculateMobileNodeLayout(nodes, options = {}) {
  const {
    centerX = 200,
    centerY = 200,
    radius = 150,
    nodeWidth = 140,
    nodeHeight = 60,
  } = options;

  if (!nodes?.length) return nodes;

  // Find the central node (trust type or first node)
  const centerNode = nodes.find(n => n.data?.type === 'trust') || nodes[0];
  const otherNodes = nodes.filter(n => n.id !== centerNode?.id);

  // Position center node
  const positionedNodes = [];
  
  if (centerNode) {
    positionedNodes.push({
      ...centerNode,
      position: { x: centerX - nodeWidth / 2, y: centerY - nodeHeight / 2 },
      style: {
        ...centerNode.style,
        width: nodeWidth,
      },
    });
  }

  // Distribute other nodes in a circle around center
  const angleStep = (2 * Math.PI) / Math.max(otherNodes.length, 1);
  
  otherNodes.forEach((node, index) => {
    const angle = index * angleStep - Math.PI / 2; // Start from top
    const x = centerX + radius * Math.cos(angle) - nodeWidth / 2;
    const y = centerY + radius * Math.sin(angle) - nodeHeight / 2;
    
    positionedNodes.push({
      ...node,
      position: { x, y },
      style: {
        ...node.style,
        width: nodeWidth,
      },
    });
  });

  return positionedNodes;
}

export default useReactFlowFitView;
