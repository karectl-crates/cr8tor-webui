# Backend (FastAPI + LinkML)

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

## Endpoints
- `POST /submit`: Submit a LinkML instance for validation and storage
- `GET /schema/classes`: List root classes for form generation
- `GET /schema/class/{class_name}`: Get class schema for form generation

## Notes
- Expects LinkML schema in `../../schema/cr8tor_metamodel.yaml`
- Stores YAML output in `../../examples/resources/{subdir}/{filename}`
