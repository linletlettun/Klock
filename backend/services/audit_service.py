from typing import Optional
from datetime import datetime
import json

from config import settings


class AuditService:
    """
    Audit logging service using Supabase.

    In production, this writes to the audit_logs table in Supabase.
    For development, it logs to console.
    """

    def __init__(self):
        self._supabase = None

    def _get_supabase(self):
        """Get or create Supabase client."""
        if self._supabase is None:
            from supabase import create_client

            self._supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        return self._supabase

    async def log(
        self,
        user_id: str,
        cluster_id: str,
        resource_type: str,
        resource_name: str,
        action: str,
        status: str,
        namespace: Optional[str] = None,
        error_message: Optional[str] = None,
        dry_run: bool = False,
    ) -> dict:
        """
        Log an audit event.

        Args:
            user_id: The user performing the action
            cluster_id: Target cluster ID
            resource_type: Type of resource (configmap, secret, nacos_config)
            resource_name: Name of the resource
            action: Action performed (create, update, delete)
            status: Result status (success, failed)
            namespace: Target namespace (optional)
            error_message: Error details if failed (optional)
            dry_run: Whether this was a dry run

        Returns:
            Created audit log entry
        """
        log_entry = {
            "user_id": user_id,
            "cluster_id": cluster_id,
            "resource_type": resource_type,
            "resource_name": resource_name,
            "namespace": namespace,
            "action": action,
            "status": status,
            "error_message": error_message,
            "dry_run": dry_run,
            "created_at": datetime.utcnow().isoformat(),
        }

        # Log to console (never log secret values)
        print(
            f"[AUDIT] {action.upper()} {resource_type}/{resource_name} "
            f"in {namespace or 'all'}: {status}"
        )

        try:
            supabase = self._get_supabase()
            result = supabase.table("audit_logs").insert(log_entry).execute()
            return result.data[0] if result.data else log_entry
        except Exception as e:
            # If Supabase fails, still log to console
            print(f"[AUDIT] Failed to write to Supabase: {e}")
            return log_entry

    async def get_logs(
        self,
        user_id: str,
        cluster_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]:
        """
        Get audit logs for a user.

        Args:
            user_id: User ID to filter by
            cluster_id: Optional cluster ID filter
            resource_type: Optional resource type filter
            limit: Maximum number of results
            offset: Offset for pagination

        Returns:
            List of audit log entries
        """
        try:
            supabase = self._get_supabase()
            query = supabase.table("audit_logs").select("*").eq("user_id", user_id)

            if cluster_id:
                query = query.eq("cluster_id", cluster_id)
            if resource_type:
                query = query.eq("resource_type", resource_type)

            result = (
                query.order("created_at", desc=True)
                .range(offset, offset + limit - 1)
                .execute()
            )
            return result.data
        except Exception as e:
            print(f"[AUDIT] Failed to fetch logs from Supabase: {e}")
            return []


# Singleton
audit_service = AuditService()
