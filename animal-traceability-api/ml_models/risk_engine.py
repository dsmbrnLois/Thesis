import sys
import json
import math
import os
import joblib
import numpy as np

def main():
    try:
        # 1. Grab the data passed from Node.js
        safe_count = int(sys.argv[1])
        mild_count = int(sys.argv[2])
        dangerous_count = int(sys.argv[3])
        total_pop = int(sys.argv[4])
        total_logs = int(sys.argv[5])
        # mongo_uri = sys.argv[6] (No longer needed for inference, meaning zero DB lag!)

        total_diagnosed = safe_count + mild_count + dangerous_count
        if total_diagnosed == 0:
            print(json.dumps({"error": "No verified blockchain health records found."}))
            return

        # 2. Calculate the features (X)
        sR = safe_count / total_diagnosed
        mR = mild_count / total_diagnosed
        dR = dangerous_count / total_diagnosed
        pF = min(total_pop / 500, 2)
        lF = min((total_logs / total_diagnosed) / 3, 1.5)

        current_features = np.array([[sR, mR, dR, pF, lF]])

        # ---------------------------------------------------------
        # 3. INSTANT INFERENCE (ZERO DELAY ARCHITECTURE)
        # ---------------------------------------------------------
        # Look for the pre-trained model file in the same directory
        model_path = os.path.join(os.path.dirname(__file__), 'risk_model.pkl')

        if os.path.exists(model_path):
            # =========================================================
            # PHASE B: True Machine Learning (Load and Predict instantly)
            # =========================================================
            model = joblib.load(model_path)
            
            # predict_proba returns [[prob_safe, prob_dangerous]]. We want index [0][1]
            probability = model.predict_proba(current_features)[0][1]
            ml_active = True
            model_status = "Pre-Trained ML Model Active"
            
        else:
            # =========================================================
            # PHASE A: Heuristic Expert System (Cold Start Fallback)
            # =========================================================
            z = (dR * 5.0) + (mR * 2.0) + (sR * -3.5) + (pF * 0.8) - (lF * 0.9) - 0.5
            probability = 1 / (1 + math.exp(-z))
            ml_active = False
            model_status = "Heuristic Fallback Active (Awaiting Training)"

        # 4. Format the output
        score = round(probability * 100)
        
        level = "Low Risk"
        color = "text-emerald-500"
        description = "Your farm is currently in great shape. No immediate threats detected."
        advice = "Continue your regular monitoring and sanitation protocols."

        if score >= 70:
            level = "Critical Risk"
            color = "text-red-600"
            description = "High number of dangerous health reports detected. This could lead to a potential outbreak."
            advice = "Isolate affected animals immediately and contact your local veterinarian."
        elif score >= 35:
            level = "Moderate Risk"
            color = "text-amber-600"
            description = "Some batches are showing mild symptoms or irregular health patterns."
            advice = "Increase check-ups and ensure all medical logs are being updated daily."

        # Send data back to Node.js
        print(json.dumps({
            "score": score,
            "level": level,
            "color": color,
            "description": description,
            "advice": advice,
            "probability": probability,
            "ml_active": ml_active,
            "model_status": model_status
        }))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()