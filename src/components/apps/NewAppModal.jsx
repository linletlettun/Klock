import { useState } from 'react';

const appSources = [
  { id: 'gitlab', label: 'GitLab', icon: '🦊' },
  { id: 'github', label: 'GitHub', icon: '🐙' },
  { id: 'helm', label: 'Helm', icon: '⎈' },
  { id: 'kustomize', label: 'Kustomize', icon: '📦' },
];

const defaultValues = {
  name: '',
  project: 'default',
  source: 'gitlab',
  repoUrl: '',
  revision: 'main',
  path: '',
  cluster: 'in-cluster',
  namespace: 'default',
  syncPolicy: 'manual',
  autoSyncPrune: false,
  selfHeal: false,
};

export default function NewAppModal({ isOpen, onClose, clusters = [] }) {
  const [form, setForm] = useState(defaultValues);
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Save to localStorage so it appears on Dashboard
    const newApp = {
      id: Date.now(),
      name: form.name,
      path: form.repoUrl ? new URL(form.repoUrl).pathname.replace(/^\//, '') : form.name,
      description: '',
      repo_url: form.repoUrl,
      default_branch: form.revision,
      last_activity: new Date().toISOString(),
      last_commit: null,
      health: 'unknown',
      sync: 'unknown',
      pipeline: null,
      visibility: 'private',
      stars: 0,
      forks: 0,
      avatar_url: null,
      namespace: form.namespace,
      provider: form.source,
      cluster: form.cluster,
      syncPolicy: form.syncPolicy,
    };

    const saved = localStorage.getItem('klock_manual_apps');
    const apps = saved ? JSON.parse(saved) : [];
    apps.push(newApp);
    localStorage.setItem('klock_manual_apps', JSON.stringify(apps));

    onClose();
    setForm(defaultValues);
    setStep(1);

    // Reload page to reflect new app
    window.location.reload();
  };

  const handleClose = () => {
    onClose();
    setForm(defaultValues);
    setStep(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Create New Application</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {step === 1 ? 'General settings' : 'Source & destination'}
            </p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 border-b border-gray-200">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s}
              </div>
              <span className={`text-sm ${step >= s ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                {s === 1 ? 'General' : 'Source & Destination'}
              </span>
              {s < 2 && <div className={`w-12 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          {step === 1 && (
            <div className="p-6 space-y-5">
              {/* App Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Application Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="my-app"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Project */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                <select
                  value={form.project}
                  onChange={(e) => update('project', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="default">default</option>
                </select>
              </div>

              {/* Source Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Source Type</label>
                <div className="grid grid-cols-4 gap-3">
                  {appSources.map((src) => (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => update('source', src.id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                        form.source === src.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl">{src.icon}</span>
                      <span className="text-xs font-medium text-gray-700">{src.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sync Policy */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sync Policy</label>
                <div className="flex gap-3">
                  {['manual', 'automatic'].map((policy) => (
                    <button
                      key={policy}
                      type="button"
                      onClick={() => update('syncPolicy', policy)}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium border transition-colors ${
                        form.syncPolicy === policy
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {policy === 'manual' ? 'Manual' : 'Automatic'}
                    </button>
                  ))}
                </div>
                {form.syncPolicy === 'automatic' && (
                  <div className="mt-3 space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.autoSyncPrune}
                        onChange={(e) => update('autoSyncPrune', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Auto-prune resources
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.selfHeal}
                        onChange={(e) => update('selfHeal', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Self-heal
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="p-6 space-y-5">
              {/* Repo URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Repository URL *</label>
                <input
                  type="text"
                  required
                  value={form.repoUrl}
                  onChange={(e) => update('repoUrl', e.target.value)}
                  placeholder="https://gitlab.com/user/repo.git"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Revision + Path */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Revision</label>
                  <input
                    type="text"
                    value={form.revision}
                    onChange={(e) => update('revision', e.target.value)}
                    placeholder="main"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Path</label>
                  <input
                    type="text"
                    value={form.path}
                    onChange={(e) => update('path', e.target.value)}
                    placeholder="k8s/manifests"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Destination Cluster */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination Cluster</label>
                <select
                  value={form.cluster}
                  onChange={(e) => update('cluster', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="in-cluster">in-cluster (default)</option>
                  {clusters.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Namespace */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Namespace</label>
                <input
                  type="text"
                  value={form.namespace}
                  onChange={(e) => update('namespace', e.target.value)}
                  placeholder="default"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Summary</h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-24 shrink-0">Name:</dt>
                    <dd className="text-gray-900 font-mono">{form.name || '—'}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-24 shrink-0">Source:</dt>
                    <dd className="text-gray-900 font-mono">{form.repoUrl || '—'}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-24 shrink-0">Revision:</dt>
                    <dd className="text-gray-900 font-mono">{form.revision}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-24 shrink-0">Destination:</dt>
                    <dd className="text-gray-900 font-mono">{form.cluster} / {form.namespace}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={step === 1 ? handleClose : () => setStep(1)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>
            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!form.name}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Create Application
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
