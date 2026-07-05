import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export function useClusters() {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    fetchClusters();

    let subscription;
    try {
      subscription = supabase
        .channel('clusters')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clusters' }, () => {
          fetchClusters();
        })
        .subscribe();
    } catch (err) {
      console.error('Failed to subscribe to clusters:', err);
    }

    return () => {
      if (subscription) {
        try { subscription.unsubscribe(); } catch (e) {}
      }
    };
  }, []);

  async function fetchClusters() {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('clusters')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClusters(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function addCluster(clusterData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('clusters')
        .insert([{ ...clusterData, user_id: user.id, status: 'pending' }])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  }

  async function updateCluster(id, updates) {
    try {
      const { data, error } = await supabase
        .from('clusters')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  }

  async function deleteCluster(id) {
    try {
      const { error } = await supabase
        .from('clusters')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  }

  async function testConnection(apiServer, token, caCert) {
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Test basic connectivity
      const response = await fetch(`${apiServer}/api/v1`, { headers });
      if (!response.ok) {
        return { success: false, status: response.status };
      }

      // Fetch K8s version from /version endpoint
      let k8sVersion = null;
      try {
        const versionRes = await fetch(`${apiServer}/version`, { headers });
        if (versionRes.ok) {
          const versionData = await versionRes.json();
          k8sVersion = versionData.gitVersion || versionData.major + '.' + versionData.minor;
        }
      } catch {
        // Version fetch failed, not critical
      }

      return { success: true, status: response.status, k8sVersion };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  return {
    clusters,
    loading,
    error,
    addCluster,
    updateCluster,
    deleteCluster,
    testConnection,
    refetch: fetchClusters,
  };
}

export default useClusters;
