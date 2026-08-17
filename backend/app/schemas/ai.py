from typing import List, Optional, Any, Dict
from pydantic import BaseModel


class ToolCallRecord(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None
    execution_time_ms: Optional[float] = None


class ChartRecommendation(BaseModel):
    chart_type: str  # bar, line, area, scatter, pie, donut, histogram
    title: str
    x_axis: str
    y_axis: Optional[str] = None
    group_by: Optional[str] = None
    aggregation: Optional[str] = "sum"
    data: List[Dict[str, Any]]
    explanation: str


class ProposedTransformation(BaseModel):
    action: str
    target_column: Optional[str] = None
    details: str
    preview_affected_rows: int
    operation_payload: Dict[str, Any]
    requires_confirmation: bool = True


class AskQuestionRequest(BaseModel):
    question: str
    privacy_mode: bool = False
    context_mode: str = "general"  # general, business, data_quality, anomaly


class CopilotRequest(BaseModel):
    question: str
    privacy_mode: bool = False
    context_mode: str = "general"


class AskQuestionResponse(BaseModel):
    answer: str
    grounded_data: Optional[Dict[str, Any]] = None
    tool_calls: List[ToolCallRecord] = []
    recommended_chart: Optional[ChartRecommendation] = None
    proposed_transformation: Optional[ProposedTransformation] = None
    confidence_score: float = 0.95
    evidence_summary: Optional[str] = None
    suggested_followups: List[str] = []


class SuggestedQuestionsResponse(BaseModel):
    suggested_questions: List[str]
    category_suggestions: Dict[str, List[str]]
