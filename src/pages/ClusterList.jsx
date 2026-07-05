import { useState } from 'react';
import { useClusters } from '@/hooks/useClusters';
import StatusBadge from '@/components/ui/StatusBadge';

export default function ClusterList() {
  const { clusters, loading, error, addCluster, updateCluster, deleteCluster, testConnection } = useClusters();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editCluster, setEditCluster] = useState(null);
  const [search, setSearch] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [form, setForm] = useState({
    name: '',
    environment: 'DEV',
    api_server: '',
    service_account_token: '',
    ca_cert: '',
    default_namespace: 'default',
    k8s_version: '',
  });

  const envColors = {
    DEV: 'bg-green-100 text-green-700',
    STAGING: 'bg-yellow-100 text-yellow-700',
    PROD: 'bg-red-100 text-red-700',
  };

  const filteredClusters = clusters.filter((cluster) =>
    cluster.name.toLowerCase().includes(search.toLowerCase()) ||
    (cluster.api_server || '').toLowerCase().includes(search.toLowerCase()) ||
    (cluster.environment || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setConnecting(true);
    setTestResult(null);
    const result = await testConnection(form.api_server, form.service_account_token, form.ca_cert);
    setTestResult(result);
    if (result.success && result.k8sVersion) {
      setForm((prev) => ({ ...prev, k8s_version: result.k8sVersion }));
    }
    setConnecting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editCluster) {
      await updateCluster(editCluster.id, form);
    } else {
      await addCluster(form);
    }
    setShowAddForm(false);
    setEditCluster(null);
    setForm({
      name: '',
      environment: 'DEV',
      api_server: '',
      service_account_token: '',
      ca_cert: '',
      default_namespace: 'default',
      k8s_version: '',
    });
  };

  const handleEdit = (cluster) => {
    setEditCluster(cluster);
    setForm({
      name: cluster.name,
      environment: cluster.environment || 'DEV',
      api_server: cluster.api_server || '',
      service_account_token: cluster.service_account_token || '',
      ca_cert: cluster.ca_cert || '',
      default_namespace: cluster.default_namespace || 'default',
      k8s_version: cluster.k8s_version || '',
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this cluster?')) {
      await deleteCluster(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clusters</h1>
          <p className="text-gray-500 mt-1">Connect and manage your Kubernetes clusters</p>
        </div>
        <button
          onClick={() => { setEditCluster(null); setShowAddForm(!showAddForm); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2"
        >
          {showAddForm ? (
            <>Cancel</>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Connect Cluster
            </>
          )}
        </button>
      </div>

      {/* Connect Cluster Form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">
              {editCluster ? 'Edit Cluster' : 'Connect Cluster'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Enter your cluster details to establish a connection
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Environment selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Environment</label>
              <div className="flex gap-3">
                {['DEV', 'STAGING', 'PROD'].map((env) => (
                  <button
                    key={env}
                    type="button"
                    onClick={() => setForm({ ...form, environment: env })}
                    className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                      form.environment === env
                        ? envColors[env] + ' border-current'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {env}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cluster Name *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="production-cluster"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">API Server URL *</label>
                <input
                  type="text"
                  name="api_server"
                  value={form.api_server}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="https://kubernetes.example.com:6443"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Account Token *</label>
              <textarea
                name="service_account_token"
                value={form.service_account_token}
                onChange={handleChange}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="eyJhbGciOiJSUzI1NiIsImtpZCI6..."
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  CA Certificate <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  name="ca_cert"
                  value={form.ca_cert}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="LS0tLS1CRUdJTi..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Namespace</label>
                <input
                  type="text"
                  name="default_namespace"
                  value={form.default_namespace}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="default"
                />
              </div>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {testResult.success ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Connected! K8s version: {testResult.k8s_version}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Connection failed: {testResult.error}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={connecting || !form.api_server}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50"
              >
                {connecting ? 'Testing...' : 'Test Connection'}
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setEditCluster(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                {editCluster ? 'Update Cluster' : 'Connect Cluster'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clusters..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Cluster List */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Environment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Server</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredClusters.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                    <p className="font-medium">No clusters connected</p>
                    <p className="text-sm mt-1">Click "Connect Cluster" to add your first cluster</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredClusters.map((cluster) => (
                <tr key={cluster.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{cluster.name}</div>
                        <div className="text-xs text-gray-500">{cluster.default_namespace || 'default'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${envColors[cluster.environment] || 'bg-gray-100 text-gray-600'}`}>
                      {cluster.environment || 'DEV'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                      {cluster.api_server || '-'}
                    </code>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {cluster.k8s_version || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={cluster.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(cluster)}
                        className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cluster.id)}
                        className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
