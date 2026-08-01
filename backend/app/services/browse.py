import concurrent.futures
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
    pipeline_tag: str | None = None
    last_modified: float | None = None
    gated: bool = False
    params: int | None = None
    total_size: int | None = None


@dataclass
class DiscoverSections:
    trending: list[ModelSummary]
    embeddings: list[ModelSummary]
    vision: list[ModelSummary]
    agentic: list[ModelSummary]


@dataclass
class ModelFile:
    name: str
    size: int
    category: str
    is_xet: bool = False


@dataclass
class SamplerRecommendation:
    label: str
    params: dict[str, float]


@dataclass
class ModelDetail:
    repo_id: str
    author: str
    downloads: int
    likes: int
    readme: str
    files: list[ModelFile]
    context_length: int | None = None
    recommended_sampler_params: list[SamplerRecommendation] | None = None


def _categorize_file(filename: str) -> str | None:
    lower = filename.lower()
    if "mmproj" in lower:
        return "mmproj"
    if lower.endswith(GGUF_FILE_SUFFIX):
        return "gguf"
    if lower.endswith(ACCOMPANYING_SUFFIXES):
        return "other"
    return None


def _to_summary(m) -> ModelSummary:  # noqa: ANN001 - ModelInfo has no useful public alias
    # `gguf` also carries a full `chat_template` string (can be several KB) that we
    # don't use here - pulling only `total`/`totalFileSize` out keeps that off the
    # wire rather than forwarding the whole dict through ModelSummaryResponse.
    gguf_meta = m.gguf or {}
    return ModelSummary(
        repo_id=m.id,
        author=m.author or m.id.split("/")[0],
        downloads=m.downloads or 0,
        likes=m.likes or 0,
        tags=m.tags or [],
        pipeline_tag=m.pipeline_tag,
        last_modified=m.last_modified.timestamp() if m.last_modified else None,
        gated=bool(m.gated),
        params=gguf_meta.get("total"),
        total_size=gguf_meta.get("totalFileSize"),
    )


# list_models' `expand` param, when set, REPLACES the default field set rather than
# adding to it (confirmed empirically: expand=["lastModified","gated"] alone came back
# with pipeline_tag/tags/likes/author all None) - so every field _to_summary reads must
# be listed here explicitly, not just the two we're adding.
_SUMMARY_EXPAND_FIELDS = ["author", "downloads", "likes", "tags", "pipeline_tag", "lastModified", "gated", "gguf"]


def search_models(query: str | None) -> list[ModelSummary]:
    api = HfApi()
    results = api.list_models(
        search=query or "", filter="gguf", sort="downloads", limit=20, expand=_SUMMARY_EXPAND_FIELDS
    )
    return [_to_summary(m) for m in results]


# Pipeline tags are HF's own per-model task classification (returned directly by
# list_models, no extra call) - real signal, not something we're inferring. Embedding
# models get pulled out of every other section (not just given their own): they aren't
# something you'd chat/generate with, so mixing them into Trending/Vision/Agentic would
# misrepresent what those rows are for.
_EMBEDDING_PIPELINE_TAGS = {"feature-extraction", "sentence-similarity"}
_VISION_PIPELINE_TAGS = {"image-text-to-text", "visual-question-answering", "image-to-text"}
_AGENTIC_TAGS = {"agentic-coding", "agent", "code", "coding"}

_DISCOVER_POOL_SIZE = 100
_SECTION_LIMIT = 12


