"""HO2 Gate #7 — reproducibility: seed tetap => training & metrik deterministik.
Train dua kali pada dataset riil C4, eval vs target C3 dua kali: prediksi identik
bit-exact dan MAE identik."""

import numpy as np
import pandas as pd

from strsp.features.dataset import LABEL_KEYS
from strsp.modeling.evaluate import predict_on_keys, walk_forward_mae
from strsp.modeling.train import train_model

from .conftest import call_or_skip


def test_training_and_metrics_are_deterministic(config, processed_ready):
    train_ds = pd.read_parquet(processed_ready / "dataset_C4.parquet")
    next_labels = pd.read_parquet(processed_ready / "dataset_C3.parquet")[
        LABEL_KEYS + ["risk_score"]
    ]

    model_a = call_or_skip(train_model, train_ds, config)
    model_b = call_or_skip(train_model, train_ds, config)

    pred_a = call_or_skip(predict_on_keys, model_a, train_ds, config)
    pred_b = call_or_skip(predict_on_keys, model_b, train_ds, config)
    assert np.array_equal(
        pred_a["prediction"].to_numpy(), pred_b["prediction"].to_numpy()
    ), "prediksi tidak bit-exact antar training dgn seed sama"

    mae_a = call_or_skip(walk_forward_mae, model_a, train_ds, next_labels, config)
    mae_b = call_or_skip(walk_forward_mae, model_b, train_ds, next_labels, config)
    assert mae_a == mae_b
