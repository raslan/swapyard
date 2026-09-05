from app.harnesses import kilo, opencode
from app.harnesses.base import Harness

HARNESSES: list[Harness] = [opencode.HARNESS, kilo.HARNESS]
