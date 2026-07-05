from pydantic import BaseModel, Field
from typing import Optional


class AlertConfig(BaseModel):
    enabled: bool = True
    warning_days: int = Field(default=7, ge=1, le=90, description="Days before expiry to trigger alert")
    critical_days: int = Field(default=3, ge=1, le=30, description="Days before expiry for critical alert")

    # Email settings
    email_enabled: bool = False
    email_recipients: list[str] = []
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    # Webhook settings (Slack, Teams, Discord)
    webhook_enabled: bool = False
    webhook_urls: list[str] = []
    webhook_type: str = "slack"  # slack, teams, discord, custom


class AlertConfigResponse(BaseModel):
    enabled: bool
    warning_days: int
    critical_days: int
    email_enabled: bool
    email_recipients: list[str]
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_from: str
    smtp_password_masked: str = ""
    webhook_enabled: bool
    webhook_urls: list[str]
    webhook_type: str


class AlertRecord(BaseModel):
    id: str
    resource_type: str  # tls, token, kafka
    resource_name: str
    cluster_id: Optional[str] = None
    namespace: Optional[str] = None
    severity: str  # warning, critical, expired
    message: str
    days_remaining: int
    expires_at: Optional[str] = None
    notified: bool = False
    notified_at: Optional[str] = None
    created_at: str


class AlertTestRequest(BaseModel):
    channel: str  # email, webhook
    recipient: Optional[str] = None  # email address or webhook URL
