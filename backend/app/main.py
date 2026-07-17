from fastapi import FastAPI

from app.errors import register_error_handlers

app = FastAPI(title="Swapyard")
register_error_handlers(app)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
