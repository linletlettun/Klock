from pydantic import BaseModel
from typing import Optional


class ClusterCredentials(BaseModel):
    api_server: str
    token: str
    ca_cert: Optional[str] = None


class ConfigMapCreate(BaseModel):
    name: str
    namespace: str
    data: dict
    labels: Optional[dict] = None


class ConfigMapBulkDeploy(BaseModel):
    name: str
    namespaces: list[str]
    data: dict
    labels: Optional[dict] = None


class SecretCreate(BaseModel):
    name: str
    namespace: str
    data: dict
    secret_type: str = "Opaque"
    labels: Optional[dict] = None


class SecretBulkDeploy(BaseModel):
    name: str
    namespaces: list[str]
    data: dict
    secret_type: str = "Opaque"
    labels: Optional[dict] = None


class DockerRegistryCreate(BaseModel):
    name: str
    namespaces: list[str]
    registry: str
    username: str
    password: str
    email: str
    labels: Optional[dict] = None


class DeployResult(BaseModel):
    namespace: str
    status: str  # "success" or "failed"
    action: str  # "created", "updated", or "deleted"
    error: Optional[str] = None
