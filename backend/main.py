import sys
import os

# Ensure backend directory is in Python path (Vercel runs from project root)
_backend_dir = os.path.dirname(os.path.abspath(__file__))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import namespaces, configmaps, secrets, nacos, audit, config_mgmt, tokens, deploy
from routers import clusters, settings as settings_router, argocd, gitops, monitor, alert

app = FastAPI(
    title="Klock Configuration Management API",
    description="Centralized Configuration Management for Kubernetes, Nacos, and ArgoCD",
    version="2.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers - cluster management
app.include_router(clusters.router, prefix="/api/cluster", tags=["cluster-management"])
app.include_router(settings_router.router, prefix="/api/settings", tags=["settings"])

# Include routers - K8s resources
app.include_router(namespaces.router, prefix="/api/clusters", tags=["namespaces"])
app.include_router(configmaps.router, prefix="/api/clusters", tags=["configmaps"])
app.include_router(secrets.router, prefix="/api/clusters", tags=["secrets"])

# Include routers - Nacos
app.include_router(nacos.router, prefix="/api/nacos", tags=["nacos"])

# Include routers - GitOps & ArgoCD
app.include_router(gitops.router, prefix="/api/gitops", tags=["gitops"])
app.include_router(argocd.router, prefix="/api/argocd", tags=["argocd"])

# Include routers - Monitoring & Alerts
app.include_router(monitor.router, prefix="/api/monitor", tags=["monitoring"])
app.include_router(alert.router, prefix="/api/alert", tags=["alerts"])

# Include routers - Configuration Management (Vault, Consul)
app.include_router(config_mgmt.router, prefix="/api/config", tags=["config-management"])

# Include routers - Token Management
app.include_router(tokens.router, prefix="/api/tokens", tags=["token-management"])

# Include routers - Deployment
app.include_router(deploy.router, prefix="/api/deploy", tags=["deployment"])

# Include routers - Audit
app.include_router(audit.router, prefix="/api/audit", tags=["audit"])


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
