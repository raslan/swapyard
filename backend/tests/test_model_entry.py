from app.services.config import parse_cmd_model_ref
from app.services.model_entry import build_minimal_entry


def test_build_minimal_entry_emits_only_hf_ref_port_macro_and_fit():
    repo_id = "unsloth/Qwen3.6-35B-A3B-MTP-GGUF"
    filename = "qwen3.6-35b-a3b-UD-Q4_K_M.gguf"
    entry = build_minimal_entry(repo_id, filename)

    expected_cmd = (
        "llama-server --port ${PORT} --fit -hf "
        "unsloth/Qwen3.6-35B-A3B-MTP-GGUF:qwen3.6-35b-a3b-UD-Q4_K_M.gguf"
    )
    assert entry["cmd"] == expected_cmd
    # --fit is explicitly set; no -ngl, no -c anywhere - --fit is the only
    # sizing-related flag that should ever appear
    assert "--fit" in entry["cmd"]
    assert "-ngl" not in entry["cmd"]
    assert " -c " not in entry["cmd"]


def test_build_minimal_entry_sets_explicit_proxy_and_check_endpoint_defaults():
    entry = build_minimal_entry("org/repo", "model-Q4_K_M.gguf")

    assert entry["proxy"] == "http://localhost:${PORT}"
    assert entry["checkEndpoint"] == "/health"
    assert "ttl" not in entry


def test_build_minimal_entry_round_trips_through_parse_cmd_model_ref():
    entry = build_minimal_entry("org/repo", "model-Q4_K_M.gguf")

    ref = parse_cmd_model_ref(entry["cmd"])

    assert ref == {"kind": "hf", "repo_id": "org/repo", "quant": "model-Q4_K_M.gguf"}
