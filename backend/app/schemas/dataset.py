from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict


class SheetInfo(BaseModel):
    name: str
    row_count: int
    column_count: int
    columns: List[str]
    preview_rows: List[Dict[str, Any]]


class FileInspectResponse(BaseModel):
    filename: str
    file_type: str
    file_size_bytes: int
    file_size_formatted: str
    sheet_count: int
    sheet_names: List[str]
    sheets: List[SheetInfo]


class DatasetCreate(BaseModel):
    name: str
    project_id: Optional[str] = None
    selected_sheet: Optional[str] = None


class DatasetColumnResponse(BaseModel):
    id: str
    name: str
    original_name: str
    detected_type: str
    confidence: float
    is_nullable: bool
    null_count: int
    unique_count: int
    stats: Optional[Dict[str, Any]] = None
    position: int

    model_config = ConfigDict(from_attributes=True)


class DatasetVersionResponse(BaseModel):
    id: str
    version_number: int
    name: str
    description: Optional[str] = None
    row_count: int
    column_count: int
    health_score: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DatasetResponse(BaseModel):
    id: str
    user_id: str
    project_id: Optional[str] = None
    name: str
    original_filename: str
    file_type: str
    file_size_bytes: int
    current_version_id: Optional[str] = None
    row_count: int
    column_count: int
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    columns: Optional[List[DatasetColumnResponse]] = None
    versions: Optional[List[DatasetVersionResponse]] = None

    model_config = ConfigDict(from_attributes=True)


class DatasetListItem(BaseModel):
    id: str
    name: str
    original_filename: str
    file_type: str
    file_size_bytes: int
    row_count: int
    column_count: int
    status: str
    created_at: datetime
    health_score: Optional[float] = None
    anomaly_count: Optional[int] = 0
    missing_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class DatasetPreviewResponse(BaseModel):
    dataset_id: str
    version_id: str
    total_rows: int
    total_columns: int
    columns: List[DatasetColumnResponse]
    rows: List[Dict[str, Any]]
    problem_cells: List[Dict[str, Any]]  # [{row_index, column_name, issue_type, severity, message, suggested_value}]
    page: int
    page_size: int
    total_pages: int
