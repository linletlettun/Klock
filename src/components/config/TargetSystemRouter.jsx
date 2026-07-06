/**
 * Target system router component
 * Allows selecting K8s Only, Nacos Only, or Both (Dual Sync)
 */
export function TargetSystemRouter({ value, onChange }) {
  const options = [
    {
      id: 'k8s',
      label: 'Kubernetes',
      description: 'Deploy to K8s clusters',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6 3-6 3-6-3 6-3z" />
        </svg>
      ),
    },
    {
      id: 'nacos',
      label: 'Nacos',
      description: 'Deploy to Nacos config center',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v2H8V8zm0 4h8v2H8v-2z" />
        </svg>
      ),
    },
    {
      id: 'vercel',
      label: 'Vercel',
      description: 'Deploy env vars to Vercel',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 22h20L12 2z" />
        </svg>
      ),
    },
    {
      id: 'aws',
      label: 'AWS',
      description: 'Deploy to AWS SSM / EC2',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.75 11.35a3.35 3.35 0 00-3.3-3.85H8.55a3.35 3.35 0 00-3.3 3.85v1.3a3.35 3.35 0 003.3 3.85h6.9a3.35 3.35 0 003.3-3.85v-1.3zM12 7.2a.6.6 0 110 1.2.6.6 0 010-1.2zm-4.2 4.7a.6.6 0 110 1.2.6.6 0 010-1.2zm8.4 0a.6.6 0 110 1.2.6.6 0 010-1.2z" />
        </svg>
      ),
    },
  ];

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Target System
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${
              value === option.id
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div
              className={`${
                value === option.id ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              {option.icon}
            </div>
            <div className="text-sm font-medium">{option.label}</div>
            <div className="text-xs text-gray-500">{option.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default TargetSystemRouter;
