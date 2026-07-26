'''
Stage 2 — Hybrid classifier inference.

Receives windowed feature data from detection.py and returns threat labels.

MODEL CHOICE — Stacking vs Voting:
  Only ONE model is active at inference time, controlled by MODEL_PATH.
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

import os
import joblib
import numpy as np
import warnings

warnings.filterwarnings("ignore")

# Swap filename here to switch between stacking and voting:

MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "ml",
    "models",
    "classification",
    "main",
    "model_hybrid_voting_v2.joblib",
)
# ── CLF feature order — must exactly match train_classifier.ipynb CLF_FEATURES ──
# First 12: shared IF features (same order as detection.py IF_FEATURES).
# Last  4:  CLF-only features (zero-variance in healthy windows, not used by IF).
CLF_FEATURES = [
    # ── Shared with IF ────────────────────────────────────────────────────────
    "response_time_ms",
    "request_size_bytes",
    "requests_per_minute_from_ip",
    "failed_login_attempts",
    "refresh_token_calls_per_min",
    "db_query_latency_ms",
    "cpu_usage_percent",            # hardcoded 0.0 — not in DB schema
    "status_family",
    "is_error",
    "endpoint_risk_score",
    "db_latency_spike",
    "auth_failure_ratio",
    # ── CLF-only ──────────────────────────────────────────────────────────────
    "db_connection_errors",         # COUNT(db_error == True) per window
    "is_server_error",              # any(status >= 500) per window
    "is_auth_endpoint",             # any('auth' in endpoint) per window
    "is_post_method",               # any(method == POST) per window
]

try:
    print("Loading classifier model...")
    _pkg     = joblib.load(MODEL_PATH)
    _model   = _pkg["model"]           # sklearn StackingClassifier or VotingClassifier
    _scaler  = _pkg["scaler"]          # StandardScaler — must be applied before predict()
    _le      = _pkg["label_encoder"]   # LabelEncoder: integer index -> class name string
    _classes = _pkg["class_names"]     # ["brute_force", "ddos", "refresh_abuse"]
    print(f"Classifier model loaded.  classes={_classes}\n")
except FileNotFoundError:
    raise RuntimeError(f"Classifier model not found at: {MODEL_PATH}") from None


def _build_clf_features(feature_dict: dict, ip_rows: list) -> np.ndarray:
    """
    Build the 16-feature CLF vector in CLF_FEATURES order.

    The 12 IF features come directly from feature_dict (already computed by
    detection._build_window_features — no recomputation needed).

    The 4 CLF-only features are computed fresh from ip_rows here:
      db_connection_errors : COUNT(db_error == True)
      is_server_error      : any(status_code >= 500)
      is_auth_endpoint     : any('auth' in endpoint)
      is_post_method       : any(method == 'POST')

    Returns np.ndarray shape (1, 16).
    """
    clf_only = {
        "db_connection_errors": float(sum(
            1 for r in ip_rows if r.get("db_error")
        )),
        "is_server_error": float(any(
            (r.get("status_code") or 0) >= 500 for r in ip_rows
        )),
        "is_auth_endpoint": float(any(
            "auth" in (r.get("endpoint") or "") for r in ip_rows
        )),
        "is_post_method": float(any(
            (r.get("method") or "").upper() == "POST" for r in ip_rows
        )),
    }

    combined = {**feature_dict, **clf_only}
    vector   = np.array(
        [combined[f] for f in CLF_FEATURES], dtype=float
    ).reshape(1, -1)
    return vector


def infer(feature_dicts: list, ip_rows_list: list) -> list:
    """
    Classify a list of anomalous IP windows.

    Args:
        feature_dicts  : list of dicts from detection._build_window_features()
        ip_rows_list   : list of ip_rows lists, parallel to feature_dicts

    Returns:
        list of class name strings, one per window.
        e.g. ["brute_force", "refresh_abuse"]
    """
    results = []
    for feature_dict, ip_rows in zip(feature_dicts, ip_rows_list):
        X        = _build_clf_features(feature_dict, ip_rows)
        X_scaled = _scaler.transform(X)
        idx      = _model.predict(X_scaled)[0]
        label    = _le.classes_[idx]
        results.append(label)
    return results