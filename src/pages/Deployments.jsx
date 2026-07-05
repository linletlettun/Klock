import { useState, useEffect, useCallback } from 'react';
import { useApplications } from '@/hooks/useApplications';
import api from '@/services/api';

const PLATFORMS = [
  { id: 'vercel', name: 'Vercel', icon: '▲', color: 'bg-black text-white', desc: 'Frontend deployments with instant previews' },
  { id: 'aws-ec2', name: 'AWS EC2', icon: '☁️', color: 'bg-orange-500 text-white', desc: 'Deploy to Amazon EC2 instances' },
  { id: 'kubernetes', name: 'Kubernetes', icon: '☸️', color: 'bg-blue-600 text-white', desc: 'Deploy to Kubernetes clusters' },
  { id: 'docker', name: 'Docker Hub', icon: '🐳', color: 'bg-blue-500 text-white', desc: 'Build and push Docker images' },
  { id: 'netlify', name: 'Netlify', icon: '🌐', color: 'bg-teal-500 text-white', desc: 'Static site deployments' },
  { id: 'cloudflare', name: 'Cloudflare', icon: '⚡', color: 'bg-orange-600 text-white', desc: 'Edge-first deployments' },
];

const STATUS_CONFIG = {
  queued: { color: 'bg-gray-100 text-gray-700', icon: '⏳', label: 'Queued' },
  building: { color: 'bg-blue-100 text-blue-700', icon: '🔨', label: 'Building' },
  deploying: { color: 'bg-yellow-100 text-yellow-700', icon: '🚀', label: 'Deploying' },
  ready: { color: 'bg-green-100 text-green-700', icon: '✅', label: 'Ready' },
  error: { color: 'bg-red-100 text-red-700', icon: '❌', label: 'Error' },
  canceled: { color: 'bg-gray-100 text-gray-500', icon: '🚫', label: 'Canceled' },
  promoted: { color: 'bg-purple-100 text-purple-700', icon: '⭐', label: 'Production' },
};

