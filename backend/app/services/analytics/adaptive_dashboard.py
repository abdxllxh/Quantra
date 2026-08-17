import json
import math
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
import numpy as np
import pandas as pd

from app.core.config import settings


DOMAIN_RULES = {
    "finance": ["revenue", "profit", "expense", "cost", "budget", "cash", "ebitda", "asset", "liability", "invoice", "margin"],
    "sales": ["sales", "order", "product", "customer", "quantity", "discount", "channel", "sku", "region"],
    "marketing": ["campaign", "impression", "click", "conversion", "spend", "ctr", "cpc", "lead"],
    "saas": ["mrr", "arr", "churn", "subscription", "plan", "tenant", "renewal"],
    "operations": ["inventory", "warehouse", "supplier", "stock", "shipment", "delivery", "lead_time", "defect"],
    "people": ["employee", "salary", "department", "hire", "attrition", "performance", "tenure"],
    "healthcare": ["patient", "diagnosis", "treatment", "clinical", "hospital", "bmi", "medical"],
}

DOMAIN_LABELS = {
    "finance": "Financial performance",
    "sales": "Sales and commercial performance",
    "marketing": "Marketing performance",
    "saas": "Subscription growth",
    "operations": "Operations and supply performance",
    "people": "People analytics",
    "healthcare": "Healthcare operations",
    "general": "Dataset performance",
}


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def _finite(value: Any, default: float = 0.0) -> float:
    try:
        parsed = float(value)
        return parsed if math.isfinite(parsed) else default
    except (TypeError, ValueError):
        return default


def _format_number(value: float, money: bool = False, percent: bool = False) -> str:
    prefix = "$" if money else ""
    suffix = "%" if percent else ""
    absolute = abs(value)
    if absolute >= 1_000_000_000:
        return f"{prefix}{value / 1_000_000_000:.2f}B{suffix}"
    if absolute >= 1_000_000:
        return f"{prefix}{value / 1_000_000:.2f}M{suffix}"
    if absolute >= 1_000:
        return f"{prefix}{value / 1_000:.1f}K{suffix}"
    return f"{prefix}{value:,.2f}{suffix}"


