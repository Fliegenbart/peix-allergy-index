const { getMethodology, INDEX_COMPONENT_WEIGHTS } = require("../lib/allergy-index");

module.exports = async function handler(request, response) {
  const format = request.query && request.query.format;
  const whitepaper = buildWhitepaper();

  response.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");

  if (format === "markdown" || format === "md") {
    response.setHeader("Content-Type", "text/markdown; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      'attachment; filename="PEIX-Allergy-Index-Whitepaper.md"'
    );
    response.status(200).send(formatAsMarkdown(whitepaper));
  } else if (format === "text") {
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.status(200).send(formatAsText(whitepaper));
  } else {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.status(200).json(whitepaper);
  }
};

function buildWhitepaper() {
  const methodology = getMethodology();

  return {
    title: "PEIX Allergy Media Index",
    subtitle: "Methodik-Dokumentation fuer kontextuelle OTC-Allergie-Kampagnen",
    version: methodology.version,
    generatedAt: new Date().toISOString(),

    executiveSummary: {
      purpose:
        "Der PEIX Allergy Media Index ermoeglicht die datengetriebene Aktivierung von OTC-Allergiemedikament-Kampagnen basierend auf Umweltkontext statt individueller Gesundheitsdaten.",
      approach:
        "Kombination von oeffentlichen Umweltsignalen (Pollenflug, Wetter, Luftqualitaet) mit aggregierten Nachfragesignalen zu einem regionalen Media-Index.",
      privacyModel:
        "Rein kontextuelles Targeting ohne persoenliche Gesundheitsprofile. DSGVO-konform und HWG-kompatibel.",
      status: "MVP mit transparenten Prior-Gewichtungen. Backtest-Validierung erforderlich vor Automatisierung.",
    },

    signalArchitecture: {
      overview:
        "Der Index kombiniert fuenf unabhaengige Signalquellen zu einem taeglichen regionalen Score (0-100).",
      components: Object.entries(INDEX_COMPONENT_WEIGHTS).map(([key, comp]) => ({
        name: comp.label,
        weight: `${Math.round(comp.weight * 100)}%`,
        evidenceLevel: comp.evidenceLevel,
        calibrationStatus: comp.calibrationStatus,
        rationale: comp.rationale,
      })),
    },

    dataSources: [
      {
        name: "DWD Pollenflug-Gefahrenindex",
        provider: "Deutscher Wetterdienst",
        type: "Oeffentliche API",
        coverage: "16 Bundeslaender, 8 Pollentypen",
        latency: "Taeglich aktualisiert",
        url: "https://opendata.dwd.de/climate_environment/health/alerts/",
      },
      {
        name: "Open-Meteo Wetter-Forecast",
        provider: "Open-Meteo",
        type: "Oeffentliche API",
        coverage: "Punktgenaue Koordinaten pro Bundesland",
        latency: "Stuendlich aktualisiert",
        url: "https://open-meteo.com/",
      },
      {
        name: "Open-Meteo Luftqualitaet",
        provider: "Open-Meteo / Copernicus",
        type: "Oeffentliche API",
        coverage: "PM10, PM2.5, NO2, Ozon pro Region",
        latency: "Stuendlich aktualisiert",
        url: "https://open-meteo.com/",
      },
      {
        name: "Google Trends Regional",
        provider: "Google",
        type: "RSS Feed",
        coverage: "16 Bundeslaender, Allergie-Keywords",
        latency: "Taeglich aktualisiert",
        url: "https://trends.google.com/trending/rss",
      },
    ],

    activationLogic: {
      description:
        "Der Index uebersetzt Umweltbedingungen in konkrete Media-Aktivierungsempfehlungen.",
      actions: [
        {
          action: "BOOST",
          threshold: "mediaIndex >= 80 UND confidence >= 60",
          budgetShift: "+150%",
          channels: ["Mobile Display", "Paid Social", "Retail Media", "Apotheken DOOH"],
          rationale:
            "Hohe Pollenbelastung bei guenstigen Wetterbedingungen rechtfertigt aggressive Reichweiten-Expansion.",
        },
        {
          action: "PREPARE",
          threshold: "mediaIndex >= 65 UND confidence >= 55",
          budgetShift: "+60%",
          channels: ["Programmatic Reserve", "Search Budget Ready", "Apotheken-Inventar"],
          rationale:
            "Steigende Belastung erfordert Inventar-Sicherung und Search-Bereitschaft.",
        },
        {
          action: "HOLD",
          threshold: "mediaIndex >= 45",
          budgetShift: "0%",
          channels: ["Monitoring", "Frequency Cap beibehalten"],
          rationale: "Moderate Bedingungen rechtfertigen Baseline-Aktivitaet.",
        },
        {
          action: "PAUSE",
          threshold: "mediaIndex < 45 ODER Regen-Bremse aktiv",
          budgetShift: "-100%",
          channels: ["Paid Media pausieren", "Organic Content beibehalten"],
          rationale:
            "Niedrige Belastung oder Regen macht Allergie-Werbung ineffizient.",
        },
      ],
    },

    validationFramework: {
      currentStatus: methodology.validationStatus,
      backtestGates: [
        {
          gate: "Lead-Time Precision",
          description:
            "High-Index-Regionen sagen Nachfrage voraus, bevor Same-Day-Alerts greifen.",
        },
        {
          gate: "Ranking Lift",
          description:
            "Top-Dezil-Index-Regionen performen besser als Durchschnitt.",
        },
        {
          gate: "Budget Regret",
          description:
            "Index-basierte Allokation schlaegt flache saisonale Verteilung.",
        },
        {
          gate: "Robustheit",
          description:
            "Performance haelt ueber Regionen, Pollentypen und Wetterbedingungen.",
        },
        {
          gate: "Erklaerbarkeit",
          description:
            "Reason Codes bleiben stabil und verstaendlich fuer Pharma-Kunden.",
        },
      ],
      calibrationTargets: methodology.calibrationTargets,
      calibrationRoadmap: methodology.calibrationRoadmap,
    },

    complianceStatement: {
      targetingMode: "Kontextuelles Umwelt-Targeting",
      personalHealthData: false,
      individualProfiling: false,
      gdprBasis: "Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO)",
      hwgCompliance:
        "Keine gesundheitsbezogene Zielgruppenansprache, nur Umweltkontext-Trigger.",
      dataRetention:
        "Forecast-Snapshots werden fuer Validierung gespeichert, enthalten keine personenbezogenen Daten.",
    },

    technicalSpecification: {
      deployment: "Vercel Serverless Functions",
      dataRefresh: "15 Minuten Cache, taeglich neue Snapshots",
      apiEndpoints: [
        { path: "/api/allergy-index", description: "Live Media Index mit Rankings" },
        { path: "/api/transparency-report", description: "Compliance-Report mit Begruendungen" },
        { path: "/api/whitepaper", description: "Diese Methodik-Dokumentation" },
        { path: "/api/validation", description: "Backtest-Status und Metriken" },
      ],
      github: "https://github.com/Fliegenbart/peix-allergy-index",
    },

    contact: {
      organization: "PEIX Healthcare",
      useCase: "Media-Aktivierung fuer OTC-Allergie-Kampagnen",
    },
  };
}

