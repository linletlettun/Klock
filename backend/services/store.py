"""
In-memory store for clusters and settings.
In production, replace with Supabase or PostgreSQL.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional


class Store:
    """Singleton in-memory store."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._clusters = {}
            cls._instance._settings = {
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
                "vault_enabled": False,
                "consul_server_url": "",
                "consul_token": "",
                "consul_datacenter": "dc1",
                "consul_kv_prefix": "klock/",
                "consul_enabled": False,
                "vercel_token": "",
                "vercel_team_id": "",
                "namespace_blacklist": [
                    "kube-system",
                    "kube-public",
                    "kube-node-lease",
                    "argocd",
                    "cert-manager",
                    "ingress-nginx",
                ],
            }
        return cls._instance

    # ── Cluster operations ──────────────────────────────────

    def add_cluster(self, data: dict) -> dict:
        cluster_id = str(uuid.uuid4())[:8]
        cluster = {
            "id": cluster_id,
            "name": data["name"],
            "environment": data["environment"],
            "api_server": data.get("api_server"),
            "_token": data.get("service_account_token"),  # Private, never exposed
            "_kubeconfig": data.get("kubeconfig"),
            "ca_cert": data.get("ca_cert"),
            "default_namespace": data.get("default_namespace", "default"),
            "status": "pending",
            "k8s_version": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self._clusters[cluster_id] = cluster
        return self._safe_cluster(cluster)

    def get_clusters(self) -> list[dict]:
        return [self._safe_cluster(c) for c in self._clusters.values()]

    def get_cluster(self, cluster_id: str) -> Optional[dict]:
        cluster = self._clusters.get(cluster_id)
        if cluster:
            return self._safe_cluster(cluster)
        return None

    def get_cluster_full(self, cluster_id: str) -> Optional[dict]:
        """Get cluster with private fields (for internal use only)."""
        return self._clusters.get(cluster_id)

    def update_cluster(self, cluster_id: str, updates: dict) -> Optional[dict]:
        cluster = self._clusters.get(cluster_id)
        if not cluster:
            return None
        for key, value in updates.items():
            if value is not None:
                if key == "service_account_token":
                    cluster["_token"] = value
                elif key == "kubeconfig":
                    cluster["_kubeconfig"] = value
                else:
                    cluster[key] = value
        return self._safe_cluster(cluster)

    def delete_cluster(self, cluster_id: str) -> bool:
        if cluster_id in self._clusters:
            del self._clusters[cluster_id]
            return True
        return False

    def set_cluster_status(self, cluster_id: str, status: str, k8s_version: str = None):
        cluster = self._clusters.get(cluster_id)
        if cluster:
            cluster["status"] = status
            if k8s_version:
                cluster["k8s_version"] = k8s_version

    def _safe_cluster(self, cluster: dict) -> dict:
        """Return cluster dict without private fields."""
        return {
            "id": cluster["id"],
            "name": cluster["name"],
            "environment": cluster["environment"],
            "api_server": cluster.get("api_server"),
            "status": cluster["status"],
            "k8s_version": cluster.get("k8s_version"),
            "default_namespace": cluster.get("default_namespace", "default"),
            "created_at": cluster["created_at"],
        }

    # ── Settings operations ─────────────────────────────────

    def get_settings(self) -> dict:
        return dict(self._settings)

    def get_settings_safe(self) -> dict:
        """Return settings with masked sensitive fields."""
        settings = dict(self._settings)
        settings["git_token_masked"] = self._mask(settings.get("git_token", ""))
        settings["argocd_auth_token_masked"] = self._mask(settings.get("argocd_auth_token", ""))
        settings["nacos_password_masked"] = self._mask(settings.get("nacos_password", ""))
        settings["vault_token_masked"] = self._mask(settings.get("vault_token", ""))
        settings["consul_token_masked"] = self._mask(settings.get("consul_token", ""))
        settings["vercel_token_masked"] = self._mask(settings.get("vercel_token", ""))
        # Remove raw tokens
        for key in ["git_token", "argocd_auth_token", "nacos_password", "vault_token", "consul_token", "vercel_token"]:
            settings.pop(key, None)
        return settings

    def update_settings(self, updates: dict) -> dict:
        for key, value in updates.items():
            if value is not None:
                self._settings[key] = value
        return self.get_settings_safe()

    def _mask(self, value: str) -> str:
        if not value:
            return ""
        if len(value) <= 8:
            return "••••••••"
        return value[:4] + "••••" + value[-4:]


# Singleton
store = Store()
