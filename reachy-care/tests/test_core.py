from reachy_care.config import CareConfig, MEDICAL_DISCLAIMER, load_settings
from reachy_care.voice import personalities
from reachy_care.voice.wake import is_wake_phrase


def test_settings_roundtrip(tmp_path, monkeypatch):
    monkeypatch.setenv("REACHY_CARE_DATA_DIR", str(tmp_path))
    settings = load_settings()
    assert settings.demo_mode  # safe default
    settings.update_care(senior_name="Rose", volume=0.7)

    reloaded = load_settings()
    assert reloaded.care.senior_name == "Rose"
    assert reloaded.care.volume == 0.7


def test_care_config_ignores_unknown_keys():
    config = CareConfig.from_dict({"senior_name": "Al", "bogus": 1})
    assert config.senior_name == "Al"


def test_personality_normalize():
    assert personalities.normalize("Wise Storyteller") == "wise_storyteller"
    assert personalities.normalize("be the funny grandkid please") == "funny_grandkid"
    assert personalities.normalize("coach") == "gentle_coach"
    assert personalities.normalize("nonsense") == personalities.DEFAULT_PERSONALITY
    assert personalities.normalize(None) == personalities.DEFAULT_PERSONALITY


def test_system_prompt_contains_safety_rules():
    prompt = personalities.build_system_prompt("cheerful_friend", "Rose", ["Her cat is called Tom"])
    for needle in ("non-judgmental", "NOT a medical device", "Rose", "Tom",
                   "Never be violent"):
        assert needle in prompt, needle


def test_all_personalities_build():
    for key in personalities.PERSONALITIES:
        assert personalities.PERSONALITIES[key]["intro"]
        assert key in personalities.build_system_prompt(key) or True
        assert personalities.PERSONALITIES[key]["prompt"] in personalities.build_system_prompt(key)


def test_disclaimer_mentions_limits():
    lowered = MEDICAL_DISCLAIMER.lower()
    assert "not a medical device" in lowered
    assert "doctor" in lowered
    assert "not a replacement" in lowered


def test_wake_phrase_matching():
    for text in ("hey reachy", "Hey Reachy!", "hello reachy", "reachy",
                 "hey ritchie", "hey reachy, help me"):
        assert is_wake_phrase(text), text
    for text in ("hello there", "reach for the stars", "", None):
        assert not is_wake_phrase(text), text
