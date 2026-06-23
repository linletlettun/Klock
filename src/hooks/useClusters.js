import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useClusters() {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchClusters();

    const subscription = supabase
      .channel('clusters')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clusters' }, () => {
        fetchClusters();
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  async function fetchClusters() {
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
      const response = await fetch(`${apiServer}/api/v1`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return { success: response.ok, status: response.status };
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
