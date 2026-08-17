from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict


class IssueResponse(BaseModel):
    id: str
    dataset_id: str
    version_id: Optional[str] = None
    issue_type: str  # missing_value, duplicate, anomaly, invalid_type, invalid_value, category_inconsistency
    severity: str  # low, medium, high, critical
    row_index: Optional[int] = None
    column_name: Optional[str] = None
    original_value: Optional[str] = None
    suggested_value: Optional[str] = None
    anomaly_score: Optional[float] = None
    message: str
    explanation: Optional[str] = None
    status: str  # open, fixed, ignored, marked_valid
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IssueFilterParams(BaseModel):
    issue_type: Optional[str] = None
    severity: Optional[str] = None
    column_name: Optional[str] = None
    status: Optional[str] = None
    search: Optional[str] = None
    page: int = 1
    page_size: int = 50


class IssueUpdateStatus(BaseModel):
    status: str  # open, fixed, ignored, marked_valid


class BatchIssueUpdate(BaseModel):
    issue_ids: List[str]
    status: str


class IssueStatsResponse(BaseModel):
    total_issues: int
    open_issues: int
    fixed_issues: int
    ignored_issues: int
    marked_valid_issues: int
    by_type: Dict[str, int]
    by_severity: Dict[str, int]
    by_column: Dict[str, int]
