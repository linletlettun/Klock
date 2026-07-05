"""
JWT Token management endpoints.
Generate, list, revoke, rotate, and validate API tokens for applications.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.token_service import token_service

router = APIRouter()


class TokenGenerateRequest(BaseModel):
    app_id: str
    app_name: str
    expires_in_hours: int = 24
    description: str = ""
    claims: Optional[dict] = None


class TokenValidateRequest(BaseModel):
    token: str
    secret: str = ""  # Optional signing key for manual validation


class TokenRotateRequest(BaseModel):
    expires_in_hours: int = 24


@router.post("/generate")
async def generate_token(req: TokenGenerateRequest):
    """Generate a new JWT API token for an application."""
    if not req.app_id or not req.app_name:
        raise HTTPException(status_code=400, detail="app_id and app_name are required")
    if req.expires_in_hours < 1 or req.expires_in_hours > 8760:
        raise HTTPException(status_code=400, detail="expires_in_hours must be between 1 and 8760 (1 year)")
    return token_service.generate_token(
        app_id=req.app_id,
        app_name=req.app_name,
        expires_in_hours=req.expires_in_hours,
        claims=req.claims,
        description=req.description,
    )


@router.get("/list")
async def list_tokens(app_id: Optional[str] = None):
    """List all tokens, optionally filtered by app_id."""
    return token_service.list_tokens(app_id=app_id)


@router.get("/stats")
async def get_token_stats():
    """Get token statistics per application."""
    return token_service.get_app_stats()


@router.get("/{token_id}")
async def get_token(token_id: str):
    """Get a single token by ID."""
    token = token_service.get_token(token_id)
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    return token


@router.post("/{token_id}/revoke")
async def revoke_token(token_id: str):
    """Revoke a token (makes it unusable)."""
    result = token_service.revoke_token(token_id)
    if not result["ok"]:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/{token_id}/rotate")
async def rotate_token(token_id: str, req: TokenRotateRequest = TokenRotateRequest()):
    """Rotate a token — revoke old and generate new."""
    result = token_service.rotate_token(token_id, expires_in_hours=req.expires_in_hours)
    if not result["ok"]:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.delete("/{token_id}")
async def delete_token(token_id: str):
    """Permanently delete a token."""
    result = token_service.delete_token(token_id)
    if not result["ok"]:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/validate")
async def validate_token(req: TokenValidateRequest):
    """Validate a JWT token and return its payload."""
    result = token_service.validate_token(req.token, req.secret or None)
    if not result["ok"]:
        raise HTTPException(status_code=401, detail=result["error"])
    return result
