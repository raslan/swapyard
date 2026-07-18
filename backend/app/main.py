from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import Response
from starlette.types import Scope

from app.errors import register_error_handlers
from app.routes.browse import router as browse_router
from app.routes.downloads import router as downloads_router
from app.routes.manage import router as manage_router


class SPAStaticFiles(StaticFiles):
    """StaticFiles that falls back to index.html for unmatched GET/HEAD paths.

    A plain `StaticFiles(html=True)` mount only serves `index.html` for the
    mount root (or a directory containing one) - a request for a
    react-router client-side route like `/browse/some-model` has no matching
    file on disk, so it 404s instead of letting the SPA's router handle it.
    Overriding `get_response` to retry with `index.html` on a 404 restores
    the expected "deep link refresh works" behavior, and does so without
    needing a separate catch-all route: because `Mount("/")` matches every
    path with a full match, any route registered *after* it in the app's
    router is unreachable, so the fallback has to live inside this app.

    The fallback is skipped for `/api/*` paths so a genuinely unknown API
    route still 404s instead of being masked by the SPA's index.html.
    """

    async def get_response(self, path: str, scope: Scope) -> Response:
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            is_api_path = path == "api" or path.startswith("api/")
            if exc.status_code == 404 and not is_api_path:
                return await super().get_response("index.html", scope)
            raise


app = FastAPI(title="Swapyard")
register_error_handlers(app)
app.include_router(manage_router)
app.include_router(browse_router)
app.include_router(downloads_router)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


FRONTEND_DIST_DIR = (Path(__file__).parent.parent.parent / "frontend" / "dist").resolve()
if FRONTEND_DIST_DIR.is_dir():
    app.mount("/", SPAStaticFiles(directory=str(FRONTEND_DIST_DIR), html=True), name="frontend")
