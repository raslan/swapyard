import struct

import httpx
import pytest

from app.services.gguf_metadata import (
    GgufArchInfo,
    GgufParseError,
    extract_arch_info,
    fetch_gguf_header,
    parse_gguf_header,
)

_UINT32 = 4
_STRING = 8


def _pack_string(s: str) -> bytes:
    encoded = s.encode("utf-8")
    return struct.pack("<Q", len(encoded)) + encoded


def _pack_kv_uint32(key: str, value: int) -> bytes:
    return _pack_string(key) + struct.pack("<I", _UINT32) + struct.pack("<I", value)


def _pack_kv_string(key: str, value: str) -> bytes:
    return _pack_string(key) + struct.pack("<I", _STRING) + _pack_string(value)


def _build_gguf_header(kv_pairs: list[bytes]) -> bytes:
    magic = struct.pack("<I", 0x46554747)
    version = struct.pack("<I", 3)
    tensor_count = struct.pack("<Q", 0)
    kv_count = struct.pack("<Q", len(kv_pairs))
    return magic + version + tensor_count + kv_count + b"".join(kv_pairs)


def test_parse_gguf_header_reads_scalar_and_string_kv_pairs():
    data = _build_gguf_header(
        [
            _pack_kv_string("general.architecture", "llama"),
            _pack_kv_uint32("llama.block_count", 32),
        ]
    )

    result = parse_gguf_header(data)

    assert result == {"general.architecture": "llama", "llama.block_count": 32}


def test_parse_gguf_header_rejects_bad_magic():
    with pytest.raises(GgufParseError, match="bad magic"):
        parse_gguf_header(struct.pack("<I", 0xDEADBEEF) + b"\x00" * 20)


def test_parse_gguf_header_raises_on_truncated_buffer():
    data = _build_gguf_header([_pack_kv_string("general.architecture", "llama")])
    with pytest.raises(GgufParseError):
        parse_gguf_header(data[: len(data) - 3])


def test_extract_arch_info_reads_required_and_defaulted_keys():
    kv = {
        "general.architecture": "llama",
        "llama.block_count": 32,
        "llama.attention.head_count": 32,
        "llama.attention.head_count_kv": 8,
        "llama.embedding_length": 4096,
        "llama.context_length": 131072,
        "llama.attention.key_length": 128,
    }

    info = extract_arch_info(kv)

    assert info == GgufArchInfo(
        architecture="llama",
        block_count=32,
        head_count=32,
        head_count_kv=8,
        embedding_length=4096,
        context_length=131072,
        key_length=128,
    )


def test_extract_arch_info_defaults_head_count_kv_and_key_length_when_absent():
    kv = {
        "general.architecture": "gpt2",
        "gpt2.block_count": 12,
        "gpt2.attention.head_count": 12,
        "gpt2.embedding_length": 768,
        "gpt2.context_length": 1024,
    }

    info = extract_arch_info(kv)

    assert info.head_count_kv == 12  # no GQA key present -> defaults to head_count
    assert info.key_length == 64  # embedding_length // head_count


def test_extract_arch_info_raises_on_missing_architecture():
    with pytest.raises(GgufParseError, match="architecture"):
        extract_arch_info({})


def test_fetch_gguf_header_requests_byte_range_and_parses_response(monkeypatch):
    data = _build_gguf_header([_pack_kv_string("general.architecture", "llama")])

    def fake_get(url, headers=None, follow_redirects=False):
        assert headers["Range"] == "bytes=0-10485759"
        request = httpx.Request("GET", url)
        return httpx.Response(206, content=data, request=request)

    monkeypatch.setattr("app.services.gguf_metadata.httpx.get", fake_get)

    result = fetch_gguf_header("org/model", "model.gguf")

    assert result == {"general.architecture": "llama"}


def test_fetch_gguf_header_retries_with_larger_range_on_truncation(monkeypatch):
    full_data = _build_gguf_header(
        [
            _pack_kv_string("general.architecture", "llama"),
            _pack_kv_uint32("llama.block_count", 32),
        ]
    )
    calls = []

    def fake_get(url, headers=None, follow_redirects=False):
        calls.append(headers["Range"])
        request = httpx.Request("GET", url)
        # First response is cut 2 bytes short, mid-way through the last value -
        # simulates the initial range not covering the full metadata section.
        content = full_data[:-2] if len(calls) == 1 else full_data
        return httpx.Response(206, content=content, request=request)

    monkeypatch.setattr("app.services.gguf_metadata.httpx.get", fake_get)

    result = fetch_gguf_header("org/model", "model.gguf")

    assert result["llama.block_count"] == 32
    assert len(calls) == 2


def test_fetch_gguf_header_rejects_unhonored_range_request(monkeypatch):
    # Mock server that ignores Range and returns full file with 200 status
    def fake_get(url, headers=None, follow_redirects=False):
        request = httpx.Request("GET", url)
        # Return 200 instead of 206, simulating server ignoring Range header
        return httpx.Response(200, content=b"x" * 100 * 1024 * 1024, request=request)

    monkeypatch.setattr("app.services.gguf_metadata.httpx.get", fake_get)

    with pytest.raises(GgufParseError, match="server did not honor Range request"):
        fetch_gguf_header("org/model", "model.gguf")
