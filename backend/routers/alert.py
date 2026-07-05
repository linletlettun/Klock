"""
Alert notification endpoints.
"""
from fastapi import APIRouter, HTTPException
from models.alert import AlertConfig, AlertConfigResponse, AlertTestRequest
from services.alert import alert_service

router = APIRouter()


@router.get("/config", response_model=AlertConfigResponse)
async def get_alert_config():
    """Get alert configuration."""
    return alert_service.get_config()


@router.put("/config", response_model=AlertConfigResponse)
async def update_alert_config(updates: dict):
    """Update alert configuration."""
    return alert_service.update_config(updates)


@router.get("/history")
async def get_alert_history(limit: int = 50):
    """Get alert notification history."""
    return alert_service.get_history(limit)


@router.post("/check")
async def check_alerts():
    """Manually trigger alert check for all monitored resources."""
    from services.monitor import monitor_service

    alerts = []

    # Check TLS certs
    for cert in monitor_service.get_all_tls():
        new_alerts = await alert_service.check_and_notify([{
            **cert,
            "resource_type": "tls",
        }])
        alerts.extend(new_alerts)

    # Check tokens
    for token in monitor_service.get_all_tokens():
        new_alerts = await alert_service.check_and_notify([{
            **token,
            "resource_type": "token",
        }])
        alerts.extend(new_alerts)

    # Check Kafka
    for kafka in monitor_service.get_all_kafka():
        new_alerts = await alert_service.check_and_notify([{
            **kafka,
            "resource_type": "kafka",
        }])
        alerts.extend(new_alerts)

    return {
        "checked": len(monitor_service.get_all_tls()) + len(monitor_service.get_all_tokens()) + len(monitor_service.get_all_kafka()),
        "alerts_sent": len(alerts),
        "alerts": alerts,
    }


@router.post("/test")
async def test_notification(request: AlertTestRequest):
    """Send a test notification."""
    config = alert_service.get_config()
    result = await alert_service.send_test_notification(
        channel=request.channel,
        recipient=request.recipient,
        config=config,
    )
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error"))
    return result
