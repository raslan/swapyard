from fastapi import FastAPI

app = FastAPI(title="Swapyard")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
