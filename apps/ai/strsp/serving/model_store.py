"""Final Tahap 4 — pemuatan model produksi dari registry (M22, gate #2 & #7).

Model dimuat SEKALI saat startup: entri registry dengan deployed==true yang TERBARU
(baris terakhir; = v4 pasca Hands-on 2) → load data/models/{version}.json.
"""

from __future__ import annotations

from xgboost import XGBRegressor

from strsp.config import AI_ROOT
from strsp.continual.registry import read_registry


def load_deployed_model(config: dict) -> tuple[XGBRegressor, str]:
    """Muat model produksi dari registry.

    Returns:
        (model, version): XGBRegressor terlatih + string versi (mis. "v4").

    Raises:
        RuntimeError: registry kosong / tak ada entri deployed.
        FileNotFoundError: artefak model hilang.
    """
    entries = read_registry(config)
    deployed = [e for e in entries if e.get("deployed")]
    if not deployed:
        raise RuntimeError(
            "registry tidak punya entri deployed — jalankan "
            "`python -m strsp.continual.pipeline` (Hands-on 2) dulu"
        )
    version = deployed[-1]["version"]

    model_path = AI_ROOT / config["model"]["model_dir"] / f"{version}.json"
    if not model_path.exists():
        raise FileNotFoundError(f"artefak model hilang: {model_path}")

    model = XGBRegressor()
    model.load_model(model_path)
    return model, version
