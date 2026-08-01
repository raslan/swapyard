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
    pipeline_tag: str | None = None
    last_modified: float | None = None
    gated: bool = False
    params: int | None = None
    total_size: int | None = None


class DiscoverResponse(BaseModel):
    trending: list[ModelSummaryResponse]
    embeddings: list[ModelSummaryResponse]
    vision: list[ModelSummaryResponse]
    agentic: list[ModelSummaryResponse]


class ModelFileResponse(BaseModel):
    name: str
    size: int
    category: str
    is_xet: bool = False


class SamplerRecommendationResponse(BaseModel):
    label: str
    params: dict[str, float]


class ModelDetailResponse(BaseModel):
    repo_id: str
    author: str
    downloads: int
    likes: int
    readme: str
    files: list[ModelFileResponse]
    context_length: int | None = None
    recommended_sampler_params: list[SamplerRecommendationResponse] | None = None


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
    context_size: int | None = None
    cache_type: str | None = None
    sampler_params: dict[str, float] | None = None
    reasoning: Literal["on", "off"] | None = None
    reasoning_budget: int | None = None
    reasoning_budget_message: str | None = None


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
    llama_swap_url: str | None = None
    onboarded: bool = False


class SettingsUpdateRequest(BaseModel):
    hardware: HardwareProfileSchema | None
    llama_swap_url: str | None = None


class QuantEstimateResponse(BaseModel):
    quant: str
    files: list[str]
    weight_bytes: int


class VramEstimateResponse(BaseModel):
    groups: list[QuantEstimateResponse]
