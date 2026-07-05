"""
Alert notification service: Email + Webhook (Slack/Teams/Discord).
"""
import uuid
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone
from typing import Optional

from services.store import store


class AlertService:
    """Handles alert notifications via email and webhooks."""

    def __init__(self):
        self._alert_history: list[dict] = []
        self._alert_config: dict = {
            "enabled": True,
            "warning_days": 7,
            "critical_days": 3,
            "email_enabled": False,
            "email_recipients": [],
            "smtp_host": "",
            "smtp_port": 587,
            "smtp_user": "",
            "smtp_password": "",
            "smtp_from": "",
            "webhook_enabled": False,
            "webhook_urls": [],
            "webhook_type": "slack",
        }

    def get_config(self) -> dict:
        config = dict(self._alert_config)
        # Mask password
        if config.get("smtp_password"):
            pwd = config["smtp_password"]
            config["smtp_password_masked"] = pwd[:2] + "••••" + pwd[-2:] if len(pwd) > 4 else "••••"
        else:
            config["smtp_password_masked"] = ""
        config.pop("smtp_password", None)
        return config

    def update_config(self, updates: dict) -> dict:
        for key, value in updates.items():
            if value is not None:
                self._alert_config[key] = value
        return self.get_config()

    async def check_and_notify(self, resources: list[dict]) -> list[dict]:
        """Check resources for expiry and send alerts if needed."""
        config = self._alert_config
        if not config.get("enabled"):
            return []

        new_alerts = []
        for resource in resources:
            days = resource.get("days_remaining", 999)
            status = resource.get("status", "")

            # Determine severity
            if status == "expired" or days < 0:
                severity = "expired"
            elif days <= config.get("critical_days", 3):
                severity = "critical"
            elif days <= config.get("warning_days", 7):
                severity = "warning"
            else:
                continue  # No alert needed

            # Check if already notified recently (within 24h)
            resource_id = resource.get("id", "")
            recent = [a for a in self._alert_history
                      if a.get("resource_id") == resource_id
                      and a.get("severity") == severity]
            if recent:
                continue  # Already notified

            alert = {
                "id": str(uuid.uuid4())[:8],
                "resource_id": resource_id,
                "resource_type": resource.get("resource_type", "unknown"),
                "resource_name": resource.get("name", ""),
                "cluster_id": resource.get("cluster_id", ""),
                "namespace": resource.get("namespace", ""),
                "severity": severity,
                "message": self._build_message(resource, severity, days),
                "days_remaining": days,
                "expires_at": resource.get("not_after") or resource.get("expires_at"),
                "notified": False,
                "notified_at": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }

            # Send notifications
            notified = False
            if config.get("email_enabled") and config.get("email_recipients"):
                try:
                    await self._send_email(alert, config)
                    notified = True
                except Exception as e:
                    print(f"[ALERT] Email failed: {e}")

            if config.get("webhook_enabled") and config.get("webhook_urls"):
                try:
                    await self._send_webhook(alert, config)
                    notified = True
                except Exception as e:
                    print(f"[ALERT] Webhook failed: {e}")

            alert["notified"] = notified
            if notified:
                alert["notified_at"] = datetime.now(timezone.utc).isoformat()

            self._alert_history.append(alert)
            new_alerts.append(alert)

        return new_alerts

    async def check_token_alerts(self, tokens: list[dict]) -> list[dict]:
        """Check JWT API tokens for expiry and send alerts via webhook/email.

        Each token dict should have: id, app_name, app_id, expires_at, token_preview
        """
        config = self._alert_config
        if not config.get("enabled"):
            return []

        now = datetime.now(timezone.utc)
        new_alerts = []

        for token in tokens:
            if token.get("revoked"):
                continue

            expires_str = token.get("expires_at")
            if not expires_str:
                continue

            try:
                expires_at = datetime.fromisoformat(expires_str.replace("Z", "+00:00"))
            except Exception:
                continue

            days_remaining = (expires_at - now).days

            # Determine severity
            if days_remaining < 0:
                severity = "expired"
            elif days_remaining <= config.get("critical_days", 3):
                severity = "critical"
            elif days_remaining <= config.get("warning_days", 7):
                severity = "warning"
            else:
                continue

            # Dedup: skip if already alerted for this token+severity
            resource_id = token.get("id", "")
            recent = [a for a in self._alert_history
                      if a.get("resource_id") == resource_id
                      and a.get("severity") == severity]
            if recent:
                continue

            alert = {
                "id": str(uuid.uuid4())[:8],
                "resource_id": resource_id,
                "resource_type": "jwt_token",
                "resource_name": f"{token.get('app_name', 'Unknown')} ({token.get('app_id', '')})",
                "cluster_id": "",
                "namespace": "",
                "severity": severity,
                "message": self._build_token_message(token, severity, days_remaining),
                "days_remaining": days_remaining,
                "expires_at": expires_str,
                "token_preview": token.get("token_preview", ""),
                "notified": False,
                "notified_at": None,
                "created_at": now.isoformat(),
            }

            # Send notifications
            notified = False
            if config.get("email_enabled") and config.get("email_recipients"):
                try:
                    await self._send_email(alert, config)
                    notified = True
                except Exception as e:
                    print(f"[ALERT] Token email failed: {e}")

            if config.get("webhook_enabled") and config.get("webhook_urls"):
                try:
                    await self._send_webhook(alert, config)
                    notified = True
                except Exception as e:
                    print(f"[ALERT] Token webhook failed: {e}")

            alert["notified"] = notified
            if notified:
                alert["notified_at"] = now.isoformat()

            self._alert_history.append(alert)
            new_alerts.append(alert)

        return new_alerts

    def _build_token_message(self, token: dict, severity: str, days: int) -> str:
        app = token.get("app_name", "Unknown App")
        app_id = token.get("app_id", "")
        preview = token.get("token_preview", "")

        if severity == "expired":
            return f"🚨 TOKEN EXPIRED: '{app}' ({app_id}) token {preview} has expired!"
        elif severity == "critical":
            return f"🔴 TOKEN CRITICAL: '{app}' ({app_id}) token {preview} expires in {days} days!"
        else:
            return f"⚠️ TOKEN WARNING: '{app}' ({app_id}) token {preview} expires in {days} days"

    def get_history(self, limit: int = 50) -> list[dict]:
        return sorted(self._alert_history, key=lambda x: x["created_at"], reverse=True)[:limit]

    def _build_message(self, resource: dict, severity: str, days: int) -> str:
        rtype = resource.get("resource_type", "Resource")
        name = resource.get("name", "Unknown")

        if severity == "expired":
            return f"🚨 EXPIRED: {rtype} '{name}' has expired!"
        elif severity == "critical":
            return f"🔴 CRITICAL: {rtype} '{name}' expires in {days} days!"
        else:
            return f"⚠️ WARNING: {rtype} '{name}' expires in {days} days"

    async def _send_email(self, alert: dict, config: dict):
        """Send email notification."""
        msg = MIMEMultipart()
        msg["From"] = config.get("smtp_from", config.get("smtp_user", ""))
        msg["To"] = ", ".join(config.get("email_recipients", []))
        msg["Subject"] = f"[Klock Alert] {alert['severity'].upper()}: {alert['resource_name']}"

        # Build HTML email
        severity_colors = {"expired": "#dc2626", "critical": "#ea580c", "warning": "#d97706"}
        color = severity_colors.get(alert["severity"], "#6b7280")

        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <div style="background: {color}; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="margin:0;">{alert['severity'].upper()} Alert</h2>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px; font-weight: bold;">Resource:</td><td style="padding: 8px;">{alert['resource_name']}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Type:</td><td style="padding: 8px;">{alert['resource_type']}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Cluster:</td><td style="padding: 8px;">{alert.get('cluster_id', 'N/A')}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Namespace:</td><td style="padding: 8px;">{alert.get('namespace', 'N/A')}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Days Remaining:</td><td style="padding: 8px; color: {color}; font-weight: bold;">{alert['days_remaining']}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Expires:</td><td style="padding: 8px;">{alert.get('expires_at', 'Unknown')}</td></tr>
            </table>
            <p style="margin-top: 20px; color: #666; font-size: 12px;">Klock Configuration Management Portal</p>
        </body>
        </html>
        """

        msg.attach(MIMEText(html, "html"))

        try:
            with smtplib.SMTP(config.get("smtp_host", ""), config.get("smtp_port", 587)) as server:
                server.starttls()
                if config.get("smtp_user") and config.get("smtp_password"):
                    server.login(config["smtp_user"], config["smtp_password"])
                server.send_message(msg)
        except Exception as e:
            raise Exception(f"SMTP error: {e}")

    async def _send_webhook(self, alert: dict, config: dict):
        """Send webhook notification (Slack/Teams/Discord)."""
        import httpx

        webhook_type = config.get("webhook_type", "slack")
        payload = self._build_webhook_payload(alert, webhook_type)

        for url in config.get("webhook_urls", []):
            if not url:
                continue
            try:
                async with httpx.AsyncClient(verify=False, timeout=10) as client:
                    await client.post(url, json=payload)
            except Exception as e:
                print(f"[ALERT] Webhook failed for {url}: {e}")

    def _build_webhook_payload(self, alert: dict, webhook_type: str) -> dict:
        severity_emoji = {"expired": "🚨", "critical": "🔴", "warning": "⚠️"}
        emoji = severity_emoji.get(alert["severity"], "ℹ️")

        if webhook_type == "slack":
            return {
                "text": f"{emoji} *{alert['severity'].upper()}*: {alert['message']}",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": (
                                f"{emoji} *{alert['severity'].upper()}*\n"
                                f"*Resource:* {alert['resource_name']}\n"
                                f"*Type:* {alert['resource_type']}\n"
                                f"*Cluster:* {alert.get('cluster_id', 'N/A')}\n"
                                f"*Namespace:* {alert.get('namespace', 'N/A')}\n"
                                f"*Days Remaining:* {alert['days_remaining']}\n"
                                f"*Expires:* {alert.get('expires_at', 'Unknown')}"
                            ),
                        },
                    }
                ],
            }
        elif webhook_type == "teams":
            return {
                "@type": "MessageCard",
                "themeColor": "dc2626" if alert["severity"] == "expired" else "ea580c" if alert["severity"] == "critical" else "d97706",
                "summary": alert["message"],
                "sections": [{
                    "activityTitle": f"{emoji} {alert['severity'].upper()}",
                    "facts": [
                        {"name": "Resource", "value": alert["resource_name"]},
                        {"name": "Type", "value": alert["resource_type"]},
                        {"name": "Days Remaining", "value": str(alert["days_remaining"])},
                    ],
                }],
            }
        elif webhook_type == "discord":
            return {
                "embeds": [{
                    "title": f"{emoji} {alert['severity'].upper()}",
                    "description": alert["message"],
                    "color": 0xdc2626 if alert["severity"] == "expired" else 0xea580c if alert["severity"] == "critical" else 0xd97706,
                    "fields": [
                        {"name": "Resource", "value": alert["resource_name"], "inline": True},
                        {"name": "Type", "value": alert["resource_type"], "inline": True},
                        {"name": "Days Remaining", "value": str(alert["days_remaining"]), "inline": True},
                    ],
                }],
            }
        else:
            return {"text": alert["message"], "alert": alert}

    async def send_test_notification(self, channel: str, recipient: str = None, config: dict = None) -> dict:
        """Send a test notification."""
        if not config:
            config = self._alert_config

        test_alert = {
            "id": "test",
            "resource_type": "test",
            "resource_name": "Test Notification",
            "cluster_id": "test-cluster",
            "namespace": "default",
            "severity": "warning",
            "message": "🧪 This is a test notification from Klock Monitor",
            "days_remaining": 7,
            "expires_at": "2026-01-01T00:00:00Z",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        try:
            if channel == "email":
                test_config = dict(config)
                test_config["email_recipients"] = [recipient] if recipient else config.get("email_recipients", [])
                await self._send_email(test_alert, test_config)
                return {"success": True, "message": f"Test email sent to {', '.join(test_config['email_recipients'])}"}
            elif channel == "webhook":
                test_config = dict(config)
                test_config["webhook_urls"] = [recipient] if recipient else config.get("webhook_urls", [])
                await self._send_webhook(test_alert, test_config)
                return {"success": True, "message": f"Test webhook sent"}
            else:
                return {"success": False, "error": f"Unknown channel: {channel}"}
        except Exception as e:
            return {"success": False, "error": str(e)}


alert_service = AlertService()
