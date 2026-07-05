import { useState, useEffect } from 'react';
import useNamespaces from '@/hooks/useNamespaces';

/**
 * Multi-namespace selector component
 * Allows selecting "All Namespaces", specific namespaces, or adding custom namespaces
 */
export function NamespaceSelector({ cluster, selectedNamespaces, onChange }) {
  const { namespaces, loading, error, refetch } = useNamespaces(cluster);
  const [includeSystem, setIncludeSystem] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customNamespaces, setCustomNamespaces] = useState([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');

  useEffect(() => {
    if (cluster) {
      refetch(includeSystem);
    }
  }, [cluster, includeSystem, refetch]);

  // Combine K8s namespaces with custom namespaces
  const allNamespaces = [
    ...namespaces.map((ns) => ({ ...ns, source: 'k8s' })),
    ...customNamespaces.map((ns) => ({ name: ns, status: 'Custom', source: 'custom' })),
  ];

  const filteredNamespaces = allNamespaces.filter((ns) =>
    ns.name.toLowerCase().includes(search.toLowerCase())
  );

  const allSelected =
    selectedNamespaces.length === allNamespaces.length && allNamespaces.length > 0;

  const handleSelectAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(allNamespaces.map((ns) => ns.name));
    }
  };

  const handleSelectNamespace = (name) => {
    if (selectedNamespaces.includes(name)) {
      onChange(selectedNamespaces.filter((n) => n !== name));
    } else {
      onChange([...selectedNamespaces, name]);
    }
  };

  const handleAddCustom = () => {
    // Parse comma-separated names, trim whitespace, filter empty and duplicates
    const newNames = customInput
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    // Deduplicate against existing K8s namespaces AND existing custom namespaces
    const existingNames = new Set([
      ...namespaces.map((ns) => ns.name),
      ...customNamespaces,
    ]);
    const uniqueNewNames = [...new Set(newNames)].filter((n) => !existingNames.has(n));

    if (uniqueNewNames.length > 0) {
      const updatedCustom = [...customNamespaces, ...uniqueNewNames];
      setCustomNamespaces(updatedCustom);
      // Auto-select the new namespaces (avoid duplicates)
      const updatedSelected = [...new Set([...selectedNamespaces, ...uniqueNewNames])];
      onChange(updatedSelected);
    }

    setCustomInput('');
    setShowAddCustom(false);
  };

  const handleRemoveCustom = (name) => {
    setCustomNamespaces(customNamespaces.filter((n) => n !== name));
    onChange(selectedNamespaces.filter((n) => n !== name));
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        Loading namespaces...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Error loading namespaces: {error}
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Target Namespaces
      </label>

      {/* Selected badges */}
      {selectedNamespaces.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedNamespaces.map((name) => {
            const ns = allNamespaces.find((n) => n.name === name);
            const isCustom = ns?.source === 'custom';
            return (
              <span
                key={name}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                  isCustom
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {isCustom && (
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                )}
                {name}
                <button
                  type="button"
                  onClick={() => handleSelectNamespace(name)}
                  className="ml-0.5 rounded-full hover:bg-black/10"
                >
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <span className="truncate">
          {selectedNamespaces.length === 0
            ? 'Select namespaces...'
            : selectedNamespaces.length === 1
            ? selectedNamespaces[0]
            : `${selectedNamespaces.length} namespaces selected`}
        </span>
        <svg
          className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          {/* Search + Add button */}
          <div className="flex items-center gap-1 border-b border-gray-200 p-2">
            <input
              type="text"
              placeholder="Search namespaces..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowAddCustom(!showAddCustom)}
              className="rounded-md bg-blue-50 p-1 text-blue-600 hover:bg-blue-100"
              title="Add custom namespace"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Add custom namespace input */}
          {showAddCustom && (
            <div className="border-b border-gray-200 bg-blue-50 p-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Add Custom Namespace
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="my-namespace (comma-separated for multiple)"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustom}
                  disabled={!customInput.trim()}
                  className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Options */}
          <div className="max-h-60 overflow-y-auto">
            {/* Include system namespaces toggle */}
            <label className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={includeSystem}
                onChange={(e) => setIncludeSystem(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Include system namespaces
            </label>

            {/* Select All */}
            <label className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 text-sm font-medium hover:bg-gray-50">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Select All ({allNamespaces.length})
            </label>

            {/* Custom namespaces section */}
            {customNamespaces.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50">
                  Custom Namespaces
                </div>
                {customNamespaces
                  .filter((name) => name.toLowerCase().includes(search.toLowerCase()))
                  .map((name) => (
                    <div
                      key={name}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedNamespaces.includes(name)}
                        onChange={() => handleSelectNamespace(name)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex-1 truncate text-purple-700">{name}</span>
                      <span className="text-xs text-purple-500">Custom</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustom(name)}
                        className="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
              </>
            )}

            {/* K8s namespaces section */}
            {namespaces.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50">
                  Kubernetes Namespaces
                </div>
                {filteredNamespaces
                  .filter((ns) => ns.source === 'k8s')
                  .map((ns) => (
                    <label
                      key={ns.name}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedNamespaces.includes(ns.name)}
                        onChange={() => handleSelectNamespace(ns.name)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex-1 truncate">{ns.name}</span>
                      <span
                        className={`text-xs ${
                          ns.status === 'Active' ? 'text-green-600' : 'text-yellow-600'
                        }`}
                      >
                        {ns.status}
                      </span>
                    </label>
                  ))}
              </>
            )}

            {filteredNamespaces.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                No namespaces found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NamespaceSelector;
