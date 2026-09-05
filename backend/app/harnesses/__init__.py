from app.harnesses import kilo, ohmypi, opencode, openclaw, pi
from app.harnesses.base import Harness

HARNESSES: list[Harness] = [opencode.HARNESS, kilo.HARNESS, pi.HARNESS, ohmypi.HARNESS, openclaw.HARNESS]
