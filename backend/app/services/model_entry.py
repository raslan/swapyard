import re

from ruamel.yaml.scalarstring import LiteralScalarString

_GGUF_EXT_RE = re.compile(r"\.gguf$", re.IGNORECASE)

# --cache-type-k/-v's description reads e.g. "...allowed values: f32, f16, bf16,
# q8_0, q4_0, q4_1, iq4_nl, q5_0, q5_1 (default: f16)" - this is the same free-text
# format registerCmdFlagProvider's hover/completion already parses for the Monaco
# editor. Pulling from the live flags.json (rather than hardcoding the list here)
# means it can't drift from whatever the real llama-server binary actually accepts.
_ALLOWED_VALUES_RE = re.compile(r"allowed values:\s*([^(]+)")

_DEFAULT_CACHE_TYPE = "q8_0"


def parse_allowed_values(description: str) -> list[str]:
    """Extracts the comma-separated "allowed values: ..." list from a
    llama_server_flags.json description string. Returns [] if the flag's
    description doesn't have that shape (not an enum-valued flag)."""
    match = _ALLOWED_VALUES_RE.search(description)
    if not match:
        return []
    return [v.strip() for v in match.group(1).split(",") if v.strip()]


def cache_type_options(flags: list[dict]) -> list[str]:
    """Finds --cache-type-k's allowed values among a flags.json list (as
    served by GET /api/config/flags). Returns [] if the flag isn't present
    (e.g. flags.json hasn't been generated in this environment)."""
    for flag in flags:
        if flag.get("flag") == "--cache-type-k" or "-ctk" in flag.get("aliases", []):
            return parse_allowed_values(flag.get("description", ""))
    return []


# generation_config.json keys / README-scraped keys (see browse.py's
# get_recommended_sampler_params and parse_sampler_params_from_readme) mapped onto
# their real llama-server flag names. presence_penalty and frequency_penalty are
# real llama-server CLI flags too (not just /completion request-body params) -
# they mirror --temp/--top-p/--top-k's dual exposure as both a CLI default and a
# per-request override (confirmed against a real working production config).
_SAMPLER_FLAGS = {
    "temperature": "--temp",
    "top_p": "--top-p",
    "top_k": "--top-k",
    "min_p": "--min-p",
    "presence_penalty": "--presence-penalty",
    "repetition_penalty": "--repeat-penalty",
}

_VALID_REASONING = ("on", "off")


def build_minimal_entry(
    repo_id: str,
    filename: str,
    context_size: int | None = None,
    cache_type: str | None = None,
    sampler_params: dict[str, float] | None = None,
    reasoning: str | None = None,
    reasoning_budget: int | None = None,
    reasoning_budget_message: str | None = None,
) -> dict:
    """Minimal safe-default config entry: no -ngl, no -c. Explicitly passes
    --fit so llama-server computes safe offload/context sizing live, against
    real free device memory, at launch time - rather than relying on --fit
    being on by default, which can't be trusted across llama-server
    versions/builds. Also passes --jinja, since llama-server defaults it off
    but most modern models need it for correct chat-template/tool-calling
    behavior, and --cache-type-k/--cache-type-v q8_0, trading a small amount
    of quality for meaningfully more usable context in the same VRAM (this
    composes safely with --fit, which only fills in whatever's left unset).
    --flash-attn defaults to 'auto' (not 'on') on real llama-server builds,
    and quantized KV cache types (our own q8_0 default above) need flash
    attention actually enabled to work correctly - so it's forced on
    explicitly rather than trusted to 'auto'.

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
    filename as passed in.

    `context_size`, when given, becomes an explicit `-c` - omitted (as
    before) it's left for --fit to decide. `cache_type` overrides the
    q8_0 default for both --cache-type-k/-v identically; the wizard only
    exposes one KV quant control, not separate K/V ones.

    `sampler_params` are NOT given any Swapyard-chosen default (unlike
    cache_type) - there's no single sampler setting that's right across
    model families the way --fit/--jinja/cache-type are architecture-
    agnostic. Each key present becomes its matching flag (_SAMPLER_FLAGS);
    keys absent or None are left out entirely, so llama-server's own
    per-flag defaults apply. Unrecognized keys are ignored rather than
    raising, so a caller can pass get_recommended_sampler_params()'s
    output through unfiltered.

    `reasoning` mirrors llama-server's own `-rea, --reasoning [on|off|auto]`
    - only 'on'/'off' are meaningful to force explicitly (its real default is
    'auto', detected from the chat template, so leaving `reasoning=None`
    correctly reproduces that rather than needing an explicit 'auto' flag).
    Invalid values raise ValueError rather than silently emitting a flag
    llama-server would reject at startup. `reasoning_budget`/
    `reasoning_budget_message` map straight onto their own real flags and
    are meaningless without reasoning actually happening, but that's the
    caller's judgment call, not enforced here."""
    if reasoning is not None and reasoning not in _VALID_REASONING:
        raise ValueError(f"reasoning must be one of {_VALID_REASONING}, got {reasoning!r}")

    hf_quant = _GGUF_EXT_RE.sub("", filename)
    resolved_cache_type = cache_type or _DEFAULT_CACHE_TYPE
    cmd_lines = [
        "llama-server",
        "--port ${PORT}",
        "--fit on",
        "--jinja",
        "--flash-attn on",
        f"--cache-type-k {resolved_cache_type}",
        f"--cache-type-v {resolved_cache_type}",
    ]
    if context_size is not None:
        cmd_lines.append(f"--ctx-size {context_size}")
    for key, flag in _SAMPLER_FLAGS.items():
        value = (sampler_params or {}).get(key)
        if value is not None:
            cmd_lines.append(f"{flag} {value}")
    if reasoning is not None:
        cmd_lines.append(f"--reasoning {reasoning}")
    if reasoning_budget is not None:
        cmd_lines.append(f"--reasoning-budget {reasoning_budget}")
    if reasoning_budget_message is not None:
        escaped_message = reasoning_budget_message.replace('"', '\\"')
        cmd_lines.append(f'--reasoning-budget-message "{escaped_message}"')
    cmd_lines.append(f"-hf {repo_id}:{hf_quant}")
    return {
        "proxy": "http://127.0.0.1:${PORT}",
        "checkEndpoint": "/health",
        "ttl": 600,
        "cmd": LiteralScalarString("\n".join(cmd_lines) + "\n"),
    }
