import asyncio
import time
from unittest.mock import patch

import pytest

from app.services import downloads as downloads_module
from app.services.downloads import cancel_download, get_download, list_downloads, start_download


@pytest.fixture(autouse=True)
def clear_state():
    downloads_module._downloads.clear()
    yield
    downloads_module._downloads.clear()


def fake_hf_hub_download(*, repo_id, filename, tqdm_class, **kwargs):
    bar = tqdm_class(total=100)
    for _ in range(5):
        bar.update(20)
    bar.close()
    return "/fake/path"


async def test_start_download_completes():
    with patch("app.services.downloads.hf_hub_download", side_effect=fake_hf_hub_download):
        state = await start_download("org/model", "model.gguf")
        await state.task
        assert state.status == "complete"
        assert state.downloaded == 100
        assert state.total == 100


def fake_hf_hub_download_with_delay(*, repo_id, filename, tqdm_class, **kwargs):
    bar = tqdm_class(total=100)
    for _ in range(5):
        time.sleep(0.02)  # real elapsed time, so tqdm's EMA rate is a genuine non-zero value
        bar.update(20)
    bar.close()
    return "/fake/path"


async def test_start_download_reports_rate():
    with patch(
        "app.services.downloads.hf_hub_download", side_effect=fake_hf_hub_download_with_delay
    ):
        state = await start_download("org/model", "model.gguf")
        await state.task
        assert state.rate > 0.0


async def test_start_download_stores_is_xet_flag():
    with patch("app.services.downloads.hf_hub_download", side_effect=fake_hf_hub_download):
        state = await start_download("org/model", "model.gguf", is_xet=True)
        await state.task
        assert state.is_xet is True


async def test_start_download_tracked_in_list_downloads():
    with patch("app.services.downloads.hf_hub_download", side_effect=fake_hf_hub_download):
        state = await start_download("org/model", "model.gguf")
        assert get_download(state.id) is state
        assert state in list_downloads()
        await state.task


async def test_cancel_download_marks_cancelled():
    def slow_download(*, repo_id, filename, tqdm_class, **kwargs):
        bar = tqdm_class(total=100)
        import time

        for _ in range(100):
            time.sleep(0.05)
            bar.update(1)
        bar.close()
        return "/fake/path"

    with patch("app.services.downloads.hf_hub_download", side_effect=slow_download):
        state = await start_download("org/model", "model.gguf")
        await asyncio.sleep(0.1)
        assert cancel_download(state.id) is True
        with pytest.raises(asyncio.CancelledError):
            await state.task
        assert state.status == "cancelled"


async def test_start_download_reports_friendly_permission_error():
    def denied(*, repo_id, filename, tqdm_class, **kwargs):
        raise PermissionError(13, "Permission denied", "/cache/hub/org--model")

    with patch("app.services.downloads.hf_hub_download", side_effect=denied):
        state = await start_download("org/model", "model.gguf")
        await state.task
        assert state.status == "error"
        assert "/cache/hub/org--model" in state.error
        assert "writable by the container's user" in state.error


def test_cancel_unknown_download_returns_false():
    assert cancel_download("does-not-exist") is False


async def test_cancel_completed_download_returns_false():
    with patch("app.services.downloads.hf_hub_download", side_effect=fake_hf_hub_download):
        state = await start_download("org/model", "model.gguf")
        await state.task
        assert state.status == "complete"
        assert cancel_download(state.id) is False
