'''
Isolation Forest model loader — handles loading only, no detection logic.
'''

import os
import joblib

IF_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "ml", "models", "detection",
    "isolation_forest_model.joblib"
)

# ── Feature order — confirmed against trained IF model ────────────────────────
# Do NOT reorder without re-checking model.feature_names_in_.
IF_FEATURES = [
    "response_time_ms",
    "request_size_bytes",
    "requests_per_minute_from_ip",
    "failed_login_attempts",
    "refresh_token_calls_per_min",
    "db_query_latency_ms",
    "cpu_usage_percent",
    "status_family",
    "is_error",
    "endpoint_risk_score",
    "db_latency_spike",
    "auth_failure_ratio",
]

_if_model = None
_if_scaler = None

def load_detection_model():
    global _if_model, _if_scaler
    if _if_model is not None:
        return

    try:
        print("Loading Isolation Forest model...")
        _if_pkg = joblib.load(IF_MODEL_PATH)
        if isinstance(_if_pkg, dict):
            _if_model  = _if_pkg["model"]
            _if_scaler = _if_pkg.get("scaler")
        else:
            _if_model  = _if_pkg
            _if_scaler = None
        print("Isolation Forest model loaded.\n")
    except FileNotFoundError:
        raise RuntimeError(f"IF model not found at: {IF_MODEL_PATH}") from None

def get_if_model():
    if _if_model is None:
        load_detection_model()
    return _if_model

def get_if_scaler():
    if _if_model is None:
        load_detection_model()
    return _if_scaler
