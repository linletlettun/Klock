from pydantic import BaseModel
from typing import Optional


class DeployRequest(BaseModel):
    """Request to deploy an application."""
    app_name: str
    repo_url: str
    branch: str = "main"
    platform: str  # vercel, aws, kubernetes, docker, custom
    framework: Optional[str] = None
    build_command: Optional[str] = None
    output_directory: Optional[str] = None
    env_vars: Optional[dict] = None
    # K8s specific
    cluster_id: Optional[str] = None
    namespace: Optional[str] = None
    # AWS specific
    region: Optional[str] = None
    instance_type: Optional[str] = None


class DeployResponse(BaseModel):
    """Response from a deployment."""
    id: str
    app_name: str
    platform: str
    status: str  # queued, building, deploying, ready, error, canceled
    url: Optional[str] = None
    created_at: str
    branch: str = "main"


class DeploymentStatus(BaseModel):
    """Status of a deployment."""
    id: str
    app_name: str
    platform: str
    status: str
    url: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    build_time: Optional[int] = None  # seconds
    commit_sha: Optional[str] = None
    commit_message: Optional[str] = None
    branch: str = "main"
    error: Optional[str] = None
