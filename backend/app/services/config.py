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


import asyncio

import httpx


class ConfigConflict(Exception):
    def __init__(self, current_content: str, current_hash: str):
        self.current_content = current_content
        self.current_hash = current_hash
        super().__init__("config changed on disk since it was loaded")


class ConfigInvalid(Exception):
    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__("; ".join(errors))


async def _verify_health(
    llama_swap_url: str, poll_interval: float, poll_attempts: int
) -> tuple[bool, str | None]:
    async with httpx.AsyncClient(timeout=5.0) as client:
        for _ in range(poll_attempts):
            try:
                resp = await client.get(f"{llama_swap_url}/health")
                if resp.status_code == 200:
                    return True, None
            except httpx.HTTPError:
                pass
            await asyncio.sleep(poll_interval)

        logs: str | None = None
        try:
            logs_resp = await client.get(f"{llama_swap_url}/logs")
            if logs_resp.status_code == 200:
                logs = logs_resp.text[-2000:]
        except httpx.HTTPError:
            pass
        return False, logs


def apply_config(
    config_path: str,
    history_dir: str,
    content: str,
    base_hash: str,
    llama_swap_url: str | None,
    health_poll_interval: float = 1.0,
    health_poll_attempts: int = 15,
) -> dict:
    current_content, current_hash = read_config(config_path)
    if current_hash != base_hash:
        raise ConfigConflict(current_content, current_hash)

    errors = validate_config(content)
    if errors:
        raise ConfigInvalid(errors)

    with open(config_path, "w", encoding="utf-8") as f:
        f.write(content)

    if llama_swap_url is None:
        commit_revision(history_dir, content, "unverified")
        return {"status": "unverified", "logs": None}

    healthy, logs = asyncio.run(
        _verify_health(llama_swap_url, health_poll_interval, health_poll_attempts)
    )
    if healthy:
        commit_revision(history_dir, content, "ok")
        return {"status": "ok", "logs": None}

    reason = logs or "llama-swap did not become healthy in time"
    commit_revision(history_dir, content, f"failed: {reason[:200]}")
    return {"status": f"failed: {reason[:200]}", "logs": logs}
