# cr8tor WebUI Boilerplate

This project provides a full-stack web app for auto-generating web forms to populate a LinkML model.

## Structure

- `backend/`: FastAPI + linkml-runtime backend for validation and YAML output
- `frontend/`: React app for auto-generating forms from schema

## Usage

1. See `backend/README.md` for backend setup and API info
2. See `frontend/README.md` for frontend setup

## Notes
- Expects LinkML schemas in `../schema/`
- Outputs YAML files to `../examples/resources/`
