from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AuditLogCreate(BaseModel):
    cluster_id: str
    resource_type: str  # "configmap", "secret", "nacos_config"
    resource_name: str
    namespace: Optional[str] = None
    action: str  # "create", "update", "delete"
    status: str  # "success", "failed"
    error_message: Optional[str] = None
    dry_run: bool = False


class AuditLogResponse(BaseModel):
    id: str
    user_id: str
    cluster_id: str
    resource_type: str
    resource_name: str
    namespace: Optional[str]
    action: str
    status: str
    error_message: Optional[str]
    dry_run: bool
    created_at: str
