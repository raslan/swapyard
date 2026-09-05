import httpx
import pytest

from app.services.config import (
    ConfigConflict,
    ConfigInvalid,
    DerivedModel,
    add_model_entry,
    apply_config,
    commit_revision,
    derive_models,
    get_status,
    hash_content,
    list_revisions,
    model_ids_for_repo,
    model_refs,
    normalize_config_entries,
    parse_cmd_model_ref,
    read_config,
    remove_models_for_repo,
    validate_config,
)
from app.services.manage import ManagedModel


def test_hash_content_is_deterministic():
    assert hash_content("a: 1\n") == hash_content("a: 1\n")
    assert hash_content("a: 1\n") != hash_content("a: 2\n")


def test_read_config_returns_content_and_matching_hash(tmp_path):
    config_file = tmp_path / "config.yaml"
    config_file.write_text("models: {}\n")

    content, digest = read_config(str(config_file))

    assert content == "models: {}\n"
    assert digest == hash_content("models: {}\n")


def test_validate_config_accepts_minimal_valid_yaml():
    errors = validate_config("models:\n  foo:\n    cmd: llama-server\n")
    assert errors == []


def test_validate_config_rejects_malformed_yaml_syntax():
    errors = validate_config("models: [unterminated\n")
    assert len(errors) == 1
    assert "yaml" in errors[0].lower()


def test_validate_config_rejects_missing_required_models_key():
    errors = validate_config("healthCheckTimeout: 900\n")
    assert len(errors) == 1
    assert "models" in errors[0]


def test_get_status_returns_none_when_no_history_exists(tmp_path):
    history_dir = str(tmp_path / "history")
    assert get_status(history_dir) is None


def test_commit_revision_then_list_revisions_roundtrips_content(tmp_path):
    history_dir = str(tmp_path / "history")

    commit_revision(history_dir, "models: {a: 1}\n", "ok")
    commit_revision(history_dir, "models: {a: 2}\n", "failed: llama-swap unreachable")

    revisions = list_revisions(history_dir)

    assert len(revisions) == 2
    # list_revisions returns newest-first
    assert revisions[0]["status"] == "failed: llama-swap unreachable"
    assert revisions[0]["content"] == "models: {a: 2}\n"
    assert revisions[1]["status"] == "ok"
    assert revisions[1]["content"] == "models: {a: 1}\n"
    assert isinstance(revisions[0]["timestamp"], float)
    assert isinstance(revisions[0]["sha"], str)


def test_get_status_reflects_latest_commit(tmp_path):
    history_dir = str(tmp_path / "history")
    commit_revision(history_dir, "models: {}\n", "ok")
    commit_revision(history_dir, "models: {}\n", "unverified")

    status = get_status(history_dir)

    assert status["status"] == "unverified"
    assert isinstance(status["timestamp"], float)


def test_parse_cmd_model_ref_extracts_hf_repo_and_quant():
    ref = parse_cmd_model_ref("llama-server -hf org/repo:Q4_K_M --ctx-size 4096")
    assert ref == {"kind": "hf", "repo_id": "org/repo", "quant": "Q4_K_M"}


def test_parse_cmd_model_ref_extracts_hf_repo_without_quant():
    ref = parse_cmd_model_ref("llama-server --hf-repo org/repo")
    assert ref == {"kind": "hf", "repo_id": "org/repo", "quant": None}


def test_parse_cmd_model_ref_extracts_local_path():
    ref = parse_cmd_model_ref("llama-server -m /models/foo.gguf")
    assert ref == {"kind": "path", "path": "/models/foo.gguf"}


def test_parse_cmd_model_ref_returns_none_when_no_model_flag_present():
    assert parse_cmd_model_ref("llama-server --ctx-size 4096") is None


def test_model_refs_maps_model_ids_to_their_download():
    content = (
        "models:\n"
        "  a:\n"
        "    cmd: llama-server -hf org/repo:Q4_K_M\n"
        "  b:\n"
        "    cmd: llama-server --ctx-size 4096\n"
    )
    assert model_refs(content) == {"a": {"kind": "hf", "repo_id": "org/repo", "quant": "Q4_K_M"}}


def test_model_ids_for_repo_matches_only_hf_entries_for_that_repo():
    content = (
        "models:\n"
        "  a:\n"
        "    cmd: llama-server -hf org/repo:Q4_K_M\n"
        "  b:\n"
        "    cmd: llama-server -hf org/repo:Q8_0\n"
        "  c:\n"
        "    cmd: llama-server -hf other/repo\n"
    )
    assert model_ids_for_repo(content, "org/repo") == ["a", "b"]


