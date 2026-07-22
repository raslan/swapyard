from fastapi import APIRouter

from app.errors import SwapyardError
from app.schemas import SettingsResponse, SettingsUpdateRequest
from app.services.settings import Settings, read_settings, write_settings

router = APIRouter(prefix="/api/settings", tags=["settings"])

SETTINGS_PATH: str = "/app/data/settings.json"


class InvalidSettingsError(SwapyardError):
    status_code = 422
    code = "invalid_settings"


@router.get("", response_model=SettingsResponse)
async def get_settings() -> SettingsResponse:
    settings = read_settings(SETTINGS_PATH)
    return SettingsResponse(vram_budget_gb=settings.vram_budget_gb)


@router.put("", response_model=SettingsResponse)
async def update_settings(body: SettingsUpdateRequest) -> SettingsResponse:
    if body.vram_budget_gb <= 0:
        raise InvalidSettingsError("vram_budget_gb must be greater than 0")
    settings = Settings(vram_budget_gb=body.vram_budget_gb)
    write_settings(SETTINGS_PATH, settings)
    return SettingsResponse(vram_budget_gb=settings.vram_budget_gb)
