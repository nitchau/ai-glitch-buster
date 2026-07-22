from reachy_care.intents import Intent, parse


def test_emergency_phrases_always_win():
    for phrase in ["help", "Help!", "call 911", "please call nine one one",
                   "I've fallen and I can't get up", "this is an emergency",
                   "I fell down", "send help now", "call an ambulance"]:
        assert parse(phrase).intent == Intent.EMERGENCY, phrase


def test_emergency_beats_other_matches():
    assert parse("stop the music this is an emergency").intent == Intent.EMERGENCY


def test_cancel_only_when_alert_active():
    assert parse("false alarm, Reachy", emergency_active=True).intent == Intent.CANCEL_EMERGENCY
    # without an active alert, "false alarm" is not the cancel intent
    assert parse("false alarm, Reachy", emergency_active=False).intent != Intent.CANCEL_EMERGENCY


def test_entertainment_intents():
    assert parse("tell me a joke").intent == Intent.JOKE
    assert parse("tell me a story please").intent == Intent.STORY
    assert parse("let's play trivia").intent == Intent.TRIVIA
    assert parse("let's play twenty questions").intent == Intent.TWENTY_QUESTIONS
    assert parse("guess who I'm thinking of").intent == Intent.AKINATOR
    assert parse("play some jazz music").intent == Intent.MUSIC_PLAY
    assert parse("stop the music").intent == Intent.MUSIC_STOP


def test_volume_direction_slot():
    parsed = parse("turn it down a little")
    assert parsed.intent == Intent.MUSIC_VOLUME
    assert parsed.slots["direction"] == "down"
    assert parse("louder please").slots["direction"] == "up"


def test_meds_intents():
    assert parse("I took my pill").intent == Intent.MED_TAKEN
    assert parse("I just took the medication").intent == Intent.MED_TAKEN
    assert parse("what medications do I take today").intent == Intent.MED_LIST


def test_alarm_and_timer():
    assert parse("set an alarm for 8 in the morning").intent == Intent.ALARM_SET
    assert parse("set a timer for 20 minutes").intent == Intent.TIMER_SET
    assert parse("cancel my alarms").intent == Intent.ALARM_CANCEL
    assert parse("what alarms do I have?").intent == Intent.ALARM_LIST


def test_health_intents():
    assert parse("for dinner I had soup and bread").intent == Intent.MEAL_LOG
    assert parse("give me my health summary").intent == Intent.HEALTH_SUMMARY
    assert parse("what are my healthy habits this week").intent == Intent.HABITS


def test_memory_intents():
    assert parse("remember that my grandson visits on Sunday").intent == Intent.REMEMBER
    assert parse("do you remember my grandson's name?").intent == Intent.RECALL


def test_goodbye_and_chat():
    assert parse("goodbye reachy").intent == Intent.GOODBYE
    assert parse("good night").intent == Intent.GOODBYE
    assert parse("what a lovely day it has been").intent == Intent.CHAT
    assert parse("").intent == Intent.CHAT
    assert parse(None).intent == Intent.CHAT


def test_help_me_with_is_not_emergency():
    # "help" alone is an emergency, but conversational asks are not
    assert parse("what can you do").intent == Intent.HELP
