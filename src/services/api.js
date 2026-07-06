const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Backend API client for Klock Configuration Management
 */
export const api = {
  /**
   * Health check
   */
  async healthCheck() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Backend health check failed');
    return res.json();
  },

  /**
   * Namespaces
   */
  async getNamespaces(cluster, includeSystem = false) {
    const res = await fetch(
      `${API_BASE}/api/clusters/namespaces?include_system=${includeSystem}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_server: cluster.api_server,
          token: cluster.service_account_token,
          ca_cert: cluster.ca_cert,
        }),
      }
    );
    if (!res.ok) throw new Error('Failed to fetch namespaces');
    return res.json();
  },

  /**
   * ConfigMaps
   */
  async getConfigMaps(cluster, namespace = null) {
    const params = namespace ? `?namespace=${namespace}` : '';
    const res = await fetch(
      `${API_BASE}/api/clusters/configmaps${params}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_server: cluster.api_server,
          token: cluster.service_account_token,
          ca_cert: cluster.ca_cert,
        }),
      }
    );
    if (!res.ok) throw new Error('Failed to fetch configmaps');
    return res.json();
  },

  async getConfigMap(cluster, namespace, name) {
    const res = await fetch(
      `${API_BASE}/api/clusters/configmaps/${namespace}/${name}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_server: cluster.api_server,
          token: cluster.service_account_token,
          ca_cert: cluster.ca_cert,
        }),
      }
    );
    if (!res.ok) throw new Error('Failed to fetch configmap');
    return res.json();
  },

  async deployConfigMap(cluster, configmap, dryRun = false) {
    const params = dryRun ? '?dry_run=true' : '';
    const res = await fetch(
      `${API_BASE}/api/clusters/configmaps${params}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: {
            api_server: cluster.api_server,
            token: cluster.service_account_token,
            ca_cert: cluster.ca_cert,
          },
          ...configmap,
        }),
      }
    );
    if (!res.ok) throw new Error('Failed to deploy configmap');
    return res.json();
  },

  async bulkDeployConfigMap(cluster, configmap, dryRun = false) {
    const params = dryRun ? '?dry_run=true' : '';
    const res = await fetch(
      `${API_BASE}/api/clusters/configmaps/bulk${params}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: {
            api_server: cluster.api_server,
            token: cluster.service_account_token,
            ca_cert: cluster.ca_cert,
          },
          ...configmap,
        }),
      }
    );
    if (!res.ok) throw new Error('Failed to bulk deploy configmap');
    return res.json();
  },

  /**
   * Secrets
   */
  async getSecrets(cluster, namespace = null) {
    const params = namespace ? `?namespace=${namespace}` : '';
    const res = await fetch(
      `${API_BASE}/api/clusters/secrets${params}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_server: cluster.api_server,
          token: cluster.service_account_token,
          ca_cert: cluster.ca_cert,
        }),
      }
    );
    if (!res.ok) throw new Error('Failed to fetch secrets');
    return res.json();
  },

  async getSecret(cluster, namespace, name) {
    const res = await fetch(
      `${API_BASE}/api/clusters/secrets/${namespace}/${name}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_server: cluster.api_server,
          token: cluster.service_account_token,
          ca_cert: cluster.ca_cert,
        }),
      }
    );
    if (!res.ok) throw new Error('Failed to fetch secret');
    return res.json();
  },

  async deploySecret(cluster, secret, dryRun = false) {
    const params = dryRun ? '?dry_run=true' : '';
    const res = await fetch(
      `${API_BASE}/api/clusters/secrets${params}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: {
            api_server: cluster.api_server,
            token: cluster.service_account_token,
            ca_cert: cluster.ca_cert,
          },
          ...secret,
        }),
      }
    );
    if (!res.ok) throw new Error('Failed to deploy secret');
    return res.json();
  },

  async bulkDeploySecret(cluster, secret, dryRun = false) {
    const params = dryRun ? '?dry_run=true' : '';
    const res = await fetch(
      `${API_BASE}/api/clusters/secrets/bulk${params}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: {
            api_server: cluster.api_server,
            token: cluster.service_account_token,
            ca_cert: cluster.ca_cert,
          },
          ...secret,
        }),
      }
    );
    if (!res.ok) throw new Error('Failed to bulk deploy secret');
    return res.json();
  },

  async deployDockerRegistry(cluster, docker, dryRun = false) {
    const params = dryRun ? '?dry_run=true' : '';
    const res = await fetch(
      `${API_BASE}/api/clusters/secrets/docker${params}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: {
            api_server: cluster.api_server,
            token: cluster.service_account_token,
            ca_cert: cluster.ca_cert,
          },
          ...docker,
        }),
      }
    );
    if (!res.ok) throw new Error('Failed to deploy docker registry secret');
    return res.json();
  },

  /**
   * Nacos
   */
  async getNacosConfigs(group = null) {
    const params = group ? `?group=${group}` : '';
    const res = await fetch(`${API_BASE}/api/nacos/configs${params}`);
    if (!res.ok) throw new Error('Failed to fetch nacos configs');
    return res.json();
  },

  async getNacosConfig(dataId, group = 'DEFAULT_GROUP') {
    const res = await fetch(
      `${API_BASE}/api/nacos/configs/${dataId}?group=${group}`
    );
    if (!res.ok) throw new Error('Failed to fetch nacos config');
    return res.json();
  },

  async deployNacosConfig(config, dryRun = false) {
    const params = dryRun ? '?dry_run=true' : '';
    const res = await fetch(
      `${API_BASE}/api/nacos/configs${params}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      }
    );
    if (!res.ok) throw new Error('Failed to deploy nacos config');
    return res.json();
  },

  async bulkDeployNacosConfig(config, dryRun = false) {
    const params = dryRun ? '?dry_run=true' : '';
    const res = await fetch(
      `${API_BASE}/api/nacos/configs/bulk${params}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      }
    );
    if (!res.ok) throw new Error('Failed to bulk deploy nacos config');
    return res.json();
  },

  /**
   * Audit Logs
   */
  async getAuditLogs(userId, clusterId = null, resourceType = null, limit = 100, offset = 0) {
    const params = new URLSearchParams({ user_id: userId, limit, offset });
    if (clusterId) params.append('cluster_id', clusterId);
    if (resourceType) params.append('resource_type', resourceType);

    const res = await fetch(`${API_BASE}/api/audit?${params}`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  async createAuditLog(userId, log) {
    const res = await fetch(`${API_BASE}/api/audit?user_id=${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    });
    if (!res.ok) throw new Error('Failed to create audit log');
    return res.json();
  },

  // ── Cluster Management ──────────────────────────────────

  async listClusters() {
    const res = await fetch(`${API_BASE}/api/cluster`);
    if (!res.ok) throw new Error('Failed to fetch clusters');
    return res.json();
  },

  async getCluster(clusterId) {
    const res = await fetch(`${API_BASE}/api/cluster/${clusterId}`);
    if (!res.ok) throw new Error('Failed to fetch cluster');
    return res.json();
  },

  async createCluster(cluster) {
    const res = await fetch(`${API_BASE}/api/cluster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cluster),
    });
    if (!res.ok) throw new Error('Failed to create cluster');
    return res.json();
  },

  async updateCluster(clusterId, updates) {
    const res = await fetch(`${API_BASE}/api/cluster/${clusterId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update cluster');
    return res.json();
  },

  async deleteCluster(clusterId) {
    const res = await fetch(`${API_BASE}/api/cluster/${clusterId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete cluster');
    return res.json();
  },

  async testClusterConnection(testData) {
    const res = await fetch(`${API_BASE}/api/cluster/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });
    if (!res.ok) throw new Error('Failed to test connection');
    return res.json();
  },

  // ── Settings ────────────────────────────────────────────

  async getSettings() {
    const res = await fetch(`${API_BASE}/api/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings) {
    const res = await fetch(`${API_BASE}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  // ── ArgoCD ──────────────────────────────────────────────

  async listArgoCDApps() {
    const res = await fetch(`${API_BASE}/api/argocd/applications`);
    if (!res.ok) throw new Error('Failed to fetch ArgoCD apps');
    return res.json();
  },

  async getArgoCDApp(name) {
    const res = await fetch(`${API_BASE}/api/argocd/applications/${name}`);
    if (!res.ok) throw new Error('Failed to fetch ArgoCD app');
    return res.json();
  },

  async syncArgoCDApp(name) {
    const res = await fetch(`${API_BASE}/api/argocd/applications/${name}/sync`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to sync ArgoCD app');
    return res.json();
  },

  async rollbackArgoCDApp(name, revision) {
    const res = await fetch(`${API_BASE}/api/argocd/applications/${name}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revision }),
    });
    if (!res.ok) throw new Error('Failed to rollback ArgoCD app');
    return res.json();
  },

  async createArgoCDApp(appConfig) {
    const res = await fetch(`${API_BASE}/api/argocd/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appConfig),
    });
    if (!res.ok) throw new Error('Failed to create ArgoCD app');
    return res.json();
  },

  // ── GitOps ──────────────────────────────────────────────

  async gitopsSync(syncRequest) {
    const res = await fetch(`${API_BASE}/api/gitops/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncRequest),
    });
    if (!res.ok) throw new Error('Failed to sync');
    return res.json();
  },

  async gitopsPreview(syncRequest) {
    const res = await fetch(`${API_BASE}/api/gitops/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncRequest),
    });
    if (!res.ok) throw new Error('Failed to preview manifest');
    return res.json();
  },

  // ── Monitoring ──────────────────────────────────────────

  async getMonitorSummary() {
    const res = await fetch(`${API_BASE}/api/monitor/summary`);
    if (!res.ok) throw new Error('Failed to fetch monitor summary');
    return res.json();
  },

  // TLS
  async listTLS() {
    const res = await fetch(`${API_BASE}/api/monitor/tls`);
    if (!res.ok) throw new Error('Failed to fetch TLS certs');
    return res.json();
  },

  async checkTLS(host, port = 443, name = null) {
    const params = new URLSearchParams({ host, port });
    if (name) params.append('name', name);
    const res = await fetch(`${API_BASE}/api/monitor/tls/check?${params}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to check TLS');
    return res.json();
  },

  async checkTLSSecret(clusterId, namespace, secretName) {
    const params = new URLSearchParams({ cluster_id: clusterId, namespace, secret_name: secretName });
    const res = await fetch(`${API_BASE}/api/monitor/tls/check-secret?${params}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to check TLS secret');
    return res.json();
  },

  // Tokens
  async listTokens() {
    const res = await fetch(`${API_BASE}/api/monitor/tokens`);
    if (!res.ok) throw new Error('Failed to fetch tokens');
    return res.json();
  },

  async checkClusterToken(clusterId) {
    const res = await fetch(`${API_BASE}/api/monitor/tokens/check-cluster?cluster_id=${clusterId}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to check cluster token');
    return res.json();
  },

  async checkCustomToken(name, token, tokenType = 'generic', clusterId = '', expiresAt = null) {
    const params = new URLSearchParams({ name, token, token_type: tokenType, cluster_id: clusterId });
    if (expiresAt) params.append('expires_at', expiresAt);
    const res = await fetch(`${API_BASE}/api/monitor/tokens/check-custom?${params}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to check token');
    return res.json();
  },

  // Cluster Health
  async listClusterHealth() {
    const res = await fetch(`${API_BASE}/api/monitor/health`);
    if (!res.ok) throw new Error('Failed to fetch health');
    return res.json();
  },

  async pingCluster(clusterId) {
    const res = await fetch(`${API_BASE}/api/monitor/health/ping?cluster_id=${clusterId}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to ping cluster');
    return res.json();
  },

  async pingAllClusters() {
    const res = await fetch(`${API_BASE}/api/monitor/health/ping-all`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to ping all clusters');
    return res.json();
  },

  // Kafka
  async listKafka() {
    const res = await fetch(`${API_BASE}/api/monitor/kafka`);
    if (!res.ok) throw new Error('Failed to fetch Kafka keys');
    return res.json();
  },

  async checkKafka(clusterId, namespace, secretName, keyType = 'sasl-plain') {
    const params = new URLSearchParams({
      cluster_id: clusterId, namespace, secret_name: secretName, key_type: keyType,
    });
    const res = await fetch(`${API_BASE}/api/monitor/kafka/check?${params}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to check Kafka');
    return res.json();
  },

  // ── Alerts ──────────────────────────────────────────────

  async getAlertConfig() {
    const res = await fetch(`${API_BASE}/api/alert/config`);
    if (!res.ok) throw new Error('Failed to fetch alert config');
    return res.json();
  },

  async updateAlertConfig(config) {
    const res = await fetch(`${API_BASE}/api/alert/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Failed to update alert config');
    return res.json();
  },

  async getAlertHistory(limit = 50) {
    const res = await fetch(`${API_BASE}/api/alert/history?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch alert history');
    return res.json();
  },

  async checkAlerts() {
    const res = await fetch(`${API_BASE}/api/alert/check`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to check alerts');
    return res.json();
  },

  async testAlert(channel, recipient = null) {
    const res = await fetch(`${API_BASE}/api/alert/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, recipient }),
    });
    if (!res.ok) throw new Error('Failed to send test alert');
    return res.json();
  },

  // ── Deployments ──────────────────────────────────────────

  async listPlatforms() {
    const res = await fetch(`${API_BASE}/api/deploy/platforms`);
    if (!res.ok) throw new Error('Failed to fetch platforms');
    return res.json();
  },

  async triggerDeployment(config) {
    const res = await fetch(`${API_BASE}/api/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Failed to trigger deployment');
    return res.json();
  },

  async listDeployments(platform = null) {
    const params = platform ? `?platform=${platform}` : '';
    const res = await fetch(`${API_BASE}/api/deploy${params}`);
    if (!res.ok) throw new Error('Failed to fetch deployments');
    return res.json();
  },

  async refreshDeployments() {
    const res = await fetch(`${API_BASE}/api/deploy/refresh`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to refresh deployments');
    return res.json();
  },

  async getDeployment(deployId) {
    const res = await fetch(`${API_BASE}/api/deploy/${deployId}`);
    if (!res.ok) throw new Error('Failed to fetch deployment');
    return res.json();
  },

  async cancelDeployment(deployId) {
    const res = await fetch(`${API_BASE}/api/deploy/${deployId}/cancel`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to cancel deployment');
    return res.json();
  },

  async redeploy(deployId) {
    const res = await fetch(`${API_BASE}/api/deploy/${deployId}/redeploy`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to redeploy');
    return res.json();
  },

  async promoteDeployment(deployId) {
    const res = await fetch(`${API_BASE}/api/deploy/${deployId}/promote`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to promote deployment');
    return res.json();
  },

  async deleteDeployment(deployId) {
    const res = await fetch(`${API_BASE}/api/deploy/${deployId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete deployment');
    return res.json();
  },

  async testVercel() {
    const res = await fetch(`${API_BASE}/api/deploy/vercel/test`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to test Vercel connection');
    return res.json();
  },
};

export default api;
