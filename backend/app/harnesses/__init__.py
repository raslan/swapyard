from app.harnesses import (
    aider,
    cline,
    continue_dev,
    hermes_agent,
    kilo,
    llm_cli,
    ohmypi,
    openai_compatible,
    opencode,
    openclaw,
    pi,
    qwen_code,
)
from app.harnesses.base import Harness

HARNESSES: list[Harness] = [
    opencode.HARNESS,
    kilo.HARNESS,
    pi.HARNESS,
    ohmypi.HARNESS,
    openclaw.HARNESS,
    qwen_code.HARNESS,
    hermes_agent.HARNESS,
    continue_dev.HARNESS,
    cline.HARNESS,
    aider.HARNESS,
    llm_cli.HARNESS,
    openai_compatible.HARNESS,
]
