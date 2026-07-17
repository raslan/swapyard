from fastapi import FastAPI

from app.errors import register_error_handlers
from app.routes.manage import router as manage_router

app = FastAPI(title="Swapyard")
register_error_handlers(app)
app.include_router(manage_router)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
