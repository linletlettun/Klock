---
marp: true
paginate: true
transition: fade
# PechaKucha: 6 slides, 20s auto-advance. Do not change the count.
auto-advance: 20
---

<!-- slide 1 -->
# Who needs this?
<!-- 20s -->
DevOps engineers and teams managing multiple K8s clusters who need a simple web portal instead of kubectl CLI.

---

<!-- slide 2 -->
# The problem
<!-- 20s -->
Managing multiple Kubernetes clusters requires switching between terminals, remembering context names, and handling raw YAML. Non-technical team members can't easily check cluster status.

---

<!-- slide 3 -->
# What I built — Klock Portal
<!-- 20s -->
A React web app that connects to K8s clusters via API. Features: cluster registration, deployment management, ConfigMap/Secret editor, RBAC manifest generator, and a dashboard with real-time status.

---

<!-- slide 4 -->
# How I built it
<!-- 20s -->
- **MCP**: Supabase MCP server for database operations
- **Skill**: k8s-manifests for generating valid YAML
- **Agent**: k8s-agent, frontend-agent, db-agent for specialized tasks

---

<!-- slide 5 -->
# Why it matters
<!-- 20s -->
Teams can manage K8s clusters from a browser. No terminal needed. RBAC generation saves hours of manual YAML writing. Supabase RLS ensures each user only sees their own clusters.

---

<!-- slide 6 -->
# Done checklist
<!-- 20s -->
- [x] repo public — github.com/linletlettun/Klock
- [x] MCP + skill + agent used
- [x] report.md in team repo
