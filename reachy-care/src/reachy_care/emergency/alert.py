"""Emergency Alert service.

Reachy has no phone line, so "call 911" becomes an alert chain:
 1. respond instantly in a calm voice (orchestrator speaks),
 2. loud audible alert tone,
 3. notify the caregiver by SMS and phone call via Twilio,
 4. banner on the dashboard/settings page,
 5. "false alarm, Reachy" cancels and notifies the caregiver again.

DEMO MODE (default, REACHY_CARE_DEMO_MODE=true): steps 1-2-4 are real, step 3
is simulated and clearly labelled - no SMS or call ever leaves the building.
Never wire this to a real 911 dial; it is an alert system, not a phone.
"""

from __future__ import annotations

import logging
import threading
from datetime import datetime

logger = logging.getLogger(__name__)


class EmergencyService:
    def __init__(self, settings, db):
        self.settings = settings
        self.db = db
        self._lock = threading.Lock()
        self.active = False
        self.active_alert_id: int | None = None

    # ---------------- trigger / cancel ----------------

    def trigger(self, heard_text: str) -> dict:
        """Fire the alert chain. Returns a dict describing what happened so the
        orchestrator can speak an accurate, reassuring line."""
        with self._lock:
            if self.active:
                return {"already_active": True, "sent": False, "simulated": self.settings.demo_mode}
            self.active = True

        care = self.settings.care
        stamp = datetime.now().strftime("%-I:%M %p")
        message = (f"[ReachyCare ALERT] {care.senior_name} may need help "
                   f"(heard: \"{heard_text.strip()}\" at {stamp}). "
                   "Please check on them or call them now.")
        self.active_alert_id = self.db.add_alert("emergency", message)
        self.db.log_event("emergency_triggered", heard_text)

        sent, sim_reason = self._notify_caregiver(message)
        result = {"already_active": False, "sent": sent,
                  "simulated": not sent, "reason": sim_reason,
                  "caregiver": care.caregiver_name}
        logger.warning("EMERGENCY triggered (%s): %s", "sent" if sent else "simulated", message)
        return result

    def cancel(self) -> bool:
        """'False alarm, Reachy' - stand down and tell the caregiver."""
        with self._lock:
            if not self.active:
                return False
            self.active = False
            alert_id, self.active_alert_id = self.active_alert_id, None
        if alert_id is not None:
            self.db.resolve_alert(alert_id)
        self.db.log_event("emergency_cancelled")
        care = self.settings.care
        self._notify_caregiver(
            f"[ReachyCare] False alarm - {care.senior_name} says they are okay. "
            "The earlier alert is cancelled.")
        return True

    # ---------------- caregiver notification ----------------

    def _notify_caregiver(self, message: str) -> tuple[bool, str]:
        """SMS + phone call via Twilio. In demo mode we only simulate."""
        care = self.settings.care
        if self.settings.demo_mode:
            banner = f"[DEMO - SIMULATED] Would SMS+call {care.caregiver_name} ({care.caregiver_phone or 'no number set'}): {message}"
            print(banner)
            self.db.add_alert("info", banner)
            return False, "demo mode"
        if not (self.settings.twilio_account_sid and self.settings.twilio_auth_token
                and self.settings.twilio_from_number and care.caregiver_phone):
            reason = "Twilio credentials or caregiver phone not configured"
            self.db.add_alert("info", f"[NOT SENT] {reason}: {message}")
            logger.warning("Emergency notification skipped: %s", reason)
            return False, reason
        try:
            from twilio.rest import Client

            client = Client(self.settings.twilio_account_sid, self.settings.twilio_auth_token)
            client.messages.create(body=message, from_=self.settings.twilio_from_number,
                                   to=care.caregiver_phone)
            spoken = message.replace('"', "")
            client.calls.create(
                twiml=f"<Response><Say loop='2'>{spoken}</Say></Response>",
                from_=self.settings.twilio_from_number, to=care.caregiver_phone)
            return True, ""
        except Exception as e:
            logger.error("Twilio notification failed: %s", e)
            self.db.add_alert("info", f"[SEND FAILED] {e}: {message}")
            return False, str(e)

    # ---------------- speech lines ----------------

    def response_line(self, result: dict) -> str:
        care = self.settings.care
        if result.get("already_active"):
            return ("I'm still on it - your caregiver has been alerted. "
                    "Stay with me, help is on the way.")
        base = ("Okay, I hear you. Stay calm, I'm right here with you. "
                f"I am alerting {care.caregiver_name} right now so they can get you help. ")
        if result.get("simulated"):
            base += "This is a practice drill, so the alert is simulated. "
        base += "If this was a mistake, just say: false alarm, Reachy."
        return base

    def cancel_line(self) -> str:
        return ("Phew - I'm glad you're okay. I've told your caregiver it was a "
                "false alarm. I'm right here if you need anything.")
