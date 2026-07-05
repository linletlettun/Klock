from pydantic import BaseModel, Field
from typing import Optional


class SettingsUpdate(BaseModel):
    git_provider: Optional[str] = None  # gitlab, github
    git_url: Optional[str] = None
    git_token: Optional[str] = None
    git_branch: Optional[str] = "main"
    git_manifest_path: Optional[str] = "clusters"

    argocd_server_url: Optional[str] = None
    argocd_auth_token: Optional[str] = None
    argocd_namespace: Optional[str] = "argocd"

    nacos_server_addr: Optional[str] = None
    nacos_namespace: Optional[str] = "public"
    nacos_username: Optional[str] = None
    nacos_password: Optional[str] = None

    vault_server_url: Optional[str] = None
    vault_token: Optional[str] = None
    vault_namespace: Optional[str] = None
    vault_mount_path: Optional[str] = "secret"
    vault_kv_version: Optional[str] = "v2"
    vault_enabled: Optional[bool] = False

    consul_server_url: Optional[str] = None
    consul_token: Optional[str] = None
    consul_datacenter: Optional[str] = "dc1"
    consul_kv_prefix: Optional[str] = "klock/"
    consul_enabled: Optional[bool] = False

    vercel_token: Optional[str] = None
    vercel_team_id: Optional[str] = None

    namespace_blacklist: Optional[list[str]] = Field(
        default=[
            "kube-system",
            "kube-public",
            "kube-node-lease",
            "argocd",
            "cert-manager",
            "ingress-nginx",
        ]
    )


class SettingsResponse(BaseModel):
    git_provider: str = "gitlab"
    git_url: str = ""
    git_token_masked: str = ""
    git_branch: str = "main"
    git_manifest_path: str = "clusters"

    argocd_server_url: str = ""
    argocd_auth_token_masked: str = ""
    argocd_namespace: str = "argocd"

    nacos_server_addr: str = ""
    nacos_namespace: str = "public"
    nacos_username: str = ""
    nacos_password_masked: str = ""

    vault_server_url: str = ""
    vault_token_masked: str = ""
    vault_namespace: str = ""
    vault_mount_path: str = "secret"
    vault_kv_version: str = "v2"
    vault_enabled: bool = False

    consul_server_url: str = ""
    consul_token_masked: str = ""
    consul_datacenter: str = "dc1"
    consul_kv_prefix: str = "klock/"
    consul_enabled: bool = False

    vercel_token_masked: str = ""
    vercel_team_id: str = ""

    namespace_blacklist: list[str] = [
        "kube-system",
        "kube-public",
        "kube-node-lease",
        "argocd",
        "cert-manager",
        "ingress-nginx",
    ]
