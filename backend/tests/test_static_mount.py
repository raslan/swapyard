from pathlib import Path

from app.main import FRONTEND_DIST_DIR


def test_frontend_dist_dir_points_to_expected_path():
    assert FRONTEND_DIST_DIR == (Path(__file__).parent.parent.parent / "frontend" / "dist").resolve()
