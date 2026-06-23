# K8s Manifests Skill

Generate valid Kubernetes manifests for the Klock Portal.

## What it does
- Creates Deployment, Service, ConfigMap, Secret YAML
- Generates RBAC Role, RoleBinding, ServiceAccount manifests
- Validates manifest structure before output

## When to use
- User asks to create or edit any K8s manifest
- Generating RBAC configs for cluster access
- Creating namespace-scoped resources

## How it works
1. Ask for target namespace and resource type
2. Generate manifest with proper labels and annotations
3. Validate required fields
4. Output YAML ready to apply
