from pydantic import BaseModel, Field
from typing import Optional


class ManifestGenerate(BaseModel):
    cluster_name: str
    environment: str  # DEV, STAGING, PROD
    namespace: str
    resource_type: str = Field(..., pattern="^(configmap|secret|docker-registry)$")
    resource_name: str
    data: dict
    labels: Optional[dict] = None
    annotations: Optional[dict] = None


class GitSyncRequest(BaseModel):
    cluster_name: str
    environment: str
    namespace: str
    resource_type: str
    resource_name: str
    data: dict
    commit_message: Optional[str] = None
    auto_sync_argocd: bool = True


class GitSyncResponse(BaseModel):
    success: bool
    commit_sha: Optional[str] = None
    commit_url: Optional[str] = None
    file_path: str
    argocd_sync_triggered: bool = False
    argocd_sync_status: Optional[str] = None
    error: Optional[str] = None


class ArgoCDAppCreate(BaseModel):
    name: str
    project: str = "default"
    repo_url: str
    revision: str = "main"
    path: str
    destination_server: str = "https://kubernetes.default.svc"
    destination_namespace: str = "default"
    sync_policy: str = "manual"  # manual, automatic
    auto_prune: bool = False
    self_heal: bool = False
