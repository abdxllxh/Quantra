from typing import List, Optional, Any, Dict
from pydantic import BaseModel


class FilterCondition(BaseModel):
    column: str
    operator: str  # equals, not_equals, contains, not_contains, greater_than, less_than, greater_equal, less_equal, between, is_empty, is_not_empty
    value: Any
    value_to: Optional[Any] = None  # for 'between'


class FilterGroup(BaseModel):
    logic: str = "AND"  # AND / OR
    conditions: List[FilterCondition]


class SortCondition(BaseModel):
    column: str
    direction: str = "asc"  # asc / desc


class AggregationSpec(BaseModel):
    column: str
    function: str  # sum, mean, median, count, unique_count, min, max, std
    alias: Optional[str] = None


class GroupByRequest(BaseModel):
    group_columns: List[str]
    aggregations: List[AggregationSpec]
    filters: Optional[List[FilterCondition]] = None
    sort_by: Optional[str] = None
    sort_desc: bool = True
    limit: int = 100


class PivotRequest(BaseModel):
    row_columns: List[str]
    column_field: Optional[str] = None
    value_column: str
    aggregation: str = "sum"  # sum, mean, count, min, max
    filters: Optional[List[FilterCondition]] = None


class CorrelationPair(BaseModel):
    col1: str
    col2: str
    correlation: float
    relationship: str  # strong_positive, moderate_positive, weak, moderate_negative, strong_negative
    explanation: str


class CorrelationResponse(BaseModel):
    columns: List[str]
    matrix: Dict[str, Dict[str, float]]
    top_positive: List[CorrelationPair]
    top_negative: List[CorrelationPair]


class TrendItem(BaseModel):
    date_column: str
    value_column: str
    trend_direction: str  # upward, downward, flat, volatile
    growth_rate_pct: float
    spikes_count: int
    drops_count: int
    summary: str
    series: List[Dict[str, Any]]


class KPIItem(BaseModel):
    label: str
    value: Any
    formatted_value: str
    column_source: Optional[str] = None
    aggregation: str
    comparison_text: Optional[str] = None
    growth_pct: Optional[float] = None
    sparkline: Optional[List[float]] = None
    icon: Optional[str] = None


class BusinessKPIsResponse(BaseModel):
    kpis: List[KPIItem]
    top_insights: List[str]
