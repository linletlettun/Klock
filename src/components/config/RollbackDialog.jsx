import { useState } from 'react';

/**
 * Rollback confirmation dialog
 * Shows diff and asks for confirmation before rolling back
 */
export function RollbackDialog({ isOpen, onClose, onConfirm, config, loading }) {
  const [confirmText, setConfirmText] = useState('');

  if (!isOpen) return null;

  const isConfirmValid = confirmText === 'rollback';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative mx-4 w-full max-w-lg rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
              <svg
                className="h-6 w-6 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Rollback
              </h3>
              <p className="text-sm text-gray-500">
                This will revert the configuration to its previous state.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <div className="mb-4 rounded-lg bg-gray-50 p-4">
            <div className="text-sm text-gray-700">
              <p>
                <strong>Resource:</strong> {config?.name || 'Unknown'}
              </p>
              <p>
                <strong>Namespace:</strong> {config?.namespace || 'All'}
              </p>
              <p>
                <strong>Action:</strong> Rollback configuration
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-700">
            <svg
              className="mr-1 inline h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <strong>Warning:</strong> This action will revert all changes made to
            this configuration. Any services using the current configuration may
            need to be restarted.
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">
              Type <code className="rounded bg-gray-100 px-1">rollback</code> to
              confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="rollback"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              setConfirmText('');
            }}
            disabled={!isConfirmValid || loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Rolling back...' : 'Rollback'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RollbackDialog;
