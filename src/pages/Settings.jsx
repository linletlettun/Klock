import { useState, useEffect, useCallback } from 'react';
import TokenManager from '@/components/apps/TokenManager';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Settings page for managing Git, ArgoCD, Vault, Consul, Nacos, and namespace blacklist.
 * Each config management system has test-connection and secret browsing.
 */
export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('git');

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/settings`);
      if (res.ok) setSettings(await res.json());
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSettings(await res.json());
        setSaveMessage({ type: 'success', text: 'Settings saved successfully' });
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings({ ...settings, [field]: value });
    setSaveMessage(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  const tabs = [
    { id: 'git', label: 'Git Provider', icon: '🔧' },
    { id: 'argocd', label: 'ArgoCD', icon: '🔄' },
    { id: 'vault', label: 'Vault', icon: '🔐' },
    { id: 'consul', label: 'Consul', icon: '🗂️' },
    { id: 'nacos', label: 'Nacos', icon: '📦' },
    { id: 'tokens', label: 'API Tokens', icon: '🔑' },
    { id: 'vercel', label: 'Vercel', icon: '▲' },
    { id: 'blacklist', label: 'Namespace Blacklist', icon: '🚫' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure Git provider, ArgoCD, and configuration management (Vault, Consul, Nacos)
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {activeTab === 'git' && <GitTab settings={settings} onChange={handleChange} />}
          {activeTab === 'argocd' && <ArgoCDTab settings={settings} onChange={handleChange} />}
          {activeTab === 'vault' && <VaultTab settings={settings} onChange={handleChange} />}
          {activeTab === 'consul' && <ConsulTab settings={settings} onChange={handleChange} />}
          {activeTab === 'nacos' && <NacosTab settings={settings} onChange={handleChange} />}
          {activeTab === 'tokens' && <TokenManager />}
          {activeTab === 'vercel' && <VercelTab settings={settings} onChange={handleChange} />}
          {activeTab === 'blacklist' && <BlacklistTab settings={settings} onChange={handleChange} />}

          {/* Save button — not needed for Tokens tab (self-contained) */}
          {activeTab !== 'tokens' && (
          <div className="mt-6 flex items-center gap-4 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            {saveMessage && (
              <span className={`text-sm ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {saveMessage.text}
              </span>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reusable components ────────────────────────────────────

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', mono }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${mono ? 'font-mono' : ''}`}
    />
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </label>
  );
}

function TestButton({ onClick, testing, result }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={testing}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {testing ? 'Testing...' : 'Test Connection'}
      </button>
      {result && (
        <span className={`text-sm ${result.ok ? 'text-green-600' : 'text-red-600'}`}>
          {result.ok ? `✓ Connected${result.version ? ` (v${result.version})` : ''}` : `✗ ${result.error}`}
        </span>
      )}
    </div>
  );
}

// ── Git Tab ────────────────────────────────────────────────

function GitTab({ settings, onChange }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Git Provider Configuration</h2>
      <Field label="Provider">
        <select
          value={settings?.git_provider || 'gitlab'}
          onChange={(e) => onChange('git_provider', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="gitlab">GitLab</option>
          <option value="github">GitHub</option>
        </select>
      </Field>
      <Field label="Repository URL">
        <Input value={settings?.git_url} onChange={(v) => onChange('git_url', v)} placeholder="https://gitlab.example.com/group/project" />
      </Field>
      <Field label="Access Token" hint={settings?.git_token_masked ? `Current: ${settings.git_token_masked}` : ''}>
        <Input value={settings?.git_token} onChange={(v) => onChange('git_token', v)} placeholder="glpat-xxxxxxxxxxxx" type="password" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Branch">
          <Input value={settings?.git_branch} onChange={(v) => onChange('git_branch', v)} />
        </Field>
        <Field label="Manifest Path">
          <Input value={settings?.git_manifest_path} onChange={(v) => onChange('git_manifest_path', v)} />
        </Field>
      </div>
    </div>
  );
}

// ── ArgoCD Tab ─────────────────────────────────────────────

function ArgoCDTab({ settings, onChange }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">ArgoCD Configuration</h2>
      <Field label="Server URL">
        <Input value={settings?.argocd_server_url} onChange={(v) => onChange('argocd_server_url', v)} placeholder="https://argocd.example.com" />
      </Field>
      <Field label="Auth Token" hint={settings?.argocd_auth_token_masked ? `Current: ${settings.argocd_auth_token_masked}` : ''}>
        <Input value={settings?.argocd_auth_token} onChange={(v) => onChange('argocd_auth_token', v)} placeholder="eyJhbGciOiJSUzI1NiIs..." type="password" />
      </Field>
      <Field label="Namespace">
        <Input value={settings?.argocd_namespace} onChange={(v) => onChange('argocd_namespace', v)} />
      </Field>
    </div>
  );
}

