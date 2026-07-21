import hashlib
import json
from pathlib import Path

import yaml
from jsonschema import Draft7Validator


def hash_content(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def read_config(config_path: str) -> tuple[str, str]:
    with open(config_path, encoding="utf-8") as f:
        content = f.read()
    return content, hash_content(content)


_SCHEMA_PATH = Path(__file__).parent.parent / "config_schema.json"
SCHEMA = json.loads(_SCHEMA_PATH.read_text())
_VALIDATOR = Draft7Validator(SCHEMA)


def validate_config(content: str) -> list[str]:
    try:
        data = yaml.safe_load(content)
    except yaml.YAMLError as e:
        return [f"invalid YAML syntax: {e}"]

    if data is None:
        data = {}

    errors = sorted(_VALIDATOR.iter_errors(data), key=lambda e: list(e.path))
    return [
        f"{'.'.join(str(p) for p in e.path) or '(root)'}: {e.message}" for e in errors
    ]
