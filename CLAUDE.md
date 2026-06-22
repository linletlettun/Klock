# Klock Portal — Claude Guide

## Stack
- React 19 + Vite
- React Router v7
- Supabase (Auth + PostgreSQL + RLS)
- Tailwind CSS / Recharts

## Database Tables
clusters:       id, user_id, name, api_server, k8s_version, status, service_account_token, ca_cert, default_namespace
namespaces:     id, cluster_id, name
deployments:    id, cluster_id, namespace, name, replicas, image, status
configmaps:     id, cluster_id, namespace, name, data (jsonb)
secrets:        id, cluster_id, namespace, name, data (jsonb)

## Conventions
- Import တိုင်း @/ alias သုံးပါ
- Cluster status: connected | disconnected | pending
- K8s color: text-blue-600 (K8s blue #326ce5)
- Query တိုင်း .eq('user_id', user.id) ထည့်ပါ
- Always target selected cluster, namespace, deployment

## Routes
/                 → Dashboard           (protected)
/clusters         → Cluster List        (protected)
/clusters/:id     → Cluster Detail      (protected)
/deployments      → Deployments         (protected)
/configmaps       → ConfigMaps          (protected)
/secrets          → Secrets             (protected)
/pods             → Pods                (protected)
/settings         → Settings            (protected)
/login            → Login               (public)

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
