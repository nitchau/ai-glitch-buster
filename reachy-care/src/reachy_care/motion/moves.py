"""MotionService: every physical expression ReachyCare uses.

All motion goes through the official SDK (goto_target + create_head_pose) and
stays smooth and small - rule 1: never scary, never harsh. Every method is a
safe no-op when there is no robot (console/simulator-less dev), so the rest
of the app never needs to check.

DoA convention from the SDK: 0 = left, pi/2 = front/back, pi = right.
"""

from __future__ import annotations

import math
import time
import logging
import threading

logger = logging.getLogger(__name__)

MAX_BODY_YAW_DEG = 60  # keep turns gentle and well inside limits


class MotionService:
    def __init__(self, mini=None):
        self.mini = mini
        self._np = None
        self._create_head_pose = None
        self._lock = threading.Lock()
        self._idle_stop = threading.Event()
        self._idle_thread: threading.Thread | None = None
        if mini is not None:
            try:
                import numpy as np
                from reachy_mini.utils import create_head_pose

                self._np = np
                self._create_head_pose = create_head_pose
            except Exception as e:
                logger.warning("Motion disabled (SDK utils unavailable: %s)", e)
                self.mini = None

    @property
    def enabled(self) -> bool:
        return self.mini is not None and self._create_head_pose is not None

    def _goto(self, duration: float = 0.8, method: str = "minjerk", *, roll: float = 0.0,
              pitch: float = 0.0, yaw: float = 0.0, z_mm: float = 0.0,
              antennas_deg: tuple[float, float] | None = None,
              body_yaw_deg: float | None = None) -> None:
        """One smooth, clamped move. Angles in degrees; never raises."""
        if not self.enabled:
            return
        np = self._np
        try:
            kwargs = {
                "head": self._create_head_pose(
                    roll=np.deg2rad(float(max(-25, min(25, roll)))),
                    pitch=np.deg2rad(float(max(-25, min(25, pitch)))),
                    yaw=np.deg2rad(float(max(-45, min(45, yaw)))),
                    z=float(max(-15, min(15, z_mm))),
                    mm=True,
                ),
                "duration": max(0.5, duration),  # SDK guidance: gestures >= 0.5 s
                "method": method,
            }
            if antennas_deg is not None:
                kwargs["antennas"] = np.deg2rad(np.array(antennas_deg, dtype=float))
            if body_yaw_deg is not None:
                clamped = max(-MAX_BODY_YAW_DEG, min(MAX_BODY_YAW_DEG, body_yaw_deg))
                kwargs["body_yaw"] = float(np.deg2rad(clamped))
            with self._lock:
                self.mini.goto_target(**kwargs)
        except Exception as e:
            logger.debug("goto_target failed: %s", e)

    # ---------------- expressions ----------------

    def neutral(self, duration: float = 1.0) -> None:
        self._goto(duration, antennas_deg=(0, 0), body_yaw_deg=0)

    def look_toward(self, doa: tuple[float, bool] | None) -> None:
        """Turn gently toward the person speaking (sound direction of arrival)."""
        if doa is None:
            return
        angle, _ = doa
        # DoA: 0=left, pi/2=front, pi=right -> signed turn: +left / -right
        turn_deg = math.degrees((math.pi / 2) - angle)
        turn_deg = max(-MAX_BODY_YAW_DEG, min(MAX_BODY_YAW_DEG, turn_deg))
        self._goto(0.9, body_yaw_deg=turn_deg, yaw=turn_deg * 0.3)

    def listening_pose(self, doa=None) -> None:
        """Attentive: slight head tilt, antennas softly up, face the speaker."""
        if doa is not None:
            self.look_toward(doa)
        self._goto(0.7, roll=6, pitch=-4, antennas_deg=(15, 25))

    def talking_nudge(self) -> None:
        """A tiny lively motion when starting to speak."""
        self._goto(0.5, pitch=-3, z_mm=3, antennas_deg=(10, 10))

    def nod_yes(self) -> None:
        self._goto(0.5, pitch=10)
        self._goto(0.5, pitch=-6)
        self._goto(0.5, pitch=0)

    def curious_tilt(self) -> None:
        self._goto(0.8, roll=12, pitch=-5, antennas_deg=(30, 5))

    def happy_wiggle(self) -> None:
        """Happy antenna wiggle - the signature 'glad to see you' move."""
        for left, right in ((35, -35), (-35, 35), (25, -25), (0, 0)):
            self._goto(0.5, antennas_deg=(left, right), z_mm=2)

    def celebrate(self) -> None:
        """Trivia-win celebration: bouncy head + big antenna waves."""
        self._goto(0.5, z_mm=8, antennas_deg=(45, 45))
        self._goto(0.5, z_mm=-4, antennas_deg=(-20, -20))
        self._goto(0.5, z_mm=5, antennas_deg=(35, 35), method="cartoon")
        self.neutral(0.8)

    def gentle_sad(self) -> None:
        """Soft sympathy: head slightly down, antennas drooping - never dramatic."""
        self._goto(1.2, pitch=10, z_mm=-5, antennas_deg=(-30, -30))

    def thinking(self, seconds: float = 2.0) -> None:
        """Dramatic genie 'thinking' for Akinator/20 Questions."""
        self._goto(0.7, roll=-10, pitch=-8, yaw=15, antennas_deg=(40, -10))
        if seconds > 1.4:
            self._goto(0.7, roll=10, yaw=-15, antennas_deg=(-10, 40))
        self.neutral(0.7)

    def alert_attention(self) -> None:
        """Emergency: upright, antennas straight up. Alert but calm - not scary."""
        self._goto(0.6, pitch=-8, z_mm=8, antennas_deg=(60, 60), body_yaw_deg=0)

    def sleepy(self) -> None:
        self._goto(1.5, pitch=14, z_mm=-8, antennas_deg=(-40, -40))

    # ---------------- idle life ----------------

    def start_idle(self) -> None:
        """Subtle breathing while listening/waiting, in a background thread."""
        if not self.enabled or self._idle_thread is not None:
            return
        self._idle_stop.clear()

        def breathe() -> None:
            phase = 0
            while not self._idle_stop.wait(3.5):
                phase += 1
                self._goto(1.6, z_mm=3 if phase % 2 else -2,
                           antennas_deg=(6, 6) if phase % 2 else (0, 0),
                           method="ease_in_out")

        self._idle_thread = threading.Thread(target=breathe, daemon=True, name="idle-motion")
        self._idle_thread.start()

    def stop_idle(self) -> None:
        self._idle_stop.set()
        if self._idle_thread is not None:
            self._idle_thread.join(timeout=2.0)
            self._idle_thread = None

    def shutdown(self) -> None:
        self.stop_idle()
        if not self.enabled:
            return
        try:
            self.sleepy()
            time.sleep(0.3)
        except Exception:
            pass
