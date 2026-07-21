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


from dulwich import porcelain
from dulwich.repo import Repo

_HISTORY_FILENAME = "config.yaml"
_AUTHOR = b"Swapyard <swapyard@localhost>"


def _ensure_history_repo(history_dir: str) -> Repo:
    path = Path(history_dir)
    path.mkdir(parents=True, exist_ok=True)
    if not (path / ".git").exists():
        return porcelain.init(str(path))
    return Repo(str(path))


def commit_revision(history_dir: str, content: str, status: str) -> None:
    repo = _ensure_history_repo(history_dir)
    file_path = Path(history_dir) / _HISTORY_FILENAME
    file_path.write_text(content, encoding="utf-8")
    porcelain.add(repo, str(file_path))
    porcelain.commit(
        repo,
        message=f"apply: {status}".encode(),
        author=_AUTHOR,
        committer=_AUTHOR,
    )


def _revision_from_commit(repo: Repo, commit) -> dict:  # noqa: ANN001 - dulwich Commit has no public alias
    from dulwich.object_store import tree_lookup_path

    message = commit.message.decode("utf-8")
    status = message.removeprefix("apply: ")
    _, blob_sha = tree_lookup_path(repo.get_object, commit.tree, _HISTORY_FILENAME.encode())
    content = repo[blob_sha].data.decode("utf-8")
    return {
        "sha": commit.id.decode("ascii"),
        "timestamp": float(commit.commit_time),
        "status": status,
        "content": content,
    }


def list_revisions(history_dir: str) -> list[dict]:
    path = Path(history_dir)
    if not (path / ".git").exists():
        return []
    repo = Repo(str(path))
    return [_revision_from_commit(repo, entry.commit) for entry in repo.get_walker()]


def get_status(history_dir: str) -> dict | None:
    revisions = list_revisions(history_dir)
    if not revisions:
        return None
    latest = revisions[0]
    return {"status": latest["status"], "timestamp": latest["timestamp"]}
