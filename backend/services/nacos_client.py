from typing import Optional
from pydantic import BaseModel

from config import settings


class NacosConfig(BaseModel):
    data_id: str
    group: str = "DEFAULT_GROUP"
    content: str
    config_type: str = "text"  # text, json, yaml, xml, properties


class NacosConfigResult(BaseModel):
    data_id: str
    group: str
    namespace: str
    status: str
    action: str
    error: Optional[str] = None


class NacosClient:
    """
    Nacos client for configuration management.

    Supports both real Nacos server and mock mode for development.
    """

    def __init__(
        self,
        server_addr: str,
        namespace: str = "public",
        username: Optional[str] = None,
        password: Optional[str] = None,
    ):
        self.server_addr = server_addr
        self.namespace = namespace
        self.username = username
        self.password = password
        self._client = None

    def _get_client(self):
        """Get or create the Nacos client."""
        if self._client is None:
            if settings.NACOS_MOCK:
                # Use mock client for development
                self._client = self._create_mock_client()
            else:
                # Use real Nacos SDK
                try:
                    from nacos import NacosClient as NacosSDKClient

                    self._client = NacosSDKClient(
                        server_addresses=self.server_addr,
                        namespace=self.namespace,
                        username=self.username,
                        password=self.password,
                    )
                except ImportError:
                    print("[NACOS] nacos-sdk-python not installed, using mock client")
                    self._client = self._create_mock_client()
        return self._client

    def _create_mock_client(self):
        """Create a mock client for development."""
        return MockNacosClient(
            self.server_addr, self.namespace, self.username, self.password
        )

    async def get_config(self, data_id: str, group: str = "DEFAULT_GROUP") -> Optional[dict]:
        """Get a configuration from Nacos."""
        try:
            client = self._get_client()
            if isinstance(client, MockNacosClient):
                return await client.get_config(data_id, group)

            # Real Nacos SDK
            content = client.get_config(data_id, group)
            if content:
                return {
                    "data_id": data_id,
                    "group": group,
                    "content": content,
                    "config_type": "text",
                }
            return None
        except Exception as e:
            print(f"[NACOS] Error getting config: {e}")
            return None

    async def publish_config(
        self, data_id: str, group: str, content: str, config_type: str = "text"
    ) -> bool:
        """Publish a configuration to Nacos."""
        try:
            client = self._get_client()
            if isinstance(client, MockNacosClient):
                return await client.publish_config(data_id, group, content, config_type)

            # Real Nacos SDK
            result = client.publish_config(data_id, group, content, config_type=config_type)
            return result
        except Exception as e:
            print(f"[NACOS] Error publishing config: {e}")
            return False

    async def delete_config(self, data_id: str, group: str = "DEFAULT_GROUP") -> bool:
        """Delete a configuration from Nacos."""
        try:
            client = self._get_client()
            if isinstance(client, MockNacosClient):
                return await client.delete_config(data_id, group)

            # Real Nacos SDK
            result = client.delete_config(data_id, group)
            return result
        except Exception as e:
            print(f"[NACOS] Error deleting config: {e}")
            return False

    async def list_configs(self, group: Optional[str] = None) -> list[dict]:
        """List all configurations, optionally filtered by group."""
        try:
            client = self._get_client()
            if isinstance(client, MockNacosClient):
                return await client.list_configs(group)

            # Real Nacos SDK - list configs
            # Note: Nacos SDK may not have a direct list API
            # This is a placeholder for the actual implementation
            return []
        except Exception as e:
            print(f"[NACOS] Error listing configs: {e}")
            return []


class MockNacosClient:
    """
    Mock Nacos client for development.

    In production, replace with actual nacos-sdk-python client.
    """

    def __init__(self, server_addr: str, namespace: str, username: Optional[str] = None, password: Optional[str] = None):
        self.server_addr = server_addr
        self.namespace = namespace
        self.username = username
        self.password = password
        # In-memory mock storage
        self._configs: dict[str, dict] = {}

    async def get_config(self, data_id: str, group: str = "DEFAULT_GROUP") -> Optional[dict]:
        """Get a configuration from Nacos."""
        key = f"{self.namespace}:{group}:{data_id}"
        return self._configs.get(key)

    async def publish_config(
        self, data_id: str, group: str, content: str, config_type: str = "text"
    ) -> bool:
        """Publish a configuration to Nacos."""
        key = f"{self.namespace}:{group}:{data_id}"
        self._configs[key] = {
            "data_id": data_id,
            "group": group,
            "content": content,
            "config_type": config_type,
        }
        return True

    async def delete_config(self, data_id: str, group: str = "DEFAULT_GROUP") -> bool:
        """Delete a configuration from Nacos."""
        key = f"{self.namespace}:{group}:{data_id}"
        if key in self._configs:
            del self._configs[key]
            return True
        return False

    async def list_configs(self, group: Optional[str] = None) -> list[dict]:
        """List all configurations, optionally filtered by group."""
        results = []
        for key, config in self._configs.items():
            if group is None or config["group"] == group:
                results.append(config)
        return results


# Singleton client
_nacos_client: Optional[NacosClient] = None


def get_nacos_client() -> NacosClient:
    """Get or create the Nacos client."""
    global _nacos_client
    if _nacos_client is None:
        _nacos_client = NacosClient(
            server_addr=settings.NACOS_SERVER_ADDR or "http://localhost:8848",
            namespace=settings.NACOS_NAMESPACE or "public",
            username=settings.NACOS_USERNAME,
            password=settings.NACOS_PASSWORD,
        )
    return _nacos_client
