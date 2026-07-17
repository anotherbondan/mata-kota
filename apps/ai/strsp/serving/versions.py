"""Final M28 — resolusi versi batch temporal.

Versi didefinisikan di config serving.batch_versions: {name, days_back};
T_versi = latest (max tanggal raw) − days_back. Versi `current` memakai
cache_path/meta_path lama (kontrak pra-M28 utuh); versi lain memakai
`<stem>_<name>` di direktori yang sama.
"""

from __future__ import annotations

from pathlib import Path

from strsp.config import AI_ROOT


def batch_versions(config: dict) -> list[dict]:
    """Daftar versi dari config; validasi: nama unik & `current` (days_back 0) ada."""
    versions = config["serving"]["batch_versions"]
    names = [v["name"] for v in versions]
    if len(set(names)) != len(names):
        raise ValueError(f"nama versi batch duplikat: {names}")
    if "current" not in names:
        raise ValueError("serving.batch_versions wajib memuat versi 'current'")
    return versions


def version_paths(config: dict, name: str) -> tuple[Path, Path]:
    """(cache_path, meta_path) untuk satu versi; `current` = path lama (backward-compat)."""
    raw_cache = Path(config["serving"]["cache_path"])
    raw_meta = Path(config["serving"]["meta_path"])
    cache = raw_cache if raw_cache.is_absolute() else AI_ROOT / raw_cache
    meta = raw_meta if raw_meta.is_absolute() else AI_ROOT / raw_meta
    if name == "current":
        return cache, meta
    return (
        cache.with_name(f"{cache.stem}_{name}{cache.suffix}"),
        meta.with_name(f"{meta.stem}_{name}{meta.suffix}"),
    )
