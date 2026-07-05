const K8s_API = (apiServer) => `${apiServer}/api/v1`;

function getHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// Namespaces
export async function fetchNamespaces(apiServer, token) {
  const res = await fetch(`${K8s_API(apiServer)}/namespaces`, {
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error(`Failed to fetch namespaces: ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

// ConfigMaps
export async function fetchConfigMaps(apiServer, token, namespace) {
  const url = namespace
    ? `${K8s_API(apiServer)}/namespaces/${namespace}/configmaps`
    : `${K8s_API(apiServer)}/configmaps`;
  const res = await fetch(url, { headers: getHeaders(token) });
  if (!res.ok) throw new Error(`Failed to fetch configmaps: ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

export async function createConfigMap(apiServer, token, namespace, configmap) {
  const res = await fetch(
    `${K8s_API(apiServer)}/namespaces/${namespace}/configmaps`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(configmap),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to create configmap: ${res.status}`);
  }
  return res.json();
}

export async function deleteConfigMap(apiServer, token, namespace, name) {
  const res = await fetch(
    `${K8s_API(apiServer)}/namespaces/${namespace}/configmaps/${name}`,
    {
      method: 'DELETE',
      headers: getHeaders(token),
    }
  );
  if (!res.ok) throw new Error(`Failed to delete configmap: ${res.status}`);
  return res.json();
}

// Secrets
export async function fetchSecrets(apiServer, token, namespace) {
  const url = namespace
    ? `${K8s_API(apiServer)}/namespaces/${namespace}/secrets`
    : `${K8s_API(apiServer)}/secrets`;
  const res = await fetch(url, { headers: getHeaders(token) });
  if (!res.ok) throw new Error(`Failed to fetch secrets: ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

export async function createSecret(apiServer, token, namespace, secret) {
  const res = await fetch(
    `${K8s_API(apiServer)}/namespaces/${namespace}/secrets`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(secret),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to create secret: ${res.status}`);
  }
  return res.json();
}

export async function deleteSecret(apiServer, token, namespace, name) {
  const res = await fetch(
    `${K8s_API(apiServer)}/namespaces/${namespace}/secrets/${name}`,
    {
      method: 'DELETE',
      headers: getHeaders(token),
    }
  );
  if (!res.ok) throw new Error(`Failed to delete secret: ${res.status}`);
  return res.json();
}

// Deployments
export async function fetchDeployments(apiServer, token, namespace) {
  const url = namespace
    ? `${apiServer}/apis/apps/v1/namespaces/${namespace}/deployments`
    : `${apiServer}/apis/apps/v1/deployments`;
  const res = await fetch(url, { headers: getHeaders(token) });
  if (!res.ok) throw new Error(`Failed to fetch deployments: ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

// Pods
export async function fetchPods(apiServer, token, namespace) {
  const url = namespace
    ? `${K8s_API(apiServer)}/namespaces/${namespace}/pods`
    : `${K8s_API(apiServer)}/pods`;
  const res = await fetch(url, { headers: getHeaders(token) });
  if (!res.ok) throw new Error(`Failed to fetch pods: ${res.status}`);
  const data = await res.json();
  return data.items || [];
}
