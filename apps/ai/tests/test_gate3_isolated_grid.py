"""Gate #3 — sanity isolated-grid: grid tanpa tetangga => smoothed == kontribusi sendiri."""

import numpy as np
import pandas as pd

from strsp.features.smoothing import smooth_neighbors

from .conftest import call_or_skip


def test_isolated_grid_keeps_own_value(config):
    # dua grid berdekatan (~1.1 km) + satu grid terisolasi (>20 km dari lainnya)
    grid_df = pd.DataFrame(
        {
            "grid_lat": [41.80, 41.81, 41.99],
            "grid_lng": [-87.70, -87.70, -87.55],
            "value": [10.0, 20.0, 7.5],
        }
    )
    out = call_or_skip(smooth_neighbors, grid_df, config)
    out = out.set_index(["grid_lat", "grid_lng"])

    # grid terisolasi: tidak berubah
    assert np.isclose(out.loc[(41.99, -87.55), "smoothed"], 7.5), (
        "grid terisolasi berubah nilainya — smoothing salah"
    )
    # grid bertetangga: bertambah dari kontribusi tetangga (self + w*neighbor)
    assert out.loc[(41.80, -87.70), "smoothed"] > 10.0
    assert out.loc[(41.81, -87.70), "smoothed"] > 20.0
    # dan kontribusi tetangga < nilai tetangganya sendiri (bobot < 1)
    assert out.loc[(41.80, -87.70), "smoothed"] < 10.0 + 20.0
