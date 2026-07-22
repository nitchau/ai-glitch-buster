"""The ReachyCare orchestrator: one loop that owns wake word, conversations,
scheduled reminders, games and the emergency flow.

Design rules:
- The main loop NEVER crashes: every handler is wrapped, errors become a
  friendly spoken fallback line and a log entry.
- Scheduled things (meds, alarms, check-in) are produced by a background
  ticker thread into a queue; only the main loop speaks, so voices never
  talk over each other.
- Emergency phrases win over everything, everywhere.
"""

from __future__ import annotations

import re
import queue
import random
import logging
import threading
from datetime import datetime
from dataclasses import dataclass

from .config import Settings, MEDICAL_DISCLAIMER
from .db import CareDB
from .intents import Intent, parse
from .voice.service import VoiceService
from .voice.llm import LLM
from .voice import personalities
from .voice.tts import CHIME, CELEBRATE, ALARM, EMERGENCY_SIREN
from .motion.moves import MotionService
from .entertainment.jokes import JokeTeller
from .entertainment.stories import StoryTeller
from .entertainment.trivia import TriviaGame
from .entertainment.games import GuessingGame, OFFLINE_APOLOGY, is_guess, said_yes, said_no
from .entertainment.radio import RadioPlayer
from .meds.reminders import MedicationReminders
from .emergency.alert import EmergencyService
from .health.nutrition import NutritionService, weekly_habits
from .memory.memories import MemoryStore, maybe_auto_remember
from .memory.alarms import AlarmService
from .memory.checkin import DailyCheckin

logger = logging.getLogger(__name__)

FALLBACK_LINES = [
    "Oh dear, my thoughts got tangled for a second. Could you say that again?",
    "Hmm, something hiccuped inside me. Let's try that once more.",
]

HELP_LINE = ("I can tell jokes and stories, play trivia, twenty questions or the genie game, "
             "put on music or the radio, remind you about your medications, set alarms and "
             "timers, keep track of your meals, and remember the things you tell me. "
             "And if you ever need help, just say: Reachy, emergency.")


@dataclass
class CareEvent:
    kind: str          # med_reminder | alarm | checkin
    payload: object = None


