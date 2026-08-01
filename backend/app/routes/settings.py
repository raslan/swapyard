from fastapi import APIRouter

from app.errors import SwapyardError
from app.schemas import (
    GpuDeviceSchema,
    HardwareProfileSchema,
    SettingsResponse,
    SettingsUpdateRequest,
)
from app.services.settings import (
    GpuDevice,
    HardwareProfile,
    Settings,
    read_settings,
    write_settings,
)

router = APIRouter(prefix="/api/settings", tags=["settings"])

SETTINGS_PATH: str = "/app/data/settings.json"


class InvalidSettingsError(SwapyardError):
    status_code = 422
    code = "invalid_settings"


def _validate(hardware: HardwareProfileSchema | None) -> None:
    if hardware is None:
        return
    if hardware.kind == "gpus":
        if not hardware.gpus:
            raise InvalidSettingsError("at least one GPU is required when kind is 'gpus'")
        if any(g.vram_gb <= 0 for g in hardware.gpus):
            raise InvalidSettingsError("each GPU's vram_gb must be greater than 0")
    if hardware.kind == "unified" and not hardware.system_ram_gb:
        raise InvalidSettingsError("system_ram_gb is required when kind is 'unified'")
    if hardware.system_ram_gb is not None and hardware.system_ram_gb <= 0:
        raise InvalidSettingsError("system_ram_gb must be greater than 0")


def _to_domain(hardware: HardwareProfileSchema | None) -> HardwareProfile | None:
    if hardware is None:
        return None
    return HardwareProfile(
        kind=hardware.kind,
        gpus=[GpuDevice(name=g.name, vram_gb=g.vram_gb) for g in hardware.gpus],
        system_ram_gb=hardware.system_ram_gb,
    )


def _to_schema(hardware: HardwareProfile | None) -> HardwareProfileSchema | None:
    if hardware is None:
        return None
    return HardwareProfileSchema(
        kind=hardware.kind,
        gpus=[GpuDeviceSchema(name=g.name, vram_gb=g.vram_gb) for g in hardware.gpus],
        system_ram_gb=hardware.system_ram_gb,
    )


@router.get("", response_model=SettingsResponse)
async def get_settings() -> SettingsResponse:
    settings = read_settings(SETTINGS_PATH)
    return SettingsResponse(
        hardware=_to_schema(settings.hardware),
        llama_swap_url=settings.llama_swap_url,
        onboarded=settings.onboarded,
    )


@router.put("", response_model=SettingsResponse)
async def update_settings(body: SettingsUpdateRequest) -> SettingsResponse:
    _validate(body.hardware)
    # Reaching a successful save means the user has been through the settings
    # form at least once - that's what "onboarded" means, regardless of what
    # they chose to fill in.
    settings = Settings(hardware=_to_domain(body.hardware), llama_swap_url=body.llama_swap_url or None, onboarded=True)
    write_settings(SETTINGS_PATH, settings)
    return SettingsResponse(
        hardware=_to_schema(settings.hardware),
        llama_swap_url=settings.llama_swap_url,
        onboarded=settings.onboarded,
    )
