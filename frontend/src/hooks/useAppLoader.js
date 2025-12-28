import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * useAppLoader - Hook to manage app initialization and entitlement loading
 * 
 * Returns:
 * - isBooting: boolean - Initial boot phase
 * - isLoading: boolean - Overall loading state
 * - entitlements: object | null - User's entitlements
 * - planName: string | null - Current plan name
 * - planTier: number | null - Plan tier
 * - error: Error | null - Any loading error
 * - refetch: function - Manually refetch entitlements
 */

export const useAppLoader = () => {
  const [isBooting, setIsBooting] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [entitlements, setEntitlements] = useState(null);
  const [planName, setPlanName] = useState(null);
  const [planTier, setPlanTier] = useState(null);
  const [accountId, setAccountId] = useState(null);
  const [error, setError] = useState(null);

  const fetchEntitlements = useCallback(async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/billing/subscription`);
      const data = response.data;
      
      setEntitlements(data.entitlements || {});
      setPlanName(data.plan_name || 'Free');
      setPlanTier(data.plan_tier ?? 0);
      setAccountId(data.account_id || null);
      setIsBooting(false);
      
      return data;
    } catch (err) {
      console.error('Failed to fetch entitlements:', err);
      setError(err);
      // Set defaults on error
      setEntitlements({});
      setPlanName('Free');
      setPlanTier(0);
      setIsBooting(false);
      return null;
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      await fetchEntitlements();
      // Small delay to allow other resources to load
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    };
    init();
  }, [fetchEntitlements]);

  return {
    isBooting,
    isLoading,
    entitlements,
    planName,
    planTier,
    accountId,
    error,
    refetch: fetchEntitlements
  };
};

export default useAppLoader;
