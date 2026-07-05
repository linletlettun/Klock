from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from services.k8s_client import get_k8s_client

router = APIRouter()


class ClusterCredentials(BaseModel):
    api_server: str
    token: str
    ca_cert: Optional[str] = None


class NamespaceResponse(BaseModel):
    name: str
    status: str
    labels: dict


@router.post("/namespaces", response_model=list[NamespaceResponse])
async def list_namespaces(
    credentials: ClusterCredentials,
    include_system: bool = Query(False, description="Include system namespaces"),
):
    """
    List namespaces from a Kubernetes cluster.

    - **include_system**: If true, includes kube-system, kube-public, kube-node-lease
    """
    try:
        client = get_k8s_client(
            credentials.api_server, credentials.token, credentials.ca_cert
        )
        namespaces = await client.get_namespaces(include_system=include_system)
        return namespaces
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
