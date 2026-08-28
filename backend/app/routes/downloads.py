from collections.abc import AsyncIterable

from fastapi import APIRouter, Depends
from fastapi.sse import EventSourceResponse, ServerSentEvent

from app.errors import NotFoundError
from app.schemas import DownloadStateResponse, StartDownloadRequest
from app.services.downloads import (
    DownloadState,
    get_download,
    list_downloads,
    remove_download,
    start_download,
    wait_for_update,
)

router = APIRouter(prefix="/api/downloads", tags=["downloads"])


def _to_response(state) -> DownloadStateResponse:
    return DownloadStateResponse(
        id=state.id,
        repo_id=state.repo_id,
        filename=state.filename,
        total=state.total,
        downloaded=state.downloaded,
        rate=state.rate,
        is_xet=state.is_xet,
        status=state.status,
        error=state.error,
    )


@router.post("", status_code=202)
async def create_download(body: StartDownloadRequest) -> dict[str, str]:
    state = await start_download(body.repo_id, body.filename, body.is_xet)
    return {"id": state.id}


@router.get("", response_model=list[DownloadStateResponse])
async def get_all_downloads() -> list[DownloadStateResponse]:
    return [_to_response(s) for s in list_downloads()]


def _existing_download(download_id: str) -> DownloadState:
    # Resolved as a dependency (runs before the generator body below starts)
    # rather than inside the generator itself: FastAPI's SSE support runs the
    # generator inside an anyio TaskGroup, which re-wraps any exception raised
    # from within it as a BaseExceptionGroup that the SwapyardError handler
    # does not match, turning a 404 into an unhandled 500. Raising here, in a
    # normal (non-generator) dependency, goes through the exception handler
    # the ordinary way.
    state = get_download(download_id)
    if state is None:
        raise NotFoundError(f"download '{download_id}' not found")
    return state


@router.get("/{download_id}/events", response_class=EventSourceResponse)
async def stream_download_events(
    download_id: str,
    state: DownloadState = Depends(_existing_download),  # noqa: B008 (idiomatic FastAPI DI)
) -> AsyncIterable[ServerSentEvent]:
    yield ServerSentEvent(data=_to_response(state), event="progress")
    while state.status == "downloading":
        await wait_for_update(download_id)
        yield ServerSentEvent(data=_to_response(state), event="progress")
    yield ServerSentEvent(data=_to_response(state), event="done")


@router.delete("/{download_id}", status_code=204)
async def delete_download(download_id: str) -> None:
    # Cancels an in-progress download and clears its record; also used to
    # dismiss a finished/errored row so it stops reappearing on refresh.
    if not remove_download(download_id):
        raise NotFoundError(f"download '{download_id}' not found")
