from unittest.mock import MagicMock, patch

import pytest

from app.errors import NotFoundError
from app.services.browse import _categorize_file, get_model_detail, search_models


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
    mock_api.model_info.side_effect = Exception("404 Client Error")

    with pytest.raises(NotFoundError):
        get_model_detail("missing/repo")
