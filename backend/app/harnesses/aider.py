import yaml

from app.harnesses.base import Step
from app.services.config import DerivedModel


class AiderHarness:
    id = "aider"
    name = "Aider"
    config_path = "~/.aider.conf.yml"
    format = "yaml"
    docs_url = "https://aider.chat"
    icon = None

    def steps(self) -> list[Step]:
        return [
            {
                "title": "Create ~/.aider.conf.yml",
                "body": (
                    "Aider reads ~/.aider.conf.yml (or a project-local "
                    ".aider.conf.yml). Paste the contents below."
                ),
            },
            {
                "title": "Run aider against a model",
                "body": (
                    "Aider also reads OPENAI_API_BASE / OPENAI_API_KEY env vars if "
                    "you prefer, and you select a model with --model openai/<id>."
                ),
            },
        ]

    def render(self, models: list[DerivedModel], base_url: str) -> str:
        data: dict = {
            "openai-api-base": base_url,
            "openai-api-key": "sk-local",
        }
        if models:
            data["model"] = f"openai/{models[0].id}"

        comment_lines = ["# Swapyard models (per-model metadata lives outside this file):"]
        for m in models:
            ctx = str(m.context) if m.context is not None else "server default"
            comment_lines.append(
                f"# openai/{m.id}  (context: {ctx}, vision: {'yes' if m.vision else 'no'})"
            )
        comment_block = "\n".join(comment_lines) + "\n"
        return comment_block + yaml.safe_dump(data, sort_keys=False)


HARNESS = AiderHarness()
