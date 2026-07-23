from unittest.mock import patch

from app.services.browse import ModelFile
from app.services.vram_estimate import compute_vram_estimate, group_gguf_files, shard_group_key


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


@patch("app.services.vram_estimate.list_gguf_files")
def test_compute_vram_estimate_sums_shard_sizes_per_quant_group(mock_list_files):
    mock_list_files.return_value = [
        ModelFile(name="model-Q4_K_M-00001-of-00002.gguf", size=100, category="gguf"),
        ModelFile(name="model-Q4_K_M-00002-of-00002.gguf", size=150, category="gguf"),
        ModelFile(name="model-Q8_0.gguf", size=400, category="gguf"),
    ]

    estimates = compute_vram_estimate("org/model")

    assert {e.quant for e in estimates} == {"model-Q4_K_M.gguf", "model-Q8_0.gguf"}
    q4 = next(e for e in estimates if e.quant == "model-Q4_K_M.gguf")
    assert q4.weight_bytes == 250
    assert q4.files == ["model-Q4_K_M-00001-of-00002.gguf", "model-Q4_K_M-00002-of-00002.gguf"]


@patch("app.services.vram_estimate.list_gguf_files")
def test_compute_vram_estimate_returns_empty_on_no_gguf_files(mock_list_files):
    mock_list_files.return_value = [ModelFile(name="tokenizer.json", size=10, category="other")]

    assert compute_vram_estimate("org/model") == []
