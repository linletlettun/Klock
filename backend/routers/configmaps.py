from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from models.k8s import ClusterCredentials, ConfigMapCreate, ConfigMapBulkDeploy, DeployResult
from services.k8s_client import get_k8s_client

router = APIRouter()


@router.get("/configmaps")
async def list_configmaps(
    credentials: ClusterCredentials,
    namespace: Optional[str] = Query(None, description="Namespace to list configmaps from"),
):
    """List ConfigMaps from a cluster, optionally filtered by namespace."""
    try:
        client = get_k8s_client(
            credentials.api_server, credentials.token, credentials.ca_cert
        )
        configmaps = await client.get_configmaps(namespace=namespace)
        return configmaps
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/configmaps/{namespace}/{name}")
async def get_configmap(
    namespace: str,
    name: str,
    credentials: ClusterCredentials,
):
    """Get a specific ConfigMap."""
    try:
        client = get_k8s_client(
            credentials.api_server, credentials.token, credentials.ca_cert
        )
        configmap = await client.get_configmap(namespace, name)
        if configmap is None:
            raise HTTPException(status_code=404, detail="ConfigMap not found")
        return configmap
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/configmaps")
async def deploy_configmap(
    cluster_id: str,
    configmap: ConfigMapCreate,
    credentials: ClusterCredentials,
    dry_run: bool = Query(False, description="Simulate without applying"),
):
    """
    Create or update a ConfigMap in a single namespace (idempotent upsert).

    - **dry_run**: If true, simulates the operation without applying changes
    """
    try:
        client = get_k8s_client(
            credentials.api_server, credentials.token, credentials.ca_cert
        )

        if dry_run:
            existing = await client.get_configmap(configmap.namespace, configmap.name)
            return {
                "dry_run": True,
                "namespace": configmap.namespace,
                "name": configmap.name,
                "action": "update" if existing else "create",
                "current_data": existing["data"] if existing else None,
                "new_data": configmap.data,
            }

        existing = await client.get_configmap(configmap.namespace, configmap.name)
        if existing:
            result = await client.patch_configmap(
                configmap.namespace, configmap.name, configmap.data, configmap.labels
            )
            return {"action": "updated", **result}
        else:
            result = await client.create_configmap(
                configmap.namespace, configmap.name, configmap.data, configmap.labels
            )
            return {"action": "created", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/configmaps/bulk")
async def bulk_deploy_configmap(
    configmap: ConfigMapBulkDeploy,
    credentials: ClusterCredentials,
    dry_run: bool = Query(False, description="Simulate without applying"),
):
    """
    Deploy a ConfigMap to multiple namespaces (idempotent upsert).

    - **dry_run**: If true, simulates the operation without applying changes
    - Continues processing even if one namespace fails
    """
    results = []
    client = get_k8s_client(
        credentials.api_server, credentials.token, credentials.ca_cert
    )

    for ns in configmap.namespaces:
        try:
            existing = await client.get_configmap(ns, configmap.name)

            if dry_run:
                results.append(
                    DeployResult(
                        namespace=ns,
                        status="simulated",
                        action="update" if existing else "create",
                    )
                )
                continue

            if existing:
                await client.patch_configmap(
                    ns, configmap.name, configmap.data, configmap.labels
                )
                results.append(
                    DeployResult(namespace=ns, status="success", action="updated")
                )
            else:
                await client.create_configmap(
                    ns, configmap.name, configmap.data, configmap.labels
                )
                results.append(
                    DeployResult(namespace=ns, status="success", action="created")
                )
        except Exception as e:
            results.append(
                DeployResult(namespace=ns, status="failed", error=str(e))
            )

    return {"dry_run": dry_run, "results": results}


@router.delete("/configmaps/{namespace}/{name}")
async def delete_configmap(
    namespace: str,
    name: str,
    credentials: ClusterCredentials,
):
    """Delete a ConfigMap."""
    try:
        client = get_k8s_client(
            credentials.api_server, credentials.token, credentials.ca_cert
        )
        await client.delete_configmap(namespace, name)
        return {"status": "deleted", "namespace": namespace, "name": name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
