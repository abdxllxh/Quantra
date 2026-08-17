import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.services.profiling.schema_detector import SchemaDetector
from app.services.profiling.profiler import DataProfiler
from app.services.anomaly.anomaly_detector import AnomalyDetectorService
from app.services.cleaning.data_cleaner import DataCleanerService
from app.services.analytics.analytics_engine import AnalyticsEngine
from app.schemas.cleaning import ImputeRequest, DeduplicateRequest, CalculatedColumnRequest
from app.schemas.analytics import GroupByRequest, AggregationSpec, FilterCondition

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_schema_detector():
    # Test Currency
    s_curr = pd.Series(["$100.50", "$250.00", "$1,450.00", "$89.90"])
    col_type, conf, is_sens = SchemaDetector.infer_column_type(s_curr, "Revenue")
    assert col_type == "currency"
    assert conf > 0.8

    # Test Email
    s_email = pd.Series(["alex@example.com", "sarah@techcorp.io", "john.doe@company.org"])
    col_type, conf, is_sens = SchemaDetector.infer_column_type(s_email, "User_Email")
    assert col_type == "email"
    assert is_sens is True


def test_profiling_and_health_score():
    df = pd.DataFrame({
        "ID": [1, 2, 3, 4, 5],
        "Revenue": [1000.0, np.nan, 3000.0, 4000.0, 5000.0],
        "Region": ["Sydney", "Melbourne", "Sydney", "Brisbane", "Perth"]
    })
    profile = DataProfiler.profile_dataframe(df, "test_ds", "v1")
    assert profile.total_rows == 5
    assert profile.total_columns == 3
    assert profile.total_missing_cells == 1
    assert 0 <= profile.health.overall_score <= 100


def test_anomaly_detection():
    # 20 normal values and 1 extreme outlier
    vals = [100.0 + i for i in range(20)] + [50000.0]
    df = pd.DataFrame({"Revenue": vals})
    anom_res = AnomalyDetectorService.analyze_dataset_anomalies(df, "test_ds")
    assert anom_res.total_anomalies >= 1
    # Check that row 20 is flagged
    assert any(a.row_index == 20 for a in anom_res.anomalies)


def test_data_cleaning_impute_and_dedup():
    df = pd.DataFrame({
        "Age": [20.0, 30.0, np.nan, 40.0],
        "City": ["NYC", "LA", "NYC", "LA"]
    })
    
    # Impute
    req = ImputeRequest(column_name="Age", strategy="median")
    cleaned_df, affected, msg = DataCleanerService.impute_missing(df, req)
    assert affected == 1
    assert cleaned_df["Age"].isna().sum() == 0
    assert cleaned_df.loc[2, "Age"] == 30.0

    # Calculated Column
    df_calc = pd.DataFrame({"Revenue": [100, 200], "Cost": [60, 110]})
    calc_req = CalculatedColumnRequest(new_column_name="Profit", expression="Revenue - Cost")
    res_df, _, _ = DataCleanerService.add_calculated_column(df_calc, calc_req)
    assert "Profit" in res_df.columns
    assert list(res_df["Profit"]) == [40, 90]


def test_analytics_group_by():
    df = pd.DataFrame({
        "Region": ["North", "North", "South", "South"],
        "Sales": [100, 200, 300, 400]
    })
    req = GroupByRequest(
        group_columns=["Region"],
        aggregations=[AggregationSpec(column="Sales", function="sum", alias="total_sales")],
        sort_by="total_sales",
        sort_desc=True
    )
    res = AnalyticsEngine.run_group_by(df, req)
    assert len(res["rows"]) == 2
    assert res["rows"][0]["Region"] == "South"
    assert res["rows"][0]["total_sales"] == 700


def test_seed_sample_endpoint():
    res = client.post("/api/datasets/seed-sample")
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Enterprise Sales & Transaction Audit"
    assert data["row_count"] == 504
