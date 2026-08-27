import json as _json
from pathlib import Path as _Path

from fastapi import APIRouter, Response
from starlette.responses import JSONResponse

from app.errors import SwapyardError
from app.routes.settings import SETTINGS_PATH
from app.schemas import (
    ConfigApplyRequest,
    ConfigApplyResponse,
    ConfigNormalizeResponse,
    ConfigResponse,
    ConfigRevisionResponse,
    ConfigStatusResponse,
    CreateModelEntryRequest,
)
from app.services.config import (
    SCHEMA,
    ConfigConflict,
    ConfigInvalid,
    add_model_entry,
    apply_config,
    get_status,
    list_revisions,
    normalize_config_entries,
    read_config,
)
from app.services.manage import list_managed_models
from app.services.model_entry import build_minimal_entry, cache_type_options
from app.services.settings import read_settings

router = APIRouter(prefix="/api/config", tags=["config"])

# Both sides of these mounts are defined in this repo's own docker-compose.yml -
# not deployer-configurable, so these are fixed constants, not env vars.
# Tests override via monkeypatch, same pattern as routes/manage.py's CACHE_DIR.
CONFIG_PATH: str = "/app/llama-swap-config.yaml"
HISTORY_DIR: str = "/app/data/config-history"


class InvalidConfigError(SwapyardError):
    status_code = 422
    code = "invalid_config"


class ModelIdExistsError(SwapyardError):
    status_code = 409
    code = "model_id_exists"


@router.get("", response_model=ConfigResponse)
async def get_config() -> ConfigResponse:
    content, digest = read_config(CONFIG_PATH)
    return ConfigResponse(content=content, hash=digest)


@router.get("/schema")
async def get_config_schema() -> dict:
    return SCHEMA


@router.post("/normalize", response_model=ConfigNormalizeResponse)
async def post_config_normalize() -> ConfigNormalizeResponse:
    """Rewrite legacy `-hf repo:quant` model entries into the unambiguous
    `-hf repo` + `--hf-file` form and pin `--mmproj-url` where a projector is
    downloaded. Returns the rewritten content for the editor to review - does
    not apply or commit anything."""
    content, _ = read_config(CONFIG_PATH)
    downloads = {
        m.repo_id: {"gguf": m.gguf_files, "mmproj": m.mmproj_files}
        for m in list_managed_models()
    }
    new_content, report = normalize_config_entries(content, downloads)
    return ConfigNormalizeResponse(content=new_content, report=report)


@router.get("/status", response_model=ConfigStatusResponse)
async def get_config_status() -> ConfigStatusResponse:
    status = get_status(HISTORY_DIR)
    if status is None:
        return ConfigStatusResponse()
    return ConfigStatusResponse(**status)


@router.get("/history", response_model=list[ConfigRevisionResponse])
async def get_config_history() -> list[ConfigRevisionResponse]:
    revisions = list_revisions(HISTORY_DIR)
    return [ConfigRevisionResponse(**r) for r in revisions]


@router.post("")
async def post_config(body: ConfigApplyRequest) -> Response:
    try:
        result = await apply_config(
            config_path=CONFIG_PATH,
            history_dir=HISTORY_DIR,
            content=body.content,
            base_hash=body.base_hash,
            llama_swap_url=read_settings(SETTINGS_PATH).llama_swap_url,
        )
    except ConfigConflict as e:
        return JSONResponse(
            status_code=409,
            content={"current_content": e.current_content, "current_hash": e.current_hash},
        )
    except ConfigInvalid as e:
        raise InvalidConfigError("; ".join(e.errors)) from e

    return ConfigApplyResponse(status=result["status"], logs=result["logs"])


@router.post("/models")
async def post_config_model(body: CreateModelEntryRequest) -> Response:
    if body.cache_type is not None:
        allowed = cache_type_options(_load_flags())
        if allowed and body.cache_type not in allowed:
            raise InvalidConfigError(f"cache_type must be one of: {', '.join(allowed)}")

    content, digest = read_config(CONFIG_PATH)
    entry = build_minimal_entry(
        body.repo_id,
        body.filename,
        context_size=body.context_size,
        cache_type=body.cache_type,
        sampler_params=body.sampler_params,
        reasoning=body.reasoning,
        reasoning_budget=body.reasoning_budget,
        reasoning_budget_message=body.reasoning_budget_message,
        mmproj_filename=body.mmproj_filename,
    )

    try:
        new_content = add_model_entry(content, body.model_id, entry)
    except ValueError as e:
        raise ModelIdExistsError(str(e)) from e

    try:
        result = await apply_config(
            config_path=CONFIG_PATH,
            history_dir=HISTORY_DIR,
            content=new_content,
            base_hash=digest,
            llama_swap_url=read_settings(SETTINGS_PATH).llama_swap_url,
        )
    except ConfigConflict as e:
        return JSONResponse(
            status_code=409,
            content={"current_content": e.current_content, "current_hash": e.current_hash},
        )
    except ConfigInvalid as e:
        raise InvalidConfigError("; ".join(e.errors)) from e

    return ConfigApplyResponse(status=result["status"], logs=result["logs"])


FLAGS_PATH: str = str(_Path(__file__).parent.parent / "llama_server_flags.json")


def _load_flags() -> list[dict]:
    path = _Path(FLAGS_PATH)
    if not path.exists():
        return []
    return _json.loads(path.read_text())


@router.get("/flags")
async def get_config_flags() -> list[dict]:
    return _load_flags()
