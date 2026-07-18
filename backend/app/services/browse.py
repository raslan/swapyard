import os
import re
from dataclasses import dataclass

import httpx
from huggingface_hub import HfApi
from huggingface_hub.errors import HfHubHTTPError, RepositoryNotFoundError

from app.errors import NotFoundError, UpstreamError

GGUF_FILE_SUFFIX = ".gguf"
ACCOMPANYING_SUFFIXES = (".json", ".txt", ".model", ".vocab")

# HF model card READMEs start with a YAML frontmatter block (license, tags, etc, used by
# the HF website itself to render the info sidebar) delimited by "---" lines. It's not
# markdown and renders as garbage (a stray <hr> plus the raw YAML as a paragraph/list) if
# passed through untouched.
_FRONTMATTER_RE = re.compile(r"\A---\r?\n.*?\r?\n---\r?\n?", re.DOTALL)


def _strip_frontmatter(text: str) -> str:
    return _FRONTMATTER_RE.sub("", text, count=1)


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
    is_xet: bool = False


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

    xet_files = _fetch_xet_filenames(repo_id)
    files = []
    for sibling in info.siblings or []:
        category = _categorize_file(sibling.rfilename)
        if category is not None:
            files.append(
                ModelFile(
                    name=sibling.rfilename,
                    size=sibling.size or 0,
                    category=category,
                    is_xet=sibling.rfilename in xet_files,
                )
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


def _fetch_xet_filenames(repo_id: str) -> set[str]:
    """Which files in a repo are stored on HF's Xet backend.

    `HfApi.model_info()`'s typed `siblings` (used above for name/size/category) doesn't
    surface this - only the raw tree API response includes an `xetHash` key per file. Xet
    files download through hf_xet's own multi-connection reconstruction, which only reports
    progress in ~2 big jumps rather than smooth per-chunk updates (confirmed by direct
    testing - see downloads.py), so the frontend needs to know which files these are to set
    the right expectation instead of showing a progress bar that looks stuck then "lies".

    Best-effort: this is a labeling nicety, not core file-listing data, so any failure here
    (network hiccup, endpoint shape change) degrades to "assume not Xet" rather than failing
    the whole model-detail request. Not paginated - fine for GGUF repos, which never have
    anywhere near the tree API's default page size worth of files.
    """
    url = f"https://huggingface.co/api/models/{repo_id}/tree/main"
    headers = {}
    token = os.environ.get("HF_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        response = httpx.get(url, headers=headers, follow_redirects=True)
        response.raise_for_status()
        entries = response.json()
        return {entry["path"] for entry in entries if "xetHash" in entry}
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        return set()


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

    return _strip_frontmatter(response.text)
