import re
from dataclasses import dataclass

from app.services.browse import ModelFile, get_model_detail
from app.services.gguf_metadata import GgufParseError, extract_arch_info, fetch_gguf_header

_SHARD_SUFFIX_RE = re.compile(r"-\d{5}-of-\d{5}(?=\.gguf$)", re.IGNORECASE)

# q8_0: 34-byte blocks of 32 elements (32 int8 values + a 2-byte f16 scale),
# i.e. 34/32 bytes per element - ggml's GGML_TYPE_Q8_0 block size.
_Q8_0_BYTES_PER_ELEMENT = 34 / 32


@dataclass
class QuantEstimate:
    quant: str
    files: list[str]
    weight_bytes: int
    context_length: int
    kv_cache_max_bytes: int
    kv_cache_half_bytes: int


def shard_group_key(filename: str) -> str:
    """Collapse a sharded GGUF filename (-00001-of-00003.gguf) to its shared quant group name."""
    return _SHARD_SUFFIX_RE.sub("", filename)


def group_gguf_files(files: list[ModelFile]) -> dict[str, list[ModelFile]]:
    groups: dict[str, list[ModelFile]] = {}
    for f in files:
        if f.category != "gguf":
            continue
        groups.setdefault(shard_group_key(f.name), []).append(f)
    return groups


def kv_cache_bytes(n_layer: int, n_head_kv: int, head_dim: int, context: int) -> int:
    return round(n_layer * 2 * n_head_kv * head_dim * context * _Q8_0_BYTES_PER_ELEMENT)


def compute_vram_estimate(repo_id: str) -> list[QuantEstimate]:
    detail = get_model_detail(repo_id)
    groups = group_gguf_files(detail.files)
    if not groups:
        return []

    # Architecture params (layer/head counts) are identical across every
    # quant of a repo - fetch them once, from the smallest file (fastest to
    # range-request), rather than once per quant.
    smallest_group = min(groups.values(), key=lambda fs: sum(f.size for f in fs))
    smallest_file = min(smallest_group, key=lambda f: f.size)
    try:
        kv = fetch_gguf_header(repo_id, smallest_file.name)
        arch = extract_arch_info(kv)
    except GgufParseError:
        return []

    estimates = []
    for quant, quant_files in groups.items():
        weight_bytes = sum(f.size for f in quant_files)
        estimates.append(
            QuantEstimate(
                quant=quant,
                files=[f.name for f in quant_files],
                weight_bytes=weight_bytes,
                context_length=arch.context_length,
                kv_cache_max_bytes=kv_cache_bytes(
                    arch.block_count, arch.head_count_kv, arch.key_length, arch.context_length
                ),
                kv_cache_half_bytes=kv_cache_bytes(
                    arch.block_count, arch.head_count_kv, arch.key_length, arch.context_length // 2
                ),
            )
        )
    return estimates
