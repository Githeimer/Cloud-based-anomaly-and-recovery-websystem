import sys
import os
import joblib
import numpy as np
import warnings

warnings.filterwarnings("ignore") # ignore warnings from sklearn and joblib

MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "ml", "models", "classification",
    "model_hybrid_stacking.joblib"
) # path to the trained model file

FEATURES = [
    "response_time_ms", "db_query_time_ms", "db_error_int", "db_error_code_enc",
    "status_code", "status_family", "error_code_enc", "cpu_percent", "memory_mb",
    "request_size_bytes", "response_size_bytes", "is_authenticated_int",
] # list of features used for model inference


class StackHybrid:
    def predict(self, X): # define predict method for the StackHybrid class
        meta_input = np.hstack([b.predict_proba(X) for b in self.bases])
        return self.meta.predict(meta_input)


sys.modules["__main__"].StackHybrid = StackHybrid

try: # try to load the model and its components from the path
    print("Loading model...")
    _pkg       = joblib.load(MODEL_PATH)
    _model     = _pkg["model"]
    _le_error  = _pkg["le_error"]
    _le_db_err = _pkg["le_db_error"]
    _classes   = _pkg["class_names"]
    print("Model loaded.\n")
except FileNotFoundError:
    raise RuntimeError(f"Model file not found at: {MODEL_PATH}") from None


def _build_features(row): # function to build features from a database row 
    (_, _, _, _, _,
     _, _, status, error_code,
     resp_ms, req_bytes, resp_bytes,
     _, is_auth, db_ms,
     db_error, db_error_code, _) = row # unpack row into individual variables and ignore unused ones

    # encoders are trained with 'NONE' for null values
    error_enc = int(_le_error.transform([error_code or "NONE"])[0])

    db_error_enc = int(_le_db_err.transform([db_error_code or "NONE"])[0])

    values = [ # build a list of feature values for the model
        resp_ms or 0,           # response_time_ms
        db_ms or 0,             # db_query_time_ms
        int(bool(db_error)),    # db_error_int
        db_error_enc,           # db_error_code_enc
        status or 0,            # status_code
        (status // 100) if status else 0,  # status_family
        error_enc,              # error_code_enc
        0.0,                    # cpu_percent (not in DB, default 0)
        0,                      # memory_mb (not in DB, default 0)
        req_bytes or 0,         # request_size_bytes
        resp_bytes or 0,        # response_size_bytes
        int(bool(is_auth)),     # is_authenticated_int
    ]
    return np.array(values, dtype=float).reshape(1, -1)


def infer(rows): # inference function that calls model to predict and return labels for the given rows
    """Takes a list of DB rows, returns list of predicted label strings."""
    results = [] # list to store the predicted labels
    for row in rows:
        X     = _build_features(row)
        idx   = _model.predict(X)[0]
        label = _classes[idx]
        results.append(label)
    return results # return the list 


