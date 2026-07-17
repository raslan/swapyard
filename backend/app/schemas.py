from pydantic import BaseModel


class ManagedModelResponse(BaseModel):
    repo_id: str
    size_on_disk: int
    nb_files: int
    last_modified: float
