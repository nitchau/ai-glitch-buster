"""Audio input/output backends.

Three backends, picked automatically:
- RobotAudio: the Reachy Mini microphone array + speaker (16 kHz float32 frames).
- LocalAudio: laptop mic/speakers via sounddevice (useful with the simulator).
- ConsoleAudio: no audio at all - you type, Reachy prints. Never crashes anywhere.

All of them expose the same small surface used by VoiceService:
    record_utterance(...)  -> mono float32 numpy array (or None)
    play(samples, samplerate)
    direction_of_arrival() -> (angle_rad, is_speech) or None
    speech_detected()      -> bool  (cheap "is someone talking?" check)
"""

from __future__ import annotations

import time
import logging

import numpy as np

logger = logging.getLogger(__name__)

SAMPLE_RATE = 16000  # Reachy Mini's media pipeline runs at 16 kHz


def rms(samples: np.ndarray) -> float:
    if samples.size == 0:
        return 0.0
    return float(np.sqrt(np.mean(np.square(samples, dtype=np.float64))))


def resample_linear(samples: np.ndarray, src_rate: int, dst_rate: int) -> np.ndarray:
    """Tiny linear resampler so we don't need scipy on the robot."""
    if src_rate == dst_rate or samples.size == 0:
        return samples.astype(np.float32)
    duration = samples.shape[0] / src_rate
    n_out = max(1, int(round(duration * dst_rate)))
    x_old = np.linspace(0.0, duration, num=samples.shape[0], endpoint=False)
    x_new = np.linspace(0.0, duration, num=n_out, endpoint=False)
    return np.interp(x_new, x_old, samples).astype(np.float32)


class BaseAudio:
    is_console = False

    def record_utterance(self, max_seconds: float = 15.0, silence_after_s: float = 2.0,
                         start_timeout_s: float = 8.0) -> np.ndarray | None:
        raise NotImplementedError

    def play(self, samples: np.ndarray, samplerate: int = SAMPLE_RATE) -> None:
        raise NotImplementedError

    def direction_of_arrival(self) -> tuple[float, bool] | None:
        return None

    def speech_detected(self) -> bool:
        return False

    def close(self) -> None:
        pass


class RobotAudio(BaseAudio):
    """Reachy Mini microphone array + speaker via ``mini.media``."""

    # Energy threshold for "someone is speaking"; tuned generously for seniors.
    ENERGY_THRESHOLD = 0.012

    def __init__(self, mini):
        self.mini = mini
        self.media = mini.media
        try:
            self.media.start_recording()
            self.media.start_playing()
        except Exception as e:  # already started is fine
            logger.debug("media start: %s", e)

    def _read_chunk(self) -> np.ndarray:
        """One chunk of mono float32 audio from the mic array (may be empty)."""
        try:
            samples = self.media.get_audio_sample()
        except Exception as e:
            logger.debug("get_audio_sample failed: %s", e)
            return np.zeros(0, dtype=np.float32)
        if samples is None or len(samples) == 0:
            return np.zeros(0, dtype=np.float32)
        samples = np.asarray(samples, dtype=np.float32)
        if samples.ndim == 2:  # (n, 2) stereo -> mono
            samples = samples.mean(axis=1)
        return samples

    def record_utterance(self, max_seconds: float = 15.0, silence_after_s: float = 2.0,
                         start_timeout_s: float = 8.0) -> np.ndarray | None:
        """Record one spoken utterance: wait for speech, stop after a long-ish
        silence. Long pauses are fine - seniors are never rushed."""
        chunks: list[np.ndarray] = []
        started = False
        silent_for = 0.0
        t0 = time.monotonic()
        last = t0
        while True:
            chunk = self._read_chunk()
            now = time.monotonic()
            dt, last = now - last, now
            if chunk.size:
                loud = rms(chunk) > self.ENERGY_THRESHOLD
                if loud:
                    started = True
                    silent_for = 0.0
                elif started:
                    silent_for += dt
                if started:
                    chunks.append(chunk)
            else:
                time.sleep(0.02)
                if started:
                    silent_for += 0.02
            if not started and now - t0 > start_timeout_s:
                return None
            if started and (silent_for >= silence_after_s or now - t0 > max_seconds + start_timeout_s):
                break
        audio = np.concatenate(chunks) if chunks else np.zeros(0, dtype=np.float32)
        return audio if audio.size > SAMPLE_RATE // 4 else None  # ignore blips < 0.25 s

    def play(self, samples: np.ndarray, samplerate: int = SAMPLE_RATE) -> None:
        samples = resample_linear(np.asarray(samples, dtype=np.float32).flatten(), samplerate, SAMPLE_RATE)
        try:
            self.media.push_audio_sample(samples.reshape(-1, 1))
            # push_audio_sample is non-blocking: wait for playback to finish
            time.sleep(len(samples) / SAMPLE_RATE + 0.15)
        except Exception as e:
            logger.warning("push_audio_sample failed: %s", e)

    def direction_of_arrival(self) -> tuple[float, bool] | None:
        try:
            doa, is_speech = self.media.get_DoA()
            return float(doa), bool(is_speech)
        except Exception:
            return None

    def speech_detected(self) -> bool:
        d = self.direction_of_arrival()
        if d is not None:
            return d[1]
        chunk = self._read_chunk()
        return chunk.size > 0 and rms(chunk) > self.ENERGY_THRESHOLD