def test_remove_models_for_repo_deletes_matching_entries_and_preserves_comments():
    content = (
        "# top comment\n"
        "models:\n"
        "  a: # inline comment\n"
        "    cmd: llama-server -hf org/repo:Q4_K_M\n"
        "  b:\n"
        "    cmd: llama-server -hf other/repo\n"
    )

    new_content, removed = remove_models_for_repo(content, "org/repo")

    assert removed == ["a"]
    assert "# top comment" in new_content
    assert "# inline comment" not in new_content  # removed along with entry a
    assert "a:" not in new_content
    assert "b:" in new_content


def test_model_ids_for_repo_matches_all_entries_sharing_one_repo_with_multiline_cmd():
    # Real-world shape: block-scalar `cmd: |`, quoted args containing escaped
    # newlines, macro refs like ${PORT} - two model entries (e.g. a "thinking" and
    # "no-think" variant) both pointing at the same downloaded repo.
    content = (
        "models:\n"
        "  qwen-a:\n"
        '    proxy: "http://127.0.0.1:${PORT}"\n'
        "    cmd: |\n"
        "      llama-server\n"
        "      --port ${PORT}\n"
        "      -hf unsloth/Qwen3.6-35B-A3B-MTP-GGUF:UD-Q4_K_M\n"
        '      --reasoning-budget-message "Final Answer:\\nBased on my analysis, "\n'
        "  qwen-b:\n"
        "    cmd: |\n"
        "      llama-server\n"
        "      -hf unsloth/Qwen3.6-35B-A3B-MTP-GGUF:UD-Q4_K_M\n"
        "      --reasoning off\n"
    )

    assert model_ids_for_repo(content, "unsloth/Qwen3.6-35B-A3B-MTP-GGUF") == ["qwen-a", "qwen-b"]

    new_content, removed = remove_models_for_repo(content, "unsloth/Qwen3.6-35B-A3B-MTP-GGUF")
    assert removed == ["qwen-a", "qwen-b"]
    assert "qwen-a" not in new_content
    assert "qwen-b" not in new_content


def test_remove_models_for_repo_is_noop_when_no_entries_match():
    content = "models:\n  a:\n    cmd: llama-server -hf org/repo\n"

    new_content, removed = remove_models_for_repo(content, "unrelated/repo")

    assert removed == []
    assert new_content == content


async def test_apply_config_raises_conflict_when_base_hash_is_stale(tmp_path):
    config_file = tmp_path / "config.yaml"
    config_file.write_text("models: {}\n")
    history_dir = str(tmp_path / "history")

    with pytest.raises(ConfigConflict) as exc_info:
        await apply_config(
            config_path=str(config_file),
            history_dir=history_dir,
            content="models: {a: 1}\n",
            base_hash="stale-hash",
            llama_swap_url=None,
        )
    assert exc_info.value.current_content == "models: {}\n"
    # file untouched
    assert config_file.read_text() == "models: {}\n"


async def test_apply_config_raises_invalid_for_bad_schema(tmp_path):
    config_file = tmp_path / "config.yaml"
    config_file.write_text("models: {}\n")
    history_dir = str(tmp_path / "history")

    with pytest.raises(ConfigInvalid) as exc_info:
        await apply_config(
            config_path=str(config_file),
            history_dir=history_dir,
            content="healthCheckTimeout: 900\n",
            base_hash=hash_content("models: {}\n"),
            llama_swap_url=None,
        )
    assert any("models" in e for e in exc_info.value.errors)
    assert config_file.read_text() == "models: {}\n"  # untouched


async def test_apply_config_writes_and_returns_unverified_without_llama_swap_url(tmp_path):
    config_file = tmp_path / "config.yaml"
    config_file.write_text("models: {}\n")
    history_dir = str(tmp_path / "history")

    result = await apply_config(
        config_path=str(config_file),
        history_dir=history_dir,
        content="models: {a: {cmd: llama-server}}\n",
        base_hash=hash_content("models: {}\n"),
        llama_swap_url=None,
    )

    assert result["status"] == "unverified"
    assert config_file.read_text() == "models: {a: {cmd: llama-server}}\n"


