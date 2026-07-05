from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from models.k8s import (
    ClusterCredentials,
    SecretCreate,
    SecretBulkDeploy,
    DockerRegistryCreate,
    DeployResult,
)
from services.k8s_client import get_k8s_client
from services.docker_creds import build_docker_config

router = APIRouter()


@router.get("/secrets")
async def list_secrets(
    credentials: ClusterCredentials,
    namespace: Optional[str] = Query(None, description="Namespace to list secrets from"),
):
    """List Secrets from a cluster, optionally filtered by namespace."""
    try:
        client = get_k8s_client(
            credentials.api_server, credentials.token, credentials.ca_cert
        )
        secrets = await client.get_secrets(namespace=namespace)
        return secrets
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/secrets/{namespace}/{name}")
async def get_secret(
    namespace: str,
    name: str,
    credentials: ClusterCredentials,
):
    """Get a specific Secret (decoded)."""
    try:
        client = get_k8s_client(
            credentials.api_server, credentials.token, credentials.ca_cert
        )
        secret = await client.get_secret(namespace, name)
        if secret is None:
            raise HTTPException(status_code=404, detail="Secret not found")
        return secret
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/secrets")
async def deploy_secret(
    secret: SecretCreate,
    credentials: ClusterCredentials,
    dry_run: bool = Query(False, description="Simulate without applying"),
):
    """
    Create or update a Secret in a single namespace (idempotent upsert).

    - **dry_run**: If true, simulates the operation without applying changes
    """
    try:
        client = get_k8s_client(
            credentials.api_server, credentials.token, credentials.ca_cert
        )

        if dry_run:
            existing = await client.get_secret(secret.namespace, secret.name)
            return {
                "dry_run": True,
                "namespace": secret.namespace,
                "name": secret.name,
                "action": "update" if existing else "create",
                "current_data_keys": list(existing["data"].keys()) if existing else None,
                "new_data_keys": list(secret.data.keys()),
            }

        existing = await client.get_secret(secret.namespace, secret.name)
        if existing:
            result = await client.patch_secret(
                secret.namespace,
                secret.name,
                secret.data,
                secret.secret_type,
                secret.labels,
            )
            return {"action": "updated", **result}
        else:
            result = await client.create_secret(
                secret.namespace,
                secret.name,
                secret.data,
                secret.secret_type,
                secret.labels,
            )
            return {"action": "created", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/secrets/bulk")
async def bulk_deploy_secret(
    secret: SecretBulkDeploy,
    credentials: ClusterCredentials,
    dry_run: bool = Query(False, description="Simulate without applying"),
):
    """
    Deploy a Secret to multiple namespaces (idempotent upsert).

    - **dry_run**: If true, simulates the operation without applying changes
    - Continues processing even if one namespace fails
    """
    results = []
    client = get_k8s_client(
        credentials.api_server, credentials.token, credentials.ca_cert
    )

    for ns in secret.namespaces:
        try:
            existing = await client.get_secret(ns, secret.name)

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
                await client.patch_secret(
                    ns,
                    secret.name,
                    secret.data,
                    secret.secret_type,
                    secret.labels,
                )
                results.append(
                    DeployResult(namespace=ns, status="success", action="updated")
                )
            else:
                await client.create_secret(
                    ns,
                    secret.name,
                    secret.data,
                    secret.secret_type,
                    secret.labels,
                )
                results.append(
                    DeployResult(namespace=ns, status="success", action="created")
                )
        except Exception as e:
            results.append(
                DeployResult(namespace=ns, status="failed", error=str(e))
            )

    return {"dry_run": dry_run, "results": results}


@router.post("/secrets/docker")
async def deploy_docker_registry_secret(
    docker: DockerRegistryCreate,
    credentials: ClusterCredentials,
    dry_run: bool = Query(False, description="Simulate without applying"),
):
    """
    Deploy a Docker Registry credentials secret to multiple namespaces.

    Creates a `kubernetes.io/dockerconfigjson` type secret.
    """
    try:
        # Build the dockerconfigjson
        docker_config = build_docker_config(
            docker.registry, docker.username, docker.password, docker.email
        )

        results = []
        client = get_k8s_client(
            credentials.api_server, credentials.token, credentials.ca_cert
        )

        for ns in docker.namespaces:
            try:
                existing = await client.get_secret(ns, docker.name)

                if dry_run:
                    results.append(
                        DeployResult(
                            namespace=ns,
                            status="simulated",
                            action="update" if existing else "create",
                        )
                    )
                    continue

                data = {".dockerconfigjson": docker_config}
                if existing:
                    await client.patch_secret(
                        ns,
                        docker.name,
                        data,
                        "kubernetes.io/dockerconfigjson",
                        docker.labels,
                    )
                    results.append(
                        DeployResult(namespace=ns, status="success", action="updated")
                    )
                else:
                    await client.create_secret(
                        ns,
                        docker.name,
                        data,
                        "kubernetes.io/dockerconfigjson",
                        docker.labels,
                    )
                    results.append(
                        DeployResult(namespace=ns, status="success", action="created")
                    )
            except Exception as e:
                results.append(
                    DeployResult(namespace=ns, status="failed", error=str(e))
                )

        return {"dry_run": dry_run, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/secrets/{namespace}/{name}")
async def delete_secret(
    namespace: str,
    name: str,
    credentials: ClusterCredentials,
):
    """Delete a Secret."""
    try:
        client = get_k8s_client(
            credentials.api_server, credentials.token, credentials.ca_cert
        )
        await client.delete_secret(namespace, name)
        return {"status": "deleted", "namespace": namespace, "name": name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
