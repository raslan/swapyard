import json

from app.harnesses.base import Step
from app.services.config import DerivedModel

_PROVIDER_ID = "swapyard"


class OpencodeHarness:
    id = "opencode"
    name = "opencode"
    config_path = "~/.config/opencode/opencode.json"
    format = "json"
    docs_url = "https://opencode.ai/docs/config/"
    icon = None

    def steps(self) -> list[Step]:
        return [
            {
                "title": "Locate your opencode config",
                "body": (
                    "opencode reads provider config from "
                    "~/.config/opencode/opencode.json, or a project-local opencode.json "
                    "if one exists in your working directory."
                ),
            },
            {
                "title": "Merge in the Swapyard provider",
                "body": (
                    "Add the block below under your config's top-level \"provider\" key. "
                    "If you already have other providers configured, merge this in "
                    "alongside them rather than replacing the whole file."
                ),
            },
        ]

    def render(self, models: list[DerivedModel], base_url: str) -> str:
        model_entries: dict = {}
        for m in models:
            entry: dict = {}
            if m.context is not None:
                entry["limit"] = {"context": m.context}
            entry["modalities"] = {"input": ["text", "image"] if m.vision else ["text"]}
            if m.reasoning:
                entry["reasoning"] = True
            model_entries[m.id] = entry

        data = {
            "provider": {
                _PROVIDER_ID: {
                    "options": {"baseURL": base_url, "apiKey": "sk-local"},
                    "models": model_entries,
                }
            }
        }
        return json.dumps(data, indent=2) + "\n"


HARNESS = OpencodeHarness()
