import re
from dataclasses import dataclass

from app.services.browse import ModelFile, list_gguf_files

_SHARD_SUFFIX_RE = re.compile(r"-\d{5}-of-\d{5}(?=\.gguf$)", re.IGNORECASE)


@dataclass
class QuantEstimate:
    quant: str
    files: list[str]
    weight_bytes: int


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


def compute_vram_estimate(repo_id: str) -> list[QuantEstimate]:
    files = list_gguf_files(repo_id)
    groups = group_gguf_files(files)
    return [
        QuantEstimate(
            quant=quant,
            files=[f.name for f in quant_files],
            weight_bytes=sum(f.size for f in quant_files),
        )
        for quant, quant_files in groups.items()
    ]
