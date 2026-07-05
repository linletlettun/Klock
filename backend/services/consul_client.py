"""
HashiCorp Consul client for KV configuration storage.
"""
import httpx
from typing import Optional


class ConsulClient:
    """Client for Consul KV store."""

    def __init__(self, server_url: str, token: str = None, datacenter: str = "dc1", kv_prefix: str = "klock/"):
        self.server_url = server_url.rstrip("/")
        self.token = token
        self.datacenter = datacenter
        self.kv_prefix = kv_prefix.rstrip("/")
        self._base = f"{self.server_url}/v1"

    def _params(self) -> dict:
        params = {"dc": self.datacenter}
        if self.token:
            params["token"] = self.token
        return params

    async def test_connection(self) -> dict:
        """Verify Consul is reachable and token is valid."""
        try:
            async with httpx.AsyncClient(verify=False, timeout=10) as client:
                resp = await client.get(f"{self._base}/status/leader", params=self._params())
                if resp.status_code == 200:
                    leader = resp.json()
                    return {
                        "ok": True,
                        "leader": leader,
                        "datacenter": self.datacenter,
                    }
                # Consul returns 401/403 when ACL token is invalid
                if resp.status_code in (401, 403):
                    return {"ok": False, "error": "Invalid token or insufficient permissions"}
                return {"ok": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
        except httpx.ConnectError:
            return {"ok": False, "error": f"Cannot connect to Consul at {self.server_url}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def list_keys(self, prefix: str = "") -> dict:
        """List KV keys under a prefix."""
        try:
            path = f"{self.kv_prefix}/{prefix}".rstrip("/")
            async with httpx.AsyncClient(verify=False, timeout=10) as client:
                resp = await client.get(
                    f"{self._base}/kv/{path}",
                    params={**self._params(), "keys": "true"},
                )
                if resp.status_code == 200:
                    keys = resp.json()
                    # Remove the prefix from keys for display
                    clean_keys = [k.replace(self.kv_prefix + "/", "").replace(self.kv_prefix, "") for k in keys]
                    return {"ok": True, "keys": clean_keys}
                return {"ok": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def get_key(self, key: str) -> dict:
        """Read a KV entry. Value is base64-decoded by Consul."""
        try:
            full_key = f"{self.kv_prefix}/{key}" if self.kv_prefix else key
            async with httpx.AsyncClient(verify=False, timeout=10) as client:
                resp = await client.get(
                    f"{self._base}/kv/{full_key}",
                    params=self._params(),
                )
                if resp.status_code == 200:
                    entries = resp.json()
                    if entries:
                        import base64
                        value = base64.b64decode(entries[0].get("Value", "")).decode("utf-8")
                        return {"ok": True, "key": key, "value": value, "flags": entries[0].get("Flags", 0)}
                    return {"ok": False, "error": "Key not found"}
                return {"ok": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def put_key(self, key: str, value: str, flags: int = 0) -> dict:
        """Write a KV entry."""
        try:
            full_key = f"{self.kv_prefix}/{key}" if self.kv_prefix else key
            async with httpx.AsyncClient(verify=False, timeout=10) as client:
                resp = await client.put(
                    f"{self._base}/kv/{full_key}",
                    params=self._params(),
                    content=value,
                    headers={"Content-Type": "text/plain"},
                )
                if resp.status_code == 200:
                    return {"ok": True}
                return {"ok": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def delete_key(self, key: str) -> dict:
        """Delete a KV entry."""
        try:
            full_key = f"{self.kv_prefix}/{key}" if self.kv_prefix else key
            async with httpx.AsyncClient(verify=False, timeout=10) as client:
                resp = await client.delete(
                    f"{self._base}/kv/{full_key}",
                    params=self._params(),
                )
                if resp.status_code == 200:
                    return {"ok": True}
                return {"ok": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}
