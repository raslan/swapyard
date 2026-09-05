from fastapi import APIRouter

from app.errors import NotFoundError
from app.harnesses import HARNESSES
from app.routes import config as config_routes
from app.routes import settings as settings_routes
from app.schemas import ConnectHarnessDetailResponse, ConnectHarnessSummaryResponse
from app.services.config import derive_models, read_config
from app.services.manage import list_managed_models
from app.services.settings import read_settings

router = APIRouter(prefix="/api/connect/harnesses", tags=["connect"])

# Same override-for-tests pattern as routes/manage.py's CACHE_DIR - None means
# huggingface_hub's own default cache path.
CACHE_DIR: str | None = None

_PLACEHOLDER_BASE_URL = "http://YOUR-LLAMA-SWAP-HOST:PORT/v1"


def _find_harness(harness_id: str):
    return next((h for h in HARNESSES if h.id == harness_id), None)


@router.get("", response_model=list[ConnectHarnessSummaryResponse])
async def list_harnesses() -> list[ConnectHarnessSummaryResponse]:
    return [
        ConnectHarnessSummaryResponse(
            id=h.id, name=h.name, config_path=h.config_path, format=h.format,
            docs_url=h.docs_url, icon=h.icon,
        )
        for h in HARNESSES
    ]


@router.get("/{harness_id}", response_model=ConnectHarnessDetailResponse)
async def get_harness(harness_id: str) -> ConnectHarnessDetailResponse:
    harness = _find_harness(harness_id)
    if harness is None:
        raise NotFoundError(f"unknown harness '{harness_id}'")

    llama_swap_url = read_settings(settings_routes.SETTINGS_PATH).llama_swap_url
    if llama_swap_url:
        base_url = f"{llama_swap_url}/v1"
        base_url_source = "settings"
    else:
        base_url = _PLACEHOLDER_BASE_URL
        base_url_source = "placeholder"

    try:
        content, _ = read_config(config_routes.CONFIG_PATH)
    except OSError:
        content = "models: {}\n"
    models = derive_models(content, list_managed_models(cache_dir=CACHE_DIR))

    return ConnectHarnessDetailResponse(
        id=harness.id, name=harness.name, config_path=harness.config_path,
        format=harness.format, docs_url=harness.docs_url, icon=harness.icon,
        steps=harness.steps(), config=harness.render(models, base_url),
        base_url_source=base_url_source,
    )
