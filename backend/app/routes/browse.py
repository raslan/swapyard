from fastapi import APIRouter

from app.schemas import ModelDetailResponse, ModelSummaryResponse, VramEstimateResponse
from app.services.browse import get_model_detail, search_models
from app.services.vram_estimate import compute_vram_estimate

router = APIRouter(prefix="/api/browse", tags=["browse"])


@router.get("/search", response_model=list[ModelSummaryResponse])
async def search(q: str | None = None) -> list[ModelSummaryResponse]:
    results = search_models(q)
    return [ModelSummaryResponse(**r.__dict__) for r in results]


@router.get("/models/{repo_id:path}", response_model=ModelDetailResponse)
async def model_detail(repo_id: str) -> ModelDetailResponse:
    detail = get_model_detail(repo_id)
    return ModelDetailResponse(
        repo_id=detail.repo_id,
        author=detail.author,
        downloads=detail.downloads,
        likes=detail.likes,
        readme=detail.readme,
        files=[f.__dict__ for f in detail.files],
    )


@router.get("/{repo_id:path}/vram-estimate", response_model=VramEstimateResponse)
async def vram_estimate(repo_id: str) -> VramEstimateResponse:
    estimates = compute_vram_estimate(repo_id)
    return VramEstimateResponse(groups=[e.__dict__ for e in estimates])
