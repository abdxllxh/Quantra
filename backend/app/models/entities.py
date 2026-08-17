from datetime import datetime, timezone
import uuid
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    datasets = relationship("Dataset", back_populates="owner", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="projects")
    datasets = relationship("Dataset", back_populates="project", cascade="all, delete-orphan")


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)  # csv, xlsx, xls
    file_size_bytes = Column(Integer, nullable=False)
    current_version_id = Column(String(36), nullable=True)
    row_count = Column(Integer, default=0)
    column_count = Column(Integer, default=0)
    status = Column(String(50), default="ready")  # uploading, processing, ready, error
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="datasets")
    project = relationship("Project", back_populates="datasets")
    versions = relationship("DatasetVersion", back_populates="dataset", cascade="all, delete-orphan", foreign_keys="DatasetVersion.dataset_id")
    columns = relationship("DatasetColumn", back_populates="dataset", cascade="all, delete-orphan")
    issues = relationship("Issue", back_populates="dataset", cascade="all, delete-orphan")
    transformations = relationship("Transformation", back_populates="dataset", cascade="all, delete-orphan")
    dashboards = relationship("Dashboard", back_populates="dataset", cascade="all, delete-orphan")
    charts = relationship("Chart", back_populates="dataset", cascade="all, delete-orphan")


class DatasetVersion(Base):
    __tablename__ = "dataset_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    stored_filename = Column(String(255), nullable=False)
    row_count = Column(Integer, default=0)
    column_count = Column(Integer, default=0)
    profile_summary = Column(JSON, nullable=True)
    health_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    dataset = relationship("Dataset", back_populates="versions", foreign_keys=[dataset_id])


class DatasetColumn(Base):
    __tablename__ = "dataset_columns"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    detected_type = Column(String(50), nullable=False)
    confidence = Column(Float, default=1.0)
    is_nullable = Column(Boolean, default=True)
    null_count = Column(Integer, default=0)
    unique_count = Column(Integer, default=0)
    stats = Column(JSON, nullable=True)
    position = Column(Integer, default=0)

    dataset = relationship("Dataset", back_populates="columns")


class Issue(Base):
    __tablename__ = "issues"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False, index=True)
    version_id = Column(String(36), nullable=True)
    issue_type = Column(String(50), nullable=False)  # missing_value, duplicate, anomaly, invalid_type, invalid_value, category_inconsistency
    severity = Column(String(20), default="medium")  # low, medium, high, critical
    row_index = Column(Integer, nullable=True)
    column_name = Column(String(255), nullable=True)
    original_value = Column(Text, nullable=True)
    suggested_value = Column(Text, nullable=True)
    anomaly_score = Column(Float, nullable=True)
    message = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    status = Column(String(20), default="open")  # open, fixed, ignored, marked_valid
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    dataset = relationship("Dataset", back_populates="issues")


class Transformation(Base):
    __tablename__ = "transformations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False, index=True)
    from_version_id = Column(String(36), nullable=True)
    to_version_id = Column(String(36), nullable=True)
    operation_type = Column(String(100), nullable=False)  # fill_missing, drop_duplicates, standardize_category, rename_column, add_calculated_column, etc.
    parameters = Column(JSON, nullable=True)
    rows_affected = Column(Integer, default=0)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    dataset = relationship("Dataset", back_populates="transformations")


class Dashboard(Base):
    __tablename__ = "dashboards"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    layout = Column(JSON, nullable=True)  # Grid layout positions
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    dataset = relationship("Dataset", back_populates="dashboards")
    charts = relationship("Chart", back_populates="dashboard", cascade="all, delete-orphan")


class Chart(Base):
    __tablename__ = "charts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False, index=True)
    dashboard_id = Column(String(36), ForeignKey("dashboards.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    chart_type = Column(String(50), nullable=False)  # bar, line, area, scatter, pie, donut, histogram, boxplot, heatmap
    config = Column(JSON, nullable=False)  # {x_axis, y_axis, aggregation, group_by, filters, options}
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    dataset = relationship("Dataset", back_populates="charts")
    dashboard = relationship("Dashboard", back_populates="charts")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    dataset_id = Column(String(36), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="audit_logs")
