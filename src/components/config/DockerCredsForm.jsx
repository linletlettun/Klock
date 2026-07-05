import { useState } from 'react';

/**
 * Docker Registry credentials form
 * Transforms inputs into properly structured .dockerconfigjson
 */
export function DockerCredsForm({ value, onChange }) {
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (field, newValue) => {
    onChange({
      ...value,
      [field]: newValue,
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
        <svg
          className="mr-1 inline h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        This will create a <code>kubernetes.io/dockerconfigjson</code> secret for
        Docker registry authentication.
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Registry URL
        </label>
        <input
          type="url"
          value={value.registry || ''}
          onChange={(e) => handleChange('registry', e.target.value)}
          placeholder="https://index.docker.io/v1/"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            type="text"
            value={value.username || ''}
            onChange={(e) => handleChange('username', e.target.value)}
            placeholder="docker-username"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={value.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="user@example.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password / Token
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={value.password || ''}
            onChange={(e) => handleChange('password', e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? (
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path
                  fillRule="evenodd"
                  d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                  clipRule="evenodd"
                />
                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Secret Name
        </label>
        <input
          type="text"
          value={value.name || ''}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="docker-registry-credentials"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Name for the Kubernetes secret
        </p>
      </div>
    </div>
  );
}

export default DockerCredsForm;
