from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import pickle
import shap

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# FIX: Gunakan path absolut agar file .pkl terbaca di Vercel
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "best_model.pkl")

try:
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
except FileNotFoundError:
    model = None
    print(f"ERROR: File {MODEL_PATH} tidak ditemukan!")

@app.get("/api/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}

@app.post("/predict")
def predict(data: dict):
    # Build dataframe dari input
    df = build_df(data)

    # Predict pakai pipeline langsung
    pred = model.predict(df)[0]
    proba = model.predict_proba(df)[0][1]

    # FIX #5: Lacak pesan error SHAP untuk dikembalikan ke frontend
    shap_list = []
    shap_error_msg = None

    try:
        # Pisah preprocessor dan classifier dari pipeline
        preprocessor = model[:-1]
        classifier = model[-1]

        # Transform input pakai preprocessor
        X_input = preprocessor.transform(df)

        # TreeExplainer langsung ke classifier
        explainer = shap.TreeExplainer(classifier)
        shap_values = explainer.shap_values(X_input)

        # Ambil SHAP untuk class 1
        if isinstance(shap_values, list):
            sv = shap_values[1][0]
        else:
            sv = shap_values[0]

        # Coba ambil feature names setelah transform
        try:
            feature_names = preprocessor.get_feature_names_out().tolist()
            # Rapikan nama (hapus prefix seperti "num__", "cat__")
            feature_names = [f.split("__")[-1] for f in feature_names]
        except Exception:
            feature_names = [f"feature_{i}" for i in range(len(sv))]

        shap_list = [
            {"feature": feature_names[i], "value": round(float(sv[i]), 4)}
            for i in range(len(sv))
        ]
        shap_list = sorted(shap_list, key=lambda x: abs(x["value"]), reverse=True)[:8]

    except Exception as e:
        shap_error_msg = f"SHAP error: {str(e)}"
        print(shap_error_msg)

        # Fallback: pakai feature importance
        try:
            classifier = model[-1]
            importances = classifier.feature_importances_
            feature_names = df.columns.tolist()
            shap_list = [
                {
                    "feature": feature_names[i] if i < len(feature_names) else f"feature_{i}",
                    "value": round(float(importances[i]), 4)
                }
                for i in range(min(len(importances), len(feature_names)))
            ]
            shap_list = sorted(shap_list, key=lambda x: abs(x["value"]), reverse=True)[:8]
            shap_error_msg += " (menggunakan fallback feature importance)"
        except Exception as e2:
            shap_error_msg += f" | Fallback error: {str(e2)}"
            print(f"Fallback error: {e2}")
            shap_list = []

    return {
        "prediction": int(pred),
        "probability": float(proba),
        "shap_values": shap_list,
        # FIX #5: Kembalikan info error SHAP ke frontend (None jika tidak ada error)
        "shap_error": shap_error_msg,
    }