class LocalAudio(BaseAudio):
    """Laptop microphone/speakers via sounddevice (for simulator work)."""

    ENERGY_THRESHOLD = 0.015

    def __init__(self):
        import sounddevice as sd  # optional dependency

        self.sd = sd

    def record_utterance(self, max_seconds: float = 15.0, silence_after_s: float = 2.0,
                         start_timeout_s: float = 8.0) -> np.ndarray | None:
        block = int(SAMPLE_RATE * 0.1)
        chunks: list[np.ndarray] = []
        started = False
        silent_for = 0.0
        waited = 0.0
        with self.sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype="float32") as stream:
            while True:
                chunk, _ = stream.read(block)
                chunk = chunk[:, 0]
                if rms(chunk) > self.ENERGY_THRESHOLD:
                    started = True
                    silent_for = 0.0
                elif started:
                    silent_for += 0.1
                else:
                    waited += 0.1
                if started:
                    chunks.append(chunk.copy())
                if not started and waited > start_timeout_s:
                    return None
                if started and (silent_for >= silence_after_s or len(chunks) * 0.1 > max_seconds):
                    break
        audio = np.concatenate(chunks) if chunks else np.zeros(0, dtype=np.float32)
        return audio if audio.size > SAMPLE_RATE // 4 else None

    def play(self, samples: np.ndarray, samplerate: int = SAMPLE_RATE) -> None:
        self.sd.play(np.asarray(samples, dtype=np.float32), samplerate)
        self.sd.wait()

    def speech_detected(self) -> bool:
        block = int(SAMPLE_RATE * 0.2)
        rec = self.sd.rec(block, samplerate=SAMPLE_RATE, channels=1, dtype="float32")
        self.sd.wait()
        return rms(rec[:, 0]) > self.ENERGY_THRESHOLD


class ConsoleAudio(BaseAudio):
    """Typed input / printed output. Lets everything run with zero hardware."""

    is_console = True

    def record_utterance(self, max_seconds: float = 15.0, silence_after_s: float = 2.0,
                         start_timeout_s: float = 8.0) -> np.ndarray | None:
        return None  # ConsoleAudio users go through VoiceService.listen_text()

    def read_text(self, prompt: str = "you> ") -> str | None:
        try:
            text = input(prompt).strip()
            return text or None
        except EOFError:  # Ctrl-D / end of piped input = quit cleanly
            raise KeyboardInterrupt from None

    def play(self, samples: np.ndarray, samplerate: int = SAMPLE_RATE) -> None:
        pass  # nothing to play in console mode

    def speech_detected(self) -> bool:
        return False


def pick_audio_backend(mini=None) -> BaseAudio:
    """Robot if we have one, else laptop audio, else console."""
    if mini is not None:
        try:
            return RobotAudio(mini)
        except Exception as e:
            logger.warning("Robot audio unavailable (%s); trying local audio", e)
    try:
        return LocalAudio()
    except Exception:
        logger.info("No audio hardware available; using console (typed) mode")
        return ConsoleAudio()
