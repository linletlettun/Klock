import { useState, useCallback } from 'react';
import { api } from '@/services/api';

/**
 * Hook for deploying configurations to Kubernetes and/or Nacos
 */
export function useConfigDeploy() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  /**
   * Deploy ConfigMap to one or more namespaces
   */
  const deployConfigMap = useCallback(
    async (cluster, configmap, dryRun = false) => {
      setLoading(true);
      setError(null);
      setResults(null);

      try {
        let result;
        if (configmap.namespaces && configmap.namespaces.length > 1) {
          result = await api.bulkDeployConfigMap(cluster, configmap, dryRun);
        } else {
          result = await api.deployConfigMap(
            cluster,
            {
              name: configmap.name,
              namespace: configmap.namespaces[0],
              data: configmap.data,
              labels: configmap.labels,
            },
            dryRun
          );
        }
        setResults(result);
        return result;
      } catch (err) {
        setError(err.message);
        console.error('Failed to deploy configmap:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Deploy Secret to one or more namespaces
   */
  const deploySecret = useCallback(
    async (cluster, secret, dryRun = false) => {
      setLoading(true);
      setError(null);
      setResults(null);

      try {
        let result;
        if (secret.namespaces && secret.namespaces.length > 1) {
          result = await api.bulkDeploySecret(cluster, secret, dryRun);
        } else {
          result = await api.deploySecret(
            cluster,
            {
              name: secret.name,
              namespace: secret.namespaces[0],
              data: secret.data,
              secret_type: secret.secret_type,
              labels: secret.labels,
            },
            dryRun
          );
        }
        setResults(result);
        return result;
      } catch (err) {
        setError(err.message);
        console.error('Failed to deploy secret:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Deploy Docker Registry credentials
   */
  const deployDockerRegistry = useCallback(
    async (cluster, docker, dryRun = false) => {
      setLoading(true);
      setError(null);
      setResults(null);

      try {
        const result = await api.deployDockerRegistry(cluster, docker, dryRun);
        setResults(result);
        return result;
      } catch (err) {
        setError(err.message);
        console.error('Failed to deploy docker registry:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Deploy Nacos configuration
   */
  const deployNacosConfig = useCallback(
    async (config, dryRun = false) => {
      setLoading(true);
      setError(null);
      setResults(null);

      try {
        let result;
        if (config.namespaces && config.namespaces.length > 1) {
          result = await api.bulkDeployNacosConfig(config, dryRun);
        } else {
          result = await api.deployNacosConfig(
            {
              data_id: config.data_id,
              group: config.group,
              content: config.content,
              config_type: config.config_type,
            },
            dryRun
          );
        }
        setResults(result);
        return result;
      } catch (err) {
        setError(err.message);
        console.error('Failed to deploy nacos config:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Deploy to both K8s and Nacos simultaneously
   */
  const deployDual = useCallback(
    async (cluster, config, dryRun = false) => {
      setLoading(true);
      setError(null);
      setResults(null);

      try {
        const promises = [];

        if (config.target_system === 'k8s' || config.target_system === 'both') {
          if (config.resource_type === 'configmap') {
            promises.push(deployConfigMap(cluster, config, dryRun));
          } else if (config.resource_type === 'secret') {
            promises.push(deploySecret(cluster, config, dryRun));
          }
        }

        if (config.target_system === 'nacos' || config.target_system === 'both') {
          promises.push(deployNacosConfig(config, dryRun));
        }

        const results = await Promise.allSettled(promises);
        setResults(results);
        return results;
      } catch (err) {
        setError(err.message);
        console.error('Failed to deploy dual:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [deployConfigMap, deploySecret, deployNacosConfig]
  );

  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  return {
    loading,
    error,
    results,
    deployConfigMap,
    deploySecret,
    deployDockerRegistry,
    deployNacosConfig,
    deployDual,
    clearResults,
  };
}

export default useConfigDeploy;
