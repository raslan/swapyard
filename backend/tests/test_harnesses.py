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


def test_openclaw_config_path_is_a_real_basename():
    assert openclaw.HARNESS.config_path == "openclaw.json"


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


from app.harnesses import hermes_agent, qwen_code


def test_qwen_code_render_shape():
    data = json.loads(qwen_code.HARNESS.render(MODELS, BASE_URL))
    provider = data["modelProviders"]["openai"][0]
    assert provider["baseUrl"] == BASE_URL
    assert provider["apiKey"] == "sk-local"

    vision_entry = next(m for m in provider["models"] if m["id"] == "vision-model")
    gen = vision_entry["generationConfig"]
    assert gen["contextWindowSize"] == 8192
    assert gen["modalities"]["image"] is True
    assert gen["reasoning"]["effort"] == "medium"

    plain_entry = next(m for m in provider["models"] if m["id"] == "plain-model")
    gen = plain_entry["generationConfig"]
    assert "contextWindowSize" not in gen
    assert gen["modalities"]["image"] is False
    assert gen["reasoning"]["effort"] == "none"


def test_hermes_agent_render_shape():
    data = _yaml.safe_load(hermes_agent.HARNESS.render(MODELS, BASE_URL))
    provider = data["providers"]["swapyard"]
    assert provider["base_url"] == BASE_URL
    assert provider["api_key"] == "sk-local"

    vision_entry = provider["models"]["vision-model"]
    assert vision_entry["context_length"] == 8192
    assert vision_entry["capabilities"] == {"vision": True, "reasoning": True}

    plain_entry = provider["models"]["plain-model"]
    assert "context_length" not in plain_entry
    assert plain_entry["capabilities"] == {"vision": False, "reasoning": False}


def test_all_harnesses_registered_in_display_order():
    from app.harnesses import HARNESSES

    assert [h.id for h in HARNESSES] == [
        "opencode", "kilo", "pi", "oh-my-pi", "openclaw", "qwen-code", "hermes-agent",
        "continue", "cline", "aider", "llm", "openai-compatible",
    ]


def test_every_harness_renders_valid_output_for_empty_model_list():
    from app.harnesses import HARNESSES

    for h in HARNESSES:
        rendered = h.render([], BASE_URL)
        if h.format == "yaml":
            _yaml.safe_load(rendered)
        elif h.format == "json":
            json.loads(rendered)
        else:
            assert isinstance(rendered, str) and rendered != ""


from app.harnesses import aider, cline, continue_dev, llm_cli, openai_compatible


def test_continue_render_shape():
    data = _yaml.safe_load(continue_dev.HARNESS.render(MODELS, BASE_URL))
    entries = {e["name"]: e for e in data["models"]}

    vision_entry = entries["vision-model"]
    assert vision_entry["provider"] == "openai"
    assert vision_entry["apiBase"] == BASE_URL
    assert vision_entry["apiKey"] == "sk-local"
    assert "image_input" in vision_entry["capabilities"]
    assert "tool_use" in vision_entry["capabilities"]

    plain_entry = entries["plain-model"]
    assert "image_input" not in plain_entry["capabilities"]
    assert "tool_use" in plain_entry["capabilities"]


def test_cline_render_shape():
    data = json.loads(cline.HARNESS.render(MODELS, BASE_URL))
    assert data["cline.openAiBaseUrl"] == BASE_URL
    assert data["cline.openAiApiKey"] == "sk-local"
    assert data["cline.openAiModelId"] == "vision-model"

    info = data["cline.openAiModelInfo"]
    assert info["vision-model"]["supportsImages"] is True
    assert info["vision-model"]["contextWindow"] == 8192
    assert info["plain-model"]["supportsImages"] is False
    assert "contextWindow" not in info["plain-model"]


def test_cline_render_with_no_models_omits_model_id():
    data = json.loads(cline.HARNESS.render([], BASE_URL))
    assert "cline.openAiModelId" not in data
    assert data["cline.openAiModelInfo"] == {}


def test_aider_render_shape():
    rendered = aider.HARNESS.render(MODELS, BASE_URL)
    assert "# openai/vision-model  (context: 8192, vision: yes)" in rendered
    assert "# openai/plain-model  (context: server default, vision: no)" in rendered

    data = _yaml.safe_load(rendered)
    assert data["openai-api-base"] == BASE_URL
    assert data["openai-api-key"] == "sk-local"
    assert data["model"] == "openai/vision-model"


def test_llm_render_shape():
    data = _yaml.safe_load(llm_cli.HARNESS.render(MODELS, BASE_URL))
    vision_entry = next(e for e in data if e["model_name"] == "vision-model")
    assert vision_entry["model_id"] == "swapyard/vision-model"
    assert vision_entry["api_base"] == BASE_URL
    assert vision_entry["api_key"] == "sk-local"
    assert vision_entry["vision"] is True

    plain_entry = next(e for e in data if e["model_name"] == "plain-model")
    assert "vision" not in plain_entry


def test_openai_compatible_render_shape():
    rendered = openai_compatible.HARNESS.render(MODELS, BASE_URL)
    assert "OPENAI_API_BASE_URL" in rendered
    assert BASE_URL in rendered
    assert "sk-local" in rendered
    assert "# Models: vision-model, plain-model" in rendered

    empty = openai_compatible.HARNESS.render([], BASE_URL)
    assert "# Models: (none downloaded yet)" in empty
