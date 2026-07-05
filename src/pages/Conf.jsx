import { useState } from 'react';
import { useApplications } from '@/hooks/useApplications';
import StatusBadge from '@/components/ui/StatusBadge';

function AppCard({ app, onSync, timeAgo }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden">
      {/* Card Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{app.name}</h3>
              <p className="text-xs text-gray-500">{app.namespace || app.path}</p>
            </div>
          </div>
          <StatusBadge status={app.sync} />
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3">
        {/* Health + Branch */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Health:</span>
            <StatusBadge status={app.health} />
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{app.default_branch}</code>
          </div>
        </div>

        {/* Last Commit */}
        {app.last_commit && (
          <div className="text-sm">
            <div className="text-gray-500 text-xs mb-1">Last Commit</div>
            <div className="flex items-start gap-2">
              <code className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 shrink-0">
                {app.last_commit.short_id}
              </code>
              <div className="min-w-0">
                <p className="text-gray-800 text-xs truncate">{app.last_commit.message}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {app.last_commit.author} · {timeAgo(app.last_commit.date)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pipeline */}
        {app.pipeline && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">Pipeline:</span>
            <span className="text-gray-400">#{app.pipeline.id}</span>
            <StatusBadge status={app.pipeline.status === 'success' ? 'healthy' : app.pipeline.status === 'failed' ? 'degraded' : 'progressing'} />
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            {app.stars}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            {app.forks}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSync(app.id)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Sync
          </button>
          <span className="text-gray-300">|</span>
          <a
            href={app.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-600 hover:text-gray-800 font-medium"
          >
            Repo →
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Conf() {
  const { applications, loading, error, syncApplication, syncAll, timeAgo } = useApplications();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [syncing, setSyncing] = useState(false);

  const filtered = applications.filter(
    (app) =>
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      (app.path || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: applications.length,
    synced: applications.filter((a) => a.sync === 'synced').length,
    outOfSync: applications.filter((a) => a.sync === 'out-of-sync').length,
    healthy: applications.filter((a) => a.health === 'healthy').length,
    degraded: applications.filter((a) => a.health === 'degraded').length,
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    await syncAll();
    setSyncing(false);
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
      {/* Header - ArgoCD style */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-500 mt-1">Manage your GitOps applications from GitLab</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : '↻ Sync All'}
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
          >
            {viewMode === 'grid' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Synced</div>
          <div className="text-2xl font-bold text-green-600">{stats.synced}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Out of Sync</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.outOfSync}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Healthy</div>
          <div className="text-2xl font-bold text-green-600">{stats.healthy}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Degraded</div>
          <div className="text-2xl font-bold text-red-600">{stats.degraded}</div>
        </div>
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
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
          <p className="mt-2 text-xs text-red-600">
            Make sure VITE_GITLAB_URL is set correctly in your .env file.
          </p>
        </div>
      )}

      {/* Applications Grid/List */}
      {!error && filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {search ? 'No applications found' : 'No applications yet'}
          </h3>
          <p className="text-gray-500 text-sm">
            {search
              ? 'Try adjusting your search'
              : 'Applications will appear here when GitLab repos are available'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((app) => (
            <AppCard key={app.id} app={app} onSync={syncApplication} timeAgo={timeAgo} />
          ))}
        </div>
      ) : (
        /* List View - ArgoCD table style */
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sync</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Health</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Commit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{app.name}</div>
                        <div className="text-xs text-gray-500">{app.namespace || app.path}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                      {app.default_branch}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={app.sync} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={app.health} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {app.last_commit ? (
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          {app.last_commit.short_id}
                        </code>
                        <span className="truncate max-w-[200px]">{app.last_commit.message}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => syncApplication(app.id)}
                        className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                      >
                        Sync
                      </button>
                      <a
                        href={app.repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                      >
                        Repo
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
