# Fieldnotes Status API lab

Run only in a disposable workspace. The included credential is a synthetic local fixture. The proxy listens only on host loopback, while the API and PostgreSQL stay on the Compose project network.

- **A05** runs `python -m uvicorn app:app --host 127.0.0.1 --port 8000` in a Python 3.12 virtual environment with `requirements.txt` installed. Use A05’s host NGINX mapping. In this mode `/records/demo` reports `"source":"fixture"`.
- **A08–A09** use the Dockerfile and Compose wiring. In the extracted folder use `docker compose -p fieldnotes-status-lab config --quiet`, then `docker compose -p fieldnotes-status-lab up -d --build --wait`. Test `/health` and `/records/demo` through `http://127.0.0.1:18080`. The record must report `"source":"postgres"`.
- **A10** installs `requirements-dev.txt` and runs `python -m pytest -q`. The tests use synthetic responses and do not require a database. Record both the tested source revision and the built image identity. Promote the same image archive in A11.
- **A11** can set `LAB_IMAGE` to a tag placed on that exact loaded image and run Compose with `--no-build`. Keep the URL, project name, and database volume stable. Compare the runtime image ID and `/version` separately.
- **A16–A17** extend this same `app.py` with bounded telemetry in a lab branch. Use service name `api` and port `8000` for scrapes inside the Compose network.

Set `LAB_PORT` to a free local port if needed. Avoid `down -v` while testing persistence. When finished, stop only your named lab project with `docker compose -p fieldnotes-status-lab down`. The volume remains available until you explicitly remove this lab's synthetic data.
