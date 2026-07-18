import asyncio
from dataclasses import dataclass, field
from uuid import uuid4

from huggingface_hub import hf_hub_download
from tqdm import tqdm as base_tqdm


@dataclass
class DownloadState:
    id: str
    repo_id: str
    filename: str
    total: int = 0
    downloaded: int = 0
    rate: float = 0.0
    is_xet: bool = False
    status: str = "downloading"
    error: str | None = None
    task: asyncio.Task | None = field(default=None, repr=False)
    _event: asyncio.Event = field(default_factory=asyncio.Event, repr=False)


_downloads: dict[str, DownloadState] = {}


def _build_progress_tqdm(state: DownloadState, loop: asyncio.AbstractEventLoop) -> type[base_tqdm]:
    class ProgressTqdm(base_tqdm):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            state.total = self.total or 0
            loop.call_soon_threadsafe(state._event.set)

        def update(self, n=1):
            result = super().update(n)
            state.downloaded = self.n
            # tqdm's own smoothed (EMA) bytes/sec rate - avoids hand-rolling a second
            # rate calculation on top of the one it already computes internally.
            state.rate = self.format_dict.get("rate") or 0.0
            loop.call_soon_threadsafe(state._event.set)
            return result

    return ProgressTqdm


async def start_download(repo_id: str, filename: str, is_xet: bool = False) -> DownloadState:
    state = DownloadState(id=str(uuid4()), repo_id=repo_id, filename=filename, is_xet=is_xet)
    loop = asyncio.get_running_loop()

    def _run() -> None:
        hf_hub_download(
            repo_id=repo_id, filename=filename, tqdm_class=_build_progress_tqdm(state, loop)
        )

    async def _worker() -> None:
        try:
            await asyncio.to_thread(_run)
            state.status = "complete"
        except asyncio.CancelledError:
            state.status = "cancelled"
            raise
        except Exception as exc:
            state.status = "error"
            state.error = str(exc)
        finally:
            state._event.set()

    state.task = asyncio.create_task(_worker())
    _downloads[state.id] = state
    return state


def cancel_download(download_id: str) -> bool:
    state = _downloads.get(download_id)
    if state is None or state.task is None:
        return False
    return state.task.cancel()


def list_downloads() -> list[DownloadState]:
    return list(_downloads.values())


def get_download(download_id: str) -> DownloadState | None:
    return _downloads.get(download_id)


async def wait_for_update(download_id: str, timeout: float = 1.0) -> None:
    state = _downloads[download_id]
    state._event.clear()
    try:
        await asyncio.wait_for(state._event.wait(), timeout=timeout)
    except TimeoutError:
        pass
