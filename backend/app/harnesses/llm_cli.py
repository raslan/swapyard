import yaml

from app.harnesses.base import Step
from app.services.config import DerivedModel


class LlmCliHarness:
    id = "llm"
    name = "llm CLI"
    config_path = "~/.config/io.datasette.llm/extra-openai-models.yaml"
    format = "yaml"
    docs_url = "https://llm.datasette.io"
    icon = None

    def steps(self) -> list[Step]:
        return [
            {
                "title": "Find extra-openai-models.yaml",
                "body": (
                    "Run: dirname \"$(llm logs path)\" — the file sits at "
                    "<that dir>/extra-openai-models.yaml "
                    "(~/.config/io.datasette.llm/extra-openai-models.yaml on Linux/mac)."
                ),
            },
            {
                "title": "Append these model entries",
                "body": "Add the list below, merging with any entries already present.",
            },
            {
                "title": "Set the API key",
                "body": (
                    "Run: llm keys set swapyard and paste sk-local. llm requires a "
                    "key even for local endpoints; api_key_name points at it."
                ),
            },
        ]

    def render(self, models: list[DerivedModel], base_url: str) -> str:
        entries = []
        for m in models:
            entry: dict = {
                "model_id": f"swapyard/{m.id}",
                "model_name": m.id,
                "api_base": base_url,
                "api_key_name": "swapyard",
                "can_stream": True,
            }
            if m.vision:
                entry["vision"] = True
            entries.append(entry)
        return yaml.safe_dump(entries, sort_keys=False)


HARNESS = LlmCliHarness()
