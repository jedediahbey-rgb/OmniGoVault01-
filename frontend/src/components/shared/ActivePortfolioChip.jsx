/**
 * ActivePortfolioChip - Global indicator showing currently active portfolio
 * Displays in header across all portfolio-scoped pages
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, CaretDown, Check } from '@phosphor-icons/react';
import axios from 'axios';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const API = process.env.REACT_APP_BACKEND_URL;

export default function ActivePortfolioChip({ user }) {
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState([]);
  const [activePortfolio, setActivePortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get active portfolio ID from localStorage
  const activePortfolioId = localStorage.getItem('activePortfolioId') || localStorage.getItem('defaultPortfolioId');

  useEffect(() => {
    const fetchPortfolios = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await axios.get(`${API}/api/portfolios`, { withCredentials: true });
        setPortfolios(response.data || []);
        
        // Find active portfolio
        if (activePortfolioId && response.data) {
          const active = response.data.find(p => p.portfolio_id === activePortfolioId);
          setActivePortfolio(active || null);
        }
      } catch (error) {
        console.error('Error fetching portfolios:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolios();
  }, [user, activePortfolioId]);

  // Handle portfolio switch
  const handlePortfolioSwitch = (portfolio) => {
    localStorage.setItem('activePortfolioId', portfolio.portfolio_id);
    localStorage.setItem('defaultPortfolioId', portfolio.portfolio_id);
    setActivePortfolio(portfolio);
    
    // Dispatch storage event for cross-component sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'activePortfolioId',
      newValue: portfolio.portfolio_id
    }));
    
    // Reload current page to refresh data
    window.location.reload();
  };

  // Don't show if no user or no portfolios
  if (!user || loading) {
    return null;
  }

  if (portfolios.length === 0) {
    return (
      <button
        onClick={() => navigate('/vault')}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-vault-gold/10 border border-vault-gold/30 hover:bg-vault-gold/20 transition-colors"
      >
        <FolderOpen className="w-4 h-4 text-vault-gold" weight="duotone" />
        <span className="text-sm text-vault-gold">Create Portfolio</span>
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-vault-gold/10 border border-vault-gold/30 hover:bg-vault-gold/20 transition-colors max-w-[200px]">
          <FolderOpen className="w-4 h-4 text-vault-gold flex-shrink-0" weight="duotone" />
          <span className="text-sm text-white truncate">
            {activePortfolio?.name || 'Select Portfolio'}
          </span>
          <CaretDown className="w-3 h-3 text-vault-gold/70 flex-shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-64 bg-vault-dark border-vault-gold/20"
      >
        <div className="px-2 py-1.5 text-xs text-vault-muted font-medium uppercase tracking-wider">
          Switch Portfolio
        </div>
        <DropdownMenuSeparator className="bg-vault-gold/10" />
        {portfolios.map((portfolio) => (
          <DropdownMenuItem
            key={portfolio.portfolio_id}
            onClick={() => handlePortfolioSwitch(portfolio)}
            className="flex items-center justify-between cursor-pointer hover:bg-vault-gold/10"
          >
            <span className="text-white truncate">{portfolio.name}</span>
            {portfolio.portfolio_id === activePortfolioId && (
              <Check className="w-4 h-4 text-vault-gold" weight="bold" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-vault-gold/10" />
        <DropdownMenuItem
          onClick={() => navigate('/vault')}
          className="text-vault-gold hover:bg-vault-gold/10 cursor-pointer"
        >
          <FolderOpen className="w-4 h-4 mr-2" />
          Manage Portfolios
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
