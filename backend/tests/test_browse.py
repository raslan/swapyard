import time
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import httpx
import pytest
from huggingface_hub.errors import HfHubHTTPError, RepositoryNotFoundError

from app.errors import NotFoundError, UpstreamError
from app.services.browse import (
    _SUMMARY_EXPAND_FIELDS,
    SamplerRecommendation,
    _categorize_file,
    _extract_base_model,
    _fetch_readme,
    _fetch_xet_filenames,
    get_discover_sections,
    get_model_detail,
    get_recommended_sampler_params,
    list_gguf_files,
    parse_sampler_params_from_readme,
    search_models,
)
from app.services.manage import list_managed_models


def _http_error(exc_cls, status_code, message):
    request = httpx.Request("GET", "https://huggingface.co/api/models/x")
    response = httpx.Response(status_code, request=request)
    return exc_cls(message, response=response)


def test_categorize_file():
    assert _categorize_file("model.Q4_K_M.gguf") == "gguf"
    assert _categorize_file("mmproj-model-f16.gguf") == "mmproj"
    assert _categorize_file("tokenizer_config.json") == "other"
    assert _categorize_file("model.safetensors") is None
    assert _categorize_file(".gitattributes") is None


@patch("app.services.browse.HfApi")
def test_search_models_uses_gguf_filter(mock_hf_api_cls):
    mock_api = MagicMock()
    mock_hf_api_cls.return_value = mock_api
    mock_model = MagicMock(
        id="org/model",
        author="org",
        downloads=100,
        likes=5,
        tags=["gguf"],
        pipeline_tag="text-generation",
        last_modified=None,
        gated=False,
        gguf=None,
    )
    mock_api.list_models.return_value = [mock_model]

    results = search_models("llama")

    mock_api.list_models.assert_called_once_with(
        search="llama", filter="gguf", sort="downloads", limit=20, expand=_SUMMARY_EXPAND_FIELDS
    )
    assert results[0].repo_id == "org/model"
    assert results[0].downloads == 100
    assert results[0].pipeline_tag == "text-generation"


def _model(
    repo_id,
    author,
    pipeline_tag="text-generation",
    tags=None,
    downloads=100,
    last_modified=None,
    gated=False,
    gguf=None,
):
    return MagicMock(
        id=repo_id,
        author=author,
        downloads=downloads,
        likes=1,
        tags=tags or ["gguf"],
        pipeline_tag=pipeline_tag,
        last_modified=last_modified,
        gated=gated,
        gguf=gguf,
    )


@patch("app.services.browse.HfApi")
def test_get_discover_sections_splits_pool_into_sections(mock_hf_api_cls):
    mock_api = MagicMock()
    mock_hf_api_cls.return_value = mock_api
    mock_api.list_models.return_value = [
        _model("chat/one", "chat-org", downloads=500),
        _model("chat/two", "chat-org", downloads=400),
        _model("vision/one", "vision-org", pipeline_tag="image-text-to-text", downloads=300),
        _model("agent/one", "agent-org", tags=["gguf", "agentic-coding"], downloads=200),
        _model("embed/one", "embed-org", pipeline_tag="feature-extraction", downloads=100),
        _model("solo/one", "solo-org", downloads=50),
    ]

    sections = get_discover_sections()

    mock_api.list_models.assert_called_once_with(
        filter="gguf", sort="downloads", limit=100, expand=_SUMMARY_EXPAND_FIELDS
    )

    trending_ids = [m.repo_id for m in sections.trending]
    assert "embed/one" not in trending_ids
    assert trending_ids[0] == "chat/one"

    assert [m.repo_id for m in sections.embeddings] == ["embed/one"]
    assert [m.repo_id for m in sections.vision] == ["vision/one"]
    assert [m.repo_id for m in sections.agentic] == ["agent/one"]


@patch("app.services.browse.HfApi")
def test_to_summary_converts_last_modified_and_gated(mock_hf_api_cls):
    mock_api = MagicMock()
    mock_hf_api_cls.return_value = mock_api
    timestamp = datetime(2026, 1, 1, tzinfo=timezone.utc)
    mock_api.list_models.return_value = [
        _model("org/model", "org", last_modified=timestamp, gated=True),
    ]

    results = search_models("llama")

    assert results[0].last_modified == timestamp.timestamp()
    assert results[0].gated is True


