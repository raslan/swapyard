import json

from app.harnesses.base import Step
from app.services.config import DerivedModel

_PROVIDER_ID = "swapyard"


def _model_list(models: list[DerivedModel]) -> list[dict]:
    entries = []
    for m in models:
        entry: dict = {"id": m.id, "name": m.id}
        if m.context is not None:
            entry["contextWindow"] = m.context
        entry["reasoning"] = m.reasoning
        entry["input"] = ["text", "image"] if m.vision else ["text"]
        entries.append(entry)
    return entries


class PiHarness:
    id = "pi"
    name = "pi"
    config_path = "~/.pi/agent/models.json"
    format = "json"
    docs_url = "https://pi.dev"
    icon = None

    def steps(self) -> list[Step]:
        return [
            {
                "title": "Locate your pi models file",
                "body": "pi's agent reads provider/model config from ~/.pi/agent/models.json.",
            },
            {
                "title": "Merge in the Swapyard provider",
                "body": (
                    "Add the block below under \"providers\", merging with any providers "
                    "you already have configured."
                ),
            },
        ]

    def render(self, models: list[DerivedModel], base_url: str) -> str:
        data = {
            "providers": {
                _PROVIDER_ID: {
                    "baseUrl": base_url,
                    "apiKey": "sk-local",
                    "api": "openai",
                    "models": _model_list(models),
                }
            }
        }
        return json.dumps(data, indent=2) + "\n"


HARNESS = PiHarness()
