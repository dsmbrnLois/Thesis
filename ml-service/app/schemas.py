from pydantic import BaseModel
from typing import List

class Snapshot(BaseModel):
    sR: float
    mR: float
    dR: float
    pF: float
    lF: float

class PredictRequest(BaseModel):
    # The current snapshot of the farm
    snapshot: Snapshot
    # 14-day history of the farm, each day is a Snapshot
    sequence: List[Snapshot]

class PredictResponse(BaseModel):
    rf_score: float
    rf_top_features: dict
    bilstm_score: float
    combined_score: float
    risk_level: str
