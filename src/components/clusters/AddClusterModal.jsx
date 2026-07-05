import { useState } from 'react';

export default function AddClusterModal({ isOpen, onClose, onSubmit, editCluster }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: editCluster?.name || '',
    environment: editCluster?.environment || 'DEV',
    api_server: editCluster?.api_server || '',
    service_account_token: editCluster?.service_account_token || '',
    ca_cert: editCluster?.ca_cert || '',
    default_namespace: editCluster?.default_namespace || 'default',
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await onSubmit({ ...form, testOnly: true });
    setTestResult(result);
    setTesting(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const handleClose = () => {
    setStep(1);
    setTestResult(null);
    onClose();
  };

  if (!isOpen) return null;

  const envColors = {
    DEV: 'bg-green-100 text-green-700 border-green-300',
    STAGING: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    PROD: 'bg-red-100 text-red-700 border-red-300',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
        <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editCluster ? 'Edit Cluster' : 'Add Cluster'}
              </h2>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {!editCluster && (
              <div className="mt-3 flex gap-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5">
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cluster Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="production-cluster"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                    <div className="flex gap-3">
                      {['DEV', 'STAGING', 'PROD'].map((env) => (
                        <button
                          key={env}
                          type="button"
                          onClick={() => setForm({ ...form, environment: env })}
                          className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                            form.environment === env
                              ? envColors[env]
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          {env}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Namespace</label>
                    <input
                      type="text"
                      name="default_namespace"
                      value={form.default_namespace}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="default"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Server URL *</label>
                    <input
                      type="url"
                      name="api_server"
                      value={form.api_server}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://kubernetes.example.com:6443"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Account Token *</label>
                    <textarea
                      name="service_account_token"
                      value={form.service_account_token}
                      onChange={handleChange}
                      required
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="eyJhbGciOiJSUzI1NiIs..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CA Certificate <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      name="ca_cert"
                      value={form.ca_cert}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="LS0tLS1CRUdJTi..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing || !form.api_server}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                  {testResult && (
                    <div className={`rounded-lg p-3 text-sm ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {testResult.success ? `Connected! K8s version: ${testResult.k8s_version}` : `Failed: ${testResult.error}`}
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">Review & Confirm</h3>
                  <div className="rounded-lg bg-gray-50 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Name:</span>
                      <span className="font-medium">{form.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Environment:</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${envColors[form.environment]}`}>{form.environment}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">API Server:</span>
                      <span className="font-medium truncate ml-4 max-w-[200px]">{form.api_server}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Namespace:</span>
                      <span className="font-medium">{form.default_namespace}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Token:</span>
                      <span className="font-medium">••••••••</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                    Tokens are stored securely and never exposed via API responses.
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={() => (step > 1 ? setStep(step - 1) : handleClose())}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {step > 1 ? 'Back' : 'Cancel'}
              </button>
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  disabled={(step === 1 && !form.name) || (step === 2 && !form.api_server)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {editCluster ? 'Update' : 'Add Cluster'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
