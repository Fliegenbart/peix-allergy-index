# PEIX Allergy Media Index Methodology

## Current Status

The current index is an evidence-informed MVP prior, not a validated clinical or media outcome model.

The included signals are scientifically plausible:

- Pollen exposure is the primary allergy-pressure signal.
- Weather modulates exposure through rain, wind, humidity, and temperature.
- Air quality can aggravate irritation and may interact with allergenic exposure.
- Google demand can proxy public allergy attention, but the MVP currently uses national Google Trends RSS, not a regional Keyword Planner feed.

The exact component weights are not yet learned from outcome data.

## MVP Prior Weights

| Component | Weight | Why It Exists | Status |
| --- | ---: | --- | --- |
| Pollen pressure | 45% | Direct domain signal for allergic exposure. | MVP prior |
| Weather modifier | 25% | Determines whether pollen is airborne or suppressed by rain. | MVP prior |
| Air-quality multiplier | 15% | PM, ozone, and NO2 can aggravate symptoms or irritation. | MVP prior |
| Demand proxy | 10% | Google demand can validate public allergy attention. | MVP prior |
| Source confidence | 5% | Prevents activation from one noisy or incomplete source. | MVP prior |

## Required Calibration Data

To move from heuristic prior to learned weights, build a daily region panel with:

- DWD pollen by region and pollen type.
- Weather: precipitation, wind, humidity, temperature.
- Air quality: PM10, PM2.5, ozone, NO2.
- Google demand: ideally Google Ads Keyword Planner or Trends API by region.
- Media data: spend, CPM, CTR, conversions, channel, creative, geography.
- Business outcomes: pharmacy sell-out, retail media conversions, search lift, ROAS.

## Calibration Approach

Start transparent before complex:

1. Fit ridge or elastic-net models against next-day demand or sales.
2. Fit GAM models to capture non-linear weather and pollen effects.
3. Compare regional hierarchical models because pollen response differs by region and plant type.
4. Backtest ranking quality against seasonal baselines.
5. Promote learned weights only if they improve out-of-sample lift and remain explainable.

## Backtest Gates

Do not automate budget changes until the index beats baseline on:

- Lead-time precision: high-index regions predict demand before same-day alerts.
- Ranking lift: top-decile index regions outperform average regions.
- Budget regret: allocation based on the index beats flat seasonal spend.
- Robustness: performance holds across regions, pollen types, and rain days.
- Explainability: client-facing reason codes remain stable and understandable.

## Product Rule

Until those gates pass, the dashboard should label the model as:

> Evidence-informed MVP prior. Backtest required before automated media buying.
