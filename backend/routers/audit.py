from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from models.audit import AuditLogCreate, AuditLogResponse
from services.audit_service import audit_service

router = APIRouter()


@router.get("", response_model=list[AuditLogResponse])
async def list_audit_logs(
    user_id: str = Query(..., description="User ID"),
    cluster_id: Optional[str] = Query(None, description="Filter by cluster ID"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    limit: int = Query(100, ge=1, le=500, description="Max results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
):
    """List audit logs for a user."""
    try:
        logs = await audit_service.get_logs(
            user_id=user_id,
            cluster_id=cluster_id,
            resource_type=resource_type,
            limit=limit,
            offset=offset,
        )
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=AuditLogResponse)
async def create_audit_log(log: AuditLogCreate, user_id: str = Query(..., description="User ID")):
    """Create an audit log entry."""
    try:
        result = await audit_service.log(
            user_id=user_id,
            cluster_id=log.cluster_id,
            resource_type=log.resource_type,
            resource_name=log.resource_name,
            action=log.action,
            status=log.status,
            namespace=log.namespace,
            error_message=log.error_message,
            dry_run=log.dry_run,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
