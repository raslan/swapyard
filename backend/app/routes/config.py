import os

from fastapi import APIRouter, Response
from starlette.responses import JSONResponse

from app.errors import SwapyardError
from app.schemas import (
    ConfigApplyRequest,
    ConfigApplyResponse,
    ConfigResponse,
    ConfigRevisionResponse,
    ConfigStatusResponse,
)
from app.services.config import (
    SCHEMA,
    ConfigConflict,
    ConfigInvalid,
    apply_config,
    get_status,
    list_revisions,
    read_config,
)

router = APIRouter(prefix="/api/config", tags=["config"])

# Both sides of these mounts are defined in this repo's own docker-compose.yml -
# not deployer-configurable, so these are fixed constants, not env vars.
# Tests override via monkeypatch, same pattern as routes/manage.py's CACHE_DIR.
CONFIG_PATH: str = "/app/llama-swap-config.yaml"
HISTORY_DIR: str = "/app/data/config-history"
LLAMA_SWAP_URL: str | None = os.environ.get("LLAMA_SWAP_URL")


class InvalidConfigError(SwapyardError):
    status_code = 422
    code = "invalid_config"


@router.get("", response_model=ConfigResponse)
async def get_config() -> ConfigResponse:
    content, digest = read_config(CONFIG_PATH)
    return ConfigResponse(content=content, hash=digest)


@router.get("/schema")
async def get_config_schema() -> dict:
    return SCHEMA


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
        result = apply_config(
            config_path=CONFIG_PATH,
            history_dir=HISTORY_DIR,
            content=body.content,
            base_hash=body.base_hash,
            llama_swap_url=LLAMA_SWAP_URL,
        )
    except ConfigConflict as e:
        return JSONResponse(
            status_code=409,
            content={"current_content": e.current_content, "current_hash": e.current_hash},
        )
    except ConfigInvalid as e:
        raise InvalidConfigError("; ".join(e.errors)) from e

    return ConfigApplyResponse(status=result["status"], logs=result["logs"])


import json as _json
from pathlib import Path as _Path

FLAGS_PATH: str = str(_Path(__file__).parent.parent / "llama_server_flags.json")


@router.get("/flags")
async def get_config_flags() -> list[dict]:
    path = _Path(FLAGS_PATH)
    if not path.exists():
        return []
    return _json.loads(path.read_text())
