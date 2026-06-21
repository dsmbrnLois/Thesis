import numpy as np
import pandas as pd
import datetime
import os

def compute_features(safe_count, mild_count, dangerous_count, total_pop, total_logs):
    total_diagnosed = safe_count + mild_count + dangerous_count
    if total_diagnosed == 0:
        return [0.0, 0.0, 0.0, min(total_pop / 500.0, 2.0), 0.0]
    
    sR = safe_count / total_diagnosed
    mR = mild_count / total_diagnosed
    dR = dangerous_count / total_diagnosed
    pF = min(total_pop / 500.0, 2.0)
    lF = min((total_logs / total_diagnosed) / 3.0, 1.5)
    
    return [sR, mR, dR, pF, lF]

def generate_data():
    print("Generating synthetic data...")
    np.random.seed(42)
    
    num_farms = 200
    start_date = datetime.datetime(2023, 1, 1)
    
    all_snapshots = []
    
    for farm_id in range(num_farms):
        # 0 = noise/safe, 1 = outbreak
        is_outbreak = 1 if np.random.rand() < 0.3 else 0 
        
        # Base population
        total_pop = np.random.randint(50, 800)
        
        current_date = start_date
        safe_count = total_pop
        mild_count = 0
        dangerous_count = 0
        total_logs = 0
        
        # Generate 180 days of history
        daily_records = []
        outbreak_start_day = np.random.randint(60, 150) if is_outbreak else -1
        
        for day in range(180):
            current_date += datetime.timedelta(days=1)
            
            # Logs happen occasionally
            if np.random.rand() < 0.2:
                total_logs += 1
                
            # If noise farm, occasionally get mild cases that resolve
            if not is_outbreak and np.random.rand() < 0.05:
                affected = np.random.randint(1, max(2, int(total_pop * 0.1)))
                safe_count -= affected
                mild_count += affected
            
            # If outbreak farm, cases escalate after outbreak_start_day
            if is_outbreak and day >= outbreak_start_day:
                escalation_rate = (day - outbreak_start_day) / 30.0  # escalates over 30 days
                if np.random.rand() < escalation_rate:
                    affected_mild = np.random.randint(1, max(2, int(safe_count * 0.2)))
                    safe_count = max(0, safe_count - affected_mild)
                    mild_count += affected_mild
                    
                    affected_dang = np.random.randint(1, max(2, int(mild_count * 0.3)))
                    mild_count = max(0, mild_count - affected_dang)
                    dangerous_count += affected_dang
                    total_logs += 1
            
            # Healing mechanism for mild cases
            if mild_count > 0 and np.random.rand() < 0.1:
                healed = np.random.randint(1, mild_count + 1)
                mild_count -= healed
                safe_count += healed
                total_logs += 1

            features = compute_features(safe_count, mild_count, dangerous_count, total_pop, total_logs)
            daily_records.append({
                'farm_id': farm_id,
                'date': current_date,
                'day_idx': day,
                'sR': features[0],
                'mR': features[1],
                'dR': features[2],
                'pF': features[3],
                'lF': features[4],
                'is_outbreak_farm': is_outbreak,
                'outbreak_start_day': outbreak_start_day
            })
            
        # Add labels (outbreak within next 7 days)
        for i, record in enumerate(daily_records):
            label = 0
            if record['is_outbreak_farm']:
                # Label is 1 if current day is between outbreak_start_day - 7 and outbreak_start_day + 30
                if record['outbreak_start_day'] - 7 <= record['day_idx'] <= record['outbreak_start_day'] + 30:
                    label = 1
            record['label'] = label
            all_snapshots.append(record)

    df = pd.DataFrame(all_snapshots)
    
    # Save RF training data
    rf_cols = ['farm_id', 'date', 'sR', 'mR', 'dR', 'pF', 'lF', 'label']
    rf_df = df[rf_cols].copy()
    
    data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
    os.makedirs(data_dir, exist_ok=True)
    rf_path = os.path.join(data_dir, 'rf_training_data.csv')
    rf_df.to_csv(rf_path, index=False)
    
    # Build BiLSTM sequences (14-day rolling windows)
    # We will sample one sequence every 3 days per farm to reduce data size while maintaining variation
    sequences = []
    labels = []
    farm_ids = []
    
    for farm_id, group in df.groupby('farm_id'):
        group = group.sort_values('date').reset_index(drop=True)
        for i in range(13, len(group), 3):
            window = group.iloc[i-13:i+1]
            seq = window[['sR', 'mR', 'dR', 'pF', 'lF']].values
            sequences.append(seq)
            labels.append(window.iloc[-1]['label'])
            farm_ids.append(farm_id)
            
    sequences = np.array(sequences)
    labels = np.array(labels)
    farm_ids = np.array(farm_ids)
    
    bilstm_path = os.path.join(data_dir, 'bilstm_sequences.npz')
    np.savez(bilstm_path, sequences=sequences, labels=labels, farm_ids=farm_ids)
    
    print("--- Generation Summary ---")
    print(f"Total Farms: {num_farms}")
    print(f"RF Snapshots: {len(rf_df)} (Outbreak labels: {rf_df['label'].sum()})")
    print(f"BiLSTM Sequences: {len(sequences)} (Outbreak labels: {sum(labels)})")
    print(f"Saved to: {data_dir}")

if __name__ == '__main__':
    generate_data()
