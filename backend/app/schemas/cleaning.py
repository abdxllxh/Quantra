from typing import List, Optional, Any, Dict
from pydantic import BaseModel


class ImputeRequest(BaseModel):
    column_name: str
    strategy: str  # mean, median, mode, forward_fill, backward_fill, constant, drop_rows
    constant_value: Optional[Any] = None


class BatchImputeRequest(BaseModel):
    column_names: Optional[List[str]] = None  # None = all columns with missing values
    strategy: str = "auto"  # auto, mean, median, mode, forward_fill, backward_fill, constant, drop_rows
    constant_value: Optional[Any] = None


class DeduplicateRequest(BaseModel):
    subset_columns: Optional[List[str]] = None
    keep: str = "first"  # first, last, drop_all


class StandardizeCategoryRequest(BaseModel):
    column_name: str
    mappings: Dict[str, str]  # {"USA": "United States", "U.S.A": "United States"}


class TextCleanRequest(BaseModel):
    column_name: str
    action: str  # trim, lowercase, uppercase, titlecase, remove_symbols, extract_numbers, extract_emails, find_replace
    find_str: Optional[str] = None
    replace_str: Optional[str] = None


class CalculatedColumnRequest(BaseModel):
    new_column_name: str
    expression: str  # e.g., "Revenue - Cost" or "Revenue * 0.1"


class ConditionalCondition(BaseModel):
    column: str
    operator: str  # equals, not_equals, greater_than, less_than, contains, is_empty
    value: Any


class ConditionalBranch(BaseModel):
    conditions: List[ConditionalCondition]
    logic: str = "AND"  # AND / OR
    result_value: Any


class ConditionalColumnRequest(BaseModel):
    new_column_name: str
    branches: List[ConditionalBranch]
    default_value: Any


class ColumnRenameRequest(BaseModel):
    mappings: Dict[str, str]  # {"old_col": "New Col"}


class ColumnSplitRequest(BaseModel):
    source_column: str
    delimiter: str = " "
    new_column_names: List[str]
    keep_original: bool = True


class ColumnMergeRequest(BaseModel):
    source_columns: List[str]
    new_column_name: str
    separator: str = " "
    keep_originals: bool = True


class ColumnTypeConvertRequest(BaseModel):
    column_names: List[str]
    target_type: str  # integer, decimal, currency, date, boolean, text


class OutlierTreatmentRequest(BaseModel):
    column_names: List[str]
    method: str = "iqr"  # iqr, zscore
    action: str = "cap"  # cap, remove


class DateExtractRequest(BaseModel):
    source_column: str
    extract_part: str  # year, month, day, quarter, day_of_week, days_since
    new_column_name: str


class CleanOperationResponse(BaseModel):
    success: bool
    version_id: str
    version_number: int
    rows_affected: int
    columns_affected: int
    message: str
    preview_rows: List[Dict[str, Any]]
