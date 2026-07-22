import json
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Settings:
    vram_budget_gb: float | None = None


def read_settings(path: str) -> Settings:
    file = Path(path)
    if not file.exists():
        return Settings()
    data = json.loads(file.read_text())
    return Settings(vram_budget_gb=data.get("vram_budget_gb"))


def write_settings(path: str, settings: Settings) -> None:
    file = Path(path)
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(json.dumps({"vram_budget_gb": settings.vram_budget_gb}))
