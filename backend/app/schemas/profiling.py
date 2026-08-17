from typing import List, Optional, Any, Dict
from pydantic import BaseModel


class NumericColumnStats(BaseModel):
    count: int
    missing_count: int
    missing_pct: float
    mean: Optional[float] = None
    std: Optional[float] = None
    min: Optional[float] = None
    q25: Optional[float] = None
    median: Optional[float] = None
    q75: Optional[float] = None
    max: Optional[float] = None
    variance: Optional[float] = None
    skewness: Optional[float] = None
    outlier_count: int = 0
    histogram: Optional[List[Dict[str, Any]]] = None


class CategoricalColumnStats(BaseModel):
    count: int
    missing_count: int
    missing_pct: float
    unique_count: int
    top_values: List[Dict[str, Any]]
    rare_categories: List[str] = []


class ColumnProfile(BaseModel):
    name: str
    original_name: str
    detected_type: str
    confidence: float
    is_nullable: bool
    null_count: int
    null_percentage: float
    unique_count: int
    unique_percentage: float
    memory_usage_bytes: int
    is_constant: bool
    is_high_cardinality: bool
    quality_score: float
    stats: Dict[str, Any]


class HealthScoreBreakdown(BaseModel):
    overall_score: float  # 0 - 100
    completeness_score: float  # 0 - 100
    consistency_score: float  # 0 - 100
    validity_score: float  # 0 - 100
    uniqueness_score: float  # 0 - 100
    anomaly_risk_score: float  # 0 - 100
    readiness_analytics: float  # 0 - 100
    readiness_ml: float  # 0 - 100
    readiness_reporting: float  # 0 - 100
    deductions: List[Dict[str, Any]]  # [{metric, deduction, reason, impact}]


class DatasetProfileResponse(BaseModel):
    dataset_id: str
    version_id: str
    total_rows: int
    total_columns: int
    total_cells: int
    total_missing_cells: int
    missing_percentage: float
    duplicate_rows_count: int
    duplicate_percentage: float
    memory_usage_bytes: int
    memory_usage_formatted: str
    numeric_columns_count: int
    categorical_columns_count: int
    date_columns_count: int
    boolean_columns_count: int
    columns: List[ColumnProfile]
    health: HealthScoreBreakdown


class ActionableRecommendation(BaseModel):
    id: str
    title: str
    description: str
    priority: str  # high, medium, low
    category: str  # missing, anomaly, duplicate, standardization
    affected_column: Optional[str] = None
    affected_rows_count: int
    action_type: str
    recommended_params: Dict[str, Any]


class ExecutiveSummaryResponse(BaseModel):
    dataset_name: str
    total_records: int
    total_columns: int
    health_score: float
    key_metrics: List[Dict[str, Any]]  # [{label, value, change, is_currency}]
    narrative_paragraphs: List[str]
    detected_anomalies_count: int
    missing_values_count: int
    duplicate_records_count: int
    recommendations: List[ActionableRecommendation]
