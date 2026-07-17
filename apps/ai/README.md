# STRSP — Space-Time Risk Score Predictor (`apps/ai`)

Base **risk layer** untuk Matakota: memprediksi Risk Score `0–100` per sel grid ~1 km ×
konteks waktu (hour_bucket × day_type) dari data historis kejahatan Chicago (Socrata,
2021→terkini). Bagian dari FastAPI "AI Service" di monorepo Matakota.

- **Spesifikasi build:** [`SPEC.md`](./SPEC.md) — sumber kebenaran (serving contract di §12).
- **Log keputusan:** [`DECISIONS.md`](./DECISIONS.md) (K1/D6 warisan finpro + M1–M27).
- **Hyperparameter:** `config.yaml` — single source of truth.
- **Ringkasan 1 halaman utk judging:** [`SUMMARY.md`](./SUMMARY.md).

> Status: **SELESAI** (2026-07-17) — 36 acceptance test hijau (HO1: 9, HO2: 11, Final: 16).
> Model produksi: **v4** (4-model rolling weekly, quality-gated).

---

## Setup

From the repository root:

```bash
python -m venv apps/ai/.venv
pnpm run setup:ai
pnpm run dev:ai
```

Turbo uses `apps/ai/.venv` automatically when it exists, then falls back to an active
virtual environment or a system Python 3 command. `pnpm run dev` and
`pnpm run dev:web` start this service alongside Next.js.

Token Socrata (opsional — tanpa token fetch tetap jalan, hanya throttled):
salin `.env.example` → `.env`, isi `SOCRATA_APP_TOKEN=...`. Jangan commit.

## Pipeline end-to-end (urutan sekali jalan)

```bash
# Tahap 0 — fetch Chicago Crimes 2021→latest (paginated, resumable, idempoten)
python -m strsp.data.fetch                      # → data/raw/crimes.parquet (±1,33 jt baris)

# Tahap 1 — dataset cutoff-aware C1..C4 (label + fitur, anti-leakage)
python -m strsp.features.dataset --all-cutoffs  # → data/processed/dataset_C{1..4}.parquet

# Tahap 2–3 — latih 4 model rolling + eval walk-forward + drift + registry
python -m strsp.continual.pipeline              # → data/models/v{1..4}.json + data/registry/models.jsonl

# Tahap 4 — precompute lookup table serving (SEKALI sebelum demo; demo resilience)
python -m strsp.serving.precompute              # → data/cache/risk_batch{,_last_week,_last_month,_6_months_ago}.parquet
                                                #   4 snapshot temporal (M28), semua dari model v4

# Serve through Turbo
pnpm run dev:ai
```

Semua artefak `data/` di-gitignore. Acceptance gates: `pytest -v` (36 test, wajib hijau).

## Endpoint (contoh request/response NYATA)

```bash
curl http://localhost:8000/health
# {"status":"ok","model_version":"v4","cache_freshness":"2026-07-17T01:30:34.785183+00:00"}

curl "http://localhost:8000/risk-score/batch?hour_bucket=18-23&day_type=weekend"
# 200 → 690 sel; item: {"grid_lat":41.64,"grid_lng":-87.6,"risk_score":0.0,
#                       "hour_bucket":"18-23","day_type":"weekend"}
# Tanpa filter → 5.619 sel (semua kombinasi grid × 4 bucket × 2 day_type yang berdata).

curl "http://localhost:8000/risk-score/batch?version=6_months_ago&hour_bucket=18-23&day_type=weekend"
# Snapshot temporal (M28): version = current|last_week|last_month|6_months_ago
# (default current; 6_months_ago = 5.609 sel — grid muda belum ada di snapshot lama).

curl "http://localhost:8000/risk-score/point?lat=41.881&lng=-87.629&timestamp=2026-07-18T21:30:00"
# 200 → {"grid_lat":41.88,"grid_lng":-87.63,"risk_score":86.85202026367188,
#        "hour_bucket":"18-23","day_type":"weekend"}   (Loop, Sabtu malam)

curl "http://localhost:8000/risk-score/point?lat=-6.17&lng=106.82&timestamp=2026-07-17T10:00:00"
# 422 → koordinat di luar bounding box Chicago (tidak pernah extrapolate diam-diam)

curl http://localhost:8000/metrics/summary
# {"uptime_s":..,"total_requests":..,"error_rate":0.0,"model_version":"v4",
#  "per_endpoint":{"/risk-score/batch":{"count":..,"p50_ms":15.95,"p95_ms":23.63},...}}
```

Latency terukur (lokal): `/point` p95 ≈ 10 ms (budget 150), `/batch` p95 ≈ 53 ms (budget 500).
`POST /incidents/classify` (placeholder Modul B, bukan STRSP) tetap tersedia & tak berubah.

## Layout

```
apps/ai/
├── config.yaml · SPEC.md · DECISIONS.md · SUMMARY.md · README.md
├── app/main.py         # FastAPI: /health, /incidents/classify, /risk-score/*, /metrics/summary
├── strsp/
│   ├── data/           # Tahap 0: fetch + load (Socrata → parquet)
│   ├── labeling/       # severity table + temporal decay (cutoff-aware)
│   ├── features/       # grid + BallTree smoothing + encoding + build_dataset(C)
│   ├── baseline/       # grid-only mean (D6)
│   ├── modeling/       # XGBoost train + eval walk-forward next-week
│   ├── continual/      # drift, registry .jsonl, quality gate, pipeline v1→v4
│   └── serving/        # schemas, model_store, precompute, cache, monitoring
└── tests/              # 36 acceptance tests / 22 gate (pytest)
```

## Titik integrasi ke Matakota

- tRPC `dashboard.aiHealth` → `GET /health`.
- tRPC `dashboard.riskGrid` → fetch `AI_SERVICE_URL` → `GET /risk-score/batch`.
- Semua response divalidasi di `packages/api/src/lib/ai-service.ts`; timeout/error
  upstream dikembalikan sebagai error gateway terstruktur.
- Kontrak response: array `{grid_lat, grid_lng, risk_score, hour_bucket, day_type}` (SPEC §12).
- Service tetap dapat boot tanpa artefak model/cache dengan status `degraded`; endpoint
  yang membutuhkan artefak membalas `503` terstruktur.

## Catatan

Model berbasis **Chicago** (seed app memakai Jakarta) — keputusan geo-framing di
**DECISIONS M5** (masih open, level produk). Karena itu grid AI belum dipasang sebagai
layer peta Jakarta. Keterbatasan jujur lain: `SUMMARY.md`.
