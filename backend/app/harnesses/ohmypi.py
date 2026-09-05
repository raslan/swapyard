import yaml

from app.harnesses.base import Step
from app.harnesses.pi import _model_list
from app.services.config import DerivedModel

_PROVIDER_ID = "swapyard"


class OhMyPiHarness:
    id = "oh-my-pi"
    name = "oh-my-pi"
    config_path = "~/.omp/agent/models.yml"
    format = "yaml"
    docs_url = "https://omp.sh"
    icon = None

    def steps(self) -> list[Step]:
        return [
            {
                "title": "Locate your oh-my-pi models file",
                "body": "oh-my-pi reads provider/model config from ~/.omp/agent/models.yml — the YAML twin of pi's own models.json.",
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
        return yaml.safe_dump(data, sort_keys=False)


HARNESS = OhMyPiHarness()
