"""
Configuration management endpoints — Vault, Consul, Nacos.
Provides test-connection and secret/KV browsing for each provider.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.store import store
from services.vault_client import VaultClient
from services.consul_client import ConsulClient

router = APIRouter()


# ── Request models ──────────────────────────────────────────

class SecretPathRequest(BaseModel):
    path: str = ""


class SecretWriteRequest(BaseModel):
    path: str
    data: dict  # Vault: key-value pairs, Consul: single value under "value"


# ── Vault endpoints ─────────────────────────────────────────

@router.post("/vault/test")
async def vault_test_connection():
    """Test connectivity to HashiCorp Vault."""
    settings = store.get_settings()
    vault_url = settings.get("vault_server_url", "")
    vault_token = settings.get("vault_token", "")
    if not vault_url:
        return {"ok": False, "error": "Vault server URL not configured"}
    client = VaultClient(
        server_url=vault_url,
        token=vault_token,
        namespace=settings.get("vault_namespace") or None,
        mount_path=settings.get("vault_mount_path", "secret"),
        kv_version=settings.get("vault_kv_version", "v2"),
    )
    return await client.test_connection()


@router.post("/vault/list")
async def vault_list_secrets(req: SecretPathRequest):
    """List secret keys at a Vault path."""
    settings = store.get_settings()
    client = VaultClient(
        server_url=settings.get("vault_server_url", ""),
        token=settings.get("vault_token", ""),
        namespace=settings.get("vault_namespace") or None,
        mount_path=settings.get("vault_mount_path", "secret"),
        kv_version=settings.get("vault_kv_version", "v2"),
    )
    return await client.list_secrets(req.path)


@router.post("/vault/get")
async def vault_get_secret(req: SecretPathRequest):
    """Read a secret from Vault."""
    settings = store.get_settings()
    client = VaultClient(
        server_url=settings.get("vault_server_url", ""),
        token=settings.get("vault_token", ""),
        namespace=settings.get("vault_namespace") or None,
        mount_path=settings.get("vault_mount_path", "secret"),
        kv_version=settings.get("vault_kv_version", "v2"),
    )
    return await client.get_secret(req.path)


@router.post("/vault/put")
async def vault_put_secret(req: SecretWriteRequest):
    """Write a secret to Vault."""
    settings = store.get_settings()
    client = VaultClient(
        server_url=settings.get("vault_server_url", ""),
        token=settings.get("vault_token", ""),
        namespace=settings.get("vault_namespace") or None,
        mount_path=settings.get("vault_mount_path", "secret"),
        kv_version=settings.get("vault_kv_version", "v2"),
    )
    return await client.put_secret(req.path, req.data)


@router.post("/vault/delete")
async def vault_delete_secret(req: SecretPathRequest):
    """Delete a secret from Vault."""
    settings = store.get_settings()
    client = VaultClient(
        server_url=settings.get("vault_server_url", ""),
        token=settings.get("vault_token", ""),
        namespace=settings.get("vault_namespace") or None,
        mount_path=settings.get("vault_mount_path", "secret"),
        kv_version=settings.get("vault_kv_version", "v2"),
    )
    return await client.delete_secret(req.path)


# ── Consul endpoints ────────────────────────────────────────

@router.post("/consul/test")
async def consul_test_connection():
    """Test connectivity to HashiCorp Consul."""
    settings = store.get_settings()
    consul_url = settings.get("consul_server_url", "")
    if not consul_url:
        return {"ok": False, "error": "Consul server URL not configured"}
    client = ConsulClient(
        server_url=consul_url,
        token=settings.get("consul_token") or None,
        datacenter=settings.get("consul_datacenter", "dc1"),
        kv_prefix=settings.get("consul_kv_prefix", "klock/"),
    )
    return await client.test_connection()


@router.post("/consul/list")
async def consul_list_keys(req: SecretPathRequest):
    """List KV keys in Consul."""
    settings = store.get_settings()
    client = ConsulClient(
        server_url=settings.get("consul_server_url", ""),
        token=settings.get("consul_token") or None,
        datacenter=settings.get("consul_datacenter", "dc1"),
        kv_prefix=settings.get("consul_kv_prefix", "klock/"),
    )
    return await client.list_keys(req.path)


@router.post("/consul/get")
async def consul_get_key(req: SecretPathRequest):
    """Read a KV entry from Consul."""
    settings = store.get_settings()
    client = ConsulClient(
        server_url=settings.get("consul_server_url", ""),
        token=settings.get("consul_token") or None,
        datacenter=settings.get("consul_datacenter", "dc1"),
        kv_prefix=settings.get("consul_kv_prefix", "klock/"),
    )
    return await client.get_key(req.path)


@router.post("/consul/put")
async def consul_put_key(req: SecretWriteRequest):
    """Write a KV entry to Consul."""
    settings = store.get_settings()
    client = ConsulClient(
        server_url=settings.get("consul_server_url", ""),
        token=settings.get("consul_token") or None,
        datacenter=settings.get("consul_datacenter", "dc1"),
        kv_prefix=settings.get("consul_kv_prefix", "klock/"),
    )
    value = req.data.get("value", "")
    return await client.put_key(req.path, value)


@router.post("/consul/delete")
async def consul_delete_key(req: SecretPathRequest):
    """Delete a KV entry from Consul."""
    settings = store.get_settings()
    client = ConsulClient(
        server_url=settings.get("consul_server_url", ""),
        token=settings.get("consul_token") or None,
        datacenter=settings.get("consul_datacenter", "dc1"),
        kv_prefix=settings.get("consul_kv_prefix", "klock/"),
    )
    return await client.delete_key(req.path)
