from datetime import datetime, timedelta

from reachy_care.meds.reminders import MedicationReminders


NOW = datetime(2026, 7, 22, 9, 0, 0)


def test_due_and_confirm_flow(db):
    med_id = db.add_medication("blood-pressure pill", "1 tablet", ["09:00", "18:00"])
    meds = MedicationReminders(db, remind_again_minutes=10)

    due = meds.due_now(NOW)
    assert [d.med_id for d in due] == [med_id]
    assert due[0].due_at.hour == 9

    meds.mark_reminded(due[0], NOW)
    # within the re-remind window: not due again
    assert meds.due_now(NOW + timedelta(minutes=5)) == []
    # after the window: reminded again
    again = meds.due_now(NOW + timedelta(minutes=11))
    assert len(again) == 1

    meds.confirm(again[0])
    assert meds.due_now(NOW + timedelta(minutes=30)) == []
    assert db.adherence_last_days(1)["confirmed"] == 1


def test_missed_after_grace(db):
    db.add_medication("vitamin", "", ["08:00"])
    meds = MedicationReminders(db)
    late = NOW.replace(hour=9, minute=30)  # 90 min past the 08:00 slot
    assert meds.due_now(late) == []
    assert db.adherence_last_days(1)["missed"] == 1


def test_evening_slot_not_due_in_morning(db):
    db.add_medication("evening pill", "", ["18:00"])
    meds = MedicationReminders(db)
    assert meds.due_now(NOW) == []


def test_voice_confirmation_targets_latest_reminded(db):
    db.add_medication("heart pill", "1 tablet", ["09:00"])
    meds = MedicationReminders(db)
    due = meds.due_now(NOW)
    meds.mark_reminded(due[0], NOW)
    name = meds.confirm_latest_reminded(NOW + timedelta(minutes=3))
    assert name == "heart pill"
    # nothing left pending afterwards
    assert meds.confirm_latest_reminded(NOW + timedelta(minutes=4)) is None


def test_spoken_schedule_and_summary(db):
    meds = MedicationReminders(db)
    assert "settings page" in meds.schedule_spoken()
    db.add_medication("blood-pressure pill", "1 tablet", ["09:00"])
    spoken = meds.schedule_spoken()
    assert "blood-pressure pill" in spoken and "9 AM" in spoken

    due = meds.due_now(NOW)
    meds.mark_reminded(due[0], NOW)
    meds.confirm(due[0])
    assert "took 1" in meds.daily_summary(NOW + timedelta(hours=1))


def test_reminder_line_is_kind(db):
    db.add_medication("blood-pressure pill", "one tablet", ["09:00"])
    meds = MedicationReminders(db)
    due = meds.due_now(NOW)
    line = MedicationReminders.reminder_line(due[0], "Rose")
    assert "Rose" in line and "blood-pressure pill" in line and "9:00" in line
