from typing import Literal

from pydantic import BaseModel


class GpuDeviceSchema(BaseModel):
    name: str | None = None
    vram_gb: float


class HardwareProfileSchema(BaseModel):
    kind: Literal["gpus", "unified"]
    gpus: list[GpuDeviceSchema] = []
    system_ram_gb: float | None = None


class ManagedModelResponse(BaseModel):
    repo_id: str
    size_on_disk: int
    nb_files: int
    last_modified: float
    gguf_files: list[str]
    config_entries: list[str] = []


class ModelSummaryResponse(BaseModel):
    repo_id: str
    author: str
    downloads: int
    likes: int
    tags: list[str]


class ModelFileResponse(BaseModel):
    name: str
    size: int
    category: str
    is_xet: bool = False


class ModelDetailResponse(BaseModel):
    repo_id: str
    author: str
    downloads: int
    likes: int
    readme: str
    files: list[ModelFileResponse]


class StartDownloadRequest(BaseModel):
    repo_id: str
    filename: str
    is_xet: bool = False


class DownloadStateResponse(BaseModel):
    id: str
    repo_id: str
    filename: str
    total: int
    downloaded: int
    rate: float
    is_xet: bool
    status: str
    error: str | None = None


class ConfigResponse(BaseModel):
    content: str
    hash: str


class ConfigApplyRequest(BaseModel):
    content: str
    base_hash: str


class CreateModelEntryRequest(BaseModel):
    repo_id: str
    filename: str
    model_id: str


class ConfigApplyResponse(BaseModel):
    status: str
    logs: str | None = None


class ConfigRevisionResponse(BaseModel):
    sha: str
    timestamp: float
    status: str
    content: str


class ConfigStatusResponse(BaseModel):
    status: str | None = None
    timestamp: float | None = None


class SettingsResponse(BaseModel):
    hardware: HardwareProfileSchema | None


class SettingsUpdateRequest(BaseModel):
    hardware: HardwareProfileSchema | None


class QuantEstimateResponse(BaseModel):
    quant: str
    files: list[str]
    weight_bytes: int


class VramEstimateResponse(BaseModel):
    groups: list[QuantEstimateResponse]
