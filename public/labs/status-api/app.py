"""Synthetic service for the isolated Fieldnotes labs."""

import os
from contextlib import closing

import psycopg
from fastapi import FastAPI, HTTPException

app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/version")
def version():
    return {"revision": os.getenv("LAB_REVISION", "local")}


def read_marker():
    with closing(psycopg.connect(connect_timeout=2, options="-c statement_timeout=2000")) as connection:
        return connection.execute("SELECT message FROM lab_marker WHERE id = 'demo'").fetchone()


@app.get("/records/demo")
def record():
    if not os.getenv("PGHOST"):
        return {"id": "demo", "message": "fieldnotes lab", "source": "fixture"}
    try:
        row = read_marker()
    except psycopg.Error:
        raise HTTPException(503, "Lab database unavailable") from None
    if row is None:
        raise HTTPException(404, "Lab record missing")
    return {"id": "demo", "message": row[0], "source": "postgres"}