async def test_apply_config_returns_ok_when_health_check_succeeds(tmp_path, monkeypatch):
    config_file = tmp_path / "config.yaml"
    config_file.write_text("models: {}\n")
    history_dir = str(tmp_path / "history")

    class FakeResponse:
        status_code = 200

    async def fake_get(self, url, **kwargs):  # noqa: ANN001, ARG001
        return FakeResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    result = await apply_config(
        config_path=str(config_file),
        history_dir=history_dir,
        content="models: {a: {cmd: llama-server}}\n",
        base_hash=hash_content("models: {}\n"),
        llama_swap_url="http://fake-llama-swap:8080",
    )

    assert result["status"] == "ok"


async def test_apply_config_returns_failed_status_when_health_check_never_succeeds(
    tmp_path, monkeypatch
):
    config_file = tmp_path / "config.yaml"
    config_file.write_text("models: {}\n")
    history_dir = str(tmp_path / "history")

    class FakeErrorResponse:
        status_code = 500

    async def fake_get(self, url, **kwargs):  # noqa: ANN001, ARG001
        if url.endswith("/logs"):

            class LogsResponse:
                status_code = 200
                text = "panic: bad config"

            return LogsResponse()
        return FakeErrorResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    result = await apply_config(
        config_path=str(config_file),
        history_dir=history_dir,
        content="models: {a: {cmd: llama-server}}\n",
        base_hash=hash_content("models: {}\n"),
        llama_swap_url="http://fake-llama-swap:8080",
        health_poll_interval=0.01,
        health_poll_attempts=2,
    )

    assert result["status"].startswith("failed")
    assert "panic: bad config" in result["logs"]
    # file IS written even though verification failed - no auto-revert
    assert config_file.read_text() == "models: {a: {cmd: llama-server}}\n"


def test_add_model_entry_inserts_new_entry_preserving_existing_content():
    content = "# top comment\nmodels:\n  existing:\n    cmd: llama-server -hf a/b\n"
    entry = {"cmd": "llama-server --port ${PORT} -hf org/repo:Q4_K_M"}
    new_content = add_model_entry(content, "new-model", entry)

    assert "# top comment" in new_content
    assert "existing:" in new_content
    assert "new-model:" in new_content
    assert "org/repo:Q4_K_M" in new_content


def test_add_model_entry_inserts_blank_line_before_new_entry():
    content = "models:\n  existing:\n    cmd: llama-server -hf a/b\n"
    entry = {"cmd": "llama-server -hf org/repo:Q4_K_M"}
    new_content = add_model_entry(content, "new-model", entry)

    assert "cmd: llama-server -hf a/b\n\n  new-model:" in new_content


def test_add_model_entry_no_leading_blank_line_when_models_was_empty():
    entry = {"cmd": "llama-server -hf org/repo:Q4_K_M"}
    new_content = add_model_entry("models: {}\n", "first-model", entry)

    assert "models:\n  first-model:" in new_content


def test_add_model_entry_raises_on_duplicate_model_id():
    content = "models:\n  existing:\n    cmd: llama-server -hf a/b\n"

    with pytest.raises(ValueError, match="existing"):
        add_model_entry(content, "existing", {"cmd": "llama-server -hf x/y"})


def test_add_model_entry_creates_models_key_when_absent():
    entry = {"cmd": "llama-server -hf a/b"}
    new_content = add_model_entry("healthCheckTimeout: 120\n", "first", entry)

    assert "models:" in new_content
    assert "first:" in new_content


def test_add_model_entry_emits_literal_block_style_for_multiline_cmd():
    from app.services.model_entry import build_minimal_entry

    entry = build_minimal_entry("org/repo", "model-Q4_K_M.gguf")
    new_content = add_model_entry("models: {}\n", "new-model", entry)

    # The whole point: the SERIALIZED YAML must use `cmd: |` literal block
    # style, not a quoted single-line string with escaped \n's. A plain
    # multi-line Python str handed to ruamel does NOT get this automatically -
    # it requires LiteralScalarString wrapping in build_minimal_entry.
    assert "cmd: |" in new_content
    assert "llama-server" in new_content
    assert "-hf org/repo" in new_content
    assert "--hf-file model-Q4_K_M.gguf" in new_content


