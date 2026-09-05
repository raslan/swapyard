import json

from app.harnesses.base import Step
from app.services.config import DerivedModel


class ClineHarness:
    id = "cline"
    name = "Cline / Roo Code"
    config_path = "VS Code settings.json"
    format = "json"
    docs_url = "https://docs.cline.bot"
    icon = None

    def steps(self) -> list[Step]:
        return [
            {
                "title": "Open your VS Code settings.json",
                "body": (
                    "Cmd/Ctrl+Shift+P -> \"Preferences: Open User Settings (JSON)\". "
                    "Cline stores its OpenAI-Compatible provider under these keys."
                ),
            },
            {
                "title": "Paste the keys, then pick the model",
                "body": (
                    "Merge the keys below into settings.json, then select the model "
                    "in the Cline sidebar. Roo Code uses the same keys with a "
                    "\"roo-cline.\" prefix instead of \"cline.\"."
                ),
            },
        ]

    def render(self, models: list[DerivedModel], base_url: str) -> str:
        model_info: dict = {}
        for m in models:
            info: dict = {}
            if m.context is not None:
                info["contextWindow"] = m.context
            info["supportsImages"] = m.vision
            info["supportsComputerUse"] = False
            model_info[m.id] = info

        data: dict = {
            "cline.apiProvider": "openai",
            "cline.openAiBaseUrl": base_url,
            "cline.openAiApiKey": "sk-local",
        }
        if models:
            data["cline.openAiModelId"] = models[0].id
        data["cline.openAiModelInfo"] = model_info
        return json.dumps(data, indent=2) + "\n"


HARNESS = ClineHarness()
