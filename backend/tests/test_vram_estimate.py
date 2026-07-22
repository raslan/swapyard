from unittest.mock import patch

from app.services.browse import ModelDetail, ModelFile
from app.services.gguf_metadata import GgufParseError
from app.services.vram_estimate import (
    compute_vram_estimate,
    group_gguf_files,
    kv_cache_bytes,
    shard_group_key,
)


def test_shard_group_key_strips_shard_suffix():
    assert shard_group_key("model-Q4_K_M-00001-of-00003.gguf") == "model-Q4_K_M.gguf"
    assert shard_group_key("model-Q4_K_M-00002-of-00003.gguf") == "model-Q4_K_M.gguf"
    assert shard_group_key("model-Q8_0.gguf") == "model-Q8_0.gguf"


def test_group_gguf_files_sums_shards_and_ignores_other_categories():
    files = [
        ModelFile(name="model-Q4_K_M-00001-of-00002.gguf", size=100, category="gguf"),
        ModelFile(name="model-Q4_K_M-00002-of-00002.gguf", size=200, category="gguf"),
        ModelFile(name="model-Q8_0.gguf", size=400, category="gguf"),
        ModelFile(name="tokenizer_config.json", size=10, category="other"),
    ]

    groups = group_gguf_files(files)

    assert set(groups.keys()) == {"model-Q4_K_M.gguf", "model-Q8_0.gguf"}
    assert sum(f.size for f in groups["model-Q4_K_M.gguf"]) == 300


def test_kv_cache_bytes_uses_q8_0_block_size():
    result = kv_cache_bytes(n_layer=2, n_head_kv=4, head_dim=128, context=1000)
    expected = round(2 * 2 * 4 * 128 * 1000 * (34 / 32))
    assert result == expected


@patch("app.services.vram_estimate.fetch_gguf_header")
@patch("app.services.vram_estimate.get_model_detail")
def test_compute_vram_estimate_builds_one_entry_per_quant_group(mock_detail, mock_fetch):
    mock_detail.return_value = ModelDetail(
        repo_id="org/model",
        author="org",
        downloads=0,
        likes=0,
        readme="",
        files=[
            ModelFile(name="model-Q4_K_M.gguf", size=100, category="gguf"),
            ModelFile(name="model-Q8_0.gguf", size=400, category="gguf"),
        ],
    )
    mock_fetch.return_value = {
        "general.architecture": "llama",
        "llama.block_count": 2,
        "llama.attention.head_count": 8,
        "llama.attention.head_count_kv": 2,
        "llama.embedding_length": 256,
        "llama.context_length": 4096,
    }

    estimates = compute_vram_estimate("org/model")

    assert {e.quant for e in estimates} == {"model-Q4_K_M.gguf", "model-Q8_0.gguf"}
    q4 = next(e for e in estimates if e.quant == "model-Q4_K_M.gguf")
    assert q4.weight_bytes == 100
    assert q4.context_length == 4096
    assert q4.kv_cache_half_bytes < q4.kv_cache_max_bytes
    # architecture metadata is fetched once, against the smallest quant file
    mock_fetch.assert_called_once_with("org/model", "model-Q4_K_M.gguf")


@patch("app.services.vram_estimate.fetch_gguf_header")
@patch("app.services.vram_estimate.get_model_detail")
def test_compute_vram_estimate_returns_empty_on_no_gguf_files(mock_detail, mock_fetch):
    mock_detail.return_value = ModelDetail(
        repo_id="org/model",
        author="org",
        downloads=0,
        likes=0,
        readme="",
        files=[ModelFile(name="tokenizer.json", size=10, category="other")],
    )

    assert compute_vram_estimate("org/model") == []
    mock_fetch.assert_not_called()


@patch("app.services.vram_estimate.fetch_gguf_header")
@patch("app.services.vram_estimate.get_model_detail")
def test_compute_vram_estimate_returns_empty_on_gguf_parse_failure(mock_detail, mock_fetch):
    mock_detail.return_value = ModelDetail(
        repo_id="org/model",
        author="org",
        downloads=0,
        likes=0,
        readme="",
        files=[ModelFile(name="model-Q4_K_M.gguf", size=100, category="gguf")],
    )
    mock_fetch.side_effect = GgufParseError("bad magic")

    assert compute_vram_estimate("org/model") == []
