from dataclasses import dataclass

from huggingface_hub import scan_cache_dir
from huggingface_hub.errors import CacheNotFound

from app.errors import NotFoundError


@dataclass
class ManagedModel:
    repo_id: str
    size_on_disk: int
    nb_files: int
    last_modified: float


def list_managed_models(sort: str = "size", cache_dir: str | None = None) -> list[ManagedModel]:
    try:
        cache_info = scan_cache_dir(cache_dir=cache_dir)
    except CacheNotFound:
        return []
    models = [
        ManagedModel(
            repo_id=repo.repo_id,
            size_on_disk=repo.size_on_disk,
            nb_files=repo.nb_files,
            last_modified=repo.last_modified,
        )
        for repo in cache_info.repos
        if repo.repo_type == "model"
    ]
    if sort == "name":
        models.sort(key=lambda m: m.repo_id.lower())
    else:
        models.sort(key=lambda m: m.size_on_disk, reverse=True)
    return models


def delete_managed_model(repo_id: str, cache_dir: str | None = None) -> None:
    try:
        cache_info = scan_cache_dir(cache_dir=cache_dir)
    except CacheNotFound as e:
        raise NotFoundError(f"model '{repo_id}' not found in cache") from e
    repo = next(
        (r for r in cache_info.repos if r.repo_id == repo_id and r.repo_type == "model"),
        None,
    )
    if repo is None:
        raise NotFoundError(f"model '{repo_id}' not found in cache")

    revision_hashes = [rev.commit_hash for rev in repo.revisions]
    cache_info.delete_revisions(*revision_hashes).execute()
