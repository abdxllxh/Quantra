import os
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import pandas as pd
import numpy as np
import httpx

from app.core.config import settings
from app.core.security import create_access_token
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.entities import (
    User,
    Dataset,
    DatasetVersion,
    DatasetColumn,
    Issue,
    Transformation,
    AuditLog,
)
from app.schemas.dataset import (
    DatasetResponse,
    DatasetListItem,
    DatasetPreviewResponse,
    FileInspectResponse,
)
from app.schemas.profiling import (
    DatasetProfileResponse,
    ExecutiveSummaryResponse,
)


def _to_json_safe(value: Any) -> Any:
    """Recursively convert Pandas/NumPy values returned by analytics services."""
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, np.ndarray):
        return [_to_json_safe(item) for item in value.tolist()]
    if isinstance(value, (pd.Timestamp, pd.Timedelta)):
        return str(value)
    if isinstance(value, dict):
        return {str(key): _to_json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_to_json_safe(item) for item in value]
    return value


def _clean_copilot_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Keep chat output plain-text for clients that do not render Markdown."""
    cleaned = dict(payload)
    if isinstance(cleaned.get("answer"), str):
        cleaned["answer"] = cleaned["answer"].replace("*", "").strip()
    if isinstance(cleaned.get("suggested_followups"), list):
        cleaned["suggested_followups"] = [
            item.replace("*", "").strip() if isinstance(item, str) else item
            for item in cleaned["suggested_followups"]
        ]
    return cleaned


from app.schemas.issues import (
    IssueResponse,
    IssueFilterParams,
    IssueUpdateStatus,
    BatchIssueUpdate,
    IssueStatsResponse,
)
from app.schemas.anomaly import (
    AnomalyResultsResponse,
    AnomalyDetectionConfig,
)
from app.schemas.cleaning import (
    ImputeRequest,
    BatchImputeRequest,
    DeduplicateRequest,
    StandardizeCategoryRequest,
    TextCleanRequest,
    CalculatedColumnRequest,
    ConditionalColumnRequest,
    ColumnRenameRequest,
    ColumnSplitRequest,
    ColumnMergeRequest,
    ColumnTypeConvertRequest,
    OutlierTreatmentRequest,
    DateExtractRequest,
    CleanOperationResponse,
)
from app.schemas.analytics import (
    GroupByRequest,
    PivotRequest,
    FilterCondition,
    SortCondition,
    CorrelationResponse,
    BusinessKPIsResponse,
)
from app.schemas.dashboard import AdaptiveDashboardResponse
from app.schemas.ai import (
    AskQuestionRequest,
    AskQuestionResponse,
    CopilotRequest,
    SuggestedQuestionsResponse,
    ChartRecommendation,
)
from app.services.ingestion.file_service import FileService
from app.services.profiling.schema_detector import SchemaDetector
from app.services.profiling.profiler import DataProfiler
from app.services.anomaly.anomaly_detector import AnomalyDetectorService
from app.services.cleaning.data_cleaner import DataCleanerService
from app.services.analytics.analytics_engine import AnalyticsEngine
from app.services.analytics.adaptive_dashboard import AdaptiveDashboardService
from app.services.visualization.chart_service import ChartService
from app.services.ai.ai_service import AIService
from app.services.exporting.excel_exporter import ExcelExporter

router = APIRouter()


def _get_user_dataset(db: Session, dataset_id: str, user_id: str) -> Dataset:
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == user_id).first()
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found or access denied")
    return dataset


def _load_current_df(db: Session, dataset: Dataset) -> tuple[pd.DataFrame, DatasetVersion]:
    version = db.query(DatasetVersion).filter(DatasetVersion.id == dataset.current_version_id).first()
    if not version:
        raise HTTPException(status_code=500, detail="Dataset has no active version")
    file_path = settings.DATASETS_PATH / version.stored_filename
    if not file_path.exists():
        raise HTTPException(status_code=500, detail=f"Data file {version.stored_filename} missing from disk")
    df = FileService.load_dataframe(file_path)
    return df, version


@router.post("/inspect", response_model=FileInspectResponse)
async def inspect_uploaded_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    content = await file.read()
    stored_name, f_type, size_bytes, target_path = FileService.save_upload_file(file.filename, content)
    inspect_res = FileService.inspect_file(Path(target_path), file.filename)
    return inspect_res


@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    sheet_name: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    content = await file.read()
    stored_name, f_type, size_bytes, target_path = FileService.save_upload_file(file.filename, content)

    # Load initial DataFrame
    df = FileService.load_dataframe(Path(target_path), sheet_name=sheet_name)
    
    # Clean initial column names
    clean_cols = [str(c).strip() if str(c).strip() else f"Column_{i+1}" for i, c in enumerate(df.columns)]
    df.columns = clean_cols

    dataset_name = name or (f"{Path(file.filename).stem} ({sheet_name})" if sheet_name else Path(file.filename).stem)
    
    dataset = Dataset(
        user_id=current_user.id,
        name=dataset_name,
        original_filename=file.filename,
        stored_filename=stored_name,
        file_type=f_type,
        file_size_bytes=size_bytes,
        row_count=len(df),
        column_count=len(df.columns),
        status="ready"
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    # Profile & Health
    profile = DataProfiler.profile_dataframe(df, dataset.id, "v1")

    # Create Initial Version (v1)
    version = DatasetVersion(
        dataset_id=dataset.id,
        version_number=1,
        name="Original Upload",
        description=f"Initial file upload of {file.filename}",
        stored_filename=stored_name,
        row_count=len(df),
        column_count=len(df.columns),
        profile_summary=profile.model_dump(),
        health_score=profile.health.overall_score
    )
    db.add(version)
    db.commit()
    db.refresh(version)

    dataset.current_version_id = version.id
    db.commit()

    # Save Column definitions
    for idx, col_prof in enumerate(profile.columns):
        col_entity = DatasetColumn(
            dataset_id=dataset.id,
            name=col_prof.name,
            original_name=col_prof.original_name,
            detected_type=col_prof.detected_type,
            confidence=col_prof.confidence,
            is_nullable=col_prof.is_nullable,
            null_count=col_prof.null_count,
            unique_count=col_prof.unique_count,
            stats=col_prof.stats,
            position=idx
        )
        db.add(col_entity)

    # Detect initial issues (Missing values & Duplicates)
    for col_prof in profile.columns:
        if col_prof.null_count > 0:
            issue = Issue(
                dataset_id=dataset.id,
                version_id=version.id,
                issue_type="missing_value",
                severity="high" if col_prof.null_percentage > 10 else "medium",
                column_name=col_prof.name,
                message=f"{col_prof.null_count} missing values in column '{col_prof.name}' ({col_prof.null_percentage}%)",
                explanation=f"Missing values in '{col_prof.name}' may bias downstream statistics and visualizations.",
                status="open"
            )
            db.add(issue)

    if profile.duplicate_rows_count > 0:
        db.add(Issue(
            dataset_id=dataset.id,
            version_id=version.id,
            issue_type="duplicate",
            severity="high" if profile.duplicate_percentage > 5 else "medium",
            message=f"{profile.duplicate_rows_count} exact duplicate rows found ({profile.duplicate_percentage}%)",
            explanation="Duplicate rows can cause double-counting in sums, totals, and business metrics.",
            status="open"
        ))

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        dataset_id=dataset.id,
        action="dataset_uploaded",
        details={"filename": file.filename, "rows": len(df), "columns": len(df.columns)}
    ))
    db.commit()
    db.refresh(dataset)

    return dataset


@router.get("/", response_model=List[DatasetListItem])
def list_datasets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    datasets = db.query(Dataset).filter(Dataset.user_id == current_user.id).order_by(Dataset.created_at.desc()).all()
    results = []
    for d in datasets:
        curr_version = db.query(DatasetVersion).filter(DatasetVersion.id == d.current_version_id).first()
        h_score = curr_version.health_score if curr_version else 85.0
        missing_cnt = curr_version.profile_summary.get("total_missing_cells", 0) if (curr_version and curr_version.profile_summary) else 0
        
        results.append(DatasetListItem(
            id=d.id,
            name=d.name,
            original_filename=d.original_filename,
            file_type=d.file_type,
            file_size_bytes=d.file_size_bytes,
            row_count=d.row_count,
            column_count=d.column_count,
            status=d.status,
            created_at=d.created_at,
            health_score=h_score,
            anomaly_count=0,
            missing_count=missing_cnt
        ))
    return results


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset_details(dataset_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    return dataset


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    db.delete(dataset)
    db.commit()
    return {"message": "Dataset deleted successfully"}


@router.get("/{dataset_id}/preview", response_model=DatasetPreviewResponse)
def get_dataset_preview(
    dataset_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=10, le=500),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, version = _load_current_df(db, dataset)

    # Search filter across dataset
    if search:
        s_str = search.strip().lower()
        mask = df.astype(str).apply(lambda row: row.str.lower().str.contains(s_str, na=False).any(), axis=1)
        df = df[mask]

    total_rows = len(df)
    total_pages = max(1, (total_rows + page_size - 1) // page_size)
    start_idx = (page - 1) * page_size
    end_idx = min(start_idx + page_size, total_rows)
    page_df = df.iloc[start_idx:end_idx].copy()

    # Problem cells highlighting (missing values & anomalies)
    problem_cells = []
    for r_idx, row in page_df.iterrows():
        for c_name in page_df.columns:
            val = row[c_name]
            if pd.isna(val) or str(val).strip().lower() in DataProfiler.MISSING_MARKERS:
                problem_cells.append({
                    "row_index": int(r_idx),
                    "column_name": str(c_name),
                    "issue_type": "missing_value",
                    "severity": "medium",
                    "message": f"Missing value in '{c_name}'",
                    "suggested_value": "Impute via Clean menu"
                })

    # Prepare rows with row_index attached
    records = []
    for r_idx, row in page_df.iterrows():
        r_dict = row.replace({np.nan: None}).to_dict()
        r_dict["_row_number"] = int(r_idx) + 1
        records.append(r_dict)

    cols = db.query(DatasetColumn).filter(DatasetColumn.dataset_id == dataset.id).order_by(DatasetColumn.position.asc()).all()

    return DatasetPreviewResponse(
        dataset_id=dataset.id,
        version_id=version.id,
        total_rows=total_rows,
        total_columns=len(df.columns),
        columns=cols,
        rows=records,
        problem_cells=problem_cells,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{dataset_id}/audit-logs")
def get_dataset_audit_logs(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    logs = db.query(AuditLog).filter(
        AuditLog.dataset_id == dataset.id,
        AuditLog.user_id == current_user.id,
    ).order_by(AuditLog.created_at.desc()).all()

    versions = db.query(DatasetVersion).filter(DatasetVersion.dataset_id == dataset.id).all()

    def version_for_log(log: AuditLog) -> str:
        if not versions:
            return "N/A"
        closest = min(versions, key=lambda item: abs((item.created_at - log.created_at).total_seconds()))
        return f"v{closest.version_number}"

    def action_label(action: str) -> str:
        labels = {
            "dataset_uploaded": "Dataset Ingestion & Schema Inference",
            "transform_impute_missing": "Missing Values Imputed",
            "transform_drop_duplicates": "Deduplication Executed",
            "transform_deduplicate": "Deduplication Executed",
            "transform_standardize_category": "Categories Standardized",
            "transform_clean_text": "Text Values Cleaned",
            "transform_add_calculated_column": "Calculated Column Added",
            "transform_add_conditional_column": "Conditional Column Added",
            "transform_rename_columns": "Columns Renamed",
            "transform_split_column": "Column Split",
            "transform_merge_columns": "Columns Merged",
            "transform_extract_date": "Date Feature Extracted",
            "version_restored": "Dataset Version Restored",
        }
        return labels.get(action, action.replace("transform_", "").replace("_", " ").title())

    events = []
    for log in logs:
        details = log.details or {}
        rows_affected = details.get("rows_affected")
        if log.action == "dataset_uploaded":
            description = f"Uploaded {details.get('filename', dataset.original_filename)} and inferred the dataset schema."
            impact = f"{int(details.get('rows', dataset.row_count)):,} records · {int(details.get('columns', dataset.column_count))} columns"
            status_label = "Completed"
        else:
            description = details.get("description") or action_label(log.action)
            impact = f"{int(rows_affected):,} rows affected" if rows_affected is not None else "Audit event recorded"
            status_label = "Applied"

        events.append({
            "id": log.id,
            "action": action_label(log.action),
            "action_code": log.action,
            "version": version_for_log(log),
            "description": description,
            "dataset_name": dataset.name,
            "timestamp": log.created_at.isoformat(),
            "user": current_user.full_name or current_user.email,
            "status": status_label,
            "impact": impact,
        })

    return {"dataset_id": dataset.id, "events": events, "total": len(events)}


@router.delete("/{dataset_id}/audit-logs/{log_id}")
def delete_dataset_audit_log(
    dataset_id: str,
    log_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    audit_log = db.query(AuditLog).filter(
        AuditLog.id == log_id,
        AuditLog.dataset_id == dataset.id,
        AuditLog.user_id == current_user.id,
    ).first()
    if not audit_log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audit history entry not found")
    db.delete(audit_log)
    db.commit()
    return {"message": "Audit history entry removed", "id": log_id}


@router.get("/{dataset_id}/profile", response_model=DatasetProfileResponse)
def get_dataset_profile(dataset_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    version = db.query(DatasetVersion).filter(DatasetVersion.id == dataset.current_version_id).first()
    if version and version.profile_summary:
        return version.profile_summary

    df, version = _load_current_df(db, dataset)
    profile = DataProfiler.profile_dataframe(df, dataset.id, version.id)
    if version:
        version.profile_summary = profile.model_dump()
        db.commit()
    return profile


@router.get("/{dataset_id}/summary", response_model=ExecutiveSummaryResponse)
def get_dataset_summary(dataset_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    version = db.query(DatasetVersion).filter(DatasetVersion.id == dataset.current_version_id).first()
    df, version = _load_current_df(db, dataset)
    if version and version.profile_summary:
        try:
            profile = DatasetProfileResponse(**version.profile_summary)
            return DataProfiler.generate_executive_summary(profile, dataset.name, df)
        except Exception:
            pass

    profile = DataProfiler.profile_dataframe(df, dataset.id, version.id)
    if version:
        version.profile_summary = profile.model_dump()
        db.commit()
    summary = DataProfiler.generate_executive_summary(profile, dataset.name, df)
    return summary


@router.get("/{dataset_id}/issues", response_model=List[IssueResponse])
def get_dataset_issues(
    dataset_id: str,
    status_filter: Optional[str] = Query(None),
    severity_filter: Optional[str] = Query(None),
    issue_type_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    query = db.query(Issue).filter(Issue.dataset_id == dataset.id)
    if status_filter:
        query = query.filter(Issue.status == status_filter)
    if severity_filter:
        query = query.filter(Issue.severity == severity_filter)
    if issue_type_filter:
        query = query.filter(Issue.issue_type == issue_type_filter)

    return query.order_by(Issue.created_at.desc()).all()


@router.patch("/{dataset_id}/issues/{issue_id}", response_model=IssueResponse)
def update_issue_status(
    dataset_id: str,
    issue_id: str,
    req: IssueUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    issue = db.query(Issue).filter(Issue.id == issue_id, Issue.dataset_id == dataset.id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    issue.status = req.status
    db.commit()
    db.refresh(issue)
    return issue


@router.post("/{dataset_id}/issues/batch-update")
def batch_update_issues(
    dataset_id: str,
    req: BatchIssueUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    db.query(Issue).filter(Issue.id.in_(req.issue_ids), Issue.dataset_id == dataset.id).update(
        {Issue.status: req.status}, synchronize_session=False
    )
    db.commit()
    return {"message": f"Updated {len(req.issue_ids)} issues to '{req.status}'"}


@router.get("/{dataset_id}/anomalies", response_model=AnomalyResultsResponse)
def get_dataset_anomalies(
    dataset_id: str,
    method: str = Query("auto"),
    threshold: float = Query(3.0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, _ = _load_current_df(db, dataset)
    config = AnomalyDetectionConfig(method=method, z_threshold=threshold)
    res = AnomalyDetectorService.analyze_dataset_anomalies(df, dataset_id, config)
    return res


# -------------------------------------------------------------
# Clean & Transformation Endpoints (Creates New Dataset Version)
# -------------------------------------------------------------
def _commit_new_version(
    db: Session,
    dataset: Dataset,
    new_df: pd.DataFrame,
    op_type: str,
    description: str,
    params: Dict[str, Any],
    rows_affected: int,
    user_id: str
) -> CleanOperationResponse:
    # Save transformed dataframe
    new_stored_name, _, _ = FileService.save_dataframe_to_version(new_df)
    
    # Get current version count
    v_count = db.query(DatasetVersion).filter(DatasetVersion.dataset_id == dataset.id).count()
    new_v_num = v_count + 1

    profile = DataProfiler.profile_dataframe(new_df, dataset.id, f"v{new_v_num}")

    new_version = DatasetVersion(
        dataset_id=dataset.id,
        version_number=new_v_num,
        name=f"Version {new_v_num}",
        description=description,
        stored_filename=new_stored_name,
        row_count=len(new_df),
        column_count=len(new_df.columns),
        profile_summary=profile.model_dump(),
        health_score=profile.health.overall_score
    )
    db.add(new_version)
    db.commit()
    db.refresh(new_version)

    # Record Transformation
    db.add(Transformation(
        dataset_id=dataset.id,
        from_version_id=dataset.current_version_id,
        to_version_id=new_version.id,
        operation_type=op_type,
        parameters=params,
        rows_affected=rows_affected,
        description=description
    ))

    # Update dataset
    dataset.current_version_id = new_version.id
    dataset.row_count = len(new_df)
    dataset.column_count = len(new_df.columns)
    
    # Update columns
    db.query(DatasetColumn).filter(DatasetColumn.dataset_id == dataset.id).delete()
    for idx, col_prof in enumerate(profile.columns):
        db.add(DatasetColumn(
            dataset_id=dataset.id,
            name=col_prof.name,
            original_name=col_prof.original_name,
            detected_type=col_prof.detected_type,
            confidence=col_prof.confidence,
            is_nullable=col_prof.is_nullable,
            null_count=col_prof.null_count,
            unique_count=col_prof.unique_count,
            stats=col_prof.stats,
            position=idx
        ))

    # Audit log
    db.add(AuditLog(
        user_id=user_id,
        dataset_id=dataset.id,
        action=f"transform_{op_type}",
        details={"description": description, "rows_affected": rows_affected}
    ))
    db.commit()

    preview_records = new_df.head(10).replace({np.nan: None}).to_dict(orient="records")

    return CleanOperationResponse(
        success=True,
        version_id=new_version.id,
        version_number=new_v_num,
        rows_affected=rows_affected,
        columns_affected=len(new_df.columns),
        message=description,
        preview_rows=preview_records
    )


@router.post("/{dataset_id}/clean/impute", response_model=CleanOperationResponse)
def clean_impute(dataset_id: str, req: ImputeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, _ = _load_current_df(db, dataset)
    new_df, affected, msg = DataCleanerService.impute_missing(df, req)
    return _commit_new_version(db, dataset, new_df, "impute_missing", msg, req.model_dump(), affected, current_user.id)


@router.post("/{dataset_id}/clean/batch-impute", response_model=CleanOperationResponse)
def clean_batch_impute(dataset_id: str, req: BatchImputeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, _ = _load_current_df(db, dataset)
    new_df, affected, msg = DataCleanerService.batch_impute(df, req)
    return _commit_new_version(db, dataset, new_df, "batch_impute", msg, req.model_dump(), affected, current_user.id)


@router.post("/{dataset_id}/clean/deduplicate", response_model=CleanOperationResponse)
def clean_deduplicate(dataset_id: str, req: DeduplicateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, _ = _load_current_df(db, dataset)
    new_df, affected, msg = DataCleanerService.deduplicate(df, req)
    return _commit_new_version(db, dataset, new_df, "deduplicate", msg, req.model_dump(), affected, current_user.id)


@router.post("/{dataset_id}/clean/standardize-categories", response_model=CleanOperationResponse)
def clean_standardize(dataset_id: str, req: StandardizeCategoryRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, _ = _load_current_df(db, dataset)
    new_df, affected, msg = DataCleanerService.standardize_categories(df, req)
    return _commit_new_version(db, dataset, new_df, "standardize_categories", msg, req.model_dump(), affected, current_user.id)


@router.post("/{dataset_id}/clean/text", response_model=CleanOperationResponse)
def clean_text(dataset_id: str, req: TextCleanRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, _ = _load_current_df(db, dataset)
    new_df, affected, msg = DataCleanerService.clean_text(df, req)
    return _commit_new_version(db, dataset, new_df, "clean_text", msg, req.model_dump(), affected, current_user.id)


@router.post("/{dataset_id}/clean/outliers", response_model=CleanOperationResponse)
def clean_outliers(dataset_id: str, req: OutlierTreatmentRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, _ = _load_current_df(db, dataset)
    new_df, affected, msg = DataCleanerService.treat_outliers(df, req)
    return _commit_new_version(db, dataset, new_df, "treat_outliers", msg, req.model_dump(), affected, current_user.id)


@router.post("/{dataset_id}/transform/calculated-column", response_model=CleanOperationResponse)
def add_calculated_column(dataset_id: str, req: CalculatedColumnRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, _ = _load_current_df(db, dataset)
    new_df, affected, msg = DataCleanerService.add_calculated_column(df, req)
    return _commit_new_version(db, dataset, new_df, "calculated_column", msg, req.model_dump(), affected, current_user.id)


@router.post("/{dataset_id}/transform/conditional-column", response_model=CleanOperationResponse)
def add_conditional_column(dataset_id: str, req: ConditionalColumnRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, _ = _load_current_df(db, dataset)
    new_df, affected, msg = DataCleanerService.add_conditional_column(df, req)
    return _commit_new_version(db, dataset, new_df, "conditional_column", msg, req.model_dump(), affected, current_user.id)


@router.post("/{dataset_id}/transform/rename-columns", response_model=CleanOperationResponse)
def rename_columns(dataset_id: str, req: ColumnRenameRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, _ = _load_current_df(db, dataset)
    new_df, affected, msg = DataCleanerService.rename_columns(df, req)
    return _commit_new_version(db, dataset, new_df, "rename_columns", msg, req.model_dump(), affected, current_user.id)


@router.post("/{dataset_id}/transform/split-column", response_model=CleanOperationResponse)
def split_column(dataset_id: str, req: ColumnSplitRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, _ = _load_current_df(db, dataset)
    new_df, affected, msg = DataCleanerService.split_column(df, req)
    return _commit_new_version(db, dataset, new_df, "split_column", msg, req.model_dump(), affected, current_user.id)


@router.post("/{dataset_id}/transform/merge-columns", response_model=CleanOperationResponse)
def merge_columns(dataset_id: str, req: ColumnMergeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, _ = _load_current_df(db, dataset)
    new_df, affected, msg = DataCleanerService.merge_columns(df, req)
    return _commit_new_version(db, dataset, new_df, "merge_columns", msg, req.model_dump(), affected, current_user.id)


@router.post("/{dataset_id}/transform/convert-types", response_model=CleanOperationResponse)
def convert_column_types(dataset_id: str, req: ColumnTypeConvertRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, _ = _load_current_df(db, dataset)
    new_df, affected, msg = DataCleanerService.convert_column_types(df, req)
    return _commit_new_version(db, dataset, new_df, "convert_types", msg, req.model_dump(), affected, current_user.id)


@router.post("/{dataset_id}/transform/extract-date", response_model=CleanOperationResponse)
def extract_date(dataset_id: str, req: DateExtractRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, _ = _load_current_df(db, dataset)
    new_df, affected, msg = DataCleanerService.extract_date_feature(df, req)
    return _commit_new_version(db, dataset, new_df, "extract_date", msg, req.model_dump(), affected, current_user.id)


# -------------------------------------------------------------
# Undo / Redo & Version Switching
# -------------------------------------------------------------
@router.post("/{dataset_id}/versions/{version_id}/restore", response_model=DatasetResponse)
def restore_version(dataset_id: str, version_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    version = db.query(DatasetVersion).filter(DatasetVersion.id == version_id, DatasetVersion.dataset_id == dataset.id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    dataset.current_version_id = version.id
    dataset.row_count = version.row_count
    dataset.column_count = version.column_count

    # Update columns to match restored version
    if version.profile_summary and "columns" in version.profile_summary:
        db.query(DatasetColumn).filter(DatasetColumn.dataset_id == dataset.id).delete()
        for idx, col_prof in enumerate(version.profile_summary["columns"]):
            db.add(DatasetColumn(
                dataset_id=dataset.id,
                name=col_prof.get("name", f"Col_{idx}"),
                original_name=col_prof.get("original_name", col_prof.get("name")),
                detected_type=col_prof.get("detected_type", "text"),
                confidence=col_prof.get("confidence", 1.0),
                is_nullable=col_prof.get("is_nullable", True),
                null_count=col_prof.get("null_count", 0),
                unique_count=col_prof.get("unique_count", 0),
                stats=col_prof.get("stats", {}),
                position=idx
            ))
    else:
        df, _ = _load_current_df(db, dataset)
        profile = DataProfiler.profile_dataframe(df, dataset.id, version.id)
        version.profile_summary = profile.model_dump()
        db.query(DatasetColumn).filter(DatasetColumn.dataset_id == dataset.id).delete()
        for idx, col_prof in enumerate(profile.columns):
            db.add(DatasetColumn(
                dataset_id=dataset.id,
                name=col_prof.name,
                original_name=col_prof.original_name,
                detected_type=col_prof.detected_type,
                confidence=col_prof.confidence,
                is_nullable=col_prof.is_nullable,
                null_count=col_prof.null_count,
                unique_count=col_prof.unique_count,
                stats=col_prof.stats,
                position=idx
            ))

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        dataset_id=dataset.id,
        action="version_restored",
        details={
            "description": f"Rolled back dataset to version v{version.version_number}",
            "version_number": version.version_number,
            "version_id": version.id,
            "rows": version.row_count,
            "columns": version.column_count
        }
    ))

    db.commit()
    db.refresh(dataset)
    return dataset


# -------------------------------------------------------------
# Analytics & Aggregations
# -------------------------------------------------------------
@router.post("/{dataset_id}/group")
def run_group_by(dataset_id: str, req: GroupByRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, _ = _load_current_df(db, dataset)
    return AnalyticsEngine.run_group_by(df, req)


@router.post("/{dataset_id}/pivot")
def run_pivot_table(dataset_id: str, req: PivotRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, _ = _load_current_df(db, dataset)
    return AnalyticsEngine.run_pivot_table(df, req)


@router.get("/{dataset_id}/correlations", response_model=CorrelationResponse)
def get_correlations(dataset_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, _ = _load_current_df(db, dataset)
    return AnalyticsEngine.calculate_correlations(df)


@router.get("/{dataset_id}/kpis", response_model=BusinessKPIsResponse)
def get_business_kpis(dataset_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, _ = _load_current_df(db, dataset)
    return AnalyticsEngine.generate_business_kpis(df)


@router.get("/{dataset_id}/customer-analytics")
def get_customer_analytics(dataset_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Build customer metrics deterministically from the complete active dataset version."""
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, version = _load_current_df(db, dataset)

    def find_column(aliases: list[str], numeric: bool = False) -> Optional[str]:
        normalized = {str(col).lower().replace(" ", "_").replace("-", "_"): str(col) for col in df.columns}
        candidates = []
        for alias in aliases:
            if alias in normalized:
                candidates.append(normalized[alias])
        for normalized_name, original in normalized.items():
            if any(alias in normalized_name for alias in aliases) and original not in candidates:
                candidates.append(original)
        for candidate in candidates:
            if not numeric or pd.to_numeric(df[candidate], errors="coerce").notna().mean() >= 0.6:
                return candidate
        return None

    customer_col = find_column(["customer_id", "client_id", "account_id", "customer_name", "client_name", "customer_email", "email", "customer", "client", "account"])
    revenue_col = find_column(["revenue", "sales", "amount", "total_amount", "order_value", "net_sales", "spend", "price", "value"], numeric=True)
    date_col = find_column(["order_date", "transaction_date", "purchase_date", "invoice_date", "date"])
    satisfaction_col = find_column(["satisfaction_score", "satisfaction", "csat", "rating", "nps"], numeric=True)
    segment_col = find_column(["customer_segment", "segment", "region", "market", "channel", "category"])
    if segment_col and df[segment_col].nunique(dropna=True) > 30:
        segment_col = None

    if not customer_col:
        return {"available": False, "dataset_id": dataset.id, "version_id": version.id, "message": "Customer analytics needs a customer identifier such as Customer ID, Customer Name, Account ID, or Email.", "detected_columns": {}}

    customer_values = df[customer_col].astype("string").str.strip()
    valid_mask = customer_values.notna() & (customer_values != "")
    working = pd.DataFrame({"customer": customer_values[valid_mask]})
    working["value"] = pd.to_numeric(df.loc[working.index, revenue_col], errors="coerce").fillna(0) if revenue_col else 1.0
    working["date"] = pd.to_datetime(df.loc[working.index, date_col], errors="coerce") if date_col else pd.NaT
    if segment_col:
        raw_segments = df.loc[working.index, segment_col].fillna("Unspecified").astype(str).str.strip()
        working["segment"] = raw_segments.map(lambda value: value.upper() if len(value) <= 3 else value.title())
    else:
        working["segment"] = "All customers"

    customer_summary = working.groupby("customer", dropna=False).agg(frequency=("customer", "size"), monetary=("value", "sum"), last_activity=("date", "max")).reset_index()
    unique_customers = int(len(customer_summary))
    repeat_customers = int((customer_summary["frequency"] > 1).sum())
    repeat_rate = round(repeat_customers / unique_customers * 100, 1) if unique_customers else 0.0
    total_value = float(working["value"].sum())
    average_customer_value = float(customer_summary["monetary"].mean()) if unique_customers else 0.0
    average_frequency = float(customer_summary["frequency"].mean()) if unique_customers else 0.0

    if date_col and working["date"].notna().any():
        customer_summary["recency"] = (working["date"].max() - customer_summary["last_activity"]).dt.days.fillna(0)
        recency_rank = customer_summary["recency"].rank(pct=True, ascending=False)
    else:
        customer_summary["recency"] = 0
        recency_rank = pd.Series(0.5, index=customer_summary.index)
    score = (recency_rank + customer_summary["frequency"].rank(pct=True) + customer_summary["monetary"].rank(pct=True)) / 3
    customer_summary["tier"] = np.select([score >= 0.75, score >= 0.5, score >= 0.25], ["Champions", "Loyal", "Developing"], default="Needs attention")
    tier_counts = customer_summary["tier"].value_counts()
    tier_order = ["Champions", "Loyal", "Developing", "Needs attention"]
    tiers = [{"name": tier, "customers": int(tier_counts.get(tier, 0)), "percentage": round(float(tier_counts.get(tier, 0)) / unique_customers * 100, 1) if unique_customers else 0} for tier in tier_order]

    customer_segment = working.groupby(["customer", "segment"], dropna=False)["value"].sum().reset_index()
    segments = customer_segment.groupby("segment", dropna=False).agg(customers=("customer", "nunique"), value=("value", "sum")).reset_index()
    segments["avg_value"] = segments["value"] / segments["customers"].replace(0, np.nan)
    segments = segments.sort_values("value", ascending=False).head(8)
    top_customers = customer_summary.sort_values(["monetary", "frequency"], ascending=False).head(8)

    average_satisfaction = None
    if satisfaction_col:
        satisfaction_values = pd.to_numeric(df[satisfaction_col], errors="coerce")
        if satisfaction_values.notna().any():
            average_satisfaction = round(float(satisfaction_values.mean()), 2)

    value_label = revenue_col or "Record volume"
    brief = [
        f"{dataset.name} contains {len(df):,} records representing {unique_customers:,} identifiable customers using {customer_col}.",
        f"Repeat customers account for {repeat_rate:.1f}% of the customer base, with an average of {average_frequency:.2f} records per customer.",
    ]
    if revenue_col:
        brief.append(f"Total {revenue_col} is {total_value:,.2f}; average value per customer is {average_customer_value:,.2f}.")
    if segment_col and not segments.empty:
        leader = segments.iloc[0]
        brief.append(f"{leader['segment']} leads {segment_col} with {float(leader['value']):,.2f} in {value_label} across {int(leader['customers']):,} customers.")
    if average_satisfaction is not None:
        brief.append(f"Average {satisfaction_col} is {average_satisfaction:.2f} across valid responses.")

    return {
        "available": True,
        "dataset_id": dataset.id,
        "version_id": version.id,
        "detected_columns": {"customer": customer_col, "value": revenue_col, "date": date_col, "segment": segment_col, "satisfaction": satisfaction_col},
        "metrics": {"unique_customers": unique_customers, "repeat_customers": repeat_customers, "repeat_rate": repeat_rate, "total_value": round(total_value, 2), "average_customer_value": round(average_customer_value, 2), "average_frequency": round(average_frequency, 2), "average_satisfaction": average_satisfaction, "value_label": value_label},
        "brief": brief,
        "segments": [{"name": str(row.segment), "customers": int(row.customers), "value": round(float(row.value), 2), "average_value": round(float(row.avg_value) if pd.notna(row.avg_value) else 0, 2)} for row in segments.itertuples(index=False)],
        "tiers": tiers,
        "top_customers": [{"customer": str(row.customer), "frequency": int(row.frequency), "value": round(float(row.monetary), 2), "tier": str(row.tier)} for row in top_customers.itertuples(index=False)],
        "methodology": f"Computed from the complete active version ({len(df):,} rows). Customer={customer_col}; value={revenue_col or 'record count'}; date={date_col or 'not detected'}; segment={segment_col or 'all customers'}.",
    }


