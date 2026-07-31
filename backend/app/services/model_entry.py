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
    Also makes the schema's own proxy/checkEndpoint defaults explicit in the
    generated entry, rather than leaving them implicit."""
    return {
        "cmd": (
            f"llama-server --port ${{PORT}} --fit --jinja "
            "--cache-type-k q8_0 --cache-type-v q8_0 "
            f"-hf {repo_id}:{filename}"
        ),
        "proxy": "http://localhost:${PORT}",
        "checkEndpoint": "/health",
    }
