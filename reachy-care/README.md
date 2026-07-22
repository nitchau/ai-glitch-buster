---
title: ReachyCare
emoji: 🤗
colorFrom: green
colorTo: blue
sdk: static
pinned: false
tags:
  - reachy_mini
  - reachy_mini_python_app
---

# ReachyCare 🤖💚

**A voice-first companion for a senior living at home, running on the
[Reachy Mini](https://huggingface.co/spaces/pollen-robotics/Reachy_Mini) robot.**
Built by a student team at the AIXelerate Hackathon.

The senior says **"Hey Reachy"** — the robot wakes, turns toward their voice,
and helps with entertainment, medication reminders, health tracking and
companionship. Works on both the **Wireless** (on-robot Raspberry Pi 5) and
**Lite** (USB-connected computer) versions.

> **Important:** ReachyCare is a friendly companion, **not a medical device**.
> It never diagnoses and gives no medication advice beyond the schedule a
> caregiver configures. The emergency feature is an **alert system** that
> notifies a caregiver — it is **not a replacement for a phone, for 911, or
> for a medical alert device.**

## What it does

| Module | Features |
|---|---|
| **Voice core** | "Hey Reachy" wake word · STT → LLM → TTS conversation loop · 4 personalities (Cheerful Friend, Wise Storyteller, Gentle Coach, Funny Grandkid) · slower speech, louder volume, endless patience · turns toward the speaker using the mic array's direction-of-arrival |
| **Entertainment** | curated + AI jokes (never mean) · original short stories · internet radio & podcasts with voice volume control · decade-based trivia with celebration antenna dances · 20 Questions · Akinator-style genie game |
| **Meds & emergency** | medication schedule in local SQLite, editable on the settings page · spoken reminders with confirmation, 10-minute re-reminders and adherence logging · **Emergency Alert**: calm response + loud alert + SMS/phone call to the caregiver via Twilio + dashboard banner, with a "false alarm, Reachy" cancel phrase and a clearly-labelled **demo/simulation mode** |
| **Health & nutrition** | end-of-day meal logging by voice · calories/protein/fiber via the USDA FoodData Central API (offline fallback table) · friendly food suggestions based on gaps · weekly healthy-habits list from the senior's own data |
| **Memory & proactive care** | persistent memories (family names, birthdays, stories) woven naturally into conversation · alarms & timers by voice, persisted across restarts · daily proactive check-in with one gentle suggestion — never nagging |

All personal and health data stays **local on the robot** in SQLite. API calls
send only the minimum needed (e.g. one food name to the USDA lookup).

## Quick start

```bash
git clone <this repo> && cd reachy-care

# 1. install (Python 3.10+). On the robot / with a robot attached:
pip install -e ".[cloud,wake,sms]"
#    on a laptop without the robot SDK, the app still runs in console mode:
pip install numpy requests PyYAML python-dotenv fastapi uvicorn

# 2. keys (all optional - the app degrades gracefully)
cp .env.example .env   # then fill in what you have

# 3. run it
reachy-care              # with the robot (or the SDK's MuJoCo simulator daemon)
reachy-care --console    # no robot needed: type to Reachy, it prints back
```

Then open the **settings page** at <http://localhost:8042> to set the senior's
name, caregiver contact, personality, volume and the medication schedule.

### Trying it in 2 minutes (console mode)

```bash
python -m reachy_care.main --console
# press Enter at the wake prompt, then try:
#   tell me a joke
#   let's play trivia
#   I ate chicken and rice and broccoli
#   remember that my grandson Leo visits on Sundays
#   set a timer for 2 minutes
#   help                <- simulated emergency alert (demo mode)
#   false alarm, reachy
#   goodbye
```

### Running the tests

```bash
pip install pytest
python -m pytest tests/ -q     # 52 tests, all offline logic
```

## Configuration

| Where | What |
|---|---|
| `.env` | API keys (Anthropic/OpenAI, Twilio, USDA), provider choices, `REACHY_CARE_DEMO_MODE` |
| Settings page (or `config.yaml` in the data dir) | senior & caregiver names, caregiver phone, personality, volume, speech rate, check-in time, medication schedule |

**Providers** — LLM: Anthropic Claude (default) or OpenAI. STT: OpenAI Whisper
API or local `faster-whisper`. TTS: OpenAI or local `pyttsx3`. Wake word:
STT-confirm out of the box; drop a custom openWakeWord model at
`<data dir>/hey_reachy.onnx` for on-device "Hey Reachy" detection.

**Offline?** Jokes, stories, trivia, timers, alarms, medication reminders and
the (simulated) emergency alert all keep working with no internet at all.

**Demo mode** (`REACHY_CARE_DEMO_MODE=true`, the default): emergency alerts are
fully simulated — loud tone, spoken reassurance, dashboard banner — but **no
SMS or call is sent**. Keep it on for development and judging. Never wire the
emergency flow to a real 911 dial.

## Robot behaviour

- Turns toward whoever is speaking (microphone-array direction of arrival).
- Subtle "breathing" idle motion while listening.
- Happy antenna wiggles, curious head tilts, celebration dances for trivia
  wins, dramatic genie "thinking" during Akinator — all smooth, small and
  within SDK safety limits. Reachy is never scary or harsh, in words or motion.

## App packaging (official Reachy Mini conventions)

- `ReachyCareApp` extends `ReachyMiniApp` and implements
  `run(reachy_mini, stop_event)`, honouring `stop_event` for clean shutdown.
- Registered under the `reachy_mini_apps` entry point in `pyproject.toml`, so
  the robot dashboard can install and launch it.
- `custom_app_url` + the FastAPI app serve the caregiver settings page.
- No robot handy? Prototype against the SDK's MuJoCo simulator: start the
  simulator daemon as described in the
  [reachy_mini docs](https://github.com/pollen-robotics/reachy_mini), then run
  `reachy-care` — the SDK auto-detects the local daemon.

### Publishing to Hugging Face

1. Create a new **Space**, SDK "static", and push this folder's contents to it.
2. Keep the README front matter above (the `reachy_mini_python_app` tag is what
   makes the Space installable from the robot's dashboard).
3. On the robot's dashboard, add the Space by name — one-click install.

## Project layout

```
src/reachy_care/
  main.py            ReachyMiniApp entry point (+ --console mode)
  orchestrator.py    the main loop: wake → conversation → intents → modules
  intents.py         offline intent router (emergency phrases always win)
  config.py, db.py   settings (.env + config.yaml) and local SQLite storage
  voice/             audio I/O, wake word, STT, TTS, LLM, personalities
  motion/            look-at-speaker, antenna emotions, idle breathing
  entertainment/     jokes, stories, trivia, 20 Questions, Akinator, radio
  meds/              schedule, reminders, confirmations, adherence
  emergency/         the alert chain (Twilio + dashboard, demo mode)
  health/            meal logging, USDA nutrition, weekly habits
  memory/            persistent memories, alarms & timers, daily check-in
  static/            caregiver settings page + live dashboard
tests/               52 offline tests
DEMO_SCRIPT.md       the 3-minute judge demo, step by step
```

## Safety, kindness & privacy rules

1. Reachy is never violent, scary, harsh or judgmental — in words or motion.
2. Reachy is always kind about mistakes and repeated questions.
3. Reachy is **not a medical device**: no diagnoses, no medication advice
   beyond the configured schedule; health questions get "ask your doctor".
   This is spoken aloud during first-run onboarding.
4. All personal and health data stays local on the robot.
5. The emergency feature is an alert system, not a replacement for a phone or
   a medical alert device.
