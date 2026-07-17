from pydantic import BaseModel


class ManagedModelResponse(BaseModel):
    repo_id: str
    size_on_disk: int
    nb_files: int
    last_modified: float


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


class DownloadStateResponse(BaseModel):
    id: str
    repo_id: str
    filename: str
    total: int
    downloaded: int
    status: str
    error: str | None = None
