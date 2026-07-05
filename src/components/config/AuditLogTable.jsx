/**
 * Audit log table component
 * Displays real-time execution status for configuration deployments
 */
export function AuditLogTable({ logs = [], loading = false }) {
  const getStatusBadge = (status) => {
    const styles = {
      success: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      simulated: 'bg-yellow-100 text-yellow-700',
    };

    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
          styles[status] || 'bg-gray-100 text-gray-700'
        }`}
      >
        {status}
      </span>
    );
  };

  const getActionBadge = (action) => {
    const styles = {
      created: 'bg-blue-100 text-blue-700',
      updated: 'bg-purple-100 text-purple-700',
      deleted: 'bg-red-100 text-red-700',
    };

    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
          styles[action] || 'bg-gray-100 text-gray-700'
        }`}
      >
        {action}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        <span className="ml-2 text-sm text-gray-500">Loading audit logs...</span>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs</h3>
        <p className="mt-1 text-sm text-gray-500">
          Configuration deployments will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Time
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Resource
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Namespace
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Action
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Error
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {new Date(log.created_at).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <div className="text-sm font-medium text-gray-900">
                  {log.resource_name}
                </div>
                <div className="text-xs text-gray-500">{log.resource_type}</div>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {log.namespace || '-'}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {getActionBadge(log.action)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {getStatusBadge(log.status)}
              </td>
              <td className="max-w-xs truncate px-4 py-3 text-sm text-red-600">
                {log.error_message || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AuditLogTable;
