import requests
import json
import os
import yaml
import toml
from datetime import datetime, timezone
from pydantic import BaseModel

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from linkml.generators.jsonschemagen import JsonSchemaGenerator
from linkml_runtime.utils.schemaview import SchemaView

from cr8tor_metamodel.datamodel.cr8tor_metamodel_pydantic import Cr8tor
from cr8tor_metamodel.datamodel import MAIN_SCHEMA_PATH
from cr8tor.cli.initiate import initiate

app = FastAPI()

sv = SchemaView(MAIN_SCHEMA_PATH)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECTS_FILE = os.path.join(os.path.dirname(__file__), 'cache', 'projects.json')

def strip_nulls(obj):
    if isinstance(obj, dict):
        return {k: strip_nulls(v) for k, v in obj.items() if v is not None}
    if isinstance(obj, list):
        return [strip_nulls(item) for item in obj]
    return obj

def load_projects():
    if not os.path.exists(PROJECTS_FILE):
        return {}

    with open(PROJECTS_FILE) as f:
        return json.load(f)

def save_projects(projects):
    os.makedirs(os.path.dirname(PROJECTS_FILE), exist_ok=True)
    with open(PROJECTS_FILE, 'w') as f:
        json.dump(projects, f, indent=2)


class InstanceInput(BaseModel):
    data: dict
    model: str 
    subdir: str 
    filename: str 

class GithubSettings(BaseModel):
    github_org: str
    gh_token: str
    github_repo: str
    approvals_host: str = ""
    approvals_port: str = ""
    approvals_api_token: str = ""




@app.post("/api/validate_github_settings")
def validate_github_settings(settings: GithubSettings):
    headers = {
        "Authorization": f"token {settings.gh_token}",
        "Accept": "application/vnd.github.v3+json"
    }
    url = f"https://api.github.com/repos/{settings.github_org}/{settings.github_repo}"
    resp = requests.get(url, headers=headers)

    if resp.status_code == 200:
        return {"valid": True, "message": "GitHub credentials are valid."}
    elif resp.status_code == 404:
        return {"valid": False, "message": "Repository not found or no access. Are github credentials set in settings?"}
    elif resp.status_code == 401 or resp.status_code == 403:
        return {"valid": False, "message": "Invalid GitHub token or insufficient permissions."}
    else:
        return {"valid": False, "message": f"GitHub API error: {resp.status_code}"}
    
@app.post("/api/set_github_settings")
def set_github_settings(settings: GithubSettings):
    os.environ["GITHUB_ORG"] = settings.github_org
    os.environ["GH_TOKEN"] = settings.gh_token
    os.environ["GITHUB_REPO"] = settings.github_repo
    os.environ["APPROVALS_HOST"] = settings.approvals_host
    os.environ["APPROVALS_PORT"] = settings.approvals_port
    os.environ["APPROVALS_API_TOKEN"] = settings.approvals_api_token
    return {"status": "success"}

@app.get("/api/cr8tor-settings")
def cr8tor_settings():
    return {
        "GITHUB_ORG": os.getenv("GITHUB_ORG", ""),
        "GH_TOKEN": os.getenv("GH_TOKEN", ""),
        "GITHUB_REPO": os.getenv("GITHUB_REPO", ""),
        "APPROVALS_HOST": os.getenv("APPROVALS_HOST", ""),
        "APPROVALS_PORT": os.getenv("APPROVALS_PORT", ""),
        "APPROVALS_API_TOKEN": os.getenv("APPROVALS_API_TOKEN", "")
    }

