import pandas as pd
import os
import json
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import accuracy_score, precision_score, recall_score, classification_report

def train_rf():
    print("Training Random Forest model...")
    data_path = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'rf_training_data.csv')
    df = pd.read_csv(data_path)
    
    # Split by farm_id
    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, val_idx = next(gss.split(df, groups=df['farm_id']))
    
    train_df = df.iloc[train_idx]
    val_df = df.iloc[val_idx]
    
    features = ['sR', 'mR', 'dR', 'pF', 'lF']
    X_train = train_df[features].values
    y_train = train_df['label'].values
    
    X_val = val_df[features].values
    y_val = val_df['label'].values
    
    model = RandomForestClassifier(n_estimators=200, class_weight='balanced', random_state=42)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_val)
    
    acc = accuracy_score(y_val, y_pred)
    prec = precision_score(y_val, y_pred, zero_division=0)
    rec = recall_score(y_val, y_pred, zero_division=0)
    
    print(f"Validation Accuracy: {acc:.4f}")
    print(f"Validation Precision: {prec:.4f}")
    print(f"Validation Recall: {rec:.4f}")
    
    # Save model
    artifacts_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'artifacts')
    os.makedirs(artifacts_dir, exist_ok=True)
    
    model_path = os.path.join(artifacts_dir, 'risk_model_rf.pkl')
    joblib.dump(model, model_path)
    
    # Save eval report
    report = {
        "data_source": "synthetic",
        "model": "RandomForestClassifier",
        "metrics": {
            "accuracy": float(acc),
            "precision": float(prec),
            "recall": float(rec)
        },
        "feature_importances": {feat: float(imp) for feat, imp in zip(features, model.feature_importances_)}
    }
    
    report_path = os.path.join(artifacts_dir, 'rf_eval_report.json')
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
        
    print(f"Model saved to {model_path}")
    print(f"Report saved to {report_path}")

if __name__ == '__main__':
    train_rf()
