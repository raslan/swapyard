from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.errors import NotFoundError, register_error_handlers


def test_not_found_error_shape():
    app = FastAPI()
    register_error_handlers(app)

    @app.get("/boom")
    async def boom():
        raise NotFoundError("model not found")

    client = TestClient(app, raise_server_exceptions=False)
    resp = client.get("/boom")
    assert resp.status_code == 404
    assert resp.json() == {
        "status_code": 404,
        "error": {"code": "not_found", "message": "model not found"},
    }
