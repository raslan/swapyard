import re

from ruamel.yaml.scalarstring import LiteralScalarString

_GGUF_EXT_RE = re.compile(r"\.gguf$", re.IGNORECASE)


def build_minimal_entry(repo_id: str, filename: str) -> dict:
    """Minimal safe-default config entry: no -ngl, no -c. Explicitly passes
    --fit so llama-server computes safe offload/context sizing live, against
    real free device memory, at launch time - rather than relying on --fit
    being on by default, which can't be trusted across llama-server
    versions/builds. Also passes --jinja, since llama-server defaults it off
    but most modern models need it for correct chat-template/tool-calling
    behavior, and --cache-type-k/--cache-type-v q8_0, trading a small amount
    of quality for meaningfully more usable context in the same VRAM (this
    composes safely with --fit, which only fills in whatever's left unset).

    `cmd` is emitted as a multi-line YAML literal block scalar (`cmd: |`),
    one flag per line, matching this codebase's real hand-written config
    entries - a plain multi-line `str` would NOT get block style from
    ruamel on its own, so it's wrapped in `LiteralScalarString`.

    `proxy` is pinned to the project's real convention of explicit
    127.0.0.1 (not the JSON schema's own `localhost` default, and not left
    implicit), `checkEndpoint` is made explicit rather than left to the
    schema default, and `ttl` is set to 600 seconds. Keys are ordered
    proxy/checkEndpoint/ttl/cmd to match real example configs.

    llama.cpp's `-hf repo:X` resolution appends `.gguf` internally when
    matching against the repo's file list, so if `filename` already ends in
    `.gguf` the effective lookup becomes `....gguf.gguf` and matches
    nothing (confirmed against real llama-server output). The `.gguf`
    suffix is therefore stripped (case-insensitively) from the value used
    in the `-hf` flag - `filename` itself still holds the real, full
    filename as passed in."""
    hf_quant = _GGUF_EXT_RE.sub("", filename)
    cmd_lines = [
        "llama-server",
        "--port ${PORT}",
        "--fit on",
        "--jinja",
        "--cache-type-k q8_0",
        "--cache-type-v q8_0",
        f"-hf {repo_id}:{hf_quant}",
    ]
    return {
        "proxy": "http://127.0.0.1:${PORT}",
        "checkEndpoint": "/health",
        "ttl": 600,
        "cmd": LiteralScalarString("\n".join(cmd_lines) + "\n"),
    }
