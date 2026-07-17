from dataclasses import dataclass
from pathlib import Path

from huggingface_hub import HfApi, hf_hub_download

from app.errors import NotFoundError

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
    except Exception as exc:
        raise NotFoundError(f"model '{repo_id}' not found") from exc

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
    try:
        path = hf_hub_download(repo_id=repo_id, filename="README.md")
        return Path(path).read_text(encoding="utf-8")
    except Exception:
        return ""