// ── Vault Tab ──────────────────────────────────────────────

function VaultTab({ settings, onChange }) {
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [secrets, setSecrets] = useState(null);
  const [secretPath, setSecretPath] = useState('');
  const [secretData, setSecretData] = useState(null);
  const [loadingSecrets, setLoadingSecrets] = useState(false);

  const testConnection = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/config/vault/test`, { method: 'POST' });
      setTestResult(await res.json());
    } catch {
      setTestResult({ ok: false, error: 'Connection failed' });
    } finally {
      setTesting(false);
    }
  }, []);

  const listSecrets = useCallback(async (path = '') => {
    setLoadingSecrets(true);
    setSecretData(null);
    try {
      const res = await fetch(`${API_BASE}/api/config/vault/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const data = await res.json();
      setSecrets(data);
      setSecretPath(path);
    } catch {
      setSecrets({ ok: false, error: 'Failed to list secrets' });
    } finally {
      setLoadingSecrets(false);
    }
  }, []);

  const getSecret = useCallback(async (path) => {
    try {
      const res = await fetch(`${API_BASE}/api/config/vault/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      setSecretData(await res.json());
    } catch {
      setSecretData({ ok: false, error: 'Failed to read secret' });
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">HashiCorp Vault</h2>
          <p className="text-sm text-gray-500">Secrets management with Vault KV engine</p>
        </div>
        <Toggle checked={settings?.vault_enabled} onChange={(v) => onChange('vault_enabled', v)} label="Enable" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Server URL">
          <Input value={settings?.vault_server_url} onChange={(v) => onChange('vault_server_url', v)} placeholder="https://vault.example.com:8200" />
        </Field>
        <Field label="Namespace" hint="Optional — for Vault Enterprise">
          <Input value={settings?.vault_namespace} onChange={(v) => onChange('vault_namespace', v)} placeholder="admin" />
        </Field>
      </div>
      <Field label="Token" hint={settings?.vault_token_masked ? `Current: ${settings.vault_token_masked}` : ''}>
        <Input value={settings?.vault_token} onChange={(v) => onChange('vault_token', v)} placeholder="hvs.xxxxxxxxxxxx" type="password" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="KV Mount Path">
          <Input value={settings?.vault_mount_path} onChange={(v) => onChange('vault_mount_path', v)} />
        </Field>
        <Field label="KV Version">
          <select
            value={settings?.vault_kv_version || 'v2'}
            onChange={(e) => onChange('vault_kv_version', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="v1">KV v1</option>
            <option value="v2">KV v2</option>
          </select>
        </Field>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <TestButton onClick={testConnection} testing={testing} result={testResult} />
      </div>

      {/* Secret browser */}
      {settings?.vault_enabled && (
        <div className="border-t border-gray-200 pt-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Browse Secrets</h3>
          <div className="flex gap-2">
            <Input value={secretPath} onChange={setSecretPath} placeholder="path/to/secrets" />
            <button
              onClick={() => listSecrets(secretPath)}
              disabled={loadingSecrets}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap"
            >
              {loadingSecrets ? 'Loading...' : 'List'}
            </button>
          </div>
          {secrets?.ok && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              {secrets.keys?.length === 0 ? (
                <p className="text-sm text-gray-500">No keys found</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {secrets.keys?.map((key) => (
                    <button
                      key={key}
                      onClick={() => getSecret(secretPath ? `${secretPath}/${key}` : key)}
                      className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-mono text-gray-700 hover:bg-blue-50 hover:border-blue-300"
                    >
                      {key.endsWith('/') ? `📁 ${key}` : `🔑 ${key}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {secretData?.ok && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs font-medium text-blue-800 mb-2">Secret: {secretPath}</p>
              <pre className="text-xs text-gray-700 overflow-auto max-h-48">
                {JSON.stringify(secretData.data, null, 2)}
              </pre>
            </div>
          )}
          {secrets && !secrets.ok && (
            <p className="text-sm text-red-600">{secrets.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Consul Tab ─────────────────────────────────────────────

function ConsulTab({ settings, onChange }) {
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [keys, setKeys] = useState(null);
  const [keyPath, setKeyPath] = useState('');
  const [keyData, setKeyData] = useState(null);
  const [loadingKeys, setLoadingKeys] = useState(false);

  const testConnection = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/config/consul/test`, { method: 'POST' });
      setTestResult(await res.json());
    } catch {
      setTestResult({ ok: false, error: 'Connection failed' });
    } finally {
      setTesting(false);
    }
  }, []);

  const listKeys = useCallback(async (prefix = '') => {
    setLoadingKeys(true);
    setKeyData(null);
    try {
      const res = await fetch(`${API_BASE}/api/config/consul/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: prefix }),
      });
      const data = await res.json();
      setKeys(data);
      setKeyPath(prefix);
    } catch {
      setKeys({ ok: false, error: 'Failed to list keys' });
    } finally {
      setLoadingKeys(false);
    }
  }, []);

  const getKey = useCallback(async (key) => {
    try {
      const res = await fetch(`${API_BASE}/api/config/consul/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: key }),
      });
      setKeyData(await res.json());
    } catch {
      setKeyData({ ok: false, error: 'Failed to read key' });
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">HashiCorp Consul</h2>
          <p className="text-sm text-gray-500">KV store for distributed configuration</p>
        </div>
        <Toggle checked={settings?.consul_enabled} onChange={(v) => onChange('consul_enabled', v)} label="Enable" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Server URL">
          <Input value={settings?.consul_server_url} onChange={(v) => onChange('consul_server_url', v)} placeholder="https://consul.example.com:8500" />
        </Field>
        <Field label="Datacenter">
          <Input value={settings?.consul_datacenter} onChange={(v) => onChange('consul_datacenter', v)} />
        </Field>
      </div>
      <Field label="ACL Token" hint={settings?.consul_token_masked ? `Current: ${settings.consul_token_masked}` : ''}>
        <Input value={settings?.consul_token} onChange={(v) => onChange('consul_token', v)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" type="password" />
      </Field>
      <Field label="KV Prefix">
        <Input value={settings?.consul_kv_prefix} onChange={(v) => onChange('consul_kv_prefix', v)} mono />
      </Field>

      <div className="border-t border-gray-200 pt-4">
        <TestButton onClick={testConnection} testing={testing} result={testResult} />
      </div>

      {/* KV browser */}
      {settings?.consul_enabled && (
        <div className="border-t border-gray-200 pt-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Browse KV Store</h3>
          <div className="flex gap-2">
            <Input value={keyPath} onChange={setKeyPath} placeholder="path/prefix" mono />
            <button
              onClick={() => listKeys(keyPath)}
              disabled={loadingKeys}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap"
            >
              {loadingKeys ? 'Loading...' : 'List'}
            </button>
          </div>
          {keys?.ok && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              {keys.keys?.length === 0 ? (
                <p className="text-sm text-gray-500">No keys found</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {keys.keys?.map((k) => (
                    <button
                      key={k}
                      onClick={() => getKey(k)}
                      className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-mono text-gray-700 hover:bg-blue-50 hover:border-blue-300"
                    >
                      {k.endsWith('/') ? `📁 ${k}` : `📄 ${k}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {keyData?.ok && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs font-medium text-blue-800 mb-2">Key: {keyData.key}</p>
              <pre className="text-xs text-gray-700 overflow-auto max-h-48 whitespace-pre-wrap">{keyData.value}</pre>
            </div>
          )}
          {keys && !keys.ok && (
            <p className="text-sm text-red-600">{keys.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Nacos Tab ──────────────────────────────────────────────

function NacosTab({ settings, onChange }) {
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const testConnection = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/nacos/test`, { method: 'POST' });
      setTestResult(await res.json());
    } catch {
      setTestResult({ ok: false, error: 'Connection failed' });
    } finally {
      setTesting(false);
    }
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Nacos Configuration</h2>
      <p className="text-sm text-gray-500">Centralized configuration management</p>
      <Field label="Server Address">
        <Input value={settings?.nacos_server_addr} onChange={(v) => onChange('nacos_server_addr', v)} placeholder="http://nacos.example.com:8848" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Namespace">
          <Input value={settings?.nacos_namespace} onChange={(v) => onChange('nacos_namespace', v)} />
        </Field>
        <Field label="Username">
          <Input value={settings?.nacos_username} onChange={(v) => onChange('nacos_username', v)} />
        </Field>
      </div>
      <Field label="Password" hint={settings?.nacos_password_masked ? `Current: ${settings.nacos_password_masked}` : ''}>
        <Input value={settings?.nacos_password} onChange={(v) => onChange('nacos_password', v)} type="password" />
      </Field>

      <div className="border-t border-gray-200 pt-4">
        <TestButton onClick={testConnection} testing={testing} result={testResult} />
      </div>
    </div>
  );
}

// ── Blacklist Tab ──────────────────────────────────────────

function VercelTab({ settings, onChange }) {
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const testConnection = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/deploy/vercel/test`, { method: 'POST' });
      setTestResult(await res.json());
    } catch {
      setTestResult({ ok: false, error: 'Connection failed' });
    } finally {
      setTesting(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">▲ Vercel Configuration</h2>
        <p className="text-sm text-gray-500">Deploy frontend apps to Vercel with instant previews</p>
      </div>

      <Field label="API Token" hint={settings?.vercel_token_masked ? `Current: ${settings.vercel_token_masked}` : 'Generate at vercel.com/account/tokens'}>
        <Input value={settings?.vercel_token} onChange={(v) => onChange('vercel_token', v)} placeholder="vercel_xxxxxxxxxxxx" type="password" />
      </Field>

      <Field label="Team ID (optional)" hint={settings?.vercel_team_id ? `Current: ${settings.vercel_team_id}` : 'For team accounts — find at vercel.com/teams'}>
        <Input value={settings?.vercel_team_id} onChange={(v) => onChange('vercel_team_id', v)} placeholder="team_xxxxxxxxxx" />
      </Field>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
        <p className="text-sm text-blue-800 font-medium">How to get a Vercel token:</p>
        <ol className="text-xs text-blue-700 mt-1 space-y-1 list-decimal list-inside">
          <li>Go to <a href="https://vercel.com/account/tokens" target="_blank" className="underline">vercel.com/account/tokens</a></li>
          <li>Click "Create" → Name it "Klock" → Select scope</li>
          <li>Copy the token and paste above</li>
        </ol>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <button onClick={testConnection} disabled={testing || (!settings?.vercel_token && !settings?.vercel_token_masked)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
        {testResult && (
          <span className={`ml-3 text-sm ${testResult.ok ? 'text-green-600' : 'text-red-600'}`}>
            {testResult.ok ? `✓ Connected as ${testResult.user}` : `✗ ${testResult.error}`}
          </span>
        )}
      </div>
    </div>
  );
}

function BlacklistTab({ settings, onChange }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Namespace Blacklist</h2>
      <p className="text-sm text-gray-500">
        System namespaces that should not be modified through configuration deployment.
      </p>
      <textarea
        value={(settings?.namespace_blacklist || []).join('\n')}
        onChange={(e) => onChange('namespace_blacklist', e.target.value.split('\n').filter(Boolean))}
        rows={8}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        placeholder={"kube-system\nkube-public\nkube-node-lease"}
      />
      <p className="text-xs text-gray-500">One namespace per line</p>
    </div>
  );
}
