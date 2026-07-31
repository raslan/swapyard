from app.services.config import parse_cmd_model_ref
from app.services.model_entry import build_minimal_entry


def test_build_minimal_entry_emits_only_hf_ref_port_macro_and_fit():
    repo_id = "unsloth/Qwen3.6-35B-A3B-MTP-GGUF"
    filename = "qwen3.6-35b-a3b-UD-Q4_K_M.gguf"
    entry = build_minimal_entry(repo_id, filename)

    expected_cmd = (
        "llama-server\n"
        "--port ${PORT}\n"
        "--fit\n"
        "on\n"
        "--jinja\n"
        "--cache-type-k q8_0\n"
        "--cache-type-v q8_0\n"
        "-hf unsloth/Qwen3.6-35B-A3B-MTP-GGUF:qwen3.6-35b-a3b-UD-Q4_K_M.gguf\n"
    )
    assert entry["cmd"] == expected_cmd
    # --fit is explicitly set; no -ngl, no -c anywhere - --fit is the only
    # sizing-related flag that should ever appear
    assert "--fit" in entry["cmd"]
    assert "-ngl" not in entry["cmd"]
    assert " -c " not in entry["cmd"]
    # --jinja and KV cache quantization are always on by default
    assert "--jinja" in entry["cmd"]
    assert "--cache-type-k q8_0" in entry["cmd"]
    assert "--cache-type-v q8_0" in entry["cmd"]


def test_build_minimal_entry_sets_explicit_proxy_check_endpoint_and_ttl():
    entry = build_minimal_entry("org/repo", "model-Q4_K_M.gguf")

    assert entry["proxy"] == "http://127.0.0.1:${PORT}"
    assert entry["checkEndpoint"] == "/health"
    assert entry["ttl"] == 600


def test_build_minimal_entry_key_order_matches_real_config_convention():
    entry = build_minimal_entry("org/repo", "model-Q4_K_M.gguf")

    assert list(entry.keys()) == ["proxy", "checkEndpoint", "ttl", "cmd"]


def test_build_minimal_entry_round_trips_through_parse_cmd_model_ref():
    entry = build_minimal_entry("org/repo", "model-Q4_K_M.gguf")

    ref = parse_cmd_model_ref(entry["cmd"])

    assert ref == {"kind": "hf", "repo_id": "org/repo", "quant": "model-Q4_K_M.gguf"}
