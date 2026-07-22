"""Daily proactive check-in: a greeting, light conversation and ONE gentle
recommendation. Always a suggestion, never nagging - Reachy offers, the
senior decides."""

from __future__ import annotations

import random
from datetime import datetime, timedelta

RECOMMENDATIONS = [
    "a little glass of water would be a nice idea about now",
    "if you feel like it, a short walk or a stretch by the window can feel wonderful",
    "it might be a lovely day to call someone in the family for a chat",
    "sitting by some daylight for a few minutes can really lift the morning",
    "a piece of fruit with your tea would be a treat for your body",
    "how about a favourite song later? Just say: play some music",
]

GREETINGS = [
    "Good morning, {name}! I hope you slept well.",
    "Hello {name}! It's lovely to see the day with you.",
    "Morning, {name}! I was just doing my antenna stretches.",
]


class DailyCheckin:
    def __init__(self, settings, db):
        self.settings = settings
        self.db = db

    def is_due(self, now: datetime | None = None) -> bool:
        """Due once a day at (or after) the configured check-in time."""
        now = now or datetime.now()
        try:
            hour, minute = (int(p) for p in self.settings.care.checkin_time.split(":"))
        except Exception:
            hour, minute = 9, 30
        slot = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if now < slot:
            return False
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        already = self.db.events_since(start_of_day, kind="checkin")
        return not already

    def lines(self, adherence_note: str | None = None) -> list[str]:
        """The check-in script: greeting + optional meds note + one suggestion."""
        name = self.settings.care.senior_name
        lines = [random.choice(GREETINGS).format(name=name)]
        yesterday = datetime.now() - timedelta(days=1)
        missed = [e for e in self.db.med_log_since(yesterday) if e["status"] == "missed"]
        if missed and adherence_note is None:
            lines.append("Yesterday one of your medications slipped by - no worries at all, "
                         "today is a fresh start and I'll remind you.")
        lines.append(f"Just one little thought: {random.choice(RECOMMENDATIONS)}.")
        lines.append("How are you feeling today?")
        return lines

    def mark_done(self) -> None:
        self.db.log_event("checkin")
