from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.errors import ConflictError, NotFoundError, UpstreamError, register_error_handlers


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


def test_upstream_error_shape():
    app = FastAPI()
    register_error_handlers(app)

    @app.get("/boom")
    async def boom():
        raise UpstreamError("bad gateway")

    client = TestClient(app, raise_server_exceptions=False)
    resp = client.get("/boom")
    assert resp.status_code == 502
    assert resp.json() == {
        "status_code": 502,
        "error": {"code": "upstream_error", "message": "bad gateway"},
    }


def test_conflict_error_shape():
    app = FastAPI()
    register_error_handlers(app)

    @app.get("/boom")
    async def boom():
        raise ConflictError("already exists")

    client = TestClient(app, raise_server_exceptions=False)
    resp = client.get("/boom")
    assert resp.status_code == 409
    assert resp.json() == {
        "status_code": 409,
        "error": {"code": "conflict", "message": "already exists"},
    }
