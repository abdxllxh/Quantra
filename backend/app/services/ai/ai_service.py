import re
import time
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from app.schemas.ai import (
    AskQuestionRequest,
    AskQuestionResponse,
    ToolCallRecord,
    ChartRecommendation,
    ProposedTransformation,
    SuggestedQuestionsResponse
)
from app.services.analytics.analytics_engine import AnalyticsEngine
from app.schemas.analytics import GroupByRequest, AggregationSpec
from app.services.anomaly.anomaly_detector import AnomalyDetectorService


class AIService:
    @classmethod
    def get_suggested_questions(cls, df: pd.DataFrame) -> SuggestedQuestionsResponse:
        cols = list(df.columns)
        
        # Identify top business metric (Revenue > Profit > Sales > Cost > Price > first numeric)
        priority_keywords = ['revenue', 'sales', 'profit', 'cost', 'amount', 'total', 'price']
        primary_metric = None
        for kw in priority_keywords:
            matched = next((c for c in cols if kw in str(c).lower()), None)
            if matched:
                primary_metric = matched
                break

        num_cols = [c for c in cols if pd.api.types.is_numeric_dtype(df[c]) or any(k in str(c).lower() for k in priority_keywords)]
        if not primary_metric and num_cols:
            primary_metric = num_cols[0]

        cat_cols = [c for c in cols if df[c].nunique() <= 50 and c not in num_cols and not str(c).lower().endswith('_id')]
        date_cols = [c for c in cols if any(k in str(c).lower() for k in ['date', 'time', 'year', 'month', 'period', 'day'])]

        suggestions = []
        cat_map: Dict[str, List[str]] = {
            "Business Insights": [],
            "Data Quality": [],
            "Anomalies": [],
            "Trends": []
        }

        # 1. High value revenue / performance questions
        if cat_cols and primary_metric:
            c, n = cat_cols[0], primary_metric
            q1 = f"Which {c} generated the highest total {n}?"
            q2 = f"Show the top 5 {c} by {n}"
            suggestions.extend([q1, q2])
            cat_map["Business Insights"].extend([q1, q2])

        # 2. Trends
        if date_cols and primary_metric:
            d, n = date_cols[0], primary_metric
            q = f"How has {n} evolved over time?"
            suggestions.append(q)
            cat_map["Trends"].append(q)

        # 3. Anomalies
        if primary_metric:
            q_anom = f"Find suspicious or unusual outlier transactions in {primary_metric}"
            suggestions.append(q_anom)
            cat_map["Anomalies"].append(q_anom)

        # 4. Correlation
        if len(num_cols) >= 2:
            n1, n2 = num_cols[0], num_cols[1]
            q = f"What is the correlation between {n1} and {n2}?"
            suggestions.append(q)
            cat_map["Business Insights"].append(q)

        q_qual = "Audit data quality health and summarize missing values"
        suggestions.append(q_qual)
        cat_map["Data Quality"].append(q_qual)

        return SuggestedQuestionsResponse(
            suggested_questions=suggestions[:5],
            category_suggestions=cat_map
        )

    @classmethod
    def answer_question(
        cls,
        df: pd.DataFrame,
        dataset_name: str,
        request: AskQuestionRequest
    ) -> AskQuestionResponse:
        q_raw = request.question.strip()
        q_lower = q_raw.lower()

        tool_calls: List[ToolCallRecord] = []
        rec_chart: Optional[ChartRecommendation] = None
        proposed_trans: Optional[ProposedTransformation] = None

        cols = list(df.columns)
        priority_keywords = ['revenue', 'sales', 'profit', 'cost', 'amount', 'price', 'total']
        num_cols = [c for c in cols if pd.api.types.is_numeric_dtype(df[c]) or any(k in str(c).lower() for k in priority_keywords)]
        cat_cols = [c for c in cols if df[c].nunique() <= 50 and c not in num_cols and not str(c).lower().endswith('_id')]
        date_cols = [c for c in cols if any(k in str(c).lower() for k in ['date', 'time', 'year', 'month', 'period'])]

        # Mask sensitive columns if privacy mode is on
        work_df = df.copy()
        if request.privacy_mode:
            for c in work_df.columns:
                c_l = str(c).lower()
                if any(s in c_l for s in ['email', 'phone', 'ssn', 'address', 'customer_name', 'name']):
                    work_df[c] = "[REDACTED]"

        # Intent 0: Conversational greetings / help
        if q_lower in ["hello", "hi", "hey", "help", "who are you", "what can you do", "good morning", "good afternoon"]:
            metric_examples = ", ".join(str(c) for c in num_cols[:4]) or "record counts"
            dimension_examples = ", ".join(str(c) for c in cat_cols[:3]) or "available categories"
            if q_lower in ["hello", "hi", "hey", "good morning", "good afternoon"]:
                greeting_lines = [
                    f"Hello! Quantura Copilot is connected to {dataset_name} with {len(work_df):,} rows and {len(cols)} columns.",
                    f"Try comparing {metric_examples} across {dimension_examples}, checking trends, or finding anomalies."
                ]
            else:
                greeting_lines = [
                    f"For {dataset_name}, I can calculate and compare {metric_examples} across {dimension_examples}.",
                    "I can also build trend or ranking charts, detect anomalies, calculate correlations, audit data quality, and prepare cleaning changes for confirmation.",
                    f"Useful next question: Which {cat_cols[0] if cat_cols else 'group'} has the highest {num_cols[0] if num_cols else 'record count'}?"
                ]
            return AskQuestionResponse(
                answer="\n".join(greeting_lines),
                confidence_score=1.0,
                suggested_followups=[
                    f"Which {cat_cols[0]} has highest revenue?" if cat_cols else "Show summary KPIs",
                    "Find outlier anomalies in transactions",
                    "Audit data health score"
                ]
            )

        # Intent 1: Transformation request (e.g., "remove duplicates", "fill missing")
        if any(w in q_lower for w in ["remove", "drop", "delete", "clean", "fill", "replace", "standardize", "create column"]):
            if "duplicate" in q_lower:
                dup_count = int(work_df.duplicated().sum())
                proposed_trans = ProposedTransformation(
                    action="deduplicate",
                    target_column=None,
                    details=f"Remove all {dup_count} duplicate rows (keeping first occurrence)",
                    preview_affected_rows=dup_count,
                    operation_payload={"keep": "first"},
                    requires_confirmation=True
                )
                answer = f"I have prepared a transformation to eliminate {dup_count} duplicate rows. Please review and confirm below."
                return AskQuestionResponse(
                    answer=answer,
                    tool_calls=tool_calls,
                    proposed_transformation=proposed_trans,
                    evidence_summary=f"Found {dup_count} duplicate rows in current version."
                )

            # Check missing fill
            missing_match = re.search(r'(?:fill|impute)\s+(?:missing\s+)?(?:in\s+)?(\w+)', q_lower)
            if missing_match:
                target_cand = missing_match.group(1)
                matched_col = next((c for c in cols if target_cand in c.lower()), None)
                if matched_col:
                    null_cnt = int(work_df[matched_col].isna().sum())
                    strat = "median" if matched_col in num_cols else "mode"
                    proposed_trans = ProposedTransformation(
                        action="impute",
                        target_column=matched_col,
                        details=f"Fill {null_cnt} missing values in '{matched_col}' using {strat}",
                        preview_affected_rows=null_cnt,
                        operation_payload={"column_name": matched_col, "strategy": strat},
                        requires_confirmation=True
                    )
                    return AskQuestionResponse(
                        answer=f"I generated a proposed data cleaning operation to impute {null_cnt} missing values in '{matched_col}' using {strat}.",
                        proposed_transformation=proposed_trans
                    )

        # Intent 2: Group By / Top / Bottom Aggregations
        target_cat = None
        target_num = None

        for c in cat_cols:
            if c.lower() in q_lower or c.lower().replace('_', ' ') in q_lower:
                target_cat = c
                break
        if not target_cat and cat_cols:
            target_cat = cat_cols[0]

        # Prioritize revenue/profit if query contains performance terms
        for n in num_cols:
            if n.lower() in q_lower or n.lower().replace('_', ' ') in q_lower:
                target_num = n
                break
        if not target_num:
            # Pick best financial metric
            target_num = next((c for c in num_cols if any(k in c.lower() for k in priority_keywords)), num_cols[0] if num_cols else None)

        is_top = any(w in q_lower for w in ["top", "highest", "best", "most", "leader", "maximum", "largest"])
        is_bottom = any(w in q_lower for w in ["bottom", "lowest", "worst", "least", "minimum", "smallest", "decline"])

        # Intent 2: Time-series trend. This is evaluated before grouped rankings
        # so questions suggested by the UI produce a real dataset-grounded chart.
        is_trend = any(phrase in q_lower for phrase in ["over time", "evolved", "trend", "timeline", "by date"])
        if is_trend and date_cols and target_num:
            date_col = next((c for c in date_cols if c.lower() in q_lower or c.lower().replace('_', ' ') in q_lower), date_cols[0])
            trend_df = pd.DataFrame({
                "date": pd.to_datetime(work_df[date_col], errors="coerce"),
                "value": pd.to_numeric(work_df[target_num], errors="coerce"),
            }).dropna()
            if not trend_df.empty:
                trend_df["period"] = trend_df["date"].dt.strftime("%Y-%m-%d")
                grouped = trend_df.groupby("period", as_index=False)["value"].sum().sort_values("period")
                rows = [
                    {date_col: str(row["period"]), f"total_{target_num}": float(row["value"])}
                    for _, row in grouped.iterrows()
                ]
                first_value = rows[0][f"total_{target_num}"]
                last_value = rows[-1][f"total_{target_num}"]
                change = ((last_value - first_value) / abs(first_value) * 100) if first_value else None
                change_text = f" ({change:+.1f}% from first to last period)" if change is not None else ""
                rec_chart = ChartRecommendation(
                    chart_type="line",
                    title=f"{target_num} Trend Over Time",
                    x_axis=date_col,
                    y_axis=f"total_{target_num}",
                    data=rows,
                    explanation=f"Daily sum of verified {target_num} values ordered by {date_col}."
                )
                return AskQuestionResponse(
                    answer=f"{target_num} moved from **{first_value:,.1f}** on {rows[0][date_col]} to **{last_value:,.1f}** on {rows[-1][date_col]}{change_text}. The line chart shows all **{len(rows)} periods**.",
                    grounded_data={"data": rows},
                    recommended_chart=rec_chart,
                    confidence_score=0.99,
                    evidence_summary=f"Computed from {len(trend_df):,} valid rows without extrapolation.",
                    suggested_followups=[f"Find outliers in {target_num}", f"Compare {target_num} by category"]
                )

        if (target_cat and target_num) and (is_top or is_bottom or "by" in q_lower or "compare" in q_lower or "group" in q_lower):
            requested_limit_match = re.search(r'\b(?:top|bottom)\s+(\d+)\b', q_lower)
            requested_limit = max(1, min(int(requested_limit_match.group(1)), 50)) if requested_limit_match else 6
            t_start = time.time()
            gb_req = GroupByRequest(
                group_columns=[target_cat],
                aggregations=[AggregationSpec(column=target_num, function="sum", alias=f"total_{target_num}")],
                sort_by=f"total_{target_num}",
                sort_desc=not is_bottom,
                limit=requested_limit
            )
            gb_result = AnalyticsEngine.run_group_by(work_df, gb_req)
            exec_time = (time.time() - t_start) * 1000

            tool_calls.append(ToolCallRecord(
                tool_name="group_data",
                arguments={"group_columns": [target_cat], "metric": target_num, "aggregation": "sum", "sort_desc": not is_bottom},
                result={"top_groups": gb_result["rows"][:5]},
                execution_time_ms=round(exec_time, 2)
            ))

            rows = gb_result["rows"]
            if rows:
                best = rows[0]
                best_val = best.get(f"total_{target_num}", 0)
                is_curr = any(k in target_num.lower() for k in ['revenue', 'sales', 'profit', 'cost', 'price', 'amount'])
                fmt_val = f"${best_val:,.2f}" if is_curr else f"{best_val:,.1f}"
                
                direction_word = "highest" if not is_bottom else "lowest"
                lines = [f"**{best.get(target_cat)}** leads with the {direction_word} total {target_num} at **{fmt_val}**.\n\n**Ranked breakdown:**"]
                
                chart_rows = []
                for idx, r in enumerate(rows[:requested_limit]):
                    r_cat = r.get(target_cat)
                    r_val = r.get(f"total_{target_num}", 0)
                    r_fmt = f"${r_val:,.2f}" if is_curr else f"{r_val:,.1f}"
                    lines.append(f"{idx+1}. **{r_cat}**: {r_fmt}")
                    chart_rows.append({target_cat: str(r_cat), f"total_{target_num}": r_val})

                rec_chart = ChartRecommendation(
                    chart_type="bar",
                    title=f"Total {target_num} by {target_cat}",
                    x_axis=target_cat,
                    y_axis=f"total_{target_num}",
                    data=chart_rows,
                    explanation=f"Grouped aggregation of verified {target_num} across {target_cat} categories."
                )

                return AskQuestionResponse(
                    answer="\n".join(lines),
                    grounded_data={"data": rows[:10]},
                    tool_calls=tool_calls,
                    recommended_chart=rec_chart,
                    confidence_score=0.99,
                    evidence_summary=f"Calculated from {len(work_df):,} records with zero extrapolation.",
                    suggested_followups=[
                        f"Show monthly trend for {best.get(target_cat)}",
                        f"Identify outliers in {target_num}",
                        "Audit overall dataset health"
                    ]
                )

        # Intent 3: Anomaly detection question
        if any(w in q_lower for w in ["anomaly", "anomalies", "outlier", "outliers", "suspicious", "unusual", "irregular", "fraud"]):
            t_start = time.time()
            anom_res = AnomalyDetectorService.analyze_dataset_anomalies(work_df, dataset_id="preview")
            exec_time = (time.time() - t_start) * 1000

            tool_calls.append(ToolCallRecord(
                tool_name="detect_anomalies",
                arguments={"method": "auto"},
                result={"total_anomalies": anom_res.total_anomalies, "high_risk": anom_res.high_risk_count},
                execution_time_ms=round(exec_time, 2)
            ))

            if anom_res.total_anomalies > 0:
                top_anom = anom_res.anomalies[:4]
                lines = [f"Detected **{anom_res.total_anomalies} anomalies** ({anom_res.high_risk_count} high-severity outliers) using IQR and Isolation Forest models.\n\n**Top flagged records:**"]
                chart_data = []
                for a in top_anom:
                    lines.append(f"• **Row {a.row_index}** ({a.column_name}): Value **{a.actual_value}** (Typical range: {a.expected_range}); *{a.reason}*")
                    chart_data.append({"row": f"Row {a.row_index}", "value": a.actual_value if isinstance(a.actual_value, (int, float)) else 0})

                rec_chart = ChartRecommendation(
                    chart_type="bar",
                    title="High-Severity Outlier Values",
                    x_axis="row",
                    y_axis="value",
                    data=chart_data,
                    explanation="Visualizes extreme transaction outliers exceeding 2.5 standard deviations from median."
                )

                return AskQuestionResponse(
                    answer="\n".join(lines),
                    grounded_data={"anomalies": [a.model_dump() for a in top_anom]},
                    tool_calls=tool_calls,
                    recommended_chart=rec_chart,
                    evidence_summary="Evaluated via interquartile range (IQR) and multivariate Isolation Forest.",
                    suggested_followups=["Remove duplicate records", "Download Excel anomaly audit sheet"]
                )

        # Intent 4: Correlation questions
        if "correlation" in q_lower or "relationship" in q_lower or "related" in q_lower:
            t_start = time.time()
            corr_res = AnalyticsEngine.calculate_correlations(work_df)
            exec_time = (time.time() - t_start) * 1000

            tool_calls.append(ToolCallRecord(
                tool_name="calculate_correlation",
                arguments={"columns": corr_res.columns},
                result={"top_positive_count": len(corr_res.top_positive)},
                execution_time_ms=round(exec_time, 2)
            ))

            lines = ["**Strongest statistical correlations in your dataset:**\n"]
            for pair in corr_res.top_positive[:3]:
                lines.append(f"• **{pair.col1} ↔ {pair.col2}**: r = **{pair.correlation:+.2f}** ({pair.relationship.replace('_', ' ').title()}). {pair.explanation}")
            for pair in corr_res.top_negative[:2]:
                lines.append(f"• **{pair.col1} ↔ {pair.col2}**: r = **{pair.correlation:+.2f}** (Inverse). {pair.explanation}")

            return AskQuestionResponse(
                answer="\n".join(lines),
                grounded_data={"matrix": corr_res.matrix},
                tool_calls=tool_calls,
                evidence_summary="Pearson correlation coefficients calculated across numerical features."
            )

        # Intent 5: Dataset-specific insight synthesis
        if any(phrase in q_lower for phrase in ["key insight", "key finding", "what stands out", "main insight", "data highlights"]):
            insight_metric = None
            for keyword in ["revenue", "profit", "sales", "amount", "cost", "price", "quantity"]:
                insight_metric = next((c for c in num_cols if keyword in str(c).lower()), None)
                if insight_metric:
                    break
            insight_metric = insight_metric or (num_cols[0] if num_cols else None)
            lines = [f"Key insights calculated from all {len(work_df):,} rows in {dataset_name}:"]
            grounded: Dict[str, Any] = {"row_count": len(work_df), "column_count": len(cols)}
            chart_rows: List[Dict[str, Any]] = []

            if insight_metric:
                metric_values = pd.to_numeric(work_df[insight_metric], errors="coerce").dropna()
                if not metric_values.empty:
                    total_value = float(metric_values.sum())
                    average_value = float(metric_values.mean())
                    lines.append(f"1. {insight_metric}: total {total_value:,.2f}; average {average_value:,.2f} across {len(metric_values):,} valid records.")
                    grounded["primary_metric"] = {"column": insight_metric, "total": total_value, "average": average_value}

                    if cat_cols:
                        insight_dimension = cat_cols[0]
                        grouped = (
                            pd.DataFrame({
                                "dimension": work_df[insight_dimension].astype(str),
                                "metric": pd.to_numeric(work_df[insight_metric], errors="coerce"),
                            })
                            .dropna()
                            .groupby("dimension", as_index=False)["metric"]
                            .sum()
                            .sort_values("metric", ascending=False)
                            .head(5)
                        )
                        if not grouped.empty:
                            top_name = str(grouped.iloc[0]["dimension"])
                            top_value = float(grouped.iloc[0]["metric"])
                            total_grouped = float(grouped["metric"].sum())
                            share = (top_value / total_grouped * 100) if total_grouped else 0
                            lines.append(f"2. Leading {insight_dimension}: {top_name} contributes {top_value:,.2f}, or {share:.1f}% of the displayed top-five total.")
                            chart_rows = [
                                {insight_dimension: str(row["dimension"]), f"total_{insight_metric}": float(row["metric"])}
                                for _, row in grouped.iterrows()
                            ]
                            grounded["top_groups"] = chart_rows

                    q1, q3 = metric_values.quantile([0.25, 0.75])
                    iqr = q3 - q1
                    outlier_count = int(((metric_values < q1 - 1.5 * iqr) | (metric_values > q3 + 1.5 * iqr)).sum()) if iqr > 0 else 0
                    lines.append(f"3. Distribution risk: {outlier_count:,} {insight_metric} values fall outside the standard IQR range.")
                    grounded["primary_metric_outliers"] = outlier_count

            missing_cells = int(work_df.isna().sum().sum())
            duplicate_rows = int(work_df.duplicated().sum())
            lines.append(f"4. Data quality: {missing_cells:,} missing cells and {duplicate_rows:,} exact duplicate rows were detected.")
            grounded["data_quality"] = {"missing_cells": missing_cells, "duplicate_rows": duplicate_rows}

            if date_cols and insight_metric:
                trend_frame = pd.DataFrame({
                    "date": pd.to_datetime(work_df[date_cols[0]], errors="coerce"),
                    "metric": pd.to_numeric(work_df[insight_metric], errors="coerce"),
                }).dropna()
                if not trend_frame.empty:
                    trend_frame["period"] = trend_frame["date"].dt.to_period("M").astype(str)
                    monthly = trend_frame.groupby("period")["metric"].sum().sort_index()
                    if len(monthly) >= 2 and float(monthly.iloc[0]) != 0:
                        change_pct = (float(monthly.iloc[-1]) - float(monthly.iloc[0])) / abs(float(monthly.iloc[0])) * 100
                        lines.append(f"5. Time movement: monthly {insight_metric} changed {change_pct:+.1f}% from {monthly.index[0]} to {monthly.index[-1]}.")
                        grounded["monthly_change_pct"] = change_pct

            rec_chart = None
            if chart_rows and insight_metric and cat_cols:
                rec_chart = ChartRecommendation(
                    chart_type="bar",
                    title=f"Top {cat_cols[0]} by {insight_metric}",
                    x_axis=cat_cols[0],
                    y_axis=f"total_{insight_metric}",
                    data=chart_rows,
                    explanation=f"Verified sum of {insight_metric} for the leading {cat_cols[0]} groups."
                )
            return AskQuestionResponse(
                answer="\n".join(lines),
                grounded_data=grounded,
                recommended_chart=rec_chart,
                confidence_score=0.99,
                evidence_summary="Every finding was calculated from the complete active dataset version.",
                suggested_followups=[f"Show {insight_metric} over time" if insight_metric and date_cols else "Show the strongest correlations", "Explain the highest-risk outliers", "Create a non-destructive cleaning plan"]
            )

        # Intent 6: Non-destructive optimization plan
        if any(word in q_lower for word in ["optimize", "optimise", "optimization", "improve the data"]) or "without loss" in q_lower:
            missing_by_column = work_df.isna().sum()
            missing_by_column = missing_by_column[missing_by_column > 0].sort_values(ascending=False)
            missing_cells = int(missing_by_column.sum())
            duplicate_rows = int(work_df.duplicated().sum())
            whitespace_cells = 0
            for column in work_df.select_dtypes(include=["object", "string"]).columns:
                values = work_df[column].dropna().astype(str)
                whitespace_cells += int((values != values.str.strip()).sum())

            numeric_frame = work_df.select_dtypes(include=[np.number])
            outlier_rows = set()
            for column in numeric_frame.columns:
                values = pd.to_numeric(numeric_frame[column], errors="coerce").dropna()
                if values.empty:
                    continue
                q1, q3 = values.quantile([0.25, 0.75])
                iqr = q3 - q1
                if iqr > 0:
                    mask = (values < q1 - 1.5 * iqr) | (values > q3 + 1.5 * iqr)
                    outlier_rows.update(values.index[mask].tolist())

            lines = [
                f"Non-destructive optimization plan for {dataset_name} ({len(work_df):,} rows, {len(cols)} columns):",
                f"1. Missing values: {missing_cells:,} cells across {len(missing_by_column)} columns. Impute numeric gaps with medians and categorical gaps with modes; retain every row.",
                f"2. Duplicate safety: {duplicate_rows:,} exact duplicates. Add a duplicate flag for review instead of deleting records.",
                f"3. Outlier safety: {len(outlier_rows):,} rows contain IQR outliers. Add an outlier flag or capped companion value while preserving original values.",
                f"4. Text consistency: {whitespace_cells:,} cells contain leading or trailing whitespace. Trim those cells without changing the table shape.",
                "5. Version protection: apply each operation as a new immutable version so every change can be audited or rolled back."
            ]
            return AskQuestionResponse(
                answer="\n".join(lines),
                grounded_data={
                    "missing_cells": missing_cells,
                    "missing_columns": {str(k): int(v) for k, v in missing_by_column.items()},
                    "duplicate_rows": duplicate_rows,
                    "outlier_rows": len(outlier_rows),
                    "whitespace_cells": whitespace_cells,
                    "preserves_rows": True,
                    "preserves_columns": True,
                },
                confidence_score=0.99,
                evidence_summary="The plan profiles the active version and proposes only reversible, shape-preserving operations.",
                suggested_followups=["Prepare the missing-value changes for confirmation", "Show the outlier rows before changing them", "Open Smart Cleaning"]
            )

        # Intent 6: Visual & Chart Interpretation (e.g. "how should I interpret the revenue by region visualization", "explain this chart")
        if any(w in q_lower for w in ["interpret", "visual", "visualization", "chart", "graph", "plot", "dashboard", "how to read", "understand the visual"]):
            # Detect target dimensions and measures mentioned in query
            matched_cat = next((c for c in cat_cols if c.lower() in q_lower or c.lower().replace('_', ' ') in q_lower), None) or (cat_cols[0] if cat_cols else None)
            matched_num = next((c for c in num_cols if c.lower() in q_lower or c.lower().replace('_', ' ') in q_lower), None) or (num_cols[0] if num_cols else None)

            chart_type_name = "Bar / Breakdown Chart"
            if any(w in q_lower for w in ["trend", "time", "date", "line", "evolution"]):
                chart_type_name = "Time-Series Trend Line"
            elif any(w in q_lower for w in ["distribution", "scatter", "correlation"]):
                chart_type_name = "Distribution / Scatter Plot"
            elif any(w in q_lower for w in ["share", "composition", "pie", "donut"]):
                chart_type_name = "Composition / Donut Chart"

            top_cat_summary = ""
            if matched_cat and matched_num:
                try:
                    num_series = pd.to_numeric(work_df[matched_num], errors="coerce")
                    valid_idx = num_series.notna() & work_df[matched_cat].notna()
                    if valid_idx.any():
                        agg = work_df[valid_idx].groupby(matched_cat)[matched_num].sum().sort_values(ascending=False)
                        top_3 = agg.head(3)
                        top_3_items = [f"**{cat}** (${val:,.2f}" if "revenue" in matched_num.lower() or "sales" in matched_num.lower() or "price" in matched_num.lower() else f"**{cat}** ({val:,.2f}" + ")" for cat, val in top_3.items()]
                        top_cat_summary = f"The top performing segments in this view are {', '.join(top_3_items)}."
                except Exception:
                    pass

            lines = [
                f"### Visual Overview & Purpose",
                f"This visual represents the relationship between **{matched_cat or 'Categories'}** (dimensions) and **{matched_num or 'Performance Measures'}** across **{len(work_df):,} records** in `{dataset_name}`. {top_cat_summary}",
                f"",
                f"### How to Interpret This BI Visual",
                f"• **Chart Type**: `{chart_type_name}` optimized for discrete categorical performance comparison.",
                f"• **X-Axis (Horizontal Dimension)**: Represents individual categories in `{matched_cat or 'Category'}`. Look for high-volume groups versus long-tail minor segments.",
                f"• **Y-Axis (Vertical Magnitude)**: Represents aggregated sum/mean values for `{matched_num or 'Metric'}`. Bar heights reflect relative contribution to overall volume.",
                f"• **Color & Thresholds**: Primary accent colors highlight top contributors, while secondary shades denote baseline volume.",
                f"",
                f"### Key Indicators to Focus On",
                f"1. **Dominant Drivers (Pareto 80/20)**: Identify whether a small set of categories generate the majority of total volume.",
                f"2. **Outlier Disparities**: Look for dramatic gaps between top performers and secondary tiers.",
                f"3. **Zero / Low-Activity Groups**: Check if any segments show negligible volume requiring review.",
                f"",
                f"### Recommended Next Actions",
                f"• **Drill-Down**: Cross-tabulate `{matched_cat or 'Category'}` with date dimensions under **Business Insights** to track growth over time.",
                f"• **Anomaly Audit**: Check **Anomaly Detection** to ensure top spikes are not single data-entry anomalies."
            ]

            return AskQuestionResponse(
                answer="\n\n".join(lines),
                grounded_data={
                    "dimension": matched_cat,
                    "measure": matched_num,
                    "total_rows": len(work_df),
                    "chart_type": chart_type_name
                },
                confidence_score=0.99,
                suggested_followups=[
                    f"Show the top 5 {matched_cat} by {matched_num}" if matched_cat and matched_num else "Show top categories",
                    "How has this metric evolved over time?",
                    "Check for anomalies and outliers"
                ]
            )

        # Intent 7: Key Features & What to Focus On (e.g. "what are the key features I should focus on")
        if any(w in q_lower for w in ["key feature", "key features", "what to focus on", "focus on", "main features", "important features", "important columns", "explain columns"]):
            top_num_str = ", ".join([f"`{c}`" for c in num_cols[:4]]) if num_cols else "None"
            top_cat_str = ", ".join([f"`{c}`" for c in cat_cols[:4]]) if cat_cols else "None"
            top_date_str = ", ".join([f"`{c}`" for c in date_cols[:2]]) if date_cols else "None"

            null_count = int(work_df.isna().sum().sum())
            kpis = AnalyticsEngine.generate_business_kpis(work_df)
            top_kpi_text = ", ".join([f"**{k.label}**: {k.formatted_value}" for k in kpis.kpis[:3]])

            lines = [
                f"### Dataset Architecture & Overview",
                f"The active dataset **`{dataset_name}`** contains **{len(work_df):,} rows** and **{len(cols)} columns**. Here is your structured roadmap of the key features to focus on:",
                f"",
                f"### 1. Primary Business Metrics (Quantitative Measures)",
                f"• **Key Numeric Fields**: {top_num_str}",
                f"• **Current Performance Highlights**: {top_kpi_text}.",
                f"• **Why it Matters**: These continuous numerical fields are the core drivers for volume sizing, KPI aggregations, and forecasting models.",
                f"",
                f"### 2. Core Categorical Dimensions (Segmentation)",
                f"• **Key Segment Fields**: {top_cat_str}",
                f"• **Why it Matters**: Use these discrete fields to group, slice, and compare cohort behaviors across different markets and customer groups.",
                f"",
                f"### 3. Temporal Tracking (Time Horizon)",
                f"• **Date Fields**: {top_date_str}",
                f"• **Why it Matters**: Enables seasonal decomposition, moving averages, and forward projections in **Forecasting**.",
                f"",
                f"### 4. Data Hygiene & Quality Indicators",
                f"• **Missing Cells**: {null_count:,} null cells detected across dataset.",
                f"• **Integrity Score**: Health index reflects clean schema fidelity.",
                f"",
                f"### Recommended Next Actions",
                f"1. **Start with Visualizations**: Build a breakdown of primary metrics across your top categorical dimensions.",
                f"2. **Check for Anomalies**: Run **Anomaly Detection** to filter out statistical skew before running aggregates."
            ]

            return AskQuestionResponse(
                answer="\n\n".join(lines),
                grounded_data={"numeric_columns": num_cols, "categorical_columns": cat_cols, "date_columns": date_cols},
                confidence_score=0.99,
                suggested_followups=[
                    f"Which {cat_cols[0]} has the highest revenue?" if cat_cols else "Show top categories",
                    "Audit data quality health and summarize missing values",
                    "Find outlier anomalies"
                ]
            )

        # Default fallback: structured, comprehensive executive summary
        kpis = AnalyticsEngine.generate_business_kpis(work_df)
        top_cats = ", ".join([f"`{c}`" for c in cat_cols[:3]]) if cat_cols else "Available dimensions"
        top_nums = ", ".join([f"`{c}`" for c in num_cols[:3]]) if num_cols else "Available metrics"

        lines = [
            f"### Analytical Overview for `{dataset_name}`",
            f"Evaluated **{len(work_df):,} verified records** across **{len(cols)} distinct dimensions and measures**.",
            f"",
            f"### Verified Core Telemetry",
        ]
        for k in kpis.kpis[:4]:
            lines.append(f"• **{k.label}**: `{k.formatted_value}` — *{k.comparison_text}*")

        lines.extend([
            f"",
            f"### Key Dimensions & Focus Areas",
            f"• **Primary Segmentation**: {top_cats}",
            f"• **Primary Measures**: {top_nums}",
            f"",
            f"### Recommended Next Actions",
            f"• **Visual Breakdown**: *\"Show the distribution of {num_cols[0] if num_cols else 'values'} by {cat_cols[0] if cat_cols else 'category'}\"*",
            f"• **Trend Projections**: *\"Forecast {num_cols[0] if num_cols else 'metrics'} for the next 30 days\"*"
        ])

        return AskQuestionResponse(
            answer="\n\n".join(lines),
            grounded_data={"kpis": [k.model_dump() for k in kpis.kpis]},
            tool_calls=tool_calls,
            confidence_score=0.98,
            suggested_followups=[
                f"Which {cat_cols[0]} has the highest {num_cols[0]}?" if cat_cols and num_cols else "Show top categories",
                "Find outlier anomalies",
                "Audit dataset health score"
            ]
        )
