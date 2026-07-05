"""
HashiCorp Vault client for secrets management.
"""
import httpx
from typing import Optional


class VaultClient:
    """Client for HashiCorp Vault KV secrets engine."""

    def __init__(self, server_url: str, token: str, namespace: str = None, mount_path: str = "secret", kv_version: str = "v2"):
        self.server_url = server_url.rstrip("/")
        self.token = token
        self.namespace = namespace
        self.mount_path = mount_path
        self.kv_version = kv_version
        self._base = f"{self.server_url}/v1"

    def _headers(self) -> dict:
        headers = {"X-Vault-Token": self.token}
        if self.namespace:
            headers["X-Vault-Namespace"] = self.namespace
        return headers

    def _kv_path(self, path: str) -> str:
        if self.kv_version == "v2":
            return f"{self._base}/{self.mount_path}/data/{path}"
        return f"{self._base}/{self.mount_path}/{path}"

    async def test_connection(self) -> dict:
        """Verify Vault is reachable and token is valid."""
        try:
            async with httpx.AsyncClient(verify=False, timeout=10) as client:
                resp = await client.get(f"{self._base}/sys/health", headers=self._headers())
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "ok": True,
                        "version": data.get("version", "unknown"),
                        "cluster_name": data.get("cluster_name", "unknown"),
                        "sealed": data.get("sealed", False),
                    }
                # Some Vault setups return 429 when standby
                if resp.status_code in (429, 472, 473):
                    return {"ok": True, "version": "standby", "sealed": False}
                return {"ok": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
        except httpx.ConnectError:
            return {"ok": False, "error": f"Cannot connect to Vault at {self.server_url}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def list_secrets(self, path: str = "") -> dict:
        """List secret keys at a given path."""
        try:
            if self.kv_version == "v2":
                url = f"{self._base}/{self.mount_path}/metadata/{path}"
            else:
                url = f"{self._base}/{self.mount_path}/{path}"
            async with httpx.AsyncClient(verify=False, timeout=10) as client:
                resp = await client.get(url, headers=self._headers(), params={"list": "true"})
                if resp.status_code == 200:
                    data = resp.json()
                    keys = data.get("data", {}).get("keys", [])
                    return {"ok": True, "keys": keys}
                return {"ok": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def get_secret(self, path: str) -> dict:
        """Read a secret by path."""
        try:
            async with httpx.AsyncClient(verify=False, timeout=10) as client:
                resp = await client.get(self._kv_path(path), headers=self._headers())
                if resp.status_code == 200:
                    data = resp.json().get("data", {})
                    if self.kv_version == "v2":
                        data = data.get("data", {})
                    return {"ok": True, "data": data}
                return {"ok": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def put_secret(self, path: str, data: dict) -> dict:
        """Write a secret at a given path."""
        try:
            async with httpx.AsyncClient(verify=False, timeout=10) as client:
                body = {"data": data} if self.kv_version == "v2" else data
                resp = await client.put(self._kv_path(path), headers=self._headers(), json=body)
                if resp.status_code in (200, 204):
                    return {"ok": True}
                return {"ok": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def delete_secret(self, path: str) -> dict:
        """Delete a secret by path."""
        try:
            async with httpx.AsyncClient(verify=False, timeout=10) as client:
                if self.kv_version == "v2":
                    url = f"{self._base}/{self.mount_path}/metadata/{path}"
                else:
                    url = self._kv_path(path)
                resp = await client.delete(url, headers=self._headers())
                if resp.status_code in (200, 204):
                    return {"ok": True}
                return {"ok": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}
