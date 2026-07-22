"""Local SQLite storage for ReachyCare.

Everything personal (medications, adherence, memories, meals, alarms, alerts)
stays in one SQLite file on the robot - nothing is uploaded anywhere.
"""

from __future__ import annotations

import json
import sqlite3
import threading
from pathlib import Path
from datetime import datetime, timedelta

_SCHEMA = """
CREATE TABLE IF NOT EXISTS medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    dose TEXT NOT NULL DEFAULT '',
    times TEXT NOT NULL DEFAULT '[]',      -- JSON list of "HH:MM"
    active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS med_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    med_id INTEGER NOT NULL,
    due_at TEXT NOT NULL,                  -- ISO datetime of the scheduled slot
    status TEXT NOT NULL,                  -- reminded | confirmed | missed
    at TEXT NOT NULL                       -- ISO datetime of the event
);
CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS alarms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL DEFAULT '',
    kind TEXT NOT NULL DEFAULT 'alarm',    -- alarm (daily/once at HH:MM) | timer (one-shot)
    fire_at TEXT NOT NULL,                 -- ISO datetime of next firing
    repeat_daily INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    nutrients TEXT NOT NULL DEFAULT '{}',  -- JSON: calories, protein_g, fiber_g, ...
    at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,                    -- emergency | info
    message TEXT NOT NULL,
    at TEXT NOT NULL,
    resolved INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,                    -- wake | checkin | conversation | ...
    detail TEXT NOT NULL DEFAULT '',
    at TEXT NOT NULL
);
"""


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


