'''
Stage 2 — Hybrid classifier inference.

Receives windowed feature data from detection.py and returns threat labels.

MODEL CHOICE — Stacking vs Voting:
  Only ONE model is active at inference time, controlled by classification_load.MODEL_PATH.
  - model_hybrid_stacking.joblib  -> currently active (default)
  - model_hybrid_voting.joblib    -> swap MODEL_PATH to use this instead
  Both were trained in train_classifier.ipynb and saved to the same directory.
  Voting and stacking are NOT both used simultaneously.

INPUT CONTRACT:
  infer() receives:
    - feature_dicts : list of feature_dict from detection._build_window_features()
                      one dict per anomalous IP window (12 IF features already computed)
    - ip_rows_list  : list of raw DB row lists, one per IP window
                      used to compute the 4 CLF-only features

  This is the correct input shape — classifier was trained on 16 windowed/aggregated
  features (CLF_FEATURES), not on raw per-row DB values.

OUTPUT:
  list of class label strings, one per input window.
  e.g. ["brute_force", "ddos", "refresh_abuse"]
'''

import numpy as np
import classification_load

def _build_clf_features(feature_dict: dict, ip_rows: list) -> np.ndarray:
    """
    Extend IF's 12 features with 4 CLF-only features to form the 16-feature vector.
    Called per-window during inference.
    """
    # ── Shared IF features (already in feature_dict) ───────────────────────────
    shared = np.array(
        [feature_dict[f] for f in classification_load.CLF_FEATURES[:12]],
        dtype=float
    )

    # ── CLF-only features (computed from raw ip_rows) ──────────────────────────
    db_connection_errors = sum(1 for r in ip_rows if r.get("db_error"))
    is_server_error      = any(r.get("status_code", 0) >= 500 for r in ip_rows)
    is_auth_endpoint     = any("auth" in r.get("endpoint", "") for r in ip_rows)
    is_post_method       = any(r.get("method") == "POST" for r in ip_rows)

    clf_only = np.array(
        [db_connection_errors, is_server_error, is_auth_endpoint, is_post_method],
        dtype=float
    )

    # Concatenate: 12 IF features + 4 CLF-only features = 16 total
    return np.concatenate([shared, clf_only]).reshape(1, -1)


def infer(feature_dicts: list, ip_rows_list: list) -> list:
    """
    Classify one or more anomalous windows.

    Args:
        feature_dicts: list of feature dicts from detection._build_window_features()
        ip_rows_list:  list of raw row lists, one per window

    Returns:
        list of class label strings, one per input window
        e.g. ["brute_force", "refresh_abuse"]
    """
    _model   = classification_load.get_classifier_model()
    _scaler  = classification_load.get_classifier_scaler()
    _le      = classification_load.get_label_encoder()

    if not feature_dicts:
        return []

    # ── Build 16-feature matrix (one row per window) ────────────────────────────
    X = np.vstack([
        _build_clf_features(fd, ip_rows)
        for fd, ip_rows in zip(feature_dicts, ip_rows_list)
    ])

    # ── Scale before prediction ────────────────────────────────────────────────
    if _scaler is not None:
        X = _scaler.transform(X)

    # ── Predict class indices, decode to class names ────────────────────────────
    indices = _model.predict(X)
    labels  = _le.inverse_transform(indices)

    return list(labels)
