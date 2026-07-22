"""Alarms and timers set by voice, persisted in SQLite across restarts.

Natural-language parsing is deliberately simple and forgiving:
    "set an alarm for 8 30 in the morning"     -> daily 08:30
    "wake me at 7"                             -> 07:00
    "set a timer for 20 minutes"               -> one-shot
    "remind me in an hour and a half"          -> one-shot
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta

_WORD_NUMBERS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
    "eight": 8, "nine": 9, "ten": 10, "fifteen": 15, "twenty": 20, "thirty": 30,
    "forty": 40, "forty five": 45, "sixty": 60, "an": 1, "a": 1, "half": 0.5,
}


def _num(token: str) -> float | None:
    token = token.strip().lower()
    if token.isdigit():
        return float(token)
    return _WORD_NUMBERS.get(token)


def parse_duration(text: str) -> timedelta | None:
    """'20 minutes', 'an hour and a half', 'ninety seconds' -> timedelta."""
    lowered = (text or "").lower()
    total = timedelta()
    for match in re.finditer(
            r"(\d+|\ban?\b|one|two|three|four|five|six|seven|eight|nine|ten|"
            r"fifteen|twenty|thirty|forty five|forty|sixty|half)\s*"
            r"(?:an?\s+)?(hour|minute|min|second|sec)s?", lowered):
        value = _num(match.group(1))
        if value is None:
            continue
        unit = match.group(2)
        if unit.startswith("hour"):
            total += timedelta(hours=value)
        elif unit.startswith(("min",)):
            total += timedelta(minutes=value)
        else:
            total += timedelta(seconds=value)
    if "half" in lowered and "hour" in lowered and total == timedelta():
        total = timedelta(minutes=30)
    if re.search(r"\bhalf\b.*\bhour\b", lowered) and total == timedelta(hours=0.5):
        pass
    return total if total > timedelta() else None


def parse_clock_time(text: str, now: datetime | None = None) -> datetime | None:
    """'8 30 in the morning', 'at 7 pm', 'at seven' -> next occurrence."""
    now = now or datetime.now()
    lowered = (text or "").lower().replace("o'clock", "").replace("oclock", "")
    match = re.search(
        r"\b(?:at|for)\s+(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|"
        r"ten|eleven|twelve)(?:[:\s](\d{2}))?\s*(a\.?m\.?|p\.?m\.?|in the morning|"
        r"in the evening|in the afternoon|at night|tonight)?", lowered)
    if not match:
        return None
    words12 = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
               "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12}
    raw_hour = match.group(1)
    hour = int(raw_hour) if raw_hour.isdigit() else words12[raw_hour]
    minute = int(match.group(2) or 0)
    period = (match.group(3) or "").replace(".", "")
    if hour > 23 or minute > 59:
        return None
    if period in ("pm", "in the evening", "in the afternoon", "at night", "tonight") and hour < 12:
        hour += 12
    elif period in ("am", "in the morning") and hour == 12:
        hour = 0
    elif not period and hour <= 7:
        hour += 12  # bare "at 6" more likely means evening; alarms say "morning"
    if "morning" in lowered and hour >= 12:
        hour -= 12
    candidate = now.replace(hour=hour % 24, minute=minute, second=0, microsecond=0)
    if candidate <= now:
        candidate += timedelta(days=1)
    return candidate


class AlarmService:
    def __init__(self, db):
        self.db = db

    def set_from_text(self, text: str, kind_hint: str = "alarm") -> str:
        """Parse and store an alarm/timer. Returns the spoken confirmation."""
        duration = parse_duration(text)
        if duration is not None and (kind_hint == "timer" or "timer" in text.lower()
                                     or re.search(r"\bin\b", text.lower())):
            fire_at = datetime.now() + duration
            minutes = int(duration.total_seconds() // 60)
            label = "timer"
            self.db.add_alarm(label, "timer", fire_at)
            human = f"{minutes} minutes" if minutes else f"{int(duration.total_seconds())} seconds"
            return (f"Timer set for {human}. I'll give you a gentle ring at "
                    f"{fire_at.strftime('%-I:%M %p')}.")
        clock = parse_clock_time(text)
        if clock is not None:
            repeat = bool(re.search(r"\b(?:every|each)\s+(?:day|morning|evening)\b", text.lower()))
            self.db.add_alarm("alarm", "alarm", clock, repeat_daily=repeat)
            daily = " every day" if repeat else ""
            return (f"Alarm set for {clock.strftime('%-I:%M %p')}{daily}. "
                    f"To confirm, that's {clock.strftime('%-I:%M %p')}.")
        return ("I didn't quite catch the time. You can say, for example: "
                "set an alarm for 8 30 in the morning, or set a timer for 20 minutes.")

    def due_now(self, now: datetime | None = None) -> list[dict]:
        now = now or datetime.now()
        return [a for a in self.db.alarms() if a["fire_at"] <= now]

    def fired(self, alarm: dict, now: datetime | None = None) -> None:
        """Reschedule daily alarms, retire one-shots."""
        now = now or datetime.now()
        if alarm["repeat_daily"]:
            next_fire = alarm["fire_at"] + timedelta(days=1)
            while next_fire <= now:
                next_fire += timedelta(days=1)
            self.db.reschedule_alarm(alarm["id"], next_fire)
        else:
            self.db.deactivate_alarm(alarm["id"])

    def list_line(self) -> str:
        alarms = self.db.alarms()
        if not alarms:
            return "You have no alarms or timers set right now."
        parts = []
        for a in alarms:
            when = a["fire_at"].strftime("%-I:%M %p")
            daily = " every day" if a["repeat_daily"] else ""
            parts.append(f"a {a['kind']} at {when}{daily}")
        return "You have " + ", and ".join(parts) + "."

    def cancel_all(self) -> str:
        alarms = self.db.alarms()
        for a in alarms:
            self.db.deactivate_alarm(a["id"])
        if not alarms:
            return "There was nothing to cancel - you're all clear."
        return f"Done - I've cancelled {len(alarms)} of them. All quiet now."
