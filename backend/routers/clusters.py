"""
Cluster management endpoints.
"""
from fastapi import APIRouter, HTTPException
from models.cluster import ClusterCreate, ClusterResponse, ClusterConnectionTest
from services.store import store
from services.k8s_client import get_k8s_client

router = APIRouter()


@router.get("", response_model=list[ClusterResponse])
async def list_clusters():
    """List all registered clusters (no sensitive data exposed)."""
    return store.get_clusters()


@router.get("/{cluster_id}", response_model=ClusterResponse)
async def get_cluster(cluster_id: str):
    """Get a specific cluster."""
    cluster = store.get_cluster(cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return cluster


@router.post("", response_model=ClusterResponse, status_code=201)
async def create_cluster(cluster: ClusterCreate):
    """Register a new cluster."""
    data = cluster.model_dump()
    result = store.add_cluster(data)
    return result


@router.put("/{cluster_id}", response_model=ClusterResponse)
async def update_cluster(cluster_id: str, updates: dict):
    """Update cluster details."""
    result = store.update_cluster(cluster_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return result


@router.delete("/{cluster_id}")
async def delete_cluster(cluster_id: str):
    """Delete a cluster."""
    if not store.delete_cluster(cluster_id):
        raise HTTPException(status_code=404, detail="Cluster not found")
    return {"status": "deleted"}


@router.post("/test-connection")
async def test_connection(test: ClusterConnectionTest):
    """Test connectivity to a Kubernetes cluster."""
    try:
        api_server = test.api_server
        token = test.service_account_token
        ca_cert = test.ca_cert

        if not api_server:
            raise HTTPException(status_code=400, detail="API server URL required")

        client = get_k8s_client(api_server, token or "", ca_cert)

        # Test basic connectivity
        import httpx
        headers = {"Authorization": f"Bearer {token}"}
        async with httpx.AsyncClient(verify=False) as http:
            resp = await http.get(f"{api_server}/version", headers=headers)
            if resp.status_code == 200:
                version_data = resp.json()
                return {
                    "success": True,
                    "k8s_version": version_data.get("gitVersion", "unknown"),
                }
            return {"success": False, "error": f"HTTP {resp.status_code}"}
    except Exception as e:
        return {"success": False, "error": str(e)}
