# SPEC — Space-Time Risk Score Predictor (STRSP)

> **Sumber kebenaran build** untuk agent. Diadaptasi dari finpro MLOps SISTECH 2026
> ke dalam repo **Matakota** (Garuda Hacks 7.0). Semua keputusan desain tercatat di
> [`DECISIONS.md`](./DECISIONS.md); semua hyperparameter di `config.yaml`.
> Jika ada konflik antara dokumen ini dan kode, **dokumen ini menang** — perbarui kode,
> lalu catat perubahannya di `DECISIONS.md`.

---

## 0. Status build

| Tahap | Cakupan | Peta ke | Status |
|------|---------|---------|--------|
| Tahap 0 | Fetch + cache Chicago Crimes 2021→latest (Socrata) | Hands-on 1 | ✅ 2026-07-17 |
| Tahap 1 | Pseudo-labeling + feature engineering + builder cutoff-aware | Hands-on 1 | ✅ 2026-07-17 (6 gate hijau) |
| Tahap 2–3 | Modeling (XGBoost) + baseline + continual learning 4-model | Hands-on 2 | ✅ 2026-07-17 (11 gate HO2 hijau; v3 diblokir quality gate — lihat registry) |
| Tahap 4–6 | Serving (FastAPI) + monitoring + dokumentasi | Final | ✅ 2026-07-17 (8 gate Final hijau; §13) |

**Semua tahap selesai (2026-07-17).** Serving contract di §12; wiring `riskGrid` di sisi
Next.js = kerja partner full-stack (endpoint sudah siap dipanggil).

---

## 1. Konteks proyek

STRSP menghasilkan **Risk Score 0–100** untuk sebuah sel lokasi pada konteks waktu tertentu,
dari data historis kejahatan Chicago. Di Matakota, output ini menjadi **base risk layer**
di bawah incident pada heatmap operator.

**Lokasi kode:** `apps/ai/` (FastAPI "AI Service" — wilayah AI). Layout:

```
apps/ai/
├── config.yaml            # single source of truth hyperparameter
├── SPEC.md                # dokumen ini
├── DECISIONS.md           # log keputusan
├── README.md              # cara menjalankan
├── app/main.py            # FastAPI (endpoint serving menyusul di Final)
├── strsp/
│   ├── data/              # Tahap 0: fetch + cache Socrata
│   ├── labeling/          # Tahap 1: severity table + pseudo-label + decay
│   ├── features/          # Tahap 1: grid, smoothing, cyclical encoding, builder cutoff-aware
│   └── baseline/          # referensi baseline (grid-only mean) — dipakai penuh di Hands-on 2
└── tests/                 # acceptance gates (pytest)
```

**Titik integrasi (JANGAN dibangun di Tahap 0/1, tapi jaga kompatibilitas bentuk output):**

- tRPC `riskGrid` di `packages/api/src/routers/dashboard.ts` — mengonsumsi grid risk.
- Layer Mapbox disisipkan `beforeId "incident-heat"` di `components/incident-map.tsx`.
- FastAPI dijangkau via `AI_SERVICE_URL` (`packages/env/src/server.ts`).
- Prisma **tanpa PostGIS** (lat/lng `Float`) → grid cukup Float 2-desimal, bukan geometry.

---

## 2. Data

- **Sumber:** Chicago Crimes — City of Chicago Open Data Portal (Socrata API).
- **Jendela:** `2021-01-01` → **tanggal terbaru yang tersedia** (`latest` = max `date` di data terfetch).
  Sadari **reporting lag**: beberapa hari terakhir belum lengkap.
- **Fetch:** paginated, **idempoten & resumable**; cache raw ke **parquet** di `data/raw/`.
- **Kolom minimum:** `date`, `primary_type`, `description`, `latitude`, `longitude`
  (+ `id`, `case_number` untuk dedup fetch). Buang baris tanpa lat/lng/date.
- `data/` **di-gitignore**. Token via `SOCRATA_APP_TOKEN` (di `.env`, **jangan commit**).

---

## 3. Target & pseudo-labeling

