from pathlib import Path
from types import SimpleNamespace

import pytest
from huggingface_hub import snapshot_download

from app.errors import NotFoundError
from app.services.manage import (
    _cached_gguf_sizes,
    _gguf_files,
    _mmproj_files,
    delete_managed_model,
    delete_managed_model_file,
    list_managed_models,
)


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


def test_list_managed_models_excludes_non_gguf_files(seeded_cache: Path):
    """seeded_cache only contains config.json (no .gguf) - gguf_files should be empty."""
    models = list_managed_models(cache_dir=str(seeded_cache))
    assert models[0].gguf_files == []


@pytest.fixture
def seeded_cache_single_gguf(tmp_path: Path) -> Path:
    """A repo with exactly one .gguf file."""
    snapshot_download(
        repo_id="raincandy-u/TinyStories-656K-Q8_0-GGUF",
        cache_dir=str(tmp_path),
        allow_patterns=["*.gguf"],
    )
    return tmp_path


def test_list_managed_models_single_gguf_file(seeded_cache_single_gguf: Path):
    models = list_managed_models(cache_dir=str(seeded_cache_single_gguf))
    assert len(models) == 1
    assert models[0].gguf_files == ["tinystories-656k-q8_0.gguf"]


@pytest.fixture
def seeded_cache_multiple_gguf(tmp_path: Path) -> Path:
    """A repo with multiple .gguf quant files, downloaded out of alphabetical
    order, to exercise union+sort of gguf_files."""
    snapshot_download(
        repo_id="mradermacher/TinyStories-656K-GGUF",
        cache_dir=str(tmp_path),
        allow_patterns=["*.Q2_K.gguf", "*.IQ4_XS.gguf"],
    )
    return tmp_path


def test_list_managed_models_multiple_gguf_files_union_and_sorted(
    seeded_cache_multiple_gguf: Path,
):
    models = list_managed_models(cache_dir=str(seeded_cache_multiple_gguf))
    assert len(models) == 1
    assert models[0].gguf_files == [
        "TinyStories-656K.IQ4_XS.gguf",
        "TinyStories-656K.Q2_K.gguf",
    ]


def test_gguf_files_excludes_mmproj_and_mmproj_files_only_mmproj():
    repo = SimpleNamespace(
        revisions=[
            SimpleNamespace(
                files=[
                    SimpleNamespace(file_name="qwen3.5-0.8b-Q4_K_M.gguf", size_on_disk=100),
                    SimpleNamespace(file_name="mmproj-qwen3.5-0.8b-f16.gguf", size_on_disk=20),
                    SimpleNamespace(file_name="config.json", size_on_disk=1),
                ]
            )
        ]
    )
    sizes = _cached_gguf_sizes(repo)
    assert sizes == {"qwen3.5-0.8b-Q4_K_M.gguf": 100, "mmproj-qwen3.5-0.8b-f16.gguf": 20}
    assert _gguf_files(sizes) == ["qwen3.5-0.8b-Q4_K_M.gguf"]
    assert _mmproj_files(sizes) == ["mmproj-qwen3.5-0.8b-f16.gguf"]


def test_cached_gguf_sizes_dedupes_across_revisions_taking_largest():
    repo = SimpleNamespace(
        revisions=[
            SimpleNamespace(files=[SimpleNamespace(file_name="m-Q4_K_M.gguf", size_on_disk=50)]),
            SimpleNamespace(files=[SimpleNamespace(file_name="m-Q4_K_M.gguf", size_on_disk=80)]),
        ]
    )
    assert _cached_gguf_sizes(repo) == {"m-Q4_K_M.gguf": 80}


@pytest.fixture
def seeded_cache_two_repos(seeded_cache: Path) -> Path:
    """Add a second repo to the seeded cache whose name sorts before
    hf-internal-testing/tiny-random-gpt2 but whose config.json (and thus
    size_on_disk) is larger, so sort="name" and sort="size" diverge."""
    snapshot_download(
        repo_id="hf-internal-testing/tiny-random-bert",
        cache_dir=str(seeded_cache),
        allow_patterns=["config.json"],
    )
    return seeded_cache


def test_list_managed_models_sort_by_name(seeded_cache_two_repos: Path):
    models = list_managed_models(sort="name", cache_dir=str(seeded_cache_two_repos))
    assert [m.repo_id for m in models] == [
        "hf-internal-testing/tiny-random-bert",
        "hf-internal-testing/tiny-random-gpt2",
    ]


def test_list_managed_models_sort_by_size(seeded_cache_two_repos: Path):
    models = list_managed_models(sort="size", cache_dir=str(seeded_cache_two_repos))
    sizes = [m.size_on_disk for m in models]
    assert sizes == sorted(sizes, reverse=True)
    assert [m.repo_id for m in models] != [
        "hf-internal-testing/tiny-random-bert",
        "hf-internal-testing/tiny-random-gpt2",
    ]


def test_list_managed_models_missing_cache_dir_returns_empty(tmp_path: Path):
    missing = tmp_path / "does-not-exist"
    assert list_managed_models(cache_dir=str(missing)) == []


def test_delete_managed_model_missing_cache_dir_raises(tmp_path: Path):
    missing = tmp_path / "does-not-exist"
    with pytest.raises(NotFoundError):
        delete_managed_model("any/repo", cache_dir=str(missing))


def test_delete_managed_model_removes_repo(seeded_cache: Path):
    delete_managed_model("hf-internal-testing/tiny-random-gpt2", cache_dir=str(seeded_cache))
    assert list_managed_models(cache_dir=str(seeded_cache)) == []


def test_delete_managed_model_missing_raises(seeded_cache: Path):
    with pytest.raises(NotFoundError):
        delete_managed_model("nonexistent/repo", cache_dir=str(seeded_cache))


def test_delete_managed_model_file_removes_only_that_quant(seeded_cache_multiple_gguf: Path):
    delete_managed_model_file(
        "mradermacher/TinyStories-656K-GGUF",
        "TinyStories-656K.Q2_K.gguf",
        cache_dir=str(seeded_cache_multiple_gguf),
    )

    models = list_managed_models(cache_dir=str(seeded_cache_multiple_gguf))
    assert len(models) == 1
    assert models[0].gguf_files == ["TinyStories-656K.IQ4_XS.gguf"]


def test_delete_managed_model_file_removes_whole_repo_when_it_was_the_last_file(
    seeded_cache_single_gguf: Path,
):
    delete_managed_model_file(
        "raincandy-u/TinyStories-656K-Q8_0-GGUF",
        "tinystories-656k-q8_0.gguf",
        cache_dir=str(seeded_cache_single_gguf),
    )

    assert list_managed_models(cache_dir=str(seeded_cache_single_gguf)) == []


def test_delete_managed_model_file_missing_repo_raises(seeded_cache: Path):
    with pytest.raises(NotFoundError):
        delete_managed_model_file("nonexistent/repo", "x.gguf", cache_dir=str(seeded_cache))


def test_delete_managed_model_file_missing_file_raises(seeded_cache_multiple_gguf: Path):
    with pytest.raises(NotFoundError):
        delete_managed_model_file(
            "mradermacher/TinyStories-656K-GGUF",
            "does-not-exist.gguf",
            cache_dir=str(seeded_cache_multiple_gguf),
        )


def test_delete_managed_model_file_missing_cache_dir_raises(tmp_path: Path):
    missing = tmp_path / "does-not-exist"
    with pytest.raises(NotFoundError):
        delete_managed_model_file("any/repo", "x.gguf", cache_dir=str(missing))
