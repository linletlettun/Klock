from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ClusterCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    environment: str = Field(..., pattern="^(DEV|STAGING|PROD)$")
    api_server: Optional[str] = None
    service_account_token: Optional[str] = None
    kubeconfig: Optional[str] = None
    ca_cert: Optional[str] = None
    default_namespace: str = "default"


class ClusterResponse(BaseModel):
    id: str
    name: str
    environment: str
    api_server: Optional[str] = None
    status: str = "pending"
    k8s_version: Optional[str] = None
    default_namespace: str = "default"
    created_at: str
    # Never expose token or kubeconfig in response


class ClusterUpdate(BaseModel):
    name: Optional[str] = None
    environment: Optional[str] = None
    api_server: Optional[str] = None
    service_account_token: Optional[str] = None
    kubeconfig: Optional[str] = None
    ca_cert: Optional[str] = None
    default_namespace: Optional[str] = None


class ClusterConnectionTest(BaseModel):
    api_server: str
    service_account_token: Optional[str] = None
    kubeconfig: Optional[str] = None
    ca_cert: Optional[str] = None
