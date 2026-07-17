from pathlib import Path

import pytest
from huggingface_hub import snapshot_download

from app.errors import NotFoundError
from app.services.manage import delete_managed_model, list_managed_models


@pytest.fixture
def seeded_cache(tmp_path: Path) -> Path:
    """Populate a real HF cache dir using huggingface_hub's own download,
    so it has the exact on-disk layout -hf produces."""
    snapshot_download(
        repo_id="hf-internal-testing/tiny-random-gpt2",
        cache_dir=str(tmp_path),
        allow_patterns=["config.json"],
    )
    return tmp_path


def test_list_managed_models_returns_seeded_repo(seeded_cache: Path):
    models = list_managed_models(cache_dir=str(seeded_cache))
    assert len(models) == 1
    assert models[0].repo_id == "hf-internal-testing/tiny-random-gpt2"
    assert models[0].size_on_disk > 0
    assert models[0].nb_files == 1


def test_list_managed_models_sort_by_name(seeded_cache: Path):
    models = list_managed_models(sort="name", cache_dir=str(seeded_cache))
    assert [m.repo_id for m in models] == sorted(m.repo_id for m in models)


def test_delete_managed_model_removes_repo(seeded_cache: Path):
    delete_managed_model("hf-internal-testing/tiny-random-gpt2", cache_dir=str(seeded_cache))
    assert list_managed_models(cache_dir=str(seeded_cache)) == []


def test_delete_managed_model_missing_raises(seeded_cache: Path):
    with pytest.raises(NotFoundError):
        delete_managed_model("nonexistent/repo", cache_dir=str(seeded_cache))