class AdaptiveDashboardService:
    """Builds dashboard facts with Pandas, then optionally lets Gemini improve labels only."""

    @classmethod
    def _top_performers_visual(cls, df: pd.DataFrame, categories: List[str], numeric: List[str], variant: int) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
        if not categories or not numeric:
            return None
        cat_col = categories[(variant + 1) % len(categories)]
        metric_col = numeric[(variant + 1) % len(numeric)]
        grouped = df.groupby(cat_col, dropna=False)[metric_col].sum().sort_values(ascending=False).head(6)
        if grouped.empty:
            return None
        data = [{cat_col: str(k), metric_col: round(_finite(v), 2)} for k, v in grouped.items()]
        visual_id = "top_performers"
        return ({
            "id": visual_id,
            "title": f"Top {metric_col} by {cat_col}",
            "subtitle": "Contribution breakdown of highest performing segments",
            "chart_type": "donut",
            "data": data,
            "x_key": cat_col,
            "y_keys": [metric_col],
            "perspective_ids": ["overview", "composition"],
            "size": "standard",
            "value_format": "number",
        }, {
            "id": "insight_top_performers",
            "title": f"{cat_col} Performance Concentration",
            "summary": f"The top {len(grouped)} {cat_col} segments generate the majority of total observed {metric_col}.",
            "evidence": f"Top segment: {str(grouped.index[0])} ({_format_number(float(grouped.iloc[0]))}).",
            "impact": "medium",
            "direction": "positive",
            "perspective_id": "composition",
            "visual_ids": [visual_id],
        })

    @classmethod
    def _secondary_breakdown_visual(cls, df: pd.DataFrame, categories: List[str], numeric: List[str], variant: int) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
        if len(numeric) < 2:
            return None
        met1 = numeric[variant % len(numeric)]
        met2 = numeric[(variant + 1) % len(numeric)]
        sorted_df = df[[met1, met2]].dropna().sort_values(by=met1, ascending=False).head(15)
        if len(sorted_df) < 4:
            return None
        data = [{met1: str(round(_finite(row[met1]), 1)), met2: round(_finite(row[met2]), 2)} for _, row in sorted_df.iterrows()]
        visual_id = "comparative_trend"
        return ({
            "id": visual_id,
            "title": f"{met1} vs {met2} Benchmark",
            "subtitle": "Comparative volume benchmark across leading records",
            "chart_type": "area" if variant % 2 == 0 else "line",
            "data": data,
            "x_key": met1,
            "y_keys": [met2],
            "perspective_ids": ["relationships", "overview"],
            "size": "standard",
            "value_format": "number",
        }, {
            "id": "insight_comparative",
            "title": f"{met1} to {met2} Scaling Behavior",
            "summary": f"Evaluation of top percentile records reveals aligned progression between {met1} and {met2}.",
            "evidence": f"Top record benchmark: {met1} = {_format_number(float(sorted_df[met1].iloc[0]))}.",
            "impact": "medium",
            "direction": "positive",
            "perspective_id": "relationships",
            "visual_ids": [visual_id],
        })


    @classmethod
    def build(cls, df: pd.DataFrame, dataset_id: str, version_id: str, dataset_name: str, variant: int = 0) -> Dict[str, Any]:
        working = df.copy()
        dates = cls._date_columns(working)
        numeric = cls._numeric_columns(working, set(dates))
        categories = cls._category_columns(working, set(numeric) | set(dates))
        domain = cls._infer_domain(working.columns)

        visuals: List[Dict[str, Any]] = []
        insights: List[Dict[str, Any]] = []
        kpis = cls._build_kpis(working, numeric, dates)

        time_result = cls._time_visual(working, dates, numeric, variant)
        if time_result:
            visual, insight = time_result
            visuals.append(visual)
            insights.append(insight)

        category_result = cls._category_visual(working, categories, numeric, variant)
        if category_result:
            visual, insight = category_result
            visuals.append(visual)
            insights.append(insight)

        correlation_result = cls._correlation_visual(working, numeric, variant)
        if correlation_result:
            visual, insight = correlation_result
            visuals.append(visual)
            insights.append(insight)

        distribution_result = cls._distribution_visual(working, numeric, variant)
        if distribution_result:
            visual, insight = distribution_result
            visuals.append(visual)
            insights.append(insight)

        profile_result = cls._metric_profile_visual(working, numeric, variant)
        if profile_result:
            visual, insight = profile_result
            visuals.append(visual)
            insights.append(insight)

        heatmap_result = cls._category_heatmap_visual(working, categories, variant)
        if heatmap_result:
            visual, insight = heatmap_result
            visuals.append(visual)
            insights.append(insight)

        volume_result = cls._volume_visual(working, categories, variant)
        if volume_result:
            visual, insight = volume_result
            visuals.append(visual)
            insights.append(insight)

        top_perf_result = cls._top_performers_visual(working, categories, numeric, variant)
        if top_perf_result:
            visual, insight = top_perf_result
            visuals.append(visual)
            insights.append(insight)

        comp_result = cls._secondary_breakdown_visual(working, categories, numeric, variant)
        if comp_result:
            visual, insight = comp_result
            visuals.append(visual)
            insights.append(insight)

        if not visuals:
            visuals.append({
                "id": "record_overview", "title": "Record overview", "subtitle": "Row distribution in the imported file",
                "chart_type": "bar", "data": [{"label": "Rows", "value": len(working)}, {"label": "Columns", "value": len(working.columns)}],
                "x_key": "label", "y_keys": ["value"], "perspective_ids": ["overview"], "size": "wide", "value_format": "number",
            })

        if visuals:
            shift = variant % len(visuals)
            visuals = visuals[shift:] + visuals[:shift]
        recommendations = cls._recommendations(insights, domain)
        perspectives = cls._perspectives(kpis, visuals, insights)
        response = {
            "dataset_id": dataset_id,
            "version_id": version_id,
            "domain": domain,
            "domain_label": DOMAIN_LABELS[domain],
            "title": f"{DOMAIN_LABELS[domain]} dashboard",
            "subtitle": f"Computed from {len(working):,} rows and {len(working.columns):,} columns in {dataset_name}.",
            "engine_mode": "deterministic",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "dashboard_variant": variant,
            "dashboard_mode": ["Executive", "Momentum", "Composition", "Diagnostic"][variant % 4],
            "kpis": kpis,
            "visuals": visuals,
            "insights": insights,
            "recommendations": recommendations,
            "perspectives": perspectives,
        }
        return cls._enrich_with_gemini(response)

    @staticmethod
    def _numeric_columns(df: pd.DataFrame, excluded: set[str]) -> List[str]:
        columns = []
        for col in df.columns:
            if str(col) in excluded:
                continue
            series = pd.to_numeric(df[col].astype(str).str.replace(r"[$,%]", "", regex=True).str.replace(",", ""), errors="coerce")
            if series.notna().mean() >= 0.65 and series.nunique(dropna=True) > 1:
                if "id" in _slug(str(col)).split("_") and series.nunique(dropna=True) / max(series.notna().sum(), 1) > 0.8:
                    continue
                df[col] = series
                columns.append(str(col))
        return columns

    @staticmethod
    def _date_columns(df: pd.DataFrame) -> List[str]:
        result = []
        for col in df.columns:
            name = str(col).lower()
            if not any(token in name for token in ["date", "time", "month", "year", "period"]):
                continue
            if name.strip().lower() == "year":
                parsed = pd.to_datetime(df[col].astype(str), format="%Y", errors="coerce")
            else:
                parsed = pd.to_datetime(df[col], errors="coerce")
            if parsed.notna().mean() >= 0.55 and parsed.nunique(dropna=True) > 1:
                df[col] = parsed
                result.append(str(col))
        return result

    @staticmethod
    def _category_columns(df: pd.DataFrame, excluded: set[str]) -> List[str]:
        candidates = []
        for col in df.columns:
            if str(col) in excluded:
                continue
            unique = df[col].nunique(dropna=True)
            if 2 <= unique <= min(40, max(8, len(df) // 3)):
                candidates.append(str(col))
        priorities = ["product", "category", "region", "segment", "channel", "department", "market", "plan", "status"]
        return sorted(candidates, key=lambda col: (next((index for index, token in enumerate(priorities) if token in col.lower()), 99), df[col].nunique(dropna=True), col))

    @staticmethod
    def _infer_domain(columns: Any) -> str:
        corpus = " ".join(_slug(str(col)) for col in columns)
        scores = {domain: sum(2 if re.search(rf"\b{re.escape(term)}\b", corpus) else 1 for term in terms if term in corpus) for domain, terms in DOMAIN_RULES.items()}
        winner = max(scores, key=scores.get)
        return winner if scores[winner] > 0 else "general"

    @classmethod
    def _build_kpis(cls, df: pd.DataFrame, numeric: List[str], dates: List[str]) -> List[Dict[str, Any]]:
        kpis = [{
            "id": "records", "label": "Records analyzed", "value": float(len(df)), "formatted_value": f"{len(df):,}",
            "comparison_text": f"Across {len(df.columns)} source columns", "trend": "neutral", "source_column": None, "sparkline": [],
        }]
        priorities = ["revenue", "sales", "profit", "amount", "cost", "expense", "quantity", "score", "rate", "value"]
        ranked = sorted(numeric, key=lambda col: next((i for i, token in enumerate(priorities) if token in col.lower()), 99))
        for col in ranked[:4]:
            values = pd.to_numeric(df[col], errors="coerce").dropna()
            if values.empty:
                continue
            low = col.lower()
            use_mean = any(token in low for token in ["rate", "ratio", "margin", "score", "price", "age"])
            value = float(values.mean() if use_mean else values.sum())
            money = any(token in low for token in ["revenue", "sales", "profit", "amount", "cost", "expense", "price", "cash"])
            percent = any(token in low for token in ["rate", "ratio", "margin", "percent", "pct"])
            q1, q3 = values.quantile([0.25, 0.75])
            spark = [round(_finite(item), 3) for item in values.groupby(np.arange(len(values)) * 8 // max(len(values), 1)).mean().head(8)]
            kpis.append({
                "id": f"kpi_{_slug(col)}", "label": f"{'Average' if use_mean else 'Total'} {col}", "value": round(value, 4),
                "formatted_value": _format_number(value, money=money, percent=percent),
                "comparison_text": f"Middle 50%: {_format_number(float(q1), money, percent)} to {_format_number(float(q3), money, percent)}",
                "trend": "positive" if value >= 0 else "negative", "source_column": col, "sparkline": spark,
            })
        if len(kpis) < 3 and dates:
            span = (df[dates[0]].max() - df[dates[0]].min()).days
            kpis.append({"id": "date_span", "label": "Observed time span", "value": float(span), "formatted_value": f"{span:,} days", "comparison_text": f"Based on {dates[0]}", "trend": "neutral", "source_column": dates[0], "sparkline": []})
        return kpis[:6]

    @classmethod
    def _time_visual(cls, df: pd.DataFrame, dates: List[str], numeric: List[str], variant: int) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
        if not dates or not numeric:
            return None
        date_col = dates[0]
        metric = cls._preferred_metric(numeric, variant)
        frame = pd.DataFrame({"date": df[date_col], "value": pd.to_numeric(df[metric], errors="coerce")}).dropna()
        if len(frame) < 3:
            return None
        frame["period"] = frame["date"].dt.to_period("M").astype(str)
        grouped = frame.groupby("period", as_index=False)["value"].sum().tail(18)
        if len(grouped) < 2:
            return None
        first, last = float(grouped.value.iloc[0]), float(grouped.value.iloc[-1])
        growth = ((last - first) / abs(first) * 100) if first else 0.0
        direction = "increased" if growth > 1 else "decreased" if growth < -1 else "remained stable"
        visual_id = "time_momentum"
        return ({
            "id": visual_id, "title": f"{metric} trend", "subtitle": f"Monthly movement by {date_col}", "chart_type": "area" if variant % 2 == 0 else "line",
            "data": [{"period": row.period, metric: round(_finite(row.value), 3)} for row in grouped.itertuples(index=False)],
            "x_key": "period", "y_keys": [metric], "perspective_ids": ["overview", "momentum"], "size": "wide", "value_format": "number",
        }, {
            "id": "insight_momentum", "title": f"{metric} {direction}",
            "summary": f"The observed {metric} moved from {_format_number(first)} to {_format_number(last)} across the available monthly periods.",
            "evidence": f"Computed change: {growth:+.1f}% using {date_col}.", "impact": "high" if abs(growth) >= 15 else "medium",
            "direction": "positive" if growth > 0 else "negative" if growth < 0 else "neutral", "perspective_id": "momentum", "visual_ids": [visual_id],
        })

    @classmethod
    def _category_visual(cls, df: pd.DataFrame, categories: List[str], numeric: List[str], variant: int) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
        if not categories:
            return None
        category = categories[variant % len(categories)]
        metric = cls._preferred_metric(numeric, variant) if numeric else None
        labels = df[category].fillna("Unspecified").astype(str).str.strip().replace({"": "Unspecified", "nan": "Unspecified", "None": "Unspecified"})
        grouped = (df.assign(_category_label=labels).groupby("_category_label", dropna=False)[metric].sum() if metric else labels.value_counts()).sort_values(ascending=False).head(8)
        grouped = grouped[grouped.notna()]
        if grouped.empty:
            return None
        total = float(grouped.sum()) or 1.0
        leader, leader_value = str(grouped.index[0]), float(grouped.iloc[0])
        share = leader_value / total * 100
        value_key = metric or "Records"
        visual_id = "category_concentration"
        return ({
            "id": visual_id, "title": f"{value_key} by {category}", "subtitle": "Leading groups ranked by computed contribution",
            "chart_type": "donut" if len(grouped) <= 6 and variant % 3 == 0 else "horizontal_bar",
            "data": [{category: str(index), value_key: round(_finite(value), 3)} for index, value in grouped.items()],
            "x_key": category, "y_keys": [value_key], "perspective_ids": ["overview", "composition"], "size": "standard", "value_format": "number",
        }, {
            "id": "insight_concentration", "title": f"{leader} leads {category}",
            "summary": f"{leader} contributes the largest observed share of {value_key} among the displayed groups.",
            "evidence": f"{leader}: {_format_number(leader_value)}, equal to {share:.1f}% of the top-group total.",
            "impact": "high" if share >= 40 else "medium", "direction": "neutral", "perspective_id": "composition", "visual_ids": [visual_id],
        })

    @staticmethod
    def _correlation_visual(df: pd.DataFrame, numeric: List[str], variant: int) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
        if len(numeric) < 2:
            return None
        corr = df[numeric].corr(numeric_only=True)
        pairs = [(abs(_finite(corr.loc[a, b])), _finite(corr.loc[a, b]), a, b) for i, a in enumerate(numeric) for b in numeric[i + 1:] if pd.notna(corr.loc[a, b])]
        if not pairs:
            return None
        pairs.sort(reverse=True)
        _, coefficient, x_col, y_col = pairs[min(variant % 3, len(pairs) - 1)]
        sample = df[[x_col, y_col]].dropna()
        if len(sample) > 180:
            sample = sample.sample(180, random_state=42)
        visual_id = "metric_relationship"
        strength = "strong" if abs(coefficient) >= 0.7 else "moderate" if abs(coefficient) >= 0.4 else "weak"
        return ({
            "id": visual_id, "title": f"{x_col} and {y_col}", "subtitle": "Row-level relationship between the strongest numeric pair",
            "chart_type": "scatter", "data": [{x_col: round(_finite(row[x_col]), 3), y_col: round(_finite(row[y_col]), 3)} for _, row in sample.iterrows()],
            "x_key": x_col, "y_keys": [y_col], "perspective_ids": ["relationships", "risk"], "size": "standard", "value_format": "number",
        }, {
            "id": "insight_relationship", "title": f"{strength.title()} relationship detected",
            "summary": f"{x_col} and {y_col} show a {strength} {'positive' if coefficient >= 0 else 'inverse'} relationship in this dataset.",
            "evidence": f"Pearson correlation r = {coefficient:+.2f} across valid paired rows.", "impact": "high" if abs(coefficient) >= 0.7 else "medium",
            "direction": "positive" if coefficient > 0 else "negative", "perspective_id": "relationships", "visual_ids": [visual_id],
        })

    @classmethod
    def _distribution_visual(cls, df: pd.DataFrame, numeric: List[str], variant: int) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
        if not numeric:
            return None
        ranked = sorted(numeric, key=lambda col: abs(_finite(pd.to_numeric(df[col], errors="coerce").skew())), reverse=True)
        metric = ranked[variant % min(len(ranked), 4)]
        values = pd.to_numeric(df[metric], errors="coerce").dropna()
        if len(values) < 4:
            return None
        counts, edges = np.histogram(values, bins=min(10, max(4, int(math.sqrt(len(values))))))
        q1, q3 = values.quantile([0.25, 0.75])
        iqr = q3 - q1
        outliers = int(((values < q1 - 1.5 * iqr) | (values > q3 + 1.5 * iqr)).sum()) if iqr else 0
        skew = _finite(values.skew())
        visual_id = "value_distribution"
        return ({
            "id": visual_id, "title": f"{metric} distribution", "subtitle": "Frequency shape and tail behavior",
            "chart_type": "bar", "data": [{"range": f"{edges[i]:.1f} to {edges[i + 1]:.1f}", "Records": int(counts[i])} for i in range(len(counts))],
            "x_key": "range", "y_keys": ["Records"], "perspective_ids": ["risk", "overview"], "size": "wide", "value_format": "number",
        }, {
            "id": "insight_distribution", "title": f"{metric} has {'a right tail' if skew > 0.5 else 'a left tail' if skew < -0.5 else 'a balanced shape'}",
            "summary": f"The distribution contains {outliers:,} IQR outliers and a skewness of {skew:+.2f}.",
            "evidence": f"Middle 50% ranges from {_format_number(float(q1))} to {_format_number(float(q3))}.",
            "impact": "high" if outliers / len(values) > 0.1 else "medium", "direction": "negative" if outliers else "neutral", "perspective_id": "risk", "visual_ids": [visual_id],
        })

    @staticmethod
    def _volume_visual(df: pd.DataFrame, categories: List[str], variant: int) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
        if len(categories) < 2:
            return None
        first = categories[variant % len(categories)]
        second = categories[(variant + 1) % len(categories)]
        normalized = df[[first, second]].copy()
        for column in [first, second]:
            normalized[column] = normalized[column].fillna("Unspecified").astype(str).str.strip().replace({"": "Unspecified", "nan": "Unspecified", "None": "Unspecified"})
        cross = normalized.groupby([first, second], dropna=False).size().reset_index(name="Records").sort_values("Records", ascending=False).head(12)
        visual_id = "segment_mix"
        lead = cross.iloc[0]
        return ({
            "id": visual_id, "title": f"{first} by {second}", "subtitle": "Most frequent cross-segment combinations",
            "chart_type": "bar" if variant % 2 == 0 else "horizontal_bar", "data": [{"segment": f"{row[first]} / {row[second]}", "Records": int(row.Records)} for _, row in cross.iterrows()],
            "x_key": "segment", "y_keys": ["Records"], "perspective_ids": ["composition"], "size": "wide", "value_format": "number",
        }, {
            "id": "insight_mix", "title": "A cross-segment cluster stands out",
            "summary": f"{lead[first]} combined with {lead[second]} is the most frequent observed pairing.",
            "evidence": f"The pairing appears in {int(lead['Records']):,} records.", "impact": "medium", "direction": "neutral", "perspective_id": "composition", "visual_ids": [visual_id],
        })

    @staticmethod
    def _metric_profile_visual(df: pd.DataFrame, numeric: List[str], variant: int) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
        if len(numeric) < 3:
            return None
        rows = []
        variability = []
        rotated = numeric[variant % len(numeric):] + numeric[:variant % len(numeric)]
        for column in rotated[:6]:
            values = pd.to_numeric(df[column], errors="coerce").dropna()
            if len(values) < 3:
                continue
            low, high = values.quantile([0.05, 0.95])
            mean = float(values.mean())
            score = ((mean - float(low)) / (float(high) - float(low)) * 100) if high != low else 50.0
            cv = abs(float(values.std()) / mean) if mean else 0.0
            rows.append({"metric": column, "Relative level": round(max(0.0, min(100.0, score)), 1), "Observed mean": round(mean, 3)})
            variability.append((cv, column))
        if len(rows) < 3:
            return None
        _, variable_metric = max(variability)
        visual_id = "metric_profile"
        return ({
            "id": visual_id, "title": "Metric profile", "subtitle": "Relative position within each metric's observed range",
            "chart_type": "radar", "data": rows, "x_key": "metric", "y_keys": ["Relative level"],
            "perspective_ids": ["overview", "relationships"], "size": "standard", "value_format": "percent",
        }, {
            "id": "insight_metric_profile", "title": f"{variable_metric} varies most",
            "summary": f"{variable_metric} has the highest relative dispersion among the profiled numeric measures.",
            "evidence": "Dispersion is ranked using the coefficient of variation on valid numeric rows.",
            "impact": "medium", "direction": "neutral", "perspective_id": "relationships", "visual_ids": [visual_id],
        })

    @staticmethod
    def _category_heatmap_visual(df: pd.DataFrame, categories: List[str], variant: int) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
        if len(categories) < 2:
            return None
        row_key = categories[variant % len(categories)]
        column_key = categories[(variant + 1) % len(categories)]
        normalized = df[[row_key, column_key]].copy()
        for column in [row_key, column_key]:
            normalized[column] = normalized[column].fillna("Unspecified").astype(str).str.strip().replace({"": "Unspecified", "nan": "Unspecified", "None": "Unspecified"})
        top_rows = normalized[row_key].value_counts().head(5).index
        top_columns = normalized[column_key].value_counts().head(5).index
        filtered = normalized[normalized[row_key].isin(top_rows) & normalized[column_key].isin(top_columns)]
        matrix = filtered.groupby([row_key, column_key]).size().reset_index(name="Records")
        if matrix.empty:
            return None
        leader = matrix.sort_values("Records", ascending=False).iloc[0]
        visual_id = "category_heatmap"
        return ({
            "id": visual_id, "title": f"{row_key} and {column_key} density", "subtitle": "Record concentration across the leading category combinations",
            "chart_type": "heatmap", "data": [{row_key: str(row[row_key]), column_key: str(row[column_key]), "Records": int(row["Records"])} for _, row in matrix.iterrows()],
            "x_key": column_key, "y_keys": [row_key, "Records"], "perspective_ids": ["overview", "composition"], "size": "standard", "value_format": "number",
        }, {
            "id": "insight_category_heatmap", "title": "A dense category intersection emerged",
            "summary": f"{leader[row_key]} and {leader[column_key]} form the most frequent category intersection.",
            "evidence": f"The intersection contains {int(leader['Records']):,} records.", "impact": "medium", "direction": "neutral",
            "perspective_id": "composition", "visual_ids": [visual_id],
        })

    @staticmethod
    def _preferred_metric(numeric: List[str], variant: int = 0) -> str:
        priorities = ["revenue", "sales", "profit", "amount", "value", "quantity", "score", "cost"]
        ranked = sorted(numeric, key=lambda col: next((i for i, term in enumerate(priorities) if term in col.lower()), 99))
        return ranked[variant % min(len(ranked), 4)]

    @staticmethod
    def _recommendations(insights: List[Dict[str, Any]], domain: str) -> List[Dict[str, Any]]:
        actions = {
            "momentum": "Validate the drivers behind the latest movement and compare them with the strongest prior period.",
            "composition": "Protect the leading segment while testing whether the next two groups can absorb additional focus.",
            "relationships": "Use the detected relationship as a diagnostic signal, then test causality before changing policy.",
            "risk": "Review extreme records and confirm whether they are valid events, entry errors, or process exceptions.",
        }
        return [{
            "id": f"recommendation_{index + 1}", "title": f"Act on {item['title'].lower()}",
            "action": actions.get(item["perspective_id"], "Inspect the supporting records before acting."),
            "rationale": item["evidence"], "priority": item["impact"], "insight_ids": [item["id"]],
        } for index, item in enumerate(insights[:4])]

    @staticmethod
    def _perspectives(kpis: List[Dict[str, Any]], visuals: List[Dict[str, Any]], insights: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        result = [{
            "id": "overview", "label": "Executive overview", "description": "The broadest verified view of the active dataset.",
            "kpi_ids": [item["id"] for item in kpis], "visual_ids": [item["id"] for item in visuals], "insight_ids": [item["id"] for item in insights],
        }]
        labels = {"momentum": "Momentum", "composition": "Composition", "relationships": "Drivers", "risk": "Risk and exceptions"}
        for perspective_id, label in labels.items():
            visual_ids = [item["id"] for item in visuals if perspective_id in item["perspective_ids"]]
            insight_ids = [item["id"] for item in insights if item["perspective_id"] == perspective_id]
            if visual_ids:
                result.append({"id": perspective_id, "label": label, "description": f"Focus the dashboard on {label.lower()} evidence.", "kpi_ids": [item["id"] for item in kpis], "visual_ids": visual_ids, "insight_ids": insight_ids})
        return result

    @staticmethod
    def _enrich_with_gemini(response: Dict[str, Any]) -> Dict[str, Any]:
        if not settings.GEMINI_API_KEY or not response["insights"]:
            return response
        facts = [{"id": item["id"], "title": item["title"], "summary": item["summary"], "evidence": item["evidence"]} for item in response["insights"]]
        prompt = (
            "You are a business intelligence editor. Improve only the short titles for these deterministic findings. "
            "Return JSON with an 'items' array containing id and title. Keep each title under 8 words. "
            "Do not add numbers, claims, or facts. Preserve the dataset topic and avoid generic AI language.\n"
            + json.dumps({"domain": response["domain_label"], "facts": facts})
        )
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
            payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"responseMimeType": "application/json", "temperature": 0.25}}
            api_response = httpx.post(url, headers={"x-goog-api-key": settings.GEMINI_API_KEY}, json=payload, timeout=8.0)
            api_response.raise_for_status()
            text = api_response.json()["candidates"][0]["content"]["parts"][0]["text"]
            replacements = {item["id"]: item["title"].strip() for item in json.loads(text).get("items", []) if item.get("id") and item.get("title") and not re.search(r"\d", item["title"])}
            for insight in response["insights"]:
                if insight["id"] in replacements:
                    insight["title"] = replacements[insight["id"]][:80]
            response["engine_mode"] = f"deterministic + {settings.GEMINI_MODEL} narrative"
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError):
            pass
        return response
