FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


FROM python:3.13-slim AS backend-runtime

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN useradd --uid 10001 --no-create-home app

# Misma versión con la que se genera uv.lock.
COPY --from=ghcr.io/astral-sh/uv:0.10.5 /uv /bin/uv

WORKDIR /app/backend

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-cache

COPY backend/ /app/backend/

ENV PATH="/app/backend/.venv/bin:$PATH"

COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Los archivos siguen siendo de root: la app solo lee del disco.
USER app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
