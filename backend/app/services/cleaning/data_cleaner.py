import re
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np
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
)


class DataCleanerService:
    MISSING_MARKERS = {'', 'nan', 'none', 'null', 'n/a', 'na', 'undefined', '?', '-', '*', 'none', 'nil'}

    @classmethod
    def _clean_missing_markers_col(cls, series: pd.Series) -> pd.Series:
        """Replace textual missing markers and whitespace with np.nan."""
        s = series.copy()
        if s.dtype == object or pd.api.types.is_string_dtype(s):
            s = s.replace({marker: np.nan for marker in cls.MISSING_MARKERS})
            s = s.replace(r'^\s*$', np.nan, regex=True)
        return s

    @classmethod
    def impute_missing(cls, df: pd.DataFrame, req: ImputeRequest) -> Tuple[pd.DataFrame, int, str]:
        col = req.column_name
        if col not in df.columns:
            raise ValueError(f"Column '{col}' does not exist in dataset")

        res_df = df.copy()
        res_df[col] = cls._clean_missing_markers_col(res_df[col])
        initial_nulls = int(res_df[col].isna().sum())
        if initial_nulls == 0:
            return res_df, 0, f"No missing values in '{col}'"

        strat = req.strategy.lower().replace("-", "_").replace(" ", "_")
        if strat in ["drop_rows", "drop", "dropna", "drop_row"]:
            res_df = res_df.dropna(subset=[col])
            affected = initial_nulls
            msg = f"Dropped {affected} rows where '{col}' was missing"
        elif strat in ["mean"]:
            numeric_col = pd.to_numeric(res_df[col], errors='coerce')
            if numeric_col.notna().sum() > len(res_df) * 0.2:
                val = round(float(numeric_col.mean() if numeric_col.notna().any() else 0.0), 2)
            else:
                mode_vals = res_df[col].dropna().mode()
                val = mode_vals.iloc[0] if len(mode_vals) > 0 and str(mode_vals.iloc[0]).lower() not in cls.MISSING_MARKERS else "Unknown"
            res_df[col] = res_df[col].fillna(val)
            affected = initial_nulls
            msg = f"Filled {affected} missing values in '{col}' with mean ({val})"
        elif strat in ["median"]:
            numeric_col = pd.to_numeric(res_df[col], errors='coerce')
            if numeric_col.notna().sum() > len(res_df) * 0.2:
                val = round(float(numeric_col.median() if numeric_col.notna().any() else 0.0), 2)
            else:
                mode_vals = res_df[col].dropna().mode()
                val = mode_vals.iloc[0] if len(mode_vals) > 0 and str(mode_vals.iloc[0]).lower() not in cls.MISSING_MARKERS else "Unknown"
            res_df[col] = res_df[col].fillna(val)
            affected = initial_nulls
            msg = f"Filled {affected} missing values in '{col}' with median ({val})"
        elif strat in ["mode"]:
            mode_vals = res_df[col].dropna().mode()
            val = mode_vals.iloc[0] if len(mode_vals) > 0 and str(mode_vals.iloc[0]).lower() not in cls.MISSING_MARKERS else "Unknown"
            res_df[col] = res_df[col].fillna(val)
            affected = initial_nulls
            msg = f"Filled {affected} missing values in '{col}' with mode ('{val}')"
        elif strat in ["forward_fill", "ffill"]:
            mode_vals = res_df[col].dropna().mode()
            fallback = mode_vals.iloc[0] if len(mode_vals) > 0 and str(mode_vals.iloc[0]).lower() not in cls.MISSING_MARKERS else "Unknown"
            res_df[col] = res_df[col].ffill().bfill().fillna(fallback)
            affected = initial_nulls
            msg = f"Forward-filled {affected} missing values in '{col}'"
        elif strat in ["backward_fill", "bfill"]:
            mode_vals = res_df[col].dropna().mode()
            fallback = mode_vals.iloc[0] if len(mode_vals) > 0 and str(mode_vals.iloc[0]).lower() not in cls.MISSING_MARKERS else "Unknown"
            res_df[col] = res_df[col].bfill().ffill().fillna(fallback)
            affected = initial_nulls
            msg = f"Backward-filled {affected} missing values in '{col}'"
        elif strat in ["constant", "custom"]:
            val = req.constant_value if req.constant_value is not None else "0"
            res_df[col] = res_df[col].fillna(val)
            affected = initial_nulls
            msg = f"Filled {affected} missing values in '{col}' with constant '{val}'"
        else:
            numeric_col = pd.to_numeric(res_df[col], errors='coerce')
            if numeric_col.notna().sum() > len(res_df) * 0.2:
                val = round(float(numeric_col.median() if numeric_col.notna().any() else 0.0), 2)
            else:
                mode_vals = res_df[col].dropna().mode()
                val = mode_vals.iloc[0] if len(mode_vals) > 0 and str(mode_vals.iloc[0]).lower() not in cls.MISSING_MARKERS else "Unknown"
            res_df[col] = res_df[col].fillna(val)
            affected = initial_nulls
            msg = f"Filled {affected} missing values in '{col}' with ({val})"

        return res_df, affected, msg

    @classmethod
    def batch_impute(cls, df: pd.DataFrame, req: BatchImputeRequest) -> Tuple[pd.DataFrame, int, str]:
        res_df = df.copy()
        target_cols = req.column_names if req.column_names else list(res_df.columns)
        strat = req.strategy.lower().replace("-", "_").replace(" ", "_")

        # Clean missing markers across all target columns
        for col in target_cols:
            if col in res_df.columns:
                res_df[col] = cls._clean_missing_markers_col(res_df[col])

        if strat in ["drop_rows", "drop", "dropna", "drop_all_nulls", "drop_all"]:
            # Drop any row that has NaN in ANY of the target columns
            initial_rows = len(res_df)
            res_df = res_df.dropna(subset=target_cols)
            affected_rows = initial_rows - len(res_df)
            msg = f"Dropped {affected_rows:,} rows containing missing values across {len(target_cols)} columns (Zero nulls remaining)."
            return res_df, affected_rows, msg

        # Impute values
        total_filled_cells = 0
        for col in target_cols:
            if col not in res_df.columns:
                continue
            null_count = int(res_df[col].isna().sum())
            if null_count == 0:
                continue

            mode_vals = res_df[col].dropna().mode()
            mode_fallback = mode_vals.iloc[0] if len(mode_vals) > 0 and str(mode_vals.iloc[0]).lower() not in cls.MISSING_MARKERS else "Unknown"

            if strat == "mean":
                num = pd.to_numeric(res_df[col], errors='coerce')
                if num.notna().sum() > len(res_df) * 0.2:
                    val = round(float(num.mean() if num.notna().any() else 0.0), 2)
                else:
                    val = mode_fallback
                res_df[col] = res_df[col].fillna(val)
            elif strat == "median":
                num = pd.to_numeric(res_df[col], errors='coerce')
                if num.notna().sum() > len(res_df) * 0.2:
                    val = round(float(num.median() if num.notna().any() else 0.0), 2)
                else:
                    val = mode_fallback
                res_df[col] = res_df[col].fillna(val)
            elif strat == "mode":
                res_df[col] = res_df[col].fillna(mode_fallback)
            elif strat in ["forward_fill", "ffill"]:
                res_df[col] = res_df[col].ffill().bfill().fillna(mode_fallback)
            elif strat in ["backward_fill", "bfill"]:
                res_df[col] = res_df[col].bfill().ffill().fillna(mode_fallback)
            elif strat in ["constant", "custom"]:
                val = req.constant_value if req.constant_value is not None else "0"
                res_df[col] = res_df[col].fillna(val)
            else:
                num = pd.to_numeric(res_df[col], errors='coerce')
                if num.notna().sum() > len(res_df) * 0.2:
                    val = round(float(num.median() if num.notna().any() else 0.0), 2)
                else:
                    val = mode_fallback
                res_df[col] = res_df[col].fillna(val)

            total_filled_cells += null_count

        msg = f"Imputed {total_filled_cells:,} null cells across {len(target_cols)} columns (Zero nulls remaining)."
        return res_df, total_filled_cells, msg

    @staticmethod
    def deduplicate(df: pd.DataFrame, req: DeduplicateRequest) -> Tuple[pd.DataFrame, int, str]:
        res_df = df.copy()
        subset = req.subset_columns if req.subset_columns else None
        
        if req.keep == "drop_all":
            dups = res_df.duplicated(subset=subset, keep=False)
            affected = int(dups.sum())
            res_df = res_df[~dups]
            msg = f"Removed all {affected} duplicate occurrences"
        else:
            keep_val = "first" if req.keep == "first" else "last"
            dups = res_df.duplicated(subset=subset, keep=keep_val)
            affected = int(dups.sum())
            res_df = res_df[~dups]
            msg = f"Removed {affected} duplicate rows (kept {keep_val})"

        return res_df, affected, msg

    @staticmethod
    def standardize_categories(df: pd.DataFrame, req: StandardizeCategoryRequest) -> Tuple[pd.DataFrame, int, str]:
        col = req.column_name
        if col not in df.columns:
            raise ValueError(f"Column '{col}' does not exist")

        res_df = df.copy()
        affected = 0
        for orig, replacement in req.mappings.items():
            mask = res_df[col].astype(str).str.strip() == str(orig).strip()
            count = int(mask.sum())
            if count > 0:
                res_df.loc[mask, col] = replacement
                affected += count

        msg = f"Standardized {affected} values in '{col}' across {len(req.mappings)} category mappings"
        return res_df, affected, msg

    @staticmethod
    def clean_text(df: pd.DataFrame, req: TextCleanRequest) -> Tuple[pd.DataFrame, int, str]:
        col = req.column_name
        if col not in df.columns:
            raise ValueError(f"Column '{col}' not found")

        res_df = df.copy()
        series = res_df[col].astype(str)
        act = req.action.lower()
        affected = len(res_df)

        if act == "trim":
            res_df[col] = series.str.strip()
            msg = f"Trimmed whitespace on column '{col}'"
        elif act == "lowercase":
            res_df[col] = series.str.lower()
            msg = f"Converted '{col}' to lowercase"
        elif act == "uppercase":
            res_df[col] = series.str.upper()
            msg = f"Converted '{col}' to uppercase"
        elif act == "titlecase":
            res_df[col] = series.str.title()
            msg = f"Converted '{col}' to Title Case"
        elif act == "remove_symbols":
            res_df[col] = series.str.replace(r'[^\w\s]', '', regex=True)
            msg = f"Removed special symbols from '{col}'"
        elif act == "extract_numbers":
            res_df[col] = series.str.extract(r'(\d+)', expand=False)
            msg = f"Extracted numerical digits into '{col}'"
        elif act == "extract_emails":
            res_df[col] = series.str.extract(r'([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)', expand=False)
            msg = f"Extracted emails into '{col}'"
        elif act == "find_replace":
            f_str = req.find_str or ""
            r_str = req.replace_str or ""
            res_df[col] = series.str.replace(f_str, r_str, regex=False)
            msg = f"Replaced '{f_str}' with '{r_str}' in '{col}'"
        else:
            raise ValueError(f"Unknown text cleaning action '{act}'")

        return res_df, affected, msg

    @staticmethod
    def add_calculated_column(df: pd.DataFrame, req: CalculatedColumnRequest) -> Tuple[pd.DataFrame, int, str]:
        res_df = df.copy()
        expr = req.expression.strip()
        new_col = req.new_column_name.strip()

        # Validate expression: allow only alphanumeric column identifiers, basic operators + - * / ( )
        allowed_chars = re.compile(r'^[a-zA-Z0-9_\s\+\-\*\/\(\)\.\,]+$')
        if not allowed_chars.match(expr):
            raise ValueError("Expression contains invalid or unsafe characters")

        # Map column names in expression
        env_dict = {}
        for c in res_df.columns:
            clean_name = re.sub(r'\W+', '_', str(c))
            if clean_name in expr or str(c) in expr:
                numeric_series = pd.to_numeric(
                    res_df[c].astype(str).str.replace('$', '').str.replace(',', '').str.strip(),
                    errors='coerce'
                ).fillna(0)
                env_dict[clean_name] = numeric_series
                if clean_name != str(c):
                    expr = expr.replace(str(c), clean_name)

        try:
            # Safe evaluation within sandboxed environment dict
            result = eval(expr, {"__builtins__": {}}, env_dict)
            if isinstance(result, (pd.Series, np.ndarray, list)):
                res_df[new_col] = result
            else:
                res_df[new_col] = [result] * len(res_df)
        except Exception as e:
            raise ValueError(f"Failed to evaluate expression '{req.expression}': {str(e)}")

        return res_df, len(res_df), f"Created calculated column '{new_col}' = {req.expression}"

    @staticmethod
    def add_conditional_column(df: pd.DataFrame, req: ConditionalColumnRequest) -> Tuple[pd.DataFrame, int, str]:
        res_df = df.copy()
        new_col = req.new_column_name.strip()
        
        # Start with default value
        res_df[new_col] = req.default_value

        for branch in req.branches:
            branch_mask = None
            for cond in branch.conditions:
                col = cond.column
                if col not in res_df.columns:
                    continue
                
                s = res_df[col]
                op = cond.operator.lower()
                val = cond.value

                if op == "equals":
                    m = (s.astype(str) == str(val))
                elif op == "not_equals":
                    m = (s.astype(str) != str(val))
                elif op == "contains":
                    m = s.astype(str).str.contains(str(val), case=False, na=False)
                elif op == "greater_than":
                    num_s = pd.to_numeric(s, errors='coerce')
                    m = (num_s > float(val))
                elif op == "less_than":
                    num_s = pd.to_numeric(s, errors='coerce')
                    m = (num_s < float(val))
                elif op == "is_empty":
                    m = s.isna() | (s.astype(str).str.strip() == '')
                else:
                    m = pd.Series(True, index=res_df.index)

                if branch_mask is None:
                    branch_mask = m
                else:
                    if branch.logic.upper() == "OR":
                        branch_mask = branch_mask | m
                    else:
                        branch_mask = branch_mask & m

            if branch_mask is not None:
                res_df.loc[branch_mask, new_col] = branch.result_value

        return res_df, len(res_df), f"Created conditional column '{new_col}' with {len(req.branches)} conditional rules"

    @staticmethod
    def rename_columns(df: pd.DataFrame, req: ColumnRenameRequest) -> Tuple[pd.DataFrame, int, str]:
        res_df = df.rename(columns=req.mappings)
        return res_df, len(req.mappings), f"Renamed {len(req.mappings)} column(s)"

    @staticmethod
    def split_column(df: pd.DataFrame, req: ColumnSplitRequest) -> Tuple[pd.DataFrame, int, str]:
        res_df = df.copy()
        col = req.source_column
        if col not in res_df.columns:
            raise ValueError(f"Column '{col}' does not exist")

        splits = res_df[col].astype(str).str.split(req.delimiter, expand=True)
        for i, new_name in enumerate(req.new_column_names):
            if i < splits.shape[1]:
                res_df[new_name] = splits[i].str.strip()
            else:
                res_df[new_name] = None

        if not req.keep_original:
            res_df = res_df.drop(columns=[col])

        return res_df, len(res_df), f"Split column '{col}' into {len(req.new_column_names)} new columns"

    @staticmethod
    def merge_columns(df: pd.DataFrame, req: ColumnMergeRequest) -> Tuple[pd.DataFrame, int, str]:
        res_df = df.copy()
        for c in req.source_columns:
            if c not in res_df.columns:
                raise ValueError(f"Column '{c}' does not exist")

        merged = res_df[req.source_columns].astype(str).agg(req.separator.join, axis=1)
        res_df[req.new_column_name] = merged

        if not req.keep_originals:
            res_df = res_df.drop(columns=req.source_columns)

        return res_df, len(res_df), f"Merged {len(req.source_columns)} columns into '{req.new_column_name}'"

    @staticmethod
    def convert_column_types(df: pd.DataFrame, req: ColumnTypeConvertRequest) -> Tuple[pd.DataFrame, int, str]:
        res_df = df.copy()
        target = req.target_type.lower()
        missing = [col for col in req.column_names if col not in res_df.columns]
        if missing:
            raise ValueError(f"Columns do not exist: {', '.join(missing)}")

        for col in req.column_names:
            if target == "integer":
                res_df[col] = pd.to_numeric(res_df[col], errors="coerce").round().astype("Int64")
            elif target in {"decimal", "currency"}:
                cleaned = res_df[col].astype(str).str.replace(r"[$,]", "", regex=True)
                res_df[col] = pd.to_numeric(cleaned, errors="coerce")
            elif target in {"date", "datetime"}:
                res_df[col] = pd.to_datetime(res_df[col], errors="coerce")
            elif target == "boolean":
                normalized = res_df[col].astype(str).str.strip().str.lower()
                truthy = {"true", "1", "yes", "y"}
                falsy = {"false", "0", "no", "n"}
                res_df[col] = normalized.map(lambda value: True if value in truthy else False if value in falsy else pd.NA).astype("boolean")
            elif target in {"text", "string"}:
                res_df[col] = res_df[col].astype("string")
            else:
                raise ValueError(f"Unknown target type '{target}'")

        return res_df, len(res_df), f"Converted {len(req.column_names)} column(s) to {target}"

    @staticmethod
    def treat_outliers(df: pd.DataFrame, req: OutlierTreatmentRequest) -> Tuple[pd.DataFrame, int, str]:
        res_df = df.copy()
        missing = [col for col in req.column_names if col not in res_df.columns]
        if missing:
            raise ValueError(f"Columns do not exist: {', '.join(missing)}")

        masks = []
        bounds = {}
        for col in req.column_names:
            numeric = pd.to_numeric(res_df[col], errors="coerce")
            if int(numeric.notna().sum()) < max(1, int(len(numeric) * 0.5)):
                continue
            if req.method.lower() == "zscore":
                mean, std = numeric.mean(), numeric.std()
                lower, upper = mean - (3 * std), mean + (3 * std)
            else:
                q1, q3 = numeric.quantile(0.25), numeric.quantile(0.75)
                iqr = q3 - q1
                lower, upper = q1 - (1.5 * iqr), q3 + (1.5 * iqr)
            masks.append(numeric.notna() & ((numeric < lower) | (numeric > upper)))
            bounds[col] = (lower, upper)

        if not bounds:
            raise ValueError("None of the selected columns contains enough numeric values for outlier treatment")

        combined = pd.concat(masks, axis=1).any(axis=1) if masks else pd.Series(False, index=res_df.index)
        affected = int(combined.sum())
        if req.action.lower() == "remove":
            res_df = res_df.loc[~combined].copy()
            message = f"Removed {affected} rows containing selected-column outliers"
        else:
            for col, (lower, upper) in bounds.items():
                res_df[col] = pd.to_numeric(res_df[col], errors="coerce").clip(lower=lower, upper=upper)
            message = f"Capped {affected} outlier rows across {len(req.column_names)} column(s)"
        return res_df, affected, message

    @staticmethod
    def extract_date_feature(df: pd.DataFrame, req: DateExtractRequest) -> Tuple[pd.DataFrame, int, str]:
        res_df = df.copy()
        col = req.source_column
        if col not in res_df.columns:
            raise ValueError(f"Column '{col}' does not exist")

        dt_series = pd.to_datetime(res_df[col], errors='coerce')
        part = req.extract_part.lower()
        new_col = req.new_column_name

        if part == "year":
            res_df[new_col] = dt_series.dt.year
        elif part == "month":
            res_df[new_col] = dt_series.dt.month
        elif part == "day":
            res_df[new_col] = dt_series.dt.day
        elif part == "quarter":
            res_df[new_col] = dt_series.dt.quarter
        elif part == "day_of_week":
            res_df[new_col] = dt_series.dt.day_name()
        elif part == "days_since":
            now = pd.Timestamp.now()
            res_df[new_col] = (now - dt_series).dt.days
        else:
            raise ValueError(f"Unknown date extract part '{part}'")

        return res_df, len(res_df), f"Extracted '{part}' from '{col}' into '{new_col}'"
