FROM node:slim AS frontend-build
WORKDIR /app
COPY web/frontend/package*.json ./
RUN npm install --force
COPY web/frontend ./
RUN npm run build

FROM python:3.12-slim AS backend-build
WORKDIR /app
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
COPY web/backend/pyproject.toml ./
COPY web/backend/ ./
RUN pip install --no-cache-dir .

COPY --from=frontend-build /app/build ./static

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
