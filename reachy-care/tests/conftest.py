import sys
from pathlib import Path

import pytest

# src-layout import without installing the package
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from reachy_care.db import CareDB  # noqa: E402


@pytest.fixture()
def db(tmp_path):
    database = CareDB(tmp_path / "test.db")
    yield database
    database.close()


@pytest.fixture()
def settings(tmp_path):
    from reachy_care.config import Settings

    return Settings(data_dir=tmp_path)
