import math
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from app.schemas.anomaly import (
    AnomalyItem,
    AnomalyResultsResponse,
    AnomalyColumnSummary,
    AnomalyDetectionConfig,
    AnomalyScatterPoint
)


class AnomalyDetectorService:
    @staticmethod
    def _clean_numeric_series(series: pd.Series) -> Tuple[pd.Series, pd.Series]:
        """Returns cleaned numeric series and mask of non-nulls."""
        if pd.api.types.is_numeric_dtype(series):
            clean = pd.to_numeric(series, errors='coerce')
        else:
            clean = pd.to_numeric(
                series.astype(str).str.replace('$', '').str.replace(',', '').str.replace('%', '').str.strip(),
                errors='coerce'
            )
        return clean, clean.notna()

    @classmethod
    def detect_iqr_anomalies(cls, series: pd.Series, col_name: str) -> List[AnomalyItem]:
        clean, valid_mask = cls._clean_numeric_series(series)
        valid_vals = clean[valid_mask]
        if len(valid_vals) < 10:
            return []

        q25 = float(valid_vals.quantile(0.25))
        q75 = float(valid_vals.quantile(0.75))
        iqr = q75 - q25
        if iqr == 0:
            return []

        # Use 2.5x IQR for high-precision outlier boundary
        lower_bound = q25 - 2.5 * iqr
        upper_bound = q75 + 2.5 * iqr
        extreme_lower = q25 - 4.0 * iqr
        extreme_upper = q75 + 4.0 * iqr
        median_val = float(valid_vals.median())
        denom = abs(median_val) if median_val != 0 else 1.0

        # Vectorized filter
        mask = (valid_vals < lower_bound) | (valid_vals > upper_bound)
        outlier_vals = valid_vals[mask]
        if len(outlier_vals) == 0:
            return []

        anomalies = []
        for idx, val in outlier_vals.items():
            is_extreme = (val < extreme_lower or val > extreme_upper)
            dev_pct = round(((val - median_val) / denom) * 100, 1)
            
            # Normalized Anomaly score (0 - 100)
            dist_from_bound = max(0.0, float(val - upper_bound)) if val > upper_bound else max(0.0, float(lower_bound - val))
            score = min(100.0, 65.0 + (dist_from_bound / iqr) * 15.0)
            
            severity = "critical" if score >= 88 or is_extreme else ("high" if score >= 75 else "medium")
            direction = "higher" if val > upper_bound else "lower"
            reason = f"Value of {val:,.2f} is significantly {direction} than typical range ({lower_bound:,.1f} to {upper_bound:,.1f}) with {dev_pct:+}% deviation from median."

            anomalies.append(AnomalyItem(
                row_index=int(idx),
                column_name=str(col_name),
                actual_value=round(float(val), 2) if isinstance(val, (int, float, np.number)) else str(val),
                expected_range=f"{round(lower_bound, 1)} – {round(upper_bound, 1)}",
                deviation_pct=dev_pct,
                anomaly_score=round(score, 1),
                severity=severity,
                detection_method="iqr",
                reason=reason,
                is_valid=False
            ))
        return anomalies

    @classmethod
    def detect_zscore_anomalies(cls, series: pd.Series, col_name: str, threshold: float = 3.5) -> List[AnomalyItem]:
        clean, valid_mask = cls._clean_numeric_series(series)
        valid_vals = clean[valid_mask]
        if len(valid_vals) < 10:
            return []

        mean_val = float(valid_vals.mean())
        std_val = float(valid_vals.std())
        if std_val == 0:
            return []

        # Vectorized z-score calculation
        z_series = (valid_vals - mean_val).abs() / std_val
        mask = z_series >= threshold
        outlier_vals = valid_vals[mask]
        outlier_z = z_series[mask]
        if len(outlier_vals) == 0:
            return []

        denom = abs(mean_val) if mean_val != 0 else 1.0
        anomalies = []
        for (idx, val), (_, z) in zip(outlier_vals.items(), outlier_z.items()):
            dev_pct = round(((val - mean_val) / denom) * 100, 1)
            score = min(100.0, (float(z) / threshold) * 75.0)
            severity = "critical" if z >= 4.5 else ("high" if z >= 3.5 else "medium")
            
            direction = "above" if val > mean_val else "below"
            reason = f"Z-score of {round(float(z), 2)}σ is {direction} normal variance from mean ({round(mean_val, 2)})."

            anomalies.append(AnomalyItem(
                row_index=int(idx),
                column_name=str(col_name),
                actual_value=round(float(val), 2) if isinstance(val, (int, float, np.number)) else str(val),
                expected_range=f"{round(mean_val - 2.5*std_val, 1)} – {round(mean_val + 2.5*std_val, 1)}",
                deviation_pct=dev_pct,
                anomaly_score=round(score, 1),
                severity=severity,
                detection_method="zscore",
                reason=reason,
                is_valid=False
            ))
        return anomalies

    @classmethod
    def detect_isolation_forest(cls, df: pd.DataFrame, numeric_cols: List[str], contamination: float = 0.02) -> List[AnomalyItem]:
        if len(df) < 20 or not numeric_cols:
            return []

        mat = pd.DataFrame()
        col_medians = {}
        col_stds = {}
        for col in numeric_cols:
            clean, _ = cls._clean_numeric_series(df[col])
            med = float(clean.median()) if clean.notna().any() else 0.0
            col_medians[col] = med
            filled = clean.fillna(med)
            mat[col] = filled
            std = float(filled.std())
            col_stds[col] = std if std > 0 else 1.0

        if mat.shape[1] == 0:
            return []

        try:
            iso = IsolationForest(
                n_estimators=50,
                max_samples=min(256, len(df)),
                contamination=contamination,
                random_state=42,
                n_jobs=-1
            )
            preds = iso.fit_predict(mat.values)
            scores = -iso.score_samples(mat.values)

            anom_indices = np.where(preds == -1)[0]
            if len(anom_indices) == 0:
                return []

            anomalies = []
            mat_vals = mat.values
            num_cols_arr = np.array(numeric_cols)
            med_arr = np.array([col_medians[c] for c in numeric_cols])
            std_arr = np.array([col_stds[c] for c in numeric_cols])

            for idx in anom_indices:
                score = float(scores[idx])
                row_vals = mat_vals[idx]
                diffs = np.abs(row_vals - med_arr) / std_arr
                worst_col_idx = int(np.argmax(diffs))
                worst_col = num_cols_arr[worst_col_idx]
                actual_val = df.iloc[idx][worst_col]
                col_med = med_arr[worst_col_idx]
                denom = abs(col_med) if col_med != 0 else 1.0
                dev_pct = round(((actual_val - col_med) / denom) * 100, 1) if isinstance(actual_val, (int, float, np.number)) else None

                norm_score = min(100.0, max(70.0, score * 110.0))
                severity = "critical" if norm_score > 85 else "high"

                anomalies.append(AnomalyItem(
                    row_index=int(idx),
                    column_name=str(worst_col),
                    actual_value=actual_val,
                    expected_range="Multivariate centroid ± 2.5σ",
                    deviation_pct=dev_pct,
                    anomaly_score=round(norm_score, 1),
                    severity=severity,
                    detection_method="isolation_forest",
                    reason=f"Isolation Forest flagged rare multidimensional combination driven by '{worst_col}'.",
                    is_valid=False
                ))
            return anomalies
        except Exception:
            return []

    @classmethod
    def analyze_dataset_anomalies(
        cls,
        df: pd.DataFrame,
        dataset_id: str,
        config: Optional[AnomalyDetectionConfig] = None
    ) -> AnomalyResultsResponse:
        config = config or AnomalyDetectionConfig()
        
        numeric_cols = []
        for col in df.columns:
            clean, valid_mask = cls._clean_numeric_series(df[col])
            if valid_mask.sum() / max(1, len(df)) > 0.6:
                col_low = str(col).lower()
                if not any(k in col_low for k in ['id', 'key', 'zip', 'phone', 'year']):
                    numeric_cols.append(str(col))

        all_anomalies_map: Dict[Tuple[int, str], AnomalyItem] = {}
        column_summaries: List[AnomalyColumnSummary] = []

        for col in numeric_cols:
            series = df[col]
            clean, valid_mask = cls._clean_numeric_series(series)
            valid_vals = clean[valid_mask]
            
            iqr_results = cls.detect_iqr_anomalies(series, col)
            z_results = cls.detect_zscore_anomalies(series, col, threshold=config.z_threshold or 3.5)

            col_anomalies = []
            for a in iqr_results:
                key = (a.row_index, a.column_name)
                all_anomalies_map[key] = a
                col_anomalies.append(a)

            for a in z_results:
                key = (a.row_index, a.column_name)
                if key in all_anomalies_map:
                    existing = all_anomalies_map[key]
                    existing.anomaly_score = min(100.0, existing.anomaly_score + 10.0)
                    existing.detection_method = f"{existing.detection_method}+zscore"
                else:
                    all_anomalies_map[key] = a
                    col_anomalies.append(a)

            if col_anomalies:
                q25 = float(valid_vals.quantile(0.25)) if len(valid_vals) > 0 else 0.0
                q75 = float(valid_vals.quantile(0.75)) if len(valid_vals) > 0 else 0.0
                iqr = q75 - q25
                max_sev = "critical" if any(a.severity == "critical" for a in col_anomalies) else "high"

                column_summaries.append(AnomalyColumnSummary(
                    column_name=col,
                    anomaly_count=len(col_anomalies),
                    anomaly_percentage=round((len(col_anomalies) / max(1, len(df))) * 100, 2),
                    max_severity=max_sev,
                    methods_used=["iqr", "zscore"],
                    typical_min=round(q25 - 2.5 * iqr, 2),
                    typical_max=round(q75 + 2.5 * iqr, 2)
                ))

        # Multivariate Isolation Forest
        if config.method in ["auto", "isolation_forest"] and len(numeric_cols) >= 2 and len(df) >= 20:
            ml_anomalies = cls.detect_isolation_forest(df, numeric_cols, contamination=config.contamination)
            for a in ml_anomalies:
                key = (a.row_index, a.column_name)
                if key not in all_anomalies_map:
                    all_anomalies_map[key] = a

        final_anomalies = list(all_anomalies_map.values())
        final_anomalies.sort(key=lambda x: x.anomaly_score, reverse=True)

        # Build scatter plot baseline points
        primary_col = numeric_cols[0] if numeric_cols else None
        scatter_points: List[AnomalyScatterPoint] = []
        if primary_col:
            clean_primary, _ = cls._clean_numeric_series(df[primary_col])
            anom_row_map = {a.row_index: a for a in final_anomalies if a.column_name == primary_col}
            
            # Subsample up to 200 rows evenly
            step = max(1, len(df) // 150)
            sampled_indices = list(range(0, len(df), step))
            # Ensure all anomaly rows are included
            for r_idx in anom_row_map.keys():
                if r_idx not in sampled_indices:
                    sampled_indices.append(r_idx)
            sampled_indices.sort()

            for r_idx in sampled_indices:
                if r_idx < len(clean_primary) and pd.notna(clean_primary.iloc[r_idx]):
                    val = float(clean_primary.iloc[r_idx])
                    anom_item = anom_row_map.get(r_idx)
                    scatter_points.append(AnomalyScatterPoint(
                        row_index=r_idx + 1,
                        column_name=primary_col,
                        value=val,
                        is_anomaly=anom_item is not None,
                        score=anom_item.anomaly_score if anom_item else 0.0,
                        reason=anom_item.reason if anom_item else None,
                        severity=anom_item.severity if anom_item else None
                    ))

        high_risk = sum(1 for a in final_anomalies if a.severity in ["high", "critical"])
        med_risk = sum(1 for a in final_anomalies if a.severity == "medium")
        low_risk = sum(1 for a in final_anomalies if a.severity == "low")
        affected_rows = len(set(a.row_index for a in final_anomalies))
        affected_cols = len(set(a.column_name for a in final_anomalies))

        return AnomalyResultsResponse(
            dataset_id=dataset_id,
            total_anomalies=len(final_anomalies),
            high_risk_count=high_risk,
            medium_risk_count=med_risk,
            low_risk_count=low_risk,
            affected_columns_count=affected_cols,
            affected_rows_count=affected_rows,
            anomalies=final_anomalies[:100],
            column_summaries=column_summaries,
            scatter_points=scatter_points
        )
