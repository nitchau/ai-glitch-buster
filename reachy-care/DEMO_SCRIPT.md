# ReachyCare — 3-Minute Demo Script (for the judges)

## Before you go on stage (5 minutes prep)

1. `.env`: make sure `REACHY_CARE_DEMO_MODE=true` (no real SMS goes out).
2. Open the settings page (<http://localhost:8042>) on a visible screen:
   - Senior's name: **Rose** · Caregiver: **Maya** (+ any phone number)
   - Personality: **Cheerful Friend**
   - Add medication **"blood-pressure pill", 1 tablet** at a time ~2 minutes
     into your demo slot (e.g. if you demo at 14:00, set 14:02).
3. Start the app: `reachy-care` (or `reachy-care --console` as a no-audio backup).
4. Do one throwaway "Hey Reachy → goodbye" to warm up mics and APIs.

## The demo (aim: 3:00)

| Time | You say / do | What the judges see |
|---|---|---|
| 0:00 | **"Hey Reachy!"** | Reachy wakes, turns toward your voice, happy antenna wiggle: *"Yes, Rose? I'm listening."* |
| 0:10 | **"Who are you?"** | Personality intro: cheerful friend persona, warm slow voice. |
| 0:25 | **"Tell me a joke."** | Antenna wiggle + a gentle joke. |
| 0:45 | **"Let's play trivia."** | One trivia question (answer it right!) → celebration dance + chime. Then say **"stop the game"**. |
| 1:20 | *(medication time hits)* | Chime → *"Rose, it's 2:02 PM — time for your blood-pressure pill..."* Reply: **"I took my pill."** → confirmation + adherence logged (point at the dashboard counter). |
| 1:50 | **"Help! Call 911!"** | Instant calm response, loud alert tone, red banner on the dashboard, **[DEMO — SIMULATED]** caregiver SMS/call shown on screen. Point out: *the robot has no phone — it alerts the caregiver, and this is the simulation mode.* |
| 2:15 | **"False alarm, Reachy."** | Alert cancelled, caregiver notified, Reachy relieved and kind. |
| 2:25 | **"Do you remember my grandson?"** | Memory recall from a fact you stored earlier (store *"remember that my grandson Leo visits on Sundays"* during prep). |
| 2:40 | **"Goodbye, Reachy."** | Gentle sad pose → *"Bye bye! It was lovely chatting."* → sleep pose. |

## One-line closer

> "Everything you saw — reminders, memories, health data — lives only on the
> robot. ReachyCare is a companion, not a medical device, and the emergency
> flow alerts a real human caregiver. That's the point: it keeps people
> connected."

## If something breaks

- No internet → jokes, trivia, reminders and the simulated emergency still
  work; skip the free-chat beat.
- No audio → run `reachy-care --console` and type the same script; all logic,
  motion (if the robot is up) and the dashboard still work.
- The app never crashes on errors — worst case Reachy says a friendly
  fallback line; just repeat the phrase.
