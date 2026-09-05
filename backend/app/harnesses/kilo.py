import json

from app.harnesses.base import Step
from app.services.config import DerivedModel

_PROVIDER_ID = "openai-compatible"


class KiloHarness:
    id = "kilo"
    name = "Kilo Code"
    config_path = "kilo.jsonc"
    format = "jsonc"
    docs_url = "https://kilocode.ai/docs/"
    icon = None

    def steps(self) -> list[Step]:
        return [
            {
                "title": "Locate your Kilo config",
                "body": "Kilo Code reads provider config from kilo.jsonc in your project root.",
            },
            {
                "title": "Merge in the Swapyard provider",
                "body": (
                    "Add the block below to kilo.jsonc, merging \"provider\" with any "
                    "existing providers. The top-level \"model\" key points Kilo at the "
                    "first model as your default — change it to any id you'd rather use."
                ),
            },
        ]

    def render(self, models: list[DerivedModel], base_url: str) -> str:
        model_entries: dict = {}
        for m in models:
            entry: dict = {"tool_call": True}
            if m.context is not None:
                entry["limit"] = {"context": m.context}
            entry["modalities"] = {"input": ["text", "image"] if m.vision else ["text"]}
            if m.reasoning:
                entry["reasoning"] = True
            model_entries[m.id] = entry

        data: dict = {
            "provider": {
                _PROVIDER_ID: {
                    "options": {"baseURL": base_url, "apiKey": "sk-local"},
                    "models": model_entries,
                }
            }
        }
        if models:
            data["model"] = f"{_PROVIDER_ID}/{models[0].id}"
        return json.dumps(data, indent=2) + "\n"


HARNESS = KiloHarness()
