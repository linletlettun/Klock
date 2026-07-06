import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const TOKEN_TYPES = [
  { id: 'api', label: 'API Key', icon: '🔑' },
  { id: 'jwt', label: 'JWT', icon: '🎫' },
  { id: 'bearer', label: 'Bearer Token', icon: '🔒' },
  { id: 'oauth', label: 'OAuth', icon: '🌐' },
  { id: 'service-account', label: 'Service Account', icon: '🤖' },
];

const EXPIRY_PRESETS = [
  { label: '1 Hour', hours: 1 },
  { label: '24 Hours', hours: 24 },
  { label: '7 Days', hours: 168 },
  { label: '30 Days', hours: 720 },
  { label: '90 Days', hours: 2160 },
  { label: '1 Year', hours: 8760 },
];

/**
 * JWT Token Manager — generate, list, copy, revoke, rotate API tokens for multiple projects.
 * Includes jwt.io-style decoder/validator.
 */
export default function TokenManager() {
  const [tokens, setTokens] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generatedToken, setGeneratedToken] = useState(null);
  const [copied, setCopied] = useState(null);
  const [filterApp, setFilterApp] = useState('');
  const [activeView, setActiveView] = useState('list'); // 'list' | 'decoder'

  const fetchTokens = useCallback(async () => {
    try {
      setLoading(true);
      const [tokensRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/tokens/list${filterApp ? `?app_id=${filterApp}` : ''}`),
        fetch(`${API_BASE}/api/tokens/stats`),
      ]);
      if (tokensRes.ok) setTokens(await tokensRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.error('Failed to fetch tokens:', err);
    } finally {
      setLoading(false);
    }
  }, [filterApp]);

  useEffect(() => { fetchTokens(); }, [fetchTokens]);

  const handleGenerate = async (form) => {
    try {
      const res = await fetch(`${API_BASE}/api/tokens/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedToken(data);
        fetchTokens();
      }
    } catch (err) {
      console.error('Failed to generate token:', err);
    }
  };

  const handleRevoke = async (tokenId) => {
    if (!confirm('Revoke this token? It will stop working immediately.')) return;
    try {
      const res = await fetch(`${API_BASE}/api/tokens/${tokenId}/revoke`, { method: 'POST' });
      if (res.ok) fetchTokens();
    } catch (err) {
      console.error('Failed to revoke token:', err);
    }
  };

  const handleRotate = async (tokenId) => {
    if (!confirm('Rotate this token? A new token will be generated and the old one revoked.')) return;
    try {
      const res = await fetch(`${API_BASE}/api/tokens/${tokenId}/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expires_in_hours: 24 }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedToken(data.new_token);
        fetchTokens();
      }
    } catch (err) {
      console.error('Failed to rotate token:', err);
    }
  };

  const handleDelete = async (tokenId) => {
    if (!confirm('Permanently delete this token? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/api/tokens/${tokenId}`, { method: 'DELETE' });
      if (res.ok) fetchTokens();
    } catch (err) {
      console.error('Failed to delete token:', err);
    }
  };

  const copyToken = (token) => {
    navigator.clipboard.writeText(token);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getTimeLeft = (expiresAt) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return { text: 'Expired', expired: true };
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (d > 0) return { text: `${d}d ${h}h`, expired: false, urgent: d <= 7 };
    if (h > 0) return { text: `${h}h ${m}m`, expired: false, urgent: h <= 24 };
    return { text: `${m}m`, expired: false, urgent: true };
  };

  const isExpired = (expiresAt) => new Date(expiresAt) < new Date();
  const uniqueApps = [...new Set(tokens.map((t) => t.app_id))];
  const activeTokens = tokens.filter((t) => !t.revoked && !isExpired(t.expires_at));
  const expiredTokens = tokens.filter((t) => isExpired(t.expires_at));
  const revokedTokens = tokens.filter((t) => t.revoked);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">API Tokens</h2>
          <p className="text-sm text-gray-500">Manage JWT tokens for multiple projects and applications</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView(activeView === 'list' ? 'decoder' : 'list')}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {activeView === 'list' ? '🔍 Token Decoder' : '📋 Token List'}
          </button>
          <button
            onClick={() => { setShowGenerate(true); setGeneratedToken(null); }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Generate Token
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total" value={tokens.length} icon="🔑" color="blue" />
        <StatCard label="Active" value={activeTokens.length} icon="✅" color="green" />
        <StatCard label="Expiring Soon" value={activeTokens.filter((t) => getTimeLeft(t.expires_at)?.urgent).length} icon="⏰" color="amber" />
        <StatCard label="Expired" value={expiredTokens.length} icon="❌" color="red" />
        <StatCard label="Revoked" value={revokedTokens.length} icon="🚫" color="gray" />
      </div>

      {/* Token Decoder View */}
      {activeView === 'decoder' && <TokenDecoder />}

      {/* Token List View */}
      {activeView === 'list' && (
        <>
          {/* Filter */}
          {uniqueApps.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Filter by project:</span>
              <select
                value={filterApp}
                onChange={(e) => setFilterApp(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Projects</option>
                {uniqueApps.map((app) => (
                  <option key={app} value={app}>{app}</option>
                ))}
              </select>
            </div>
          )}

          {/* Generated Token Display */}
          {generatedToken && (
            <GeneratedTokenBanner token={generatedToken} onDismiss={() => setGeneratedToken(null)} onCopy={copyToken} copied={copied} />
          )}

          {/* Token List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            </div>
          ) : tokens.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
              <p className="text-gray-500">No tokens yet. Generate one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tokens.map((t) => (
                <TokenCard
                  key={t.id}
                  token={t}
                  timeLeft={getTimeLeft(t.expires_at)}
                  onCopy={copyToken}
                  onRevoke={handleRevoke}
                  onRotate={handleRotate}
                  onDelete={handleDelete}
                  copied={copied}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Generate Modal */}
      {showGenerate && (
        <GenerateTokenModal
          onClose={() => setShowGenerate(false)}
          onGenerate={handleGenerate}
        />
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────

function StatCard({ label, value, icon, color }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    amber: 'bg-amber-50 border-amber-200',
    red: 'bg-red-50 border-red-200',
    gray: 'bg-gray-50 border-gray-200',
  };
  return (
    <div className={`rounded-lg border p-3 ${colors[color] || colors.blue}`}>
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

function TokenCard({ token, timeLeft, onCopy, onRevoke, onRotate, onDelete, copied }) {
  const [expanded, setExpanded] = useState(false);
  const t = token;

  const statusBadge = () => {
    if (t.revoked) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Revoked</span>;
    if (timeLeft?.expired) return <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Expired</span>;
    if (timeLeft?.urgent) return <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">Expiring Soon</span>;
    return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>;
  };

  const typeInfo = TOKEN_TYPES.find((tt) => tt.id === t.token_type) || TOKEN_TYPES[0];

  return (
    <div className={`rounded-lg border p-4 transition-all ${
      t.revoked ? 'border-red-200 bg-red-50' : timeLeft?.expired ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200 bg-white hover:border-blue-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg">{typeInfo.icon}</span>
            <span className="text-sm font-semibold text-gray-900">{t.app_name}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600">{t.app_id}</span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{typeInfo.label}</span>
            {statusBadge()}
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="font-mono">{t.token_preview}</span>
            <span>Created: {formatDate(t.created_at)}</span>
            <span>Expires: {formatDate(t.expires_at)}</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            {timeLeft && !timeLeft.expired && (
              <span className={`font-medium ${timeLeft.urgent ? 'text-orange-600' : 'text-gray-600'}`}>
                ⏰ {timeLeft.text} left
              </span>
            )}
            <span className="text-gray-500">Used: {t.use_count || 0}x</span>
            {t.last_used && <span className="text-gray-500">Last: {formatDate(t.last_used)}</span>}
          </div>
          {t.description && <p className="text-xs text-gray-500">{t.description}</p>}
        </div>

        <div className="flex items-center gap-1 ml-2">
          {!t.revoked && !timeLeft?.expired && (
            <>
              <button onClick={() => onRotate(t.id)} className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50" title="Rotate">🔄</button>
              <button onClick={() => onRevoke(t.id)} className="rounded px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50" title="Revoke">🚫</button>
            </>
          )}
          <button onClick={() => onDelete(t.id)} className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50" title="Delete">🗑️</button>
          <button onClick={() => setExpanded(!expanded)} className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div><span className="text-gray-500">Token ID:</span> <span className="font-mono">{t.id}</span></div>
          <div><span className="text-gray-500">App ID:</span> <span className="font-mono">{t.app_id}</span></div>
          <div><span className="text-gray-500">Type:</span> <span className="font-mono">{typeInfo.label}</span></div>
          <div><span className="text-gray-500">Claims:</span> <span className="font-mono">{t.claims ? JSON.stringify(t.claims) : 'None'}</span></div>
        </div>
      )}
    </div>
  );
}

function GeneratedTokenBanner({ token, onDismiss, onCopy, copied }) {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-green-800">Token Generated Successfully</h3>
          <p className="text-xs text-green-700 mt-1">Copy this token now — it won't be shown again.</p>
        </div>
        <button onClick={onDismiss} className="text-green-600 hover:text-green-800">✕</button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 rounded bg-white border border-green-200 px-3 py-2 text-xs font-mono break-all text-gray-800">
          {token.token}
        </code>
        <button
          onClick={() => onCopy(token.token)}
          className="shrink-0 rounded bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700"
        >
          {copied === token.token ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <p className="mt-2 text-xs text-green-600">Expires: {new Date(token.expires_at).toLocaleString()}</p>
    </div>
  );
}

// ── Token Decoder (jwt.io style) ──────────────────────────

function TokenDecoder() {
  const [tokenInput, setTokenInput] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [decodeResult, setDecodeResult] = useState(null);
  const [decoding, setDecoding] = useState(false);

  const handleDecode = async () => {
    if (!tokenInput.trim()) return;
    setDecoding(true);
    setDecodeResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/tokens/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim(), secret: secretInput.trim() || undefined }),
      });
      const data = await res.json();
      setDecodeResult(data);
    } catch {
      setDecodeResult({ ok: false, error: 'Failed to connect to server' });
    } finally {
      setDecoding(false);
    }
  };

  const decodeLocal = (token) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return { header, payload };
    } catch {
      return null;
    }
  };

  const localDecode = decodeLocal(tokenInput);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">🔍</span>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Token Decoder</h3>
          <p className="text-xs text-gray-500">Paste a JWT to decode header, payload, and verify signature — like jwt.io</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Encoded Token</label>
          <textarea
            value={tokenInput}
            onChange={(e) => { setTokenInput(e.target.value); setDecodeResult(null); }}
            placeholder="eyJhbGciOiJIUzI1NiIs..."
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Secret / Signing Key (optional)</label>
          <textarea
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            placeholder="your-256-bit-secret"
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        onClick={handleDecode}
        disabled={decoding || !tokenInput.trim()}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {decoding ? 'Decoding...' : '🔍 Decode & Verify'}
      </button>

      {/* Live local decode */}
      {localDecode && !decodeResult && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">Header</p>
            <pre className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs overflow-auto max-h-40">
              {JSON.stringify(localDecode.header, null, 2)}
            </pre>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">Payload</p>
            <pre className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs overflow-auto max-h-40">
              {JSON.stringify(localDecode.payload, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Server validation result */}
      {decodeResult && (
        <div className={`rounded-lg border p-4 ${decodeResult.ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={decodeResult.ok ? 'text-green-600' : 'text-red-600'}>
              {decodeResult.ok ? '✓ Valid' : '✗ Invalid'}
            </span>
            {decodeResult.error && <span className="text-sm text-red-600">— {decodeResult.error}</span>}
          </div>

          {decodeResult.payload && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(decodeResult.payload).map(([key, val]) => (
                  <div key={key} className="rounded bg-white border border-gray-200 p-2">
                    <p className="text-[10px] text-gray-500 uppercase">{key}</p>
                    <p className="text-xs font-mono font-medium text-gray-900 break-all">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Generate Modal ─────────────────────────────────────────

function GenerateTokenModal({ onClose, onGenerate }) {
  const [form, setForm] = useState({
    app_id: '',
    app_name: '',
    token_type: 'jwt',
    expires_in_hours: 24,
    description: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.app_id || !form.app_name) return;
    onGenerate(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Generate Token</h2>
            <p className="text-sm text-gray-500">Create a token for your application</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project / App ID *</label>
            <input
              type="text"
              required
              value={form.app_id}
              onChange={(e) => setForm({ ...form, app_id: e.target.value })}
              placeholder="my-project-001"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Application Name *</label>
            <input
              type="text"
              required
              value={form.app_name}
              onChange={(e) => setForm({ ...form, app_name: e.target.value })}
              placeholder="My Application"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Token Type</label>
            <div className="grid grid-cols-3 gap-2">
              {TOKEN_TYPES.map((tt) => (
                <button
                  key={tt.id}
                  type="button"
                  onClick={() => setForm({ ...form, token_type: tt.id })}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                    form.token_type === tt.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{tt.icon}</span>
                  <span className="text-xs font-medium text-gray-700">{tt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Expires In</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {EXPIRY_PRESETS.map((p) => (
                <button
                  key={p.hours}
                  type="button"
                  onClick={() => setForm({ ...form, expires_in_hours: p.hours })}
                  className={`rounded-md px-3 py-1 text-xs font-medium border transition-colors ${
                    form.expires_in_hours === p.hours
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="8760"
                value={form.expires_in_hours}
                onChange={(e) => setForm({ ...form, expires_in_hours: parseInt(e.target.value) || 24 })}
                className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">hours</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Token for CI/CD pipeline"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={!form.app_id || !form.app_name}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              Generate Token
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
