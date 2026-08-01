import pytest

from app.services.config import parse_cmd_model_ref
from app.services.model_entry import build_minimal_entry, cache_type_options, parse_allowed_values


def test_build_minimal_entry_emits_only_hf_ref_port_macro_and_fit():
    repo_id = "unsloth/Qwen3.6-35B-A3B-MTP-GGUF"
    filename = "qwen3.6-35b-a3b-UD-Q4_K_M.gguf"
    entry = build_minimal_entry(repo_id, filename)

    expected_cmd = (
        "llama-server\n"
        "--port ${PORT}\n"
        "--fit on\n"
        "--jinja\n"
        "--flash-attn on\n"
        "--cache-type-k q8_0\n"
        "--cache-type-v q8_0\n"
        "-hf unsloth/Qwen3.6-35B-A3B-MTP-GGUF:qwen3.6-35b-a3b-UD-Q4_K_M\n"
    )
    assert entry["cmd"] == expected_cmd
    # --fit is explicitly set; no -ngl, no -c anywhere - --fit is the only
    # sizing-related flag that should ever appear
    assert "--fit" in entry["cmd"]
    assert "-ngl" not in entry["cmd"]
    assert " -c " not in entry["cmd"]
    # --jinja, flash attention, and KV cache quantization are always on by default
    assert "--jinja" in entry["cmd"]
    assert "--flash-attn on" in entry["cmd"]
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

    assert ref == {"kind": "hf", "repo_id": "org/repo", "quant": "model-Q4_K_M"}


def test_build_minimal_entry_strips_gguf_extension_from_hf_colon_value():
    repo_id = "bartowski/Qwen2.5-0.5B-Instruct-GGUF"
    filename = "Qwen2.5-0.5B-Instruct-IQ2_M.gguf"
    entry = build_minimal_entry(repo_id, filename)

    assert f"-hf {repo_id}:Qwen2.5-0.5B-Instruct-IQ2_M\n" in entry["cmd"]
    assert ".gguf.gguf" not in entry["cmd"]


def test_build_minimal_entry_strips_gguf_extension_case_insensitively():
    entry = build_minimal_entry("org/repo", "model-Q4_K_M.GGUF")

    assert "-hf org/repo:model-Q4_K_M\n" in entry["cmd"]


def test_build_minimal_entry_omits_ctx_size_by_default():
    entry = build_minimal_entry("org/repo", "model-Q4_K_M.gguf")

    assert "--ctx-size" not in entry["cmd"]


def test_build_minimal_entry_adds_explicit_ctx_size_when_given():
    entry = build_minimal_entry("org/repo", "model-Q4_K_M.gguf", context_size=8192)

    assert "--ctx-size 8192\n" in entry["cmd"]
    # comes after the fit/jinja/cache-type flags, before -hf, same ordering as the rest
    assert entry["cmd"].index("--ctx-size 8192") < entry["cmd"].index("-hf org/repo")


def test_build_minimal_entry_uses_default_cache_type_when_not_given():
    entry = build_minimal_entry("org/repo", "model-Q4_K_M.gguf", cache_type=None)

    assert "--cache-type-k q8_0" in entry["cmd"]
    assert "--cache-type-v q8_0" in entry["cmd"]


def test_build_minimal_entry_uses_given_cache_type_for_both_k_and_v():
    entry = build_minimal_entry("org/repo", "model-Q4_K_M.gguf", cache_type="f16")

    assert "--cache-type-k f16" in entry["cmd"]
    assert "--cache-type-v f16" in entry["cmd"]
    assert "q8_0" not in entry["cmd"]


def test_parse_allowed_values_extracts_comma_separated_list():
    description = (
        "KV cache data type for K allowed values: f32, f16, bf16, q8_0, "
        "q4_0, q4_1, iq4_nl, q5_0, q5_1 (default: f16)"
    )
    assert parse_allowed_values(description) == [
        "f32", "f16", "bf16", "q8_0", "q4_0", "q4_1", "iq4_nl", "q5_0", "q5_1",
    ]


def test_parse_allowed_values_returns_empty_for_non_enum_flag():
    assert parse_allowed_values("number of tokens to predict (default: -1)") == []


