"""Spatial groundwater hotspot and pattern analysis."""

from pathlib import Path

import numpy as np
import rasterio


DATA_FILE = (
    Path(__file__).parent
    / "data"
    / "Kulfo_GW_Anomaly_UNet_30m_PROTOTYPE.tif"
)

# Reference conditions used in the spatial model
WET_REFERENCE = "April 2023 (wet season)"
DRY_REFERENCE = "January 2023 (dry season)"


def spatial_gw_hotspots():
    """
    Describe the spatial distribution of groundwater
    depletion and higher-storage hotspots.
    """

    with rasterio.open(DATA_FILE) as src:
        data = src.read(1).astype(float)

        if src.nodata is not None:
            data[data == src.nodata] = np.nan

    valid = data[~np.isnan(data)]

    very_high_depletion = np.sum(valid < -2)
    high_depletion = np.sum(
        (valid >= -2) & (valid < -1)
    )

    moderate = np.sum(
        (valid >= -1) & (valid <= 1)
    )

    high_recharge = np.sum(
        (valid > 1) & (valid <= 2)
    )

    very_high_recharge = np.sum(valid > 2)

    total = len(valid)

    results = {
        "Very High Depletion": {
            "pixels": int(very_high_depletion),
            "percentage": float(
                very_high_depletion / total * 100
            ),
        },
        "High Depletion": {
            "pixels": int(high_depletion),
            "percentage": float(
                high_depletion / total * 100
            ),
        },
        "Moderate / Near Reference": {
            "pixels": int(moderate),
            "percentage": float(
                moderate / total * 100
            ),
        },
        "High Recharge": {
            "pixels": int(high_recharge),
            "percentage": float(
                high_recharge / total * 100
            ),
        },
        "Very High Recharge": {
            "pixels": int(very_high_recharge),
            "percentage": float(
                very_high_recharge / total * 100
            ),
        },
        "Reference condition": {
            "Wet season": WET_REFERENCE,
            "Dry season": DRY_REFERENCE,
        },
    }

    results["Dominant spatial zone"] = max(
        results,
        key=lambda x: results[x]["pixels"]
        if isinstance(results[x], dict)
        and "pixels" in results[x]
        else -1,
    )

    return results


def spatial_gw_hotspot_interpret():
    """Return a spatial groundwater hotspot interpretation."""

    results = spatial_gw_hotspots()

    depletion = (
        results["Very High Depletion"]["pixels"]
        + results["High Depletion"]["pixels"]
    )

    higher_storage = (
        results["High Recharge"]["pixels"]
        + results["Very High Recharge"]["pixels"]
    )

    moderate = results[
        "Moderate / Near Reference"
    ]["pixels"]

    total = depletion + higher_storage + moderate

    depletion_pct = depletion / total * 100
    higher_storage_pct = higher_storage / total * 100
    moderate_pct = moderate / total * 100

    if depletion_pct > higher_storage_pct:
        dominant_pattern = (
            "Depletion is the dominant spatial groundwater pattern."
        )
    elif higher_storage_pct > depletion_pct:
        dominant_pattern = (
            "Higher groundwater-storage areas are the dominant "
            "spatial groundwater pattern."
        )
    else:
        dominant_pattern = (
            "Depletion and higher groundwater-storage areas are "
            "spatially balanced."
        )

    interpretation = (
        "Spatial groundwater hotspot interpretation\n"
        "---------------------------------------------\n"
        f"Reference wet-season condition: {WET_REFERENCE}\n"
        f"Reference dry-season condition: {DRY_REFERENCE}\n\n"
        f"Depletion zones: {depletion_pct:.1f}%\n"
        f"Moderate / near-reference zones: {moderate_pct:.1f}%\n"
        f"Higher groundwater-storage zones: "
        f"{higher_storage_pct:.1f}%\n\n"
        f"Dominant pattern: {dominant_pattern}\n\n"
        "Interpretation:\n"
        "Negative anomalies indicate lower predicted groundwater "
        "storage than the defined reference condition, while "
        "positive anomalies indicate higher predicted groundwater "
        "storage than the defined reference condition."
    )

    return interpretation
