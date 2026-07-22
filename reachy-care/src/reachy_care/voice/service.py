"""VoiceService: the one object every module talks through.

    voice.say("Hello!")            -> TTS through the robot speaker (or print)
    voice.listen()                 -> one utterance as text (STT or typed)
    voice.play_tone(CHIME)         -> generated chimes/alarms/siren
    voice.wait_for_wake(stop)      -> blocks until "Hey Reachy"

It never raises: on any engine failure it degrades to printing/typing.
"""

from __future__ import annotations

import logging
import threading

import numpy as np

from .audio_io import SAMPLE_RATE, BaseAudio, pick_audio_backend
from .stt import SpeechToText
from .tts import TextToSpeech, make_tone
from .wake import WakeWordDetector

logger = logging.getLogger(__name__)


class VoiceService:
    def __init__(self, settings, mini=None, motion=None):
        self.settings = settings
        self.motion = motion  # optional MotionService for look-at-speaker
        self.audio: BaseAudio = ConsoleForced() if settings.console_mode else pick_audio_backend(mini)
        self.stt = SpeechToText(settings)
        self.tts = TextToSpeech(settings)
        self.wake = WakeWordDetector(self.audio, self.stt, settings.data_dir)
        self._speak_lock = threading.Lock()

    # ---------------- output ----------------

    def say(self, text: str) -> None:
        """Speak (and always also log) one line. Never raises."""
        text = (text or "").strip()
        if not text:
            return
        print(f"[Reachy] {text}")
        try:
            if self.motion is not None:
                self.motion.talking_nudge()
        except Exception:
            pass
        result = None
        try:
            with self._speak_lock:
                result = self.tts.synthesize(text)
                if result is not None:
                    samples, rate = result
                    self.audio.play(samples, rate)
        except Exception as e:
            logger.warning("say() degraded to text only: %s", e)

    def play_tone(self, freqs: list[float], seconds_each: float = 0.35, repeats: int = 1,
                  volume: float | None = None) -> None:
        try:
            vol = self.settings.care.volume if volume is None else volume
            tone = make_tone(freqs, seconds_each=seconds_each, repeats=repeats,
                             volume=float(np.clip(vol, 0.0, 1.0)))
            with self._speak_lock:
                self.audio.play(tone, SAMPLE_RATE)
        except Exception as e:
            logger.debug("play_tone failed: %s", e)

    # ---------------- input ----------------

    def listen(self, max_seconds: float = 15.0, start_timeout_s: float | None = None) -> str | None:
        """One utterance -> text. Uses the mic + STT, or typed input in console
        mode / when no STT engine exists. Returns None on silence/timeout."""
        timeout = start_timeout_s if start_timeout_s is not None else 8.0
        try:
            if self.audio.is_console or not self.stt.available:
                if hasattr(self.audio, "read_text"):
                    return self.audio.read_text()
                return None
            if self.motion is not None:
                try:
                    self.motion.listening_pose(self.audio.direction_of_arrival())
                except Exception:
                    pass
            clip = self.audio.record_utterance(max_seconds=max_seconds,
                                               silence_after_s=2.0,
                                               start_timeout_s=timeout)
            if clip is None:
                return None
            return self.stt.transcribe(clip, SAMPLE_RATE)
        except Exception as e:
            logger.warning("listen() failed: %s", e)
            return None

    def wait_for_wake(self, stop_event: threading.Event) -> str | None:
        return self.wake.wait_for_wake(stop_event)

    def close(self) -> None:
        try:
            self.audio.close()
        except Exception:
            pass


class ConsoleForced:
    """Tiny helper so REACHY_CARE_CONSOLE=true always types/prints."""

    is_console = True

    def read_text(self, prompt: str = "you> "):
        try:
            text = input(prompt).strip()
            return text or None
        except EOFError:  # Ctrl-D / end of piped input = quit cleanly
            raise KeyboardInterrupt from None

    def record_utterance(self, **kwargs):
        return None

    def play(self, samples, samplerate=SAMPLE_RATE):
        pass

    def direction_of_arrival(self):
        return None

    def speech_detected(self):
        return False

    def close(self):
        pass
