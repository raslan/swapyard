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
