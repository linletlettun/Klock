from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from models.nacos import NacosConfigCreate, NacosConfigBulkDeploy, NacosConfigResponse
from services.nacos_client import get_nacos_client
from services.store import store

router = APIRouter()


@router.post("/test")
async def test_nacos_connection():
    """Test connectivity to Nacos server."""
    settings = store.get_settings()
    nacos_addr = settings.get("nacos_server_addr", "")
    if not nacos_addr:
        return {"ok": False, "error": "Nacos server address not configured"}
    try:
        import httpx
        async with httpx.AsyncClient(verify=False, timeout=10) as client:
            # Nacos console endpoint
            resp = await client.get(f"{nacos_addr.rstrip('/')}/nacos/v1/ns/service/list?pageNo=1&pageSize=1")
            if resp.status_code == 200:
                return {"ok": True, "server": nacos_addr}
            # Fallback: try the console
            resp = await client.get(f"{nacos_addr.rstrip('/')}/nacos/")
            if resp.status_code == 200:
                return {"ok": True, "server": nacos_addr}
            return {"ok": False, "error": f"HTTP {resp.status_code}"}
    except httpx.ConnectError:
        return {"ok": False, "error": f"Cannot connect to Nacos at {nacos_addr}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.get("/configs")
async def list_nacos_configs(
    group: Optional[str] = Query(None, description="Filter by group"),
):
    """List all Nacos configurations."""
    try:
        client = get_nacos_client()
        configs = await client.list_configs(group=group)
        return configs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/configs/{data_id}")
async def get_nacos_config(
    data_id: str,
    group: str = Query("DEFAULT_GROUP", description="Config group"),
):
    """Get a specific Nacos configuration."""
    try:
        client = get_nacos_client()
        config = await client.get_config(data_id, group)
        if config is None:
            raise HTTPException(status_code=404, detail="Config not found")
        return config
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/configs")
async def publish_nacos_config(
    config: NacosConfigCreate,
    dry_run: bool = Query(False, description="Simulate without applying"),
):
    """
    Publish a Nacos configuration.

    - **dry_run**: If true, simulates the operation without applying changes
    """
    try:
        client = get_nacos_client()

        if dry_run:
            existing = await client.get_config(config.data_id, config.group)
            return {
                "dry_run": True,
                "data_id": config.data_id,
                "group": config.group,
                "action": "update" if existing else "create",
                "current_content": existing["content"] if existing else None,
                "new_content": config.content,
            }

        existing = await client.get_config(config.data_id, config.group)
        await client.publish_config(
            config.data_id, config.group, config.content, config.config_type
        )
        return {
            "action": "updated" if existing else "created",
            "data_id": config.data_id,
            "group": config.group,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/configs/bulk")
async def bulk_publish_nacos_config(
    config: NacosConfigBulkDeploy,
    dry_run: bool = Query(False, description="Simulate without applying"),
):
    """
    Publish a Nacos configuration to multiple namespaces.

    - **dry_run**: If true, simulates the operation without applying changes
    """
    try:
        client = get_nacos_client()
        results = []

        for ns in config.namespaces:
            try:
                # In mock mode, we simulate namespace-specific configs
                existing = await client.get_config(config.data_id, config.group)

                if dry_run:
                    results.append(
                        {
                            "namespace": ns,
                            "status": "simulated",
                            "action": "update" if existing else "create",
                        }
                    )
                    continue

                await client.publish_config(
                    config.data_id, config.group, config.content, config.config_type
                )
                results.append(
                    {
                        "namespace": ns,
                        "status": "success",
                        "action": "updated" if existing else "created",
                    }
                )
            except Exception as e:
                results.append(
                    {
                        "namespace": ns,
                        "status": "failed",
                        "error": str(e),
                    }
                )

        return {"dry_run": dry_run, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/configs/{data_id}")
async def delete_nacos_config(
    data_id: str,
    group: str = Query("DEFAULT_GROUP", description="Config group"),
):
    """Delete a Nacos configuration."""
    try:
        client = get_nacos_client()
        deleted = await client.delete_config(data_id, group)
        if not deleted:
            raise HTTPException(status_code=404, detail="Config not found")
        return {"status": "deleted", "data_id": data_id, "group": group}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