export default function Deployments() {
  const { applications } = useApplications();
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchDeployments = useCallback(async () => {
    try {
      // First refresh status from Vercel
      await api.refreshDeployments().catch(() => {});
      const data = await api.listDeployments();
      setDeployments(data);
    } catch (err) {
      console.error('Failed to fetch deployments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDeployments(); }, [fetchDeployments]);

  // Auto-refresh every 15s to sync Vercel status
  useEffect(() => {
    const interval = setInterval(fetchDeployments, 15000);
    return () => clearInterval(interval);
  }, [fetchDeployments]);

  const handleDeploy = (app) => {
    setSelectedApp(app);
    setShowDeployModal(true);
  };

  const handleDeploySubmit = async (config) => {
    try {
      await api.triggerDeployment(config);
      setShowDeployModal(false);
      setSelectedApp(null);
      fetchDeployments();
    } catch (err) {
      alert('Deploy failed: ' + err.message);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this deployment?')) return;
    await api.cancelDeployment(id);
    fetchDeployments();
  };

  const handleRedeploy = async (d) => {
    if (!confirm(`Redeploy "${d.app_name}" from ${d.branch}?`)) return;
    try {
      const result = await api.redeploy(d.id);
      if (result.ok) {
        fetchDeployments();
      } else {
        alert('Redeploy failed: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Redeploy failed: ' + err.message);
    }
  };

  const handlePromote = async (id) => {
    if (!confirm('Promote this deployment to production?')) return;
    await api.promoteDeployment(id);
    fetchDeployments();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this deployment record?')) return;
    await api.deleteDeployment(id);
    fetchDeployments();
  };

  const filtered = filter === 'all' ? deployments : deployments.filter(d => d.platform === filter);
  const activeCount = deployments.filter(d => ['queued', 'building', 'deploying'].includes(d.status)).length;
  const readyCount = deployments.filter(d => d.status === 'ready' || d.status === 'promoted').length;
  const errorCount = deployments.filter(d => d.status === 'error').length;

  const timeAgo = (dateStr) => {
    if (!dateStr) return '-';
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const m = Math.floor(seconds / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deployments</h1>
          <p className="text-gray-500 mt-1">Deploy your apps to Vercel, AWS, Kubernetes, and more</p>
        </div>
        <button onClick={() => { setSelectedApp(null); setShowDeployModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm">
          🚀 Deploy App
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={deployments.length} icon="📦" color="blue" />
        <StatCard label="Active" value={activeCount} icon="🔄" color="amber" />
        <StatCard label="Ready" value={readyCount} icon="✅" color="green" />
        <StatCard label="Failed" value={errorCount} icon="❌" color="red" />
      </div>

      {/* Platform filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            filter === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}>All</button>
        {PLATFORMS.map(p => (
          <button key={p.id} onClick={() => setFilter(p.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filter === p.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}>{p.icon} {p.name}</button>
        ))}
      </div>

      {/* App list to deploy */}
      {applications.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Your Applications</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {applications.map(app => (
              <div key={app.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                    {app.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{app.name}</p>
                    <p className="text-xs text-gray-500 truncate">{app.repo_url || app.path}</p>
                  </div>
                </div>
                <button onClick={() => handleDeploy(app)}
                  className="shrink-0 ml-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                  🚀 Deploy
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deployment list */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Deployment History</h3>
          <button onClick={fetchDeployments} className="text-xs text-blue-600 hover:underline">↻ Refresh</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            <p className="text-4xl mb-3">🚀</p>
            <p>No deployments yet.</p>
            <p className="mt-1">Select an app above and click "Deploy" to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(d => {
              const status = STATUS_CONFIG[d.status] || STATUS_CONFIG.queued;
              const platform = PLATFORMS.find(p => p.id === d.platform);
              return (
                <div key={d.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${platform?.color || 'bg-gray-100'}`}>
                        {platform?.icon || '📦'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{d.app_name}</span>
                          <span className="rounded-full px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100">
                            {platform?.name || d.platform}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                            {status.icon} {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          <span>Branch: <code className="font-mono">{d.branch}</code></span>
                          <span>{timeAgo(d.created_at)}</span>
                          {d.url && (
                            <a href={d.url.startsWith('http') ? d.url : `https://${d.url}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-blue-600 hover:underline truncate max-w-[200px]">
                              {d.url}
                            </a>
                          )}
                          {d.platform === 'vercel' && (
                            <a href={d.dashboard_url || `https://vercel.com/klockdevops/${d.app_name}/deployments/${d.id}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-orange-600 hover:underline font-medium">
                              📋 View Build Logs
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {['queued', 'building', 'deploying'].includes(d.status) && (
                        <button onClick={() => handleCancel(d.id)}
                          className="rounded px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50">🚫 Cancel</button>
                      )}
                      {d.platform === 'vercel' && (
                        <button onClick={() => handleRedeploy(d)}
                          className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">🔄 Redeploy</button>
                      )}
                      {(d.status === 'ready' || d.status === 'promoted') && d.platform === 'vercel' && (
                        <button onClick={() => handlePromote(d.id)}
                          className="rounded px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50">⭐ Promote</button>
                      )}
                    </div>
                  </div>
                  {d.error && (
                    <p className="mt-1 text-xs text-red-600 ml-11">{d.error}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deploy Modal */}
      {showDeployModal && (
        <DeployModal
          app={selectedApp}
          applications={applications}
          onClose={() => { setShowDeployModal(false); setSelectedApp(null); }}
          onDeploy={handleDeploySubmit}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  const colors = { blue: 'bg-blue-50 border-blue-200', green: 'bg-green-50 border-green-200', amber: 'bg-amber-50 border-amber-200', red: 'bg-red-50 border-red-200' };
  return (
    <div className={`rounded-lg border p-3 ${colors[color]}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DeployModal({ app, applications, onClose, onDeploy }) {
  const [form, setForm] = useState({
    app_name: app?.name || '',
    repo_url: app?.repo_url || '',
    branch: app?.default_branch || 'main',
    platform: 'vercel',
    framework: '',
    build_command: '',
    output_directory: '',
    namespace: 'default',
    region: 'us-east-1',
    instance_type: 't2.micro',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.app_name || !form.platform) return;
    onDeploy(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">🚀 Deploy Application</h2>
            <p className="text-sm text-gray-500">Choose a platform and deploy your app</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {!app && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Application</label>
              <select value={form.app_name}
                onChange={(e) => {
                  const selected = applications.find(a => a.name === e.target.value);
                  setForm({
                    ...form,
                    app_name: e.target.value,
                    repo_url: selected?.repo_url || form.repo_url,
                    branch: selected?.default_branch || form.branch,
                  });
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                <option value="">Select an application</option>
                {applications.map(a => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Repository URL</label>
              <input type="text" value={form.repo_url}
                onChange={(e) => setForm({ ...form, repo_url: e.target.value })}
                placeholder="https://github.com/owner/repo"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <input type="text" value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          {/* Platform selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Deployment Platform</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PLATFORMS.map(p => (
                <button key={p.id} type="button"
                  onClick={() => setForm({ ...form, platform: p.id })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    form.platform === p.id
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}>
                  <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${p.color}`}>{p.icon}</span>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{p.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {form.platform === 'vercel' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Framework</label>
                <select value={form.framework}
                  onChange={(e) => setForm({ ...form, framework: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                  <option value="">Auto-detect</option>
                  <option value="nextjs">Next.js</option>
                  <option value="react">React</option>
                  <option value="vue">Vue.js</option>
                  <option value="svelte">Svelte</option>
                  <option value="vite">Vite</option>
                  <option value="static">Static</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Output Directory</label>
                <input type="text" value={form.output_directory}
                  onChange={(e) => setForm({ ...form, output_directory: e.target.value })}
                  placeholder="dist"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
            </div>
          )}

          {form.platform === 'kubernetes' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Namespace</label>
              <input type="text" value={form.namespace}
                onChange={(e) => setForm({ ...form, namespace: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          )}

          {form.platform === 'aws-ec2' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                <select value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                  <option value="us-east-1">US East (Virginia)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="eu-west-1">EU (Ireland)</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instance Type</label>
                <select value={form.instance_type}
                  onChange={(e) => setForm({ ...form, instance_type: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                  <option value="t2.micro">t2.micro (Free tier)</option>
                  <option value="t2.small">t2.small</option>
                  <option value="t2.medium">t2.medium</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Build Command (optional)</label>
            <input type="text" value={form.build_command}
              onChange={(e) => setForm({ ...form, build_command: e.target.value })}
              placeholder="npm run build"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none" />
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
            <h4 className="text-xs font-medium text-gray-700 mb-2">Deploy Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-500">App:</span> <span className="font-medium">{form.app_name || '—'}</span></div>
              <div><span className="text-gray-500">Platform:</span> <span className="font-medium">{PLATFORMS.find(p => p.id === form.platform)?.name}</span></div>
              <div><span className="text-gray-500">Branch:</span> <span className="font-mono">{form.branch}</span></div>
              <div><span className="text-gray-500">Repo:</span> <span className="font-mono truncate block">{form.repo_url || '—'}</span></div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit"
              disabled={!form.app_name || !form.repo_url}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              🚀 Deploy Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
