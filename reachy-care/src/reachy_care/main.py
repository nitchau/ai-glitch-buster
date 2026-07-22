"""Entry point: ReachyCare as an official Reachy Mini app.

Registered in pyproject.toml under [project.entry-points."reachy_mini_apps"],
so the robot's dashboard can install and launch it with one click. Can also
run standalone:

    reachy-care                # connect to the robot (or MuJoCo simulator daemon)
    reachy-care --console      # no robot, no mics: type to Reachy, it prints back
"""

from __future__ import annotations

import sys
import logging
import argparse
import threading

logger = logging.getLogger(__name__)

try:  # the SDK is present on the robot; keep dev machines and CI working without it
    from reachy_mini import ReachyMini, ReachyMiniApp

    _SDK = True
except Exception:  # pragma: no cover - exercised implicitly in CI
    _SDK = False

    class ReachyMiniApp:  # type: ignore[no-redef]  (minimal shim for dev machines)
        settings_app = None

        def _get_instance_path(self):
            from pathlib import Path

            return Path.cwd() / "instance"

    ReachyMini = None  # type: ignore[assignment]


def _build(instance_path=None, mini=None):
    from .config import load_settings
    from .orchestrator import Orchestrator

    settings = load_settings(instance_path)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s: %(message)s",
        datefmt="%H:%M:%S",
    )
    return Orchestrator(settings, mini=mini)


class ReachyCareApp(ReachyMiniApp):
    """The class the Reachy Mini dashboard instantiates."""

    custom_app_url = "http://0.0.0.0:8042/"

    def run(self, reachy_mini, stop_event: threading.Event) -> None:
        instance_path = None
        try:
            instance_path = self._get_instance_path().parent
        except Exception:
            pass
        orchestrator = _build(instance_path=instance_path, mini=reachy_mini)

        from . import webapp

        # Prefer the dashboard-provided FastAPI app; else serve our own on 8042.
        server = None
        if getattr(self, "settings_app", None) is not None:
            try:
                webapp.build_routes(self.settings_app, orchestrator)
            except Exception as e:
                logger.warning("Could not mount settings routes: %s", e)
                server = webapp.serve_standalone(orchestrator)
        else:
            server = webapp.serve_standalone(orchestrator)

        try:
            orchestrator.run(stop_event)
        finally:
            if server is not None:
                server.should_exit = True


def main() -> None:
    parser = argparse.ArgumentParser(description="ReachyCare - senior companion for Reachy Mini")
    parser.add_argument("--console", action="store_true",
                        help="run without robot/microphone: type input, printed replies")
    args = parser.parse_args()

    if args.console:
        import os

        os.environ["REACHY_CARE_CONSOLE"] = "true"

    stop_event = threading.Event()

    if _SDK and not args.console:
        app = ReachyCareApp()
        try:
            app.wrapped_run()  # SDK helper: connects the robot, calls run()
        except AttributeError:  # older SDK without wrapped_run
            with ReachyMini() as mini:
                app.run(mini, stop_event)
        except KeyboardInterrupt:
            try:
                app.stop()
            except Exception:
                stop_event.set()
        return

    # Console / no-SDK path: full app, no hardware.
    orchestrator = _build()
    from . import webapp

    server = webapp.serve_standalone(orchestrator)
    try:
        orchestrator.run(stop_event)
    except KeyboardInterrupt:
        print("\nGoodbye!")
        stop_event.set()
    finally:
        if server is not None:
            server.should_exit = True
        sys.exit(0)


if __name__ == "__main__":
    main()