@router.get("/{dataset_id}/charts", response_model=List[ChartRecommendation])
def get_recommended_charts(dataset_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, _ = _load_current_df(db, dataset)
    return ChartService.recommend_charts_for_dataset(df)


@router.get("/{dataset_id}/adaptive-dashboard", response_model=AdaptiveDashboardResponse)
def get_adaptive_dashboard(dataset_id: str, response: Response, variant: int = Query(0, ge=0, le=99), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Generate dataset-specific dashboard facts and optional Gemini-edited titles."""
    response.headers["Cache-Control"] = "no-store, max-age=0"
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, version = _load_current_df(db, dataset)
    return AdaptiveDashboardService.build(df, dataset.id, version.id, dataset.name, variant=variant)


# -------------------------------------------------------------
# AI Conversational "Ask Your Data"
# -------------------------------------------------------------
@router.post("/{dataset_id}/ask", response_model=AskQuestionResponse)
def ask_question(dataset_id: str, req: AskQuestionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, _ = _load_current_df(db, dataset)
    result = AIService.answer_question(df, dataset.name, req)
    return _clean_copilot_payload(_to_json_safe(result.model_dump(mode="python")))


@router.post("/{dataset_id}/copilot")
async def ask_copilot(
    dataset_id: str,
    req: CopilotRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Proxy Copilot requests to n8n without exposing webhook credentials to the browser."""
    dataset = _get_user_dataset(db, dataset_id, current_user.id)

    def product_help_fallback() -> Optional[Dict[str, Any]]:
        """Route clear navigation questions without depending on an external model."""
        question = req.question.strip().lower()
        asks_navigation = any(
            phrase in question
            for phrase in ["where can", "where is", "how do i", "how can i", "which page", "which section", "navigate", "open the"]
        )
        if not asks_navigation:
            return None

        if any(keyword in question for keyword in ["clean", "remove", "fix", "treat", "trim", "impute", "dedup", "duplicate", "missing", "null", "whitespace", "column type"]):
            if "duplicate" in question:
                answer = "Open Smart Cleaning and choose Duplicates. Select the matching columns or use Select all, choose whether to keep the first or last occurrence, review the impact, then run Remove Duplicates. Quantura saves the result as a reversible version."
            elif any(keyword in question for keyword in ["missing", "null"]):
                answer = "Open Smart Cleaning and choose Missing values. Select the affected columns, choose the imputation strategy, review the preview, then apply the treatment as a reversible version."
            elif "whitespace" in question or "text" in question:
                answer = "Open Smart Cleaning and choose Text and whitespace. Select the text columns, choose Trim, review the preview, then apply the reversible cleaning operation."
            elif "outlier" in question:
                answer = "Open Smart Cleaning and choose Outliers. Select the numeric columns, choose the detection and treatment methods, review the affected records, then apply the reversible operation."
            elif "type" in question:
                answer = "Open Smart Cleaning and choose Types. Select the columns, choose the target data type, preview the conversion, then apply it as a reversible version."
            else:
                answer = "Open Smart Cleaning to prepare the dataset without editing raw files. Choose Duplicates, Missing values, Text and whitespace, Dates, Outliers, or Types, then configure and preview the operation before applying it as a reversible version."
            return {
                "success": True,
                "intent": "workspace_help",
                "answer": answer,
                "grounded_data": {},
                "recommended_chart": None,
                "proposed_transformation": None,
                "confidence_score": 0.99,
                "target_section": "smart-cleaning",
                "suggested_followups": [],
                "orchestration": "deterministic_product_guide",
            }

        guides = [
            (("upload", "import", "csv", "excel", "parquet"), "upload", "Open Upload Center or use Upload Dataset in the top navigation. Select or drop the CSV, Excel, JSON, or Parquet file, review the detected sheets and columns, then confirm the import."),
            (("outlier", "anomal", "suspicious", "irregular"), "anomaly-detection", "Open Anomaly Detection under Analysis. Use the method and column controls to review flagged records, severity, expected ranges, and the downloadable anomaly report."),
            (("chart", "visual", "dashboard", "graph"), "visualizations", "Open Visualizations under Analysis. Choose a dashboard blueprint or add a visual, then select its chart type, measure, category, and axis fields."),
            (("clean", "missing", "duplicate", "whitespace"), "smart-cleaning", "Open Smart Cleaning under Data and ingestion. Select the relevant cleaning tab, choose the target columns, preview the impact, and confirm the versioned operation."),
            (("transform", "calculated column", "rename", "merge", "split"), "transformation", "Open Transformation under Data and ingestion. Choose the transformation, configure its source and output columns, preview the result, and apply it as a new dataset version."),
            (("profile", "quality", "schema", "column type"), "profiling", "Open Data Profiling under Data and ingestion to review inferred types, nulls, uniqueness, distributions, and the dataset health summary."),
            (("forecast", "prediction"), "forecasting", "Open Forecasting under Analysis. Select a date field, metric, time frequency, and forecast horizon, then generate the projection from the active dataset."),
            (("sql", "duckdb", "query"), "sql", "Open SQL and DuckDB under Query and export. Write or load a query, run it against the active dataset, and export the verified result."),
            (("report", "brief"), "reports", "Open Report Generator under Query and export. Select the report sections, generate the report, preview it, and download the required format."),
            (("export", "download"), "export", "Open Export Data under Query and export. Choose the current dataset version and export format, then download the generated file."),
            (("history", "version", "rollback", "undo"), "history", "Open Project History under System and audit to inspect versioned actions, restore a previous state, remove an entry, undo a removal, or export the audit trail."),
            (("customer", "rfm", "segment"), "customer-analytics", "Open Customer Analytics under Analysis to review dataset-derived customer segments, activity, value, and satisfaction patterns."),
            (("issue", "problem record"), "issue-center", "Open Issue Center under Analysis to review detected data-quality issues, filter them by status or severity, and update their resolution state."),
        ]
        for keywords, target, answer in guides:
            if any(keyword in question for keyword in keywords):
                return {
                    "success": True,
                    "intent": "workspace_help",
                    "answer": answer,
                    "grounded_data": {},
                    "recommended_chart": None,
                    "proposed_transformation": None,
                    "confidence_score": 0.98,
                    "target_section": target,
                    "suggested_followups": [],
                    "orchestration": "deterministic_product_guide",
                }
        return None

    def deterministic_fallback() -> Dict[str, Any]:
        """Keep Copilot available when the optional orchestration layer is unavailable."""
        product_help = product_help_fallback()
        if product_help:
            return product_help
        df, _ = _load_current_df(db, dataset)
        result = AIService.answer_question(
            df,
            dataset.name,
            AskQuestionRequest(
                question=req.question,
                privacy_mode=req.privacy_mode,
                context_mode=req.context_mode,
            ),
        )
        data = _to_json_safe(result.model_dump(mode="python"))
        return _clean_copilot_payload({
            "success": True,
            "intent": "dataset_question",
            "answer": data.get("answer"),
            "grounded_data": data.get("grounded_data") or {},
            "recommended_chart": data.get("recommended_chart"),
            "proposed_transformation": data.get("proposed_transformation"),
            "confidence_score": data.get("confidence_score", 0.95),
            "target_section": None,
            "suggested_followups": data.get("suggested_followups") or [],
            "orchestration": "deterministic_fallback",
        })

    if not settings.N8N_COPILOT_WEBHOOK_URL or not settings.N8N_WEBHOOK_SECRET:
        return deterministic_fallback()

    if req.context_mode not in {"general", "business", "data_quality", "anomaly"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Copilot context mode.")

    if req.question.strip().lower() in {
        "hello",
        "hi",
        "hey",
        "help",
        "who are you",
        "what can you do",
        "good morning",
        "good afternoon",
    }:
        return deterministic_fallback()

    bearer_token = create_access_token(current_user.id)
    payload = {
        "dataset_id": dataset_id,
        "question": req.question.strip(),
        "privacy_mode": req.privacy_mode,
        "context_mode": req.context_mode,
    }
    if not payload["question"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question is required.")

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            response = await client.post(
                settings.N8N_COPILOT_WEBHOOK_URL,
                json=payload,
                headers={
                    "X-Quantura-Webhook-Secret": settings.N8N_WEBHOOK_SECRET,
                    "Authorization": f"Bearer {bearer_token}",
                },
            )
    except httpx.RequestError as exc:
        return deterministic_fallback()

    try:
        response_payload = response.json()
    except ValueError as exc:
        return deterministic_fallback()

    if response.status_code >= 400:
        if response.status_code in {402, 429, 500, 502, 503, 504}:
            return deterministic_fallback()
        detail = response_payload.get("error") or response_payload.get("detail") or "Copilot request failed."
        raise HTTPException(status_code=response.status_code, detail=detail)

    return _clean_copilot_payload(response_payload)


@router.get("/{dataset_id}/suggested-questions", response_model=SuggestedQuestionsResponse)
def get_suggested_questions(dataset_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, _ = _load_current_df(db, dataset)
    return AIService.get_suggested_questions(df)


# -------------------------------------------------------------
# Export Multi-sheet Excel & CSV
# -------------------------------------------------------------
@router.get("/{dataset_id}/export/excel")
def export_excel(dataset_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, version = _load_current_df(db, dataset)
    profile = DataProfiler.profile_dataframe(df, dataset.id, version.id)
    anom_res = AnomalyDetectorService.analyze_dataset_anomalies(df, dataset.id)
    
    excel_path = ExcelExporter.generate_comprehensive_workbook(
        df_cleaned=df,
        profile=profile,
        anomalies_res=anom_res,
        dataset_name=dataset.name
    )
    return FileResponse(
        path=excel_path,
        filename=excel_path.name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@router.get("/{dataset_id}/export/csv")
def export_csv(dataset_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = _get_user_dataset(db, dataset_id, current_user.id)
    df, version = _load_current_df(db, dataset)
    
    csv_filename = f"Quantura_{dataset.name.replace(' ', '_')}.csv"
    csv_path = settings.EXPORTS_PATH / csv_filename
    df.to_csv(csv_path, index=False)

    return FileResponse(
        path=csv_path,
        filename=csv_filename,
        media_type="text/csv"
    )


# -------------------------------------------------------------
# Seed Realistic Demo Sales Dataset (1-Click Ready)
# -------------------------------------------------------------
@router.post("/seed-sample", response_model=DatasetResponse)
def seed_demo_sample(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Generate realistic 500-row global retail transactions with realistic anomalies & missing values
    np.random.seed(42)
    n_rows = 500

    dates = pd.date_range(start="2025-01-01", periods=n_rows, freq="6h")
    regions = ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "sydney", "SYDNEY", "US", "USA", "United States"]
    categories = ["Electronics", "Office Supplies", "Furniture", "Apparel", "Industrial"]
    products = ["ProBook X", "UltraDesk 2000", "SmartHub Hub", "ErgoChair Pro", "LaserJet Z", "MicroTab 12"]
    
    data = {
        "Transaction_ID": [f"TXN-{10000 + i}" for i in range(n_rows)],
        "Date": dates.strftime('%Y-%m-%d %H:%M'),
        "Customer_Name": [f"Client {np.random.randint(100, 999)}" for _ in range(n_rows)],
        "Customer_Email": [f"user_{i}@company.com" for i in range(n_rows)],
        "Region": np.random.choice(regions, size=n_rows, p=[0.35, 0.25, 0.15, 0.08, 0.07, 0.03, 0.02, 0.02, 0.02, 0.01]),
        "Category": np.random.choice(categories, size=n_rows),
        "Product": np.random.choice(products, size=n_rows),
        "Quantity": np.random.randint(1, 15, size=n_rows),
        "Unit_Price": np.random.choice([49.99, 129.50, 299.00, 899.00, 1499.00, 2450.00], size=n_rows),
        "Discount_Pct": np.random.choice([0.0, 0.05, 0.10, 0.15, 0.25], size=n_rows, p=[0.5, 0.2, 0.15, 0.1, 0.05]),
        "Revenue": np.zeros(n_rows),
        "Cost": np.zeros(n_rows),
        "Profit": np.zeros(n_rows),
        "Customer_Age": np.random.randint(22, 68, size=n_rows).astype(float),
        "Satisfaction_Score": np.random.choice([1, 2, 3, 4, 5], size=n_rows, p=[0.05, 0.1, 0.15, 0.4, 0.3]).astype(float)
    }

    df_sample = pd.DataFrame(data)
    
    # Calculate Revenue and Cost
    df_sample["Revenue"] = df_sample["Quantity"] * df_sample["Unit_Price"] * (1 - df_sample["Discount_Pct"])
    df_sample["Cost"] = df_sample["Revenue"] * np.random.uniform(0.55, 0.75, size=n_rows)
    df_sample["Profit"] = df_sample["Revenue"] - df_sample["Cost"]

    # Inject planted anomalies
    df_sample.loc[24, "Revenue"] = 125000.0  # Massive outlier
    df_sample.loc[24, "Profit"] = 92000.0
    df_sample.loc[88, "Revenue"] = 89500.0   # Outlier
    df_sample.loc[142, "Customer_Age"] = 145.0 # Impossible age anomaly
    df_sample.loc[205, "Discount_Pct"] = 0.95 # Extreme discount

    # Inject planted missing values
    df_sample.loc[[12, 45, 93, 118, 230], "Revenue"] = np.nan
    df_sample.loc[[5, 82, 190, 310], "Customer_Email"] = np.nan
    df_sample.loc[[50, 75, 120, 280, 410], "Satisfaction_Score"] = np.nan

    # Inject duplicate rows
    dup_slice = df_sample.iloc[50:54].copy()
    df_sample = pd.concat([df_sample, dup_slice], ignore_index=True)

    # Save to disk
    stored_name, f_path, size_bytes = FileService.save_dataframe_to_version(df_sample, ext=".csv")

    dataset = Dataset(
        user_id=current_user.id,
        name="Enterprise Sales & Transaction Audit",
        original_filename="global_sales_2026.csv",
        stored_filename=stored_name,
        file_type="csv",
        file_size_bytes=size_bytes,
        row_count=len(df_sample),
        column_count=len(df_sample.columns),
        status="ready"
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    profile = DataProfiler.profile_dataframe(df_sample, dataset.id, "v1")

    version = DatasetVersion(
        dataset_id=dataset.id,
        version_number=1,
        name="Initial Sample Dataset",
        description="Demo retail dataset with planted anomalies, missing values, duplicates, and category variations",
        stored_filename=stored_name,
        row_count=len(df_sample),
        column_count=len(df_sample.columns),
        profile_summary=profile.model_dump(),
        health_score=profile.health.overall_score
    )
    db.add(version)
    db.commit()
    db.refresh(version)

    dataset.current_version_id = version.id
    db.commit()

    for idx, col_prof in enumerate(profile.columns):
        db.add(DatasetColumn(
            dataset_id=dataset.id,
            name=col_prof.name,
            original_name=col_prof.original_name,
            detected_type=col_prof.detected_type,
            confidence=col_prof.confidence,
            is_nullable=col_prof.is_nullable,
            null_count=col_prof.null_count,
            unique_count=col_prof.unique_count,
            stats=col_prof.stats,
            position=idx
        ))

    db.commit()
    db.refresh(dataset)
    return dataset
