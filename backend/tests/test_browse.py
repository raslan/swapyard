from unittest.mock import MagicMock, patch

import httpx
import pytest
from huggingface_hub.errors import HfHubHTTPError, RepositoryNotFoundError

from app.errors import NotFoundError, UpstreamError
from app.services.browse import _categorize_file, get_model_detail, search_models


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


@patch("app.services.browse._fetch_readme")
@patch("app.services.browse.HfApi")
def test_get_model_detail_happy_path(mock_hf_api_cls, mock_fetch_readme):
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
    assert files_by_name["mmproj-model-f16.gguf"].category == "mmproj"
    assert files_by_name["tokenizer_config.json"].category == "other"
