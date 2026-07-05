import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  fetchNamespaces,
  createConfigMap,
  createSecret,
  fetchConfigMaps,
  fetchSecrets,
} from '@/services/k8s';

export function useK8sResources() {
  const [clusters, setClusters] = useState([]);
  const [namespaces, setNamespaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch connected clusters from Supabase
  useEffect(() => {
    async function loadClusters() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('clusters')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'connected');

        if (error) throw error;
        setClusters(data || []);
      } catch (err) {
        console.error('Failed to load clusters:', err);
      }
    }
    loadClusters();
  }, []);

  // Fetch namespaces for a selected cluster
  const loadNamespaces = useCallback(async (cluster) => {
    if (!cluster) {
      setNamespaces([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const ns = await fetchNamespaces(cluster.api_server, cluster.service_account_token);
      setNamespaces(ns.map((n) => n.metadata?.name).filter(Boolean));
    } catch (err) {
      setError(err.message);
      setNamespaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create ConfigMap on cluster
  const deployConfigMap = useCallback(async (cluster, namespace, name, data) => {
    try {
      setLoading(true);
      setError(null);

      const configmap = {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: { name, namespace },
        data,
      };

      const result = await createConfigMap(
        cluster.api_server,
        cluster.service_account_token,
        namespace,
        configmap
      );

      // Save to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('configmaps').insert({
          user_id: user.id,
          cluster_id: cluster.id,
          namespace,
          name,
          data,
        });
      }

      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Create Secret on cluster
  const deploySecret = useCallback(async (cluster, namespace, name, data, type = 'Opaque') => {
    try {
      setLoading(true);
      setError(null);

      // Base64 encode secret values
      const encodedData = {};
      Object.entries(data).forEach(([key, value]) => {
        encodedData[key] = btoa(value);
      });

      const secret = {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: { name, namespace },
        type,
        data: encodedData,
      };

      const result = await createSecret(
        cluster.api_server,
        cluster.service_account_token,
        namespace,
        secret
      );

      // Save to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('secrets').insert({
          user_id: user.id,
          cluster_id: cluster.id,
          namespace,
          name,
          data,
        });
      }

      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    clusters,
    namespaces,
    loading,
    error,
    loadNamespaces,
    deployConfigMap,
    deploySecret,
  };
}
