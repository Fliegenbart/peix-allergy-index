# Outcome Data Schema

Place measured outcome data in `data/outcomes/allergy-outcomes.csv`.

Required columns:

```csv
date,regionCode,metric,value
2026-05-09,NW,pharmacy_sellout,140
```

Useful metrics for calibration:

- `pharmacy_sellout`
- `google_search_interest`
- `paid_search_ctr`
- `campaign_conversion_rate`
- `incremental_roas`

The daily forecast snapshots are created from public sources. Outcome data should come from client media, pharmacy, or search reporting exports.
