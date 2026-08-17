from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from app.schemas.ai import ChartRecommendation


class ChartService:
    @classmethod
    def recommend_charts_for_dataset(cls, df: pd.DataFrame) -> List[ChartRecommendation]:
        recommendations: List[ChartRecommendation] = []
        cols = df.columns

        # Classify columns
        date_cols = []
        cat_cols = []
        num_cols = []

        for c in cols:
            c_low = str(c).lower()
            if 'id' in c_low or 'key' in c_low or 'zip' in c_low:
                continue

            try:
                # Check date
                converted_dt = pd.to_datetime(df[c].dropna().head(20), errors='coerce')
                if converted_dt.notna().sum() > 10:
                    date_cols.append(str(c))
                    continue
            except Exception:
                pass

            # Check numeric
            num_clean = pd.to_numeric(
                df[c].astype(str).str.replace('$', '').str.replace(',', '').str.replace('%', ''),
                errors='coerce'
            )
            if num_clean.notna().sum() / max(1, len(df)) > 0.6:
                num_cols.append(str(c))
            elif df[c].nunique() <= 30:
                cat_cols.append(str(c))

        # 1. Date + Numeric -> Line Chart / Area Chart (Trend)
        if date_cols and num_cols:
            d_col = date_cols[0]
            n_col = num_cols[0]
            try:
                work = df[[d_col, n_col]].copy()
                work[d_col] = pd.to_datetime(work[d_col], errors='coerce')
                work[n_col] = pd.to_numeric(work[n_col].astype(str).str.replace('$', '').str.replace(',', ''), errors='coerce')
                work = work.dropna().sort_values(by=d_col)
                # Group by date/month
                work['period'] = work[d_col].dt.strftime('%Y-%m')
                grouped = work.groupby('period')[n_col].sum().reset_index().head(24)
                
                chart_data = grouped.rename(columns={'period': d_col}).to_dict(orient="records")
                recommendations.append(ChartRecommendation(
                    chart_type="line",
                    title=f"{n_col} Over Time",
                    x_axis=d_col,
                    y_axis=n_col,
                    aggregation="sum",
                    data=chart_data,
                    explanation=f"Shows historical evolution and trajectory of {n_col} across recording periods."
                ))
            except Exception:
                pass

        # 2. Categorical + Numeric -> Bar Chart (Category Breakdown)
        if cat_cols and num_cols:
            c_col = cat_cols[0]
            n_col = num_cols[0]
            try:
                work = df[[c_col, n_col]].copy()
                work[n_col] = pd.to_numeric(work[n_col].astype(str).str.replace('$', '').str.replace(',', ''), errors='coerce')
                grouped = work.groupby(c_col)[n_col].sum().reset_index().sort_values(by=n_col, ascending=False).head(10)
                chart_data = grouped.to_dict(orient="records")
                recommendations.append(ChartRecommendation(
                    chart_type="bar",
                    title=f"Total {n_col} by {c_col}",
                    x_axis=c_col,
                    y_axis=n_col,
                    aggregation="sum",
                    data=chart_data,
                    explanation=f"Highlights performance distribution of {n_col} across top {c_col} segments."
                ))
            except Exception:
                pass

        # 3. Numeric + Numeric -> Scatter Plot (Relationship)
        if len(num_cols) >= 2:
            n1 = num_cols[0]
            n2 = num_cols[1]
            try:
                work = df[[n1, n2]].copy()
                work[n1] = pd.to_numeric(work[n1].astype(str).str.replace('$', '').str.replace(',', ''), errors='coerce')
                work[n2] = pd.to_numeric(work[n2].astype(str).str.replace('$', '').str.replace(',', ''), errors='coerce')
                sample = work.dropna().head(100).to_dict(orient="records")
                recommendations.append(ChartRecommendation(
                    chart_type="scatter",
                    title=f"{n1} vs {n2} Relationship",
                    x_axis=n1,
                    y_axis=n2,
                    data=sample,
                    explanation=f"Visualizes correlation and density distribution between {n1} and {n2}."
                ))
            except Exception:
                pass

        # 4. Categorical Breakdown -> Donut / Pie
        if cat_cols:
            c_col = cat_cols[min(1, len(cat_cols)-1)]
            val_counts = df[c_col].dropna().value_counts().head(6).reset_index()
            val_counts.columns = [c_col, "count"]
            chart_data = val_counts.to_dict(orient="records")
            recommendations.append(ChartRecommendation(
                chart_type="donut",
                title=f"{c_col} Composition",
                x_axis=c_col,
                y_axis="count",
                data=chart_data,
                explanation=f"Shows market share and category composition proportions for {c_col}."
            ))

        return recommendations
