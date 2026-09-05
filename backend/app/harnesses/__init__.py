from app.harnesses import hermes_agent, kilo, ohmypi, opencode, openclaw, pi, qwen_code
from app.harnesses.base import Harness

HARNESSES: list[Harness] = [
    opencode.HARNESS,
    kilo.HARNESS,
    pi.HARNESS,
    ohmypi.HARNESS,
    openclaw.HARNESS,
    qwen_code.HARNESS,
    hermes_agent.HARNESS,
]
