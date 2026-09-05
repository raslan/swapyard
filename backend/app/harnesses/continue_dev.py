import yaml

from app.harnesses.base import Step
from app.services.config import DerivedModel


class ContinueHarness:
    id = "continue"
    name = "Continue"
    config_path = "~/.continue/config.yaml"
    format = "yaml"
    docs_url = "https://docs.continue.dev"
    icon = None

    def steps(self) -> list[Step]:
        return [
            {
                "title": "Locate your Continue config",
                "body": (
                    "The Continue extension (VS Code / JetBrains) creates "
                    "~/.continue/config.yaml on first run; you can also manage "
                    "assistants from the Continue Assistants UI."
                ),
            },
            {
                "title": "Merge in the Swapyard models",
                "body": (
                    "Add the entries below to the top-level \"models:\" list, "
                    "merging alongside any models you already have configured."
                ),
            },
        ]

    def render(self, models: list[DerivedModel], base_url: str) -> str:
        model_list = []
        for m in models:
            capabilities = ["tool_use"]
            if m.vision:
                capabilities.append("image_input")
            model_list.append(
                {
                    "name": m.id,
                    "provider": "openai",
                    "model": m.id,
                    "apiBase": base_url,
                    "apiKey": "sk-local",
                    "roles": ["chat", "edit", "apply"],
                    "capabilities": capabilities,
                }
            )
        return yaml.safe_dump({"models": model_list}, sort_keys=False)


HARNESS = ContinueHarness()
