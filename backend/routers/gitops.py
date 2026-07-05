"""
GitOps sync endpoint: generate manifest + git commit + ArgoCD sync.
"""
from fastapi import APIRouter, HTTPException
from models.gitops import GitSyncRequest, GitSyncResponse
from services.gitops import gitops_service
from services.store import store

router = APIRouter()


@router.post("/sync", response_model=GitSyncResponse)
async def gitops_sync(request: GitSyncRequest):
    """
    Full GitOps sync flow:
    1. Generate Kubernetes manifest YAML
    2. Commit to Git repository
    3. Trigger ArgoCD sync (optional)
    """
    try:
        # 1. Generate manifest
        manifest = gitops_service.generate_manifest(
            resource_type=request.resource_type,
            resource_name=request.resource_name,
            namespace=request.namespace,
            data=request.data,
        )

        # 2. Build file path
        file_path = gitops_service.get_file_path(
            cluster_name=request.cluster_name,
            environment=request.environment,
            namespace=request.namespace,
            resource_type=request.resource_type,
            resource_name=request.resource_name,
        )

        # 3. Commit to Git
        commit_msg = request.commit_message or (
            f"[Klock] {request.resource_type} {request.resource_name} "
            f"in {request.cluster_name}/{request.environment}/{request.namespace}"
        )
        git_result = await gitops_service.commit_and_push(
            file_path=file_path,
            content=manifest,
            commit_message=commit_msg,
        )

        # 4. Trigger ArgoCD sync (if configured and requested)
        argocd_sync_triggered = False
        argocd_sync_status = None
        if request.auto_sync_argocd and git_result["success"]:
            # Try to find matching ArgoCD app
            app_name = f"{request.cluster_name}-{request.environment}"
            sync_result = await gitops_service.trigger_argocd_sync(app_name)
            argocd_sync_triggered = True
            argocd_sync_status = (
                "synced" if sync_result["success"] else sync_result.get("error")
            )

        return GitSyncResponse(
            success=git_result["success"],
            commit_sha=git_result.get("commit_sha"),
            commit_url=git_result.get("commit_url"),
            file_path=file_path,
            argocd_sync_triggered=argocd_sync_triggered,
            argocd_sync_status=argocd_sync_status,
            error=git_result.get("error"),
        )
    except Exception as e:
        return GitSyncResponse(success=False, error=str(e))


@router.post("/preview")
async def preview_manifest(request: GitSyncRequest):
    """Preview the generated manifest YAML without committing."""
    try:
        manifest = gitops_service.generate_manifest(
            resource_type=request.resource_type,
            resource_name=request.resource_name,
            namespace=request.namespace,
            data=request.data,
        )
        file_path = gitops_service.get_file_path(
            cluster_name=request.cluster_name,
            environment=request.environment,
            namespace=request.namespace,
            resource_type=request.resource_type,
            resource_name=request.resource_name,
        )
        return {
            "file_path": file_path,
            "manifest": manifest,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
