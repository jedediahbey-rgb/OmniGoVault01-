import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const BillingContext = createContext(null);

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
};

export const BillingProvider = ({ children }) => {
  const [subscription, setSubscription] = useState(null);
  const [entitlements, setEntitlements] = useState({});
  const [usage, setUsage] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchBillingData = useCallback(async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/billing/subscription`, {
        withCredentials: true
      });
      setSubscription(response.data);
      setEntitlements(response.data.entitlements || {});
      setUsage(response.data.usage || {});
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  // Check if a feature is enabled
  const hasFeature = useCallback((featureKey) => {
    const key = featureKey.startsWith('features.') ? featureKey : `features.${featureKey}.enabled`;
    return Boolean(entitlements[key]);
  }, [entitlements]);

  // Get a numeric limit
  const getLimit = useCallback((limitKey) => {
    const value = entitlements[limitKey];
    if (value === -1 || value === undefined) return Infinity;
    return value;
  }, [entitlements]);

  // Check if user can perform an action (within limits)
  const canPerform = useCallback(async (action) => {
    try {
      let endpoint = '';
      switch (action) {
        case 'create_vault':
          endpoint = '/api/billing/check/vaults';
          break;
        case 'invite_member':
          endpoint = '/api/billing/check/members';
          break;
        default:
          return { allowed: true };
      }
      
      const response = await axios.get(`${BACKEND_URL}${endpoint}`);
      return response.data;
    } catch (error) {
      console.error('Error checking permission:', error);
      return { allowed: false, error: error.message };
    }
  }, []);

  // Get current plan tier
  const getPlanTier = useCallback(() => {
    return subscription?.plan_tier || 0;
  }, [subscription]);

  // Check if user is on free plan
  const isFreePlan = useCallback(() => {
    return getPlanTier() === 0;
  }, [getPlanTier]);

  // Refresh billing data
  const refresh = useCallback(() => {
    setLoading(true);
    return fetchBillingData();
  }, [fetchBillingData]);

  const value = {
    subscription,
    entitlements,
    usage,
    loading,
    hasFeature,
    getLimit,
    canPerform,
    getPlanTier,
    isFreePlan,
    refresh
  };

  return (
    <BillingContext.Provider value={value}>
      {children}
    </BillingContext.Provider>
  );
};

export default BillingContext;
