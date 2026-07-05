import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';

/**
 * Hook for fetching and managing Kubernetes namespaces
 */
export function useNamespaces(cluster) {
  const [namespaces, setNamespaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNamespaces = useCallback(
    async (includeSystem = false) => {
      if (!cluster) return;

      setLoading(true);
      setError(null);

      try {
        const data = await api.getNamespaces(cluster, includeSystem);
        setNamespaces(data);
      } catch (err) {
        setError(err.message);
        console.error('Failed to fetch namespaces:', err);
      } finally {
        setLoading(false);
      }
    },
    [cluster]
  );

  useEffect(() => {
    if (cluster) {
      fetchNamespaces();
    }
  }, [cluster, fetchNamespaces]);

  return {
    namespaces,
    loading,
    error,
    refetch: fetchNamespaces,
  };
}

export default useNamespaces;
