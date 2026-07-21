"""Parses `llama-server --help` output into a flags database for Swapyard's editor hints.

llama.cpp's --help formatter uses a fixed-width layout: every flag's aliases
start at column 0 and its description always starts at column 40 (0-indexed),
with wrapped continuation lines re-indented to the same column 40. Section
headers are lines like "----- common params -----". This was verified against
a real `docker run --rm ghcr.io/ggml-org/llama.cpp:server --help` run, not
guessed - see the fixtures in backend/tests/test_flags_parser.py.
"""

import json
import re
import sys

_DESCRIPTION_COLUMN = 40
_SECTION_HEADER = re.compile(r"^-{3,}.*-{3,}\s*$")


def parse(help_text: str) -> list[dict]:
    flags = []
    current: dict | None = None

    for line in help_text.splitlines():
        if not line.strip() or _SECTION_HEADER.match(line):
            continue

        if line.startswith(" "):
            if current is not None:
                continuation = line[_DESCRIPTION_COLUMN:].strip() or line.strip()
                current["description"] += " " + continuation
            continue

        if not line.startswith("-"):
            continue

        if current is not None:
            flags.append(current)

        # Normally the description starts right at column 40 and the alias
        # head is padded with trailing spaces to reach it. When the aliases
        # themselves run past column 40 (e.g. "--split-mode
        # {none,layer,row,tensor}"), there's no such padding and the
        # description is pushed entirely onto the continuation line instead -
        # detected by column 40 landing mid-word rather than after a gap.
        head = line[:_DESCRIPTION_COLUMN]
        if len(line) <= _DESCRIPTION_COLUMN or head.endswith(" "):
            alias_part = head.strip()
            description = line[_DESCRIPTION_COLUMN:].strip()
        else:
            alias_part = line.strip()
            description = ""

        # Only keep comma-separated tokens that are themselves flags (start
        # with "-"). Value hints like "--split-mode {none,layer,row,tensor}"
        # also contain commas, which would otherwise be misread as aliases.
        tokens = [t.strip() for t in alias_part.split(",") if t.strip().startswith("-")]
        long_flags = [t.split()[0] for t in tokens if t.startswith("--")]
        short_flags = [t.split()[0] for t in tokens if not t.startswith("--")]
        primary = long_flags[0] if long_flags else short_flags[0] if short_flags else None
        if primary is None:
            current = None
            continue

        current = {
            "flag": primary,
            "aliases": [t for t in (long_flags + short_flags) if t != primary],
            "description": description,
            "default": None,
        }

    if current is not None:
        flags.append(current)

    for flag in flags:
        default_match = re.search(r"\(default:\s*([^)]+)\)", flag["description"])
        if default_match:
            flag["default"] = default_match.group(1).strip()

    return flags


if __name__ == "__main__":
    help_text = sys.stdin.read()
    print(json.dumps(parse(help_text), indent=2))
