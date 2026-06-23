import StatusBadge from '@/components/ui/StatusBadge';

export default function ClusterCard({ cluster, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{cluster.name}</h3>
              <p className="text-sm text-gray-500">{cluster.api_server}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {cluster.k8s_version || 'Unknown'}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {cluster.default_namespace || 'default'}
            </span>
          </div>
        </div>

        <StatusBadge status={cluster.status} />
      </div>

      <div className="mt-4 flex items-center gap-2 pt-3 border-t border-gray-100">
        <button
          onClick={() => onEdit(cluster)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Edit
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={() => onDelete(cluster.id)}
          className="text-sm text-red-600 hover:text-red-800 font-medium"
        >
          Delete
        </button>
        <span className="text-gray-300">|</span>
        <a
          href={`/clusters/${cluster.id}`}
          className="text-sm text-gray-600 hover:text-gray-800 font-medium"
        >
          Details →
        </a>
      </div>
    </div>
  );
}
