"""
Vercel API client for deployment management.
"""
import httpx
from typing import Optional


class VercelClient:
    """Client for Vercel REST API v13."""

    def __init__(self, token: str, team_id: str = None):
        self.token = token
        self.team_id = team_id
        self._base = "https://api.vercel.com/v13"

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.token}"}

    def _params(self) -> dict:
        if self.team_id:
            return {"teamId": self.team_id}
        return {}

    async def test_connection(self) -> dict:
        """Verify Vercel token is valid."""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                # Try v1/user first (more reliable with all token types)
                resp = await client.get(
                    "https://api.vercel.com/v1/user",
                    headers=self._headers(),
                )
                if resp.status_code == 200:
                    data = resp.json()
                    user = data.get("user", data)
                    return {
                        "ok": True,
                        "user": user.get("name") or user.get("username", "Unknown"),
                        "email": user.get("email", ""),
                    }
                # Fallback to v2/user
                resp = await client.get(
                    "https://api.vercel.com/v2/user",
                    headers=self._headers(),
                )
                if resp.status_code == 200:
                    data = resp.json()
                    user = data.get("user", data)
                    return {
                        "ok": True,
                        "user": user.get("name") or user.get("username", "Unknown"),
                        "email": user.get("email", ""),
                    }
                return {"ok": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
        except httpx.ConnectError:
            return {"ok": False, "error": "Cannot connect to Vercel API"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def get_projects(self) -> dict:
        """List all Vercel projects."""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{self._base}/projects",
                    headers=self._headers(),
                    params=self._params(),
                )
                if resp.status_code == 200:
                    data = resp.json()
                    projects = data.get("projects", [])
                    return {"ok": True, "projects": projects}
                return {"ok": False, "error": f"HTTP {resp.status_code}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def deploy(
        self,
        name: str,
        git_source: dict = None,
        framework: str = None,
        env_vars: dict = None,
        build_command: str = None,
        output_directory: str = None,
    ) -> dict:
        """Trigger a new deployment."""
        try:
            body = {"name": name}
            if git_source:
                body["source"] = "git"
                body["gitSource"] = git_source
                # Required for new projects
                body["projectSettings"] = {
                    "framework": framework or "nextjs",
                }
                if build_command:
                    body["projectSettings"]["buildCommand"] = build_command
                if output_directory:
                    body["projectSettings"]["outputDirectory"] = output_directory
            if env_vars:
                body["env"] = env_vars
            if build_command and not git_source:
                body["buildCommand"] = build_command
            if output_directory and not git_source:
                body["outputDirectory"] = output_directory

            params = self._params()
            params["skipAutoDetectionConfirmation"] = "1"

            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{self._base}/deployments",
                    headers=self._headers(),
                    json=body,
                    params=params,
                )
                if resp.status_code in (200, 201):
                    data = resp.json()
                    # Store the Vercel dashboard URL
                    if "inspectorUrl" in data:
                        data["_dashboardUrl"] = data["inspectorUrl"]
                    return {"ok": True, "deployment": data}
                return {"ok": False, "error": f"HTTP {resp.status_code}: {resp.text[:300]}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def get_deployment(self, deployment_id: str) -> dict:
        """Get deployment status and details."""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{self._base}/deployments/{deployment_id}",
                    headers=self._headers(),
                )
                if resp.status_code == 200:
                    return {"ok": True, "deployment": resp.json()}
                return {"ok": False, "error": f"HTTP {resp.status_code}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def list_deployments(self, project_id: str = None, limit: int = 20) -> dict:
        """List recent deployments."""
        try:
            params = {**self._params(), "limit": limit}
            if project_id:
                params["projectId"] = project_id

            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{self._base}/deployments",
                    headers=self._headers(),
                    params=params,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return {"ok": True, "deployments": data.get("deployments", [])}
                return {"ok": False, "error": f"HTTP {resp.status_code}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def cancel_deployment(self, deployment_id: str) -> dict:
        """Cancel an in-progress deployment."""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.patch(
                    f"{self._base}/deployments/{deployment_id}/cancel",
                    headers=self._headers(),
                )
                if resp.status_code == 200:
                    return {"ok": True}
                return {"ok": False, "error": f"HTTP {resp.status_code}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def promote_deployment(self, deployment_id: str) -> dict:
        """Promote a deployment to production."""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"{self._base}/deployments/{deployment_id}/promote",
                    headers=self._headers(),
                )
                if resp.status_code == 200:
                    return {"ok": True}
                return {"ok": False, "error": f"HTTP {resp.status_code}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}
