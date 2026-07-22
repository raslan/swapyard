from unittest.mock import MagicMock, patch

import httpx
import pytest
from huggingface_hub.errors import HfHubHTTPError, RepositoryNotFoundError

from app.errors import NotFoundError, UpstreamError
from app.services.browse import (
    _categorize_file,
    _fetch_readme,
    _fetch_xet_filenames,
    get_model_detail,
    list_gguf_files,
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
    mock_model = MagicMock(id="org/model", author="org", downloads=100, likes=5, tags=["gguf"])
    mock_api.list_models.return_value = [mock_model]

    results = search_models("llama")

    mock_api.list_models.assert_called_once_with(
        search="llama", filter="gguf", sort="downloads", limit=20
    )
    assert results[0].repo_id == "org/model"
    assert results[0].downloads == 100


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

    assert len(detail.files) == 3
    files_by_name = {f.name: f for f in detail.files}
    assert "model.safetensors" not in files_by_name
    assert files_by_name["model.Q4_K_M.gguf"].category == "gguf"
    assert files_by_name["model.Q4_K_M.gguf"].size == 1000
    assert files_by_name["model.Q4_K_M.gguf"].is_xet is True
    assert files_by_name["mmproj-model-f16.gguf"].category == "mmproj"
    assert files_by_name["mmproj-model-f16.gguf"].is_xet is False
    assert files_by_name["tokenizer_config.json"].category == "other"


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
