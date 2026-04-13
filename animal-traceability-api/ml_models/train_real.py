import sys
import os
import numpy as np
import joblib
from pymongo import MongoClient
from sklearn.linear_model import LogisticRegression

def train_real_model():
    try:
        print("Initiating automated retraining with live database...")
        
        # 1. Connect to MongoDB using the URI passed from Node.js
        mongo_uri = sys.argv[1]
        client = MongoClient(mongo_uri)
        db = client['traceability_db']
        collection = db['ML_Training_Data']

        # 2. Extract Data
        cursor = collection.find({})
        data = list(cursor)
        
        if len(data) < 50:
            print("Abort: Insufficient data. Minimum 50 records required.")
            return

        X_real = []
        y_real = []

        for doc in data:
            feats = doc['features']
            X_real.append([
                feats['safeRatio'],
                feats['mildRatio'],
                feats['dangerousRatio'],
                feats['populationFactor'],
                feats['logsFactor']
            ])
            y_real.append(doc['label'])

        X = np.array(X_real)
        y = np.array(y_real)

        # CRITICAL CHECK: scikit-learn crashes if it only sees one class (e.g., all 0s). 
        # We must ensure there is at least one 'Outbreak' and one 'Safe' record in the DB.
        if len(np.unique(y)) < 2:
            print("Abort: Dataset lacks diversity. Both Safe (0) and Outbreak (1) labels must exist to train.")
            return

        # 3. Train the Model on the full real dataset
        print(f"Training Logistic Regression on {len(X)} real-world records...")
        model = LogisticRegression(class_weight='balanced')
        model.fit(X, y)

        # 4. Save and Overwrite the active brain
        model_path = os.path.join(os.path.dirname(__file__), 'risk_model.pkl')
        joblib.dump(model, model_path)
        
        print(f"✅ SUCCESS: Adaptive Model retrained and deployed at {model_path}")

    except Exception as e:
        print(f"Failed to complete automated training: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        train_real_model()
    else:
        print("Error: Missing MongoDB URI argument.")