"""Rule-based intent routing for spoken requests.

Fast, offline and predictable: safety-critical intents (emergency, cancel,
medication confirmation) must never depend on an internet round-trip.
Anything that matches no rule becomes free CHAT handled by the LLM.
"""

from __future__ import annotations

import re
from enum import Enum
from dataclasses import dataclass, field


class Intent(Enum):
    EMERGENCY = "emergency"
    CANCEL_EMERGENCY = "cancel_emergency"
    JOKE = "joke"
    STORY = "story"
    PODCAST = "podcast"
    MUSIC_PLAY = "music_play"
    MUSIC_STOP = "music_stop"
    MUSIC_VOLUME = "music_volume"
    TRIVIA = "trivia"
    TWENTY_QUESTIONS = "twenty_questions"
    AKINATOR = "akinator"
    MED_TAKEN = "med_taken"
    MED_LIST = "med_list"
    MEAL_LOG = "meal_log"
    HEALTH_SUMMARY = "health_summary"
    HABITS = "habits"
    ALARM_SET = "alarm_set"
    TIMER_SET = "timer_set"
    ALARM_LIST = "alarm_list"
    ALARM_CANCEL = "alarm_cancel"
    REMEMBER = "remember"
    RECALL = "recall"
    PERSONALITY = "personality"
    TIME = "time"
    HELP = "help"
    GOODBYE = "goodbye"
    CHAT = "chat"


@dataclass
class Parsed:
    intent: Intent
    text: str
    slots: dict = field(default_factory=dict)


# Emergency phrases are checked FIRST, always, and are deliberately broad.
EMERGENCY_PATTERNS = [
    r"\bcall\s*9\s*1\s*1\b", r"\bcall\s*nine\s*one\s*one\b", r"\bemergency\b",
    r"\bhelp\s*me\b", r"\bi(?:'ve|\s+have)\s+fallen\b", r"\bi\s+fell\b",
    r"\bcan'?t\s+(?:get\s+up|breathe)\b", r"\bchest\s+pain", r"^help[.!\s]*$",
    r"\bsend\s+help\b", r"\bcall\s+(?:an\s+)?ambulance\b",
]
CANCEL_PATTERNS = [
    r"\bfalse\s+alarm\b", r"\bcancel\s+(?:the\s+)?(?:alert|alarm|emergency)\b",
    r"\bi'?m\s+(?:ok(?:ay)?|fine|alright)\b.*\breachy\b", r"\bnever\s*mind\s+reachy\b",
]

