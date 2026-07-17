from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class SwapyardError(Exception):
    status_code: int = 500
    code: str = "internal_error"

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class NotFoundError(SwapyardError):
    status_code = 404
    code = "not_found"


class UpstreamError(SwapyardError):
    status_code = 502
    code = "upstream_error"


class ConflictError(SwapyardError):
    status_code = 409
    code = "conflict"


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(SwapyardError)
    async def handle_swapyard_error(_: Request, exc: SwapyardError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "status_code": exc.status_code,
                "error": {"code": exc.code, "message": exc.message},
            },
        )