@patch("app.services.browse.HfApi")
def test_to_summary_extracts_params_and_total_size_from_gguf_metadata(mock_hf_api_cls):
    mock_api = MagicMock()
    mock_hf_api_cls.return_value = mock_api
    mock_api.list_models.return_value = [
        _model(
            "org/model",
            "org",
            gguf={
                "total": 8_953_803_264,
                "totalFileSize": 17_920_696_512,
                "architecture": "qwen35",
                "chat_template": "x" * 5000,
            },
        ),
    ]

    results = search_models("llama")

    assert results[0].params == 8_953_803_264
    assert results[0].total_size == 17_920_696_512


@patch("app.services.browse.HfApi")
def test_to_summary_handles_missing_gguf_metadata(mock_hf_api_cls):
    mock_api = MagicMock()
    mock_hf_api_cls.return_value = mock_api
    mock_api.list_models.return_value = [_model("org/model", "org", gguf=None)]

    results = search_models("llama")

    assert results[0].params is None
    assert results[0].total_size is None


@patch("app.services.browse.HfApi")
def test_get_model_detail_not_found_raises(mock_hf_api_cls):
    mock_api = MagicMock()
    mock_hf_api_cls.return_value = mock_api
    mock_api.model_info.side_effect = _http_error(RepositoryNotFoundError, 404, "404 Client Error")

    with pytest.raises(NotFoundError):
        get_model_detail("missing/repo")


@patch("app.services.browse.HfApi")
def test_get_model_detail_upstream_error_on_other_http_failure(mock_hf_api_cls):
    mock_api = MagicMock()
    mock_hf_api_cls.return_value = mock_api
    mock_api.model_info.side_effect = _http_error(HfHubHTTPError, 503, "503 Server Error")

    with pytest.raises(UpstreamError):
        get_model_detail("some/repo")


@patch("app.services.browse._fetch_xet_filenames")
@patch("app.services.browse._fetch_readme")
@patch("app.services.browse.HfApi")
def test_get_model_detail_happy_path(mock_hf_api_cls, mock_fetch_readme, mock_fetch_xet):
    mock_api = MagicMock()
    mock_hf_api_cls.return_value = mock_api

    siblings = [
        MagicMock(rfilename="model.Q4_K_M.gguf", size=1000),
        MagicMock(rfilename="mmproj-model-f16.gguf", size=200),
        MagicMock(rfilename="tokenizer_config.json", size=50),
        MagicMock(rfilename="model.safetensors", size=5000),
    ]
    mock_info = MagicMock(
        id="org/model",
        author="org",
        downloads=123,
        likes=45,
        siblings=siblings,
        gguf={"context_length": 32768, "architecture": "qwen2"},
        card_data=None,
    )
    mock_api.model_info.return_value = mock_info
    mock_fetch_readme.return_value = "# Model Card\n\nSome readme content."
    mock_fetch_xet.return_value = {"model.Q4_K_M.gguf"}

    detail = get_model_detail("org/model")

    assert detail.repo_id == "org/model"
    assert detail.author == "org"
    assert detail.downloads == 123
    assert detail.likes == 45
    assert detail.readme == "# Model Card\n\nSome readme content."
    assert detail.context_length == 32768

    assert len(detail.files) == 3
    files_by_name = {f.name: f for f in detail.files}
    assert "model.safetensors" not in files_by_name
    assert files_by_name["model.Q4_K_M.gguf"].category == "gguf"
    assert files_by_name["model.Q4_K_M.gguf"].size == 1000
    assert files_by_name["model.Q4_K_M.gguf"].is_xet is True
    assert files_by_name["mmproj-model-f16.gguf"].category == "mmproj"
    assert files_by_name["mmproj-model-f16.gguf"].is_xet is False
    assert files_by_name["tokenizer_config.json"].category == "other"


@patch("app.services.browse._fetch_xet_filenames")
@patch("app.services.browse._fetch_readme")
@patch("app.services.browse.HfApi")
def test_get_model_detail_context_length_none_when_gguf_metadata_missing(
    mock_hf_api_cls, mock_fetch_readme, mock_fetch_xet
):
    # HF's GGUF header parsing doesn't always succeed/apply (e.g. unusual
    # architectures) - `gguf` can legitimately come back None even for a
    # gguf-tagged repo, and context_length must fall back to None rather
    # than raising on the `.get()` call.
    mock_api = MagicMock()
    mock_hf_api_cls.return_value = mock_api
    mock_info = MagicMock(
        id="org/model", author="org", downloads=1, likes=0, siblings=[], gguf=None, card_data=None,
    )
    mock_api.model_info.return_value = mock_info
    mock_fetch_readme.return_value = ""
    mock_fetch_xet.return_value = set()

    detail = get_model_detail("org/model")

    assert detail.context_length is None


