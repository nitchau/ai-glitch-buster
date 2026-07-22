"""Text-to-speech with graceful fallbacks.

Order of preference:
1. OpenAI TTS (cloud, warm voices, supports a slower speaking rate)
2. pyttsx3 (offline, robotic but reliable)
3. None - the caller prints the line instead of speaking it.

Senior-friendly defaults come from CareConfig: slower rate, louder volume.
"""

from __future__ import annotations

import io
import wave
import logging

import numpy as np

logger = logging.getLogger(__name__)


def wav_bytes_to_samples(wav_bytes: bytes) -> tuple[np.ndarray, int]:
    with wave.open(io.BytesIO(wav_bytes), "rb") as w:
        rate = w.getframerate()
        n_channels = w.getnchannels()
        width = w.getsampwidth()
        frames = w.readframes(w.getnframes())
    if width == 2:
        samples = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
    else:  # 8-bit unsigned or 32-bit - normalize whatever we got
        samples = np.frombuffer(frames, dtype=np.uint8).astype(np.float32) / 128.0 - 1.0
    if n_channels > 1:
        samples = samples.reshape(-1, n_channels).mean(axis=1)
    return samples, rate


class TextToSpeech:
    def __init__(self, settings):
        self.settings = settings
        self._openai = None
        self._pyttsx3 = None

        if settings.tts_provider == "openai" and settings.openai_api_key:
            try:
                from openai import OpenAI

                self._openai = OpenAI(api_key=settings.openai_api_key)
                logger.info("TTS: OpenAI (voice: nova)")
            except Exception as e:
                logger.warning("TTS: openai package unavailable (%s)", e)
        if self._openai is None:
            try:
                import pyttsx3

                self._pyttsx3 = pyttsx3.init()
                logger.info("TTS: local pyttsx3")
            except Exception:
                logger.info("TTS: no engine available - lines will be printed")

    @property
    def available(self) -> bool:
        return self._openai is not None or self._pyttsx3 is not None

    def synthesize(self, text: str) -> tuple[np.ndarray, int] | None:
        """Return (mono float32 samples, samplerate), volume/rate already applied."""
        care = self.settings.care
        try:
            if self._openai is not None:
                response = self._openai.audio.speech.create(
                    model="gpt-4o-mini-tts",
                    voice="nova",
                    input=text,
                    response_format="wav",
                    speed=max(0.5, min(1.5, care.speech_rate)),
                )
                samples, rate = wav_bytes_to_samples(response.content)
                return samples * float(np.clip(care.volume, 0.0, 1.0)), rate
            if self._pyttsx3 is not None:
                import tempfile, os

                self._pyttsx3.setProperty("rate", int(175 * care.speech_rate))
                self._pyttsx3.setProperty("volume", float(np.clip(care.volume, 0.0, 1.0)))
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                    path = f.name
                self._pyttsx3.save_to_file(text, path)
                self._pyttsx3.runAndWait()
                samples, rate = wav_bytes_to_samples(open(path, "rb").read())
                os.unlink(path)
                return samples, rate
        except Exception as e:
            logger.warning("TTS failed: %s", e)
        return None


def make_tone(freqs: list[float], seconds_each: float = 0.35, samplerate: int = 16000,
              volume: float = 0.8, repeats: int = 1) -> np.ndarray:
    """Generate a simple tone sequence (chimes, alarm rings, alert siren)."""
    parts = []
    n = int(samplerate * seconds_each)
    t = np.arange(n) / samplerate
    envelope = np.minimum(1.0, np.minimum(t / 0.02, (seconds_each - t) / 0.05).clip(min=0.0))
    for _ in range(repeats):
        for f in freqs:
            parts.append(np.sin(2 * np.pi * f * t) * envelope)
    return (np.concatenate(parts) * volume).astype(np.float32)


CHIME = [660.0, 880.0]                    # gentle two-note chime (reminders)
CELEBRATE = [523.25, 659.25, 783.99]      # C-E-G arpeggio (trivia wins)
ALARM = [880.0, 660.0, 880.0, 660.0]      # alarm clock ring
EMERGENCY_SIREN = [880.0, 587.33] * 4     # loud alternating siren
