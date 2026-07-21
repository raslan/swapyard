import hashlib


def hash_content(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def read_config(config_path: str) -> tuple[str, str]:
    with open(config_path, encoding="utf-8") as f:
        content = f.read()
    return content, hash_content(content)