class CareDB:
    """Small thread-safe wrapper around sqlite3 (a single shared connection)."""

    def __init__(self, path: str | Path):
        self._lock = threading.RLock()
        self._conn = sqlite3.connect(str(path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        with self._lock:
            self._conn.executescript(_SCHEMA)
            self._conn.commit()

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    def _execute(self, sql: str, params: tuple = ()) -> sqlite3.Cursor:
        with self._lock:
            cur = self._conn.execute(sql, params)
            self._conn.commit()
            return cur

    def _query(self, sql: str, params: tuple = ()) -> list[sqlite3.Row]:
        with self._lock:
            return self._conn.execute(sql, params).fetchall()

    # ---------------- medications ----------------

    def add_medication(self, name: str, dose: str, times: list[str]) -> int:
        cur = self._execute(
            "INSERT INTO medications (name, dose, times) VALUES (?, ?, ?)",
            (name, dose, json.dumps(sorted(times))),
        )
        return int(cur.lastrowid)

    def update_medication(self, med_id: int, name: str, dose: str, times: list[str], active: bool) -> None:
        self._execute(
            "UPDATE medications SET name=?, dose=?, times=?, active=? WHERE id=?",
            (name, dose, json.dumps(sorted(times)), int(active), med_id),
        )

    def delete_medication(self, med_id: int) -> None:
        self._execute("DELETE FROM medications WHERE id=?", (med_id,))

    def medications(self, active_only: bool = True) -> list[dict]:
        rows = self._query(
            "SELECT * FROM medications" + (" WHERE active=1" if active_only else "") + " ORDER BY name"
        )
        return [
            {"id": r["id"], "name": r["name"], "dose": r["dose"],
             "times": json.loads(r["times"]), "active": bool(r["active"])}
            for r in rows
        ]

    def log_med(self, med_id: int, due_at: datetime, status: str) -> None:
        self._execute(
            "INSERT INTO med_log (med_id, due_at, status, at) VALUES (?, ?, ?, ?)",
            (med_id, due_at.isoformat(timespec="minutes"), status, _now()),
        )

    def med_log_status(self, med_id: int, due_at: datetime) -> str | None:
        """Latest logged status for one scheduled slot (or None if untouched)."""
        rows = self._query(
            "SELECT status FROM med_log WHERE med_id=? AND due_at=? ORDER BY id DESC LIMIT 1",
            (med_id, due_at.isoformat(timespec="minutes")),
        )
        return rows[0]["status"] if rows else None

    def med_log_since(self, since: datetime) -> list[dict]:
        rows = self._query(
            "SELECT l.*, m.name, m.dose FROM med_log l JOIN medications m ON m.id = l.med_id "
            "WHERE l.at >= ? ORDER BY l.at",
            (since.isoformat(timespec="seconds"),),
        )
        return [dict(r) for r in rows]

    # ---------------- memories ----------------

    def add_memory(self, text: str, category: str = "general") -> int:
        cur = self._execute(
            "INSERT INTO memories (text, category, created_at) VALUES (?, ?, ?)",
            (text.strip(), category, _now()),
        )
        return int(cur.lastrowid)

    def memories(self, limit: int = 200) -> list[dict]:
        rows = self._query("SELECT * FROM memories ORDER BY id DESC LIMIT ?", (limit,))
        return [dict(r) for r in rows]

    def delete_memory(self, memory_id: int) -> None:
        self._execute("DELETE FROM memories WHERE id=?", (memory_id,))

    # ---------------- alarms & timers ----------------

    def add_alarm(self, label: str, kind: str, fire_at: datetime, repeat_daily: bool = False) -> int:
        cur = self._execute(
            "INSERT INTO alarms (label, kind, fire_at, repeat_daily) VALUES (?, ?, ?, ?)",
            (label, kind, fire_at.isoformat(timespec="seconds"), int(repeat_daily)),
        )
        return int(cur.lastrowid)

    def alarms(self, active_only: bool = True) -> list[dict]:
        rows = self._query(
            "SELECT * FROM alarms" + (" WHERE active=1" if active_only else "") + " ORDER BY fire_at"
        )
        return [
            {"id": r["id"], "label": r["label"], "kind": r["kind"],
             "fire_at": datetime.fromisoformat(r["fire_at"]),
             "repeat_daily": bool(r["repeat_daily"]), "active": bool(r["active"])}
            for r in rows
        ]

    def reschedule_alarm(self, alarm_id: int, fire_at: datetime) -> None:
        self._execute("UPDATE alarms SET fire_at=? WHERE id=?",
                      (fire_at.isoformat(timespec="seconds"), alarm_id))

    def deactivate_alarm(self, alarm_id: int) -> None:
        self._execute("UPDATE alarms SET active=0 WHERE id=?", (alarm_id,))

    # ---------------- meals ----------------

    def add_meal(self, description: str, nutrients: dict) -> int:
        cur = self._execute(
            "INSERT INTO meals (description, nutrients, at) VALUES (?, ?, ?)",
            (description, json.dumps(nutrients), _now()),
        )
        return int(cur.lastrowid)

    def meals_since(self, since: datetime) -> list[dict]:
        rows = self._query("SELECT * FROM meals WHERE at >= ? ORDER BY at",
                           (since.isoformat(timespec="seconds"),))
        return [
            {"id": r["id"], "description": r["description"],
             "nutrients": json.loads(r["nutrients"]), "at": r["at"]}
            for r in rows
        ]

    # ---------------- alerts & events ----------------

    def add_alert(self, kind: str, message: str) -> int:
        cur = self._execute("INSERT INTO alerts (kind, message, at) VALUES (?, ?, ?)",
                            (kind, message, _now()))
        return int(cur.lastrowid)

    def resolve_alert(self, alert_id: int) -> None:
        self._execute("UPDATE alerts SET resolved=1 WHERE id=?", (alert_id,))

    def alerts(self, unresolved_only: bool = False, limit: int = 50) -> list[dict]:
        rows = self._query(
            "SELECT * FROM alerts" + (" WHERE resolved=0" if unresolved_only else "")
            + " ORDER BY id DESC LIMIT ?",
            (limit,),
        )
        return [dict(r) for r in rows]

    def log_event(self, kind: str, detail: str = "") -> None:
        self._execute("INSERT INTO events (kind, detail, at) VALUES (?, ?, ?)", (kind, detail, _now()))

    def events_since(self, since: datetime, kind: str | None = None) -> list[dict]:
        if kind:
            rows = self._query("SELECT * FROM events WHERE at >= ? AND kind = ? ORDER BY at",
                               (since.isoformat(timespec="seconds"), kind))
        else:
            rows = self._query("SELECT * FROM events WHERE at >= ? ORDER BY at",
                               (since.isoformat(timespec="seconds"),))
        return [dict(r) for r in rows]

    # ---------------- convenience ----------------

    def adherence_last_days(self, days: int = 7) -> dict:
        """Confirmed vs missed medication slots over the last N days."""
        since = datetime.now() - timedelta(days=days)
        log = self.med_log_since(since)
        confirmed = sum(1 for e in log if e["status"] == "confirmed")
        missed = sum(1 for e in log if e["status"] == "missed")
        return {"confirmed": confirmed, "missed": missed, "days": days}