@patch("app.services.browse._fetch_xet_filenames")
@patch("app.services.browse._fetch_readme")
@patch("app.services.browse.HfApi")
def test_get_model_detail_runs_the_three_fetches_concurrently_not_sequentially(
    mock_hf_api_cls, mock_fetch_readme, mock_fetch_xet
):
    # Regression test: these three HTTP round trips are independent (none
    # needs another's result) and were previously run one after another,
    # summing their latencies for no reason. Each mock sleeps, so a
    # sequential implementation takes ~3x as long as a concurrent one.
    delay = 0.1

    def slow_model_info(*args, **kwargs):
        time.sleep(delay)
        return MagicMock(
            id="org/model", author="org", downloads=1, likes=1, siblings=[], card_data=None
        )

    def slow_fetch_readme(*args, **kwargs):
        time.sleep(delay)
        return "readme"

    def slow_fetch_xet(*args, **kwargs):
        time.sleep(delay)
        return set()

    mock_api = MagicMock()
    mock_hf_api_cls.return_value = mock_api
    mock_api.model_info.side_effect = slow_model_info
    mock_fetch_readme.side_effect = slow_fetch_readme
    mock_fetch_xet.side_effect = slow_fetch_xet

    start = time.monotonic()
    get_model_detail("org/model")
    elapsed = time.monotonic() - start

    # Concurrent: ~1x delay plus scheduling overhead. Sequential would be ~3x.
    assert elapsed < delay * 2


@patch("app.services.browse.HfApi")
def test_list_gguf_files_not_found_raises(mock_hf_api_cls):
    mock_api = MagicMock()
    mock_hf_api_cls.return_value = mock_api
    mock_api.model_info.side_effect = _http_error(RepositoryNotFoundError, 404, "404 Client Error")

    with pytest.raises(NotFoundError):
        list_gguf_files("missing/repo")


@patch("app.services.browse.HfApi")
def test_list_gguf_files_upstream_error_on_other_http_failure(mock_hf_api_cls):
    mock_api = MagicMock()
    mock_hf_api_cls.return_value = mock_api
    mock_api.model_info.side_effect = _http_error(HfHubHTTPError, 503, "503 Server Error")

    with pytest.raises(UpstreamError):
        list_gguf_files("some/repo")


@patch("app.services.browse._fetch_xet_filenames")
@patch("app.services.browse._fetch_readme")
@patch("app.services.browse.HfApi")
def test_list_gguf_files_skips_readme_and_xet_lookup(mock_hf_api_cls, mock_fetch_readme, mock_fetch_xet):
    mock_api = MagicMock()
    mock_hf_api_cls.return_value = mock_api

    siblings = [
        MagicMock(rfilename="model.Q4_K_M.gguf", size=1000),
        MagicMock(rfilename="mmproj-model-f16.gguf", size=200),
        MagicMock(rfilename="tokenizer_config.json", size=50),
        MagicMock(rfilename="model.safetensors", size=5000),
    ]
    mock_info = MagicMock(
        id="org/model",
        author="org",
        downloads=123,
        likes=45,
        siblings=siblings,
    )
    mock_api.model_info.return_value = mock_info

    files = list_gguf_files("org/model")

    mock_fetch_readme.assert_not_called()
    mock_fetch_xet.assert_not_called()

    assert len(files) == 3
    files_by_name = {f.name: f for f in files}
    assert "model.safetensors" not in files_by_name
    assert files_by_name["model.Q4_K_M.gguf"].category == "gguf"
    assert files_by_name["model.Q4_K_M.gguf"].size == 1000
    assert files_by_name["model.Q4_K_M.gguf"].is_xet is False
    assert files_by_name["mmproj-model-f16.gguf"].category == "mmproj"
    assert files_by_name["tokenizer_config.json"].category == "other"


@patch("app.services.browse.httpx.get")
def test_fetch_xet_filenames_reads_xethash_field(mock_get):
    mock_get.return_value = httpx.Response(
        200,
        json=[
            {"path": "model.gguf", "xetHash": "abc123"},
            {"path": "README.md"},
        ],
        request=httpx.Request("GET", "https://huggingface.co/api/models/org/model/tree/main"),
    )

    result = _fetch_xet_filenames("org/model")

    assert result == {"model.gguf"}


