# AI System Summary — STRSP (Matakota) · 1 halaman untuk technical judging

**Apa:** Space-Time Risk Score Predictor — base risk layer di bawah incident heatmap
operator. Prediksi Risk Score **0–100** per sel grid ~1 km (lat/lng 2 desimal) ×
`hour_bucket` (4) × `day_type` (weekday/weekend), dilatih pada **Chicago Crimes**
(Socrata, real data, 2021-01-01 → 2026-07-08, **1.326.580 baris**).

## Alur sistem

```
Socrata (fetch resumable) → parquet raw
  → pseudo-label: severity table (primary_type+description → 0–100; coverage 1.0000)
  → temporal decay exp(−0.003·hari) RELATIF KE CUTOFF (anti-leakage)
  → grid 2 desimal + BallTree neighbor smoothing (fitur, bukan target — K1)
  → build_dataset(C): 4 dataset mingguan C4→C1 (5.619 baris × 733 grid)
  → 4 model XGBoost rolling (v1←C4 … v4←C1) + eval walk-forward "next-week"
  → drift mean-shift % + quality gate strict + registry .jsonl
  → v4 deployed → precompute lookup (batch) + inferensi live (point) via FastAPI
```

## Angka kunci (semua terukur, bukan estimasi)

| Metrik | Nilai |
|---|---|
| Coverage severity table | **1.0000** (gate ≥ 0.90) |
| MAE walk-forward v1 / v2 / v3 | **2.671 / 2.645 / 2.668** (skala 0–100) |
| Baseline D6 (grid-only mean) MAE | 7.301 / 7.292 / 7.251 |
| Improvement vs baseline | **63,4% / 63,7% / 63,2%** (gate ≥ 10%) |
| Drift antar-checkpoint (mean-shift) | 0,20% / 0,08% / 0,01% — tak ada trigger (threshold 10%) |
| Quality gate strict (tol 0.0) | **v3 DIBLOKIR** (MAE +0,86% vs v2) — bukti mekanisme bekerja |
| Latency serving (lokal, p95) | point **≈10 ms** (budget 150) · batch **≈53 ms** (budget 500) |
| Acceptance tests | **36 hijau** (HO1: 9 · HO2: 11 · Final: 16) — contract-first, skip→pass |

**Serving:** `GET /risk-score/batch` = lookup precomputed (5.619 sel; demo tak bergantung
Socrata/training live; cache-fallback terstruktur; **4 snapshot temporal** via `?version=`:
current/last_week/last_month/6_months_ago — mean|Δrisk| current↔6mo = 1,66, ↔1mgg = 0,62). `GET /risk-score/point` = inferensi
live v4 satu titik (validasi bbox Chicago, 422 di luar). Monitoring JSONL +
`/metrics/summary`. Model = entri deployed terbaru registry, dimuat sekali saat startup.

## Human-in-the-loop & explainability

Skor = **kandidat prioritas atensi**, bukan perintah dispatch. Pseudo-label berasal dari
tabel severity yang dapat diaudit di `config.yaml`; setiap keputusan desain tercatat di
`DECISIONS.md` (K1/D6 finpro + M1–M27); registry menyimpan jejak retraining lengkap.

## 3 keterbatasan jujur

1. **Drift riil antar-checkpoint sangat kecil (≤0,2%)** — cutoff mingguan berdekatan +
   decay half-life 231 hari membuat distribusi target hampir identik; validitas detektor
   dibuktikan lewat uji shift sintetis (+15% trigger, +5% diam), bukan narasi drift data nyata.
2. **Geo-framing: model Chicago, aplikasi ber-seed Jakarta** (DECISIONS M5, keputusan
   produk masih open). Data Chicago dipakai karena terbuka, real, dan matang; risk layer
   harus di-disclose sebagai basis Chicago / proxy saat demo.
3. **Target = pseudo-label** (severity table domain-driven + decay), bukan ground-truth
   "risiko" — model belajar pola spatio-temporal dari proxy tersebut; MAE ~2,7 dibaca
   relatif terhadap definisi label ini, memadai untuk layer visual, bukan alat prediktif
   individual. (Tambahan: hari terakhir data Socrata belum lengkap — reporting lag ±9 hari;
   anchor `latest` belum digeser, tercatat sebagai open question.)
