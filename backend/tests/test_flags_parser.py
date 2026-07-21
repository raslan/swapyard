# parser lives in scripts/, but its test lives with the rest of the backend
# suite for CI coverage
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "scripts"))
from parse_llama_server_flags import parse  # noqa: E402

# Fixtures below are verbatim excerpts from a real
# `docker run --rm ghcr.io/ggml-org/llama.cpp:server --help` run - llama.cpp's
# help formatter uses a fixed column-40 layout, not the loosely-indented
# format originally guessed at.


def test_parses_a_simple_flag_with_multiple_aliases_and_default():
    help_text = (
        "-t,    --threads N                      number of CPU threads to use during generation (default: -1)\n"
        "                                        (env: LLAMA_ARG_THREADS)\n"
    )
    flags = parse(help_text)
    assert len(flags) == 1
    assert flags[0]["flag"] == "--threads"
    assert flags[0]["aliases"] == ["-t"]
    assert flags[0]["default"] == "-1"
    assert "LLAMA_ARG_THREADS" in flags[0]["description"]


def test_parses_a_flag_whose_aliases_overflow_the_description_column():
    help_text = (
        "-sm,   --split-mode {none,layer,row,tensor}\n"
        "                                        how to split the model across multiple GPUs, one of:\n"
        "                                        - none: use one GPU only\n"
    )
    flags = parse(help_text)
    assert len(flags) == 1
    assert flags[0]["flag"] == "--split-mode"
    assert flags[0]["aliases"] == ["-sm"]
    assert "how to split the model" in flags[0]["description"]
    assert "none: use one GPU only" in flags[0]["description"]


def test_skips_section_headers_and_blank_lines():
    help_text = (
        "----- common params -----\n"
        "\n"
        "--version                               show version and build info\n"
    )
    flags = parse(help_text)
    assert len(flags) == 1
    assert flags[0]["flag"] == "--version"
    assert flags[0]["aliases"] == []


def test_parses_a_flag_with_no_short_alias():
    help_text = "--port PORT                             port to listen (default: 8080)\n"
    flags = parse(help_text)
    assert len(flags) == 1
    assert flags[0]["flag"] == "--port"
    assert flags[0]["default"] == "8080"
