import numpy as np
import joblib
import os
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

def simulate_training():
    print("==================================================")
    print(" INITIATING OFFLINE ML TRAINING PIPELINE")
    print("==================================================")
    print("[1/5] Generating 200 Synthetic Farm Records in-memory...")
    
    np.random.seed(42)
    X_synthetic = []
    y_synthetic = []

    for _ in range(200):
        # Generate fake ratios
        ratios = np.random.dirichlet((5, 2, 1))
        sR, mR, dR = ratios
        pF = np.random.uniform(0.1, 2.0)
        lF = np.random.uniform(0.1, 1.5)
        
        # Ground Truth Logic
        is_outbreak = 1 if (dR > 0.20) or (dR > 0.10 and lF < 0.5) else 0
        
        X_synthetic.append([sR, mR, dR, pF, lF])
        y_synthetic.append(is_outbreak)

    X = np.array(X_synthetic)
    y = np.array(y_synthetic)

    print("[2/5] Splitting data into 80% Training and 20% Validation...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("[3/5] Training Logistic Regression Model...")
    model = LogisticRegression(class_weight='balanced')
    model.fit(X_train, y_train)

    print("[4/5] Running Validation & Performance Metrics...\n")
    y_pred = model.predict(X_test)
    
    print("---------------- MODEL PERFORMANCE ----------------")
    print(f"Accuracy Score:  {accuracy_score(y_test, y_pred) * 100:.2f}%")
    print("\nConfusion Matrix (Actual vs Predicted):")
    print(confusion_matrix(y_test, y_pred))
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["Safe (0)", "Outbreak (1)"]))
    print("---------------------------------------------------")

    print("\n---------------- WHAT THE MACHINE LEARNED ----------------")
    print("Intercept (Baseline Risk):", f"{model.intercept_[0]:.4f}")
    # Extract the learned weights
    weights = model.coef_[0]
    features = ["Safe Ratio", "Mild Ratio", "Dangerous Ratio", "Population Factor", "Logs Factor"]
    
    for feature, weight in zip(features, weights):
        print(f"{feature:<20} : {weight:+.4f}")
    print("----------------------------------------------------------")

    print("\n[5/5] Serializing and saving model to disk...")
    model_path = os.path.join(os.path.dirname(__file__), 'risk_model.pkl')
    joblib.dump(model, model_path)
    print(f"SUCCESS: Offline Model saved securely at {model_path}")
    print("==================================================")

if __name__ == "__main__":
    simulate_training()