def get_discover_sections() -> DiscoverSections:
    """Homepage sections, all sliced from a single top-100-by-downloads pool
    (one HF query) rather than one query per section. Sections legitimately
    overlap (a model can be both Trending and Vision) except embeddings, which
    are excluded from every other section - see the comment above."""
    api = HfApi()
    results = api.list_models(
        filter="gguf", sort="downloads", limit=_DISCOVER_POOL_SIZE, expand=_SUMMARY_EXPAND_FIELDS
    )
    pool = [_to_summary(m) for m in results]

    embeddings = [m for m in pool if m.pipeline_tag in _EMBEDDING_PIPELINE_TAGS]
    regular = [m for m in pool if m.pipeline_tag not in _EMBEDDING_PIPELINE_TAGS]

    trending = regular[:_SECTION_LIMIT]
    vision = [m for m in regular if m.pipeline_tag in _VISION_PIPELINE_TAGS][:_SECTION_LIMIT]
    agentic = [m for m in regular if _AGENTIC_TAGS.intersection(m.tags)][:_SECTION_LIMIT]

    return DiscoverSections(
        trending=trending,
        embeddings=embeddings[:_SECTION_LIMIT],
        vision=vision,
        agentic=agentic,
    )


def _extract_base_model(card_data) -> str | None:  # noqa: ANN001 - ModelCardData has no useful public alias
    """card_data's `base_model` key is a single repo id string for a
    straight quantization/fine-tune, or a list of them for merges - GGUF
    quant repos (bartowski/mradermacher/etc) are always the former, but
    handle the list shape defensively rather than crash on it."""
    if card_data is None:
        return None
    base_model = card_data.get("base_model")
    if isinstance(base_model, list):
        return base_model[0] if base_model else None
    return base_model


# generation_config.json / README keys that map onto a real llama-server sampling
# flag - see build_minimal_entry, which uses these same names as its kwargs.
_SAMPLER_KEYS = ("temperature", "top_p", "top_k", "min_p", "presence_penalty", "repetition_penalty")

# Matches README lines like:
#   > - Thinking mode for VL tasks: `temperature=0.6, top_p=0.95, top_k=20, min_p=0.0`
# A common (not universal) convention for publishing per-mode sampler recommendations
# in inline code within a blockquote bullet - verified against real Qwen model card
# READMEs, which publish several such lines (one per thinking/VL mode combination).
#
# The label-to-backtick gap uses [ \t]*, not \s* - \s matches newlines too, which
# previously let this also match README's that publish the *same* recommendations a
# second time in a different, multi-line format (bold label on its own line, each
# key=value in its own separate backtick span on the next line) - producing a bogus
# second "recommendation" per mode containing only the first value it could reach
# (confirmed against unsloth/Qwen3.5-0.8B-GGUF's real README, which does exactly
# this). Requiring the backtick on the same line as the label excludes that format
# entirely, which is correct: it's the same information already caught by the
# single-line format below, not a distinct recommendation.
_README_RECOMMENDATION_RE = re.compile(
    r"^[>\s]*-\s*(?P<label>[^:\n`]+):[ \t]*`(?P<params>[^`\n]+)`",
    re.MULTILINE,
)
_KV_PAIR_RE = re.compile(r"(\w+)\s*=\s*([-\d.]+)")


def parse_sampler_params_from_readme(readme: str) -> list[SamplerRecommendation]:
    """Best-effort scrape of author-published sampler recommendations directly from
    README prose - a fallback for when generation_config.json isn't available (see
    get_recommended_sampler_params). This is a model-author convention, not a
    standard schema, unlike generation_config.json - it only catches READMEs using
    the inline-code `key=value, key=value, ...` style, and will miss (return [])
    on READMEs formatted any other way.

    Real Qwen model cards publish separate recommendations per thinking/non-thinking
    and text/VL mode, so this returns every block found rather than guessing which
    one applies - the caller lets the user pick. Blocks with no keys matching
    _SAMPLER_KEYS after filtering (e.g. a line with no relevant numbers at all) are
    dropped rather than returned empty-handed."""
    recommendations = []
    for match in _README_RECOMMENDATION_RE.finditer(readme):
        params = {
            key: float(value)
            for key, value in _KV_PAIR_RE.findall(match.group("params"))
            if key in _SAMPLER_KEYS
        }
        if params:
            label = match.group("label").strip().strip("*").strip()
            recommendations.append(SamplerRecommendation(label=label, params=params))
    return recommendations


