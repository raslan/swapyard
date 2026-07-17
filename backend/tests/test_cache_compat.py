from pathlib import Path

from huggingface_hub import snapshot_download

from app.services.manage import list_managed_models


def test_cache_layout_matches_native_hf_structure(tmp_path: Path):
    """-hf and huggingface_hub both use the models--{org}--{repo}/snapshots/{sha}/
    blobs layout. This test seeds a cache using huggingface_hub directly (the same
    mechanism -hf uses under the hood) and asserts our on-disk expectations hold,
    so a future huggingface_hub upgrade that changes the layout fails loudly here
    instead of silently breaking -hf interop."""
    snapshot_download(
        repo_id="hf-internal-testing/tiny-random-gpt2",
        cache_dir=str(tmp_path),
        allow_patterns=["config.json"],
    )

    repo_dir = tmp_path / "models--hf-internal-testing--tiny-random-gpt2"
    assert repo_dir.is_dir()
    assert (repo_dir / "snapshots").is_dir()
    assert (repo_dir / "blobs").is_dir()

    snapshot_dirs = list((repo_dir / "snapshots").iterdir())
    assert len(snapshot_dirs) == 1
    config_link = snapshot_dirs[0] / "config.json"
    assert config_link.is_symlink() or config_link.is_file()

    models = list_managed_models(cache_dir=str(tmp_path))
    assert models[0].repo_id == "hf-internal-testing/tiny-random-gpt2"
