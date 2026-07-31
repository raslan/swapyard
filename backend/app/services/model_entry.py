def build_minimal_entry(repo_id: str, filename: str) -> dict:
    """Minimal safe-default config entry: no -ngl, no -c. Explicitly passes
    --fit so llama-server computes safe offload/context sizing live, against
    real free device memory, at launch time - rather than relying on --fit
    being on by default, which can't be trusted across llama-server
    versions/builds. Also makes the schema's own proxy/checkEndpoint
    defaults explicit in the generated entry, rather than leaving them
    implicit."""
    return {
        "cmd": f"llama-server --port ${{PORT}} --fit -hf {repo_id}:{filename}",
        "proxy": "http://localhost:${PORT}",
        "checkEndpoint": "/health",
    }
