'''
Classifier model loader — handles loading only, no inference logic.
'''

import os
import joblib
import warnings

warnings.filterwarnings("ignore")

MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "ml",
    "models",
    "new_model",
    "model_hybrid_voting_v2.joblib",
)

# ── CLF feature order — must exactly match train_classifier.ipynb CLF_FEATURES ──
# First 12: shared IF features (same order as detection_load.py IF_FEATURES).
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

_pkg = None
_model = None
_scaler = None
_le = None
_classes = None

def load_classifier_model():
    global _pkg, _model, _scaler, _le, _classes
    if _model is not None:
        return

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

def get_classifier_model():
    if _model is None:
        load_classifier_model()
    return _model

def get_classifier_scaler():
    if _model is None:
        load_classifier_model()
    return _scaler

def get_label_encoder():
    if _le is None:
        load_classifier_model()
    return _le

def get_class_names():
    if _classes is None:
        load_classifier_model()
    return _classes