def test_add_model_entry_does_not_line_wrap_long_cmd():
    long_cmd = (
        "llama-server --port ${PORT} --fit -hf "
        "unsloth/Qwen3.6-35B-A3B-MTP-GGUF-really-quite-long-repo-name-here:"
        "qwen3.6-35b-a3b-UD-Q4_K_M-with-an-extra-long-quant-suffix.gguf"
    )
    entry = {"cmd": long_cmd, "proxy": "http://localhost:${PORT}", "checkEndpoint": "/health"}
    new_content = add_model_entry("models: {}\n", "new-model", entry)

    lines = new_content.splitlines()
    cmd_lines = [line for line in lines if "cmd:" in line]
    assert len(cmd_lines) == 1
    assert long_cmd in cmd_lines[0]


# --- normalize_config_entries -------------------------------------------------

_BLOCK_CONFIG = (
    "models:\n"
    "  kat:\n"
    "    proxy: http://127.0.0.1:${PORT}\n"
    "    cmd: |\n"
    "      llama-server\n"
    "      --port ${PORT}\n"
    "      --fit on\n"
    "      -hf gbuzhf/KAT-Coder-V2.5-Dev-MTP-GGUF:Kwaipilot_KAT-Coder-V2.5-Dev-MTP-APEX-I-Compact\n"
)

_DOWNLOADS = {
    "gbuzhf/KAT-Coder-V2.5-Dev-MTP-GGUF": {
        "gguf": [
            "Kwaipilot_KAT-Coder-V2.5-Dev-MTP-APEX-I-Compact.gguf",
            "Kwaipilot_KAT-Coder-V2.5-Dev-MTP-APEX-I-Compact-v2D-lite.gguf",
        ],
        "mmproj": [],
    }
}


def test_normalize_splits_hf_colon_quant_into_exact_hf_file():
    new_content, report = normalize_config_entries(_BLOCK_CONFIG, _DOWNLOADS)

    assert "-hf gbuzhf/KAT-Coder-V2.5-Dev-MTP-GGUF\n" in new_content
    assert (
        "--hf-file Kwaipilot_KAT-Coder-V2.5-Dev-MTP-APEX-I-Compact.gguf\n" in new_content
    )
    # the ambiguous sibling was NOT chosen, and the colon form is gone
    assert "APEX-I-Compact-v2D-lite" not in new_content
    assert ":Kwaipilot" not in new_content
    # other flags untouched
    assert "--fit on\n" in new_content
    assert report == [
        {
            "model_id": "kat",
            "changes": [
                "pinned --hf-file Kwaipilot_KAT-Coder-V2.5-Dev-MTP-APEX-I-Compact.gguf"
            ],
        }
    ]


def test_normalize_keeps_block_scalar_style_and_indentation():
    new_content, _ = normalize_config_entries(_BLOCK_CONFIG, _DOWNLOADS)

    assert "cmd: |\n" in new_content
    assert "      --hf-file " in new_content  # same 6-space indent as sibling flags


def test_normalize_is_idempotent():
    once, _ = normalize_config_entries(_BLOCK_CONFIG, _DOWNLOADS)
    twice, report = normalize_config_entries(once, _DOWNLOADS)

    assert twice == once
    assert report == []


def test_normalize_adds_mmproj_url_when_projector_downloaded_and_unpinned():
    downloads = {
        "org/vision-GGUF": {"gguf": ["vision-Q4_K_M.gguf"], "mmproj": ["mmproj-vision-f16.gguf"]}
    }
    content = (
        "models:\n"
        "  v:\n"
        "    cmd: |\n"
        "      llama-server\n"
        "      -hf org/vision-GGUF\n"
        "      --hf-file vision-Q4_K_M.gguf\n"
    )
    new_content, report = normalize_config_entries(content, downloads)

    assert (
        "--mmproj-url https://huggingface.co/org/vision-GGUF/resolve/main/mmproj-vision-f16.gguf\n"
        in new_content
    )
    assert report == [{"model_id": "v", "changes": ["pinned --mmproj-url mmproj-vision-f16.gguf"]}]


def test_normalize_does_not_touch_entry_that_already_pins_mmproj():
    downloads = {"org/v": {"gguf": ["v.gguf"], "mmproj": ["mmproj-a.gguf", "mmproj-b.gguf"]}}
    content = (
        "models:\n"
        "  v:\n"
        "    cmd: |\n"
        "      llama-server\n"
        "      -hf org/v\n"
        "      --hf-file v.gguf\n"
        "      --mmproj-url https://huggingface.co/org/v/resolve/main/mmproj-b.gguf\n"
    )
    new_content, report = normalize_config_entries(content, downloads)

    assert new_content == content
    assert report == []


