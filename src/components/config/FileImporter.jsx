import { useState, useRef } from 'react';
import * as jsYaml from 'js-yaml';

/**
 * Recursively flatten a nested object into dot-notation key:value pairs.
 * e.g. { database: { host: "localhost" } } → { "database.host": "localhost" }
 */
function flattenObject(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey));
    } else {
      result[fullKey] = typeof value === 'string' ? value : JSON.stringify(value);
    }
  }
  return result;
}

/**
 * FileImporter — upload JSON/YAML file, parse, and return flat key:value pairs.
 *
 * Props:
 *   onImport(parsedData) — called with { key: value } flat object
 */
export default function FileImporter({ onImport }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const processFile = (file) => {
    setError(null);
    setPreview(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        let parsed;

        if (file.name.endsWith('.json')) {
          parsed = JSON.parse(content);
        } else if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
          parsed = jsYaml.load(content);
        } else {
          setError('Unsupported file type. Use .json, .yaml, or .yml');
          return;
        }

        if (typeof parsed !== 'object' || parsed === null) {
          setError('File must contain a JSON or YAML object');
          return;
        }

        const flat = flattenObject(parsed);
        setPreview({ fileName: file.name, keys: Object.keys(flat), data: flat });
      } catch (err) {
        setError(`Parse error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleImport = () => {
    if (preview) {
      onImport(preview.data);
      setPreview(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
          dragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <svg className="mb-2 h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-sm text-gray-600">
          <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
        </p>
        <p className="mt-1 text-xs text-gray-400">JSON, YAML, or YML files</p>
        <input ref={fileRef} type="file" accept=".json,.yaml,.yml" onChange={handleFileSelect} className="hidden" />
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Preview */}
      {preview && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">{preview.fileName}</p>
              <p className="text-xs text-blue-700">{preview.keys.length} key(s) found</p>
            </div>
            <button
              onClick={handleImport}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              Import Keys
            </button>
          </div>
          <div className="max-h-32 overflow-auto">
            <div className="flex flex-wrap gap-1">
              {preview.keys.map((key) => (
                <span key={key} className="rounded-md bg-white border border-blue-200 px-2 py-0.5 text-xs font-mono text-gray-700">
                  {key}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
