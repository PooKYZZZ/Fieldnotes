import psycopg
from fastapi.testclient import TestClient

import app

client = TestClient(app.app)


def test_local_baseline(monkeypatch):
    monkeypatch.delenv("PGHOST", raising=False)
    monkeypatch.setenv("LAB_REVISION", "reviewed-example")
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/version").json() == {"revision": "reviewed-example"}
    assert client.get("/records/demo").json() == {
        "id": "demo", "message": "fieldnotes lab", "source": "fixture"
    }


def test_configured_database_does_not_fall_back(monkeypatch):
    monkeypatch.setenv("PGHOST", "lab-db")

    def unavailable():
        raise psycopg.OperationalError("synthetic detail")

    monkeypatch.setattr(app, "read_marker", unavailable)
    assert client.get("/health").status_code == 200
    response = client.get("/records/demo")
    assert response.status_code == 503
    assert response.json() == {"detail": "Lab database unavailable"}


def test_configured_database_uses_its_record(monkeypatch):
    monkeypatch.setenv("PGHOST", "lab-db")
    monkeypatch.setattr(app, "read_marker", lambda: ("stored marker",))
    assert client.get("/records/demo").json() == {
        "id": "demo", "message": "stored marker", "source": "postgres"
    }
