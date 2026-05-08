# PEIX Allergy Media Index

Trigger-based media MVP for OTC allergy campaigns.

The app combines public environmental signals into a regional `PEIX Allergy Media Index`:

- DWD pollen forecast
- Open-Meteo weather forecast
- Open-Meteo air-quality forecast as public UBA/CAMS-style fallback signal
- Neutral demand proxy until a compliant regional search connector is added

The product stays privacy-safe: it ranks environmental contexts by region and does not target individual health profiles.

## Local

```bash
npm test
npm run local
```

Open `http://localhost:3000`.

## Deploy

```bash
vercel deploy -y
```

This creates a Vercel Preview deployment.
