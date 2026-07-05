"""
ArgoCD integration endpoints.
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
from models.gitops import ArgoCDAppCreate
from services.argocd_client import argocd_client

router = APIRouter()


@router.get("/applications")
async def list_applications():
    """List all ArgoCD applications."""
    apps = await argocd_client.list_applications()
    return apps


@router.get("/applications/{name}")
async def get_application(name: str):
    """Get a specific ArgoCD application."""
    app = await argocd_client.get_application(name)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.post("/applications/{name}/sync")
async def sync_application(name: str):
    """Trigger sync for an ArgoCD application."""
    result = await argocd_client.sync_application(name)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error"))
    return result


@router.post("/applications/{name}/rollback")
async def rollback_application(name: str, revision: int):
    """Rollback an ArgoCD application."""
    result = await argocd_client.rollback_application(name, revision)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error"))
    return result


@router.post("/applications")
async def create_application(app: ArgoCDAppCreate):
    """Create a new ArgoCD application."""
    result = await argocd_client.create_application(app.model_dump())
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error"))
    return result


@router.get("/applications/{name}/resources")
async def get_application_resources(name: str):
    """Get resources managed by an application."""
    resources = await argocd_client.get_application_resources(name)
    return resources


@router.get("/applications/{name}/history")
async def get_application_history(name: str):
    """Get sync history for an application."""
    history = await argocd_client.get_application_history(name)
    return history
