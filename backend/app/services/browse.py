import os
from dataclasses import dataclass

import httpx
from huggingface_hub import HfApi
from huggingface_hub.errors import HfHubHTTPError, RepositoryNotFoundError

from app.errors import NotFoundError, UpstreamError

GGUF_FILE_SUFFIX = ".gguf"
ACCOMPANYING_SUFFIXES = (".json", ".txt", ".model", ".vocab")


@dataclass
class ModelSummary:
    repo_id: str
    author: str
    downloads: int
    likes: int
    tags: list[str]


@dataclass
class ModelFile:
    name: str
    size: int
    category: str


@dataclass
class ModelDetail:
    repo_id: str
    author: str
    downloads: int
    likes: int
    readme: str
    files: list[ModelFile]


def _categorize_file(filename: str) -> str | None:
    lower = filename.lower()
    if "mmproj" in lower:
        return "mmproj"
    if lower.endswith(GGUF_FILE_SUFFIX):
        return "gguf"
    if lower.endswith(ACCOMPANYING_SUFFIXES):
        return "other"
    return None


def search_models(query: str | None) -> list[ModelSummary]:
    api = HfApi()
    results = api.list_models(search=query or "", filter="gguf", sort="downloads", limit=20)
    return [
        ModelSummary(
            repo_id=m.id,
            author=m.author or m.id.split("/")[0],
            downloads=m.downloads or 0,
            likes=m.likes or 0,
            tags=m.tags or [],
        )
        for m in results
    ]


def get_model_detail(repo_id: str) -> ModelDetail:
    api = HfApi()
    try:
        info = api.model_info(repo_id, files_metadata=True)
    except RepositoryNotFoundError as exc:
        raise NotFoundError(f"model '{repo_id}' not found") from exc
    except HfHubHTTPError as exc:
        raise UpstreamError(f"failed to reach Hugging Face: {exc}") from exc

    files = []
    for sibling in info.siblings or []:
        category = _categorize_file(sibling.rfilename)
        if category is not None:
            files.append(
                ModelFile(name=sibling.rfilename, size=sibling.size or 0, category=category)
            )

    readme = _fetch_readme(repo_id)

    return ModelDetail(
        repo_id=info.id,
        author=info.author or info.id.split("/")[0],
        downloads=info.downloads or 0,
        likes=info.likes or 0,
        readme=readme,
        files=files,
    )


def _fetch_readme(repo_id: str) -> str:
    """Fetch a repo's README via a raw HTTP GET rather than hf_hub_download.

    hf_hub_download writes into the persistent HF cache dir that the Manage
    screen scans (scan_cache_dir), so merely previewing a model would make it
    look "downloaded". Fetching the raw file over HTTP has zero cache
    footprint. Content is read from the response body only, never written to
    disk.
    """
    url = f"https://huggingface.co/{repo_id}/resolve/main/README.md"
    headers = {}
    token = os.environ.get("HF_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        response = httpx.get(url, headers=headers, follow_redirects=True)
    except httpx.HTTPError:
        return ""

    if response.status_code == 404:
        return ""

    try:
        response.raise_for_status()
    except httpx.HTTPStatusError:
        return ""

    return response.text
