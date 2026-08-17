from typing import List, Optional, Any, Dict
from pydantic import BaseModel


class AnomalyItem(BaseModel):
    row_index: int
    column_name: str
    actual_value: Any
    expected_range: str
    deviation_pct: Optional[float] = None
    anomaly_score: float  # 0 - 100
    severity: str  # low, medium, high, critical
    detection_method: str  # iqr, zscore, mod_zscore, isolation_forest, lof
    reason: str
    is_valid: bool = False


class AnomalyColumnSummary(BaseModel):
    column_name: str
    anomaly_count: int
    anomaly_percentage: float
    max_severity: str
    methods_used: List[str]
    typical_min: Optional[float] = None
    typical_max: Optional[float] = None


class AnomalyScatterPoint(BaseModel):
    row_index: int
    column_name: str
    value: float
    is_anomaly: bool
    score: float
    reason: Optional[str] = None
    severity: Optional[str] = None


class AnomalyResultsResponse(BaseModel):
    dataset_id: str
    total_anomalies: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    affected_columns_count: int
    affected_rows_count: int
    anomalies: List[AnomalyItem]
    column_summaries: List[AnomalyColumnSummary]
    scatter_points: Optional[List[AnomalyScatterPoint]] = []


class AnomalyDetectionConfig(BaseModel):
    method: str = "auto"  # auto, iqr, zscore, isolation_forest, lof
    contamination: float = 0.05
    z_threshold: float = 3.0
    columns: Optional[List[str]] = None
