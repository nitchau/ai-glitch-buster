"""Speech-to-text with graceful fallbacks.

Order of preference:
1. OpenAI Whisper API (cloud - light on the Pi, needs OPENAI_API_KEY)
2. faster-whisper running locally (optional heavy dependency)
3. None - the caller falls back to console/typed input.
"""

from __future__ import annotations

import io
import wave
import logging

import numpy as np

logger = logging.getLogger(__name__)


def to_wav_bytes(samples: np.ndarray, samplerate: int = 16000) -> bytes:
    """Mono float32 [-1, 1] -> in-memory 16-bit PCM WAV."""
    pcm = (np.clip(samples, -1.0, 1.0) * 32767.0).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(samplerate)
        w.writeframes(pcm.tobytes())
    return buf.getvalue()


class SpeechToText:
    def __init__(self, settings):
        self.settings = settings
        self._openai = None
        self._local_model = None

        if settings.stt_provider == "openai" and settings.openai_api_key:
            try:
                from openai import OpenAI

                self._openai = OpenAI(api_key=settings.openai_api_key)
                logger.info("STT: OpenAI Whisper API")
            except Exception as e:
                logger.warning("STT: openai package unavailable (%s)", e)
        if self._openai is None:
            try:
                from faster_whisper import WhisperModel

                self._local_model = WhisperModel("base.en", compute_type="int8")
                logger.info("STT: local faster-whisper (base.en)")
            except Exception:
                logger.info("STT: no engine available - console/typed input only")

    @property
    def available(self) -> bool:
        return self._openai is not None or self._local_model is not None

    def transcribe(self, samples: np.ndarray, samplerate: int = 16000) -> str | None:
        try:
            if self._openai is not None:
                wav = to_wav_bytes(samples, samplerate)
                result = self._openai.audio.transcriptions.create(
                    model="whisper-1",
                    file=("speech.wav", wav, "audio/wav"),
                    language="en",
                )
                text = (result.text or "").strip()
                return text or None
            if self._local_model is not None:
                segments, _ = self._local_model.transcribe(samples.astype(np.float32), language="en")
                text = " ".join(s.text.strip() for s in segments).strip()
                return text or None
        except Exception as e:
            logger.warning("STT failed: %s", e)
        return None
