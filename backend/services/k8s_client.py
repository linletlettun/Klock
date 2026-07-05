import base64
import json
from typing import Optional
from kubernetes import client, config
from kubernetes.client.rest import ApiException

from config import settings


class K8sClient:
    """Kubernetes client wrapper for cluster operations."""

    def __init__(self, api_server: str, token: str, ca_cert: Optional[str] = None):
        self.api_server = api_server
        self.token = token
        self.ca_cert = ca_cert
        self._api_client = None
        self._core_v1 = None
        self._apps_v1 = None

    def _get_api_client(self) -> client.ApiClient:
        """Get or create the Kubernetes API client."""
        if self._api_client is None:
            configuration = client.Configuration()
            configuration.host = self.api_server
            configuration.api_key = {"authorization": f"Bearer {self.token}"}
            configuration.verify_ssl = True

            if self.ca_cert:
                # Decode base64 CA cert and write to temp file
                import tempfile
                import os

                ca_cert_decoded = base64.b64decode(self.ca_cert).decode("utf-8")
                ca_cert_path = tempfile.mktemp(suffix=".pem")
                with open(ca_cert_path, "w") as f:
                    f.write(ca_cert_decoded)
                configuration.ssl_ca_cert = ca_cert_path

            self._api_client = client.ApiClient(configuration)
        return self._api_client

    def _get_core_v1(self) -> client.CoreV1Api:
        """Get CoreV1Api instance."""
        if self._core_v1 is None:
            self._core_v1 = client.CoreV1Api(self._get_api_client())
        return self._core_v1

    def _get_apps_v1(self) -> client.AppsV1Api:
        """Get AppsV1Api instance."""
        if self._apps_v1 is None:
            self._apps_v1 = client.AppsV1Api(self._get_api_client())
        return self._apps_v1

    async def get_namespaces(self, include_system: bool = False) -> list[dict]:
        """Get all namespaces, optionally including system namespaces."""
        try:
            core_v1 = self._get_core_v1()
            namespaces = core_v1.list_namespace()
            result = []
            for ns in namespaces.items:
                name = ns.metadata.name
                if not include_system and name in settings.K8S_SYSTEM_NAMESPACES:
                    continue
                result.append(
                    {
                        "name": name,
                        "status": ns.status.phase,
                        "labels": ns.metadata.labels or {},
                    }
                )
            return result
        except ApiException as e:
            raise Exception(f"Failed to fetch namespaces: {e.reason}")

    async def get_configmaps(
        self, namespace: Optional[str] = None
    ) -> list[dict]:
        """Get ConfigMaps from one or all namespaces."""
        try:
            core_v1 = self._get_core_v1()
            if namespace:
                configmaps = core_v1.list_namespaced_config_map(namespace)
            else:
                configmaps = core_v1.list_config_map_for_all_namespaces()

            result = []
            for cm in configmaps.items:
                result.append(
                    {
                        "name": cm.metadata.name,
                        "namespace": cm.metadata.namespace,
                        "data": cm.data or {},
                        "labels": cm.metadata.labels or {},
                    }
                )
            return result
        except ApiException as e:
            raise Exception(f"Failed to fetch configmaps: {e.reason}")

    async def get_configmap(self, namespace: str, name: str) -> Optional[dict]:
        """Get a specific ConfigMap."""
        try:
            core_v1 = self._get_core_v1()
            cm = core_v1.read_namespaced_config_map(name, namespace)
            return {
                "name": cm.metadata.name,
                "namespace": cm.metadata.namespace,
                "data": cm.data or {},
                "labels": cm.metadata.labels or {},
            }
        except ApiException as e:
            if e.status == 404:
                return None
            raise Exception(f"Failed to fetch configmap: {e.reason}")

    async def create_configmap(
        self, namespace: str, name: str, data: dict, labels: Optional[dict] = None
    ) -> dict:
        """Create a ConfigMap."""
        try:
            core_v1 = self._get_core_v1()
            body = client.V1ConfigMap(
                api_version="v1",
                kind="ConfigMap",
                metadata=client.V1ObjectMeta(name=name, labels=labels or {}),
                data=data,
            )
            cm = core_v1.create_namespaced_config_map(namespace, body)
            return {
                "name": cm.metadata.name,
                "namespace": cm.metadata.namespace,
                "data": cm.data or {},
            }
        except ApiException as e:
            raise Exception(f"Failed to create configmap: {e.reason}")

    async def patch_configmap(
        self, namespace: str, name: str, data: dict, labels: Optional[dict] = None
    ) -> dict:
        """Update a ConfigMap (patch)."""
        try:
            core_v1 = self._get_core_v1()
            body = {"data": data}
            if labels:
                body["metadata"] = {"labels": labels}
            cm = core_v1.patch_namespaced_config_map(name, namespace, body)
            return {
                "name": cm.metadata.name,
                "namespace": cm.metadata.namespace,
                "data": cm.data or {},
            }
        except ApiException as e:
            raise Exception(f"Failed to patch configmap: {e.reason}")

    async def delete_configmap(self, namespace: str, name: str) -> bool:
        """Delete a ConfigMap."""
        try:
            core_v1 = self._get_core_v1()
            core_v1.delete_namespaced_config_map(name, namespace)
            return True
        except ApiException as e:
            raise Exception(f"Failed to delete configmap: {e.reason}")

    async def get_secrets(
        self, namespace: Optional[str] = None
    ) -> list[dict]:
        """Get Secrets from one or all namespaces."""
        try:
            core_v1 = self._get_core_v1()
            if namespace:
                secrets = core_v1.list_namespaced_secret(namespace)
            else:
                secrets = core_v1.list_secret_for_all_namespaces()

            result = []
            for secret in secrets.items:
                result.append(
                    {
                        "name": secret.metadata.name,
                        "namespace": secret.metadata.namespace,
                        "type": secret.type,
                        "data_keys": list((secret.data or {}).keys()),
                        "labels": secret.metadata.labels or {},
                    }
                )
            return result
        except ApiException as e:
            raise Exception(f"Failed to fetch secrets: {e.reason}")

    async def get_secret(self, namespace: str, name: str) -> Optional[dict]:
        """Get a specific Secret (decoded)."""
        try:
            core_v1 = self._get_core_v1()
            secret = core_v1.read_namespaced_secret(name, namespace)
            decoded_data = {}
            if secret.data:
                for key, value in secret.data.items():
                    decoded_data[key] = base64.b64decode(value).decode("utf-8")
            return {
                "name": secret.metadata.name,
                "namespace": secret.metadata.namespace,
                "type": secret.type,
                "data": decoded_data,
                "labels": secret.metadata.labels or {},
            }
        except ApiException as e:
            if e.status == 404:
                return None
            raise Exception(f"Failed to fetch secret: {e.reason}")

    async def create_secret(
        self,
        namespace: str,
        name: str,
        data: dict,
        secret_type: str = "Opaque",
        labels: Optional[dict] = None,
    ) -> dict:
        """Create a Secret."""
        try:
            core_v1 = self._get_core_v1()
            # Encode data to base64
            encoded_data = {}
            for key, value in data.items():
                encoded_data[key] = base64.b64encode(value.encode("utf-8")).decode("utf-8")

            body = client.V1Secret(
                api_version="v1",
                kind="Secret",
                metadata=client.V1ObjectMeta(name=name, labels=labels or {}),
                type=secret_type,
                data=encoded_data,
            )
            secret = core_v1.create_namespaced_secret(namespace, body)
            return {
                "name": secret.metadata.name,
                "namespace": secret.metadata.namespace,
                "type": secret.type,
                "data_keys": list((secret.data or {}).keys()),
            }
        except ApiException as e:
            raise Exception(f"Failed to create secret: {e.reason}")

    async def patch_secret(
        self,
        namespace: str,
        name: str,
        data: dict,
        secret_type: Optional[str] = None,
        labels: Optional[dict] = None,
    ) -> dict:
        """Update a Secret (patch)."""
        try:
            core_v1 = self._get_core_v1()
            # Encode data to base64
            encoded_data = {}
            for key, value in data.items():
                encoded_data[key] = base64.b64encode(value.encode("utf-8")).decode("utf-8")

            body = {"data": encoded_data}
            if labels:
                body["metadata"] = {"labels": labels}
            if secret_type:
                body["type"] = secret_type

            secret = core_v1.patch_namespaced_secret(name, namespace, body)
            return {
                "name": secret.metadata.name,
                "namespace": secret.metadata.namespace,
                "type": secret.type,
                "data_keys": list((secret.data or {}).keys()),
            }
        except ApiException as e:
            raise Exception(f"Failed to patch secret: {e.reason}")

    async def delete_secret(self, namespace: str, name: str) -> bool:
        """Delete a Secret."""
        try:
            core_v1 = self._get_core_v1()
            core_v1.delete_namespaced_secret(name, namespace)
            return True
        except ApiException as e:
            raise Exception(f"Failed to delete secret: {e.reason}")


# Singleton cache for K8s clients
_clients: dict[str, K8sClient] = {}


def get_k8s_client(api_server: str, token: str, ca_cert: Optional[str] = None) -> K8sClient:
    """Get or create a K8s client for the given cluster."""
    cache_key = f"{api_server}:{token[:10]}"
    if cache_key not in _clients:
        _clients[cache_key] = K8sClient(api_server, token, ca_cert)
    return _clients[cache_key]
