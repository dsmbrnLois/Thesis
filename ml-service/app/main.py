from fastapi import FastAPI, HTTPException
import joblib
import torch
import numpy as np
import os
import sys

# Add the app directory to sys.path so models can be imported
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.schemas import PredictRequest, PredictResponse
from app.models.bilstm import BiLSTM

app = FastAPI(title="ML Risk Service")

# Global variables for models
rf_model = None
bilstm_model = None
features = ['sR', 'mR', 'dR', 'pF', 'lF']

@app.on_event("startup")
async def load_models():
    global rf_model, bilstm_model
    artifacts_dir = os.path.join(os.path.dirname(__file__), '..', 'artifacts')
    
    # Load RF Model
    rf_path = os.path.join(artifacts_dir, 'risk_model_rf.pkl')
    if os.path.exists(rf_path):
        rf_model = joblib.load(rf_path)
        print("Random Forest model loaded successfully.")
    else:
        print(f"Warning: RF model not found at {rf_path}")
        
    # Load BiLSTM Model
    bilstm_path = os.path.join(artifacts_dir, 'risk_model_bilstm.pt')
    if os.path.exists(bilstm_path):
        bilstm_model = BiLSTM(input_size=5, hidden_size=32, num_layers=1, dropout=0.2)
        bilstm_model.load_state_dict(torch.load(bilstm_path))
        bilstm_model.eval()
        print("BiLSTM model loaded successfully.")
    else:
        print(f"Warning: BiLSTM model not found at {bilstm_path}")

@app.get("/health")
async def health_check():
    if rf_model is None or bilstm_model is None:
        return {"status": "degraded", "rf_loaded": rf_model is not None, "bilstm_loaded": bilstm_model is not None}
    return {"status": "healthy", "rf_loaded": True, "bilstm_loaded": True}

@app.post("/predict", response_model=PredictResponse)
async def predict_risk(request: PredictRequest):
    if rf_model is None or bilstm_model is None:
        raise HTTPException(status_code=503, detail="Models are not fully loaded.")
        
    # 1. Random Forest Inference
    s = request.snapshot
    rf_input = np.array([[s.sR, s.mR, s.dR, s.pF, s.lF]])
    rf_prob = rf_model.predict_proba(rf_input)[0][1]
    rf_score = round(rf_prob * 100, 2)
    
    # Feature importances matching
    top_features = {feat: float(imp) for feat, imp in zip(features, rf_model.feature_importances_)}
    
    # 2. BiLSTM Inference
    if len(request.sequence) != 14:
        raise HTTPException(status_code=400, detail="Sequence must be exactly 14 days long.")
        
    seq_input = []
    for day in request.sequence:
        seq_input.append([day.sR, day.mR, day.dR, day.pF, day.lF])
        
    # Shape: (1, 14, 5)
    bilstm_tensor = torch.tensor([seq_input], dtype=torch.float32)
    with torch.no_grad():
        bilstm_logits = bilstm_model(bilstm_tensor)
        bilstm_prob = torch.sigmoid(bilstm_logits).item()
        bilstm_score = round(bilstm_prob * 100, 2)
        
    # 3. Combined Score
    combined_score = max(rf_score, bilstm_score)
    
    # Risk Level Banding
    risk_level = "Low"
    if combined_score > 70:
        risk_level = "Critical"
    elif combined_score >= 40:
        risk_level = "Moderate"
        
    return PredictResponse(
        rf_score=rf_score,
        rf_top_features=top_features,
        bilstm_score=bilstm_score,
        combined_score=combined_score,
        risk_level=risk_level
    )
