from reachy_care.emergency.alert import EmergencyService


def test_demo_mode_never_sends(settings, db):
    settings.demo_mode = True
    settings.care.caregiver_name = "Maya"
    service = EmergencyService(settings, db)

    result = service.trigger("help, I've fallen")
    assert service.active
    assert result["simulated"] and not result["sent"]

    alerts = db.alerts()
    kinds = {a["kind"] for a in alerts}
    assert "emergency" in kinds          # dashboard banner
    assert any("SIMULATED" in a["message"] for a in alerts)  # clearly labelled

    line = service.response_line(result)
    assert "Maya" in line and "false alarm" in line.lower()
    assert "practice drill" in line       # honesty about simulation


def test_double_trigger_stays_calm(settings, db):
    service = EmergencyService(settings, db)
    service.trigger("help")
    second = service.trigger("help again")
    assert second["already_active"]
    assert "help is on the way" in service.response_line(second).lower()


def test_cancel_flow(settings, db):
    service = EmergencyService(settings, db)
    assert not service.cancel()  # nothing active yet
    service.trigger("emergency")
    assert service.cancel()
    assert not service.active
    assert db.alerts(unresolved_only=True) == [] or all(
        a["kind"] != "emergency" for a in db.alerts(unresolved_only=True))
    assert "glad you're okay" in service.cancel_line()


def test_live_mode_without_twilio_is_safe(settings, db):
    settings.demo_mode = False  # live mode but no Twilio creds configured
    service = EmergencyService(settings, db)
    result = service.trigger("help me")
    assert not result["sent"]            # nothing to send with -> logged, not crashed
    assert "not configured" in result["reason"]
