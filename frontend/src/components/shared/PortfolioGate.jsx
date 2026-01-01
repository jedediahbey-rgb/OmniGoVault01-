/**
 * PortfolioGate - Ensures portfolio context is satisfied before rendering children
 * 
 * Three distinct states (NEVER an infinite spinner):
 * 1. Loading portfolios → Brief skeleton/spinner
 * 2. No portfolios exist → "Create portfolio" CTA
 * 3. Portfolios exist but none selected → "Select portfolio" CTA
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../ui/button';
import { FolderOpen, Plus, CaretRight } from '@phosphor-icons/react';

const API = process.env.REACT_APP_BACKEND_URL;

// Loading skeleton for initial portfolio fetch
const LoadingSkeleton = () => (
  <div className="min-h-[400px] flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-vault-gold/30 border-t-vault-gold rounded-full animate-spin" />
      <span className="text-vault-muted text-sm">Loading portfolios...</span>
    </div>
  </div>
);

// Empty state when no portfolios exist
const NoPortfoliosState = ({ featureName = "this feature" }) => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center">
          <FolderOpen className="w-10 h-10 text-vault-gold" weight="duotone" />
        </div>
        <h2 className="text-2xl font-semibold text-white mb-3">Create a Portfolio to Continue</h2>
        <p className="text-vault-muted mb-6">
          {featureName} requires a portfolio. Create your first portfolio to organize your trust documents, governance records, and more.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => navigate('/vault')}
            className="bg-vault-gold hover:bg-vault-gold/90 text-vault-navy font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" weight="bold" />
            Create Portfolio
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/learn')}
            className="border-vault-gold/30 text-vault-gold hover:bg-vault-gold/10"
          >
            Learn What a Portfolio Is
            <CaretRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Empty state when portfolios exist but none selected
const SelectPortfolioState = ({ onOpenSwitcher, featureName = "this feature" }) => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <FolderOpen className="w-10 h-10 text-blue-400" weight="duotone" />
        </div>
        <h2 className="text-2xl font-semibold text-white mb-3">Select a Portfolio</h2>
        <p className="text-vault-muted mb-6">
          Choose a portfolio to view {featureName}. Your data is organized by portfolio for better trust management.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onOpenSwitcher ? (
            <Button
              onClick={onOpenSwitcher}
              className="bg-vault-gold hover:bg-vault-gold/90 text-vault-navy font-semibold"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Select Portfolio
            </Button>
          ) : (
            <Button
              onClick={() => navigate('/vault')}
              className="bg-vault-gold hover:bg-vault-gold/90 text-vault-navy font-semibold"
            >
              Go to Vault
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * PortfolioGate Component
 * 
 * Props:
 * - children: Content to render when portfolio context is satisfied
 * - featureName: Name of the feature for contextual messaging (e.g., "Governance", "Node Map")
 * - onOpenSwitcher: Optional callback to open portfolio switcher
 * - requireSelection: If true, requires activePortfolioId (default: true)
 */
export default function PortfolioGate({ 
  children, 
  featureName = "this feature",
  onOpenSwitcher,
  requireSelection = true 
}) {
  const [portfolios, setPortfolios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get active portfolio from localStorage
  const activePortfolioId = localStorage.getItem('activePortfolioId') || localStorage.getItem('defaultPortfolioId');

  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await axios.get(`${API}/api/portfolios`, { 
          withCredentials: true 
        });
        
        setPortfolios(response.data || []);
        
        // If we have portfolios but no active one, set the first as default
        if (response.data?.length > 0 && !activePortfolioId) {
          const firstPortfolio = response.data[0];
          localStorage.setItem('activePortfolioId', firstPortfolio.portfolio_id);
          localStorage.setItem('defaultPortfolioId', firstPortfolio.portfolio_id);
        }
      } catch (err) {
        console.error('PortfolioGate: Error fetching portfolios:', err);
        // Don't treat auth errors as "no portfolios" - they should redirect via auth guards
        if (err.response?.status === 401) {
          setError('auth');
        } else {
          setError('fetch');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortfolios();
  }, [activePortfolioId]);

  // State 1: Loading portfolios
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Auth error - let auth guards handle this
  if (error === 'auth') {
    return <LoadingSkeleton />;
  }

  // State 2: No portfolios exist
  if (!portfolios || portfolios.length === 0) {
    return <NoPortfoliosState featureName={featureName} />;
  }

  // State 3: Portfolios exist but none selected (and selection is required)
  if (requireSelection && !activePortfolioId) {
    return <SelectPortfolioState onOpenSwitcher={onOpenSwitcher} featureName={featureName} />;
  }

  // All checks passed - render children
  return children;
}

// Export individual states for custom usage
export { LoadingSkeleton, NoPortfoliosState, SelectPortfolioState };
