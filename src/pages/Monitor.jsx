import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';

const API_BASE = import.meta.env.VITE_API_URL || '';

const TOKEN_EXPIRY_PRESETS = [
  { label: '1 Hour', hours: 1 },
  { label: '24 Hours', hours: 24 },
  { label: '7 Days', hours: 168 },
  { label: '30 Days', hours: 720 },
  { label: '1 Year', hours: 8760 },
];

/**
 * Resource Monitor Dashboard
 * Shows TLS certs, tokens, cluster health, Kafka keys, and Alerts
 */
export default function Monitor() {
  const [summary, setSummary] = useState(null);
  const [tlsCerts, setTlsCerts] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [health, setHealth] = useState([]);
  const [kafka, setKafka] = useState([]);
  const [alertConfig, setAlertConfig] = useState(null);
  const [alertHistory, setAlertHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showTokenList, setShowTokenList] = useState(false);
  const [tokenDetailApp, setTokenDetailApp] = useState(null);

  // TLS & Kafka forms
  const [showAddTLS, setShowAddTLS] = useState(false);
  const [showAddKafka, setShowAddKafka] = useState(false);
  const [tlsForm, setTlsForm] = useState({ host: '', port: 443, name: '' });
  const [kafkaForm, setKafkaForm] = useState({ cluster_id: '', namespace: '', secret_name: '', key_type: 'sasl-plain' });

  // Token monitor states
  const [apiTokens, setApiTokens] = useState([]);
  const [tokenStats, setTokenStats] = useState([]);
  const [showAddToken, setShowAddToken] = useState(false);
  const [newTokenResult, setNewTokenResult] = useState(null);
  const [copied, setCopied] = useState(null);
  const [pasteToken, setPasteToken] = useState('');
  const [validateResult, setValidateResult] = useState(null);
  const [validating, setValidating] = useState(false);
  const [tokenForm, setTokenForm] = useState({ app_id: '', app_name: '', expires_in_hours: 24, description: '' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, t, tk, h, k, ac, ah] = await Promise.all([
        api.getMonitorSummary(),
        api.listTLS(),
        api.listTokens(),
        api.listClusterHealth(),
        api.listKafka(),
        api.getAlertConfig(),
        api.getAlertHistory(),
      ]);
      setSummary(s);
      setTlsCerts(t);
      setTokens(tk);
      setHealth(h);
      setKafka(k);
      setAlertConfig(ac);
      setAlertHistory(ah);
    } catch (err) {
      console.error('Failed to fetch monitors:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchApiTokens = useCallback(async () => {
    try {
      const [tokensRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/tokens/list`),
        fetch(`${API_BASE}/api/tokens/stats`),
      ]);
      if (tokensRes.ok) setApiTokens(await tokensRes.json());
      if (statsRes.ok) setTokenStats(await statsRes.json());
    } catch (err) {
      console.error('Failed to fetch API tokens:', err);
    }
  }, []);

  useEffect(() => { if (activeTab === 'tokens') fetchApiTokens(); }, [activeTab, fetchApiTokens]);

  const handleGenerateToken = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/tokens/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenForm),
      });
      if (res.ok) {
        const data = await res.json();
        setNewTokenResult(data);
        setShowAddToken(false);
        setTokenForm({ app_id: '', app_name: '', expires_in_hours: 24, description: '' });
        fetchApiTokens();
      }
    } catch (err) {
      console.error('Failed to generate token:', err);
    }
  };

  const handleRevokeToken = async (id) => {
    if (!confirm('Revoke this token?')) return;
    await fetch(`${API_BASE}/api/tokens/${id}/revoke`, { method: 'POST' });
    fetchApiTokens();
  };

  const handleDeleteToken = async (id) => {
    if (!confirm('Permanently delete this token?')) return;
    await fetch(`${API_BASE}/api/tokens/${id}`, { method: 'DELETE' });
    fetchApiTokens();
  };

  const handleCheckTLS = async () => {
    setChecking(true);
    try {
      await api.checkTLS(tlsForm.host, tlsForm.port, tlsForm.name);
      setShowAddTLS(false);
      setTlsForm({ host: '', port: 443, name: '' });
      fetchAll();
    } catch (err) { console.error(err); }
    finally { setChecking(false); }
  };

  const handlePingAll = async () => {
    setChecking(true);
    try { await api.pingAllClusters(); fetchAll(); }
    catch (err) { console.error(err); }
    finally { setChecking(false); }
  };

  const handleCheckKafka = async () => {
    setChecking(true);
    try {
      await api.checkKafka(kafkaForm.cluster_id, kafkaForm.namespace, kafkaForm.secret_name, kafkaForm.key_type);
      setShowAddKafka(false);
      setKafkaForm({ cluster_id: '', namespace: '', secret_name: '', key_type: 'sasl-plain' });
      fetchAll();
    } catch (err) { console.error(err); }
    finally { setChecking(false); }
  };

  const statusColor = (status) => {
    const colors = {
      valid: 'text-green-600 bg-green-50',
      healthy: 'text-green-600 bg-green-50',
      expiring: 'text-amber-600 bg-amber-50',
      'needs-rotation': 'text-amber-600 bg-amber-50',
      expired: 'text-red-600 bg-red-50',
      unhealthy: 'text-red-600 bg-red-50',
      unreachable: 'text-red-600 bg-red-50',
      error: 'text-gray-600 bg-gray-50',
      unknown: 'text-gray-600 bg-gray-50',
    };
    return colors[status] || 'text-gray-600 bg-gray-50';
  };

  const getTokenTimeLeft = (expiresAt) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return { text: 'Expired', expired: true };
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    if (d > 0) return { text: `${d}d ${h}h`, expired: false, urgent: d <= 7 };
    const m = Math.floor((diff % 3600000) / 60000);
    return { text: `${h}h ${m}m`, expired: false, urgent: h <= 24 };
  };

  // Full page token list view
  if (showTokenList) {
    const grouped = {};
    apiTokens.forEach(t => {
      if (!grouped[t.app_id]) grouped[t.app_id] = { name: t.app_name, tokens: [] };
      grouped[t.app_id].tokens.push(t);
    });

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <button onClick={() => { setShowTokenList(false); setTokenDetailApp(null); }}
              className="text-sm text-blue-600 hover:underline mb-2 flex items-center gap-1">
              ← Back to Monitor
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">🔑 API Tokens</h1>
                <p className="mt-1 text-sm text-gray-500">
                  {apiTokens.length} tokens across {Object.keys(grouped).length} projects
                </p>
              </div>
              <button onClick={() => setActiveTab('tokens')}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 self-start">
                Manage Tokens
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatBox label="Total" value={apiTokens.length} color="blue" />
            <StatBox label="Active" value={apiTokens.filter(t => !t.revoked && !getTokenTimeLeft(t.expires_at)?.expired).length} color="green" />
            <StatBox label="Expiring Soon" value={apiTokens.filter(t => !t.revoked && getTokenTimeLeft(t.expires_at)?.urgent).length} color="amber" />
            <StatBox label="Expired" value={apiTokens.filter(t => getTokenTimeLeft(t.expires_at)?.expired).length} color="red" />
            <StatBox label="Revoked" value={apiTokens.filter(t => t.revoked).length} color="gray" />
          </div>

          {/* Detail view for a specific app */}
          {tokenDetailApp ? (
            <div>
              <button onClick={() => setTokenDetailApp(null)}
                className="text-sm text-blue-600 hover:underline mb-4 flex items-center gap-1">
                ← All Projects
              </button>
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">{grouped[tokenDetailApp]?.name || tokenDetailApp}</h2>
                  <p className="text-sm text-gray-500 font-mono">{tokenDetailApp} · {grouped[tokenDetailApp]?.tokens.length} tokens</p>
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-white">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Token</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Created</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Expires</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Time Left</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Used</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {grouped[tokenDetailApp]?.tokens.map(t => {
                        const tl = getTokenTimeLeft(t.expires_at);
                        const expired = tl?.expired;
                        return (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-xs text-gray-700">{t.token_preview}</td>
                            <td className="px-4 py-3"><span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">JWT</span></td>
                            <td className="px-4 py-3 text-xs text-gray-600">{new Date(t.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-xs text-gray-600">{new Date(t.expires_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-xs font-medium">
                              {expired ? <span className="text-red-600">Expired</span>
                                : <span className={tl?.urgent ? 'text-orange-600' : 'text-gray-700'}>{tl?.text}</span>}
                            </td>
                            <td className="px-4 py-3">
                              {t.revoked ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Revoked</span>
                                : expired ? <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Expired</span>
                                : tl?.urgent ? <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">⚠ Expiring</span>
                                : <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">{t.use_count || 0}x</td>
                            <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{t.description || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-gray-100">
                  {grouped[tokenDetailApp]?.tokens.map(t => {
                    const tl = getTokenTimeLeft(t.expires_at);
                    const expired = tl?.expired;
                    return (
                      <div key={t.id} className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-gray-700">{t.token_preview}</span>
                          {t.revoked ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Revoked</span>
                            : expired ? <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Expired</span>
                            : tl?.urgent ? <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">⚠ Expiring</span>
                            : <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-gray-500">Created:</span> {new Date(t.created_at).toLocaleDateString()}</div>
                          <div><span className="text-gray-500">Expires:</span> {new Date(t.expires_at).toLocaleDateString()}</div>
                          <div><span className="text-gray-500">Time Left:</span>{' '}
                            {expired ? <span className="text-red-600 font-medium">Expired</span>
                              : <span className={tl?.urgent ? 'text-orange-600 font-medium' : 'text-gray-700'}>{tl?.text}</span>}
                          </div>
                          <div><span className="text-gray-500">Used:</span> {t.use_count || 0}x</div>
                        </div>
                        {t.description && <p className="text-xs text-gray-500">{t.description}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Project list */
            <div className="space-y-4">
              {Object.entries(grouped).map(([appId, data]) => {
                const active = data.tokens.filter(t => !t.revoked && !getTokenTimeLeft(t.expires_at)?.expired).length;
                const expiring = data.tokens.filter(t => !t.revoked && getTokenTimeLeft(t.expires_at)?.urgent).length;
                const expired = data.tokens.filter(t => getTokenTimeLeft(t.expires_at)?.expired).length;
                const revoked = data.tokens.filter(t => t.revoked).length;
                return (
                  <div key={appId}
                    onClick={() => setTokenDetailApp(appId)}
                    className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-50 p-2 sm:p-3">
                          <span className="text-xl sm:text-2xl">📦</span>
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-semibold text-gray-900">{data.name || appId}</h3>
                          <p className="text-xs sm:text-sm text-gray-500 font-mono">{appId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs">
                          {active > 0 && <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">{active} active</span>}
                          {expiring > 0 && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-orange-700">{expiring} expiring</span>}
                          {expired > 0 && <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-700">{expired} expired</span>}
                          {revoked > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">{revoked} revoked</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl sm:text-2xl font-bold text-gray-900">{data.tokens.length}</span>
                          <span className="text-gray-400">→</span>
                        </div>
                      </div>
                    </div>
                    {/* Token previews */}
                    <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                      {data.tokens.slice(0, 5).map(t => (
                        <span key={t.id} className="rounded-md bg-gray-100 px-2 py-1 text-[10px] sm:text-xs font-mono text-gray-600">
                          {t.token_preview}
                        </span>
                      ))}
                      {data.tokens.length > 5 && (
                        <span className="text-[10px] sm:text-xs text-gray-500 self-center">+{data.tokens.length - 5} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {Object.keys(grouped).length === 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
                  No tokens yet. Go to Tokens tab to generate one.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'tls', label: 'TLS/SSL', icon: '🔒' },
    { id: 'tokens', label: 'Tokens', icon: '🔑' },
    { id: 'health', label: 'Cluster Health', icon: '💓' },
    { id: 'kafka', label: 'Kafka', icon: '📨' },
    { id: 'alerts', label: 'Alerts', icon: '🔔' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Resource Monitor</h1>
              <p className="mt-1 text-sm text-gray-500">
                Track TLS certificates, API tokens, cluster health, and Kafka credentials
              </p>
            </div>
            <button onClick={fetchAll} disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {loading ? 'Loading...' : 'Refresh All'}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}>
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <OverviewCard icon="🔒" label="TLS/SSL Certificates" count={summary?.tls_count || 0}
                badges={[
                  summary?.tls_expiring > 0 && { text: `${summary.tls_expiring} expiring`, color: 'amber' },
                  summary?.tls_expired > 0 && { text: `${summary.tls_expired} expired`, color: 'red' },
                  !summary?.tls_expiring && !summary?.tls_expired && { text: 'All good', color: 'green' },
                ].filter(Boolean)} />
              <OverviewCard icon="🔑" label="API Tokens" count={apiTokens.length || summary?.tokens_count || 0}
                clickable onClick={() => setShowTokenList(true)}
                badges={[
                  apiTokens.filter(t => !t.revoked && new Date(t.expires_at) > new Date() && getTokenTimeLeft(t.expires_at)?.urgent).length > 0 &&
                    { text: `${apiTokens.filter(t => getTokenTimeLeft(t.expires_at)?.urgent).length} expiring`, color: 'amber' },
                  apiTokens.filter(t => new Date(t.expires_at) < new Date()).length > 0 &&
                    { text: `${apiTokens.filter(t => new Date(t.expires_at) < new Date()).length} expired`, color: 'red' },
                  { text: `${apiTokens.filter(t => !t.revoked && new Date(t.expires_at) > new Date()).length} active`, color: 'green' },
                ].filter(Boolean)} />
              <OverviewCard icon="💓" label="Cluster Health"
                count={(summary?.clusters_healthy || 0) + (summary?.clusters_unhealthy || 0)}
                badges={[
                  { text: `${summary?.clusters_healthy || 0} healthy`, color: 'green' },
                  summary?.clusters_unhealthy > 0 && { text: `${summary.clusters_unhealthy} unhealthy`, color: 'red' },
                ].filter(Boolean)} />
              <OverviewCard icon="📨" label="Kafka Keys" count={summary?.kafka_count || 0}
                badges={[
                  summary?.kafka_needing_rotation > 0
                    ? { text: `${summary.kafka_needing_rotation} need rotation`, color: 'amber' }
                    : { text: 'All good', color: 'green' },
                ]} />
            </div>

          </div>
        )}

        {/* ── TLS Tab ── */}
        {activeTab === 'tls' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowAddTLS(!showAddTLS)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                + Add Certificate Check
              </button>
            </div>
            {showAddTLS && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-4 gap-4">
                  <input type="text" value={tlsForm.host} onChange={(e) => setTlsForm({ ...tlsForm, host: e.target.value })}
                    placeholder="hostname" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input type="number" value={tlsForm.port} onChange={(e) => setTlsForm({ ...tlsForm, port: parseInt(e.target.value) })}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input type="text" value={tlsForm.name} onChange={(e) => setTlsForm({ ...tlsForm, name: e.target.value })}
                    placeholder="Label" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <button onClick={handleCheckTLS} disabled={checking || !tlsForm.host}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {checking ? 'Checking...' : 'Check'}
                  </button>
                </div>
              </div>
            )}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Host</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Issuer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Expires</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Days Left</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {tlsCerts.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No certificates monitored.</td></tr>
                  ) : tlsCerts.map((cert) => (
                    <tr key={cert.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{cert.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{cert.host}:{cert.port}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[200px]">{cert.issuer || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{cert.not_after ? new Date(cert.not_after).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3 text-sm font-medium">
                        <span className={cert.days_remaining < 30 ? 'text-red-600' : 'text-gray-900'}>{cert.days_remaining}d</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(cert.status)}`}>{cert.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tokens Tab ── */}
        {activeTab === 'tokens' && (
          <div className="space-y-6">
            {/* Action bar */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">API Token Monitor</h2>
              <div className="flex gap-2">
                <button onClick={() => { setShowAddToken(!showAddToken); setNewTokenResult(null); }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  + Add Token
                </button>
              </div>
            </div>

            {/* Stats */}
            {apiTokens.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatBox label="Total" value={apiTokens.length} color="blue" />
                <StatBox label="Active" value={apiTokens.filter(t => !t.revoked && new Date(t.expires_at) > new Date()).length} color="green" />
                <StatBox label="Expiring Soon" value={apiTokens.filter(t => !t.revoked && getTokenTimeLeft(t.expires_at)?.urgent).length} color="amber" />
                <StatBox label="Expired" value={apiTokens.filter(t => new Date(t.expires_at) < new Date()).length} color="red" />
              </div>
            )}

            {/* Generate token form */}
            {showAddToken && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">Generate New Token</h3>
                <form onSubmit={handleGenerateToken} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" required value={tokenForm.app_id}
                      onChange={(e) => setTokenForm({ ...tokenForm, app_id: e.target.value })}
                      placeholder="Project ID (e.g. my-app-001)"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white" />
                    <input type="text" required value={tokenForm.app_name}
                      onChange={(e) => setTokenForm({ ...tokenForm, app_name: e.target.value })}
                      placeholder="App Name (e.g. My App)"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {TOKEN_EXPIRY_PRESETS.map((p) => (
                      <button key={p.hours} type="button"
                        onClick={() => setTokenForm({ ...tokenForm, expires_in_hours: p.hours })}
                        className={`rounded-md px-3 py-1 text-xs font-medium border ${
                          tokenForm.expires_in_hours === p.hours
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}>{p.label}</button>
                    ))}
                  </div>
                  <input type="text" value={tokenForm.description}
                    onChange={(e) => setTokenForm({ ...tokenForm, description: e.target.value })}
                    placeholder="Description (optional)"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white" />
                  <div className="flex gap-2">
                    <button type="submit" disabled={!tokenForm.app_id || !tokenForm.app_name}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                      Generate
                    </button>
                    <button type="button" onClick={() => setShowAddToken(false)}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* New token result */}
            {newTokenResult && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-green-800">✓ Token Generated</h3>
                    <p className="text-xs text-green-700 mt-1">Copy this now — it won't be shown again.</p>
                  </div>
                  <button onClick={() => setNewTokenResult(null)} className="text-green-600 hover:text-green-800">✕</button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <code className="flex-1 rounded bg-white border border-green-200 px-3 py-2 text-xs font-mono break-all text-gray-800">
                    {newTokenResult.token}
                  </code>
                  <button onClick={() => { navigator.clipboard.writeText(newTokenResult.token); setCopied('new'); setTimeout(() => setCopied(null), 2000); }}
                    className="shrink-0 rounded bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700">
                    {copied === 'new' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-green-600">Expires: {new Date(newTokenResult.expires_at).toLocaleString()}</p>
              </div>
            )}

            {/* Token list */}
            {apiTokens.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
                No tokens yet. Click "Add Token" to generate one.
              </div>
            ) : (
              <div className="space-y-3">
                {apiTokens.map((t) => {
                  const timeLeft = getTokenTimeLeft(t.expires_at);
                  const isExpired = timeLeft?.expired;
                  return (
                    <div key={t.id} className={`rounded-xl border p-4 ${
                      t.revoked ? 'border-red-200 bg-red-50' : isExpired ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200 bg-white'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">{t.app_name}</span>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600">{t.app_id}</span>
                            {t.revoked ? (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Revoked</span>
                            ) : isExpired ? (
                              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Expired</span>
                            ) : timeLeft?.urgent ? (
                              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">⚠ Expiring Soon</span>
                            ) : (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="font-mono">{t.token_preview}</span>
                            <span>Created: {new Date(t.created_at).toLocaleDateString()}</span>
                            <span>Expires: {new Date(t.expires_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            {timeLeft && !isExpired && (
                              <span className={`font-medium ${timeLeft.urgent ? 'text-orange-600' : 'text-gray-600'}`}>
                                ⏰ {timeLeft.text} left
                              </span>
                            )}
                            {isExpired && (
                              <span className="font-medium text-red-600">⏰ Expired {timeLeft?.text || ''}</span>
                            )}
                            <span className="text-gray-500">Used: {t.use_count || 0}x</span>
                          </div>
                          {t.description && <p className="text-xs text-gray-500">{t.description}</p>}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button onClick={() => { navigator.clipboard.writeText(t.token_preview); setCopied(t.id); setTimeout(() => setCopied(null), 2000); }}
                            className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100">
                            {copied === t.id ? '✓' : '📋'}
                          </button>
                          {!t.revoked && (
                            <button onClick={() => handleRevokeToken(t.id)}
                              className="rounded px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50">🚫</button>
                          )}
                          <button onClick={() => handleDeleteToken(t.id)}
                            className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">🗑️</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Validate a token */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">🔍 Validate Token</h3>
              <p className="text-xs text-gray-500 mb-3">Paste any JWT token to check expiry and claims</p>
              <div className="flex gap-3">
                <textarea value={pasteToken}
                  onChange={(e) => { setPasteToken(e.target.value); setValidateResult(null); }}
                  placeholder="eyJhbGciOiJIUzI1NiIs..." rows={2}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <button onClick={async () => {
                    if (!pasteToken.trim()) return;
                    setValidating(true); setValidateResult(null);
                    try {
                      const res = await fetch(`${API_BASE}/api/tokens/validate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: pasteToken.trim() }),
                      });
                      setValidateResult(await res.json());
                    } catch { setValidateResult({ ok: false, error: 'Failed to connect to server' }); }
                    finally { setValidating(false); }
                  }}
                  disabled={validating || !pasteToken.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 h-fit">
                  {validating ? 'Checking...' : '🔍 Check'}
                </button>
              </div>
              {validateResult && (
                <div className={`mt-3 rounded-lg p-3 text-sm ${validateResult.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {validateResult.ok ? (
                    <div>
                      <p className="font-semibold mb-2">✓ Valid Token</p>
                      {validateResult.payload && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.entries(validateResult.payload).map(([k, v]) => (
                            <div key={k} className="rounded bg-white border border-green-200 p-2">
                              <p className="text-[10px] text-gray-500 uppercase">{k}</p>
                              <p className="text-xs font-mono font-medium text-gray-900 break-all">
                                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>✗ {validateResult.error}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Health Tab ── */}
        {activeTab === 'health' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={handlePingAll} disabled={checking}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {checking ? 'Pinging...' : 'Ping All Clusters'}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {health.length === 0 ? (
                <div className="col-span-full rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
                  No cluster health data. Click "Ping All Clusters".
                </div>
              ) : health.map((h) => (
                <div key={h.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${h.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <h3 className="font-medium text-gray-900">{h.cluster_name}</h3>
                        <p className="text-xs text-gray-500">{h.k8s_version || 'Unknown'}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(h.status)}`}>{h.status}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Latency:</span> <span className="font-medium">{h.latency_ms ? `${h.latency_ms}ms` : '-'}</span></div>
                    <div><span className="text-gray-500">Nodes:</span> <span className="font-medium">{h.node_count ?? '-'}</span></div>
                    <div><span className="text-gray-500">Pods:</span> <span className="font-medium">{h.pod_count ?? '-'}</span></div>
                    <div><span className="text-gray-500">Last Ping:</span> <span className="text-xs">{new Date(h.last_ping).toLocaleTimeString()}</span></div>
                  </div>
                  {h.error && <p className="mt-2 text-xs text-red-600">{h.error}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Kafka Tab ── */}
        {activeTab === 'kafka' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowAddKafka(!showAddKafka)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                + Add Kafka Key Check
              </button>
            </div>
            {showAddKafka && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-5 gap-4">
                  <input type="text" value={kafkaForm.cluster_id} onChange={(e) => setKafkaForm({ ...kafkaForm, cluster_id: e.target.value })}
                    placeholder="Cluster ID" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input type="text" value={kafkaForm.namespace} onChange={(e) => setKafkaForm({ ...kafkaForm, namespace: e.target.value })}
                    placeholder="Namespace" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input type="text" value={kafkaForm.secret_name} onChange={(e) => setKafkaForm({ ...kafkaForm, secret_name: e.target.value })}
                    placeholder="Secret Name" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <select value={kafkaForm.key_type} onChange={(e) => setKafkaForm({ ...kafkaForm, key_type: e.target.value })}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="sasl-plain">SASL/PLAIN</option>
                    <option value="sasl-scram">SASL/SCRAM</option>
                    <option value="ssl">SSL</option>
                    <option value="api-key">API Key</option>
                  </select>
                  <button onClick={handleCheckKafka} disabled={checking || !kafkaForm.secret_name}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {checking ? 'Checking...' : 'Check'}
                  </button>
                </div>
              </div>
            )}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Namespace</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {kafka.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No Kafka keys monitored.</td></tr>
                  ) : kafka.map((k) => (
                    <tr key={k.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{k.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{k.key_type}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{k.namespace}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{k.username || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(k.status)}`}>{k.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Alerts Tab ── */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Alert Configuration</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">Thresholds</h3>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={alertConfig?.enabled || false}
                      onChange={(e) => setAlertConfig({ ...alertConfig, enabled: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">Enable Alerts</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Warning (days)</label>
                      <input type="number" value={alertConfig?.warning_days || 7}
                        onChange={(e) => setAlertConfig({ ...alertConfig, warning_days: parseInt(e.target.value) })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" min="1" max="90" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Critical (days)</label>
                      <input type="number" value={alertConfig?.critical_days || 3}
                        onChange={(e) => setAlertConfig({ ...alertConfig, critical_days: parseInt(e.target.value) })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" min="1" max="30" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">Webhook (Slack / Teams / Discord)</h3>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={alertConfig?.webhook_enabled || false}
                      onChange={(e) => setAlertConfig({ ...alertConfig, webhook_enabled: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">Enable Webhook</span>
                  </label>
                  {alertConfig?.webhook_enabled && (
                    <div className="space-y-3">
                      <select value={alertConfig?.webhook_type || 'slack'}
                        onChange={(e) => setAlertConfig({ ...alertConfig, webhook_type: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                        <option value="slack">Slack</option>
                        <option value="teams">Microsoft Teams</option>
                        <option value="discord">Discord</option>
                      </select>
                      <input type="text" value={alertConfig?.webhook_urls?.join('\n') || ''}
                        onChange={(e) => setAlertConfig({ ...alertConfig, webhook_urls: e.target.value.split('\n').filter(Boolean) })}
                        placeholder="Webhook URL (one per line)"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                    </div>
                  )}
                </div>
              </div>
              {testResult && (
                <div className={`mt-4 rounded-lg p-3 text-sm ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {testResult.message || testResult.error}
                </div>
              )}
              <div className="mt-6 flex items-center gap-4">
                <button onClick={async () => { setSaving(true); await api.updateAlertConfig(alertConfig); setSaving(false); fetchAll(); }}
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
                <button onClick={async () => { setChecking(true); await api.checkAlerts(); setChecking(false); fetchAll(); }}
                  disabled={checking}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  {checking ? 'Checking...' : 'Check Now'}
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-700">Alert History</h3>
              </div>
              <table className="w-full">
                <thead><tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Resource</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Message</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Notified</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {alertHistory.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No alerts yet.</td></tr>
                  ) : alertHistory.map((alert) => (
                    <tr key={alert.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(alert.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          alert.severity === 'expired' ? 'bg-red-100 text-red-700'
                            : alert.severity === 'critical' ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>{alert.severity}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{alert.resource_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{alert.message}</td>
                      <td className="px-4 py-3">
                        {alert.notified ? <span className="text-green-600 text-xs">✓ Sent</span> : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helper Components ──

function OverviewCard({ icon, label, count, badges, clickable, onClick }) {
  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all ${
        clickable ? 'cursor-pointer hover:border-blue-300 hover:shadow-md hover:bg-blue-50/30' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gray-50 p-2"><span className="text-2xl">{icon}</span></div>
        <div className="flex-1">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{count}</p>
        </div>
        {clickable && <span className="text-gray-400 text-sm">→</span>}
      </div>
      <div className="mt-3 flex gap-2 text-xs flex-wrap">
        {badges.map((b, i) => (
          <span key={i} className={`rounded-full px-2 py-0.5 ${
            b.color === 'green' ? 'bg-green-100 text-green-700'
              : b.color === 'red' ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-700'
          }`}>{b.text}</span>
        ))}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  const colors = { blue: 'bg-blue-50 border-blue-200', green: 'bg-green-50 border-green-200', amber: 'bg-amber-50 border-amber-200', red: 'bg-red-50 border-red-200' };
  return (
    <div className={`rounded-lg border p-3 ${colors[color] || colors.blue}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
