-- Settings table (singleton row, stores all app settings as JSONB)
CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT settings_singleton CHECK (id = 1)
);

-- Clusters table
CREATE TABLE IF NOT EXISTS clusters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  environment TEXT NOT NULL,
  api_server TEXT,
  _token TEXT,
  _kubeconfig TEXT,
  ca_cert TEXT,
  default_namespace TEXT DEFAULT 'default',
  status TEXT DEFAULT 'pending',
  k8s_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings row if not exists
INSERT INTO settings (id, data) VALUES (1, '{
  "git_provider": "gitlab",
  "git_url": "",
  "git_token": "",
  "git_branch": "main",
  "git_manifest_path": "clusters",
  "argocd_server_url": "",
  "argocd_auth_token": "",
  "argocd_namespace": "argocd",
  "nacos_server_addr": "",
  "nacos_namespace": "public",
  "nacos_username": "",
  "nacos_password": "",
  "vault_server_url": "",
  "vault_token": "",
  "vault_namespace": "",
  "vault_mount_path": "secret",
  "vault_kv_version": "v2",
  "vault_enabled": false,
  "consul_server_url": "",
  "consul_token": "",
  "consul_datacenter": "dc1",
  "consul_kv_prefix": "klock/",
  "consul_enabled": false,
  "vercel_token": "",
  "vercel_team_id": "",
  "namespace_blacklist": ["kube-system","kube-public","kube-node-lease","argocd","cert-manager","ingress-nginx"]
}'::jsonb) ON CONFLICT (id) DO NOTHING;

-- RLS disabled for internal tool
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON clusters FOR ALL USING (true) WITH CHECK (true);
