import pandas as pd

from app.services.analytics.adaptive_dashboard import AdaptiveDashboardService


def test_finance_dashboard_uses_computed_values(monkeypatch):
    monkeypatch.setattr("app.services.analytics.adaptive_dashboard.settings.GEMINI_API_KEY", "")
    frame = pd.DataFrame({
        "Report Date": pd.date_range("2025-01-31", periods=8, freq="ME"),
        "Revenue": [100, 120, 125, 150, 170, 190, 220, 250],
        "Profit": [20, 24, 21, 32, 38, 44, 52, 61],
        "Region": ["North", "South"] * 4,
    })

    result = AdaptiveDashboardService.build(frame, "dataset-1", "version-1", "Finance")

    assert result["domain"] == "finance"
    assert result["engine_mode"] == "deterministic"
    assert any(item["id"] == "time_momentum" for item in result["visuals"])
    momentum = next(item for item in result["insights"] if item["id"] == "insight_momentum")
    assert "Revenue" in momentum["summary"]
    assert "+150.0%" in momentum["evidence"]


def test_dashboard_changes_topic_and_patterns_for_marketing(monkeypatch):
    monkeypatch.setattr("app.services.analytics.adaptive_dashboard.settings.GEMINI_API_KEY", "")
    frame = pd.DataFrame({
        "Campaign": ["Search", "Social", "Email", "Search", "Social", "Email"],
        "Clicks": [100, 80, 40, 140, 95, 70],
        "Conversions": [12, 5, 9, 18, 7, 16],
        "Spend": [500, 620, 180, 650, 700, 220],
    })

    result = AdaptiveDashboardService.build(frame, "dataset-2", "version-1", "Campaign results")

    assert result["domain"] == "marketing"
    assert result["domain_label"] == "Marketing performance"
    assert all("revenue" not in item["title"].lower() for item in result["insights"])
    assert {item["id"] for item in result["perspectives"]} >= {"overview", "composition", "relationships", "risk"}


def test_rebuild_variants_use_different_columns_and_visuals(monkeypatch):
    monkeypatch.setattr("app.services.analytics.adaptive_dashboard.settings.GEMINI_API_KEY", "")
    frame = pd.DataFrame({
        "Order Date": pd.date_range("2025-01-01", periods=24, freq="ME"),
        "Revenue": [100 + index * 10 for index in range(24)],
        "Profit": [20 + index * 3 for index in range(24)],
        "Quantity": [index % 8 + 1 for index in range(24)],
        "Product Category": ["Technology", "Office", "Furniture"] * 8,
        "Region": ["North", "South", "West", "East"] * 6,
        "Channel": ["Online", "Retail"] * 12,
    })

    first = AdaptiveDashboardService.build(frame, "dataset-3", "version-1", "Orders", variant=0)
    second = AdaptiveDashboardService.build(frame, "dataset-3", "version-1", "Orders", variant=1)

    assert first["dashboard_variant"] == 0
    assert second["dashboard_variant"] == 1
    assert first["dashboard_mode"] != second["dashboard_mode"]
    assert [(item["title"], item["chart_type"]) for item in first["visuals"]] != [(item["title"], item["chart_type"]) for item in second["visuals"]]
    assert all("campaign" not in item["title"].lower() for item in second["visuals"])


def test_cleaned_dataset_version_recomputes_dashboard_values(monkeypatch):
    monkeypatch.setattr("app.services.analytics.adaptive_dashboard.settings.GEMINI_API_KEY", "")
    original = pd.DataFrame({
        "Order Date": pd.date_range("2025-01-31", periods=6, freq="ME"),
        "Revenue": [100, 200, 300, 400, 500, 5000],
        "Profit": [10, 20, 30, 40, 50, 500],
        "Region": ["North", "South", "North", "South", "North", "South"],
    })
    cleaned = original.loc[original["Revenue"] < 1000].copy()

    before = AdaptiveDashboardService.build(original, "dataset-4", "version-1", "Orders")
    after = AdaptiveDashboardService.build(cleaned, "dataset-4", "version-2", "Orders")

    before_revenue = next(item for item in before["kpis"] if item["source_column"] == "Revenue")
    after_revenue = next(item for item in after["kpis"] if item["source_column"] == "Revenue")

    assert before["version_id"] == "version-1"
    assert after["version_id"] == "version-2"
    assert before_revenue["value"] != after_revenue["value"]
    assert before["visuals"] != after["visuals"]
    assert before["insights"] != after["insights"]
