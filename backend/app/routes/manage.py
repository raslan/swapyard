from fastapi import APIRouter, Response

from app.routes import config as config_routes
from app.schemas import ManagedModelResponse
from app.services.config import commit_revision, model_refs, read_config, remove_models_for_repo
from app.services.manage import delete_managed_model, delete_managed_model_file, list_managed_models

router = APIRouter(prefix="/api/manage", tags=["manage"])

# None = use huggingface_hub's own default cache path. Tests override via monkeypatch.
CACHE_DIR: str | None = None


def _config_entries_by_repo() -> dict[str, list[str]]:
    """Map repo_id -> config model ids referencing it. Empty if config.yaml isn't there yet."""
    try:
        content, _ = read_config(config_routes.CONFIG_PATH)
    except OSError:
        return {}
    by_repo: dict[str, list[str]] = {}
    for model_id, ref in model_refs(content).items():
        if ref["kind"] == "hf":
            by_repo.setdefault(ref["repo_id"], []).append(model_id)
    return by_repo


@router.get("/models", response_model=list[ManagedModelResponse])
async def get_managed_models(sort: str = "size") -> list[ManagedModelResponse]:
    models = list_managed_models(sort=sort, cache_dir=CACHE_DIR)
    by_repo = _config_entries_by_repo()
    return [
        ManagedModelResponse(**m.__dict__, config_entries=by_repo.get(m.repo_id, []))
        for m in models
    ]


# Registered before the bare /models/{repo_id:path} route below - repo ids contain "/"
# so {repo_id:path} greedily matches everything, including a trailing "/files/x.gguf";
# if that route were declared first it would shadow this one and no request would ever
# reach here. Order-of-registration is how Starlette resolves the overlap.
@router.delete("/models/{repo_id:path}/files/{filename}", status_code=204)
async def remove_managed_model_file(repo_id: str, filename: str) -> Response:
    delete_managed_model_file(repo_id, filename, cache_dir=CACHE_DIR)
    return Response(status_code=204)


@router.delete("/models/{repo_id:path}", status_code=204)
async def remove_managed_model(repo_id: str, remove_config_entries: bool = False) -> Response:
    delete_managed_model(repo_id, cache_dir=CACHE_DIR)

    if remove_config_entries:
        try:
            content, _ = read_config(config_routes.CONFIG_PATH)
        except OSError:
            return Response(status_code=204)
        new_content, removed = remove_models_for_repo(content, repo_id)
        if removed:
            with open(config_routes.CONFIG_PATH, "w", encoding="utf-8") as f:
                f.write(new_content)
            entry_word = "entry" if len(removed) == 1 else "entries"
            status = f"auto: removed config {entry_word} for deleted model {repo_id}"
            commit_revision(config_routes.HISTORY_DIR, new_content, status)

    return Response(status_code=204)
