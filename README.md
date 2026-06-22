# 🔒 Klock Portal

Kubernetes Cluster Management Portal — K8s cluster တွေကို manage လုပ်နိုင်သော web application။

---

## ✨ Features

- 🔗 **Cluster Registration** — K8s cluster တွေ ချိတ်ဆက် / စီမံ
- 📊 **Dashboard** — Cluster status, resource overview
- 🚀 **Deployments** — Deployment management & rollout
- ⚙️ **ConfigMaps** — ConfigMap create/update/delete
- 🔐 **Secrets** — Secret management
- 🏗️ **RBAC Manifests** — Service account + role generation
- ✅ **Connectivity Validation** — Cluster API health check

---

## 🛠️ Tech Stack

| Category | Tool |
|---|---|
| Frontend | React 19 + Vite |
| Routing | React Router v7 |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Forms | React Hook Form |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |

---

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone <repo-url>
cd klock-portal
npm install
```

### 2. Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run

```bash
npm run dev
```

---

## 📁 Project Structure

```
klock-portal/
├── .claude/
│   ├── agents/          ← K8s, frontend, DB agents
│   └── skills/          ← K8s manifests, deploy skills
├── src/
│   ├── components/
│   │   ├── layout/      ← Navbar, Sidebar, ProtectedRoute
│   │   ├── clusters/    ← ClusterCard, AddClusterForm
│   │   ├── deployments/ ← DeploymentList, RolloutTrigger
│   │   ├── configmaps/  ← ConfigMapEditor
│   │   ├── secrets/     ← SecretEditor
│   │   └── ui/          ← Button, Modal, Toast
│   ├── pages/           ← Dashboard, Clusters, Deployments
│   ├── hooks/           ← useClusters, useDeployments
│   ├── lib/supabase.js  ← Supabase client
│   ├── store/           ← ClusterContext, AuthContext
│   └── utils/           ← k8s helpers, validators
├── CLAUDE.md            ← Claude Code master guide
└── .env.local           ← Keys (git မတင်ရ)
```

---

## 📄 License

MIT
