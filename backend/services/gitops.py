"""
GitOps service: Git operations + manifest generation + ArgoCD sync.
"""
import base64
import yaml
import json
from typing import Optional
from datetime import datetime, timezone

from services.store import store


class GitOpsService:
    """Handles Git manifest generation, commit/push, and ArgoCD sync."""

    def generate_manifest(
        self,
        resource_type: str,
        resource_name: str,
        namespace: str,
        data: dict,
        labels: Optional[dict] = None,
        annotations: Optional[dict] = None,
    ) -> str:
        """Generate a Kubernetes manifest YAML string."""

        common_metadata = {
            "name": resource_name,
            "namespace": namespace,
            "labels": labels or {},
            "annotations": annotations or {},
        }

        if resource_type == "configmap":
            manifest = {
                "apiVersion": "v1",
                "kind": "ConfigMap",
                "metadata": common_metadata,
                "data": data,
            }
        elif resource_type == "secret":
            # Encode values to base64
            encoded_data = {}
            for key, value in data.items():
                encoded_data[key] = base64.b64encode(
                    str(value).encode("utf-8")
                ).decode("utf-8")
            manifest = {
                "apiVersion": "v1",
                "kind": "Secret",
                "metadata": common_metadata,
                "type": "Opaque",
                "data": encoded_data,
            }
        elif resource_type == "docker-registry":
            # Build .dockerconfigjson
            docker_config = {
                "auths": {
                    data.get("registry", ""): {
                        "username": data.get("username", ""),
                        "password": data.get("password", ""),
                        "email": data.get("email", ""),
                        "auth": base64.b64encode(
                            f"{data.get('username', '')}:{data.get('password', '')}".encode()
                        ).decode(),
                    }
                }
            }
            encoded_docker = base64.b64encode(
                json.dumps(docker_config).encode()
            ).decode()
            manifest = {
                "apiVersion": "v1",
                "kind": "Secret",
                "metadata": common_metadata,
                "type": "kubernetes.io/dockerconfigjson",
                "data": {".dockerconfigjson": encoded_docker},
            }
        else:
            raise ValueError(f"Unsupported resource type: {resource_type}")

        return yaml.dump(manifest, default_flow_style=False, sort_keys=False)

    def get_file_path(
        self,
        cluster_name: str,
        environment: str,
        namespace: str,
        resource_type: str,
        resource_name: str,
    ) -> str:
        """Build the Git file path for a manifest."""
        settings = store.get_settings()
        base_path = settings.get("git_manifest_path", "clusters")
        return (
            f"{base_path}/{cluster_name}/environments/{environment}"
            f"/namespaces/{namespace}/{resource_type}s/{resource_name}.yaml"
        )

    async def commit_and_push(
        self,
        file_path: str,
        content: str,
        commit_message: str,
    ) -> dict:
        """
        Commit and push manifest to Git repository.
        Uses the configured Git provider API.
        """
        settings = store.get_settings()
        git_provider = settings.get("git_provider", "gitlab")
        git_url = settings.get("git_url", "")
        git_token = settings.get("git_token", "")
        git_branch = settings.get("git_branch", "main")

        if not git_url or not git_token:
            return {
                "success": False,
                "error": "Git provider not configured. Set Git URL and token in Settings.",
            }

        try:
            if git_provider == "gitlab":
                return await self._gitlab_commit(
                    git_url, git_token, git_branch, file_path, content, commit_message
                )
            elif git_provider == "github":
                return await self._github_commit(
                    git_url, git_token, git_branch, file_path, content, commit_message
                )
            else:
                return {"success": False, "error": f"Unsupported Git provider: {git_provider}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _gitlab_commit(
        self,
        git_url: str,
        token: str,
        branch: str,
        file_path: str,
        content: str,
        commit_message: str,
    ) -> dict:
        """Commit via GitLab API."""
        import httpx

        # Extract project path from URL
        # e.g., https://gitlab.example.com/group/project -> group/project
        project_path = git_url.replace("https://", "").replace("http://", "")
        if project_path.startswith("gitlab."):
            project_path = project_path.split("/", 1)[1] if "/" in project_path else ""
        project_path = project_path.rstrip("/").removesuffix(".git")
        encoded_path = project_path.replace("/", "%2F")

        api_base = git_url.rstrip("/")
        headers = {"PRIVATE-TOKEN": token}

        # Check if file exists (to get previous content for update)
        check_url = f"{api_base}/api/v4/projects/{encoded_path}/repository/files/{file_path.replace('/', '%2F')}?ref={branch}"
        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.get(check_url, headers=headers)
            action = "update" if resp.status_code == 200 else "create"
            previous_content = resp.json().get("content", "") if resp.status_code == 200 else None

        # Create or update file
        file_url = f"{api_base}/api/v4/projects/{encoded_path}/repository/files/{file_path.replace('/', '%2F')}"
        payload = {
            "branch": branch,
            "commit_message": commit_message,
            "content": content,
        }
        if action == "update" and previous_content:
            payload["previous_content"] = base64.b64decode(previous_content).decode()

        async with httpx.AsyncClient(verify=False) as client:
            if action == "create":
                resp = await client.post(file_url, headers=headers, json=payload)
            else:
                resp = await client.put(file_url, headers=headers, json=payload)

            if resp.status_code in (200, 201):
                data = resp.json()
                return {
                    "success": True,
                    "commit_sha": data.get("file_path", ""),
                    "commit_url": data.get("file_path", ""),
                    "file_path": file_path,
                }
            else:
                return {
                    "success": False,
                    "error": f"GitLab API error: {resp.status_code} - {resp.text}",
                    "file_path": file_path,
                }

    async def _github_commit(
        self,
        git_url: str,
        token: str,
        branch: str,
        file_path: str,
        content: str,
        commit_message: str,
    ) -> dict:
        """Commit via GitHub API."""
        import httpx

        # Extract owner/repo from URL
        repo_path = git_url.replace("https://github.com/", "").replace("http://github.com/", "")
        repo_path = repo_path.rstrip("/").removesuffix(".git")

        headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json",
        }

        api_base = "https://api.github.com"

        async with httpx.AsyncClient(verify=False) as client:
            # Check if file exists
            check_url = f"{api_base}/repos/{repo_path}/contents/{file_path}?ref={branch}"
            resp = await client.get(check_url, headers=headers)

            if resp.status_code == 200:
                sha = resp.json().get("sha")
                # Update
                put_url = f"{api_base}/repos/{repo_path}/contents/{file_path}"
                payload = {
                    "message": commit_message,
                    "content": base64.b64encode(content.encode()).decode(),
                    "sha": sha,
                    "branch": branch,
                }
                resp = await client.put(put_url, headers=headers, json=payload)
            else:
                # Create
                put_url = f"{api_base}/repos/{repo_path}/contents/{file_path}"
                payload = {
                    "message": commit_message,
                    "content": base64.b64encode(content.encode()).decode(),
                    "branch": branch,
                }
                resp = await client.put(put_url, headers=headers, json=payload)

            if resp.status_code in (200, 201):
                data = resp.json()
                return {
                    "success": True,
                    "commit_sha": data.get("commit", {}).get("sha", ""),
                    "commit_url": data.get("commit", {}).get("html_url", ""),
                    "file_path": file_path,
                }
            else:
                return {
                    "success": False,
                    "error": f"GitHub API error: {resp.status_code} - {resp.text}",
                    "file_path": file_path,
                }

    async def trigger_argocd_sync(self, app_name: str) -> dict:
        """Trigger ArgoCD application sync."""
        settings = store.get_settings()
        argocd_url = settings.get("argocd_server_url", "")
        argocd_token = settings.get("argocd_auth_token", "")

        if not argocd_url or not argocd_token:
            return {
                "success": False,
                "error": "ArgoCD not configured. Set server URL and token in Settings.",
            }

        import httpx

        headers = {
            "Authorization": f"Bearer {argocd_token}",
            "Content-Type": "application/json",
        }

        sync_url = f"{argocd_url}/api/v1/applications/{app_name}/sync"

        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.post(sync_url, headers=headers, json={})
            if resp.status_code in (200, 201):
                return {"success": True, "status": "synced"}
            else:
                return {
                    "success": False,
                    "error": f"ArgoCD sync error: {resp.status_code} - {resp.text}",
                }


gitops_service = GitOpsService()