@patch("app.services.browse.httpx.get")
def test_fetch_xet_filenames_degrades_to_empty_set_on_error(mock_get):
    mock_get.return_value = httpx.Response(
        404,
        request=httpx.Request("GET", "https://huggingface.co/api/models/org/model/tree/main"),
    )

    assert _fetch_xet_filenames("org/model") == set()


@patch("app.services.browse.httpx.get")
def test_fetch_readme_success(mock_get):
    mock_get.return_value = httpx.Response(
        200,
        text="# Model Card\n\nHello.",
        request=httpx.Request("GET", "https://huggingface.co/org/model/resolve/main/README.md"),
    )

    readme = _fetch_readme("org/model")

    assert readme == "# Model Card\n\nHello."
    mock_get.assert_called_once_with(
        "https://huggingface.co/org/model/resolve/main/README.md",
        headers={},
        follow_redirects=True,
    )


@patch("app.services.browse.httpx.get")
def test_fetch_readme_strips_yaml_frontmatter(mock_get):
    mock_get.return_value = httpx.Response(
        200,
        text="---\nlicense: apache-2.0\ntags:\n- gguf\n---\n# Model Card\n\nHello.",
        request=httpx.Request("GET", "https://huggingface.co/org/model/resolve/main/README.md"),
    )

    readme = _fetch_readme("org/model")

    assert readme == "# Model Card\n\nHello."


@patch("app.services.browse.httpx.get")
def test_fetch_readme_not_found_returns_empty_string(mock_get):
    mock_get.return_value = httpx.Response(
        404,
        request=httpx.Request("GET", "https://huggingface.co/org/model/resolve/main/README.md"),
    )

    assert _fetch_readme("org/model") == ""


@patch("app.services.browse.httpx.get")
def test_fetch_readme_other_http_error_returns_empty_string(mock_get):
    mock_get.return_value = httpx.Response(
        503,
        request=httpx.Request("GET", "https://huggingface.co/org/model/resolve/main/README.md"),
    )

    assert _fetch_readme("org/model") == ""


@patch("app.services.browse.httpx.get")
def test_fetch_readme_network_error_returns_empty_string(mock_get):
    mock_get.side_effect = httpx.ConnectError("boom")

    assert _fetch_readme("org/model") == ""


@patch("app.services.browse.httpx.get")
def test_fetch_readme_sends_auth_header_when_token_set(mock_get, monkeypatch):
    monkeypatch.setenv("HF_TOKEN", "secret-token")
    mock_get.return_value = httpx.Response(
        200,
        text="content",
        request=httpx.Request("GET", "https://huggingface.co/org/model/resolve/main/README.md"),
    )

    _fetch_readme("org/model")

    mock_get.assert_called_once_with(
        "https://huggingface.co/org/model/resolve/main/README.md",
        headers={"Authorization": "Bearer secret-token"},
        follow_redirects=True,
    )


@patch("app.services.browse.httpx.get")
def test_fetch_readme_omits_auth_header_when_no_token(mock_get, monkeypatch):
    monkeypatch.delenv("HF_TOKEN", raising=False)
    mock_get.return_value = httpx.Response(
        200,
        text="content",
        request=httpx.Request("GET", "https://huggingface.co/org/model/resolve/main/README.md"),
    )

    _fetch_readme("org/model")

    _, kwargs = mock_get.call_args
    assert "Authorization" not in kwargs["headers"]


@patch("app.services.browse.httpx.get")
def test_fetch_readme_has_no_cache_side_effect(mock_get, tmp_path, monkeypatch):
    """Regression test for the double-card bug: previewing a model's README must
    not make it show up on the Manage screen (which reads via scan_cache_dir)."""
    monkeypatch.setenv("HF_HOME", str(tmp_path))
    mock_get.return_value = httpx.Response(
        200,
        text="# Some real content",
        request=httpx.Request("GET", "https://huggingface.co/org/model/resolve/main/README.md"),
    )

    readme = _fetch_readme("org/model")

    assert readme == "# Some real content"
    assert list(tmp_path.iterdir()) == []
    assert list_managed_models(cache_dir=str(tmp_path)) == []


def test_extract_base_model_returns_none_for_missing_card_data():
    assert _extract_base_model(None) is None


