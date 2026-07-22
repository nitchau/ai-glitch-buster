"""Caregiver settings page + dashboard, served by FastAPI.

Mounted on the dashboard-provided ``settings_app`` when ReachyCare is
installed as a robot app (custom_app_url), or on its own uvicorn server
when run by hand. The page lives in ``static/index.html`` and talks to the
small JSON API below. Emergency alerts appear as a red banner within
seconds (the page polls /api/state).
"""

from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).parent / "static"


def build_routes(app, orchestrator) -> None:
    """Attach ReachyCare routes to a FastAPI app."""
    from fastapi import Body
    from fastapi.responses import HTMLResponse, JSONResponse

    from .voice.personalities import PERSONALITIES

    settings = orchestrator.settings
    db = orchestrator.db

    @app.get("/", response_class=HTMLResponse)
    def index() -> str:
        return (STATIC_DIR / "index.html").read_text()

    @app.get("/api/state")
    def state() -> JSONResponse:
        return JSONResponse({
            "app": "ReachyCare",
            "demo_mode": settings.demo_mode,
            "settings": settings.care.to_dict(),
            "personalities": {key: spec["label"] for key, spec in PERSONALITIES.items()},
            "medications": db.medications(active_only=False),
            "alarms": [{**a, "fire_at": a["fire_at"].isoformat()} for a in db.alarms()],
            "alerts": db.alerts(limit=20),
            "emergency_active": orchestrator.emergency.active,
            "adherence": db.adherence_last_days(7),
            "today_nutrition": orchestrator.nutrition.today_totals(),
            "memories": db.memories(limit=50),
        })

    @app.post("/api/settings")
    def update_settings(payload: dict = Body(...)) -> dict:
        allowed = {"personality", "volume", "speech_rate", "caregiver_name",
                   "caregiver_phone", "senior_name", "checkin_time", "remind_again_minutes"}
        changes = {k: v for k, v in payload.items() if k in allowed}
        if "volume" in changes:
            changes["volume"] = max(0.0, min(1.0, float(changes["volume"])))
        if "speech_rate" in changes:
            changes["speech_rate"] = max(0.5, min(1.3, float(changes["speech_rate"])))
        if "remind_again_minutes" in changes:
            changes["remind_again_minutes"] = max(1, int(changes["remind_again_minutes"]))
        settings.update_care(**changes)
        return {"ok": True, "settings": settings.care.to_dict()}

    @app.post("/api/medications")
    def add_medication(payload: dict = Body(...)) -> dict:
        times = [t.strip() for t in payload.get("times", []) if t.strip()]
        med_id = db.add_medication(payload.get("name", "").strip() or "medication",
                                   payload.get("dose", "").strip(), times)
        return {"ok": True, "id": med_id}

    @app.post("/api/medications/{med_id}")
    def update_medication(med_id: int, payload: dict = Body(...)) -> dict:
        db.update_medication(med_id, payload.get("name", ""), payload.get("dose", ""),
                             payload.get("times", []), bool(payload.get("active", True)))
        return {"ok": True}

    @app.delete("/api/medications/{med_id}")
    def delete_medication(med_id: int) -> dict:
        db.delete_medication(med_id)
        return {"ok": True}

    @app.delete("/api/memories/{memory_id}")
    def delete_memory(memory_id: int) -> dict:
        db.delete_memory(memory_id)
        return {"ok": True}

    @app.post("/api/alerts/{alert_id}/resolve")
    def resolve_alert(alert_id: int) -> dict:
        db.resolve_alert(alert_id)
        return {"ok": True}

    @app.post("/api/emergency/test")
    def emergency_test() -> dict:
        """Judge/demo button: fire the full (simulated) alert chain."""
        result = orchestrator.emergency.trigger("dashboard test button")
        orchestrator.voice.say(orchestrator.emergency.response_line(result))
        return {"ok": True, "result": {k: v for k, v in result.items() if k != "payload"}}

    @app.post("/api/emergency/cancel")
    def emergency_cancel() -> dict:
        cancelled = orchestrator.emergency.cancel()
        if cancelled:
            orchestrator.voice.say(orchestrator.emergency.cancel_line())
        return {"ok": True, "cancelled": cancelled}


def serve_standalone(orchestrator, port: int = 8042):
    """Own webserver for standalone runs. Returns the uvicorn server or None."""
    try:
        import threading
        import uvicorn
        from fastapi import FastAPI

        app = FastAPI(title="ReachyCare settings")
        build_routes(app, orchestrator)
        server = uvicorn.Server(uvicorn.Config(app, host="0.0.0.0", port=port,
                                               log_level="warning"))
        threading.Thread(target=server.run, daemon=True, name="care-ui").start()
        logger.info("Settings page: http://localhost:%d", port)
        return server
    except Exception as e:
        logger.warning("Settings web page disabled (%s)", e)
        return None
