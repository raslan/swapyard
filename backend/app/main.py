from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.errors import register_error_handlers
from app.routes.browse import router as browse_router
from app.routes.downloads import router as downloads_router
from app.routes.manage import router as manage_router

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
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST_DIR), html=True), name="frontend")