def test_extract_base_model_returns_string_value():
    card_data = MagicMock()
    card_data.get.return_value = "Qwen/Qwen2.5-0.5B-Instruct"
    assert _extract_base_model(card_data) == "Qwen/Qwen2.5-0.5B-Instruct"


def test_extract_base_model_takes_first_of_a_list():
    card_data = MagicMock()
    card_data.get.return_value = ["org/model-a", "org/model-b"]
    assert _extract_base_model(card_data) == "org/model-a"


def test_extract_base_model_returns_none_for_empty_list():
    card_data = MagicMock()
    card_data.get.return_value = []
    assert _extract_base_model(card_data) is None


@patch("app.services.browse.httpx.get")
def test_get_recommended_sampler_params_extracts_known_keys(mock_get):
    mock_get.return_value = httpx.Response(
        200,
        json={
            "bos_token_id": 151643,
            "do_sample": True,
            "temperature": 0.7,
            "top_p": 0.8,
            "top_k": 20,
            "repetition_penalty": 1.1,
        },
        request=httpx.Request(
            "GET", "https://huggingface.co/org/base-model/resolve/main/generation_config.json"
        ),
    )

    params = get_recommended_sampler_params("org/base-model")

    assert params == {"temperature": 0.7, "top_p": 0.8, "top_k": 20, "repetition_penalty": 1.1}
    mock_get.assert_called_once_with(
        "https://huggingface.co/org/base-model/resolve/main/generation_config.json",
        headers={},
        follow_redirects=True,
    )


@patch("app.services.browse.httpx.get")
def test_get_recommended_sampler_params_returns_none_when_no_known_keys_present(mock_get):
    mock_get.return_value = httpx.Response(
        200,
        json={"bos_token_id": 151643, "do_sample": True},
        request=httpx.Request(
            "GET", "https://huggingface.co/org/base-model/resolve/main/generation_config.json"
        ),
    )

    assert get_recommended_sampler_params("org/base-model") is None


@patch("app.services.browse.httpx.get")
def test_get_recommended_sampler_params_returns_none_on_404(mock_get):
    mock_get.return_value = httpx.Response(
        404,
        request=httpx.Request(
            "GET", "https://huggingface.co/org/base-model/resolve/main/generation_config.json"
        ),
    )

    assert get_recommended_sampler_params("org/base-model") is None


@patch("app.services.browse.httpx.get")
def test_get_recommended_sampler_params_returns_none_on_network_error(mock_get):
    mock_get.side_effect = httpx.ConnectError("boom")

    assert get_recommended_sampler_params("org/base-model") is None


@patch("app.services.browse.httpx.get")
def test_get_recommended_sampler_params_returns_none_on_invalid_json(mock_get):
    mock_get.return_value = httpx.Response(
        200,
        text="not json",
        request=httpx.Request(
            "GET", "https://huggingface.co/org/base-model/resolve/main/generation_config.json"
        ),
    )

    assert get_recommended_sampler_params("org/base-model") is None


@patch("app.services.browse._fetch_xet_filenames")
@patch("app.services.browse._fetch_readme")
@patch("app.services.browse.HfApi")
def test_get_model_detail_includes_recommended_sampler_params_via_base_model(
    mock_hf_api_cls, mock_fetch_readme, mock_fetch_xet
):
    mock_api = MagicMock()
    mock_hf_api_cls.return_value = mock_api
    card_data = MagicMock()
    card_data.get.return_value = "org/base-model"
    mock_api.model_info.return_value = MagicMock(
        id="org/model", author="org", downloads=1, likes=0, siblings=[], gguf=None,
        card_data=card_data,
    )
    mock_fetch_readme.return_value = ""
    mock_fetch_xet.return_value = set()

    with patch("app.services.browse.get_recommended_sampler_params") as mock_sampler:
        mock_sampler.return_value = {"temperature": 0.7}
        detail = get_model_detail("org/model")

    mock_sampler.assert_called_once_with("org/base-model")
    assert detail.recommended_sampler_params == [
        SamplerRecommendation("Model's published defaults", {"temperature": 0.7})
    ]


