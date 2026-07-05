import { useState } from 'react';

/**
 * Diff viewer component for comparing current vs new configuration
 * Shows masked values with reveal toggle
 */
export function DiffViewer({ current, newConfig, title = 'Configuration Diff' }) {
  const [showMasked, setShowMasked] = useState(true);

  const maskValue = (value) => {
    if (!showMasked) return value;
    return '••••••••';
  };

  const renderDiff = () => {
    const allKeys = new Set([
      ...Object.keys(current || {}),
      ...Object.keys(newConfig || {}),
    ]);

    if (allKeys.size === 0) {
      return (
        <div className="p-4 text-center text-sm text-gray-500">
          No configuration data to display
        </div>
      );
    }

    return Array.from(allKeys).map((key) => {
      const currentVal = current?.[key];
      const newVal = newConfig?.[key];
      const isAdded = currentVal === undefined && newVal !== undefined;
      const isRemoved = currentVal !== undefined && newVal === undefined;
      const isChanged = currentVal !== newVal;

      return (
        <div
          key={key}
          className={`border-b border-gray-100 px-4 py-2 ${
            isAdded
              ? 'bg-green-50'
              : isRemoved
              ? 'bg-red-50'
              : isChanged
              ? 'bg-yellow-50'
              : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-gray-700">
              {key}
            </span>
            {isAdded && (
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">
                Added
              </span>
            )}
            {isRemoved && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                Removed
              </span>
            )}
            {isChanged && !isAdded && !isRemoved && (
              <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">
                Changed
              </span>
            )}
          </div>
          <div className="mt-1 grid grid-cols-2 gap-4">
            <div className="rounded bg-gray-50 p-2">
              <div className="text-xs text-gray-500">Current</div>
              <div className="font-mono text-sm text-gray-700">
                {currentVal !== undefined ? maskValue(currentVal) : '(not set)'}
              </div>
            </div>
            <div className="rounded bg-gray-50 p-2">
              <div className="text-xs text-gray-500">New</div>
              <div className="font-mono text-sm text-gray-700">
                {newVal !== undefined ? maskValue(newVal) : '(removed)'}
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <button
          type="button"
          onClick={() => setShowMasked(!showMasked)}
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          {showMasked ? (
            <>
              <svg
                className="h-3 w-3"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path
                  fillRule="evenodd"
                  d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                  clipRule="evenodd"
                />
              </svg>
              Reveal Values
            </>
          ) : (
            <>
              <svg
                className="h-3 w-3"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                  clipRule="evenodd"
                />
                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
              </svg>
              Mask Values
            </>
          )}
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto">{renderDiff()}</div>
    </div>
  );
}

export default DiffViewer;
