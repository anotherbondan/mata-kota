"""Tahap 0 — fetch Chicago Crimes via Socrata: paginated, resumable, idempoten.

Strategi (DECISIONS M10):
- Query SODA: $select kolom minimum, $where date >= start_date, $order date,id,
  $limit page_size, $offset per halaman.
- Tiap halaman dipersist ke data/raw/pages/page_{offset}.parquet + manifest.json
  {start_date, page_size, pages: {offset: rows}, complete}.
- Resume: halaman yang sudah tercatat utuh di manifest dilewati.
- Selesai (halaman terakhir < page_size): gabung semua halaman, dedup by `id`,
  tulis data/raw/crimes.parquet, set manifest.complete = true.
- Idempoten: bila manifest.complete dan crimes.parquet ada (tanpa force), langsung return.

CLI: python -m strsp.data.fetch [--force]
"""

from __future__ import annotations

import argparse
import json
import shutil
import time
from pathlib import Path

import pandas as pd
import requests

from strsp.config import load_config, resolve_dir, socrata_token

_RETRYABLE_STATUS = {429, 500, 502, 503, 504}


def _manifest_path(raw_dir: Path) -> Path:
    return raw_dir / "manifest.json"


def _load_manifest(raw_dir: Path, start: str, page_size: int) -> dict:
    path = _manifest_path(raw_dir)
    if path.exists():
        manifest = json.loads(path.read_text(encoding="utf-8"))
        if manifest.get("start_date") == start and manifest.get("page_size") == page_size:
            return manifest
    return {"start_date": start, "page_size": page_size, "pages": {}, "complete": False}


def _save_manifest(raw_dir: Path, manifest: dict) -> None:
    _manifest_path(raw_dir).write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def _fetch_page(
    session: requests.Session, url: str, params: dict, config: dict
) -> list[dict]:
    retries = config["data"]["max_retries"]
    timeout = config["data"]["timeout_s"]
    delay = 2.0
    for attempt in range(1, retries + 1):
        try:
            response = session.get(url, params=params, timeout=timeout)
            if response.status_code in _RETRYABLE_STATUS:
                raise requests.HTTPError(f"HTTP {response.status_code}")
            response.raise_for_status()
            return response.json()
        except (requests.RequestException, ValueError) as error:
            if attempt == retries:
                raise RuntimeError(
                    f"fetch gagal setelah {retries} percobaan (offset={params['$offset']}): {error}"
                ) from error
            print(f"  retry {attempt}/{retries} offset={params['$offset']}: {error}")
            time.sleep(delay)
            delay *= 2
    raise RuntimeError("unreachable")


def fetch_crimes(start: str | None, config: dict, force: bool = False) -> Path:
    """Tarik Chicago Crimes start→latest ke parquet cache.

    Args:
        start: tanggal awal ISO (default: config['data']['start_date']).
        config: dict dari load_config().
        force: True = abaikan cache, fetch ulang dari nol.

    Returns:
        Path ke parquet gabungan (data/raw/crimes.parquet).

    Raises:
        RuntimeError: kegagalan jaringan melebihi max_retries.
    """
    data_cfg = config["data"]
    start = start or data_cfg["start_date"]
    page_size = data_cfg["page_size"]
    raw_dir = resolve_dir(config, "raw_dir")
    pages_dir = raw_dir / "pages"
    combined_path = raw_dir / "crimes.parquet"

    if force and pages_dir.exists():
        shutil.rmtree(pages_dir)
        combined_path.unlink(missing_ok=True)
    pages_dir.mkdir(parents=True, exist_ok=True)

    manifest = _load_manifest(raw_dir, start, page_size)
    if force:
        manifest = {"start_date": start, "page_size": page_size, "pages": {}, "complete": False}
    if manifest["complete"] and combined_path.exists():
        print(f"cache lengkap: {combined_path} (pakai --force untuk fetch ulang)")
        return combined_path

    url = f"https://{data_cfg['source_domain']}/resource/{data_cfg['dataset_id']}.json"
    session = requests.Session()
    token = socrata_token()
    if token:
        session.headers["X-App-Token"] = token
        print("memakai SOCRATA_APP_TOKEN")
    else:
        print("PERINGATAN: tanpa SOCRATA_APP_TOKEN (anonim, mungkin throttled)")

    base_params = {
        "$select": ",".join(data_cfg["select"]),
        "$where": f"date >= '{start}T00:00:00'",
        "$order": data_cfg["order_by"],
        "$limit": page_size,
    }

    offset = 0
    while True:
        key = str(offset)
        page_path = pages_dir / f"page_{offset:09d}.parquet"
        if key in manifest["pages"] and page_path.exists():
            rows = manifest["pages"][key]
            if rows < page_size:
                break  # halaman terakhir sudah pernah diambil
            offset += page_size
            continue

        print(f"fetch offset={offset} ...")
        records = _fetch_page(session, url, {**base_params, "$offset": offset}, config)
        page_df = pd.DataFrame.from_records(records, columns=data_cfg["select"])
        page_df.to_parquet(page_path, index=False)
        manifest["pages"][key] = len(records)
        _save_manifest(raw_dir, manifest)
        print(f"  {len(records)} baris -> {page_path.name}")

        if len(records) < page_size:
            break
        offset += page_size

    page_files = sorted(pages_dir.glob("page_*.parquet"))
    combined = pd.concat((pd.read_parquet(p) for p in page_files), ignore_index=True)
    before = len(combined)
    combined = combined.drop_duplicates(subset=["id"], keep="first")
    combined.to_parquet(combined_path, index=False)
    manifest["complete"] = True
    _save_manifest(raw_dir, manifest)
    print(
        f"selesai: {len(combined)} baris unik ({before - len(combined)} duplikat dibuang) "
        f"-> {combined_path}"
    )
    return combined_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch Chicago Crimes -> parquet cache")
    parser.add_argument("--force", action="store_true", help="abaikan cache, fetch ulang")
    parser.add_argument("--start", default=None, help="override start_date (ISO)")
    args = parser.parse_args()
    config = load_config()
    fetch_crimes(args.start, config, force=args.force)


if __name__ == "__main__":
    main()
