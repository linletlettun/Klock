-- Add audit_logs table for configuration management operations

CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cluster_id UUID,
  resource_type TEXT NOT NULL, -- 'configmap', 'secret', 'nacos_config'
  resource_name TEXT NOT NULL,
  namespace TEXT,
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  status TEXT NOT NULL, -- 'success', 'failed'
  error_message TEXT,
  dry_run BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own audit logs
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own audit logs
CREATE POLICY "Users can insert own audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_cluster_id ON audit_logs(cluster_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
