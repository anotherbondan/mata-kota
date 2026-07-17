# DECISIONS — STRSP (Matakota)

> Log keputusan desain untuk Space-Time Risk Score Predictor di dalam repo Matakota.
> Bagian **Inherited** dibawa dari finpro MLOps SISTECH 2026; bagian **New** khusus adaptasi ini.
> Format tiap entri: **Context → Decision → Rationale → Consequences → Status**.
>
> Catatan provenance: dari finpro, **K1** dan **D6** diketahui verbatim dan dipertahankan
> ID-nya. Keputusan warisan lain (decay, grid, smoothing, continual learning) direkonstruksi
> dari desain finpro dan diberi ID `INH-*`; selaraskan nomor K aslinya saat porting dari
> `DECISIONS.md` finpro bila diperlukan.

---

## A. Inherited dari finpro

### INH-1 (finpro **K1**) — Target leakage → target time-resolved
- **Context:** Jika per-grid smoothed risk dipakai sekaligus sebagai target dan fitur, model
  hanya menyalin nilainya (leakage), metrik palsu.
- **Decision:** Target dibuat **time-resolved** per `grid × hour_bucket × day_type`. Per-grid
  smoothed risk tetap boleh jadi **fitur**, tapi bukan target.
- **Rationale:** Memaksa model belajar variasi temporal di dalam grid, bukan mereplikasi agregat.
- **Consequences:** Kunci target lebih halus dari kunci baseline; wajib dijaga gate no-leakage (#4).
- **Status:** ✅ Dipertahankan.

### INH-2 — Pseudo-labeling via severity scoring table
- **Context:** Dataset tak punya label risk; butuh target dari domain knowledge.
- **Decision:** Map `(primary_type, description) → skor 0–100` lewat tabel severity.
- **Rationale:** Transparan, dapat diaudit, tak butuh anotasi manual.
- **Consequences:** Kualitas target bergantung coverage tabel → gate coverage ≥ 0.90.
- **Status:** ✅ Dipertahankan.

### INH-3 — Temporal decay eksponensial
- **Context:** Kejahatan lama seharusnya berkontribusi lebih kecil.
- **Decision:** `w = exp(−λ_t × days_since_crime)`, `λ_t = 0.003`/hari.
- **Rationale:** Sederhana, monoton, satu hyperparameter. Lihat **M4** untuk perubahan acuan tanggal.
- **Consequences:** `λ_t=0.003` → half-life ≈ 231 hari; data ~2 tahun lampau berkontribusi <1%
  (lihat **M9** untuk pertimbangan re-tuning pada jendela 2021→kini + skema mingguan).
- **Status:** ✅ Dipertahankan (nilai bisa dire-justifikasi via config).

### INH-4 — Spatial grid: rounding lat/lng 2 desimal
- **Context:** Finpro sempat mempertimbangkan H3 hexbin; disederhanakan.
- **Decision:** Bulatkan lat/lng ke **2 desimal** (≈1 km) sebagai sel grid.
- **Rationale:** Cukup untuk model pohon pada dataset besar; jauh lebih sederhana dari H3.
- **Consequences:** Grid berupa pasangan Float — cocok dengan Prisma tanpa PostGIS (lihat **M7**).
- **Status:** ✅ Dipertahankan.

### INH-5 — Spatial smoothing grid-first (BallTree)
- **Context:** Kernel Gaussian per-titik = O(n²), tak skalabel.
- **Decision:** Agregasi ke grid dulu, lalu **BallTree** untuk kontribusi tetangga (O(n log n)).
- **Rationale:** Menjaga sinyal spasial tanpa biaya kuadratik.
- **Consequences:** Butuh gate sanity isolated-grid (#3) untuk memastikan smoothing benar.
- **Status:** ✅ Dipertahankan.

### INH-6 (finpro **D6**) — Baseline = grid-only mean
- **Context:** Baseline harus benar-benar lebih kasar dari target agar perbandingan adil.
- **Decision:** Baseline = mean risk per `grid_lat×grid_lng` **saja** (tanpa konteks waktu).
- **Rationale:** Menghindari mismatch granularity; model dinilai atas nilai tambah temporalnya.
- **Consequences:** Dipakai sebagai pembanding wajib di Hands-on 2.
- **Status:** ✅ Dipertahankan.

### INH-7 — Continual learning semi-manual (drift + registry)
- **Context:** Finpro menyederhanakan dari KS-test otomatis.
- **Decision:** Checkpoint retraining manual, deteksi drift via **mean-shift %** (threshold ~10%),
  registry model `.jsonl`.
- **Rationale:** Cukup untuk demo & mudah dijelaskan.
- **Consequences:** Relevan di Hands-on 2; skema cutoff baru (**M3**) menggantikan siklus 3-mingguan lama.
- **Status:** ✅ **Direalisasikan di Hands-on 2 (2026-07-17)** sebagai 4-cutoff walk-forward:
  checkpoint mingguan v1@C4→v4@C1, drift mean-shift % antar-checkpoint (M19), registry
  `.jsonl` (M21), quality gate strict (M20).

---

## B. New — adaptasi Matakota

### M1 — Kode STRSP hidup di `apps/ai/`
- **Decision:** Seluruh pipeline STRSP ditaruh di `apps/ai/` (FastAPI AI Service); serving menyusul di `app/main.py`.
- **Rationale:** Ini "wilayah AI" di monorepo; menyatukan pelatihan offline & serving.
- **Consequences:** Perubahan tahap ini tak menyentuh frontend/tRPC/Prisma.
- **Status:** ✅ Diputuskan.

### M2 — Jendela data 2021→terkini (bukan 2001→present)
- **Decision:** Fetch Chicago Crimes `2021-01-01` → max tanggal tersedia.
- **Rationale:** Fokus ke pola pasca-2021; cocok dengan skema rolling mingguan & mengurangi volume.
- **Consequences:** `latest` dinamis (ada reporting lag di hari terakhir).
- **Status:** ✅ Diputuskan.

### M3 — ★ Skema 4-model rolling cutoff ★
- **Decision:** Empat cutoff dari `latest`: `C1=latest`, `C2=−7h`, `C3=−14h`, `C4=−21h`.
  Tiap model dilatih pada data ≤ cutoff-nya.
- **Rationale:** Walk-forward mingguan → uji stabilitas & bahan cerita continual learning/drift.
- **Consequences:** Pipeline label/fitur **wajib cutoff-aware** (`build_dataset(reference_date)`).
  Model dilatih di Hands-on 2; Tahap 1 menyiapkan 4 dataset.
- **Status:** ✅ Diputuskan.

### M4 — Decay relatif ke `reference_date`, bukan `today`
- **Decision:** `days_since_crime = reference_date − crime_date`.
- **Rationale:** Agar tiap model rolling melihat "masa kini"-nya sendiri; menjaga konsistensi & anti-leakage.
- **Consequences:** Gate cutoff-awareness (#5) menguji ini.
- **Status:** ✅ Diputuskan.

### M5 — Geo-framing: model Chicago vs seed app Jakarta
- **Context:** STRSP dilatih pada Chicago; seed Matakota memakai Jakarta.
- **Decision:** **Pertahankan STRSP di Chicago** untuk sekarang; rekonsiliasi framing (mis. demo
  "kota percontohan Chicago" atau disclosure proxy) diputuskan di level produk, **bukan** di pipeline.
- **Rationale:** Data terbuka Chicago matang & real; mengganti ke Jakarta di luar scope hackathon.
- **Consequences:** Perlu narasi jujur saat judging; koordinasi dengan partner soal seed peta.
- **Status:** 🔶 Open — keputusan produk menyusul (lihat Open Questions).

### M6 — Storage parquet + `data/` gitignored
- **Decision:** Cache raw & processed ke parquet di `data/`; folder di-gitignore.
- **Rationale:** Cepat, hemat, reproducible; hindari commit data besar/sensitif.
- **Status:** ✅ Diputuskan.

### M7 — Grid sebagai Float (tanpa PostGIS)
- **Context:** Prisma repo memakai `Float` lat/lng, tanpa PostGIS.
- **Decision:** Representasikan grid sebagai `grid_lat`/`grid_lng` Float 2-desimal — tanpa tipe geometry.
- **Rationale:** Selaras skema existing; tak memaksa migrasi PostGIS.
- **Consequences:** Query spasial dilakukan di sisi pipeline (BallTree), bukan DB.
- **Status:** ✅ Diputuskan.

### M8 — Kontrak output = grid untuk `riskGrid`
- **Decision:** Output akhir = array `{grid_lat, grid_lng, risk_score, hour_bucket, day_type}`
  yang dikonsumsi tRPC `riskGrid` & dirender `beforeId "incident-heat"`.
- **Rationale:** Menyediakan titik colok yang jelas; Tahap 1 dirancang agar roll-up bersih ke bentuk ini.
- **Status:** ✅ Diputuskan (wiring dibangun di Final).

### M9 — `λ_t` warisan + catatan re-tuning
- **Context:** `λ_t=0.003` diwarisi finpro (jendela 2001→present).
- **Decision:** Pakai `0.003` sebagai default di `config.yaml`; **boleh** dinaikkan bila ingin
  menajamkan ke tren mingguan terbaru.
- **Rationale:** Konsistensi awal dengan finpro; ruang tuning tetap terbuka.
- **Consequences:** Perubahan nilai wajib dicatat sebagai entri baru di sini.
- **Status:** 🔶 Default ditetapkan; re-tuning opsional di Hands-on 2.

### M10 — Strategi fetch Socrata (Tahap 0)
- **Context:** Fetch harus idempoten, resumable, dan deterministik (SPEC §2).
- **Decision:** Dataset `ijzp-q8t2` (Crimes 2001–present); SoQL `$order=date,id` + `$offset`
  per halaman `page_size=50000`; tiap halaman dipersist `data/raw/pages/page_{offset}.parquet`
  + `manifest.json`; resume melewati halaman utuh; final = concat + dedup by `id` →
  `data/raw/crimes.parquet`. Token opsional (`SOCRATA_APP_TOKEN`), tanpa token tetap jalan (throttled).
- **Rationale:** Urutan stabil `(date,id)` membuat offset pagination reproducible; halaman
  ter-persist membuat re-run murah.
- **Status:** ✅ Diputuskan (disetujui user, 2026-07-17).

### M11 — Kebijakan baris unmapped: exclude
- **Context:** Sebagian kecil `primary_type` bisa di luar severity table.
- **Decision:** Baris tak ter-map **dibuang dari label** (`unmapped_policy: exclude`),
  bukan diberi skor default; coverage tetap diukur dan di-gate ≥ 0.90.
- **Rationale:** Skor default mencemari target diam-diam; exclude + gate membuat degradasi terlihat.
- **Status:** ✅ Diputuskan (disetujui user, 2026-07-17).

### M12 — Severity table hidup di config.yaml
- **Decision:** Tabel `(primary_type → skor dasar)` + `description_modifiers` (additive,
  clip [0,100]) didefinisikan di `config.yaml`, bukan hardcode modul.
- **Rationale:** Konsisten "single source of truth"; tabel = data ter-audit, bisa direview non-engineer.
- **Status:** ✅ Diputuskan (disetujui user, 2026-07-17).

### M13 — Formula bobot smoothing (melengkapi INH-5)
- **Context:** INH-5 menetapkan mekanisme BallTree grid-first tapi tidak rumus bobotnya.
- **Decision:** `w = exp(−λ_s · d_km)`, `λ_s = 1.0`/km, radius 2.0 km, self-weight 1 (d=0).
- **Rationale:** Bentuk sama dengan decay temporal (konsisten); λ_s=1 → tetangga 1 km ≈ 37%,
  2 km ≈ 14% — spillover lokal tanpa oversmoothing.
- **Consequences:** Gate #3 (isolated-grid) menguji implementasinya.
- **Status:** ✅ Diputuskan (disetujui user, 2026-07-17).

### M14 — Scaling target: p99-clipped min-max → 0–100
- **Context:** SPEC §3.5 meminta skala 0–100 tanpa menspesifikkan caranya; agregat sel
  ekstrem (CBD/Loop) akan menggepengkan sel lain bila pakai max mentah.
- **Decision:** Clip agregat kontribusi pada persentil-99, lalu min-max ke [0,100].
  Kebijakan yang sama dipakai untuk fitur `smoothed_grid_risk` agar seragam.
- **Nota:** Encoding `day_of_week` sin/cos **ditunda** (`encode_day_of_week: false`) —
  dow lebih halus dari kunci target `day_type`, sehingga tidak bisa 1:1 dengan baris fitur;
  dievaluasi lagi bila kunci target diperhalus di Hands-on 2.
- **Status:** ✅ Diputuskan (disetujui user, 2026-07-17).

### M15 — Relokasi dokumen + housekeeping repo
- **Decision:** `SPEC.md`/`DECISIONS.md`/`README_STRSP.md` pindah dari root ke `apps/ai/`
  (README_STRSP → README.md, menggantikan README FastAPI lama yang instruksinya dilebur).
  `.gitignore` root ditambah `apps/ai/data/`, `__pycache__/`, `.venv/`;
  `apps/web/.env.example` ditambah `SOCRATA_APP_TOKEN`. Extras `ml=[opencv-python]`
  (orphan scope CCTV) dihapus dari `pyproject.toml`.
- **Status:** ✅ Dieksekusi (disetujui user, 2026-07-17).

### M16 — Model: XGBoost Regressor + hyperparameter (HO2)
- **Decision:** XGBRegressor; `n_estimators=300, learning_rate=0.05, max_depth=6,
  min_child_weight=5, subsample=0.9, colsample_bytree=0.9, tree_method=hist, n_jobs=1`,
  `random_state` = seed global (42). Fitur: `grid_lat, grid_lng, smoothed_grid_risk,
  hour_sin, hour_cos, is_weekend`; target: `risk_score` (K1).
- **Rationale:** Warisan finpro (tree ensemble utk tabular spatio-temporal). Dataset kecil
  (~5,6k baris) → budget moderat + rem overfit (`min_child_weight`, subsample); `hist` +
  `n_jobs=1` menjamin determinisme bit-exact (gate #7).
- **Status:** ✅ Diputuskan (disetujui user, 2026-07-17).

### M17 — Protokol eval walk-forward "next-week" dengan fitur BEKU
- **Context:** Eval butuh definisi input prediksi yang eksplisit agar no-leakage terukur.
- **Decision:** v_k dilatih pada dataset@C_train dan dievaluasi dengan **fitur beku di
  C_train**: ŷ = v_k(features@C_train), MAE dihitung terhadap `risk_score`@C_next pada
  irisan kunci. Baseline diperlakukan identik.
- **Rationale:** Saat deployed di C_train model hanya punya fitur per tanggal itu; memakai
  features@C_next (mis. `smoothed_grid_risk` ter-update) = kebocoran halus.
- **Consequences:** Gate HO2 #2 membuktikan via spike sintetis minggu-berikutnya yang tidak
  boleh mengubah prediksi.
- **Status:** ✅ Diputuskan (disetujui user, 2026-07-17).

### M18 — Urutan checkpoint & semantik deployed
- **Decision:** `v1←C4, v2←C3, v3←C2, v4←C1` (kronologis; v1 data tersedikit). Pasangan eval:
  v1→target@C3, v2→target@C2, v3→target@C1. **v4 = production head**: belum ada minggu
  berikutnya yang lengkap → `model_mae/baseline_mae/improvement_pct = null` di registry,
  `deployed = true`. v1–v3 `deployed = not blocked` (lihat M20).
- **Status:** ✅ Diputuskan (disetujui user, 2026-07-17).

### M19 — Metrik drift: mean-shift %
- **Decision:** `drift_pct = |mean(target@C_next) − mean(target@C_prev)| / mean(target@C_prev)`
  antar-checkpoint berurutan (C4→C3→C2→C1); trigger bila > `drift_threshold` (0.10).
- **Rationale:** Sederhana & dapat dijelaskan (INH-7). Cutoff berjarak 7 hari dengan
  λ_t=0.003 → drift riil diperkirakan sangat kecil; itu temuan sah, BUKAN kegagalan
  detektor — validitas dibuktikan gate #3 dengan shift sintetis.
- **Status:** ✅ Diputuskan (disetujui user, 2026-07-17).

### M20 — Quality gate strict, toleransi 0.0
- **Decision:** Deret MAE eval v1→v3 wajib monoton non-naik dalam `regression_tolerance`
  (0.0). Checkpoint yang regres di-BLOKIR (`deployed=false`) dan dilaporkan; tidak ada
  pengecualian otomatis.
- **Consequences:** Regresi riil kecil pun memblokir — disengaja (strict ala finpro);
  relaksasi toleransi = keputusan user, bukan pipeline.
- **Status:** ✅ Diputuskan (disetujui user, 2026-07-17).

### M21 — Skema model registry .jsonl
- **Decision:** `data/registry/models.jsonl`, append-only, satu entri per checkpoint. Field
  wajib: `version, cutoff_date, train_rows, model_mae, baseline_mae, improvement_pct,
  drift_pct_vs_prev, drift_triggered, deployed, timestamp, seed` (null diizinkan hanya utk
  head produksi/checkpoint pertama sesuai M18/M19). Reproducibility = seluruh field metrik
  identik antar re-run; `timestamp` dikecualikan.
- **Status:** ✅ Diputuskan (disetujui user, 2026-07-17).

### M22 — Arsitektur serving: precompute batch vs realtime point (Final)
- **Decision:** `/risk-score/batch` disajikan dari **lookup table precomputed**
  (`strsp/serving/precompute.py` → parquet cache; endpoint hanya membaca) — heatmap tak butuh
  re-infer per request. `/risk-score/point` = inferensi live v4 satu titik. Model dimuat
  SEKALI saat startup dari registry (entri `deployed==true` terbaru). Endpoint placeholder
  `/health` & `/incidents/classify` TIDAK diubah — koeksis independen (dicatat di SPEC §13).
- **Rationale:** Warisan finpro; demo resilience — batch tak bergantung Socrata/training live.
- **Status:** ✅ Diputuskan (disetujui user, 2026-07-17).

### M23 — Validasi bounding box: single source via YAML anchor
- **Decision:** `serving.bbox_chicago` = alias anchor `&chicago_bbox` dari `data.bbox` —
  satu sumber nilai. `/point` di luar bbox → **422 dengan pesan eksplisit**, tidak pernah
  extrapolate diam-diam.
- **Status:** ✅ Diputuskan (disetujui user, 2026-07-17).

### M24 — Strategi cache & fallback
- **Decision:** Precompute menulis **atomic** (tmp → replace) sehingga kegagalan di tengah
  tidak merusak cache lama. Serving memuat cache ke memori saat startup; file
  hilang/korup setelahnya → terus melayani salinan in-memory terakhir; cache tak pernah ada →
  **503 terstruktur** (JSON berisi instruksi menjalankan precompute), bukan crash/500 kosong.
- **Status:** ✅ Diputuskan (disetujui user, 2026-07-17).

### M25 — Monitoring ringan + latency budget
- **Decision:** Middleware mencatat tiap request ke `data/logs/requests.jsonl`
  (`ts, path, method, status, latency_ms, model_version`) + agregator in-memory →
  `GET /metrics/summary` (count, p50/p95 per endpoint, error_rate, uptime). Budget:
  point ≤ 150 ms, batch ≤ 500 ms (diuji nyata di gate #5). Bukan Prometheus — skala 30 jam.
- **Status:** ✅ Diputuskan (disetujui user, 2026-07-17).

### M26 — Point inference: grid tanpa histori & clipping
- **Decision:** Grid valid (dalam bbox) tanpa histori kejahatan → `smoothed_grid_risk = 0.0`
  (tanpa kontribusi = tanpa sinyal; global mean akan menaikkan risk area kosong secara
  artifisial). Prediksi model di-clip ke [0,100] agar kontrak response terjaga.
- **Status:** ✅ Diputuskan (disetujui user, 2026-07-17).

### M27 — Interpretasi timestamp `/point`
- **Decision:** Timestamp naive ISO-8601 = **waktu lokal Chicago** (konsisten kolom `date`
  dataset); timestamp tz-aware dikonversi ke America/Chicago sebelum derive
  hour_bucket/day_type.
- **Status:** ✅ Diputuskan (disetujui user, 2026-07-17).

### M28 — Batch risk score 4 versi temporal (current / last_week / last_month / 6_months_ago)
- **Context:** Permintaan user (2026-07-17): cache batch tidak lagi tunggal, melainkan 4
  snapshot lanskap risiko — hingga sekarang, seminggu lalu, sebulan lalu, dan 6 bulan lalu —
  mis. untuk fitur perbandingan temporal di UI/demo ("area ini memburuk vs 6 bulan lalu").
- **Decision (rincian yang menunggu persetujuan):**
  1. **Definisi versi** (`serving.batch_versions` di config): `current` (T = latest),
     `last_week` (T = latest − 7 hari), `last_month` (T = latest − 30 hari),
     `6_months_ago` (T = latest − 182 hari). **Hari tetap** (30/182), bukan bulan kalender,
     demi determinisme.
  2. **Anchor "sekarang" = `latest`** (max tanggal data raw, kini 2026-07-08), BUKAN
     tanggal dinding — konsisten dengan seluruh pipeline cutoff (M3) dan sadar reporting
     lag ±9 hari.
  3. **Semua versi dihitung dengan MODEL PRODUKSI yang sama (v4)**; yang berbeda hanya
     `reference_date` dataset (fitur + decay diukur dari T, memakai `build_dataset(T)` —
     data ≤ T saja, anti-leakage tetap berlaku). Snapshot dibaca sebagai "lanskap risiko
     pada T menurut model terkini". Alternatif "model era-T" DITOLAK: hanya ada model
     mingguan v1–v3, tidak ada model −1/−6 bulan; mencampur model membuat perbandingan
     antar-versi tidak apples-to-apples.
  4. **Artefak:** `data/cache/risk_batch_{name}.parquet` + meta per versi
     (`risk_batch_meta_{name}.json`). Precompute keempatnya dalam satu run
     (`python -m strsp.serving.precompute`); tetap offline-first — butuh raw parquet
     lokal (sudah ada), TANPA Socrata/training live (demo resilience M24 utuh).
  5. **API backward-compatible:** `GET /risk-score/batch` mendapat query param opsional
     `version` (default `current` — kontrak lama tak berubah tanpa param); nilai asing →
     422. `/risk-score/point` tetap current-only. `/health` tambah field
     `cache_versions` (daftar versi + freshness); `cache_freshness` lama tetap = current.
  6. **Gate baru (Final #9):** (a) keempat file versi ada & lolos kontrak RiskCell;
     (b) param `version` bekerja, versi asing 422; (c) precompute 4-versi deterministik;
     (d) sanity: `current` vs `6_months_ago` TIDAK identik (pergeseran decay 182 hari
     harus terlihat), `current` vs `last_week` boleh mirip (temuan drift kecil HO2 —
     dilaporkan apa adanya).
- **Consequences:** Waktu precompute ×4 (build_dataset per T; ~1–2 mnt total); payload
  per versi tetap ~5,6k sel; sel yang belum punya data pada T lama otomatis absen di
  versi tsb (jumlah baris antar versi boleh berbeda — itu sinyal, bukan bug).
- **Status:** ✅ Disetujui user & diimplementasikan (2026-07-17); gate Final #9 mengawal.

---

## C. Open questions

1. **M5 geo-framing:** demo pakai konteks Chicago apa adanya, atau disclosure "proxy" +
   koordinasi seed peta dengan partner? (Perlu diputuskan sebelum Final.)
2. **`hour_bucket`/`day_type`:** definisi final dikunci di `config.yaml` (default di SPEC §3).
3. **Reporting lag:** apakah C1=`latest` perlu digeser mundur beberapa hari agar minggu terakhir
   tidak terlalu tidak lengkap? (Dinilai saat melihat distribusi tanggal di Tahap 0.)