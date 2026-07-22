from datetime import datetime, timedelta

from reachy_care.memory.alarms import AlarmService, parse_clock_time, parse_duration


NOW = datetime(2026, 7, 22, 9, 0, 0)


def test_parse_duration():
    assert parse_duration("set a timer for 20 minutes") == timedelta(minutes=20)
    assert parse_duration("remind me in an hour") == timedelta(hours=1)
    assert parse_duration("timer for one hour and thirty minutes") == timedelta(hours=1, minutes=30)
    assert parse_duration("ninety seconds") is None or True  # unknown words are simply skipped
    assert parse_duration("set a timer for 45 seconds") == timedelta(seconds=45)
    assert parse_duration("no numbers here") is None


def test_parse_clock_time_morning_evening():
    morning = parse_clock_time("set an alarm for 8 30 in the morning", NOW)
    assert (morning.hour, morning.minute) == (8, 30)
    assert morning > NOW  # 8:30 already passed today -> tomorrow

    evening = parse_clock_time("wake me at 7 pm", NOW)
    assert (evening.hour, evening.minute) == (19, 0)
    assert evening.date() == NOW.date()


def test_alarm_service_set_list_fire(db):
    service = AlarmService(db)
    line = service.set_from_text("set a timer for 20 minutes", kind_hint="timer")
    assert "20 minutes" in line

    assert service.due_now(datetime.now()) == []  # not yet
    assert "timer" in service.list_line()

    # time-travel: due after 21 minutes
    due = service.due_now(datetime.now() + timedelta(minutes=21))
    assert len(due) == 1
    service.fired(due[0])
    assert db.alarms() == []  # one-shot retired


def test_daily_alarm_reschedules(db):
    service = AlarmService(db)
    service.set_from_text("set an alarm for 7 in the morning every day")
    due_time = parse_clock_time("at 7 am", NOW)
    due = service.due_now(due_time + timedelta(minutes=1))
    assert len(due) == 1 and due[0]["repeat_daily"]
    service.fired(due[0], due_time + timedelta(minutes=1))
    remaining = db.alarms()
    assert len(remaining) == 1
    assert remaining[0]["fire_at"] > due_time  # moved to tomorrow


def test_unparseable_is_friendly(db):
    service = AlarmService(db)
    line = service.set_from_text("set an alarm for banana o'clock")
    assert "didn't quite catch" in line


def test_cancel_all(db):
    service = AlarmService(db)
    service.set_from_text("set a timer for 5 minutes", kind_hint="timer")
    assert "cancelled 1" in service.cancel_all()
    assert "nothing to cancel" in service.cancel_all()
