from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TLSStatus(BaseModel):
    id: str
    name: str
    namespace: str
    secret_name: str
    cluster_id: str
    issuer: Optional[str] = None
    subject: Optional[str] = None
    not_before: Optional[str] = None
    not_after: Optional[str] = None
    days_remaining: int = 0
    status: str = "unknown"  # valid, expiring, expired, error
    last_checked: str


class TokenStatus(BaseModel):
    id: str
    name: str
    cluster_id: str
    token_type: str  # service-account, nacos, argocd, git, kafka
    issuer: Optional[str] = None
    issued_at: Optional[str] = None
    expires_at: Optional[str] = None
    days_remaining: int = 0
    status: str = "unknown"  # valid, expiring, expired, error
    last_checked: str


class ClusterHealth(BaseModel):
    id: str
    cluster_id: str
    cluster_name: str
    status: str  # healthy, unhealthy, unreachable
    latency_ms: Optional[float] = None
    k8s_version: Optional[str] = None
    node_count: Optional[int] = None
    pod_count: Optional[int] = None
    last_ping: str
    error: Optional[str] = None


class KafkaKeyStatus(BaseModel):
    id: str
    name: str
    namespace: str
    secret_name: str
    cluster_id: str
    key_type: str  # sasl-plain, sasl-scram, ssl, api-key
    bootstrap_servers: Optional[str] = None
    username: Optional[str] = None
    last_rotated: Optional[str] = None
    days_until_rotation: Optional[int] = None
    status: str = "unknown"  # valid, needs-rotation, error
    last_checked: str


class MonitorSummary(BaseModel):
    tls_count: int = 0
    tls_expiring: int = 0
    tls_expired: int = 0
    tokens_count: int = 0
    tokens_expiring: int = 0
    tokens_expired: int = 0
    clusters_healthy: int = 0
    clusters_unhealthy: int = 0
    kafka_count: int = 0
    kafka_needing_rotation: int = 0
