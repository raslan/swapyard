from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.services.browse import ModelDetail, ModelFile, ModelSummary
from app.services.vram_estimate import QuantEstimate

client = TestClient(app)


@patch("app.routes.browse.search_models")
def test_search_route(mock_search):
    mock_search.return_value = [
        ModelSummary(repo_id="org/model", author="org", downloads=10, likes=1, tags=["gguf"])
    ]
    resp = client.get("/api/browse/search?q=llama")
    assert resp.status_code == 200
    assert resp.json()[0]["repo_id"] == "org/model"


@patch("app.routes.browse.get_model_detail")
def test_model_detail_route(mock_detail):
    mock_detail.return_value = ModelDetail(
        repo_id="org/model",
        author="org",
        downloads=10,
        likes=1,
        readme="# Hello",
        files=[ModelFile(name="model.Q4.gguf", size=123, category="gguf")],
    )
    resp = client.get("/api/browse/models/org/model")
    assert resp.status_code == 200
    body = resp.json()
    assert body["readme"] == "# Hello"
    assert body["files"][0]["category"] == "gguf"


@patch("app.routes.browse.compute_vram_estimate")
def test_vram_estimate_route(mock_compute):
    mock_compute.return_value = [
        QuantEstimate(
            quant="model-Q4_K_M.gguf",
            files=["model-Q4_K_M.gguf"],
            weight_bytes=4_000_000_000,
        )
    ]

    resp = client.get("/api/browse/org/model/vram-estimate")

    assert resp.status_code == 200
    body = resp.json()
    assert body["groups"][0]["quant"] == "model-Q4_K_M.gguf"
    assert body["groups"][0]["weight_bytes"] == 4_000_000_000
    mock_compute.assert_called_once_with("org/model")