def test_normalize_reports_and_skips_when_quant_unresolvable():
    content = (
        "models:\n"
        "  gone:\n"
        "    cmd: llama-server -hf org/deleted-GGUF:some-old-Q4_K_M\n"
    )
    new_content, report = normalize_config_entries(content, {})

    assert new_content == content
    assert report[0]["model_id"] == "gone"
    assert report[0]["changes"] == []
    assert "could not resolve" in report[0]["skipped"]


def test_normalize_handles_single_line_cmd():
    downloads = {"org/repo-GGUF": {"gguf": ["model-Q4_K_M.gguf"], "mmproj": []}}
    content = (
        "models:\n  m:\n"
        "    cmd: llama-server --port ${PORT} -hf org/repo-GGUF:model-Q4_K_M --jinja\n"
    )
    new_content, _ = normalize_config_entries(content, downloads)

    assert "-hf org/repo-GGUF --hf-file model-Q4_K_M.gguf --jinja" in new_content


def test_normalize_leaves_local_path_entries_alone():
    content = "models:\n  m:\n    cmd: llama-server -m /models/foo.gguf\n"
    new_content, report = normalize_config_entries(content, {})

    assert new_content == content
    assert report == []


# --- derive_models -------------------------------------------------


def _managed(repo_id: str, mmproj_files: list[str] | None = None) -> ManagedModel:
    return ManagedModel(
        repo_id=repo_id,
        size_on_disk=0,
        nb_files=0,
        last_modified=0.0,
        gguf_files=[],
        mmproj_files=mmproj_files or [],
        file_sizes={},
    )


def test_derive_models_extracts_explicit_context_size():
    content = "models:\n  a:\n    cmd: llama-server -hf org/repo --hf-file f.gguf --ctx-size 8192\n"
    result = derive_models(content, [])
    assert result == [DerivedModel(id="a", context=8192, vision=False, reasoning=False)]


def test_derive_models_omits_context_when_no_ctx_size_flag():
    content = "models:\n  a:\n    cmd: llama-server -hf org/repo --hf-file f.gguf --fit on\n"
    result = derive_models(content, [])
    assert result == [DerivedModel(id="a", context=None, vision=False, reasoning=False)]


def test_derive_models_detects_reasoning_on():
    content = "models:\n  a:\n    cmd: llama-server -hf org/repo --hf-file f.gguf --reasoning on\n"
    result = derive_models(content, [])
    assert result[0].reasoning is True


def test_derive_models_reasoning_off_does_not_set_flag():
    content = "models:\n  a:\n    cmd: llama-server -hf org/repo --hf-file f.gguf --reasoning off\n"
    result = derive_models(content, [])
    assert result[0].reasoning is False


def test_derive_models_vision_via_explicit_mmproj_url_in_cmd():
    content = (
        "models:\n  a:\n    cmd: llama-server -hf org/repo --hf-file f.gguf "
        "--mmproj-url https://huggingface.co/org/repo/resolve/main/mmproj.gguf\n"
    )
    result = derive_models(content, [])
    assert result[0].vision is True


def test_derive_models_vision_via_downloaded_mmproj_when_cmd_has_no_mmproj_url():
    content = "models:\n  a:\n    cmd: llama-server -hf org/repo --hf-file f.gguf\n"
    result = derive_models(content, [_managed("org/repo", mmproj_files=["mmproj.gguf"])])
    assert result[0].vision is True


def test_derive_models_no_vision_when_repo_has_no_downloaded_mmproj_and_no_flag():
    content = "models:\n  a:\n    cmd: llama-server -hf org/repo --hf-file f.gguf\n"
    result = derive_models(content, [_managed("org/repo")])
    assert result[0].vision is False


def test_derive_models_handles_local_path_entries_without_crashing():
    content = "models:\n  a:\n    cmd: llama-server -m /models/f.gguf --ctx-size 4096\n"
    result = derive_models(content, [])
    assert result == [DerivedModel(id="a", context=4096, vision=False, reasoning=False)]


def test_derive_models_multiple_entries_preserve_config_order():
    content = (
        "models:\n"
        "  first:\n    cmd: llama-server -hf a/b --hf-file f.gguf\n"
        "  second:\n    cmd: llama-server -hf c/d --hf-file g.gguf --ctx-size 2048\n"
    )
    result = derive_models(content, [])
    assert [m.id for m in result] == ["first", "second"]
    assert result[1].context == 2048
