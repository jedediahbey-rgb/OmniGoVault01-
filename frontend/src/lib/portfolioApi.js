/**
 * Portfolio Context API Helper
 * Centralizes portfolio scoping for all API calls that require portfolio context
 * 
 * Usage:
 *   import { portfolioApi, getActivePortfolioId } from '../lib/portfolioApi';
 *   
 *   // Get documents for active portfolio
 *   const docs = await portfolioApi.get('/api/documents');
 *   
 *   // Override portfolio for specific call
 *   const docs = await portfolioApi.get('/api/documents', { portfolioId: 'port_xxx' });
 */

import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Keys for localStorage
const ACTIVE_PORTFOLIO_KEY = 'activePortfolioId';
const DEFAULT_PORTFOLIO_KEY = 'defaultPortfolioId';

/**
 * Get the currently active portfolio ID
 * Falls back to default portfolio if active is not set
 * @returns {string|null} Portfolio ID or null if none set
 */
export const getActivePortfolioId = () => {
  const active = localStorage.getItem(ACTIVE_PORTFOLIO_KEY);
  if (active) return active;
  
  const defaultPortfolio = localStorage.getItem(DEFAULT_PORTFOLIO_KEY);
  return defaultPortfolio || null;
};

/**
 * Set the active portfolio ID
 * @param {string} portfolioId - The portfolio ID to set as active
 */
export const setActivePortfolioId = (portfolioId) => {
  if (portfolioId) {
    localStorage.setItem(ACTIVE_PORTFOLIO_KEY, portfolioId);
  } else {
    localStorage.removeItem(ACTIVE_PORTFOLIO_KEY);
  }
};

/**
 * Set the default portfolio ID (used as fallback when active is not set)
 * @param {string} portfolioId - The portfolio ID to set as default
 */
export const setDefaultPortfolioId = (portfolioId) => {
  if (portfolioId) {
    localStorage.setItem(DEFAULT_PORTFOLIO_KEY, portfolioId);
  } else {
    localStorage.removeItem(DEFAULT_PORTFOLIO_KEY);
  }
};

/**
 * Clear all portfolio context (used on logout)
 */
export const clearPortfolioContext = () => {
  localStorage.removeItem(ACTIVE_PORTFOLIO_KEY);
  localStorage.removeItem(DEFAULT_PORTFOLIO_KEY);
};

/**
 * Endpoints that require portfolio_id parameter
 * These will have portfolio_id auto-attached
 */
const PORTFOLIO_SCOPED_ENDPOINTS = [
  '/api/documents',
  '/api/vaults',
  '/api/binder/profiles',
  '/api/binder/runs',
  '/api/governance',
  '/api/ledger',
  '/api/assets',
  '/api/parties',
  '/api/notices',
  '/api/mail-events',
  '/api/subject-categories',
  '/api/rm-subjects',
];

/**
 * Check if an endpoint requires portfolio scoping
 * @param {string} url - The API endpoint URL
 * @returns {boolean}
 */
const requiresPortfolioScope = (url) => {
  return PORTFOLIO_SCOPED_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

/**
 * Portfolio-aware API wrapper
 * Automatically attaches portfolio_id to requests that need it
 */
export const portfolioApi = {
  /**
   * GET request with portfolio scoping
   * @param {string} url - API endpoint
   * @param {Object} options - Options including portfolioId override and axios config
   */
  async get(url, options = {}) {
    const { portfolioId, params = {}, ...axiosConfig } = options;
    
    // Get portfolio ID (explicit > active > default)
    const effectivePortfolioId = portfolioId || getActivePortfolioId();
    
    // Add portfolio_id to params if endpoint requires it and we have one
    if (requiresPortfolioScope(url) && effectivePortfolioId) {
      params.portfolio_id = effectivePortfolioId;
    }
    
    return axios.get(`${BACKEND_URL}${url}`, {
      params,
      withCredentials: true,
      ...axiosConfig,
    });
  },

  /**
   * POST request with portfolio scoping
   * @param {string} url - API endpoint
   * @param {Object} data - Request body
   * @param {Object} options - Options including portfolioId override and axios config
   */
  async post(url, data = {}, options = {}) {
    const { portfolioId, params = {}, ...axiosConfig } = options;
    
    // Get portfolio ID
    const effectivePortfolioId = portfolioId || getActivePortfolioId();
    
    // Add portfolio_id to body if endpoint requires it and we have one
    if (requiresPortfolioScope(url) && effectivePortfolioId && !data.portfolio_id) {
      data = { ...data, portfolio_id: effectivePortfolioId };
    }
    
    return axios.post(`${BACKEND_URL}${url}`, data, {
      params,
      withCredentials: true,
      ...axiosConfig,
    });
  },

  /**
   * PUT request with portfolio scoping
   * @param {string} url - API endpoint
   * @param {Object} data - Request body
   * @param {Object} options - Options including portfolioId override and axios config
   */
  async put(url, data = {}, options = {}) {
    const { portfolioId, params = {}, ...axiosConfig } = options;
    
    // Get portfolio ID
    const effectivePortfolioId = portfolioId || getActivePortfolioId();
    
    // Add portfolio_id to body if endpoint requires it and we have one
    if (requiresPortfolioScope(url) && effectivePortfolioId && !data.portfolio_id) {
      data = { ...data, portfolio_id: effectivePortfolioId };
    }
    
    return axios.put(`${BACKEND_URL}${url}`, data, {
      params,
      withCredentials: true,
      ...axiosConfig,
    });
  },

  /**
   * DELETE request with portfolio scoping
   * @param {string} url - API endpoint
   * @param {Object} options - Options including portfolioId override and axios config
   */
  async delete(url, options = {}) {
    const { portfolioId, params = {}, ...axiosConfig } = options;
    
    // Get portfolio ID
    const effectivePortfolioId = portfolioId || getActivePortfolioId();
    
    // Add portfolio_id to params if endpoint requires it and we have one
    if (requiresPortfolioScope(url) && effectivePortfolioId) {
      params.portfolio_id = effectivePortfolioId;
    }
    
    return axios.delete(`${BACKEND_URL}${url}`, {
      params,
      withCredentials: true,
      ...axiosConfig,
    });
  },
};

/**
 * Hook to get portfolio context with reactivity
 * Use this in components that need to react to portfolio changes
 */
export const usePortfolioContext = () => {
  const [activePortfolioId, setActivePortfolio] = useState(getActivePortfolioId());
  
  // Listen for storage changes (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === ACTIVE_PORTFOLIO_KEY || e.key === DEFAULT_PORTFOLIO_KEY) {
        setActivePortfolio(getActivePortfolioId());
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  const setPortfolio = (portfolioId) => {
    setActivePortfolioId(portfolioId);
    setActivePortfolio(portfolioId);
  };
  
  return {
    activePortfolioId,
    setActivePortfolioId: setPortfolio,
    hasPortfolio: !!activePortfolioId,
  };
};

// Need to import useState and useEffect for the hook
import { useState, useEffect } from 'react';

export default portfolioApi;
