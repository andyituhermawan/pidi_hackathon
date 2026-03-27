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
import os # Tambahkan import ini di atas

# Ganti logika lama dengan ini:
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "best_model.pkl")

try:
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
except FileNotFoundError:
    model = None
    print(f"Model file '{MODEL_PATH}' tidak ditemukan!")

@app.get("/")
def home():
    return {"message": "API jalan"}


def build_df(data):
    return pd.DataFrame([{
        "qris_avg_transaksi_per_hari": data.get("transaksi", 0),
        "qris_avg_pendapatan_bulan": data.get("pendapatan", 0),
        "qris_tren_6bulan_pct": data.get("growth", 0),
        "qris_volatilitas_pct": data.get("volatilitas", 0),
        "jumlah_pinjaman_aktif": data.get("pinjaman", 0),
        "memiliki_nib": 1 if data.get("nib") == "Aktif" else 0,
        "ojol_bulan_aktif": data.get("ojol_bulan_aktif", 0),
        "memiliki_npwp": data.get("memiliki_npwp", 0),
        "aktif_marketplace": data.get("aktif_marketplace", 0),
        "slik_kolektibilitas": data.get("slik_kolektibilitas", 0),
        "memiliki_kendaraan_roda4": data.get("memiliki_kendaraan_roda4", 0),
        "marketplace_order_per_bulan": data.get("marketplace_order_per_bulan", 0),
        "avg_tagihan_listrik_bulan": data.get("avg_tagihan_listrik_bulan", 0),
        "memiliki_kendaraan_roda2": data.get("memiliki_kendaraan_roda2", 0),
        "saldo_rata_rata_bulan": data.get("saldo_rata_rata_bulan", 0),
        "memiliki_pirt": data.get("memiliki_pirt", 0),
        "pernah_kredit_macet": data.get("pernah_kredit_macet", 0),
        "aktif_ojol": data.get("aktif_ojol", 0),
        "ojol_avg_order_per_hari": data.get("ojol_avg_order_per_hari", 0),
        "marketplace_lama_bergabung_bulan": data.get("marketplace_lama_bergabung_bulan", 0),
        "marketplace_rating": data.get("marketplace_rating", 0),
        "konsistensi_bayar_listrik": data.get("konsistensi_bayar_listrik", 0),
        "lama_usaha_tahun": data.get("lama_usaha_tahun", 0),
        "jumlah_rekening_bank": data.get("jumlah_rekening_bank", 0),
        "sertifikasi_halal": data.get("sertifikasi_halal", 0),
        "ojol_rating": data.get("ojol_rating", 0),
        "konsistensi_bayar_air": data.get("konsistensi_bayar_air", 0),
        "kota": str(data.get("kota", "Jakarta")),
        "kategori_usaha": str(data.get("kategori_usaha", "Minuman")),
        "status_kepemilikan_rumah": str(data.get("status_kepemilikan_rumah", "milik_sendiri")),
    }])


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
