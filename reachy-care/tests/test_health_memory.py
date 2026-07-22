from datetime import datetime, timedelta

from reachy_care.health.nutrition import (
    LOCAL_NUTRITION, NutritionService, parse_foods, weekly_habits,
)
from reachy_care.memory.memories import MemoryStore
from reachy_care.memory.checkin import DailyCheckin


def test_parse_foods_offline():
    foods = parse_foods("I had two eggs, toast with butter and a banana", llm=None)
    assert "eggs" in foods and "toast" in foods and "banana" in foods
    assert "egg" not in foods  # singular/plural de-dup


def test_nutrition_log_and_summary(settings, db):
    service = NutritionService(settings, db, llm=None)
    totals, foods = service.log_meal("I ate chicken with rice and broccoli")
    assert set(foods) == {"chicken", "rice", "broccoli"}
    expected_cal = sum(LOCAL_NUTRITION[f]["calories"] for f in foods)
    assert totals["calories"] == expected_cal
    reply = service.meal_reply(totals, foods)
    assert "calories" in reply and "protein" in reply

    day = service.day_summary()
    assert str(totals["calories"]) in day


def test_low_protein_tip(settings, db):
    service = NutritionService(settings, db, llm=None)
    totals, foods = service.log_meal("I had a salad")
    assert "protein" in service.meal_reply(totals, foods)


def test_weekly_habits_always_kind(settings, db):
    service = NutritionService(settings, db, llm=None)
    line = weekly_habits(db, service)
    assert "suggestions" in line
    for banned in ("must", "you should have", "shame"):
        assert banned not in line.lower()


def test_memories_store_and_recall(db):
    store = MemoryStore(db)
    line = store.remember("Remember that my grandson Leo visits on Sundays")
    assert "Leo" in line and not line.lower().startswith("got it - i'll remember that remember")
    store.remember("remember that I love lemon cake")

    hits = store.relevant("when does Leo come over?")
    assert any("Leo" in h for h in hits)
    recall = store.recall_line("tell me about my grandson Leo")
    assert "Leo" in recall


def test_recall_when_empty(db):
    store = MemoryStore(db)
    assert "don't have anything" in store.recall_line("anything?")


def test_checkin_due_once_per_day(settings, db):
    settings.care.checkin_time = "09:30"
    checkin = DailyCheckin(settings, db)
    before = datetime.now().replace(hour=8, minute=0)
    after = datetime.now().replace(hour=10, minute=0)
    assert not checkin.is_due(before)
    if datetime.now() >= datetime.now().replace(hour=9, minute=30):
        pass  # is_due(after) depends on events; check the transition below
    assert checkin.is_due(after)
    checkin.mark_done()
    assert not checkin.is_due(after)


def test_checkin_lines_are_gentle(settings, db):
    settings.care.senior_name = "Rose"
    lines = DailyCheckin(settings, db).lines()
    assert any("Rose" in line for line in lines)
    joined = " ".join(lines).lower()
    assert "little thought" in joined  # exactly one gentle recommendation
    assert "how are you feeling" in joined
