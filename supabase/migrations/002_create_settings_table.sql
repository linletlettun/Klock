-- Create settings table for persistent configuration storage
CREATE TABLE IF NOT EXISTS settings (
    id INT PRIMARY KEY DEFAULT 1,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings row
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
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated and anon access (internal API only)
CREATE POLICY "Allow all access to settings" ON settings
    FOR ALL
    USING (true)
    WITH CHECK (true);
