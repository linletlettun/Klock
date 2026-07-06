"""
Persistent store using Supabase PostgreSQL for clusters and settings.
Falls back to in-memory if Supabase is unavailable.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from config import settings


class Store:
    """Supabase-backed store with in-memory fallback."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._supabase = None
            cls._instance._fallback_settings = cls._default_settings()
            cls._instance._fallback_clusters = {}
        return cls._instance

    @staticmethod
    def _default_settings() -> dict:
        return {
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

    def _get_supabase(self):
        if self._supabase is None:
            try:
                from supabase import create_client
                self._supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            except Exception as e:
                print(f"[Store] Supabase connection failed: {e}")
                return None
        return self._supabase

    # ── Cluster operations ──────────────────────────────────

    def add_cluster(self, data: dict) -> dict:
        cluster_id = str(uuid.uuid4())[:8]
        cluster = {
            "id": cluster_id,
            "name": data["name"],
            "environment": data["environment"],
            "api_server": data.get("api_server"),
            "_token": data.get("service_account_token"),
            "_kubeconfig": data.get("kubeconfig"),
            "ca_cert": data.get("ca_cert"),
            "default_namespace": data.get("default_namespace", "default"),
            "status": "pending",
            "k8s_version": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        sb = self._get_supabase()
        if sb:
            try:
                sb.table("clusters").insert(cluster).execute()
            except Exception as e:
                print(f"[Store] Supabase insert cluster failed: {e}")
                self._fallback_clusters[cluster_id] = cluster
        else:
            self._fallback_clusters[cluster_id] = cluster

        return self._safe_cluster(cluster)

    def get_clusters(self) -> list[dict]:
        sb = self._get_supabase()
        if sb:
            try:
                resp = sb.table("clusters").select("*").execute()
                return [self._safe_cluster(c) for c in resp.data]
            except Exception as e:
                print(f"[Store] Supabase get_clusters failed: {e}")
        return [self._safe_cluster(c) for c in self._fallback_clusters.values()]

    def get_cluster(self, cluster_id: str) -> Optional[dict]:
        sb = self._get_supabase()
        if sb:
            try:
                resp = sb.table("clusters").select("*").eq("id", cluster_id).execute()
                if resp.data:
                    return self._safe_cluster(resp.data[0])
                return None
            except Exception as e:
                print(f"[Store] Supabase get_cluster failed: {e}")
        cluster = self._fallback_clusters.get(cluster_id)
        return self._safe_cluster(cluster) if cluster else None

    def get_cluster_full(self, cluster_id: str) -> Optional[dict]:
        """Get cluster with private fields (for internal use only)."""
        sb = self._get_supabase()
        if sb:
            try:
                resp = sb.table("clusters").select("*").eq("id", cluster_id).execute()
                return resp.data[0] if resp.data else None
            except Exception as e:
                print(f"[Store] Supabase get_cluster_full failed: {e}")
        return self._fallback_clusters.get(cluster_id)

    def update_cluster(self, cluster_id: str, updates: dict) -> Optional[dict]:
        sb = self._get_supabase()
        db_updates = {}
        for key, value in updates.items():
            if value is not None:
                if key == "service_account_token":
                    db_updates["_token"] = value
                elif key == "kubeconfig":
                    db_updates["_kubeconfig"] = value
                else:
                    db_updates[key] = value

        if sb:
            try:
                sb.table("clusters").update(db_updates).eq("id", cluster_id).execute()
                resp = sb.table("clusters").select("*").eq("id", cluster_id).execute()
                if resp.data:
                    return self._safe_cluster(resp.data[0])
                return None
            except Exception as e:
                print(f"[Store] Supabase update_cluster failed: {e}")

        cluster = self._fallback_clusters.get(cluster_id)
        if cluster:
            cluster.update(db_updates)
            return self._safe_cluster(cluster)
        return None

    def delete_cluster(self, cluster_id: str) -> bool:
        sb = self._get_supabase()
        if sb:
            try:
                sb.table("clusters").delete().eq("id", cluster_id).execute()
                return True
            except Exception as e:
                print(f"[Store] Supabase delete_cluster failed: {e}")
        if cluster_id in self._fallback_clusters:
            del self._fallback_clusters[cluster_id]
            return True
        return False

    def set_cluster_status(self, cluster_id: str, status: str, k8s_version: str = None):
        updates = {"status": status}
        if k8s_version:
            updates["k8s_version"] = k8s_version

        sb = self._get_supabase()
        if sb:
            try:
                sb.table("clusters").update(updates).eq("id", cluster_id).execute()
                return
            except Exception as e:
                print(f"[Store] Supabase set_cluster_status failed: {e}")

        cluster = self._fallback_clusters.get(cluster_id)
        if cluster:
            cluster.update(updates)

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
        sb = self._get_supabase()
        if sb:
            try:
                resp = sb.table("settings").select("data").eq("id", 1).execute()
                if resp.data:
                    return dict(resp.data[0]["data"])
            except Exception as e:
                print(f"[Store] Supabase get_settings failed: {e}")
        return dict(self._fallback_settings)

    def get_settings_safe(self) -> dict:
        """Return settings with masked sensitive fields."""
        raw = self.get_settings()
        safe = dict(raw)
        safe["git_token_masked"] = self._mask(raw.get("git_token", ""))
        safe["argocd_auth_token_masked"] = self._mask(raw.get("argocd_auth_token", ""))
        safe["nacos_password_masked"] = self._mask(raw.get("nacos_password", ""))
        safe["vault_token_masked"] = self._mask(raw.get("vault_token", ""))
        safe["consul_token_masked"] = self._mask(raw.get("consul_token", ""))
        safe["vercel_token_masked"] = self._mask(raw.get("vercel_token", ""))
        # Remove raw tokens
        for key in ["git_token", "argocd_auth_token", "nacos_password", "vault_token", "consul_token", "vercel_token"]:
            safe.pop(key, None)
        return safe

    def update_settings(self, updates: dict) -> dict:
        # Get current settings
        current = self.get_settings()
        # Merge updates
        for key, value in updates.items():
            if value is not None:
                current[key] = value

        sb = self._get_supabase()
        if sb:
            try:
                sb.table("settings").update({"data": current, "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", 1).execute()
            except Exception as e:
                print(f"[Store] Supabase update_settings failed: {e}")
                self._fallback_settings.update(current)
        else:
            self._fallback_settings.update(current)

        return self.get_settings_safe()

    def _mask(self, value: str) -> str:
        if not value:
            return ""
        if len(value) <= 8:
            return "••••••••"
        return value[:4] + "••••" + value[-4:]


# Singleton
store = Store()
