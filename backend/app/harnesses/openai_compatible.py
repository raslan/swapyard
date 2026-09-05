from app.harnesses.base import Step
from app.services.config import DerivedModel


class OpenAICompatibleHarness:
    id = "openai-compatible"
    name = "Open WebUI & other apps"
    config_path = "environment variables"
    format = "env"
    docs_url = "https://docs.openwebui.com"
    icon = None

    def steps(self) -> list[Step]:
        return [
            {
                "title": "Add an OpenAI-Compatible connection",
                "body": (
                    "In your app's settings (Open WebUI, LM Studio, Jan, Msty, "
                    "Chatbox, Cherry Studio, ...), add an \"OpenAI\" / "
                    "\"OpenAI-Compatible\" connection or API provider."
                ),
            },
            {
                "title": "Set the Base URL and API key",
                "body": (
                    "Base URL is the value shown below; the API key is sk-local "
                    "(llama-swap ignores the key unless the deployer put auth in "
                    "front of it)."
                ),
            },
            {
                "title": "Select a model",
                "body": (
                    "The model list below is what to select. If the app reads "
                    "environment variables instead of a settings screen, export "
                    "the two vars shown."
                ),
            },
        ]

    def render(self, models: list[DerivedModel], base_url: str) -> str:
        if models:
            model_line = "# Models: " + ", ".join(m.id for m in models)
        else:
            model_line = "# Models: (none downloaded yet)"
        return (
            "# Base URL and key for any OpenAI-compatible client.\n"
            "# Most GUI apps have a settings screen for these two values;\n"
            "# some also read these environment variables directly.\n"
            f'export OPENAI_API_BASE_URL="{base_url}"\n'
            'export OPENAI_API_KEY="sk-local"\n'
            f"{model_line}\n"
        )


HARNESS = OpenAICompatibleHarness()