def test_cache_type_options_finds_flag_by_primary_name():
    flags = [
        {"flag": "--jinja", "aliases": [], "description": "enable jinja", "default": None},
        {
            "flag": "--cache-type-k",
            "aliases": ["-ctk"],
            "description": "KV cache data type for K allowed values: f16, q8_0 (default: f16)",
            "default": "f16",
        },
    ]
    assert cache_type_options(flags) == ["f16", "q8_0"]


def test_cache_type_options_returns_empty_when_flags_missing():
    assert cache_type_options([]) == []


def test_build_minimal_entry_omits_sampler_flags_by_default():
    entry = build_minimal_entry("org/repo", "model-Q4_K_M.gguf")

    for flag in ("--temp", "--top-p", "--top-k", "--repeat-penalty"):
        assert flag not in entry["cmd"]


def test_build_minimal_entry_emits_given_sampler_params():
    entry = build_minimal_entry(
        "org/repo",
        "model-Q4_K_M.gguf",
        sampler_params={"temperature": 0.7, "top_p": 0.8, "top_k": 20, "repetition_penalty": 1.1},
    )

    assert "--temp 0.7" in entry["cmd"]
    assert "--top-p 0.8" in entry["cmd"]
    assert "--top-k 20" in entry["cmd"]
    assert "--repeat-penalty 1.1" in entry["cmd"]
    # sampler flags come after ctx-related flags, before -hf
    assert entry["cmd"].index("--temp") < entry["cmd"].index("-hf org/repo")


def test_build_minimal_entry_emits_only_given_sampler_keys():
    entry = build_minimal_entry("org/repo", "model-Q4_K_M.gguf", sampler_params={"temperature": 0.7})

    assert "--temp 0.7" in entry["cmd"]
    assert "--top-p" not in entry["cmd"]
    assert "--top-k" not in entry["cmd"]
    assert "--repeat-penalty" not in entry["cmd"]


def test_build_minimal_entry_ignores_unrecognized_sampler_keys():
    entry = build_minimal_entry(
        "org/repo", "model-Q4_K_M.gguf", sampler_params={"some_unknown_key": 1.0}
    )

    assert "some_unknown_key" not in entry["cmd"]
    assert "1.0" not in entry["cmd"]


def test_build_minimal_entry_emits_min_p_and_presence_penalty():
    entry = build_minimal_entry(
        "org/repo",
        "model-Q4_K_M.gguf",
        sampler_params={"min_p": 0.0, "presence_penalty": 1.5},
    )

    assert "--min-p 0.0" in entry["cmd"]
    assert "--presence-penalty 1.5" in entry["cmd"]


def test_build_minimal_entry_omits_reasoning_flags_by_default():
    entry = build_minimal_entry("org/repo", "model-Q4_K_M.gguf")

    assert "--reasoning" not in entry["cmd"]


def test_build_minimal_entry_emits_reasoning_on():
    entry = build_minimal_entry("org/repo", "model-Q4_K_M.gguf", reasoning="on")
    assert "--reasoning on" in entry["cmd"]


def test_build_minimal_entry_emits_reasoning_off():
    entry = build_minimal_entry("org/repo", "model-Q4_K_M.gguf", reasoning="off")
    assert "--reasoning off" in entry["cmd"]


def test_build_minimal_entry_rejects_invalid_reasoning_value():
    with pytest.raises(ValueError, match="reasoning"):
        build_minimal_entry("org/repo", "model-Q4_K_M.gguf", reasoning="maybe")


def test_build_minimal_entry_emits_reasoning_budget_and_message():
    entry = build_minimal_entry(
        "org/repo",
        "model-Q4_K_M.gguf",
        reasoning_budget=2048,
        reasoning_budget_message="Final Answer:",
    )

    assert "--reasoning-budget 2048" in entry["cmd"]
    assert '--reasoning-budget-message "Final Answer:"' in entry["cmd"]
    # reasoning flags come after sampler flags, before -hf
    assert entry["cmd"].index("--reasoning-budget") < entry["cmd"].index("-hf org/repo")


def test_build_minimal_entry_escapes_double_quotes_in_reasoning_budget_message():
    entry = build_minimal_entry(
        "org/repo", "model-Q4_K_M.gguf", reasoning_budget_message='Say "done" now',
    )

    assert '--reasoning-budget-message "Say \\"done\\" now"' in entry["cmd"]
