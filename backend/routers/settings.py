"""
Settings management endpoints.
"""
from fastapi import APIRouter
from models.settings import SettingsUpdate, SettingsResponse
from services.store import store

router = APIRouter()


@router.get("", response_model=SettingsResponse)
async def get_settings():
    """Get all settings (sensitive values are masked)."""
    return store.get_settings_safe()


@router.put("", response_model=SettingsResponse)
async def update_settings(updates: SettingsUpdate):
    """Update settings. Only non-None fields are updated."""
    data = updates.model_dump(exclude_unset=True)
    return store.update_settings(data)
