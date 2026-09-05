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


import yaml as _yaml

from app.harnesses import ohmypi, openclaw, pi


def test_pi_render_shape():
    data = json.loads(pi.HARNESS.render(MODELS, BASE_URL))
    provider = data["providers"]["swapyard"]
    assert provider["baseUrl"] == BASE_URL
    assert provider["apiKey"] == "sk-local"

    vision_entry = next(m for m in provider["models"] if m["id"] == "vision-model")
    assert vision_entry["contextWindow"] == 8192
    assert vision_entry["reasoning"] is True
    assert vision_entry["input"] == ["text", "image"]

    plain_entry = next(m for m in provider["models"] if m["id"] == "plain-model")
    assert "contextWindow" not in plain_entry
    assert plain_entry["reasoning"] is False
    assert plain_entry["input"] == ["text"]


def test_ohmypi_render_is_yaml_twin_of_pi_shape():
    pi_data = json.loads(pi.HARNESS.render(MODELS, BASE_URL))
    yaml_data = _yaml.safe_load(ohmypi.HARNESS.render(MODELS, BASE_URL))
    assert yaml_data == pi_data


def test_openclaw_render_shape():
    data = json.loads(openclaw.HARNESS.render(MODELS, BASE_URL))
    provider = data["models"]["providers"]["swapyard"]
    assert provider["baseUrl"] == BASE_URL
    assert provider["apiKey"] == "sk-local"

    vision_entry = provider["models"]["vision-model"]
    assert vision_entry["contextWindow"] == 8192
    assert vision_entry["reasoning"] is True
    assert vision_entry["vision"] is True

    plain_entry = provider["models"]["plain-model"]
    assert "contextWindow" not in plain_entry
    assert plain_entry["vision"] is False
