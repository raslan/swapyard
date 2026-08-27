import asyncio
import hashlib
import io
import json
import re
import shlex
from pathlib import Path

import httpx
import yaml
from dulwich import porcelain
from dulwich.repo import Repo
from jsonschema import Draft7Validator
from ruamel.yaml import YAML
from ruamel.yaml.scalarstring import LiteralScalarString


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


_MODEL_FLAGS = {"-hf", "-hfr", "--hf-repo"}
_HF_FILE_FLAGS = {"-hff", "--hf-file"}
_PATH_FLAGS = {"-m", "--model"}


def parse_cmd_model_ref(cmd: str) -> dict | None:
    """Extract which downloaded model a model entry's `cmd` points at, if any.

    Handles both shapes Swapyard has emitted: the current
    `-hf <repo>` + `--hf-file <exact filename.gguf>` pair, and the older
    `-hf <repo>:<quant>` single flag. The quant field carries whichever the
    entry used (the `--hf-file` value wins when both are present)."""
    try:
        tokens = shlex.split(cmd)
    except ValueError:
        return None
    repo_id = quant = None
    for i, tok in enumerate(tokens[:-1]):
        if tok in _MODEL_FLAGS:
            repo_id, _, colon_quant = tokens[i + 1].partition(":")
            quant = quant or (colon_quant or None)
        elif tok in _HF_FILE_FLAGS:
            quant = tokens[i + 1]
        elif tok in _PATH_FLAGS:
            return {"kind": "path", "path": tokens[i + 1]}
    if repo_id is not None:
        return {"kind": "hf", "repo_id": repo_id, "quant": quant}
    return None


def model_refs(content: str) -> dict[str, dict]:
    """Map each config model id to the download it references, for entries that have one."""
    try:
        data = yaml.safe_load(content)
    except yaml.YAMLError:
        return {}
    models = (data or {}).get("models") or {}
    refs = {}
    for model_id, model_cfg in models.items():
        cmd = (model_cfg or {}).get("cmd")
        if not cmd:
            continue
        ref = parse_cmd_model_ref(cmd)
        if ref:
            refs[model_id] = ref
    return refs


def model_ids_for_repo(content: str, repo_id: str) -> list[str]:
    return [
        model_id
        for model_id, ref in model_refs(content).items()
        if ref["kind"] == "hf" and ref["repo_id"] == repo_id
    ]


_RUAMEL_YAML = YAML()
_RUAMEL_YAML.preserve_quotes = True
# Large width so realistic single-line values (e.g. long cmd strings) never
# get folded across multiple lines by ruamel's default plain-scalar wrapping.
_RUAMEL_YAML.width = 4096


def remove_models_for_repo(content: str, repo_id: str) -> tuple[str, list[str]]:
    """Delete model entries whose cmd references `repo_id`, preserving comments/formatting."""
    to_remove = model_ids_for_repo(content, repo_id)
    if not to_remove:
        return content, []

    data = _RUAMEL_YAML.load(content)
    for model_id in to_remove:
        del data["models"][model_id]

    out = io.StringIO()
    _RUAMEL_YAML.dump(data, out)
    return out.getvalue(), to_remove


def add_model_entry(content: str, model_id: str, entry: dict) -> str:
    """Insert a new model entry into config.yaml's `models` map.
    Raises ValueError if model_id already exists."""
    data = _RUAMEL_YAML.load(content)
    if data is None:
        data = {}
    if "models" not in data or data["models"] is None:
        data["models"] = {}
    if model_id in data["models"]:
        raise ValueError(f"model id '{model_id}' already exists")

    # Blank line before the new entry so it doesn't render stuck to the previous one -
    # skip it when models is empty, so we don't leave a leading blank line under `models:`.
    if data["models"]:
        data["models"].yaml_set_comment_before_after_key(model_id, before="\n")

    data["models"][model_id] = entry

    out = io.StringIO()
    _RUAMEL_YAML.dump(data, out)
    return out.getvalue()


_MMPROJ_FLAGS = ("--mmproj", "-mm", "--mmproj-url", "-mmu")
# `-hf <repo>[:<quant>]` when it sits alone on its own line (block-scalar cmd,
# one flag per line - how build_minimal_entry writes them).
_HF_LINE_RE = re.compile(
    r"(?m)^(?P<indent>[ \t]*)(?P<flag>-hf|-hfr|--hf-repo)[ \t]+(?P<value>\S+)[ \t]*$"
)
# Same flag anywhere on a single-line cmd (`cmd: llama-server -hf a/b:q ...`).
_HF_INLINE_RE = re.compile(r"(?P<flag>-hf|-hfr|--hf-repo)[ \t]+(?P<value>\S+)")


def _resolve_hf_file(quant: str, gguf_files: list[str]) -> str | None:
    """Map a legacy `-hf <repo>:<quant>` value onto an exact downloaded .gguf
    filename. `quant` is whatever Swapyard (or a hand edit) put after the colon:
    usually the full filename minus `.gguf`, sometimes a bare quant tag like
    `Q4_K_M`. Returns None when it can't be pinned unambiguously - caller leaves
    that entry untouched and reports it."""
    if not quant:
        return None
    if quant in gguf_files:
        return quant
    if f"{quant}.gguf" in gguf_files:
        return f"{quant}.gguf"
    # llama.cpp's own fuzzy rule: the tag followed by `.` or `-`, case-insensitive.
    pattern = re.compile(re.escape(quant) + r"[.-]", re.IGNORECASE)
    matches = [f for f in gguf_files if pattern.search(f)]
    return matches[0] if len(matches) == 1 else None


