"""
ArgoCD API Client for application management.
"""
from typing import Optional
from services.store import store


class ArgoCDClient:
    """ArgoCD REST API client."""

    def __init__(self):
        self._base_url = None
        self._token = None

    def _get_config(self):
        settings = store.get_settings()
        self._base_url = settings.get("argocd_server_url", "")
        self._token = settings.get("argocd_auth_token", "")
        return bool(self._base_url and self._token)

    async def list_applications(self) -> list[dict]:
        """List all ArgoCD applications."""
        if not self._get_config():
            return []

        import httpx

        headers = {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.get(
                f"{self._base_url}/api/v1/applications", headers=headers
            )
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])
                return [self._format_app(app) for app in items]
            return []

    async def get_application(self, name: str) -> Optional[dict]:
        """Get a specific ArgoCD application."""
        if not self._get_config():
            return None

        import httpx

        headers = {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.get(
                f"{self._base_url}/api/v1/applications/{name}", headers=headers
            )
            if resp.status_code == 200:
                return self._format_app(resp.json())
            return None

    async def sync_application(self, name: str) -> dict:
        """Trigger sync for an ArgoCD application."""
        if not self._get_config():
            return {"success": False, "error": "ArgoCD not configured"}

        import httpx

        headers = {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.post(
                f"{self._base_url}/api/v1/applications/{name}/sync",
                headers=headers,
                json={},
            )
            if resp.status_code in (200, 201):
                return {"success": True, "status": "synced"}
            return {"success": False, "error": f"Sync failed: {resp.status_code}"}

    async def rollback_application(self, name: str, revision: int) -> dict:
        """Rollback an ArgoCD application to a specific revision."""
        if not self._get_config():
            return {"success": False, "error": "ArgoCD not configured"}

        import httpx

        headers = {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.post(
                f"{self._base_url}/api/v1/applications/{name}/rollback",
                headers=headers,
                json={"id": revision},
            )
            if resp.status_code in (200, 201):
                return {"success": True, "status": "rolled_back"}
            return {"success": False, "error": f"Rollback failed: {resp.status_code}"}

    async def create_application(self, app_config: dict) -> dict:
        """Create a new ArgoCD application."""
        if not self._get_config():
            return {"success": False, "error": "ArgoCD not configured"}

        import httpx

        headers = {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }

        payload = {
            "apiVersion": "argoproj.io/v1alpha1",
            "kind": "Application",
            "metadata": {
                "name": app_config["name"],
                "namespace": app_config.get("argocd_namespace", "argocd"),
            },
            "spec": {
                "project": app_config.get("project", "default"),
                "source": {
                    "repoURL": app_config["repo_url"],
                    "targetRevision": app_config.get("revision", "main"),
                    "path": app_config["path"],
                },
                "destination": {
                    "server": app_config.get(
                        "destination_server", "https://kubernetes.default.svc"
                    ),
                    "namespace": app_config.get("destination_namespace", "default"),
                },
                "syncPolicy": {},
            },
        }

        # Add sync policy
        sync_policy = app_config.get("sync_policy", "manual")
        if sync_policy == "automatic":
            automated = {}
            if app_config.get("auto_prune"):
                automated["prune"] = True
            if app_config.get("self_heal"):
                automated["selfHeal"] = True
            payload["spec"]["syncPolicy"]["automated"] = automated
            payload["spec"]["syncPolicy"]["syncOptions"] = [
                "CreateNamespace=true"
            ]

        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.post(
                f"{self._base_url}/api/v1/applications",
                headers=headers,
                json=payload,
            )
            if resp.status_code in (200, 201):
                return {"success": True, "application": self._format_app(resp.json())}
            return {"success": False, "error": f"Create failed: {resp.status_code} - {resp.text}"}

    async def get_application_resources(self, name: str) -> list[dict]:
        """Get resources managed by an ArgoCD application."""
        if not self._get_config():
            return []

        import httpx

        headers = {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.get(
                f"{self._base_url}/api/v1/applications/{name}/resources",
                headers=headers,
            )
            if resp.status_code == 200:
                return resp.json().get("items", [])
            return []

    async def get_application_history(self, name: str) -> list[dict]:
        """Get sync history for an ArgoCD application."""
        if not self._get_config():
            return []

        import httpx

        headers = {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.get(
                f"{self._base_url}/api/v1/applications/{name}",
                headers=headers,
            )
            if resp.status_code == 200:
                data = resp.json()
                history = data.get("status", {}).get("history", [])
                return history
            return []

    def _format_app(self, app: dict) -> dict:
        """Format ArgoCD application for frontend consumption."""
        status = app.get("status", {})
        spec = app.get("spec", {})
        health = status.get("health", {})
        sync = status.get("sync", {})

        return {
            "name": app.get("metadata", {}).get("name", ""),
            "project": spec.get("project", "default"),
            "repo_url": spec.get("source", {}).get("repoURL", ""),
            "revision": spec.get("source", {}).get("targetRevision", ""),
            "path": spec.get("source", {}).get("path", ""),
            "destination_server": spec.get("destination", {}).get("server", ""),
            "destination_namespace": spec.get("destination", {}).get("namespace", ""),
            "health_status": health.get("status", "Unknown"),
            "sync_status": sync.get("status", "Unknown"),
            "sync_message": sync.get("message", ""),
            "last_synced": status.get("operationState", {}).get("finishedAt", ""),
            "created_at": app.get("metadata", {}).get("creationTimestamp", ""),
        }


argocd_client = ArgoCDClient()
