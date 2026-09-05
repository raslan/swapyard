import json

from app.harnesses.base import Step
from app.services.config import DerivedModel

_PROVIDER_ID = "openai"


class QwenCodeHarness:
    id = "qwen-code"
    name = "qwen-code"
    config_path = "~/.qwen/settings.json"
    format = "json"
    docs_url = "https://github.com/QwenLM/qwen-code"
    icon = None

    def steps(self) -> list[Step]:
        return [
            {
                "title": "Locate your qwen-code settings",
                "body": "qwen-code reads provider config from ~/.qwen/settings.json.",
            },
            {
                "title": "Merge in the Swapyard provider",
                "body": (
                    "Add the block below to the \"modelProviders.openai\" array, "
                    "merging with any entries you already have."
                ),
            },
        ]

    def render(self, models: list[DerivedModel], base_url: str) -> str:
        model_list = []
        for m in models:
            generation_config: dict = {
                "modalities": {"image": m.vision},
                "reasoning": {"effort": "medium" if m.reasoning else "none"},
            }
            if m.context is not None:
                generation_config["contextWindowSize"] = m.context
            model_list.append({"id": m.id, "generationConfig": generation_config})

        data = {
            "modelProviders": {
                _PROVIDER_ID: [
                    {
                        "baseUrl": base_url,
                        "apiKey": "sk-local",
                        "models": model_list,
                    }
                ]
            }
        }
        return json.dumps(data, indent=2) + "\n"


HARNESS = QwenCodeHarness()
