import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Literal


@dataclass
class GpuDevice:
    name: str | None
    vram_gb: float


@dataclass
class HardwareProfile:
    kind: Literal["gpus", "unified"]
    gpus: list[GpuDevice] = field(default_factory=list)
    system_ram_gb: float | None = None


@dataclass
class Settings:
    hardware: HardwareProfile | None = None


def _migrate_flat_vram_budget(data: dict) -> dict:
    """Old format: {"vram_budget_gb": float | null}. New: {"hardware": {...}}."""
    vram_budget_gb = data.get("vram_budget_gb")
    if vram_budget_gb is None:
        return {"hardware": None}
    return {
        "hardware": {
            "kind": "gpus",
            "gpus": [{"name": None, "vram_gb": vram_budget_gb}],
            "system_ram_gb": None,
        }
    }


def read_settings(path: str) -> Settings:
    file = Path(path)
    if not file.exists():
        return Settings()

    data = json.loads(file.read_text())

    if "hardware" not in data:
        data = _migrate_flat_vram_budget(data)
        _write_raw(path, data)

    hardware_data = data.get("hardware")
    if hardware_data is None:
        return Settings(hardware=None)

    hardware = HardwareProfile(
        kind=hardware_data["kind"],
        gpus=[GpuDevice(**g) for g in hardware_data.get("gpus", [])],
        system_ram_gb=hardware_data.get("system_ram_gb"),
    )
    return Settings(hardware=hardware)


def _write_raw(path: str, data: dict) -> None:
    file = Path(path)
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(json.dumps(data))


def write_settings(path: str, settings: Settings) -> None:
    hardware_data = asdict(settings.hardware) if settings.hardware is not None else None
    _write_raw(path, {"hardware": hardware_data})
