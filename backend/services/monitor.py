"""
Resource monitoring service: TLS certs, tokens, cluster health, Kafka keys.
"""
import ssl
import socket
import base64
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import urlparse

from services.store import store


class MonitorService:
    """Monitors TLS certificates, tokens, cluster health, and Kafka keys."""

    def __init__(self):
        self._tls_cache: dict[str, dict] = {}
        self._token_cache: dict[str, dict] = {}
        self._health_cache: dict[str, dict] = {}
        self._kafka_cache: dict[str, dict] = {}

    # ── TLS Certificate Monitor ────────────────────────────

    async def check_tls_cert(
        self, host: str, port: int = 443, name: str = None, namespace: str = "",
        secret_name: str = "", cluster_id: str = ""
    ) -> dict:
        """Check TLS certificate expiration for a host."""
        cert_id = f"{host}:{port}"
        try:
            context = ssl.create_default_context()
            with socket.create_connection((host, port), timeout=5) as sock:
                with context.wrap_socket(sock, server_hostname=host) as ssock:
                    cert = ssock.getpeercert()

            not_after_str = cert.get("notAfter", "")
            not_before_str = cert.get("notBefore", "")
            not_after = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z")
            not_before = datetime.strptime(not_before_str, "%b %d %H:%M:%S %Y %Z")
            now = datetime.utcnow()
            days_remaining = (not_after - now).days

            # Get issuer
            issuer_parts = dict(x[0] for x in cert.get("issuer", []))
            issuer = issuer_parts.get("organizationName", issuer_parts.get("commonName", ""))

            # Get subject
            subject_parts = dict(x[0] for x in cert.get("subject", []))
            subject = subject_parts.get("commonName", "")

            if days_remaining < 0:
                status = "expired"
            elif days_remaining < 30:
                status = "expiring"
            else:
                status = "valid"

            result = {
                "id": cert_id,
                "name": name or host,
                "namespace": namespace,
                "secret_name": secret_name,
                "cluster_id": cluster_id,
                "host": host,
                "port": port,
                "issuer": issuer,
                "subject": subject,
                "not_before": not_before.isoformat(),
                "not_after": not_after.isoformat(),
                "days_remaining": days_remaining,
                "status": status,
                "last_checked": datetime.now(timezone.utc).isoformat(),
            }
            self._tls_cache[cert_id] = result
            return result
        except Exception as e:
            result = {
                "id": cert_id,
                "name": name or host,
                "namespace": namespace,
                "secret_name": secret_name,
                "cluster_id": cluster_id,
                "host": host,
                "port": port,
                "issuer": None,
                "subject": None,
                "not_before": None,
                "not_after": None,
                "days_remaining": 0,
                "status": "error",
                "error": str(e),
                "last_checked": datetime.now(timezone.utc).isoformat(),
            }
            self._tls_cache[cert_id] = result
            return result

    async def check_tls_from_secret(self, cluster_id: str, namespace: str, secret_name: str) -> dict:
        """Extract and check TLS cert from a K8s Secret."""
        from services.k8s_client import get_k8s_client

        cluster = store.get_cluster_full(cluster_id)
        if not cluster:
            return {"status": "error", "error": "Cluster not found"}

        try:
            client = get_k8s_client(
                cluster.get("api_server", ""),
                cluster.get("_token", ""),
                cluster.get("ca_cert")
            )
            secret = await client.get_secret(namespace, secret_name)
            if not secret:
                return {"status": "error", "error": "Secret not found"}

            # Extract cert from tls.crt
            cert_data = secret.get("data", {}).get("tls.crt") or secret.get("data", {}).get("certificate")
            if not cert_data:
                return {"status": "error", "error": "No TLS certificate found in secret"}

            # Parse PEM cert
            from cryptography import x509
            cert_pem = base64.b64decode(cert_data) if not cert_data.startswith("-----") else cert_data.encode()
            cert = x509.load_pem_x509_certificate(cert_pem)

            not_after = cert.not_valid_after_utc
            not_before = cert.not_valid_before_utc
            now = datetime.now(timezone.utc)
            days_remaining = (not_after - now).days

            issuer = cert.issuer.get_attributes_for_oid(x509.oid.NameOID.ORGANIZATION_NAME)
            subject = cert.subject.get_attributes_for_oid(x509.oid.NameOID.COMMON_NAME)

            if days_remaining < 0:
                status = "expired"
            elif days_remaining < 30:
                status = "expiring"
            else:
                status = "valid"

            result = {
                "id": f"{cluster_id}:{namespace}:{secret_name}",
                "name": secret_name,
                "namespace": namespace,
                "secret_name": secret_name,
                "cluster_id": cluster_id,
                "issuer": issuer[0].value if issuer else "",
                "subject": subject[0].value if subject else "",
                "not_before": not_before.isoformat(),
                "not_after": not_after.isoformat(),
                "days_remaining": days_remaining,
                "status": status,
                "last_checked": datetime.now(timezone.utc).isoformat(),
            }
            self._tls_cache[result["id"]] = result
            return result
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def get_all_tls(self) -> list[dict]:
        return list(self._tls_cache.values())

    # ── Token Expiration Monitor ────────────────────────────

    async def check_k8s_token(self, cluster_id: str) -> dict:
        """Check K8s service account token expiration by decoding JWT."""
        cluster = store.get_cluster_full(cluster_id)
        if not cluster:
            return {"status": "error", "error": "Cluster not found"}

        token = cluster.get("_token", "")
        token_id = f"sa:{cluster_id}"

        try:
            # Decode JWT payload (no verification - just reading expiry)
            parts = token.split(".")
            if len(parts) != 3:
                raise ValueError("Invalid JWT format")

            payload = parts[1]
            # Add padding
            payload += "=" * (4 - len(payload) % 4)
            decoded = base64.b64decode(payload)
            data = json.loads(decoded)

            exp = data.get("exp")
            iat = data.get("iat")
            issued_at = datetime.fromtimestamp(iat, tz=timezone.utc) if iat else None
            expires_at = datetime.fromtimestamp(exp, tz=timezone.utc) if exp else None
            now = datetime.now(timezone.utc)
            days_remaining = (expires_at - now).days if expires_at else 999

            if expires_at and days_remaining < 0:
                status = "expired"
            elif expires_at and days_remaining < 30:
                status = "expiring"
            else:
                status = "valid"

            result = {
                "id": token_id,
                "name": f"{cluster.get('name', '')} SA Token",
                "cluster_id": cluster_id,
                "token_type": "service-account",
                "issuer": data.get("iss", ""),
                "issued_at": issued_at.isoformat() if issued_at else None,
                "expires_at": expires_at.isoformat() if expires_at else None,
                "days_remaining": days_remaining,
                "status": status,
                "last_checked": datetime.now(timezone.utc).isoformat(),
            }
            self._token_cache[token_id] = result
            return result
        except Exception as e:
            return {
                "id": token_id,
                "name": f"{cluster.get('name', '')} SA Token",
                "cluster_id": cluster_id,
                "token_type": "service-account",
                "status": "error",
                "error": str(e),
                "last_checked": datetime.now(timezone.utc).isoformat(),
            }

    async def check_custom_token(
        self, name: str, token: str, token_type: str = "generic",
        cluster_id: str = "", expires_at: str = None
    ) -> dict:
        """Check a custom token's expiration."""
        token_id = f"custom:{name}"

        try:
            if token.startswith("ey") and "." in token:
                # JWT token - decode
                parts = token.split(".")
                payload = parts[1] + "=" * (4 - len(parts[1]) % 4)
                data = json.loads(base64.b64decode(payload))
                exp = data.get("exp")
                iat = data.get("iat")
                issued_at = datetime.fromtimestamp(iat, tz=timezone.utc) if iat else None
                expires_at_dt = datetime.fromtimestamp(exp, tz=timezone.utc) if exp else None
            elif expires_at:
                # Manual expiry date
                expires_at_dt = datetime.fromisoformat(expires_at)
                issued_at = None
            else:
                return {"status": "error", "error": "Cannot determine token expiry"}

            now = datetime.now(timezone.utc)
            days_remaining = (expires_at_dt - now).days if expires_at_dt else 999

            if expires_at_dt and days_remaining < 0:
                status = "expired"
            elif expires_at_dt and days_remaining < 30:
                status = "expiring"
            else:
                status = "valid"

            result = {
                "id": token_id,
                "name": name,
                "cluster_id": cluster_id,
                "token_type": token_type,
                "issued_at": issued_at.isoformat() if issued_at else None,
                "expires_at": expires_at_dt.isoformat() if expires_at_dt else None,
                "days_remaining": days_remaining,
                "status": status,
                "last_checked": datetime.now(timezone.utc).isoformat(),
            }
            self._token_cache[token_id] = result
            return result
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def get_all_tokens(self) -> list[dict]:
        return list(self._token_cache.values())

    # ── Cluster Health Ping ─────────────────────────────────

    async def ping_cluster(self, cluster_id: str) -> dict:
        """Ping a cluster and store result in ConfigMap."""
        cluster = store.get_cluster_full(cluster_id)
        if not cluster:
            return {"status": "error", "error": "Cluster not found"}

        import httpx
        api_server = cluster.get("api_server", "")
        token = cluster.get("_token", "")

        health_id = f"health:{cluster_id}"
        start_time = datetime.now(timezone.utc)

        try:
            headers = {"Authorization": f"Bearer {token}"}
            async with httpx.AsyncClient(verify=False, timeout=10) as client:
                resp = await client.get(f"{api_server}/version", headers=headers)
                latency = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000

                if resp.status_code == 200:
                    data = resp.json()
                    # Get node and pod count
                    node_count = None
                    pod_count = None
                    try:
                        nodes_resp = await client.get(f"{api_server}/api/v1/nodes", headers=headers)
                        if nodes_resp.status_code == 200:
                            node_count = len(nodes_resp.json().get("items", []))
                        pods_resp = await client.get(f"{api_server}/api/v1/pods", headers=headers)
                        if pods_resp.status_code == 200:
                            pod_count = len(pods_resp.json().get("items", []))
                    except Exception:
                        pass

                    result = {
                        "id": health_id,
                        "cluster_id": cluster_id,
                        "cluster_name": cluster.get("name", ""),
                        "status": "healthy",
                        "latency_ms": round(latency, 2),
                        "k8s_version": data.get("gitVersion", ""),
                        "node_count": node_count,
                        "pod_count": pod_count,
                        "last_ping": datetime.now(timezone.utc).isoformat(),
                        "error": None,
                    }
                else:
                    result = {
                        "id": health_id,
                        "cluster_id": cluster_id,
                        "cluster_name": cluster.get("name", ""),
                        "status": "unhealthy",
                        "latency_ms": round(latency, 2),
                        "k8s_version": None,
                        "node_count": None,
                        "pod_count": None,
                        "last_ping": datetime.now(timezone.utc).isoformat(),
                        "error": f"HTTP {resp.status_code}",
                    }
        except Exception as e:
            result = {
                "id": health_id,
                "cluster_id": cluster_id,
                "cluster_name": cluster.get("name", ""),
                "status": "unreachable",
                "latency_ms": None,
                "k8s_version": None,
                "node_count": None,
                "pod_count": None,
                "last_ping": datetime.now(timezone.utc).isoformat(),
                "error": str(e),
            }

        self._health_cache[health_id] = result
        return result

    def get_all_health(self) -> list[dict]:
        return list(self._health_cache.values())

    # ── Kafka Key Monitor ──────────────────────────────────

    async def check_kafka_secret(
        self, cluster_id: str, namespace: str, secret_name: str,
        key_type: str = "sasl-plain"
    ) -> dict:
        """Check Kafka credentials from a K8s Secret."""
        from services.k8s_client import get_k8s_client

        cluster = store.get_cluster_full(cluster_id)
        if not cluster:
            return {"status": "error", "error": "Cluster not found"}

        kafka_id = f"kafka:{cluster_id}:{namespace}:{secret_name}"

        try:
            client = get_k8s_client(
                cluster.get("api_server", ""),
                cluster.get("_token", ""),
                cluster.get("ca_cert")
            )
            secret = await client.get_secret(namespace, secret_name)
            if not secret:
                return {"status": "error", "error": "Secret not found"}

            data = secret.get("data", {})
            username = data.get("username", data.get("sasl.username", ""))

            result = {
                "id": kafka_id,
                "name": secret_name,
                "namespace": namespace,
                "secret_name": secret_name,
                "cluster_id": cluster_id,
                "key_type": key_type,
                "bootstrap_servers": data.get("bootstrap.servers", ""),
                "username": username,
                "last_rotated": None,
                "days_until_rotation": None,
                "status": "valid",
                "last_checked": datetime.now(timezone.utc).isoformat(),
            }
            self._kafka_cache[kafka_id] = result
            return result
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def get_all_kafka(self) -> list[dict]:
        return list(self._kafka_cache.values())

    # ── Summary ────────────────────────────────────────────

    def get_summary(self) -> dict:
        tls = self.get_all_tls()
        tokens = self.get_all_tokens()
        health = self.get_all_health()
        kafka = self.get_all_kafka()

        return {
            "tls_count": len(tls),
            "tls_expiring": sum(1 for t in tls if t["status"] == "expiring"),
            "tls_expired": sum(1 for t in tls if t["status"] == "expired"),
            "tokens_count": len(tokens),
            "tokens_expiring": sum(1 for t in tokens if t["status"] == "expiring"),
            "tokens_expired": sum(1 for t in tokens if t["status"] == "expired"),
            "clusters_healthy": sum(1 for h in health if h["status"] == "healthy"),
            "clusters_unhealthy": sum(1 for h in health if h["status"] != "healthy"),
            "kafka_count": len(kafka),
            "kafka_needing_rotation": sum(1 for k in kafka if k["status"] == "needs-rotation"),
        }


monitor_service = MonitorService()
