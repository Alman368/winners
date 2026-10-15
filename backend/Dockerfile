FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV UV_PROJECT_ENVIRONMENT=/opt/venv
ENV UV_LINK_MODE=copy
ENV PATH="/opt/venv/bin:$PATH"

COPY --from=ghcr.io/astral-sh/uv:0.11.16 /uv /bin/

WORKDIR /app

COPY pyproject.toml uv.lock .python-version ./

RUN apt-get update && apt-get install -y  --no-install-recommends libexpat1  && rm -rf /var/lib/apt/lists/*
RUN uv sync --locked --no-dev --no-cache --no-python-downloads

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
