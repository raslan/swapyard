from fastapi import APIRouter

from app.errors import SwapyardError
from app.schemas import SettingsResponse, SettingsUpdateRequest
from app.services.settings import GpuDevice, HardwareProfile, Settings, read_settings, write_settings

router = APIRouter(prefix="/api/settings", tags=["settings"])

SETTINGS_PATH: str = "/app/data/settings.json"


class InvalidSettingsError(SwapyardError):
    status_code = 422
    code = "invalid_settings"


def _extract_vram_budget_from_settings(settings: Settings) -> float | None:
    """Extract VRAM budget from settings for backward compatibility."""
    if settings.hardware is None:
        return None
    if settings.hardware.kind == "gpus" and settings.hardware.gpus:
        # Return the VRAM of the first GPU as the "budget"
        return settings.hardware.gpus[0].vram_gb
    return None


@router.get("", response_model=SettingsResponse)
async def get_settings() -> SettingsResponse:
    settings = read_settings(SETTINGS_PATH)
    vram_budget = _extract_vram_budget_from_settings(settings)
    return SettingsResponse(vram_budget_gb=vram_budget)


@router.put("", response_model=SettingsResponse)
async def update_settings(body: SettingsUpdateRequest) -> SettingsResponse:
    if body.vram_budget_gb <= 0:
        raise InvalidSettingsError("vram_budget_gb must be greater than 0")
    hardware = HardwareProfile(
        kind="gpus",
        gpus=[GpuDevice(name=None, vram_gb=body.vram_budget_gb)],
        system_ram_gb=None,
    )
    settings = Settings(hardware=hardware)
    write_settings(SETTINGS_PATH, settings)
    vram_budget = _extract_vram_budget_from_settings(settings)
    return SettingsResponse(vram_budget_gb=vram_budget)
