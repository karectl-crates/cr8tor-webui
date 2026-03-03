FROM node:slim AS frontend-build
WORKDIR /app
COPY web/frontend/package*.json ./
RUN npm install --force
COPY web/frontend ./
RUN npm run build

FROM python:3.12-slim-trixie AS backend-build

# The installer requires curl (and certificates) to download the release archive
RUN apt-get update && apt-get install -y --no-install-recommends git curl ca-certificates && rm -rf /var/lib/apt/lists/*

# Download the latest installer
ADD https://astral.sh/uv/install.sh /uv-installer.sh

# Run the installer then remove it
RUN sh /uv-installer.sh && rm /uv-installer.sh

ENV PATH="/root/.local/bin:$PATH"

# Setup a non-root user
RUN groupadd --system --gid 999 nonroot \
 && useradd --system --gid 999 --uid 999 --create-home nonroot

WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

ENV UV_LINK_MODE=copy

# Omit development dependencies
ENV UV_NO_DEV=1

ENV PYTHONPATH=/app

# Ensure installed tools can be executed out of the box
ENV UV_TOOL_BIN_DIR=/usr/local/bin
ENV PATH="/app/.venv/bin:$PATH"

ENV UV_NO_DEV=1

COPY web/backend/pyproject.toml ./

COPY web/backend/ ./

RUN --mount=type=cache,target=/root/.cache/uv \ 
    uv sync --no-cache

COPY --from=frontend-build /app/build ./static

ENTRYPOINT []

RUN mkdir -p /app/cache && chown -R 999:999 /app && chmod 750 /app/cache
USER nonroot

EXPOSE 8000
CMD ["uv", "run", "fastapi", "run", "main.py", "--host", "0.0.0.0", "--port", "8000"]
