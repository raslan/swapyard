from typing import NotRequired, Protocol, TypedDict

from app.services.config import DerivedModel


class Step(TypedDict):
    title: str
    body: str
    code: NotRequired[str]


class Harness(Protocol):
    id: str
    name: str
    config_path: str
    format: str  # "json" | "yaml" | "jsonc"
    docs_url: str
    icon: str | None

    def steps(self) -> list[Step]: ...
    def render(self, models: list[DerivedModel], base_url: str) -> str: ...
