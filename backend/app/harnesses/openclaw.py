import json

from app.harnesses.base import Step
from app.services.config import DerivedModel

_PROVIDER_ID = "swapyard"


class OpenclawHarness:
    id = "openclaw"
    name = "OpenClaw"
    config_path = "OpenClaw's own config file (models.providers block)"
    format = "jsonc"
    docs_url = "https://github.com/openclaw/openclaw"
    icon = None

    def steps(self) -> list[Step]:
        return [
            {
                "title": "Locate the models.providers block",
                "body": "OpenClaw's own config file has a top-level \"models\" key with a \"providers\" map inside it.",
            },
            {
                "title": "Merge in the Swapyard provider",
                "body": (
                    "Add the block below under models.providers, merging with any "
                    "providers you already have. Reference these models elsewhere in "
                    f"your config as \"{_PROVIDER_ID}/<model-id>\"."
                ),
            },
        ]

    def render(self, models: list[DerivedModel], base_url: str) -> str:
        model_entries: dict = {}
        for m in models:
            entry: dict = {"reasoning": m.reasoning, "vision": m.vision}
            if m.context is not None:
                entry["contextWindow"] = m.context
            model_entries[m.id] = entry

        data = {
            "models": {
                "providers": {
                    _PROVIDER_ID: {
                        "baseUrl": base_url,
                        "apiKey": "sk-local",
                        "models": model_entries,
                    }
                }
            }
        }
        return json.dumps(data, indent=2) + "\n"


HARNESS = OpenclawHarness()
