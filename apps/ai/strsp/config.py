"""Loader config.yaml — satu-satunya pintu baca konfigurasi STRSP.

Juga memuat SOCRATA_APP_TOKEN dengan urutan prioritas:
env var > apps/ai/.env > apps/web/.env (pola env repo Matakota).
"""

from __future__ import annotations

import os
from pathlib import Path

import yaml
from dotenv import load_dotenv

AI_ROOT = Path(__file__).resolve().parent.parent  # apps/ai
REPO_ROOT = AI_ROOT.parent.parent

_REQUIRED_TOP_KEYS = ("data", "labeling", "features", "target", "cutoffs", "seed")


def load_config(path: str | Path | None = None) -> dict:
    """Baca dan validasi config.yaml.

    Args:
        path: path eksplisit; default apps/ai/config.yaml.

    Returns:
        dict konfigurasi utuh.

    Raises:
        FileNotFoundError: file config tidak ada.
        KeyError: kunci wajib hilang.
    """
    config_path = Path(path) if path else AI_ROOT / "config.yaml"
    with open(config_path, encoding="utf-8") as fh:
        config = yaml.safe_load(fh)
    for key in _REQUIRED_TOP_KEYS:
        if key not in config:
            raise KeyError(f"config.yaml tidak punya kunci wajib: {key}")
    return config


def resolve_dir(config: dict, key: str) -> Path:
    """Resolusi direktori data relatif terhadap apps/ai; buat bila belum ada."""
    directory = AI_ROOT / config["data"][key]
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def socrata_token() -> str | None:
    """Ambil SOCRATA_APP_TOKEN: env var > apps/ai/.env > apps/web/.env."""
    load_dotenv(AI_ROOT / ".env")
    load_dotenv(REPO_ROOT / "apps" / "web" / ".env")
    token = os.environ.get("SOCRATA_APP_TOKEN", "").strip()
    return token or None
