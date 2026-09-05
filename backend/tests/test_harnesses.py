import json

from app.harnesses import kilo, opencode
from app.services.config import DerivedModel

VISION_REASONING_MODEL = DerivedModel(id="vision-model", context=8192, vision=True, reasoning=True)
PLAIN_MODEL = DerivedModel(id="plain-model", context=None, vision=False, reasoning=False)
MODELS = [VISION_REASONING_MODEL, PLAIN_MODEL]
BASE_URL = "http://localhost:8080/v1"


def test_opencode_render_shape():
    data = json.loads(opencode.HARNESS.render(MODELS, BASE_URL))
    provider = data["provider"]["swapyard"]
    assert provider["options"] == {"baseURL": BASE_URL, "apiKey": "sk-local"}

    vision_entry = provider["models"]["vision-model"]
    assert vision_entry["limit"] == {"context": 8192}
    assert vision_entry["modalities"] == {"input": ["text", "image"]}
    assert vision_entry["reasoning"] is True

    plain_entry = provider["models"]["plain-model"]
    assert "limit" not in plain_entry
    assert plain_entry["modalities"] == {"input": ["text"]}
    assert "reasoning" not in plain_entry


def test_kilo_render_shape():
    data = json.loads(kilo.HARNESS.render(MODELS, BASE_URL))
    provider = data["provider"]["openai-compatible"]
    assert provider["options"] == {"baseURL": BASE_URL, "apiKey": "sk-local"}
    assert data["model"] == "openai-compatible/vision-model"

    vision_entry = provider["models"]["vision-model"]
    assert vision_entry["tool_call"] is True
    assert vision_entry["limit"] == {"context": 8192}
    assert vision_entry["modalities"] == {"input": ["text", "image"]}

    plain_entry = provider["models"]["plain-model"]
    assert plain_entry["tool_call"] is True
    assert "limit" not in plain_entry


def test_kilo_render_with_no_models_omits_model_pointer():
    data = json.loads(kilo.HARNESS.render([], BASE_URL))
    assert "model" not in data
    assert data["provider"]["openai-compatible"]["models"] == {}
