import { useState, useEffect } from 'react';
import useClusters from '@/hooks/useClusters';
import { useApplications } from '@/hooks/useApplications';
import NamespaceSelector from '@/components/config/NamespaceSelector';
import TargetSystemRouter from '@/components/config/TargetSystemRouter';
import DynamicConfigForm from '@/components/config/DynamicConfigForm';
import DockerCredsForm from '@/components/config/DockerCredsForm';
import FileImporter from '@/components/config/FileImporter';
import api from '@/services/api';

/**
 * Main Config Deployment page
 */
export function ConfigDeploy() {
  const { clusters, loading: clustersLoading } = useClusters();
  const { applications: gitApps } = useApplications();
  const [vercelApps, setVercelApps] = useState([]);

  // Fetch Vercel projects as applications
  useEffect(() => {
    api.listDeployments()
      .then((deps) => {
        const seen = new Set();
        const apps = deps
          .filter((d) => {
            // Only show apps deployed from this portal (not git-push auto deploy)
            if (d.trigger === 'git-push') return false;
            // Only show ready/promoted deployments
            if (d.status !== 'ready' && d.status !== 'promoted') return false;
            // Deduplicate by app name
            if (seen.has(d.app_name)) return false;
            seen.add(d.app_name);
            return true;
          })
          .map((d) => ({
            id: `vercel-${d.app_name}`,
            name: d.app_name,
            repo_url: d.repo_url,
            url: d.url ? (d.url.startsWith('http') ? d.url : `https://${d.url}`) : null,
            platform: 'vercel',
            branch: d.branch,
          }));
        setVercelApps(apps);
      })
      .catch(() => {});
  }, []);

  const applications = [...gitApps, ...vercelApps];

  // Form state
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedNamespaces, setSelectedNamespaces] = useState([]);
  const [targetSystem, setTargetSystem] = useState('k8s');
  const [selectedEnvironment, setSelectedEnvironment] = useState('DEV');
  const [resourceType, setResourceType] = useState('configmap');
  const [isDockerMode, setIsDockerMode] = useState(false);
  const [configName, setConfigName] = useState('');
  const [configData, setConfigData] = useState({});
  const [dockerData, setDockerData] = useState({});
  const [nacosData, setNacosData] = useState({
    data_id: '',
    group: 'DEFAULT_GROUP',
    content: '',
    config_type: 'text',
  });
  const [vercelData, setVercelData] = useState({
    project_name: '',
    env_vars: {},
  });
  const [awsData, setAwsData] = useState({
    service: 'ssm',
    region: 'us-east-1',
    parameter_name: '',
    env_vars: {},
  });
  const [deployLoading, setDeployLoading] = useState(false);
  const [deployError, setDeployError] = useState(null);
  const [deployResults, setDeployResults] = useState(null);

  // Set first connected cluster as default
  useEffect(() => {
    if (clusters.length > 0 && !selectedCluster) {
      const connected = clusters.find((c) => c.status === 'connected');
      if (connected) {
        setSelectedCluster(connected);
      }
    }
  }, [clusters, selectedCluster]);

  const handleDeploy = async (dryRun = false) => {
    if (!selectedCluster) {
      alert('Please select a cluster');
      return;
    }
    if (selectedNamespaces.length === 0) {
      alert('Please select at least one namespace');
      return;
    }

    setDeployLoading(true);
    setDeployError(null);

    try {
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const credentials = {
        api_server: selectedCluster.api_server,
        token: selectedCluster.service_account_token,
        ca_cert: selectedCluster.ca_cert,
      };

      const params = dryRun ? '?dry_run=true' : '';

      if (targetSystem === 'k8s' || targetSystem === 'both') {
        if (isDockerMode) {
          const res = await fetch(`${API_BASE}/api/clusters/secrets/docker${params}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              credentials,
              name: dockerData.name || 'docker-registry',
              namespaces: selectedNamespaces,
              registry: dockerData.registry,
              username: dockerData.username,
              password: dockerData.password,
              email: dockerData.email,
            }),
          });
          if (!res.ok) throw new Error(await res.text());
          setDeployResults(await res.json());
        } else if (resourceType === 'configmap') {
          const res = await fetch(`${API_BASE}/api/clusters/configmaps${params}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              credentials,
              name: configName,
              namespace: selectedNamespaces[0],
              data: configData,
            }),
          });
          if (!res.ok) throw new Error(await res.text());
          setDeployResults(await res.json());
        } else {
          const res = await fetch(`${API_BASE}/api/clusters/secrets${params}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              credentials,
              name: configName,
              namespace: selectedNamespaces[0],
              data: configData,
              secret_type: 'Opaque',
            }),
          });
          if (!res.ok) throw new Error(await res.text());
          setDeployResults(await res.json());
        }
      }

      if (targetSystem === 'nacos' || targetSystem === 'both') {
        const res = await fetch(`${API_BASE}/api/nacos/configs${params}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nacosData),
        });
        if (!res.ok) throw new Error(await res.text());
        setDeployResults(await res.json());
      }
    } catch (err) {
      setDeployError(err.message);
    } finally {
      setDeployLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedEnvironment('DEV');
    setConfigName('');
    setConfigData({});
    setDockerData({});
    setNacosData({ data_id: '', group: 'DEFAULT_GROUP', content: '', config_type: 'text' });
    setVercelData({ project_name: '', env_vars: {} });
    setAwsData({ service: 'ssm', region: 'us-east-1', parameter_name: '', env_vars: {} });
    setSelectedNamespaces([]);
    setDeployResults(null);
    setDeployError(null);
  };

  const connectedClusters = clusters.filter((c) => c.status === 'connected');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Configuration Deployment</h1>
          <p className="mt-1 text-sm text-gray-500">
            Deploy configurations to Kubernetes and Nacos across multiple namespaces
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column - Configuration form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Target System */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <TargetSystemRouter value={targetSystem} onChange={setTargetSystem} />
            </div>

            {/* Target Application */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">Target Application</h2>
              <p className="mb-3 text-sm text-gray-500">Select the application this configuration is for</p>
              {applications.length === 0 ? (
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-center">
                  <p className="text-sm text-gray-500">No applications found. Configure Git provider in Settings or deploy an app first.</p>
                </div>
              ) : (
                <>
                  <select
                    value={selectedApp?.id || ''}
                    onChange={(e) => {
                      const app = applications.find((a) => a.id === e.target.value);
                      setSelectedApp(app || null);
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select an application...</option>
                    {gitApps.length > 0 && (
                      <optgroup label="📁 Git Repository">
                        {gitApps.map((app) => (
                          <option key={app.id} value={app.id}>
                            {app.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {vercelApps.length > 0 && (
                      <optgroup label="▲ Vercel Projects">
                        {vercelApps.map((app) => (
                          <option key={app.id} value={app.id}>
                            {app.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  {selectedApp && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
                      <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                        {selectedApp.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{selectedApp.name}</p>
                        <p className="text-xs text-gray-500 truncate">{selectedApp.repo_url || selectedApp.path}</p>
                      </div>
                      {selectedApp.url && (
                        <a href={selectedApp.url} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 ml-auto text-xs text-blue-600 hover:underline">
                          🔗 View
                        </a>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Cluster Selection - only for K8s */}
            {(targetSystem === 'k8s' || targetSystem === 'both') && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Target Cluster</h2>
                {clustersLoading ? (
                  <p className="text-sm text-gray-500">Loading clusters...</p>
                ) : (
                  <>
                    <select
                      value={selectedCluster?.id || ''}
                      onChange={(e) => {
                        const cluster = connectedClusters.find((c) => c.id === e.target.value);
                        setSelectedCluster(cluster);
                        setSelectedNamespaces([]);
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select a cluster...</option>
                      {connectedClusters.map((cluster) => (
                        <option key={cluster.id} value={cluster.id}>
                          {cluster.name} ({cluster.k8s_version})
                        </option>
                      ))}
                    </select>
                    {connectedClusters.length === 0 && (
                      <p className="mt-2 text-sm text-amber-600">
                        No connected clusters found. Add a cluster in Settings first.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Namespace Selection - only for K8s */}
            {(targetSystem === 'k8s' || targetSystem === 'both') && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <NamespaceSelector
                  cluster={selectedCluster}
                  selectedNamespaces={selectedNamespaces}
                  onChange={setSelectedNamespaces}
                />
                {selectedNamespaces.length > 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    {selectedNamespaces.length} namespace(s) selected
                  </p>
                )}
              </div>
            )}

            {/* Resource Type (for K8s) */}
            {(targetSystem === 'k8s' || targetSystem === 'both') && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Environment</h2>
                <div className="mb-6">
                  <select
                    value={selectedEnvironment}
                    onChange={(e) => setSelectedEnvironment(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="DEV">DEV</option>
                    <option value="STAGING">STAGING</option>
                    <option value="UAT">UAT</option>
                    <option value="PROD">PROD</option>
                    <option value="QA">QA</option>
                  </select>
                </div>
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Resource Type</h2>
                <div className="flex gap-4">
                  {['configmap', 'secret', 'docker'].map((type) => (
                    <label key={type} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="resourceType"
                        value={type}
                        checked={type === 'docker' ? isDockerMode : resourceType === type && !isDockerMode}
                        onChange={() => {
                          if (type === 'docker') {
                            setIsDockerMode(true);
                          } else {
                            setResourceType(type);
                            setIsDockerMode(false);
                          }
                        }}
                        className="border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {type === 'configmap' ? 'ConfigMap' : type === 'secret' ? 'Secret' : 'Docker Registry'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Configuration Form */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Configuration</h2>
              {!isDockerMode && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Import from File</label>
                    <FileImporter onImport={(data) => setConfigData((prev) => ({ ...prev, ...data }))} />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Resource Name</label>
                    <input
                      type="text"
                      value={configName}
                      onChange={(e) => setConfigName(e.target.value)}
                      placeholder="my-config"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
              {isDockerMode ? (
                <DockerCredsForm value={dockerData} onChange={setDockerData} />
              ) : (
                <DynamicConfigForm
                  value={configData}
                  onChange={setConfigData}
                  sensitive={resourceType === 'secret'}
                />
              )}
            </div>

            {/* Nacos Configuration */}
            {(targetSystem === 'nacos' || targetSystem === 'both') && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Nacos Configuration</h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data ID</label>
                    <input
                      type="text"
                      value={nacosData.data_id}
                      onChange={(e) => setNacosData({ ...nacosData, data_id: e.target.value })}
                      placeholder="com.example.config"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
                    <input
                      type="text"
                      value={nacosData.group}
                      onChange={(e) => setNacosData({ ...nacosData, group: e.target.value })}
                      placeholder="DEFAULT_GROUP"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Config Type</label>
                  <select
                    value={nacosData.config_type}
                    onChange={(e) => setNacosData({ ...nacosData, config_type: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="text">Text</option>
                    <option value="json">JSON</option>
                    <option value="yaml">YAML</option>
                    <option value="xml">XML</option>
                    <option value="properties">Properties</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  <textarea
                    value={nacosData.content}
                    onChange={(e) => setNacosData({ ...nacosData, content: e.target.value })}
                    placeholder="Configuration content..."
                    rows={6}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <button
                type="button"
                onClick={handleReset}
                disabled={deployLoading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Reset
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleDeploy(true)}
                  disabled={deployLoading || connectedClusters.length === 0}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {deployLoading ? 'Simulating...' : 'Dry Run'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeploy(false)}
                  disabled={deployLoading || connectedClusters.length === 0}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {deployLoading ? 'Deploying...' : 'Deploy'}
                </button>
              </div>
            </div>

            {/* Error display */}
            {deployError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700 font-medium">{deployError}</p>
              </div>
            )}

            {/* Results display */}
            {deployResults && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Deployment Results</h2>
                <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-auto">
                  {JSON.stringify(deployResults, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Right column - Audit Logs */}
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Audit Logs</h2>
              <p className="text-sm text-gray-500">Audit logs will appear here after deployments.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfigDeploy;
