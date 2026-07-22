"""Medication reminders: what is due, re-reminders, adherence, daily summary.

Pure logic lives here (easy to test); the orchestrator does the speaking.
Flow per scheduled slot:
    due -> speak reminder -> senior confirms -> log 'confirmed'
        -> no confirmation -> log 'reminded', try again after N minutes
        -> still nothing after the re-reminder window x2 -> log 'missed'
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta
from dataclasses import dataclass


@dataclass
class DueMed:
    med_id: int
    name: str
    dose: str
    due_at: datetime  # the scheduled slot (today at HH:MM)


def _slot_today(hhmm: str, now: datetime) -> datetime | None:
    try:
        hour, minute = (int(p) for p in hhmm.strip().split(":"))
        return now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    except Exception:
        return None


class MedicationReminders:
    # how long after the slot we keep trying before logging a miss
    GRACE = timedelta(minutes=45)

    def __init__(self, db, remind_again_minutes: int = 10):
        self.db = db
        self.remind_again = timedelta(minutes=max(1, remind_again_minutes))
        self._last_reminded: dict[tuple[int, str], datetime] = {}

    def due_now(self, now: datetime | None = None) -> list[DueMed]:
        """Slots that are due and still unconfirmed (respecting re-remind delay)."""
        now = now or datetime.now()
        due: list[DueMed] = []
        for med in self.db.medications():
            for hhmm in med["times"]:
                slot = _slot_today(hhmm, now)
                if slot is None or now < slot:
                    continue
                status = self.db.med_log_status(med["id"], slot)
                if status in ("confirmed", "missed"):
                    continue
                if now - slot > self.GRACE:
                    self.db.log_med(med["id"], slot, "missed")
                    continue
                key = (med["id"], slot.isoformat())
                last = self._last_reminded.get(key)
                if last is not None and now - last < self.remind_again:
                    continue
                due.append(DueMed(med["id"], med["name"], med["dose"], slot))
        return due

    def mark_reminded(self, item: DueMed, now: datetime | None = None) -> None:
        now = now or datetime.now()
        self._last_reminded[(item.med_id, item.due_at.isoformat())] = now
        self.db.log_med(item.med_id, item.due_at, "reminded")

    def confirm(self, item: DueMed) -> None:
        self.db.log_med(item.med_id, item.due_at, "confirmed")

    def confirm_latest_reminded(self, now: datetime | None = None) -> str | None:
        """Voice path: 'I took my pill' confirms the most recent open reminder.
        Returns the medication name, or None if nothing was pending."""
        now = now or datetime.now()
        best: tuple[datetime, DueMed] | None = None
        for med in self.db.medications():
            for hhmm in med["times"]:
                slot = _slot_today(hhmm, now)
                if slot is None or now < slot or now - slot > self.GRACE + self.remind_again:
                    continue
                if self.db.med_log_status(med["id"], slot) == "reminded":
                    item = DueMed(med["id"], med["name"], med["dose"], slot)
                    if best is None or slot > best[0]:
                        best = (slot, item)
        if best is None:
            return None
        self.confirm(best[1])
        return best[1].name

    # ---------------- speech helpers ----------------

    @staticmethod
    def reminder_line(item: DueMed, senior_name: str) -> str:
        when = item.due_at.strftime("%-I:%M %p") if hasattr(item.due_at, "strftime") else ""
        dose = f", {item.dose}," if item.dose else ""
        return (f"{senior_name}, it's {when} - time for your {item.name}{dose}. "
                "When you've taken it, just tell me 'I took my pill'.")

    @staticmethod
    def confirmation_line(name: str) -> str:
        return f"Wonderful - I've noted that you took your {name}. Well done!"

    def schedule_spoken(self) -> str:
        meds = self.db.medications()
        if not meds:
            return ("You don't have any medications set up yet. A caregiver can add "
                    "them on my settings page.")
        parts = []
        for med in meds:
            times = " and ".join(_speak_time(t) for t in med["times"]) or "no set time"
            dose = f", {med['dose']}," if med["dose"] else ""
            parts.append(f"{med['name']}{dose} at {times}")
        return "Here is your schedule. " + ". ".join(parts) + "."

    def daily_summary(self, now: datetime | None = None) -> str:
        now = now or datetime.now()
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        log = self.db.med_log_since(start)
        confirmed = [e for e in log if e["status"] == "confirmed"]
        missed = [e for e in log if e["status"] == "missed"]
        if not log:
            return "No medication activity today so far."
        line = f"Today you took {len(confirmed)} of your scheduled medications."
        if missed:
            names = ", ".join(sorted({e["name"] for e in missed}))
            line += f" It looks like {names} was missed - no worries, I'll mention it to your caregiver's summary."
        else:
            line += " Nothing missed. Lovely job!"
        return line


def _speak_time(hhmm: str) -> str:
    match = re.fullmatch(r"(\d{1,2}):(\d{2})", hhmm.strip())
    if not match:
        return hhmm
    hour, minute = int(match.group(1)), int(match.group(2))
    suffix = "AM" if hour < 12 else "PM"
    hour12 = hour % 12 or 12
    return f"{hour12}:{minute:02d} {suffix}" if minute else f"{hour12} {suffix}"
