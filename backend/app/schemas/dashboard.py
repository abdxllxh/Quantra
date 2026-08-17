from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class DashboardKPI(BaseModel):
    id: str
    label: str
    value: float
    formatted_value: str
    comparison_text: str
    trend: str = "neutral"
    source_column: Optional[str] = None
    sparkline: List[float] = []


class DashboardVisual(BaseModel):
    id: str
    title: str
    subtitle: str
    chart_type: str
    data: List[Dict[str, Any]]
    x_key: str
    y_keys: List[str]
    perspective_ids: List[str]
    size: str = "standard"
    value_format: str = "number"


class DashboardInsight(BaseModel):
    id: str
    title: str
    summary: str
    evidence: str
    impact: str
    direction: str
    perspective_id: str
    visual_ids: List[str]


class DashboardRecommendation(BaseModel):
    id: str
    title: str
    action: str
    rationale: str
    priority: str
    insight_ids: List[str]


class DashboardPerspective(BaseModel):
    id: str
    label: str
    description: str
    kpi_ids: List[str]
    visual_ids: List[str]
    insight_ids: List[str]


class AdaptiveDashboardResponse(BaseModel):
    dataset_id: str
    version_id: str
    domain: str
    domain_label: str
    title: str
    subtitle: str
    engine_mode: str
    generated_at: str
    dashboard_variant: int
    dashboard_mode: str
    kpis: List[DashboardKPI]
    visuals: List[DashboardVisual]
    insights: List[DashboardInsight]
    recommendations: List[DashboardRecommendation]
    perspectives: List[DashboardPerspective]
