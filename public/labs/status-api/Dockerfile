FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN python -m pip install --no-cache-dir -r requirements.txt \
    && mkdir /data && chown 10001:10001 /data
COPY app.py .
ARG LAB_REVISION=local
ENV LAB_REVISION=${LAB_REVISION} PYTHONUNBUFFERED=1
LABEL org.opencontainers.image.revision=${LAB_REVISION}
USER 10001:10001
EXPOSE 8000
HEALTHCHECK --interval=5s --timeout=3s --retries=5 \
    CMD ["python", "-c", "from urllib.request import urlopen; urlopen('http://127.0.0.1:8000/health', timeout=2).close()"]
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
