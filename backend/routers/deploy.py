"""
Multi-platform deployment endpoints.
Supports: Vercel, AWS EC2, Kubernetes, Docker, Custom
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

from services.store import store
from services.vercel_client import VercelClient

router = APIRouter()


# ── In-memory deployment history ──
_deployments: list[dict] = []


class DeployRequest(BaseModel):
    app_name: str
    repo_url: str
    branch: str = "main"
    platform: str  # vercel, aws-ec2, kubernetes, docker, netlify, cloudflare
    framework: Optional[str] = None
    build_command: Optional[str] = None
    output_directory: Optional[str] = None
    env_vars: Optional[dict] = None
    # K8s
    cluster_id: Optional[str] = None
    namespace: Optional[str] = "default"
    # AWS
    region: Optional[str] = "us-east-1"
    instance_type: Optional[str] = "t2.micro"


class VercelDeployRequest(BaseModel):
    name: str
    repo_url: str
    branch: str = "main"
    framework: Optional[str] = None
    env_vars: Optional[dict] = None


# ── Platform info ──

@router.get("/platforms")
async def list_platforms():
    """List supported deployment platforms."""
    return {
        "platforms": [
            {
                "id": "vercel",
                "name": "Vercel",
                "icon": "▲",
                "description": "Frontend framework deployments with instant previews",
                "requires_token": True,
                "env_key": "vercel_token",
            },
            {
                "id": "aws-ec2",
                "name": "AWS EC2",
                "icon": "☁️",
                "description": "Deploy to Amazon EC2 instances",
                "requires_token": True,
                "env_key": "aws_access_key",
            },
            {
                "id": "kubernetes",
                "name": "Kubernetes",
                "icon": "☸️",
                "description": "Deploy to Kubernetes clusters",
                "requires_token": False,
                "env_key": None,
            },
            {
                "id": "docker",
                "name": "Docker Hub",
                "icon": "🐳",
                "description": "Build and push Docker images",
                "requires_token": True,
                "env_key": "docker_token",
            },
            {
                "id": "netlify",
                "name": "Netlify",
                "icon": "🌐",
                "description": "Static site and serverless deployments",
                "requires_token": True,
                "env_key": "netlify_token",
            },
            {
                "id": "cloudflare",
                "name": "Cloudflare Pages",
                "icon": "⚡",
                "description": "Edge-first frontend deployments",
                "requires_token": True,
                "env_key": "cloudflare_token",
            },
        ]
    }


# ── Deploy ──

@router.post("")
async def trigger_deployment(req: DeployRequest):
    """Trigger a deployment to any supported platform."""
    deploy_id = str(uuid.uuid4())[:8]
    now = datetime.now(timezone.utc).isoformat()

    # Parse repo info
    repo_name = req.repo_url.rstrip("/").split("/")[-1].replace(".git", "")
    owner = req.repo_url.rstrip("/").split("/")[-2] if "/" in req.repo_url else "unknown"

    deployment = {
        "id": deploy_id,
        "app_name": req.app_name,
        "repo_url": req.repo_url,
        "branch": req.branch,
        "platform": req.platform,
        "status": "queued",
        "url": None,
        "created_at": now,
        "updated_at": now,
        "repo_name": repo_name,
        "owner": owner,
        "framework": req.framework,
        "build_command": req.build_command,
        "env_vars": req.env_vars,
        "cluster_id": req.cluster_id,
        "namespace": req.namespace,
        "region": req.region,
        "instance_type": req.instance_type,
    }

    # Try Vercel deployment
    if req.platform == "vercel":
        settings = store.get_settings()
        vercel_token = settings.get("vercel_token", "")
        if not vercel_token:
            deployment["status"] = "error"
            deployment["error"] = "Vercel token not configured. Go to Settings → Vercel."
            _deployments.insert(0, deployment)
            return deployment

        client = VercelClient(token=vercel_token, team_id=settings.get("vercel_team_id"))

        # Fetch GitHub repo ID for Vercel
        import httpx
        github_repo_id = None
        try:
            async with httpx.AsyncClient(timeout=10) as hc:
                gh_resp = await hc.get(f"https://api.github.com/repos/{owner}/{repo_name}")
                if gh_resp.status_code == 200:
                    github_repo_id = str(gh_resp.json().get("id"))
        except:
            pass

        git_source = None
        if github_repo_id:
            git_source = {
                "type": "github",
                "ref": req.branch,
                "repoId": github_repo_id,
            }
        else:
            git_source = {
                "type": "github",
                "ref": req.branch,
                "repoId": f"{owner}/{repo_name}",
            }

        result = await client.deploy(
            name=req.app_name,
            git_source=git_source,
            framework=req.framework,
            env_vars=req.env_vars,
            build_command=req.build_command,
            output_directory=req.output_directory,
        )

        if result["ok"]:
            d = result["deployment"]
            deployment["id"] = d.get("id", deploy_id)
            deployment["status"] = "building"
            deployment["url"] = d.get("url")
            deployment["vercel_uid"] = d.get("uid")
            deployment["dashboard_url"] = d.get("_dashboardUrl") or d.get("inspectorUrl")
        else:
            deployment["status"] = "error"
            deployment["error"] = result.get("error", "Deployment failed")

    elif req.platform == "kubernetes":
        deployment["status"] = "queued"
        deployment["url"] = f"k8s://{req.cluster_id}/{req.namespace}"

    elif req.platform == "aws-ec2":
        deployment["status"] = "queued"
        deployment["url"] = f"aws://{req.region}/{req.instance_type}"

    else:
        # Other platforms — simulate
        deployment["status"] = "queued"

    _deployments.insert(0, deployment)
    return deployment


# ── List deployments ──

@router.post("/refresh")
async def refresh_deployments():
    """Refresh deployment statuses from Vercel."""
    settings = store.get_settings()
    vercel_token = settings.get("vercel_token", "")
    team_id = settings.get("vercel_team_id", "")

    if not vercel_token:
        return {"ok": False, "error": "Vercel token not configured"}

    try:
        import httpx
        params = {"limit": 20}
        if team_id:
            params["teamId"] = team_id

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.vercel.com/v6/deployments",
                headers={"Authorization": f"Bearer {vercel_token}"},
                params=params,
            )
            if resp.status_code != 200:
                return {"ok": False, "error": f"Vercel API error: {resp.status_code}"}

            vercel_deps = resp.json().get("deployments", [])

        # Build lookup of existing deployments by vercel_uid
        existing_by_uid = {}
        for d in _deployments:
            uid = d.get("vercel_uid")
            if uid:
                existing_by_uid[uid] = d

        updated = 0
        new_count = 0

        for vdep in vercel_deps:
            vuid = vdep.get("uid", "")
            vstate = (vdep.get("readyState") or "").lower()

            # Map Vercel states to our states
            state_map = {
                "queued": "queued",
                "building": "building",
                "deploying": "deploying",
                "ready": "ready",
                "error": "error",
                "canceled": "canceled",
            }
            new_status = state_map.get(vstate, vstate)

            existing = existing_by_uid.get(vuid)

            if existing:
                # Update status — only upgrade, never downgrade from ready
                old_status = existing["status"]
                if old_status == "ready":
                    # Already ready, don't change
                    pass
                elif new_status != old_status:
                    existing["status"] = new_status
                    existing["updated_at"] = datetime.now(timezone.utc).isoformat()
                    updated += 1

                # Always update url and dashboard_url
                existing["url"] = vdep.get("url") or existing.get("url")
                existing["dashboard_url"] = vdep.get("inspectorUrl") or existing.get("dashboard_url")
            else:
                # New deployment from Vercel (auto-deployed via git push)
                meta = vdep.get("meta", {})
                new_dep = {
                    "id": vuid,
                    "app_name": vdep.get("name", "unknown"),
                    "repo_url": f"https://github.com/{meta.get('githubOrg', '')}/{meta.get('githubRepo', '')}",
                    "branch": meta.get("githubCommitRef", "main"),
                    "platform": "vercel",
                    "status": new_status,
                    "url": vdep.get("url"),
                    "created_at": datetime.fromtimestamp(vdep.get("created", 0) / 1000, tz=timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "repo_name": meta.get("githubRepo", ""),
                    "owner": meta.get("githubOrg", ""),
                    "framework": None,
                    "vercel_uid": vuid,
                    "dashboard_url": vdep.get("inspectorUrl"),
                    "commit_sha": meta.get("githubCommitSha", ""),
                    "commit_message": meta.get("githubCommitMessage", ""),
                    "trigger": "git-push" if meta.get("githubDeployment") else "manual",
                }
                _deployments.insert(0, new_dep)
                new_count += 1

        return {"ok": True, "updated": updated, "new": new_count, "total": len(vercel_deps)}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.get("")
async def list_deployments(platform: str = None, limit: int = 50):
    """List deployments — show latest per app, only active status."""
    seen_apps = set()
    result = []
    for d in _deployments:
        # Skip hidden apps
        if d.get("app_name") in _hidden_apps:
            continue
        # Only show active deployments
        if d["status"] not in ("ready", "building", "deploying", "queued", "promoted"):
            continue
        app_key = d.get("app_name", "")
        if app_key in seen_apps:
            continue
        seen_apps.add(app_key)
        result.append(d)
        if len(result) >= limit:
            break

    if platform:
        result = [d for d in result if d["platform"] == platform]
    return result


# Track hidden deployments (removed by user)
_hidden_apps: set = set()


@router.post("/{app_name}/hide")
async def hide_deployment(app_name: str):
    """Hide a deployment from the list."""
    _hidden_apps.add(app_name)
    return {"ok": True, "hidden": app_name}


# ── Get deployment ──

@router.get("/{deploy_id}")
async def get_deployment(deploy_id: str):
    """Get deployment details and status."""
    for d in _deployments:
        if d["id"] == deploy_id:
            # Refresh Vercel status if applicable
            if d["platform"] == "vercel" and d.get("vercel_uid"):
                settings = store.get_settings()
                vercel_token = settings.get("vercel_token", "")
                if vercel_token:
                    client = VercelClient(token=vercel_token)
                    result = await client.get_deployment(d["vercel_uid"])
                    if result["ok"]:
                        remote = result["deployment"]
                        d["status"] = remote.get("readyState", d["status"])
                        d["url"] = remote.get("url") or d["url"]
                        d["updated_at"] = datetime.now(timezone.utc).isoformat()
            return d
    raise HTTPException(status_code=404, detail="Deployment not found")


# ── Cancel deployment ──

@router.post("/{deploy_id}/redeploy")
async def redeploy(deploy_id: str):
    """Redeploy a previous deployment using the same config."""
    # Find the original deployment
    original = None
    for d in _deployments:
        if d["id"] == deploy_id:
            original = d
            break

    if not original:
        raise HTTPException(status_code=404, detail="Deployment not found")

    if original["platform"] != "vercel":
        raise HTTPException(status_code=400, detail="Redeploy only supported for Vercel")

    settings = store.get_settings()
    vercel_token = settings.get("vercel_token", "")
    team_id = settings.get("vercel_team_id", "")

    if not vercel_token:
        raise HTTPException(status_code=400, detail="Vercel token not configured")

    # Get the Vercel project ID
    import httpx
    project_id = None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"https://api.vercel.com/v9/projects/{original['app_name']}",
                headers={"Authorization": f"Bearer {vercel_token}"},
                params={"teamId": team_id} if team_id else {},
            )
            if resp.status_code == 200:
                project_id = resp.json().get("id")
    except:
        pass

    # Trigger redeployment
    try:
        body = {
            "name": original["app_name"],
            "target": "production",
        }
        if project_id:
            body["projectId"] = project_id

        params = {"skipAutoDetectionConfirmation": "1"}
        if team_id:
            params["teamId"] = team_id

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.vercel.com/v13/deployments",
                headers={"Authorization": f"Bearer {vercel_token}"},
                json=body,
                params=params,
            )
            if resp.status_code in (200, 201):
                data = resp.json()
                new_dep = {
                    "id": data.get("id", str(uuid.uuid4())[:8]),
                    "app_name": original["app_name"],
                    "repo_url": original["repo_url"],
                    "branch": original.get("branch", "main"),
                    "platform": "vercel",
                    "status": "building",
                    "url": data.get("url"),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "repo_name": original.get("repo_name", ""),
                    "owner": original.get("owner", ""),
                    "framework": original.get("framework"),
                    "vercel_uid": data.get("uid"),
                    "dashboard_url": data.get("inspectorUrl"),
                    "trigger": "redeploy",
                }
                _deployments.insert(0, new_dep)
                return {"ok": True, "deployment": new_dep}
            else:
                return {"ok": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.post("/{deploy_id}/cancel")
async def cancel_deployment(deploy_id: str):
    """Cancel an in-progress deployment."""
    for d in _deployments:
        if d["id"] == deploy_id:
            if d["platform"] == "vercel" and d.get("vercel_uid"):
                settings = store.get_settings()
                vercel_token = settings.get("vercel_token", "")
                if vercel_token:
                    client = VercelClient(token=vercel_token)
                    await client.cancel_deployment(d["vercel_uid"])

            d["status"] = "canceled"
            d["updated_at"] = datetime.now(timezone.utc).isoformat()
            return {"ok": True, "message": f"Deployment {deploy_id} canceled"}
    raise HTTPException(status_code=404, detail="Deployment not found")


# ── Promote deployment ──

@router.post("/{deploy_id}/promote")
async def promote_deployment(deploy_id: str):
    """Promote a deployment to production."""
    for d in _deployments:
        if d["id"] == deploy_id:
            if d["platform"] == "vercel" and d.get("vercel_uid"):
                settings = store.get_settings()
                vercel_token = settings.get("vercel_token", "")
                if vercel_token:
                    client = VercelClient(token=vercel_token)
                    result = await client.promote_deployment(d["vercel_uid"])
                    if not result["ok"]:
                        raise HTTPException(status_code=500, detail=result.get("error"))

            d["status"] = "promoted"
            d["updated_at"] = datetime.now(timezone.utc).isoformat()
            return {"ok": True, "message": f"Deployment {deploy_id} promoted to production"}
    raise HTTPException(status_code=404, detail="Deployment not found")


# ── Delete deployment ──

@router.delete("/{deploy_id}")
async def delete_deployment(deploy_id: str):
    """Delete a deployment record."""
    global _deployments
    for i, d in enumerate(_deployments):
        if d["id"] == deploy_id:
            _deployments.pop(i)
            return {"ok": True}
    raise HTTPException(status_code=404, detail="Deployment not found")


# ── Vercel specific ──

@router.post("/vercel/test")
async def test_vercel_connection():
    """Test Vercel API connection."""
    settings = store.get_settings()
    vercel_token = settings.get("vercel_token", "")
    if not vercel_token:
        return {"ok": False, "error": "Vercel token not configured"}
    team_id = settings.get("vercel_team_id", "")
    client = VercelClient(token=vercel_token, team_id=team_id if team_id else None)
    return await client.test_connection()


@router.get("/vercel/projects")
async def vercel_projects():
    """List Vercel projects."""
    settings = store.get_settings()
    vercel_token = settings.get("vercel_token", "")
    if not vercel_token:
        return {"ok": False, "error": "Vercel token not configured"}
    client = VercelClient(token=vercel_token)
    return await client.get_projects()
