"""HO2 Gate #2 — no-leakage walk-forward (M17):
(a) dataset train di cutoff C identik dengan/tanpa data minggu-berikutnya (spike sintetis);
(b) prediksi model karenanya identik — data setelah cutoff mustahil memengaruhi training;
(c) API evaluasi tidak menerima fitur minggu-berikutnya (kebocoran mustahil by construction);
(d) urutan cutoff train < eval."""

import inspect

import numpy as np
import pandas as pd

from strsp.features.dataset import LABEL_KEYS, build_dataset
from strsp.modeling.evaluate import predict_on_keys, walk_forward_mae
from strsp.modeling.train import train_model

from .conftest import call_or_skip


def _merged(reference_date, config, raw):
    labels, features = call_or_skip(build_dataset, reference_date, config, raw)
    return labels.merge(features, on=LABEL_KEYS, validate="one_to_one")


def test_spike_after_cutoff_cannot_change_training_or_predictions(
    config, synth_two_cutoffs
):
    raw_clean, raw_spiked, cutoff_train, cutoff_next = synth_two_cutoffs
    assert cutoff_train < cutoff_next  # (d)

    ds_clean = _merged(cutoff_train, config, raw_clean)
    ds_spiked = _merged(cutoff_train, config, raw_spiked)
    pd.testing.assert_frame_equal(ds_clean, ds_spiked)  # (a)

    model_clean = call_or_skip(train_model, ds_clean, config)
    model_spiked = call_or_skip(train_model, ds_spiked, config)
    pred_clean = call_or_skip(predict_on_keys, model_clean, ds_clean, config)
    pred_spiked = call_or_skip(predict_on_keys, model_spiked, ds_spiked, config)
    assert np.array_equal(
        pred_clean["prediction"].to_numpy(), pred_spiked["prediction"].to_numpy()
    ), "spike setelah cutoff mengubah prediksi — leakage"  # (b)


def test_eval_api_cannot_receive_next_week_features():
    params = list(inspect.signature(walk_forward_mae).parameters)
    assert params == ["model", "train_ds", "next_labels", "config"], (
        "walk_forward_mae harus menerima HANYA label minggu berikutnya, bukan fiturnya"
    )  # (c)
