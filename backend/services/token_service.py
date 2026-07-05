"""
JWT Token management service.
Generates, validates, revokes, and rotates API tokens for applications.
"""
import uuid
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

try:
    import jwt as pyjwt
except ImportError:
    pyjwt = None


class TokenService:
    """In-memory token store with JWT generation."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._tokens = {}
            cls._instance._secrets = {}  # app_id -> signing key
        return cls._instance

    def _get_signing_key(self, app_id: str) -> str:
        """Get or create a signing key for an app."""
        if app_id not in self._secrets:
            self._secrets[app_id] = secrets.token_hex(32)
        return self._secrets[app_id]

    def generate_token(
        self,
        app_id: str,
        app_name: str,
        expires_in_hours: int = 24,
        claims: Optional[dict] = None,
        description: str = "",
    ) -> dict:
        """Generate a new JWT token for an application."""
        token_id = str(uuid.uuid4())[:8]
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=expires_in_hours)
        signing_key = self._get_signing_key(app_id)

        payload = {
            "jti": token_id,
            "sub": app_id,
            "name": app_name,
            "iat": int(now.timestamp()),
            "exp": int(expires_at.timestamp()),
            "iss": "klock-portal",
        }
        if claims:
            payload["claims"] = claims

        if pyjwt:
            token = pyjwt.encode(payload, signing_key, algorithm="HS256")
        else:
            # Fallback: base64-like token when PyJWT is not installed
            import base64
            token = base64.urlsafe_b64encode(
                f"{token_id}:{app_id}:{int(expires_at.timestamp())}".encode()
            ).decode()

        token_record = {
            "id": token_id,
            "app_id": app_id,
            "app_name": app_name,
            "token_preview": token[:16] + "...",
            "token_hash": hashlib.sha256(token.encode()).hexdigest(),
            "expires_at": expires_at.isoformat(),
            "created_at": now.isoformat(),
            "description": description,
            "claims": claims or {},
            "revoked": False,
            "last_used": None,
            "use_count": 0,
        }
        self._tokens[token_id] = token_record

        return {
            "id": token_id,
            "token": token,
            "expires_at": expires_at.isoformat(),
            "app_id": app_id,
            "app_name": app_name,
        }

    def list_tokens(self, app_id: Optional[str] = None) -> list[dict]:
        """List all tokens, optionally filtered by app_id."""
        tokens = list(self._tokens.values())
        if app_id:
            tokens = [t for t in tokens if t["app_id"] == app_id]
        # Don't expose the full token or hash in listing
        return [
            {k: v for k, v in t.items() if k not in ("token_hash",)}
            for t in tokens
        ]

    def get_token(self, token_id: str) -> Optional[dict]:
        """Get a single token by ID."""
        return self._tokens.get(token_id)

    def revoke_token(self, token_id: str) -> dict:
        """Revoke a token."""
        token = self._tokens.get(token_id)
        if not token:
            return {"ok": False, "error": "Token not found"}
        token["revoked"] = True
        token["revoked_at"] = datetime.now(timezone.utc).isoformat()
        return {"ok": True, "message": f"Token {token_id} revoked"}

    def rotate_token(self, token_id: str, expires_in_hours: int = 24) -> dict:
        """Rotate a token — revoke old, generate new."""
        old_token = self._tokens.get(token_id)
        if not old_token:
            return {"ok": False, "error": "Token not found"}

        # Revoke old
        old_token["revoked"] = True
        old_token["revoked_at"] = datetime.now(timezone.utc).isoformat()

        # Generate new
        new = self.generate_token(
            app_id=old_token["app_id"],
            app_name=old_token["app_name"],
            expires_in_hours=expires_in_hours,
            claims=old_token.get("claims"),
            description=old_token.get("description", ""),
        )
        return {"ok": True, "old_id": token_id, "new_token": new}

    def validate_token(self, token: str, secret: str = None) -> dict:
        """Validate a JWT token. Returns payload or error.

        If secret is provided, use it directly (like jwt.io).
        Otherwise, try each app's stored signing key.
        """
        if pyjwt:
            try:
                # If a secret is provided, use it directly (jwt.io-style validation)
                if secret:
                    try:
                        payload = pyjwt.decode(token, secret, algorithms=["HS256"])
                        return {"ok": True, "payload": payload}
                    except pyjwt.ExpiredSignatureError:
                        # Try to decode without verification to show expired payload
                        payload = pyjwt.decode(token, options={"verify_exp": False})
                        return {"ok": False, "error": "Token expired", "payload": payload}
                    except pyjwt.InvalidSignatureError:
                        return {"ok": False, "error": "Invalid signature — secret does not match"}
                    except Exception as e:
                        return {"ok": False, "error": str(e)}

                # Otherwise, try each app's stored signing key
                for app_id, key in self._secrets.items():
                    try:
                        payload = pyjwt.decode(token, key, algorithms=["HS256"], issuer="klock-portal")
                        token_id = payload.get("jti")
                        record = self._tokens.get(token_id)
                        if record and not record["revoked"]:
                            record["last_used"] = datetime.now(timezone.utc).isoformat()
                            record["use_count"] += 1
                            return {"ok": True, "payload": payload}
                        return {"ok": False, "error": "Token revoked or not found"}
                    except pyjwt.InvalidSignatureError:
                        continue
                return {"ok": False, "error": "Invalid token"}
            except pyjwt.ExpiredSignatureError:
                # Decode without verification to show what the token contained
                try:
                    payload = pyjwt.decode(token, options={"verify_exp": False})
                    return {"ok": False, "error": "Token expired", "payload": payload}
                except Exception:
                    return {"ok": False, "error": "Token expired"}
            except Exception as e:
                return {"ok": False, "error": str(e)}
        return {"ok": False, "error": "PyJWT not installed"}

    def delete_token(self, token_id: str) -> dict:
        """Permanently delete a token."""
        if token_id in self._tokens:
            del self._tokens[token_id]
            return {"ok": True}
        return {"ok": False, "error": "Token not found"}

    def get_app_stats(self) -> list[dict]:
        """Get token stats per application."""
        apps = {}
        for token in self._tokens.values():
            app_id = token["app_id"]
            if app_id not in apps:
                apps[app_id] = {
                    "app_id": app_id,
                    "app_name": token["app_name"],
                    "total_tokens": 0,
                    "active_tokens": 0,
                    "revoked_tokens": 0,
                }
            apps[app_id]["total_tokens"] += 1
            if token["revoked"]:
                apps[app_id]["revoked_tokens"] += 1
            else:
                apps[app_id]["active_tokens"] += 1
        return list(apps.values())


# Singleton
token_service = TokenService()
