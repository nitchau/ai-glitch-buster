"""Wake word detection for "Hey Reachy".

Strategies, best available wins:
1. openWakeWord with a custom "hey reachy" model if you trained one
   (put the .onnx/.tflite file in the data dir as ``hey_reachy.onnx``).
2. STT-confirm: when the mic hears speech, transcribe a short clip and
   fuzzy-match "hey reachy" / "reachy". Zero extra dependencies.
3. Console: pressing Enter wakes Reachy (typed/dev mode).
"""

from __future__ import annotations

import re
import time
import logging
import threading
from pathlib import Path

import numpy as np

from .audio_io import SAMPLE_RATE, BaseAudio

logger = logging.getLogger(__name__)

WAKE_PATTERNS = [
    r"\bhey\s+reach", r"\bhi\s+reach", r"\bhello\s+reach",
    r"\breachy\b", r"\breach[iey]{1,2}\b", r"\bricci\b", r"\britchie\b",  # common mis-hearings
]


def is_wake_phrase(text: str | None) -> bool:
    if not text:
        return False
    lowered = text.lower()
    return any(re.search(p, lowered) for p in WAKE_PATTERNS)


class WakeWordDetector:
    def __init__(self, audio: BaseAudio, stt, data_dir: Path | None = None):
        self.audio = audio
        self.stt = stt
        self._oww = None
        model_path = (data_dir / "hey_reachy.onnx") if data_dir else None
        try:
            if model_path is not None and model_path.exists():
                from openwakeword.model import Model

                self._oww = Model(wakeword_models=[str(model_path)])
                logger.info("Wake word: openWakeWord custom model %s", model_path.name)
            else:
                logger.info("Wake word: STT-confirm strategy (no custom model found)")
        except Exception as e:
            logger.info("Wake word: openWakeWord unavailable (%s); using STT-confirm", e)

    def wait_for_wake(self, stop_event: threading.Event,
                      poll_interval: float = 0.4) -> str | None:
        """Block until the wake word is heard (or stop_event is set).

        Returns the transcript that contained the wake word (so the caller can
        also react to e.g. "hey reachy, help!" in one breath), or "" when the
        detector fired without a transcript, or None when stopping.
        """
        if self.audio.is_console:
            print("\n[ReachyCare] Press Enter to say 'Hey Reachy' (or type a first sentence):")
            text = self.audio.read_text("wake> ")
            return text or ""

        while not stop_event.is_set():
            if self._oww is not None:
                fired = self._listen_openwakeword(stop_event)
                if fired:
                    return ""
                continue

            # STT-confirm strategy: cheap energy/DoA gate first, then transcribe.
            if self.audio.speech_detected():
                clip = self.audio.record_utterance(max_seconds=5.0, silence_after_s=1.0,
                                                   start_timeout_s=2.0)
                if clip is not None and self.stt is not None and self.stt.available:
                    text = self.stt.transcribe(clip, SAMPLE_RATE)
                    if is_wake_phrase(text):
                        logger.info("Wake word heard: %r", text)
                        return text or ""
            time.sleep(poll_interval)
        return None

    def _listen_openwakeword(self, stop_event: threading.Event) -> bool:
        """Feed mic chunks to openWakeWord until it fires or we time out."""
        deadline = time.monotonic() + 3.0
        while not stop_event.is_set() and time.monotonic() < deadline:
            chunk = getattr(self.audio, "_read_chunk", lambda: np.zeros(0, dtype=np.float32))()
            if chunk.size == 0:
                time.sleep(0.02)
                continue
            pcm = (np.clip(chunk, -1, 1) * 32767).astype(np.int16)
            try:
                prediction = self._oww.predict(pcm)
                if any(score > 0.6 for score in prediction.values()):
                    return True
            except Exception as e:
                logger.debug("openWakeWord predict failed: %s", e)
                return False
        return False
