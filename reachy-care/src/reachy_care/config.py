"""Configuration for ReachyCare.

Two layers:
- .env / environment variables: API keys and provider choices (never stored in git).
- config.yaml in the data directory: caregiver contact, personality, volume,
  check-in time... i.e. everything a caregiver may edit on the settings page.
"""

from __future__ import annotations

import os
import logging
import threading
from pathlib import Path
from dataclasses import dataclass, asdict, field

import yaml

logger = logging.getLogger(__name__)

APP_NAME = "ReachyCare"

MEDICAL_DISCLAIMER = (
    "A quick note: I'm a friendly companion, not a medical device or a doctor. "
    "I can remind you about the medication schedule your caregiver set up, "
    "but for any health question or worry, please talk to your doctor. "
    "My emergency button alerts your caregiver - it is not a replacement "
    "for a phone or a medical alert device."
)


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name, "")
    if not raw:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


@dataclass
class CareConfig:
    """Caregiver-editable settings, persisted to config.yaml."""

    personality: str = "cheerful_friend"
    volume: float = 0.9               # 0.0 - 1.0, seniors get a louder default
    speech_rate: float = 0.9          # < 1.0 = slower than normal speech
    caregiver_name: str = "your caregiver"
    caregiver_phone: str = ""         # E.164, e.g. +15551234567
    senior_name: str = "friend"
    checkin_time: str = "09:30"       # daily proactive check-in (HH:MM, local)
    wake_word: str = "hey reachy"
    quiet_timeout_s: float = 25.0     # end conversation after this much silence
    remind_again_minutes: int = 10    # med re-reminder delay when unconfirmed
    onboarded: bool = False           # medical disclaimer spoken once at first run

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "CareConfig":
        known = {f for f in cls.__dataclass_fields__}
        return cls(**{k: v for k, v in (data or {}).items() if k in known})


@dataclass
class Settings:
    """Full runtime settings: env-derived keys + persisted CareConfig."""

    data_dir: Path
    care: CareConfig = field(default_factory=CareConfig)

    # Providers / keys straight from the environment
    llm_provider: str = "anthropic"
    stt_provider: str = "openai"
    tts_provider: str = "openai"
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""
    usda_api_key: str = ""
    demo_mode: bool = True
    console_mode: bool = False

    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    @property
    def config_path(self) -> Path:
        return self.data_dir / "config.yaml"

    @property
    def db_path(self) -> Path:
        return self.data_dir / "reachy_care.db"

    def save(self) -> None:
        """Persist the caregiver-editable part to config.yaml."""
        with self._lock:
            self.data_dir.mkdir(parents=True, exist_ok=True)
            self.config_path.write_text(yaml.safe_dump(self.care.to_dict(), sort_keys=True))

    def update_care(self, **changes) -> None:
        """Apply settings-page changes and persist them."""
        for key, value in changes.items():
            if hasattr(self.care, key) and value is not None:
                setattr(self.care, key, value)
        self.save()


def load_settings(instance_path: str | os.PathLike | None = None) -> Settings:
    """Build Settings from environment + config.yaml.

    ``instance_path`` is where the Reachy Mini dashboard installs the app; we keep
    all data there so it survives restarts and stays local to the robot.
    """
    try:
        from dotenv import load_dotenv

        if instance_path is not None and (Path(instance_path) / ".env").exists():
            load_dotenv(Path(instance_path) / ".env", override=True)
        else:
            load_dotenv()  # cwd .env, if any
    except Exception:  # pragma: no cover - dotenv is a soft dependency
        pass

    env_dir = os.environ.get("REACHY_CARE_DATA_DIR", "").strip()
    if env_dir:
        data_dir = Path(env_dir)
    elif instance_path is not None:
        data_dir = Path(instance_path) / "reachy_care_data"
    else:
        data_dir = Path.cwd() / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    settings = Settings(
        data_dir=data_dir,
        llm_provider=os.environ.get("REACHY_CARE_LLM_PROVIDER", "anthropic").strip().lower(),
        stt_provider=os.environ.get("REACHY_CARE_STT_PROVIDER", "openai").strip().lower(),
        tts_provider=os.environ.get("REACHY_CARE_TTS_PROVIDER", "openai").strip().lower(),
        anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY", "").strip(),
        openai_api_key=os.environ.get("OPENAI_API_KEY", "").strip(),
        twilio_account_sid=os.environ.get("TWILIO_ACCOUNT_SID", "").strip(),
        twilio_auth_token=os.environ.get("TWILIO_AUTH_TOKEN", "").strip(),
        twilio_from_number=os.environ.get("TWILIO_FROM_NUMBER", "").strip(),
        usda_api_key=os.environ.get("USDA_API_KEY", "").strip(),
        demo_mode=_env_bool("REACHY_CARE_DEMO_MODE", True),
        console_mode=_env_bool("REACHY_CARE_CONSOLE", False),
    )

    if settings.config_path.exists():
        try:
            settings.care = CareConfig.from_dict(yaml.safe_load(settings.config_path.read_text()) or {})
        except Exception as e:
            logger.warning("Could not read %s (%s); using defaults", settings.config_path, e)
    else:
        settings.save()

    return settings
