# PEIX Allergy Media Index

Trigger-based media MVP for OTC allergy campaigns.

The app combines public environmental signals into a regional `PEIX Allergy Media Index`:

- DWD pollen forecast
- Open-Meteo weather forecast
- Open-Meteo air-quality forecast as public UBA/CAMS-style fallback signal
- Google Trends RSS as national demand proxy until a compliant regional search connector is added

The product stays privacy-safe: it ranks environmental contexts by region and does not target individual health profiles.

## Forecast Machine

The project now has a small validation machine:

1. The live API builds tomorrow's regional forecast snapshot from public sources.
2. `npm run capture` stores that forecast as durable JSON in `data/snapshots`.
3. A GitHub Action runs the capture once per day and commits the snapshot.
4. Outcome data can be placed in `data/outcomes/allergy-outcomes.csv`.
5. `npm run backtest` compares stored forecasts with those outcomes.

Outcome CSV format:

```csv
date,regionCode,metric,value
2026-05-09,NW,pharmacy_sellout,140
```

The dashboard calls `/api/validation` and shows whether the machine is still collecting data or already ready for backtesting.

## Local

```bash
npm test
npm run local
```

Open `http://localhost:3000`.

Useful local commands:

```bash
npm run capture
npm run backtest
```

## Deploy

```bash
vercel deploy -y
```

This creates a Vercel Preview deployment.