def get_recommended_sampler_params(base_model: str) -> dict[str, float] | None:
    """Best-effort fetch of a GGUF repo's *original* (pre-quantization) base
    model's generation_config.json - the standard transformers file where
    model authors publish their own recommended sampling defaults (verified
    for real against Qwen/Qwen2.5-0.5B-Instruct: temperature/top_p/top_k/
    repetition_penalty all present). GGUF conversions don't carry this file
    themselves, so it has to come from the base repo `card_data.base_model`
    points at - which isn't guaranteed to be set, and the base repo isn't
    guaranteed to have this file either, so any failure here degrades to
    None (same best-effort spirit as _fetch_xet_filenames).

    Uses a raw HTTP GET, NOT hf_hub_download - hf_hub_download writes into
    the persistent HF cache dir that the Manage screen scans, which would
    make merely previewing a model's sampler params look like the *base*
    model (a different, undownloaded repo) had been downloaded. Same
    reasoning as _fetch_readme.
    """
    url = f"https://huggingface.co/{base_model}/resolve/main/generation_config.json"
    headers = {}
    token = os.environ.get("HF_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        response = httpx.get(url, headers=headers, follow_redirects=True)
        response.raise_for_status()
        raw = response.json()
    except (httpx.HTTPError, ValueError):
        return None

    params = {k: raw[k] for k in _SAMPLER_KEYS if k in raw and isinstance(raw[k], (int, float))}
    return params or None


def get_model_detail(repo_id: str) -> ModelDetail:
    # model_info, the Xet-filename lookup, and the README fetch are three
    # independent HTTP round trips (none depends on another's result) that
    # were previously run sequentially, needlessly adding their latencies -
    # run them concurrently instead.
    api = HfApi()
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        info_future = executor.submit(api.model_info, repo_id, files_metadata=True)
        xet_future = executor.submit(_fetch_xet_filenames, repo_id)
        readme_future = executor.submit(_fetch_readme, repo_id)

        try:
            info = info_future.result()
        except RepositoryNotFoundError as exc:
            raise NotFoundError(f"model '{repo_id}' not found") from exc
        except HfHubHTTPError as exc:
            raise UpstreamError(f"failed to reach Hugging Face: {exc}") from exc

        # base_model only becomes known once `info` resolves, so this can't start
        # alongside the other three - but it still overlaps whatever's left of their
        # waits rather than running fully sequentially after them.
        base_model = _extract_base_model(info.card_data)
        sampler_future = (
            executor.submit(get_recommended_sampler_params, base_model) if base_model else None
        )

        xet_files = xet_future.result()
        readme = readme_future.result()
        sampler_params = sampler_future.result() if sampler_future else None

    # generation_config.json (the base model's own published defaults) is preferred
    # when available; README-scraping only kicks in as a fallback, since it's a
    # convention rather than a guaranteed schema.
    if sampler_params:
        sampler_recommendations = [SamplerRecommendation("Model's published defaults", sampler_params)]
    else:
        sampler_recommendations = parse_sampler_params_from_readme(readme) or None

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

    return ModelDetail(
        repo_id=info.id,
        author=info.author or info.id.split("/")[0],
        downloads=info.downloads or 0,
        likes=info.likes or 0,
        readme=readme,
        files=files,
        context_length=(info.gguf or {}).get("context_length"),
        recommended_sampler_params=sampler_recommendations,
    )


def list_gguf_files(repo_id: str) -> list[ModelFile]:
    """Lightweight file listing for the VRAM estimator.

    Like get_model_detail, but skips the README fetch and the Xet-filename
    lookup - the VRAM estimate only needs filenames/sizes/categories, so
    fetching+discarding a full README and doing an extra HF tree-API round
    trip on every estimate is wasted work (the frontend already calls
    get_model_detail separately via /models/{repo_id} for the Files tab).
    """
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
                ModelFile(
                    name=sibling.rfilename,
                    size=sibling.size or 0,
                    category=category,
                )
            )
    return files


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