def _normalize_cmd(
    cmd: str, gguf_files: list[str], mmproj_files: list[str]
) -> tuple[str, list[str], str | None]:
    """Rewrite one entry's `cmd`: split `-hf repo:quant` into `-hf repo` +
    `--hf-file <exact>`, and add `--mmproj-url` when the repo has a downloaded
    projector and the cmd pins none. Returns (new_cmd, changes, skipped_reason);
    new_cmd == cmd when there is nothing to do. Idempotent."""
    is_block = "\n" in cmd
    m = _HF_LINE_RE.search(cmd) if is_block else _HF_INLINE_RE.search(cmd)
    if not m:
        return cmd, [], None

    indent = m.groupdict().get("indent", "") or ""
    repo_id, _, quant = m.group("value").partition(":")
    has_hf_file = bool(re.search(r"(?:^|\s)(?:-hff|--hf-file)\s", cmd))
    has_mmproj = any(re.search(rf"(?:^|\s){re.escape(f)}\s", cmd) for f in _MMPROJ_FLAGS)

    changes: list[str] = []
    skipped: str | None = None
    new_cmd = cmd

    if quant and not has_hf_file:
        filename = _resolve_hf_file(quant, gguf_files)
        if filename:
            bare = f"{m.group('indent') or ''}{m.group('flag')} {repo_id}" if is_block \
                else f"{m.group('flag')} {repo_id}"
            new_cmd = new_cmd[: m.start()] + bare + new_cmd[m.end():]
            insert = f"\n{indent}--hf-file {filename}" if is_block else f" --hf-file {filename}"
            at = m.start() + len(bare)
            new_cmd = new_cmd[:at] + insert + new_cmd[at:]
            changes.append(f"pinned --hf-file {filename}")
        else:
            n = len([f for f in gguf_files if quant.lower() in f.lower()])
            skipped = (
                f"could not resolve quant '{quant}' to a downloaded file for {repo_id} "
                f"({'no' if n == 0 else n} candidate{'s' if n != 1 else ''})"
            )
    elif quant and has_hf_file:
        # redundant leftover tag next to an explicit --hf-file
        new_cmd = new_cmd[: m.start()] + new_cmd[m.start():].replace(f":{quant}", "", 1)
        changes.append(f"dropped redundant :{quant} from -hf")

    if mmproj_files and not has_mmproj:
        url = f"https://huggingface.co/{repo_id}/resolve/main/{mmproj_files[0]}"
        if is_block:
            new_cmd = new_cmd.rstrip("\n") + f"\n{indent}--mmproj-url {url}\n"
        else:
            new_cmd = f"{new_cmd.rstrip()} --mmproj-url {url}"
        changes.append(f"pinned --mmproj-url {mmproj_files[0]}")

    return new_cmd, changes, skipped


def normalize_config_entries(
    content: str, downloads: dict[str, dict[str, list[str]]]
) -> tuple[str, list[dict]]:
    """Rewrite every model entry's `cmd` to the unambiguous `-hf`/`--hf-file`
    (+ pinned `--mmproj-url`) form, preserving all other flags, comments and
    formatting. `downloads` maps repo_id -> {"gguf": [...], "mmproj": [...]}.
    Returns (new_content, report); new_content == content when nothing changed."""
    data = _RUAMEL_YAML.load(content)
    models = (data or {}).get("models") or {}
    report: list[dict] = []
    changed = False

    for model_id, cfg in models.items():
        cmd = (cfg or {}).get("cmd")
        if not cmd:
            continue
        ref = parse_cmd_model_ref(str(cmd))
        if not ref or ref["kind"] != "hf":
            continue
        dl = downloads.get(ref["repo_id"], {"gguf": [], "mmproj": []})
        new_cmd, changes, skipped = _normalize_cmd(
            str(cmd), dl.get("gguf", []), dl.get("mmproj", [])
        )
        if changes:
            models[model_id]["cmd"] = (
                LiteralScalarString(new_cmd) if "\n" in new_cmd else new_cmd
            )
            changed = True
        if changes or skipped:
            entry: dict = {"model_id": model_id, "changes": changes}
            if skipped:
                entry["skipped"] = skipped
            report.append(entry)

    if not changed:
        return content, report
    out = io.StringIO()
    _RUAMEL_YAML.dump(data, out)
    return out.getvalue(), report


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


async def apply_config(
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

    healthy, logs = await _verify_health(llama_swap_url, health_poll_interval, health_poll_attempts)
    if healthy:
        commit_revision(history_dir, content, "ok")
        return {"status": "ok", "logs": None}

    reason = logs or "llama-swap did not become healthy in time"
    commit_revision(history_dir, content, f"failed: {reason[:200]}")
    return {"status": f"failed: {reason[:200]}", "logs": logs}
