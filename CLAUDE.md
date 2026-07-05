# Klock Portal — Claude Guide

## Stack
- React 19 + Vite
- React Router v7
- Python FastAPI (backend)
- Supabase (Auth + PostgreSQL + RLS)
- Tailwind CSS / Recharts
- ArgoCD (GitOps)
- Nacos (Config center)

## MCP Servers
| Server | Package | Purpose |
|--------|---------|---------|
| supabase | @supabase/mcp-server-supabase | Database operations |
| argocd | argocd-mcp | ArgoCD app management, sync, rollback |
| grafana | (external) | Monitoring dashboards |

### ArgoCD MCP Configuration
Update `.mcp.json` with your ArgoCD credentials:
```json
"argocd": {
  "env": {
    "ARGOCD_SERVER": "https://your-argocd.example.com",
    "ARGOCD_AUTH_TOKEN": "your-auth-token",
    "ARGOCD_NAMESPACE": "argocd"
  }
}
```

## Database Tables
clusters:       id, name, environment, api_server, status, k8s_version, default_namespace, _token, _kubeconfig, ca_cert, created_at
namespaces:     id, cluster_id, name
deployments:    id, cluster_id, namespace, name, replicas, image, status
configmaps:     id, cluster_id, namespace, name, data (jsonb)
secrets:        id, cluster_id, namespace, name, data (jsonb)

## Conventions
- Import တိုင်း @/ alias သုံးပါ
- Cluster status: connected | disconnected | pending
- Cluster environment: DEV | STAGING | PROD
- K8s color: text-blue-600 (K8s blue #326ce5)
- Always target selected cluster, namespace, deployment
- Tokens are NEVER exposed in API responses (masked with ••••)

## Routes
/                     → Dashboard              (protected)
/clusters             → Cluster List           (protected)
/clusters/:id         → Cluster Detail         (protected)
/config-deploy        → Config Deployment      (protected)
/deployments          → Deployments            (protected)
/settings             → Settings               (protected)
/login                → Login                  (public)

## Backend API
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/cluster | GET/POST | List/Create clusters |
| /api/cluster/{id} | GET/PUT/DELETE | Cluster CRUD |
| /api/cluster/test-connection | POST | Test K8s connectivity |
| /api/settings | GET/PUT | App settings (tokens masked) |
| /api/argocd/applications | GET | List ArgoCD apps |
| /api/argocd/applications/{name}/sync | POST | Sync ArgoCD app |
| /api/gitops/sync | POST | Git commit + ArgoCD sync |
| /api/nacos/configs | GET/POST | Nacos config management |

## Agents
| Agent | File | တာဝန် |
|---|---|---|
| k8s-agent | .claude/agents/k8s-agent.md | K8s API, manifests, RBAC |
| frontend-agent | .claude/agents/frontend-agent.md | Components, pages |
| db-agent | .claude/agents/db-agent.md | Supabase, queries, hooks |

## Skills
| Skill | ဘယ်အခါ |
|---|---|
| .claude/skills/k8s-manifests/SKILL.md | Generate K8s manifests |
| .claude/skills/cluster-connect/SKILL.md | Cluster registration & validation |
| .claude/skills/config-deploy/SKILL.md | ConfigMap/Secret deployment |
| .claude/skills/auth-guard/SKILL.md | Protected routes & session |

## RBAC Requirements
Service account needs: get, list, watch, create, update, patch, delete
for: namespaces, deployments, configmaps, secrets, services, ingresses, pods
