import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Hook for fetching and managing audit logs
 */
export function useAuditLogs(clusterId = null) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  // Get current user ID
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Use a dummy user ID for development
      setUserId('dev-user-id');
      return;
    }

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  const fetchLogs = useCallback(
    async (resourceType = null, limit = 100, offset = 0) => {
      if (!userId) return;

      setLoading(true);
      setError(null);

      try {
        const data = await api.getAuditLogs(
          userId,
          clusterId,
          resourceType,
          limit,
          offset
        );
        setLogs(data);
      } catch (err) {
        setError(err.message);
        console.error('Failed to fetch audit logs:', err);
      } finally {
        setLoading(false);
      }
    },
    [userId, clusterId]
  );

  useEffect(() => {
    if (userId) {
      fetchLogs();
    }
  }, [userId, fetchLogs]);

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
  };
}

export default useAuditLogs;
