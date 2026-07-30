def build_minimal_entry(repo_id: str, filename: str) -> dict:
    """Minimal safe-default config entry: no -ngl, no -c. Relies entirely on
    llama-server's own --fit default (enabled by default in llama-server) to
    compute safe offload/context sizing live, against real free device
    memory, at launch time."""
    return {"cmd": f"llama-server --port ${{PORT}} -hf {repo_id}:{filename}"}
