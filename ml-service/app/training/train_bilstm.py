import os
import json
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import accuracy_score, precision_score, recall_score
import sys

# Add app to path to import models
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from app.models.bilstm import BiLSTM

def train_bilstm():
    print("Training BiLSTM model...")
    data_path = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'bilstm_sequences.npz')
    data = np.load(data_path)
    
    sequences = data['sequences']
    labels = data['labels']
    farm_ids = data['farm_ids']
    
    # Group shuffle split
    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, val_idx = next(gss.split(sequences, groups=farm_ids))
    
    X_train, y_train = sequences[train_idx], labels[train_idx]
    X_val, y_val = sequences[val_idx], labels[val_idx]
    
    # Convert to tensors
    X_train_t = torch.tensor(X_train, dtype=torch.float32)
    y_train_t = torch.tensor(y_train, dtype=torch.float32).unsqueeze(1)
    
    X_val_t = torch.tensor(X_val, dtype=torch.float32)
    y_val_t = torch.tensor(y_val, dtype=torch.float32).unsqueeze(1)
    
    train_dataset = TensorDataset(X_train_t, y_train_t)
    val_dataset = TensorDataset(X_val_t, y_val_t)
    
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)
    
    # Initialize model
    model = BiLSTM(input_size=5, hidden_size=32, num_layers=1, dropout=0.2)
    
    criterion = nn.BCEWithLogitsLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    num_epochs = 20
    best_val_loss = float('inf')
    patience = 3
    patience_counter = 0
    
    artifacts_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'artifacts')
    os.makedirs(artifacts_dir, exist_ok=True)
    model_path = os.path.join(artifacts_dir, 'risk_model_bilstm.pt')
    
    for epoch in range(num_epochs):
        model.train()
        train_loss = 0
        for batch_X, batch_y in train_loader:
            optimizer.zero_grad()
            outputs = model(batch_X)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * batch_X.size(0)
            
        train_loss /= len(train_loader.dataset)
        
        model.eval()
        val_loss = 0
        all_preds = []
        all_targets = []
        
        with torch.no_grad():
            for batch_X, batch_y in val_loader:
                outputs = model(batch_X)
                loss = criterion(outputs, batch_y)
                val_loss += loss.item() * batch_X.size(0)
                
                probs = torch.sigmoid(outputs)
                preds = (probs > 0.5).float()
                all_preds.extend(preds.numpy())
                all_targets.extend(batch_y.numpy())
                
        val_loss /= len(val_loader.dataset)
        
        print(f"Epoch {epoch+1}/{num_epochs} - Train Loss: {train_loss:.4f} - Val Loss: {val_loss:.4f}")
        
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), model_path)
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print("Early stopping triggered")
                break
                
    # Load best model for evaluation
    model.load_state_dict(torch.load(model_path))
    model.eval()
    
    all_preds = []
    all_targets = []
    with torch.no_grad():
        for batch_X, batch_y in val_loader:
            outputs = model(batch_X)
            probs = torch.sigmoid(outputs)
            preds = (probs > 0.5).float()
            all_preds.extend(preds.numpy())
            all_targets.extend(batch_y.numpy())
            
    acc = accuracy_score(all_targets, all_preds)
    prec = precision_score(all_targets, all_preds, zero_division=0)
    rec = recall_score(all_targets, all_preds, zero_division=0)
    
    print(f"Validation Accuracy: {acc:.4f}")
    print(f"Validation Precision: {prec:.4f}")
    print(f"Validation Recall: {rec:.4f}")
    
    report = {
        "data_source": "synthetic",
        "model": "BiLSTM",
        "metrics": {
            "accuracy": float(acc),
            "precision": float(prec),
            "recall": float(rec)
        }
    }
    
    report_path = os.path.join(artifacts_dir, 'bilstm_eval_report.json')
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
        
    print(f"Model saved to {model_path}")
    print(f"Report saved to {report_path}")

if __name__ == '__main__':
    train_bilstm()
