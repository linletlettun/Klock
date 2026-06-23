import { useState } from 'react';
import { useClusters } from '@/hooks/useClusters';
import ClusterCard from '@/components/clusters/ClusterCard';
import AddClusterModal from '@/components/clusters/AddClusterModal';
import StatusBadge from '@/components/ui/StatusBadge';

export default function ClustersSettings() {
  const { clusters, loading, error, addCluster, updateCluster, deleteCluster, testConnection } = useClusters();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCluster, setEditCluster] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredClusters = clusters.filter((cluster) => {
    const matchesSearch = cluster.name.toLowerCase().includes(search.toLowerCase()) ||
      cluster.api_server.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || cluster.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = async (data) => {
    if (data.testOnly) {
      return await testConnection(data.api_server, data.service_account_token, data.ca_cert);
    }

    if (editCluster) {
      await updateCluster(editCluster.id, data);
    } else {
      await addCluster(data);
    }
    setShowAddModal(false);
    setEditCluster(null);
  };

  const handleEdit = (cluster) => {
    setEditCluster(cluster);
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this cluster?')) {
      await deleteCluster(id);
    }
  };

  const stats = {
    total: clusters.length,
    connected: clusters.filter((c) => c.status === 'connected').length,
    disconnected: clusters.filter((c) => c.status === 'disconnected').length,
    pending: clusters.filter((c) => c.status === 'pending').length,
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
          <p className="text-gray-500 mt-1">Manage your Kubernetes cluster connections</p>
        </div>
        <button
          onClick={() => { setEditCluster(null); setShowAddModal(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Cluster
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Connected</div>
          <div className="text-2xl font-bold text-green-600">{stats.connected}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Disconnected</div>
          <div className="text-2xl font-bold text-red-600">{stats.disconnected}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clusters..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="connected">Connected</option>
          <option value="disconnected">Disconnected</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Cluster List */}
      {filteredClusters.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No clusters found</h3>
          <p className="text-gray-500 mb-4">
            {search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by adding your first cluster'}
          </p>
          {!search && statusFilter === 'all' && (
            <button
              onClick={() => { setEditCluster(null); setShowAddModal(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Add Cluster
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClusters.map((cluster) => (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <AddClusterModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditCluster(null); }}
        onSubmit={handleSubmit}
        editCluster={editCluster}
      />
    </div>
  );
}
