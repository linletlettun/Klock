# Cluster Connect Skill

Handle K8s cluster registration and connectivity validation.

## What it does
- Registers new clusters with API server URL and credentials
- Validates cluster connectivity via API health check
- Tests service account permissions
- Updates cluster status (connected/disconnected/pending)

## When to use
- Adding a new cluster to the portal
- Checking if a cluster is reachable
- Validating service account token permissions

## How it works
1. Collect API server URL, token, and CA cert
2. Test connectivity to /healthz or /version endpoint
3. Verify RBAC permissions on target resources
4. Update cluster status in Supabase