@patch("app.services.browse._fetch_xet_filenames")
@patch("app.services.browse._fetch_readme")
@patch("app.services.browse.HfApi")
def test_get_model_detail_skips_sampler_lookup_when_no_base_model(
    mock_hf_api_cls, mock_fetch_readme, mock_fetch_xet
):
    mock_api = MagicMock()
    mock_hf_api_cls.return_value = mock_api
    mock_api.model_info.return_value = MagicMock(
        id="org/model", author="org", downloads=1, likes=0, siblings=[], gguf=None,
        card_data=None,
    )
    mock_fetch_readme.return_value = ""
    mock_fetch_xet.return_value = set()

    with patch("app.services.browse.get_recommended_sampler_params") as mock_sampler:
        detail = get_model_detail("org/model")

    mock_sampler.assert_not_called()
    assert detail.recommended_sampler_params is None


def test_parse_sampler_params_from_readme_real_qwen_style_multi_block():
    # Real text pulled from Qwen/Qwen3.5-0.8B's actual README.
    readme = (
        "> [!Tip]\n"
        "> We recommend using the following set of sampling parameters for generation\n"
        "> - Non-thinking mode for text tasks: `temperature=1.0, top_p=1.00, top_k=20, "
        "min_p=0.0, presence_penalty=2.0, repetition_penalty=1.0`\n"
        "> - Non-thinking mode for VL tasks: `temperature=0.7, top_p=0.80, top_k=20, "
        "min_p=0.0, presence_penalty=1.5, repetition_penalty=1.0`\n"
        "> - Thinking mode for text tasks: `temperature=1.0, top_p=0.95, top_k=20, "
        "min_p=0.0, presence_penalty=1.5, repetition_penalty=1.0`\n"
        "> - Thinking mode for VL or precise coding (e.g. WebDev) tasks : "
        "`temperature=0.6, top_p=0.95, top_k=20, min_p=0.0, presence_penalty=0.0, "
        "repetition_penalty=1.0`\n"
        ">\n"
        "> Please note that the support for sampling parameters varies according to "
        "inference frameworks.\n"
    )

    recommendations = parse_sampler_params_from_readme(readme)

    assert len(recommendations) == 4
    assert recommendations[0].label == "Non-thinking mode for text tasks"
    assert recommendations[0].params == {
        "temperature": 1.0, "top_p": 1.00, "top_k": 20, "min_p": 0.0,
        "presence_penalty": 2.0, "repetition_penalty": 1.0,
    }
    assert recommendations[3].label == "Thinking mode for VL or precise coding (e.g. WebDev) tasks"
    assert recommendations[3].params["temperature"] == 0.6


def test_parse_sampler_params_from_readme_ignores_second_multiline_restatement():
    # Regression test: unsloth/Qwen3.5-0.8B-GGUF's real README states the same
    # recommendations twice - once in the single-line blockquote form (parsed above),
    # and again later in a multi-line bold-label form where each key=value is its own
    # separate backtick span on the following line. The second form must NOT also be
    # matched (it would previously produce a bogus second, single-key "recommendation"
    # per mode, with a literal "**" still in its label).
    readme = (
        "> - Non-thinking mode for text tasks: `temperature=1.0, top_p=1.00, top_k=20, "
        "min_p=0.0, presence_penalty=2.0, repetition_penalty=1.0`\n"
        "\n"
        "     - **Non-thinking mode for text tasks**:  \n"
        "       `temperature=1.0`, `top_p=1.00`, `top_k=20`, `min_p=0.0`, "
        "`presence_penalty=2.0`, `repetition_penalty=1.0`\n"
    )

    recommendations = parse_sampler_params_from_readme(readme)

    assert len(recommendations) == 1
    assert recommendations[0].label == "Non-thinking mode for text tasks"
    assert "*" not in recommendations[0].label
    assert recommendations[0].params == {
        "temperature": 1.0, "top_p": 1.00, "top_k": 20, "min_p": 0.0,
        "presence_penalty": 2.0, "repetition_penalty": 1.0,
    }


def test_parse_sampler_params_from_readme_returns_empty_for_no_matches():
    assert parse_sampler_params_from_readme("# Just a normal README\n\nNo tables here.") == []


def test_parse_sampler_params_from_readme_drops_blocks_with_no_recognized_keys():
    readme = "- Some setting: `foo=1, bar=2`\n"
    assert parse_sampler_params_from_readme(readme) == []


def test_parse_sampler_params_from_readme_filters_unrecognized_keys_within_a_block():
    readme = "- Recommended: `temperature=0.6, some_other_thing=5, top_p=0.9`\n"
    recommendations = parse_sampler_params_from_readme(readme)
    assert len(recommendations) == 1
    assert recommendations[0].params == {"temperature": 0.6, "top_p": 0.9}
