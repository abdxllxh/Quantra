import re
from typing import Tuple, Dict, Any, List
import pandas as pd
import numpy as np


class SchemaDetector:
    EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')
    URL_REGEX = re.compile(r'^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$')
    PHONE_REGEX = re.compile(r'^\+?(\d[\d\-. ]+)?(\([\d\-. ]+\))?[\d\-. ]+\d$')
    CURRENCY_SYMBOLS = {'$', '€', '£', '¥', '₹', '₱', '₩', '₣', 'A$', 'C$'}
    COMMON_COUNTRIES = {
        'united states', 'usa', 'us', 'canada', 'united kingdom', 'uk', 'germany', 'france',
        'australia', 'india', 'japan', 'china', 'brazil', 'mexico', 'italy', 'spain', 'singapore',
        'netherlands', 'switzerland', 'sweden', 'new zealand', 'south africa', 'uae', 'dubai'
    }

    @classmethod
    def infer_column_type(cls, series: pd.Series, col_name: str) -> Tuple[str, float, bool]:
        """
        Infers column type, confidence (0-1.0), and whether it might contain PII/sensitive data.
        Returns: (type_name, confidence, is_sensitive)
        """
        valid_values = series.dropna()
        total_valid = len(valid_values)
        if total_valid == 0:
            return "text", 0.5, False

        col_lower = str(col_name).lower().strip()
        str_samples = [str(x).strip() for x in valid_values.iloc[:min(200, total_valid)]]
        str_samples = [s for s in str_samples if s]
        if not str_samples:
            return "text", 0.5, False

        # Check for Boolean
        bool_matches = sum(1 for s in str_samples if s.lower() in {'true', 'false', 'yes', 'no', 't', 'f', '1', '0'})
        if bool_matches / len(str_samples) > 0.9 and ('is_' in col_lower or 'has_' in col_lower or len(set(s.lower() for s in str_samples)) <= 2):
            return "boolean", 0.95, False

        # Check for Email
        email_matches = sum(1 for s in str_samples if cls.EMAIL_REGEX.match(s))
        if email_matches / len(str_samples) > 0.7 or 'email' in col_lower:
            if email_matches / len(str_samples) > 0.5:
                return "email", 0.98, True

        date_keywords = ['date', 'time', 'created', 'updated', 'timestamp', 'dob', 'period', 'year', 'month']
        has_date_kw = any(kw in col_lower for kw in date_keywords)

        # Check for URL. Require a URL-like prefix or alphabetic hostname so decimal
        # values such as "6.5" are not mistaken for domains.
        url_matches = sum(
            1 for s in str_samples
            if s.lower().startswith(("http://", "https://", "www."))
            or (bool(cls.URL_REGEX.match(s)) and any(c.isalpha() for c in s))
        )
        if (url_matches / len(str_samples) > 0.7 or 'url' in col_lower or 'website' in col_lower) and url_matches / len(str_samples) > 0.4:
            return "url", 0.95, False

        # Check for Phone
        phone_matches = sum(1 for s in str_samples if cls.PHONE_REGEX.match(s) and sum(c.isdigit() for c in s) >= 7)
        if not has_date_kw and (phone_matches / len(str_samples) > 0.7 or 'phone' in col_lower or 'mobile' in col_lower) and phone_matches / len(str_samples) > 0.4:
            return "phone", 0.92, True

        # Check for Coordinates
        if 'latitude' in col_lower or col_lower in ['lat', 'latitude']:
            return "latitude", 0.99, False
        if 'longitude' in col_lower or col_lower in ['lon', 'lng', 'longitude']:
            return "longitude", 0.99, False

        # Check for Country
        country_matches = sum(1 for s in str_samples if s.lower() in cls.COMMON_COUNTRIES)
        if country_matches / len(str_samples) > 0.6 or 'country' in col_lower:
            return "country", 0.90, False

        # Check for Currency
        has_curr_symbol = sum(1 for s in str_samples if any(sym in s for sym in cls.CURRENCY_SYMBOLS) or 'revenue' in col_lower or 'sales' in col_lower or 'price' in col_lower or 'cost' in col_lower or 'profit' in col_lower or 'amount' in col_lower)
        if has_curr_symbol / len(str_samples) > 0.5:
            # Check if values after stripping symbols are numeric
            cleaned_nums = []
            for s in str_samples:
                clean = re.sub(r'[\$,€,£,¥,₹, ]', '', s)
                try:
                    cleaned_nums.append(float(clean))
                except Exception:
                    pass
            if len(cleaned_nums) / len(str_samples) > 0.6:
                return "currency", 0.96, False

        # Check for Percentage
        pct_matches = sum(1 for s in str_samples if '%' in s or 'margin' in col_lower or 'rate' in col_lower or 'discount' in col_lower or 'pct' in col_lower)
        if pct_matches / len(str_samples) > 0.6:
            return "percentage", 0.92, False

        # Check for Datetime / Date
        try:
            converted = pd.to_datetime(valid_values.iloc[:min(50, total_valid)], errors='coerce')
            valid_dt_ratio = converted.notna().sum() / min(50, total_valid)
            if (has_date_kw or pd.api.types.is_datetime64_any_dtype(valid_values)) and valid_dt_ratio > 0.8:
                # Check if it has time component
                has_time = any(dt.hour != 0 or dt.minute != 0 or dt.second != 0 for dt in converted.dropna())
                return ("datetime" if has_time else "date"), 0.95, False
        except Exception:
            pass

        # Check for Numeric (Integer vs Decimal)
        if pd.api.types.is_numeric_dtype(valid_values):
            if pd.api.types.is_integer_dtype(valid_values) or (valid_values % 1 == 0).all():
                if ('id' in col_lower or 'identifier' in col_lower or 'code' in col_lower or 'zip' in col_lower) and valid_values.nunique() / total_valid > 0.8:
                    return "identifier", 0.90, ('id' in col_lower or 'ssn' in col_lower)
                return "integer", 0.98, False
            else:
                return "decimal", 0.98, False

        # Try converting string series to numeric
        numeric_attempt = pd.to_numeric(valid_values.astype(str).str.replace(',', '').str.strip(), errors='coerce')
        if numeric_attempt.notna().sum() / total_valid > 0.85:
            if (numeric_attempt.dropna() % 1 == 0).all():
                if ('id' in col_lower or 'code' in col_lower) and numeric_attempt.nunique() / total_valid > 0.8:
                    return "identifier", 0.90, False
                return "integer", 0.94, False
            return "decimal", 0.94, False

        # Check for Identifier
        if ('id' in col_lower or 'uuid' in col_lower or 'guid' in col_lower or 'key' in col_lower) and valid_values.nunique() / total_valid > 0.8:
            return "identifier", 0.90, True

        # Check for Category vs Text
        unique_ratio = valid_values.nunique() / total_valid
        if unique_ratio < 0.2 and valid_values.nunique() <= 50:
            return "category", 0.92, False

        is_sensitive = any(k in col_lower for k in ['name', 'first_name', 'last_name', 'address', 'ssn', 'tax', 'card', 'customer'])
        return "text", 0.85, is_sensitive