_RULES: list[tuple[Intent, list[str]]] = [
    (Intent.MED_TAKEN, [r"\bi\s+(?:just\s+)?took\s+(?:my|the)\b.*\b(?:pill|med|tablet)",
                        r"\btook\s+(?:my|the)\s+medication\b", r"\bmedicine\s+taken\b"]),
    (Intent.MED_LIST, [r"\bwhat\s+(?:medications?|medicines?|meds|pills?)\b",
                       r"\bmy\s+(?:medication|medicine|med|pill)\s+(?:schedule|list)\b",
                       r"\bwhen\s+(?:do\s+)?i\s+take\b.*\b(?:pill|med)"]),
    (Intent.MEAL_LOG, [r"\b(?:i\s+ate|i\s+had|for\s+(?:breakfast|lunch|dinner|supper)\s+i)\b",
                       r"\blog\s+(?:my\s+)?(?:meal|food|dinner|lunch|breakfast)\b"]),
    (Intent.HEALTH_SUMMARY, [r"\b(?:daily|health|nutrition|food)\s+summary\b",
                             r"\bhow\s+did\s+i\s+eat\b", r"\bsummary\s+of\s+(?:my\s+)?day\b"]),
    (Intent.HABITS, [r"\bhealthy\s+habits?\b", r"\bweekly\s+(?:habits?|tips?|report)\b"]),
    (Intent.TIMER_SET, [r"\b(?:set\s+)?(?:a\s+)?timer\b", r"\bremind\s+me\s+in\b"]),
    (Intent.ALARM_SET, [r"\bset\s+(?:an?\s+)?alarm\b", r"\bwake\s+me\b",
                        r"\bremind\s+me\s+(?:at|tomorrow)\b"]),
    (Intent.ALARM_CANCEL, [r"\b(?:cancel|stop|delete|remove)\b.*\b(?:alarms?|timers?)\b"]),
    (Intent.ALARM_LIST, [r"\b(?:what|list|any)\b.*\b(?:alarms?|timers?)\b.*\?*$",
                         r"\bmy\s+alarms?\b"]),
    (Intent.JOKE, [r"\bjoke\b", r"\bmake\s+me\s+laugh\b", r"\bsomething\s+funny\b"]),
    (Intent.STORY, [r"\b(?:tell|read)\b.*\bstory\b", r"\bstory\s*time\b"]),
    (Intent.PODCAST, [r"\bpodcast\b", r"\bthe\s+news\b"]),
    (Intent.MUSIC_VOLUME, [r"\b(?:turn|volume)\b.*\b(?:up|down|louder|quieter|softer)\b",
                           r"\b(?:louder|quieter|softer)\b"]),
    (Intent.MUSIC_STOP, [r"\b(?:stop|pause|turn\s+off)\b.*\b(?:music|radio|song|station|playing)\b",
                         r"\bstop\s+playing\b"]),
    (Intent.MUSIC_PLAY, [r"\bplay\b.*\b(?:music|radio|station|song|jazz|classical|oldies)\b",
                         r"\b(?:some\s+)?music\s+please\b", r"\bput\s+on\b.*\b(?:radio|music)\b"]),
    (Intent.TRIVIA, [r"\btrivia\b", r"\bquiz\b", r"\btest\s+my\s+(?:knowledge|memory)\b"]),
    (Intent.TWENTY_QUESTIONS, [r"\btwenty\s+questions\b", r"\b20\s+questions\b"]),
    (Intent.AKINATOR, [r"\bakinator\b", r"\bguess\s+who\s+i'?m\s+thinking\b",
                       r"\bmind\s*reader\b", r"\bgenie\s+game\b"]),
    (Intent.REMEMBER, [r"^(?:please\s+)?remember\b", r"\bdon'?t\s+forget\s+that\b"]),
    (Intent.RECALL, [r"\bwhat\s+do\s+you\s+remember\b", r"\bdo\s+you\s+remember\b"]),
    (Intent.PERSONALITY, [r"\b(?:change|switch|pick|choose)\b.*\bpersonalit(?:y|ies)\b",
                          r"\bbe\s+(?:my\s+)?(?:cheerful\s+friend|wise\s+storyteller|"
                          r"gentle\s+coach|funny\s+grandkid)\b"]),
    (Intent.TIME, [r"\bwhat\s+time\s+is\s+it\b", r"\bwhat(?:'s|\s+is)\s+the\s+(?:time|date)\b",
                   r"\bwhat\s+day\s+is\s+it\b"]),
    (Intent.HELP, [r"\bwhat\s+can\s+you\s+do\b", r"^help\s+me\s+with\s+you\b", r"\byour\s+features\b"]),
    (Intent.GOODBYE, [r"\b(?:goodbye|good\s*night|bye\s*bye|bye)\b", r"\bgo\s+to\s+sleep\b",
                      r"\bthat'?s\s+all\b", r"\bstop\s+listening\b", r"\btalk\s+later\b"]),
]


def _volume_direction(text: str) -> str:
    return "down" if re.search(r"\b(?:down|quieter|softer|lower)\b", text) else "up"


def parse(text: str | None, emergency_active: bool = False) -> Parsed:
    """Classify one utterance. Emergency and its cancel phrase always win."""
    cleaned = (text or "").strip()
    lowered = cleaned.lower()
    if not lowered:
        return Parsed(Intent.CHAT, cleaned)

    if emergency_active and any(re.search(p, lowered) for p in CANCEL_PATTERNS):
        return Parsed(Intent.CANCEL_EMERGENCY, cleaned)
    if any(re.search(p, lowered) for p in EMERGENCY_PATTERNS):
        return Parsed(Intent.EMERGENCY, cleaned)
    # "help" alone is an emergency (above); "help me with..." conversational help
    if re.fullmatch(r"(?:reachy\s+)?help(?:\s+please)?[.!?]?", lowered):
        return Parsed(Intent.EMERGENCY, cleaned)

    for intent, patterns in _RULES:
        if any(re.search(p, lowered) for p in patterns):
            slots: dict = {}
            if intent == Intent.MUSIC_VOLUME:
                slots["direction"] = _volume_direction(lowered)
            return Parsed(intent, cleaned, slots)
    return Parsed(Intent.CHAT, cleaned)
