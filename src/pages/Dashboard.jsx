import { useState } from 'react';
import { useApplications } from '@/hooks/useApplications';
import { useClusters } from '@/hooks/useClusters';
import StatusBadge from '@/components/ui/StatusBadge';
import NewAppModal from '@/components/apps/NewAppModal';

function AppTile({ app, timeAgo, onDelete }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow group relative">
      <a
        href={app.repo_url || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
      {/* Status Bar Top */}
      <div className={`h-1 rounded-t-lg ${
        app.health === 'healthy' ? 'bg-green-500' :
        app.health === 'degraded' ? 'bg-red-500' :
        app.health === 'progressing' ? 'bg-blue-500' :
        'bg-gray-300'
      }`} />

      <div className="p-4">
        {/* App Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {app.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                {app.name}
              </h3>
              <p className="text-xs text-gray-500 truncate">{app.namespace || app.path}</p>
            </div>
          </div>
        </div>

        {/* Status Row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Sync:</span>
            <StatusBadge status={app.sync} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Health:</span>
            <StatusBadge status={app.health} />
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 text-xs">
          {app.default_branch && (
            <div className="flex items-center gap-2 text-gray-600">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{app.default_branch}</code>
            </div>
          )}
          {app.last_commit && (
            <div className="flex items-center gap-2 text-gray-600">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="truncate">{app.last_commit.message}</span>
              <span className="text-gray-400 shrink-0">{timeAgo(app.last_commit.date)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 rounded-b-lg flex items-center justify-between">
        <div className="flex items-center gap-1 text-gray-400">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs">{app.last_activity ? timeAgo(app.last_activity) : '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          {app.pipeline && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">#{app.pipeline.id}</span>
              <StatusBadge status={app.pipeline.status === 'success' ? 'healthy' : app.pipeline.status === 'failed' ? 'degraded' : 'progressing'} />
            </div>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(app); }}
              className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded p-1 transition-colors"
              title="Delete app"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
      </a>
    </div>
  );
}

export default function Dashboard() {
  const { applications, loading, error, timeAgo } = useApplications();
  const { clusters } = useClusters();
  const [search, setSearch] = useState('');
  const [showNewApp, setShowNewApp] = useState(false);
  const [filter, setFilter] = useState('all');

  const handleDeleteApp = (app) => {
    if (!confirm(`Delete "${app.name}" from the catalog?`)) return;
    const saved = localStorage.getItem('klock_manual_apps');
    if (saved) {
      const apps = JSON.parse(saved);
      const updated = apps.filter(a => a.repo_url !== app.repo_url);
      localStorage.setItem('klock_manual_apps', JSON.stringify(updated));
      window.location.reload();
    }
  };

  const filtered = applications.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      (app.path || '').toLowerCase().includes(search.toLowerCase());
    if (filter === 'all') return matchesSearch;
    if (filter === 'synced') return matchesSearch && app.sync === 'synced';
    if (filter === 'out-of-sync') return matchesSearch && app.sync === 'out-of-sync';
    if (filter === 'healthy') return matchesSearch && app.health === 'healthy';
    if (filter === 'degraded') return matchesSearch && app.health === 'degraded';
    return matchesSearch;
  });

  const stats = {
    total: applications.length,
    synced: applications.filter((a) => a.sync === 'synced').length,
    outOfSync: applications.filter((a) => a.sync === 'out-of-sync').length,
    healthy: applications.filter((a) => a.health === 'healthy').length,
    degraded: applications.filter((a) => a.health === 'degraded').length,
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
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-500 mt-1">Manage and monitor your Kubernetes applications</p>
        </div>
        <button
          onClick={() => setShowNewApp(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New App
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Apps', value: stats.total, color: 'text-gray-900', filter: 'all' },
          { label: 'Synced', value: stats.synced, color: 'text-green-600', filter: 'synced' },
          { label: 'Out of Sync', value: stats.outOfSync, color: 'text-yellow-600', filter: 'out-of-sync' },
          { label: 'Healthy', value: stats.healthy, color: 'text-green-600', filter: 'healthy' },
          { label: 'Degraded', value: stats.degraded, color: 'text-red-600', filter: 'degraded' },
        ].map((stat) => (
          <button
            key={stat.label}
            onClick={() => setFilter(stat.filter)}
            className={`bg-white rounded-lg border p-4 text-left transition-all ${
              filter === stat.filter
                ? 'border-blue-400 ring-2 ring-blue-100 shadow-sm'
                : 'border-gray-200 hover:shadow-sm'
            }`}
          >
            <div className="text-sm text-gray-500">{stat.label}</div>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search applications..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Info banner when no provider configured */}
      {applications.length === 0 && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-700 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>No repositories connected yet.</span>
          </div>
          <p className="mt-1 text-xs text-blue-600">
            Click <strong>"New App"</strong> to add a GitHub/GitLab repo, or go to <strong>Settings → Git Provider</strong> to connect your account.
          </p>
        </div>
      )}

      {/* Applications Grid */}
      {!error && filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
          <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {search ? 'No applications found' : 'No applications yet'}
          </h3>
          <p className="text-gray-500 text-sm mb-6">
            {search
              ? 'Try adjusting your search'
              : 'Get started by creating your first application'}
          </p>
          {!search && (
            <button
              onClick={() => setShowNewApp(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New App
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((app) => (
            <AppTile key={app.id} app={app} timeAgo={timeAgo} onDelete={handleDeleteApp} />
          ))}
        </div>
      )}

      {/* New App Modal */}
      <NewAppModal
        isOpen={showNewApp}
        onClose={() => setShowNewApp(false)}
        clusters={clusters}
      />
    </div>
  );
}
