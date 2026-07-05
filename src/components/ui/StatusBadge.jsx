export default function StatusBadge({ status }) {
  const statusConfig = {
    connected: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      dot: 'bg-green-500',
    },
    disconnected: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      dot: 'bg-red-500',
    },
    pending: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      dot: 'bg-yellow-500',
    },
    // ArgoCD-style statuses
    synced: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      dot: 'bg-green-500',
    },
    'out-of-sync': {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      dot: 'bg-yellow-500',
    },
    healthy: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      dot: 'bg-green-500',
    },
    degraded: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      dot: 'bg-red-500',
    },
    progressing: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      dot: 'bg-blue-500',
    },
    unknown: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      dot: 'bg-gray-500',
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {status}
    </span>
  );
}