@app.post("/api/submit")
def submit_project_instance(instance: dict):
    print("\n--- Received /submit payload ---\n" + json.dumps(instance, indent=2) + "\n------------------------------\n")

    # missing = []
    # if not os.getenv("GITHUB_ORG") or os.getenv("GITHUB_ORG") == "":
    #     missing.append("GITHUB_ORG")
    # if not os.getenv("GH_TOKEN") or os.getenv("GH_TOKEN") == "":
    #     missing.append("GH_TOKEN")
    # if not os.getenv("GITHUB_REPO") or os.getenv("GITHUB_REPO") == "":
    #     missing.append("GITHUB_REPO")
    # if not os.getenv("APPROVALS_HOST") or os.getenv("APPROVALS_HOST") == "":
    #     missing.append("APPROVALS_HOST")
    # if not os.getenv("APPROVALS_PORT") or os.getenv("APPROVALS_PORT") == "":
    #     missing.append("APPROVALS_PORT")
    # if not os.getenv("APPROVALS_API_TOKEN") or os.getenv("APPROVALS_API_TOKEN") == "":
    #     missing.append("APPROVALS_API_TOKEN")
    # if missing:
    #     raise HTTPException(status_code=400, detail=f"Missing GitHub settings: {', '.join(missing)}")

    try:
        cr8tor_obj = Cr8tor(**instance)
        print("Pydantic validation succeeded.")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Cr8tor project instance validation error: {str(e)}")


    proj_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'cache', f"{cr8tor_obj.governance.project.name}"))
    resources_dir = os.path.join(proj_dir, "resources")
    os.makedirs(os.path.join(resources_dir, "governance"), exist_ok=True)
    os.makedirs(os.path.join(resources_dir, "data"), exist_ok=True)
    os.makedirs(os.path.join(resources_dir, "deployment"), exist_ok=True)

    with open(os.path.join(resources_dir, "governance", 'cr8-governance.yaml'), 'w') as f:
        yaml.dump(strip_nulls(instance.get('governance', {})), f, sort_keys=False)
    with open(os.path.join(resources_dir, "data", 'cr8-ingress.yaml'), 'w') as f:
        yaml.dump(strip_nulls(instance.get('ingress', {})), f, sort_keys=False)
    with open(os.path.join(resources_dir, "deployment", 'cr8-deployment.yaml'), 'w') as f:
        yaml.dump(strip_nulls(instance.get('deployment', {})), f, sort_keys=False)

    # TODO: Set via settings provided
    bagit_data = {
        "bagit-info": {
            "Source-Organization": "Acme Organization",
            "Organization-Address": "Acme Street",
            "Contact-Name": "Cr8tor Team",
            "Contact-Email": "acme@cr8tor.com"
        }
    }

    with open(os.path.join(proj_dir, 'config.toml'), "w") as f:
        toml.dump(bagit_data, f)

    github_org = os.getenv("GITHUB_ORG", "")
    github_repo = os.getenv("GITHUB_REPO", "")
    environment = "DEV"
    project_name = cr8tor_obj.governance.project.name

    try:
        initiate(
            project_dir=proj_dir,
            skip_template=True,
            project_name=project_name,
            push_to_github=True,
            git_org=github_org,
            runner_os="Linux",
            environment=environment,
            git_projects_repo=github_repo
        )
    except Exception as e:
        print(f"Parameter error: {e}")
        raise HTTPException(status_code=422, detail=f"Cr8tor project initiate error: {str(e)}")

    # Get the PR that we created by branch name
    pr_url = None
    pr_number = None
    try:
        branch = f"add-project-{project_name}"
        resp = requests.get(
            f"https://api.github.com/repos/{github_org}/{github_repo}/pulls",
            params={"head": f"{github_org}:{branch}", "state": "open"},
            headers={"Authorization": f"token {os.getenv('GH_TOKEN', '')}"},
            timeout=10
        )
        if resp.ok and resp.json():
            pr_data = resp.json()[0]
            pr_url = pr_data.get("html_url")
            pr_number = pr_data.get("number")
    except Exception as e:
        print(f"Could not fetch PR info: {e}")

    # Persist project state
    projects = load_projects()
    projects[project_name] = {
        "pr_url": pr_url,
        "pr_number": pr_number,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "environment": environment,
        "github_org": github_org,
        "github_repo": github_repo
    }
    save_projects(projects)

    return JSONResponse({
        "message": "Instance saved",
        "directory": proj_dir,
        "pr_url": pr_url,
        "pr_number": pr_number
    })


@app.get("/api/projects")
def get_projects():
    projects = load_projects()
    return [{"name": name, **data} for name, data in projects.items()]


@app.get("/api/projects/{name}/pr-status")
def get_pr_status(name):
    projects = load_projects()
    if name not in projects:
        raise HTTPException(status_code=404, detail="Project not found")

    project = projects[name]
    try:
        resp = requests.get(
            f"https://api.github.com/repos/{project['github_org']}/{project['github_repo']}/pulls/{project['pr_number']}",
            headers={"Authorization": f"token {os.getenv('GH_TOKEN', '')}"},
            timeout=10
        )
        if not resp.ok:
            return {"state": "unknown", "merged": False, "pr_url": project.get("pr_url")}
        data = resp.json()
        return {
            "state": data.get("state"),
            "merged": data.get("merged", False),
            "pr_url": project.get("pr_url")
        }
    except Exception as e:
        print(f"PR status check failed: {e}")
        return {"state": "unknown", "merged": False, "pr_url": project.get("pr_url")}


@app.post("/api/projects/{name}/trigger")
def trigger_pipeline(name):
    projects = load_projects()
    if name not in projects:
        raise HTTPException(status_code=404, detail="Project not found")

    project = projects[name]
    org = project["github_org"]
    repo = project["github_repo"]
    environment = project.get("environment", "DEV")
    resp = requests.post(
        f"https://api.github.com/repos/{org}/{repo}/actions/workflows/trigger-project-workflow.yaml/dispatches",
        headers={
            "Authorization": f"token {os.getenv('GH_TOKEN', '')}",
            "Accept": "application/vnd.github+json"
        },
        json={"ref": "main", "inputs": {"project": name, "environment": environment}},
        timeout=10
    )
    if resp.status_code == 204:
        return {"triggered": True}
    return {"triggered": False, "error": resp.text}


@app.get("/api/schema/classes")
def get_classes():
    classes = [c.name for c in sv.all_classes().values() if not c.is_a]
    return {"classes": classes}

@app.get("/api/schema/class/{class_name}")
def get_class_schema(class_name: str):

    generator = JsonSchemaGenerator(MAIN_SCHEMA_PATH)
    cr8tor_json_schema = generator.generate()
    
    return cr8tor_json_schema


app.mount("/", StaticFiles(directory="static", html=True), name="static")

@app.exception_handler(404)
async def spa_fallback(request, exc):
    return FileResponse("static/index.html")
