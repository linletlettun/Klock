"""
Resource monitoring endpoints: TLS, tokens, cluster health, Kafka.
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
from services.monitor import monitor_service

router = APIRouter()


@router.get("/summary")
async def get_summary():
    """Get monitoring summary."""
    return monitor_service.get_summary()


# ── TLS Certificate Monitoring ──────────────────────────

@router.get("/tls")
async def list_tls():
    """List all monitored TLS certificates."""
    return monitor_service.get_all_tls()


@router.post("/tls/check")
async def check_tls(host: str, port: int = 443, name: str = None):
    """Check TLS certificate for a host."""
    result = await monitor_service.check_tls_cert(host, port, name)
    return result


@router.post("/tls/check-secret")
async def check_tls_secret(cluster_id: str, namespace: str, secret_name: str):
    """Check TLS certificate from a K8s Secret."""
    result = await monitor_service.check_tls_from_secret(cluster_id, namespace, secret_name)
    if result.get("status") == "error" and "not found" in result.get("error", "").lower():
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# ── Token Expiration Monitoring ─────────────────────────

@router.get("/tokens")
async def list_tokens():
    """List all monitored tokens."""
    return monitor_service.get_all_tokens()


@router.post("/tokens/check-cluster")
async def check_cluster_token(cluster_id: str):
    """Check service account token for a cluster."""
    result = await monitor_service.check_k8s_token(cluster_id)
    return result


@router.post("/tokens/check-custom")
async def check_custom_token(
    name: str, token: str, token_type: str = "generic",
    cluster_id: str = "", expires_at: str = None
):
    """Check a custom token."""
    result = await monitor_service.check_custom_token(
        name, token, token_type, cluster_id, expires_at
    )
    return result


# ── Cluster Health Ping ────────────────────────────────

@router.get("/health")
async def list_health():
    """List all cluster health statuses."""
    return monitor_service.get_all_health()


@router.post("/health/ping")
async def ping_cluster(cluster_id: str):
    """Ping a cluster and store health status."""
    result = await monitor_service.ping_cluster(cluster_id)
    return result


@router.post("/health/ping-all")
async def ping_all_clusters():
    """Ping all registered clusters."""
    from services.store import store
    clusters = store.get_clusters()
    results = []
    for cluster in clusters:
        result = await monitor_service.ping_cluster(cluster["id"])
        results.append(result)
    return results


# ── Kafka Key Monitoring ───────────────────────────────

@router.get("/kafka")
async def list_kafka():
    """List all monitored Kafka credentials."""
    return monitor_service.get_all_kafka()


@router.post("/kafka/check")
async def check_kafka(
    cluster_id: str, namespace: str, secret_name: str,
    key_type: str = "sasl-plain"
):
    """Check Kafka credentials from a K8s Secret."""
    result = await monitor_service.check_kafka_secret(
        cluster_id, namespace, secret_name, key_type
    )
    return result
