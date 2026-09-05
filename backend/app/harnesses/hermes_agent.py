import yaml

from app.harnesses.base import Step
from app.services.config import DerivedModel

_PROVIDER_ID = "swapyard"


class HermesAgentHarness:
    id = "hermes-agent"
    name = "Hermes Agent"
    config_path = "~/.hermes/config.yaml"
    format = "yaml"
    docs_url = "https://github.com/NousResearch/Hermes-Agent"
    icon = None

    def steps(self) -> list[Step]:
        return [
            {
                "title": "Locate your Hermes Agent config",
                "body": "Hermes Agent reads provider config from ~/.hermes/config.yaml.",
            },
            {
                "title": "Merge in the Swapyard provider",
                "body": (
                    "Add the block below under \"providers\", merging with any "
                    "providers you already have configured."
                ),
            },
        ]

    def render(self, models: list[DerivedModel], base_url: str) -> str:
        model_map: dict = {}
        for m in models:
            entry: dict = {"capabilities": {"vision": m.vision, "reasoning": m.reasoning}}
            if m.context is not None:
                entry["context_length"] = m.context
            model_map[m.id] = entry

        data = {
            "providers": {
                _PROVIDER_ID: {
                    "base_url": base_url,
                    "api_key": "sk-local",
                    "models": model_map,
                }
            }
        }
        return yaml.safe_dump(data, sort_keys=False)


HARNESS = HermesAgentHarness()
