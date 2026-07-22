import os
import struct
from dataclasses import dataclass
from typing import Any

import httpx

GGUF_MAGIC = 0x46554747  # b"GGUF" as a little-endian uint32

# GGUFValueType enum, per the GGUF spec.
_UINT8, _INT8, _UINT16, _INT16, _UINT32, _INT32, _FLOAT32, _BOOL = range(8)
_STRING, _ARRAY, _UINT64, _INT64, _FLOAT64 = range(8, 13)

_SCALAR_FORMATS = {
    _UINT8: "<B",
    _INT8: "<b",
    _UINT16: "<H",
    _INT16: "<h",
    _UINT32: "<I",
    _INT32: "<i",
    _FLOAT32: "<f",
    _BOOL: "<B",
    _UINT64: "<Q",
    _INT64: "<q",
    _FLOAT64: "<d",
}

_INITIAL_RANGE_BYTES = 10 * 1024 * 1024
_RETRY_RANGE_BYTES = 50 * 1024 * 1024


class GgufParseError(Exception):
    pass


class _Cursor:
    def __init__(self, data: bytes):
        self._data = data
        self._pos = 0

    def read(self, n: int) -> bytes:
        if self._pos + n > len(self._data):
            raise GgufParseError("truncated GGUF header")
        chunk = self._data[self._pos : self._pos + n]
        self._pos += n
        return chunk

    def read_scalar(self, fmt: str) -> Any:
        return struct.unpack(fmt, self.read(struct.calcsize(fmt)))[0]

    def read_uint32(self) -> int:
        return self.read_scalar("<I")

    def read_uint64(self) -> int:
        return self.read_scalar("<Q")

    def read_string(self) -> str:
        length = self.read_uint64()
        return self.read(length).decode("utf-8", errors="replace")

    def read_value(self, value_type: int) -> Any:
        if value_type == _STRING:
            return self.read_string()
        if value_type == _ARRAY:
            elem_type = self.read_uint32()
            length = self.read_uint64()
            return [self.read_value(elem_type) for _ in range(length)]
        fmt = _SCALAR_FORMATS.get(value_type)
        if fmt is None:
            raise GgufParseError(f"unknown GGUF value type {value_type}")
        return self.read_scalar(fmt)


def parse_gguf_header(data: bytes) -> dict[str, Any]:
    """Parse a GGUF file's metadata KV pairs from raw header bytes.

    `data` only needs to cover the metadata section - tensor data (the bulk
    of the file) is never read. Raises GgufParseError if `data` is cut off
    before the metadata section ends; the caller should re-fetch with a
    larger byte range.
    """
    cursor = _Cursor(data)
    magic = cursor.read_uint32()
    if magic != GGUF_MAGIC:
        raise GgufParseError(f"not a GGUF file (bad magic {magic:#x})")
    cursor.read_uint32()  # version, unused
    cursor.read_uint64()  # tensor_count, unused - stop before tensor infos
    kv_count = cursor.read_uint64()

    result: dict[str, Any] = {}
    for _ in range(kv_count):
        key = cursor.read_string()
        value_type = cursor.read_uint32()
        result[key] = cursor.read_value(value_type)
    return result


def fetch_gguf_header(repo_id: str, filename: str) -> dict[str, Any]:
    """Range-fetch and parse a GGUF file's header straight from HF, no download.

    Tries a generous fixed byte budget first; if that truncates mid-metadata
    (a very large vocab/chat-template can occasionally exceed it), retries
    once with a much larger range.
    """
    url = f"https://huggingface.co/{repo_id}/resolve/main/{filename}"
    headers = {}
    token = os.environ.get("HF_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    last_error: GgufParseError | None = None
    for range_bytes in (_INITIAL_RANGE_BYTES, _RETRY_RANGE_BYTES):
        try:
            resp = httpx.get(
                url,
                headers={**headers, "Range": f"bytes=0-{range_bytes - 1}"},
                follow_redirects=True,
            )
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            raise GgufParseError(f"failed to fetch {repo_id}/{filename}: {exc}") from exc
        if resp.status_code != 206:
            raise GgufParseError("server did not honor Range request, refusing to download full file")
        try:
            return parse_gguf_header(resp.content)
        except GgufParseError as exc:
            last_error = exc
    raise last_error


@dataclass
class GgufArchInfo:
    architecture: str
    block_count: int
    head_count: int
    head_count_kv: int
    embedding_length: int
    context_length: int
    key_length: int


def extract_arch_info(kv: dict[str, Any]) -> GgufArchInfo:
    architecture = kv.get("general.architecture")
    if not architecture:
        raise GgufParseError("missing general.architecture key")

    def required(suffix: str) -> Any:
        key = f"{architecture}.{suffix}"
        if key not in kv:
            raise GgufParseError(f"missing required key {key}")
        return kv[key]

    embedding_length = required("embedding_length")
    head_count = required("attention.head_count")
    key_length = kv.get(f"{architecture}.attention.key_length", embedding_length // head_count)

    return GgufArchInfo(
        architecture=architecture,
        block_count=required("block_count"),
        head_count=head_count,
        head_count_kv=kv.get(f"{architecture}.attention.head_count_kv", head_count),
        embedding_length=embedding_length,
        context_length=required("context_length"),
        key_length=key_length,
    )