class Orchestrator:
    def __init__(self, settings: Settings, mini=None):
        self.settings = settings
        self.db = CareDB(settings.db_path)
        self.motion = MotionService(mini)
        self.llm = LLM(settings)
        self.voice = VoiceService(settings, mini=mini, motion=self.motion)
        self.jokes = JokeTeller(self.llm)
        self.stories = StoryTeller(self.llm)
        self.radio = RadioPlayer(volume=settings.care.volume)
        self.meds = MedicationReminders(self.db, settings.care.remind_again_minutes)
        self.emergency = EmergencyService(settings, self.db)
        self.nutrition = NutritionService(settings, self.db, self.llm)
        self.memory = MemoryStore(self.db)
        self.alarms = AlarmService(self.db)
        self.checkin = DailyCheckin(settings, self.db)

        self._events: "queue.Queue[CareEvent]" = queue.Queue()
        self._wake_abort = threading.Event()
        self._ticker: threading.Thread | None = None
        self._history: list[dict] = []  # rolling chat history for the LLM

    # ================= lifecycle =================

    def run(self, stop_event: threading.Event) -> None:
        logger.info("ReachyCare starting (demo_mode=%s)", self.settings.demo_mode)
        self._start_ticker(stop_event)
        self.motion.start_idle()
        # one bridge thread: when the app is asked to stop, abort wake-waiting too
        threading.Thread(target=lambda: (stop_event.wait(), self._wake_abort.set()),
                         daemon=True, name="stop-bridge").start()
        try:
            self._maybe_onboard()
            while not stop_event.is_set():
                self._drain_events(stop_event)
                self._wake_abort.clear()
                heard = self.voice.wait_for_wake(self._wake_abort)
                if stop_event.is_set():
                    break
                if heard is None:      # aborted by a scheduled event or stop
                    continue
                self._safe(self._conversation, stop_event, heard)
        finally:
            self.shutdown()

    def shutdown(self) -> None:
        try:
            self.radio.stop()
        except Exception:
            pass
        self.motion.shutdown()
        self.voice.close()
        self.db.close()
        logger.info("ReachyCare stopped.")

    def _safe(self, fn, *args) -> None:
        """Run one handler; on any error, speak a kind fallback instead of dying."""
        try:
            fn(*args)
        except Exception:
            logger.exception("Handler failed")
            self.voice.say(random.choice(FALLBACK_LINES))

    def _maybe_onboard(self) -> None:
        if self.settings.care.onboarded:
            return
        spec = personalities.PERSONALITIES[personalities.normalize(self.settings.care.personality)]
        self.voice.say(f"Hello! I'm Reachy, and I'm so glad to be here with you. {spec['intro']}")
        self.voice.say(MEDICAL_DISCLAIMER)
        self.voice.say("Whenever you want me, just say: Hey Reachy.")
        self.settings.update_care(onboarded=True)

    # ================= background ticker =================

    def _start_ticker(self, stop_event: threading.Event) -> None:
        def tick() -> None:
            while not stop_event.wait(5.0):
                try:
                    for due in self.meds.due_now():
                        self.meds.mark_reminded(due)
                        self._push(CareEvent("med_reminder", due))
                    for alarm in self.alarms.due_now():
                        self.alarms.fired(alarm)
                        self._push(CareEvent("alarm", alarm))
                    if self.checkin.is_due():
                        self.checkin.mark_done()
                        self._push(CareEvent("checkin"))
                except Exception:
                    logger.exception("Ticker failure (will keep ticking)")

        self._ticker = threading.Thread(target=tick, daemon=True, name="care-ticker")
        self._ticker.start()

    def _push(self, event: CareEvent) -> None:
        self._events.put(event)
        self._wake_abort.set()  # interrupt wake-waiting so we can speak now

    def _drain_events(self, stop_event: threading.Event) -> None:
        while not stop_event.is_set():
            try:
                event = self._events.get_nowait()
            except queue.Empty:
                return
            if event.kind == "med_reminder":
                self._safe(self._handle_med_reminder, event.payload)
            elif event.kind == "alarm":
                self._safe(self._handle_alarm, event.payload)
            elif event.kind == "checkin":
                self._safe(self._handle_checkin, stop_event)

    # ================= scheduled flows =================

    def _handle_med_reminder(self, due) -> None:
        self.voice.play_tone(CHIME, repeats=2)
        self.motion.happy_wiggle()
        self.voice.say(self.meds.reminder_line(due, self.settings.care.senior_name))
        reply = self.voice.listen(start_timeout_s=15.0)
        parsed = parse(reply)
        if parsed.intent == Intent.EMERGENCY:
            self._handle_emergency(reply or "help")
            return
        if parsed.intent == Intent.MED_TAKEN or said_yes(reply):
            self.meds.confirm(due)
            self.motion.nod_yes()
            self.voice.say(self.meds.confirmation_line(due.name))
        else:
            self.voice.say("No rush at all. I'll check back with you in a little while.")

    def _handle_alarm(self, alarm) -> None:
        label = "timer" if alarm["kind"] == "timer" else "alarm"
        self.motion.happy_wiggle()
        for round_no in range(3):  # gentle, then a touch more insistent
            self.voice.play_tone(ALARM, seconds_each=0.3, repeats=1 + round_no,
                                 volume=min(1.0, 0.5 + 0.25 * round_no))
            self.voice.say(f"Ding ding! Your {label} is going off."
                           if round_no == 0 else f"Just me again - that {label} of yours.")
            reply = self.voice.listen(start_timeout_s=6.0)
            if reply:
                if parse(reply).intent == Intent.EMERGENCY:
                    self._handle_emergency(reply)
                else:
                    self.voice.say("Okay, alarm off. Carry on!")
                return
        self.voice.say("I'll leave it there. It was just a reminder from me to you.")

    def _handle_checkin(self, stop_event: threading.Event) -> None:
        self.motion.happy_wiggle()
        for line in self.checkin.lines():
            self.voice.say(line)
        reply = self.voice.listen(start_timeout_s=15.0)
        if reply:
            self._conversation(stop_event, initial_text=reply, greeted=True)

    # ================= conversation =================

    def _conversation(self, stop_event: threading.Event, initial_text: str = "",
                      greeted: bool = False) -> None:
        self.db.log_event("conversation")
        self.motion.look_toward(self.voice.audio.direction_of_arrival())
        text = (initial_text or "").strip()
        # Wake transcript like "hey reachy" alone -> greet and listen fresh
        if text and parse(text).intent == Intent.CHAT and len(text.split()) <= 3:
            text = ""
        if not text and not greeted:
            name = self.settings.care.senior_name
            self.motion.happy_wiggle()
            self.voice.say(random.choice([
                f"Yes, {name}? I'm listening.",
                f"Hello {name}! What can I do for you?",
                "I'm here! What shall we do?",
            ]))
        quiet_rounds = 0
        while not stop_event.is_set():
            if not text:
                text = self.voice.listen(
                    start_timeout_s=self.settings.care.quiet_timeout_s / 2) or ""
            if not text:
                quiet_rounds += 1
                if quiet_rounds >= 2:
                    self.voice.say("I'll let you be. Say Hey Reachy whenever you want me.")
                    return
                self.voice.say("I'm still here if you need me.")
                continue
            quiet_rounds = 0
            if not self._dispatch(stop_event, text):
                return  # goodbye
            text = ""

    def _dispatch(self, stop_event: threading.Event, text: str) -> bool:
        """Route one utterance. Returns False when the conversation should end."""
        parsed = parse(text, emergency_active=self.emergency.active)
        intent = parsed.intent
        logger.info("Intent %s: %r", intent.value, text)

        if intent == Intent.EMERGENCY:
            self._handle_emergency(text)
        elif intent == Intent.CANCEL_EMERGENCY:
            if self.emergency.cancel():
                self.motion.neutral()
                self.voice.say(self.emergency.cancel_line())
            else:
                self.voice.say("All clear - there was no alert running. I'm glad you're okay!")
        elif intent == Intent.JOKE:
            self.motion.happy_wiggle()
            self.voice.say(self.jokes.tell())
        elif intent == Intent.STORY:
            self.motion.curious_tilt()
            self.voice.say(self.stories.tell())
        elif intent in (Intent.MUSIC_PLAY, Intent.PODCAST):
            self.voice.say(self.radio.play(text))
        elif intent == Intent.MUSIC_STOP:
            self.voice.say(self.radio.stop())
        elif intent == Intent.MUSIC_VOLUME:
            direction = parsed.slots.get("direction", "up")
            if self.radio.playing:
                self.voice.say(self.radio.change_volume(direction))
            else:
                step = 0.15 if direction == "up" else -0.15
                new_volume = float(min(1.0, max(0.2, self.settings.care.volume + step)))
                self.settings.update_care(volume=new_volume)
                self.voice.say("There we go. How's this?")
        elif intent == Intent.TRIVIA:
            self._safe(self._play_trivia, stop_event, text)
        elif intent == Intent.TWENTY_QUESTIONS:
            self._safe(self._play_guessing, stop_event, "twenty_questions")
        elif intent == Intent.AKINATOR:
            self._safe(self._play_guessing, stop_event, "akinator")
        elif intent == Intent.MED_TAKEN:
            name = self.meds.confirm_latest_reminded()
            if name:
                self.motion.nod_yes()
                self.voice.say(self.meds.confirmation_line(name))
            else:
                self.voice.say("Thanks for telling me! I had no reminder waiting, "
                               "but I've made a note. Well done for keeping on top of it.")
                self.db.log_event("med_selfreport", text)
        elif intent == Intent.MED_LIST:
            self.voice.say(self.meds.schedule_spoken())
        elif intent == Intent.MEAL_LOG:
            totals, foods = self.nutrition.log_meal(text)
            self.voice.say(self.nutrition.meal_reply(totals, foods))
        elif intent == Intent.HEALTH_SUMMARY:
            self.voice.say(self.nutrition.day_summary())
            self.voice.say(self.meds.daily_summary())
        elif intent == Intent.HABITS:
            self.voice.say(weekly_habits(self.db, self.nutrition))
        elif intent == Intent.TIMER_SET:
            self.voice.say(self.alarms.set_from_text(text, kind_hint="timer"))
        elif intent == Intent.ALARM_SET:
            self.voice.say(self.alarms.set_from_text(text, kind_hint="alarm"))
        elif intent == Intent.ALARM_LIST:
            self.voice.say(self.alarms.list_line())
        elif intent == Intent.ALARM_CANCEL:
            self.voice.say(self.alarms.cancel_all())
        elif intent == Intent.REMEMBER:
            self.motion.nod_yes()
            self.voice.say(self.memory.remember(text))
        elif intent == Intent.RECALL:
            self.motion.curious_tilt()
            self.voice.say(self.memory.recall_line(text))
        elif intent == Intent.PERSONALITY:
            self._switch_personality(text)
        elif intent == Intent.TIME:
            now = datetime.now()
            self.voice.say(f"It's {now.strftime('%-I:%M %p')} on {now.strftime('%A, %B %-d')}.")
        elif intent == Intent.HELP:
            self.voice.say(HELP_LINE)
        elif intent == Intent.GOODBYE:
            self.motion.gentle_sad()
            self.voice.say(random.choice([
                "Goodbye for now! Say Hey Reachy anytime.",
                "Sleep well! I'll be right here.",
                "Bye bye! It was lovely chatting.",
            ]))
            self.motion.neutral()
            return False
        else:
            self._chat(text)
        return True

    # ================= handlers =================

    def _handle_emergency(self, text: str) -> None:
        self.motion.stop_idle()
        self.motion.alert_attention()
        result = self.emergency.trigger(text)
        self.voice.say(self.emergency.response_line(result))
        self.voice.play_tone(EMERGENCY_SIREN, seconds_each=0.4, repeats=2, volume=1.0)
        self.voice.say("I'm staying right here with you. Talk to me.")
        self.motion.start_idle()

    def _chat(self, text: str) -> None:
        memories = self.memory.context_for_conversation(text)
        system = personalities.build_system_prompt(
            personalities.normalize(self.settings.care.personality),
            senior_name=self.settings.care.senior_name,
            memories=memories,
        )
        self._history.append({"role": "user", "content": text})
        self._history = self._history[-12:]
        reply = self.llm.chat(system, list(self._history)) if self.llm.available else None
        if reply:
            self._history.append({"role": "assistant", "content": reply})
            self.voice.say(reply)
            self._safe(maybe_auto_remember, self.memory, self.llm, text)
        else:
            self.voice.say(random.choice([
                "I love listening to you, though my clever thoughts are offline just now. "
                "Shall we do a joke or some trivia instead?",
                "My thinking cap is off at the moment, but I'm still here. "
                "How about a story or some music?",
            ]))

    def _switch_personality(self, text: str) -> None:
        key = personalities.normalize(text)
        current = personalities.normalize(self.settings.care.personality)
        if key == current and key not in text.lower():
            options = ", ".join(spec["label"] for spec in personalities.PERSONALITIES.values())
            self.voice.say(f"I can be your {options}. Which would you like?")
            choice = self.voice.listen(start_timeout_s=10.0)
            if choice:
                key = personalities.normalize(choice)
        self.settings.update_care(personality=key)
        self.motion.happy_wiggle()
        self.voice.say(personalities.PERSONALITIES[key]["intro"])

    def _play_trivia(self, stop_event: threading.Event, request: str) -> None:
        game = TriviaGame(category=request)
        self.voice.say(f"Let's play trivia! Today's category: {game.category}. "
                       "Say 'stop the game' whenever you've had enough.")
        while not stop_event.is_set():
            question = game.next_question()
            if question is None:
                break
            self.motion.curious_tilt()
            self.voice.say(question.question)
            answer = self.voice.listen(start_timeout_s=20.0)
            if answer and re.search(r"\bstop\b.*\bgame\b|\bstop playing\b|\benough\b", answer.lower()):
                break
            if answer and parse(answer).intent == Intent.EMERGENCY:
                self._handle_emergency(answer)
                return
            correct, feedback = game.grade(question, answer)
            if correct:
                self.motion.celebrate()
                self.voice.play_tone(CELEBRATE, seconds_each=0.18)
            else:
                self.motion.gentle_sad()
                self.motion.neutral()
            self.voice.say(feedback)
        self.voice.say(game.final_line())
        if game.score and game.score >= max(1, game.asked - 1):
            self.motion.celebrate()

    def _play_guessing(self, stop_event: threading.Event, mode: str) -> None:
        game = GuessingGame(self.llm, mode=mode)
        if not game.available:
            self.voice.say(OFFLINE_APOLOGY)
            return
        self.voice.say(game.opening_line())
        reply = self.voice.listen(start_timeout_s=20.0)
        line = game.next_line(reply or "Ready!")
        while line and not stop_event.is_set():
            self.motion.thinking(1.5 if mode == "akinator" else 0.8)
            self.voice.say(line)
            reply = self.voice.listen(start_timeout_s=25.0)
            if reply and parse(reply).intent == Intent.EMERGENCY:
                self._handle_emergency(reply)
                return
            if not reply:
                self.voice.say("Shall we keep playing? Say yes or no.")
                reply = self.voice.listen(start_timeout_s=15.0)
                if not reply or said_no(reply):
                    self.voice.say("Okay, we'll finish the game there. That was fun!")
                    return
            if is_guess(line) and said_yes(reply):
                self.motion.celebrate()
                self.voice.play_tone(CELEBRATE, seconds_each=0.18)
                self.voice.say(game.winning_line())
                return
            if game.out_of_questions():
                self.motion.gentle_sad()
                self.voice.say(game.losing_line())
                self.voice.listen(start_timeout_s=15.0)
                self.motion.neutral()
                self.voice.say("Wonderful choice! You got me good. Rematch anytime!")
                return
            line = game.next_line(reply)
        if line is None:
            self.voice.say("My thinking cap slipped mid-game - I'm sorry! Let's play again later.")
