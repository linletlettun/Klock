import sys
import os

# Ensure backend directory is in Python path (Vercel runs from project root)
_backend_dir = os.path.dirname(os.path.abspath(__file__))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from config import settings
    CORS_ORIGINS = settings.CORS_ORIGINS
except Exception as e:
    CORS_ORIGINS = ["*"]
    print(f"[WARN] config load failed: {e}")

app = FastAPI(
    title="Klock Configuration Management API",
    description="Centralized Configuration Management for Kubernetes, Nacos, and ArgoCD",
    version="2.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with error handling
def _include(prefix, module, tags, attr="router"):
    try:
        mod = __import__(f"routers.{module}", fromlist=[attr])
        app.include_router(getattr(mod, attr), prefix=prefix, tags=tags)
    except Exception as e:
        print(f"[WARN] Failed to load router {module}: {e}")

_include("/api/cluster", "clusters", ["cluster-management"])
_include("/api/settings", "settings", ["settings"])
_include("/api/clusters", "namespaces", ["namespaces"])
_include("/api/clusters", "configmaps", ["configmaps"])
_include("/api/clusters", "secrets", ["secrets"])
_include("/api/nacos", "nacos", ["nacos"])
_include("/api/gitops", "gitops", ["gitops"])
_include("/api/argocd", "argocd", ["argocd"])
_include("/api/monitor", "monitor", ["monitoring"])
_include("/api/alert", "alert", ["alerts"])
_include("/api/config", "config_mgmt", ["config-management"])
_include("/api/tokens", "tokens", ["token-management"])
_include("/api/deploy", "deploy", ["deployment"])
_include("/api/audit", "audit", ["audit"])


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/debug")
async def debug_info():
    return {
        "python": sys.version,
        "cwd": os.getcwd(),
        "backend_dir": _backend_dir,
        "sys_path": sys.path[:5],
        "env_supabase_url": bool(os.environ.get("SUPABASE_URL")),
        "env_supabase_key": bool(os.environ.get("SUPABASE_KEY")),
    }
# Tue Jul  7 16:28:34 +0630 2026