function formatAsMarkdown(wp) {
  const lines = [];

  lines.push(`# ${wp.title}`);
  lines.push(`## ${wp.subtitle}`);
  lines.push("");
  lines.push(`**Version:** ${wp.version}  `);
  lines.push(`**Stand:** ${wp.generatedAt.slice(0, 10)}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  lines.push("## Executive Summary");
  lines.push("");
  lines.push(`**Zweck:** ${wp.executiveSummary.purpose}`);
  lines.push("");
  lines.push(`**Ansatz:** ${wp.executiveSummary.approach}`);
  lines.push("");
  lines.push(`**Datenschutz:** ${wp.executiveSummary.privacyModel}`);
  lines.push("");
  lines.push(`**Status:** ${wp.executiveSummary.status}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  lines.push("## Signal-Architektur");
  lines.push("");
  lines.push(wp.signalArchitecture.overview);
  lines.push("");
  lines.push("| Komponente | Gewicht | Evidenz-Level | Begruendung |");
  lines.push("|------------|---------|---------------|-------------|");
  for (const comp of wp.signalArchitecture.components) {
    lines.push(
      `| ${comp.name} | ${comp.weight} | ${comp.evidenceLevel.replace(/_/g, " ")} | ${comp.rationale} |`
    );
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  lines.push("## Datenquellen");
  lines.push("");
  for (const source of wp.dataSources) {
    lines.push(`### ${source.name}`);
    lines.push(`- **Anbieter:** ${source.provider}`);
    lines.push(`- **Typ:** ${source.type}`);
    lines.push(`- **Abdeckung:** ${source.coverage}`);
    lines.push(`- **Aktualisierung:** ${source.latency}`);
    lines.push("");
  }
  lines.push("---");
  lines.push("");

  lines.push("## Aktivierungslogik");
  lines.push("");
  lines.push(wp.activationLogic.description);
  lines.push("");
  lines.push("| Aktion | Schwelle | Budget | Kanaele |");
  lines.push("|--------|----------|--------|---------|");
  for (const action of wp.activationLogic.actions) {
    lines.push(
      `| **${action.action}** | ${action.threshold} | ${action.budgetShift} | ${action.channels.join(", ")} |`
    );
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  lines.push("## Validierungsframework");
  lines.push("");
  lines.push(`**Aktueller Status:** ${wp.validationFramework.currentStatus}`);
  lines.push("");
  lines.push("### Backtest-Gates");
  lines.push("");
  for (const gate of wp.validationFramework.backtestGates) {
    lines.push(`- **${gate.gate}:** ${gate.description}`);
  }
  lines.push("");
  lines.push("### Kalibrierungsziele");
  lines.push("");
  for (const target of wp.validationFramework.calibrationTargets) {
    lines.push(`- ${target.replace(/_/g, " ")}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  lines.push("## Compliance");
  lines.push("");
  lines.push(`- **Targeting-Modus:** ${wp.complianceStatement.targetingMode}`);
  lines.push(
    `- **Persoenliche Gesundheitsdaten:** ${wp.complianceStatement.personalHealthData ? "Ja" : "Nein"}`
  );
  lines.push(
    `- **Individuelles Profiling:** ${wp.complianceStatement.individualProfiling ? "Ja" : "Nein"}`
  );
  lines.push(`- **DSGVO-Basis:** ${wp.complianceStatement.gdprBasis}`);
  lines.push(`- **HWG-Konformitaet:** ${wp.complianceStatement.hwgCompliance}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  lines.push("## Technische Spezifikation");
  lines.push("");
  lines.push(`- **Deployment:** ${wp.technicalSpecification.deployment}`);
  lines.push(`- **Daten-Refresh:** ${wp.technicalSpecification.dataRefresh}`);
  lines.push(`- **Repository:** ${wp.technicalSpecification.github}`);
  lines.push("");
  lines.push("### API-Endpoints");
  lines.push("");
  for (const ep of wp.technicalSpecification.apiEndpoints) {
    lines.push(`- \`${ep.path}\` - ${ep.description}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`*Erstellt von ${wp.contact.organization}*`);

  return lines.join("\n");
}

function formatAsText(wp) {
  return formatAsMarkdown(wp)
    .replace(/^#{1,3} /gm, "")
    .replace(/\*\*/g, "")
    .replace(/\|/g, " | ")
    .replace(/`/g, "");
}
