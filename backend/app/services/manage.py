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
    gguf_files: list[str]


def _gguf_files(repo) -> list[str]:  # noqa: ANN001 - CachedRepoInfo has no public type alias
    """Union+dedupe .gguf filenames across all revisions of a cached repo, sorted.

    Excludes mmproj files (same "mmproj" in lower() substring check
    services/browse.py's _categorize_file uses) - llama-server's `-hf` already
    auto-downloads/attaches a repo's mmproj file on its own (confirmed against
    real `llama-server --help` text: "mmproj is also downloaded automatically
    if available"), so it's never something a config entry's -hf value should
    point at directly, and listing it as a pickable "which file" option in the
    create-entry UI is just confusing noise."""
    names = {
        file.file_name
        for revision in repo.revisions
        for file in revision.files
        if file.file_name.endswith(".gguf") and "mmproj" not in file.file_name.lower()
    }
    return sorted(names)


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
            gguf_files=_gguf_files(repo),
        )
        for repo in cache_info.repos
        if repo.repo_type == "model"
    ]
    if sort == "name":
        models.sort(key=lambda m: m.repo_id.lower())
    else:
        models.sort(key=lambda m: m.size_on_disk, reverse=True)
    return models


def _find_repo(cache_info, repo_id: str):  # noqa: ANN001, ANN201 - HFCacheInfo/CachedRepoInfo have no public type alias
    return next(
        (r for r in cache_info.repos if r.repo_id == repo_id and r.repo_type == "model"),
        None,
    )


def delete_managed_model(repo_id: str, cache_dir: str | None = None) -> None:
    try:
        cache_info = scan_cache_dir(cache_dir=cache_dir)
    except CacheNotFound as e:
        raise NotFoundError(f"model '{repo_id}' not found in cache") from e
    repo = _find_repo(cache_info, repo_id)
    if repo is None:
        raise NotFoundError(f"model '{repo_id}' not found in cache")

    revision_hashes = [rev.commit_hash for rev in repo.revisions]
    cache_info.delete_revisions(*revision_hashes).execute()


def delete_managed_model_file(repo_id: str, filename: str, cache_dir: str | None = None) -> None:
    """Delete a single downloaded file (e.g. one GGUF quant) from a repo's cache,
    leaving its other files untouched - unlike delete_managed_model, which removes
    the whole repo. huggingface_hub's cache API only deletes whole revisions
    (CachedRevisionInfo.delete_revisions()); multiple quant files normally share one
    revision/commit, so that API can't isolate a single file. This removes the
    file's symlink from every revision that has it, then removes its target blob
    only if no other symlink in the repo's cache still points at it - blobs can be
    shared across revisions/files with byte-identical content.

    If this was the repo's last file, falls back to delete_managed_model so no
    empty repo directory is left behind."""
    try:
        cache_info = scan_cache_dir(cache_dir=cache_dir)
    except CacheNotFound as e:
        raise NotFoundError(f"model '{repo_id}' not found in cache") from e
    repo = _find_repo(cache_info, repo_id)
    if repo is None:
        raise NotFoundError(f"model '{repo_id}' not found in cache")

    matching = [f for revision in repo.revisions for f in revision.files if f.file_name == filename]
    if not matching:
        raise NotFoundError(f"file '{filename}' not found in '{repo_id}'")

    remaining_files = {
        f.file_name for revision in repo.revisions for f in revision.files if f.file_name != filename
    }
    remaining_blobs = {
        f.blob_path for revision in repo.revisions for f in revision.files if f.file_name != filename
    }
    for f in matching:
        f.file_path.unlink(missing_ok=True)
        if f.blob_path not in remaining_blobs:
            f.blob_path.unlink(missing_ok=True)

    if not remaining_files:
        delete_managed_model(repo_id, cache_dir=cache_dir)
