from fastapi import APIRouter, Response

from app.schemas import ManagedModelResponse
from app.services.manage import delete_managed_model, list_managed_models

router = APIRouter(prefix="/api/manage", tags=["manage"])

# None = use huggingface_hub's own default cache path. Tests override via monkeypatch.
CACHE_DIR: str | None = None


@router.get("/models", response_model=list[ManagedModelResponse])
async def get_managed_models(sort: str = "size") -> list[ManagedModelResponse]:
    models = list_managed_models(sort=sort, cache_dir=CACHE_DIR)
    return [ManagedModelResponse(**m.__dict__) for m in models]


@router.delete("/models/{repo_id:path}", status_code=204)
async def remove_managed_model(repo_id: str) -> Response:
    delete_managed_model(repo_id, cache_dir=CACHE_DIR)
    return Response(status_code=204)
