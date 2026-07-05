import { useState } from 'react';

/**
 * Dynamic Key-Value pair form for configuration data
 */
export function DynamicConfigForm({ value, onChange, sensitive = false }) {
  const [showValues, setShowValues] = useState({});

  const entries = Object.entries(value || {});

  const handleAdd = () => {
    onChange({ ...value, '': '' });
  };

  const handleKeyChange = (oldKey, newKey) => {
    const newValue = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === oldKey) {
        newValue[newKey] = v;
      } else {
        newValue[k] = v;
      }
    }
    onChange(newValue);
  };

  const handleValueChange = (key, newValue) => {
    onChange({ ...value, [key]: newValue });
  };

  const handleRemove = (keyToRemove) => {
    const newValue = {};
    for (const [k, v] of Object.entries(value)) {
      if (k !== keyToRemove) {
        newValue[k] = v;
      }
    }
    onChange(newValue);
  };

  const toggleShowValue = (key) => {
    setShowValues((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          Configuration Data
        </label>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Add Key
        </button>
      </div>

      <div className="space-y-2">
        {entries.map(([key, val], index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={key}
              onChange={(e) => handleKeyChange(key, e.target.value)}
              placeholder="Key"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            <div className="relative flex-1">
              <input
                type={sensitive && !showValues[key] ? 'password' : 'text'}
                value={val}
                onChange={(e) => handleValueChange(key, e.target.value)}
                placeholder="Value"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {sensitive && (
                <button
                  type="button"
                  onClick={() => toggleShowValue(key)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showValues[key] ? (
                    <svg
                      className="h-4 w-4"
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
                  ) : (
                    <svg
                      className="h-4 w-4"
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
                  )}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleRemove(key)}
              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {entries.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
          No configuration data. Click "Add Key" to add key-value pairs.
        </div>
      )}
    </div>
  );
}

export default DynamicConfigForm;
