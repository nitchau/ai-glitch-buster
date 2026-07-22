"""Internet radio / podcast streaming with voice-controlled volume.

Streams are played with ffplay (or mpv) in a subprocess: simple, robust, and
easy to stop. On the Wireless robot both are available via apt; the Lite
version plays through the connected computer. Offline -> friendly apology.
"""

from __future__ import annotations

import re
import shutil
import logging
import subprocess

logger = logging.getLogger(__name__)

# name -> (spoken label, stream URL). Curated senior-friendly defaults;
# caregivers can add more from the settings page later.
STATIONS: dict[str, tuple[str, str]] = {
    "classical": ("Classical KING FM", "https://classicalking.streamguys1.com/king-fm-aac-iheart"),
    "jazz": ("Jazz 24", "https://live.amperwave.net/direct/ppm-jazz24aac-ibc1"),
    "oldies": ("Oldies FM", "https://streaming.oldies.fm/stream"),
    "news": ("NPR News", "https://npr-ice.streamguys1.com/live.mp3"),
    "relaxing": ("Calm Radio", "https://streams.calmradio.com/api/39/128/stream"),
}
DEFAULT_STATION = "oldies"


class RadioPlayer:
    def __init__(self, volume: float = 0.9):
        self.volume = volume  # 0..1
        self._process: subprocess.Popen | None = None
        self._current: str | None = None

    @staticmethod
    def _player_cmd(url: str, volume: float) -> list[str] | None:
        if shutil.which("ffplay"):
            return ["ffplay", "-nodisp", "-loglevel", "quiet",
                    "-volume", str(int(volume * 100)), url]
        if shutil.which("mpv"):
            return ["mpv", "--no-video", "--really-quiet",
                    f"--volume={int(volume * 100)}", url]
        return None

    @staticmethod
    def match_station(text: str | None) -> str:
        lowered = (text or "").lower()
        for key in STATIONS:
            if key in lowered:
                return key
        if re.search(r"\bnews|npr\b", lowered):
            return "news"
        if re.search(r"\bcalm|relax|sooth", lowered):
            return "relaxing"
        return DEFAULT_STATION

    @property
    def playing(self) -> bool:
        return self._process is not None and self._process.poll() is None

    def play(self, request_text: str | None = None, url: str | None = None) -> str:
        """Start a station (or explicit URL). Returns the spoken confirmation."""
        self.stop()
        key = self.match_station(request_text)
        label, stream = STATIONS[key] if url is None else ("your station", url)
        cmd = self._player_cmd(stream, self.volume)
        if cmd is None:
            return ("I'd love to put the radio on, but I can't find my music player. "
                    "Ask a helper to install ffplay for me.")
        try:
            self._process = subprocess.Popen(cmd, stdout=subprocess.DEVNULL,
                                             stderr=subprocess.DEVNULL)
            self._current = label
            return f"Here's {label} for you. Say 'stop the music' whenever you like."
        except Exception as e:
            logger.warning("radio failed: %s", e)
            return "Hmm, that station isn't coming through right now. Shall we try later?"

    def stop(self) -> str:
        if self._process is not None:
            try:
                self._process.terminate()
                self._process.wait(timeout=3)
            except Exception:
                try:
                    self._process.kill()
                except Exception:
                    pass
            self._process = None
        label, self._current = self._current, None
        return f"Okay, I've turned off {label}." if label else "The music is already off."

    def change_volume(self, direction: str) -> str:
        """ffplay can't change volume mid-stream, so we restart the stream."""
        step = 0.15 if direction == "up" else -0.15
        self.volume = max(0.1, min(1.0, self.volume + step))
        if self.playing and self._current:
            for key, (label, url) in STATIONS.items():
                if label == self._current:
                    self.play(key)
                    break
        word = "louder" if step > 0 else "softer"
        return f"Okay, a bit {word} now."
