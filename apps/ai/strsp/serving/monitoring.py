"""Final Tahap 5 — monitoring ringan (M25, gate #5 & #6).

Middleware mencatat TIAP request: satu baris JSONL
  {ts, path, method, status, latency_ms, model_version}
ke monitoring.log_path + agregator in-memory untuk GET /metrics/summary
(count, p50/p95 latency per endpoint, error_rate, uptime sejak startup).
"""

from __future__ import annotations

import json
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from strsp.config import AI_ROOT


class Monitor:
    """Logger request + agregator metrik in-memory (sejak startup)."""

    def __init__(self, config: dict, model_version: str) -> None:
        self._config = config
        self._model_version = model_version
        self._started = time.monotonic()
        self._latencies: dict[str, list[float]] = defaultdict(list)
        self._error_count = 0
        raw = Path(config["monitoring"]["log_path"])
        self._log_path = raw if raw.is_absolute() else AI_ROOT / raw
        self._log_path.parent.mkdir(parents=True, exist_ok=True)

    def record(self, path: str, method: str, status: int, latency_ms: float) -> None:
        """Append satu baris JSONL + update agregat in-memory."""
        entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "path": path,
            "method": method,
            "status": int(status),
            "latency_ms": round(float(latency_ms), 3),
            "model_version": self._model_version,
        }
        with open(self._log_path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry) + "\n")
        self._latencies[path].append(float(latency_ms))
        if status >= 500:
            self._error_count += 1

    def summary(self) -> dict:
        """{uptime_s, total_requests, error_count, error_rate, model_version,
        per_endpoint: {path: {count, p50_ms, p95_ms}}}"""
        total = sum(len(v) for v in self._latencies.values())
        return {
            "uptime_s": round(time.monotonic() - self._started, 1),
            "total_requests": total,
            "error_count": self._error_count,
            "error_rate": (self._error_count / total) if total else 0.0,
            "model_version": self._model_version,
            "per_endpoint": {
                path: {
                    "count": len(values),
                    "p50_ms": round(float(np.percentile(values, 50)), 2),
                    "p95_ms": round(float(np.percentile(values, 95)), 2),
                }
                for path, values in sorted(self._latencies.items())
            },
        }
