import { useState, useEffect } from 'react';

/**
 * Global Cluster Selector
 * Top-bar dropdown for selecting active cluster + Add Cluster button
 */
export function GlobalClusterSelector({ selectedCluster, onSelectCluster, onAddCluster }) {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchClusters();
  }, []);

  const fetchClusters = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_BASE}/api/cluster`);
      if (res.ok) {
        const data = await res.json();
        setClusters(data);
        // Auto-select first cluster if none selected
        if (!selectedCluster && data.length > 0) {
          onSelectCluster(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch clusters:', err);
    } finally {
      setLoading(false);
    }
  };

  const envBadge = {
    DEV: 'bg-green-100 text-green-700',
    STAGING: 'bg-yellow-100 text-yellow-700',
    PROD: 'bg-red-100 text-red-700',
  };

  const statusDot = {
    connected: 'bg-green-500',
    disconnected: 'bg-red-500',
    pending: 'bg-yellow-500',
  };

  return (
    <div className="flex items-center gap-3">
      {/* Cluster dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:border-gray-300"
        >
          <div className={`h-2 w-2 rounded-full ${statusDot[selectedCluster?.status] || 'bg-gray-300'}`} />
          <span className="font-medium text-gray-700">
            {loading ? 'Loading...' : selectedCluster?.name || 'No cluster'}
          </span>
          {selectedCluster?.environment && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${envBadge[selectedCluster.environment]}`}>
              {selectedCluster.environment}
            </span>
          )}
          <svg className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="border-b border-gray-100 px-3 py-2">
              <span className="text-xs font-medium text-gray-500 uppercase">Clusters</span>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {clusters.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  No clusters registered
                </div>
              ) : (
                clusters.map((cluster) => (
                  <button
                    key={cluster.id}
                    type="button"
                    onClick={() => {
                      onSelectCluster(cluster);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 ${
                      selectedCluster?.id === cluster.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className={`h-2 w-2 rounded-full ${statusDot[cluster.status] || 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{cluster.name}</div>
                      <div className="text-xs text-gray-500 truncate">{cluster.api_server}</div>
                    </div>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${envBadge[cluster.environment] || 'bg-gray-100 text-gray-600'}`}>
                      {cluster.environment}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Cluster button */}
      <button
        type="button"
        onClick={onAddCluster}
        className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        Add Cluster
      </button>
    </div>
  );
}

export default GlobalClusterSelector;