1. **Severity scoring table** (domain-driven): map `(primary_type, description)` → skor mentah `0–100`.
   Coverage baris ter-map **≥ 0.90** (gate #1).
2. **Temporal decay:** bobot tiap kejahatan `w = exp(−λ_t × days_since_crime)`, `λ_t` dari config.
   ⚠️ **`days_since_crime` diukur relatif ke `reference_date` (cutoff) pipeline, BUKAN `today`.**
3. **Spatial aggregation:** bulatkan `lat`/`lng` ke **2 desimal** (≈1 km) → `grid_lat`, `grid_lng`.
4. **Spatial smoothing:** kontribusi grid tetangga via **BallTree** (grid-first, O(n log n)),
   radius & bobot tetangga dari config.
5. **Target (fix K1 — anti-leakage):** risk **time-resolved** per
   `grid × hour_bucket × day_type`. Skala akhir ke `0–100`.
   Per-grid *smoothed risk* boleh dipakai sebagai **fitur**, tapi **bukan** target itu sendiri.

**`hour_bucket`** & **`day_type`**: definisikan di config (mis. hour_bucket = {0–5,6–11,12–17,18–23};
day_type = {weekday, weekend}). Konsisten dipakai di target & fitur.

> Detail yang dikunci via DECISIONS: baris unmapped **dibuang** (`unmapped_policy: exclude`, M11);
> skala akhir memakai **p99-clipped min-max** (`target.scale_policy`, M14); bobot smoothing
> `w = exp(−λ_s·d_km)` (M13).

---

## 4. Fitur

- **Spasial:** `grid_lat`, `grid_lng`; per-grid smoothed risk (dari §3.4) sebagai fitur konteks.
- **Temporal siklikal:** `hour → (sin, cos)`; opsional `day_of_week → (sin, cos)`.
- **Kategorikal waktu:** `hour_bucket`, `day_type`.
- Semua fitur **dihitung ulang per `reference_date`** agar konsisten lintas cutoff.
- **Tidak ada fitur yang menyalin target** (jaga gate #4).

---

## 5. ★ Builder cutoff-aware (fondasi 4 model rolling) ★

Kontrak inti Hands-on 1:

```python
def build_dataset(reference_date: date, config: dict) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Bangun (labels, features) HANYA dari baris crime bertanggal <= reference_date.
    - Temporal decay diukur dari reference_date.
    - Deterministik untuk (data, config, reference_date) yang sama.
    - Tidak menyentuh baris > reference_date (anti future-leakage).
    Return: (labels_df, features_df) yang bisa di-join pada kunci grid×hour_bucket×day_type.
    """
```

**Empat cutoff** (dihitung dari `latest` = max tanggal data):

| Model | Cutoff | Keterangan |
|------|--------|-----------|
| M1 | `C1 = latest` | 2021 → data terbaru |
| M2 | `C2 = latest − 7 hari` | 2021 → seminggu sebelum terbaru |
| M3 | `C3 = latest − 14 hari` | 2021 → dua minggu sebelum terbaru |
| M4 | `C4 = latest − 21 hari` | 2021 → tiga minggu sebelum terbaru |

Deliverable Tahap 1: artefak dataset ter-persist untuk **tiap** cutoff (mis. `data/processed/dataset_C{1..4}.parquet`).
**Model dilatih di Hands-on 2**, bukan di sini.

---

## 6. Baseline (fix D6)

- Baseline = **grid-only mean** risk (agregasi `grid_lat×grid_lng` saja), **lebih kasar** dari
  kunci target (`grid×hour_bucket×day_type`) agar model punya ruang untuk mengungguli baseline.
- Di Tahap 1 cukup **siapkan fungsinya**; perbandingan penuh model-vs-baseline di Hands-on 2.

---

## 7. Kontrak modul (Tahap 0 & 1)

| Modul | Fungsi utama | Kontrak singkat |
|------|--------------|-----------------|
| `strsp/data/fetch.py` | `fetch_crimes(start, config)` | Tarik Socrata 2021→latest, paginated/resumable, cache parquet, return path/df. |
| `strsp/data/load.py` | `load_raw(config)` | Baca parquet, bersihkan (drop null lat/lng/date), parse tipe. |
| `strsp/labeling/scoring_table.py` | `apply_scoring_table(df, config)` | Map (primary_type, description) → skor 0–100; laporkan coverage. |
| `strsp/labeling/decay.py` | `apply_temporal_decay(df, reference_date, config)` | `w = exp(−λ_t·days_since)`, days_since dari reference_date. |
| `strsp/features/grid.py` | `to_grid(df, config)` | Bulatkan lat/lng 2 desimal → grid_lat, grid_lng. |
| `strsp/features/smoothing.py` | `smooth_neighbors(grid_df, config)` | BallTree neighbor contribution (grid-first). |
| `strsp/features/encoding.py` | `cyclical_time(df, config)` | hour→sin/cos; hour_bucket; day_type. |
| `strsp/features/dataset.py` | `build_dataset(reference_date, config)` | Orkestrasi §5; target time-resolved (K1). |
| `strsp/baseline/baseline.py` | `grid_only_baseline(df, config)` | Grid-only mean (D6) — siapkan saja. |

Tiap modul ditulis **contract-first**: signature + docstring spec dulu, `NotImplementedError`,
gate pytest yang **skip** sampai terisi → lalu **wajib lulus**.

---

## 8. Acceptance gates — Hands-on 1

Semua di `tests/`, dijalankan **betulan** (bukan diklaim):

1. **Coverage** scoring table ≥ `config.labeling.min_coverage` (default 0.90).
2. **Distribusi risk sehat:** dalam `[0,100]`, sebaran non-degenerate, persentil masuk akal.
3. **Sanity isolated-grid:** grid tanpa tetangga ⇒ smoothed risk == kontribusi sendiri.
4. **No-leakage K1:** target time-resolved per `grid×hour_bucket×day_type` & **tidak identik**
   dengan fitur tunggal mana pun.
5. **Cutoff-awareness:** `build_dataset(C)` berisi **nol** baris bertanggal `> C`; decay memakai
   `C` sebagai acuan (uji dengan tanggal sintetis).
6. **Reproducibility:** seed tetap ⇒ `build_dataset` deterministik untuk input sama.

> Gate Hands-on 2 & Final (modeling improvement vs baseline, drift trigger, quality gate,
> serving contract) didefinisikan saat tahap tersebut dibuka.

---

## 9. Kontrak output (untuk integrasi nanti)

Bentuk akhir yang dikonsumsi `riskGrid` / layer peta:

```jsonc
// GET (via FastAPI) → array grid cell
[
  { "grid_lat": 41.88, "grid_lng": -87.63, "risk_score": 72.4,
    "hour_bucket": "18-23", "day_type": "weekend" }
  // ...
]
```

Tabel label/fitur Tahap 1 harus bisa **roll-up bersih** ke bentuk ini (kunci grid + konteks waktu).
Endpoint & wiring dibangun di Final, bukan sekarang.

---

## 10. Referensi `config.yaml` (kunci yang diharapkan)

```yaml
data:
  source_domain: data.cityofchicago.org
  dataset_id: <socrata_id>          # Chicago Crimes
  start_date: "2021-01-01"
  raw_dir: data/raw
  processed_dir: data/processed
labeling:
  min_coverage: 0.90                # gate #1
  lambda_t: 0.003                   # decay/hari (warisan finpro; boleh dire-justifikasi)
  score_min: 0
  score_max: 100
features:
  grid_decimals: 2                  # ~1km
  neighbor_radius_km: 2.0           # BallTree
  neighbor_weight: <config>
  hour_buckets: [[0,5],[6,11],[12,17],[18,23]]
  day_types: { weekend: [5,6] }
cutoffs:
  weeks_back: [0, 1, 2, 3]          # → C1..C4
seed: 42
```

Tiap nilai **wajib dijustifikasi** di `DECISIONS.md`.

---

## 11. Modeling & Continual Learning (Hands-on 2)

- **Baseline (D6):** grid-only mean — diimplementasikan penuh sebagai pembanding wajib.
- **Model (M16):** XGBoost Regressor per cutoff; hyperparameter di `config.model.params`.
  4 model: `v1←C4, v2←C3, v3←C2, v4←C1` (kronologis retraining; v4 = production head).
- **Eval (M17):** walk-forward next-week dengan **fitur beku di cutoff train**:
  ŷ = v_k(features@C_train) vs `risk_score`@C_next (irisan kunci); MAE metrik utama.
  Baseline dievaluasi identik; model wajib unggul ≥ `model.min_improvement_over_baseline`.
  v4 tanpa holdout (metrik eval = null, `deployed=true`).
- **Drift (M19):** mean-shift % target antar-checkpoint berurutan; trigger > `continual.drift_threshold`.
- **Quality gate (M20):** MAE eval monoton non-naik v1→v3 dalam `regression_tolerance`;
  checkpoint regres di-BLOKIR (`deployed=false`).
- **Registry (M21):** `data/registry/models.jsonl` append-only, 1 entri/checkpoint, field
  wajib lihat M21; artefak model `data/models/v{k}.json`.

**Kontrak modul HO2:**

| Modul | Fungsi utama |
|------|--------------|
| `strsp/baseline/baseline.py` | + `baseline_predict(baseline_df, keys_df, config)` — map grid-mean ke kunci (grid asing → global mean). |
| `strsp/modeling/train.py` | `train_model(dataset_df, config)` → XGBRegressor terlatih, seed tetap. |
| `strsp/modeling/evaluate.py` | `predict_on_keys`, `walk_forward_mae`, `baseline_walk_forward_mae`. |
| `strsp/continual/drift.py` | `mean_shift_pct(prev, next)`, `is_drift(pct, config)`. |
| `strsp/continual/registry.py` | `append_entry(entry, config)`, `read_registry(config)` — validasi field wajib. |
| `strsp/continual/quality_gate.py` | `check_quality(mae_sequence, config)` → flag blocked per checkpoint. |
| `strsp/continual/pipeline.py` | `run_checkpoints(config)` — orkestrasi v1→v4; CLI `python -m strsp.continual.pipeline`. |

**Acceptance gates HO2** (`tests/test_ho2_gate{1..7}_*.py`, skip→wajib lulus):
(1) model > baseline ≥10% pada protokol eval; (2) no-leakage walk-forward (spike sintetis
minggu-berikut tak mengubah prediksi); (3) drift detector benar via shift sintetis
(+15% trigger, +5% diam); (4) registry integrity (append-only, field lengkap, reproducible);
(5) quality gate memblokir regresi sintetis; (6) baseline D6 sanity (1 baris/grid, konstan
lintas bucket); (7) reproducibility (seed tetap ⇒ prediksi & MAE identik).

## 12. Serving Contract (Final — M22–M27)

Model produksi = entri `deployed==true` TERBARU di registry (**v4**), dimuat SEKALI saat
startup. Endpoint placeholder `/incidents/classify` (Modul B pra-STRSP) **koeksis
independen** — tidak tersentuh STRSP. Latency budget (diukur nyata di gate #5):
`/point` ≤ 150 ms, `/batch` ≤ 500 ms (aktual: point p95 ≈ 10 ms, batch p95 ≈ 53 ms).

### GET /risk-score/batch — precomputed lookup (heatmap)

Query opsional: `hour_bucket` (label config, mis. `18-23`), `day_type` (`weekday|weekend`),
`version` (**M28**: `current` | `last_week` | `last_month` | `6_months_ago`; default
`current` — snapshot temporal, semua diprediksi model produksi dgn decay dari T versi).
Nilai asing → 422. Cache belum pernah dibangun → **503 terstruktur** (M24).
Jumlah sel boleh berbeda antar versi (grid muda absen di snapshot lama — sinyal, bukan bug).

```bash
curl "http://localhost:8000/risk-score/batch?hour_bucket=18-23&day_type=weekend"
# 200 → array RiskCell (contoh nyata, 690 sel utk filter di atas):
# [{"grid_lat":41.64,"grid_lng":-87.6,"risk_score":0.0,
#   "hour_bucket":"18-23","day_type":"weekend"}, ...]
```

### GET /risk-score/point — inferensi live v4

Wajib: `lat`, `lng` (dalam bbox Chicago — di luar → 422 eksplisit, M23), `timestamp`
(ISO-8601; naive = waktu lokal Chicago, M27).

```bash
curl "http://localhost:8000/risk-score/point?lat=41.881&lng=-87.629&timestamp=2026-07-18T21:30:00"
# 200 → {"grid_lat":41.88,"grid_lng":-87.63,"risk_score":86.85202026367188,
#        "hour_bucket":"18-23","day_type":"weekend"}
```

### GET /health (kontrak lama + field baru) & GET /metrics/summary

```bash
curl http://localhost:8000/health
# {"status":"ok","model_version":"v4","cache_freshness":"2026-07-17T01:30:34.785183+00:00"}
curl http://localhost:8000/metrics/summary
# {"uptime_s":..,"total_requests":..,"error_count":..,"error_rate":..,
#  "model_version":"v4","per_endpoint":{"/risk-score/point":{"count":..,"p50_ms":..,"p95_ms":..},...}}
```

Precompute (jalankan SEKALI sebelum demo; serving lalu murni baca cache — demo resilience):

```bash
python -m strsp.serving.precompute
```

## 13. Konvensi & guardrail

- **Berbasis bukti:** jalankan test, tunjukkan output nyata; jangan klaim hijau tanpa jalan.
- **Batasi perubahan ke `apps/ai/`** di tahap ini — jangan sentuh frontend/tRPC/Prisma.
- **Jangan commit secret**; pakai `.env` + `.env.example`.
- **Jangan ubah keputusan desain diam-diam** — angkat & catat di `DECISIONS.md`.
- **Geo-framing** (Chicago vs seed Jakarta) adalah keputusan produk terpisah — pertahankan
  STRSP di Chicago; lihat DECISIONS M5.