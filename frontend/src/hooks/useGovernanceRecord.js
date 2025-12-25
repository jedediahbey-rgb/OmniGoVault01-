/**
 * useGovernanceRecord - Hook for V2 Governance API operations
 * 
 * Provides a unified interface for:
 * - Loading records with revisions
 * - Finalize operations
 * - Amendment workflow (via Amendment Studio)
 * - Revision history
 * - Audit log
 * 
 * Usage:
 * const { record, currentRevision, isFinalized, handleAmend, ... } = useGovernanceRecord(recordId);
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API_V2 = `${process.env.REACT_APP_BACKEND_URL}/api/governance/v2`;

export default function useGovernanceRecord(recordId) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [record, setRecord] = useState(null);
  const [currentRevision, setCurrentRevision] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  // Computed states
  const isFinalized = record?.status === 'finalized';
  const isDraft = record?.status === 'draft';
  const isVoided = record?.status === 'voided';
  const version = currentRevision?.version || 1;
  const contentHash = currentRevision?.content_hash || '';

  // Fetch record and revision data
  const fetchRecord = useCallback(async () => {
    if (!recordId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await axios.get(`${API_V2}/records/${recordId}`);
      const data = res.data.data;

      setRecord(data.record);
      setCurrentRevision(data.current_revision);

      // Also fetch revision history
      const historyRes = await axios.get(`${API_V2}/records/${recordId}/revisions`);
      setRevisions(historyRes.data.data.revisions || []);

    } catch (err) {
      console.error('Error fetching record:', err);
      setError(err.response?.data?.error?.message || 'Failed to load record');
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  // Fetch audit events
  const fetchEvents = useCallback(async () => {
    if (!recordId) return;

    try {
      const res = await axios.get(`${API_V2}/records/${recordId}/events`);
      setEvents(res.data.data.events || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  }, [recordId]);

  // Finalize current draft
  const handleFinalize = useCallback(async () => {
    if (!recordId) return null;

    setSaving(true);
    try {
      const res = await axios.post(`${API_V2}/records/${recordId}/finalize`);
      toast.success('Record finalized successfully');
      await fetchRecord();
      return res.data.data;
    } catch (err) {
      console.error('Error finalizing:', err);
      toast.error(err.response?.data?.error?.message || 'Failed to finalize');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [recordId, fetchRecord]);

  // Create amendment
  const handleAmend = useCallback(async (amendData) => {
    if (!recordId) return null;

    setSaving(true);
    try {
      const res = await axios.post(`${API_V2}/records/${recordId}/amend`, amendData);
      toast.success('Amendment draft created');
      await fetchRecord();
      return res.data.data;
    } catch (err) {
      console.error('Error creating amendment:', err);
      toast.error(err.response?.data?.error?.message || 'Failed to create amendment');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [recordId, fetchRecord]);

  // Update draft revision
  const handleUpdateDraft = useCallback(async (updates) => {
    if (!currentRevision?.id) return null;

    // Check if revision is finalized
    if (currentRevision.finalized_at) {
      toast.error('Cannot edit finalized revision. Create an amendment instead.');
      return null;
    }

    setSaving(true);
    try {
      const res = await axios.patch(`${API_V2}/revisions/${currentRevision.id}`, updates);
      toast.success('Draft saved');
      await fetchRecord();
      return res.data.data;
    } catch (err) {
      console.error('Error updating draft:', err);
      
      // Handle 409 Conflict specifically
      if (err.response?.status === 409) {
        toast.error('This revision is finalized and cannot be edited. Create an amendment instead.');
      } else {
        toast.error(err.response?.data?.error?.message || 'Failed to save');
      }
      throw err;
    } finally {
      setSaving(false);
    }
  }, [currentRevision, fetchRecord]);

  // Finalize amendment revision
  const handleFinalizeAmendment = useCallback(async () => {
    if (!currentRevision?.id) return null;

    setSaving(true);
    try {
      const res = await axios.post(`${API_V2}/revisions/${currentRevision.id}/finalize`);
      toast.success('Amendment finalized');
      await fetchRecord();
      return res.data.data;
    } catch (err) {
      console.error('Error finalizing amendment:', err);
      toast.error(err.response?.data?.error?.message || 'Failed to finalize amendment');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [currentRevision, fetchRecord]);

  // Void record
  const handleVoid = useCallback(async (voidReason) => {
    if (!recordId || !voidReason) return null;

    setSaving(true);
    try {
      const res = await axios.post(`${API_V2}/records/${recordId}/void`, {
        void_reason: voidReason
      });
      toast.success('Record voided');
      await fetchRecord();
      return res.data.data;
    } catch (err) {
      console.error('Error voiding:', err);
      toast.error(err.response?.data?.error?.message || 'Failed to void');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [recordId, fetchRecord]);

  // Get diff between revisions
  const getDiff = useCallback(async (revisionId, compareToId = null) => {
    try {
      const url = compareToId
        ? `${API_V2}/revisions/${revisionId}/diff?compare_to=${compareToId}`
        : `${API_V2}/revisions/${revisionId}/diff`;
      const res = await axios.get(url);
      return res.data.data;
    } catch (err) {
      console.error('Error getting diff:', err);
      toast.error('Failed to get revision comparison');
      throw err;
    }
  }, []);

  // Get a specific revision
  const getRevision = useCallback(async (revisionId) => {
    try {
      const res = await axios.get(`${API_V2}/revisions/${revisionId}`);
      return res.data.data;
    } catch (err) {
      console.error('Error getting revision:', err);
      toast.error('Failed to load revision');
      throw err;
    }
  }, []);

  return {
    // State
    loading,
    saving,
    error,
    record,
    currentRevision,
    revisions,
    events,

    // Computed
    isFinalized,
    isDraft,
    isVoided,
    version,
    contentHash,
    revisionCount: revisions.length,

    // Actions
    fetchRecord,
    fetchEvents,
    handleFinalize,
    handleAmend,
    handleUpdateDraft,
    handleFinalizeAmendment,
    handleVoid,
    getDiff,
    getRevision,
  };
}
