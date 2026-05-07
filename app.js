const scenarios = [
  { name: "Conservative", factor: 0.7, tone: "Low case" },
  { name: "Expected", factor: 1, tone: "Base case" },
  { name: "Aggressive", factor: 1.2, tone: "High case" },
];

const inputIds = [
  "sites",
  "productionLines",
  "endpoints",
  "legacyPercent",
  "downtimeCost",
  "incidents",
  "downtimeHours",
  "recoveryCost",
  "fteCount",
  "fteHourlyCost",
  "investment",
  "periodYears",
];

const advancedInputIds = [
  "advScenarios",
  "advTrials",
  "advMinEvents",
  "advLikelyEvents",
  "advMaxEvents",
  "advMinLoss",
  "advLikelyLoss",
  "advMaxLoss",
  "advControlConfidence",
];

const qualityInputIds = [
  "qualityEnvironment",
  "qualityCost",
  "qualityIncident",
  "qualityRiskReduction",
  "qualityInvestment",
  "qualitySimulation",
];

const calculator = document.querySelector("#calculator");
const advancedModel = document.querySelector("#advancedModel");
const productsEl = document.querySelector("#products");
const scenarioCardsEl = document.querySelector("#scenarioCards");
const scenarioTemplate = document.querySelector("#scenarioTemplate");
const advancedCardsEl = document.querySelector("#advancedCards");
const advancedReductionEl = document.querySelector("#advancedReduction");
const effectiveReductionEl = document.querySelector("#effectiveReduction");
const selectedCountEl = document.querySelector("#selectedCount");
const summaryTextEl = document.querySelector("#summaryText");
const riskSummaryTextEl = document.querySelector("#riskSummaryText");
const reportTextEl = document.querySelector("#reportText");
const sensitivityCardsEl = document.querySelector("#sensitivityCards");
const qualityScoreEl = document.querySelector("#qualityScore");
const copySummaryButton = document.querySelector("#copySummary");
const copyRiskSummaryButton = document.querySelector("#copyRiskSummary");
const printReportButton = document.querySelector("#printReport");
const copyStatusEl = document.querySelector("#copyStatus");
const tabButtons = document.querySelectorAll(".tab-button");
const tabViews = document.querySelectorAll(".tab-view");
const currencySelect = document.querySelector("#currency");
const qualityInputs = document.querySelectorAll(".quality-input");

const qualityWeights = {
  estimated: 1,
  customer: 2,
  finance: 3,
};

const qualityLabels = {
  estimated: "Estimated",
  customer: "Customer validated",
  finance: "Finance validated",
};

function numberValue(id) {
  const value = Number(document.querySelector(`#${id}`).value);
  return Number.isFinite(value) ? value : 0;
}

function selectedCurrency() {
  return currencySelect.value || "USD";
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: selectedCurrency(),
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)}%`;
}

function decimal(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function months(value) {
  if (!Number.isFinite(value)) return "No payback";
  if (value <= 0) return "Immediate";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)} mo`;
}

function getSelectedProducts() {
  return [...document.querySelectorAll(".product-enabled")]
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => {
      const name = checkbox.dataset.product;
      const input = [...document.querySelectorAll(".risk-input")].find((riskInput) => riskInput.dataset.product === name);
      const riskReduction = Math.max(0, Math.min(100, Number(input.value) || 0)) / 100;
      return { name, riskReduction };
    });
}

function combinedRiskReduction(products) {
  if (!products.length) return 0;
  return 1 - products.reduce((remainingRisk, product) => remainingRisk * (1 - product.riskReduction), 1);
}

function calculateScenario(inputs, products, scenario, qualityMultiplier = 1) {
  const selectedReduction = combinedRiskReduction(products);
  const adjustedReduction = Math.min(0.75, selectedReduction * scenario.factor);
  const legacyMultiplier = 1 + Math.max(0, Math.min(100, inputs.legacyPercent)) / 100 * 0.35;
  const annualDowntimeExposure = inputs.incidents * inputs.downtimeHours * inputs.downtimeCost * legacyMultiplier;
  const annualRecoveryExposure = inputs.incidents * inputs.recoveryCost * legacyMultiplier;
  const avoidedDowntime = annualDowntimeExposure * adjustedReduction * qualityMultiplier;
  const reducedIncidentLoss = annualRecoveryExposure * adjustedReduction * qualityMultiplier;

  const annualFteCost = inputs.fteCount * inputs.fteHourlyCost * 2080;
  const environmentScale = Math.min(0.08, (inputs.sites * 0.004) + (inputs.productionLines * 0.0015) + (inputs.endpoints / 100000));
  const efficiencyRate = Math.min(0.22, (adjustedReduction * 0.1) + environmentScale);
  const operationalEfficiency = annualFteCost * efficiencyRate * qualityMultiplier;

  const annualBenefit = avoidedDowntime + reducedIncidentLoss + operationalEfficiency;
  const paybackMonths = annualBenefit > 0 ? (inputs.investment / annualBenefit) * 12 : Infinity;
  const periodNetValue = annualBenefit * inputs.periodYears - inputs.investment;
  const roi = inputs.investment > 0 ? (periodNetValue / inputs.investment) * 100 : 0;
  const threeYearNetValue = annualBenefit * 3 - inputs.investment;
  const threeYearRoi = inputs.investment > 0 ? (threeYearNetValue / inputs.investment) * 100 : 0;

  return {
    adjustedReduction,
    annualBenefit,
    avoidedDowntime,
    reducedIncidentLoss,
    operationalEfficiency,
    paybackMonths,
    periodNetValue,
    roi,
    threeYearNetValue,
    threeYearRoi,
    qualityMultiplier,
  };
}

function collectInputs() {
  return Object.fromEntries(inputIds.map((id) => [id, numberValue(id)]));
}

function collectAdvancedInputs() {
  const values = Object.fromEntries(advancedInputIds.map((id) => [id, numberValue(id)]));
  return {
    scenarios: Math.max(1, values.advScenarios),
    trials: Math.max(100, Math.min(10000, Math.round(values.advTrials))),
    minEvents: Math.max(0, values.advMinEvents),
    likelyEvents: Math.max(0, values.advLikelyEvents),
    maxEvents: Math.max(0, values.advMaxEvents),
    minLoss: Math.max(0, values.advMinLoss),
    likelyLoss: Math.max(0, values.advLikelyLoss),
    maxLoss: Math.max(0, values.advMaxLoss),
    controlConfidence: Math.max(0, Math.min(100, values.advControlConfidence)) / 100,
  };
}

function collectQualityInputs() {
  return Object.fromEntries(
    qualityInputIds.map((id) => {
      const element = document.querySelector(`#${id}`);
      return [id, element ? element.value : "estimated"];
    }),
  );
}

function calculateQualityScore(quality) {
  const values = Object.values(quality);
  const total = values.reduce((sum, value) => sum + (qualityWeights[value] || 1), 0);
  const percentValue = Math.round((total / (values.length * 3)) * 100);

  let rating = "Low";
  if (percentValue >= 78) rating = "High";
  else if (percentValue >= 56) rating = "Medium";

  return { percent: percentValue, rating };
}

function benefitConfidenceFactor(quality) {
  const score = calculateQualityScore(quality).percent / 100;
  return Math.min(1, 0.55 + score * 0.45);
}

function qualityLine(quality) {
  return [
    `Environment: ${qualityLabels[quality.qualityEnvironment]}`,
    `Costs: ${qualityLabels[quality.qualityCost]}`,
    `Incidents: ${qualityLabels[quality.qualityIncident]}`,
    `Risk reduction: ${qualityLabels[quality.qualityRiskReduction]}`,
    `Investment: ${qualityLabels[quality.qualityInvestment]}`,
    `Simulation: ${qualityLabels[quality.qualitySimulation]}`,
  ].join(" | ");
}

function normalizeRange(minimum, likely, maximum) {
  const ordered = [minimum, likely, maximum].sort((a, b) => a - b);
  return { minimum: ordered[0], likely: ordered[1], maximum: ordered[2] };
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function triangularSample(minimum, likely, maximum, random) {
  if (maximum <= minimum) return minimum;
  const mode = Math.max(minimum, Math.min(maximum, likely));
  const range = maximum - minimum;
  const modeRatio = (mode - minimum) / range;
  const draw = random();

  if (draw < modeRatio) {
    return minimum + Math.sqrt(draw * range * (mode - minimum));
  }

  return maximum - Math.sqrt((1 - draw) * range * (maximum - mode));
}

function percentile(values, percentileValue) {
  if (!values.length) return 0;
  const index = Math.min(values.length - 1, Math.ceil((percentileValue / 100) * values.length) - 1);
  return values[index];
}

function summarizeLosses(losses) {
  const sorted = [...losses].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  return {
    mean,
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
  };
}

function calculateAdvancedRisk(inputs, products) {
  const eventRange = normalizeRange(inputs.minEvents, inputs.likelyEvents, inputs.maxEvents);
  const lossRange = normalizeRange(inputs.minLoss, inputs.likelyLoss, inputs.maxLoss);
  const selectedControlReduction = combinedRiskReduction(products);
  const confidenceAdjustedReduction = Math.min(0.7, selectedControlReduction * inputs.controlConfidence);
  const scenarioComplexity = 1 + Math.min(0.25, (inputs.scenarios - 1) * 0.04);
  const random = seededRandom(42701);
  const baselineLosses = [];
  const residualLosses = [];
  const eventProbabilities = [];

  for (let trial = 0; trial < inputs.trials; trial += 1) {
    const annualEvents = triangularSample(eventRange.minimum, eventRange.likely, eventRange.maximum, random);
    const lossPerEvent = triangularSample(lossRange.minimum, lossRange.likely, lossRange.maximum, random);
    const baselineLoss = annualEvents * lossPerEvent * scenarioComplexity;

    baselineLosses.push(baselineLoss);
    residualLosses.push(baselineLoss * (1 - confidenceAdjustedReduction));
    eventProbabilities.push(1 - Math.exp(-annualEvents));
  }

  const baseline = summarizeLosses(baselineLosses);
  const residual = summarizeLosses(residualLosses);
  const probabilityAtLeastOne = eventProbabilities.reduce((sum, value) => sum + value, 0) / eventProbabilities.length;

  return {
    baseline,
    residual,
    confidenceAdjustedReduction,
    annualRiskReduction: baseline.mean - residual.mean,
    probabilityAtLeastOne,
    scenarioComplexity,
  };
}

function expectedScenario(inputs, products, quality) {
  return calculateScenario(inputs, products, scenarios[1], benefitConfidenceFactor(quality));
}

function sensitivityRows(inputs, products, quality) {
  const base = expectedScenario(inputs, products, quality);
  const candidateInputs = [
    ["downtimeCost", "Downtime cost per hour"],
    ["incidents", "Incidents per year"],
    ["downtimeHours", "Downtime hours per incident"],
    ["recoveryCost", "Incident recovery cost"],
    ["fteCount", "OT/security FTE count"],
    ["fteHourlyCost", "Hourly FTE cost"],
    ["investment", "Investment amount"],
    ["legacyPercent", "Legacy percentage"],
  ];

  return candidateInputs
    .map(([key, label]) => {
      const lowInputs = { ...inputs, [key]: Math.max(0, inputs[key] * 0.8) };
      const highInputs = { ...inputs, [key]: Math.max(0, inputs[key] * 1.2) };
      const low = expectedScenario(lowInputs, products, quality);
      const high = expectedScenario(highInputs, products, quality);
      const annualDelta = Math.max(Math.abs(low.annualBenefit - base.annualBenefit), Math.abs(high.annualBenefit - base.annualBenefit));
      const roiDelta = Math.max(Math.abs(low.roi - base.roi), Math.abs(high.roi - base.roi));

      return {
        label,
        annualDelta,
        roiDelta,
        displayDelta: key === "investment" ? `${decimal(roiDelta)} ROI points` : money(annualDelta),
      };
    })
    .sort((a, b) => (b.annualDelta + b.roiDelta * 1000) - (a.annualDelta + a.roiDelta * 1000))
    .slice(0, 5);
}

function renderScenarioCards(inputs, products, quality) {
  const qualityMultiplier = benefitConfidenceFactor(quality);
  scenarioCardsEl.replaceChildren(
    ...scenarios.map((scenario) => {
      const result = calculateScenario(inputs, products, scenario, qualityMultiplier);
      const node = scenarioTemplate.content.cloneNode(true);
      const card = node.querySelector(".scenario-card");

      card.querySelector("h3").textContent = scenario.name;
      card.querySelector(".scenario-pill").textContent = `${scenario.tone} | ${percent(result.adjustedReduction * 100)} risk | ${percent(result.qualityMultiplier * 100)} confidence`;
      card.querySelector('[data-key="annualBenefit"]').textContent = money(result.annualBenefit);
      card.querySelector('[data-key="avoidedDowntime"]').textContent = money(result.avoidedDowntime);
      card.querySelector('[data-key="reducedIncidentLoss"]').textContent = money(result.reducedIncidentLoss);
      card.querySelector('[data-key="operationalEfficiency"]').textContent = money(result.operationalEfficiency);
      card.querySelector('[data-key="paybackMonths"]').textContent = months(result.paybackMonths);
      card.querySelector('[data-label="netValueLabel"]').textContent = `${inputs.periodYears}-year net value`;
      card.querySelector('[data-label="roiLabel"]').textContent = `${inputs.periodYears}-year cumulative ROI`;
      card.querySelector('[data-key="netValue"]').textContent = money(result.periodNetValue);
      card.querySelector('[data-key="roi"]').textContent = percent(result.roi);

      return node;
    }),
  );
}

function advancedMetric(label, value) {
  const row = document.createElement("div");
  row.className = "metric";

  const labelEl = document.createElement("span");
  labelEl.textContent = label;

  const valueEl = document.createElement("strong");
  valueEl.textContent = value;

  row.append(labelEl, valueEl);
  return row;
}

function advancedCard(title, metrics) {
  const card = document.createElement("article");
  card.className = "advanced-card";

  const heading = document.createElement("h3");
  heading.textContent = title;
  card.append(heading, ...metrics.map(([label, value]) => advancedMetric(label, value)));

  return card;
}

function renderAdvancedRisk(products) {
  const inputs = collectAdvancedInputs();
  const result = calculateAdvancedRisk(inputs, products);

  advancedReductionEl.textContent = `Confidence-adjusted reduction: ${percent(result.confidenceAdjustedReduction * 100)}`;
  advancedCardsEl.replaceChildren(
    advancedCard("Baseline exposure", [
      ["Mean annual loss", money(result.baseline.mean)],
      ["P90 annual loss", money(result.baseline.p90)],
      ["P95 annual loss", money(result.baseline.p95)],
      ["Probability >= 1 event", percent(result.probabilityAtLeastOne * 100)],
    ]),
    advancedCard("After selected controls", [
      ["Residual mean loss", money(result.residual.mean)],
      ["Residual P90 loss", money(result.residual.p90)],
      ["Residual P95 loss", money(result.residual.p95)],
      ["Model trials", decimal(inputs.trials)],
    ]),
    advancedCard("Risk reduction view", [
      ["Mean annual risk reduction", money(result.annualRiskReduction)],
      ["Control confidence", percent(inputs.controlConfidence * 100)],
      ["Threat scenarios", decimal(inputs.scenarios)],
      ["Scenario complexity factor", `${decimal(result.scenarioComplexity)}x`],
    ]),
  );
}

function renderSensitivity(inputs, products, quality) {
  const rows = sensitivityRows(inputs, products, quality);
  sensitivityCardsEl.replaceChildren(
    ...rows.map((row, index) => {
      const card = document.createElement("article");
      card.className = "sensitivity-card";

      const rank = document.createElement("span");
      rank.className = "sensitivity-rank";
      rank.textContent = `#${index + 1}`;

      const heading = document.createElement("h3");
      heading.textContent = row.label;

      const value = document.createElement("strong");
      value.textContent = row.displayDelta;

      const caption = document.createElement("p");
      caption.textContent = "Approximate movement when this input changes by plus or minus 20%.";

      card.append(rank, heading, value, caption);
      return card;
    }),
  );
}

function buildRoiSummary(inputs, products, quality) {
  const expected = expectedScenario(inputs, products, quality);
  const qualityScore = calculateQualityScore(quality);
  const qualityMultiplier = benefitConfidenceFactor(quality);
  const advanced = calculateAdvancedRisk(collectAdvancedInputs(), products);
  const productNames = products.length ? products.map((product) => product.name).join(", ") : "No products selected";

  return [
    "OT Cybersecurity ROI Business Case Summary",
    `Solution mix: ${productNames}`,
    `Currency: ${selectedCurrency()}`,
    `Assumption quality: ${qualityScore.rating} confidence (${qualityScore.percent}%)`,
    `Benefit confidence factor applied to ROI outputs: ${percent(qualityMultiplier * 100)}`,
    qualityLine(quality),
    `Environment: ${inputs.sites} sites, ${inputs.productionLines} production lines, ${inputs.endpoints} OT endpoints, ${inputs.legacyPercent}% legacy OT systems`,
    `Expected annual benefit: ${money(expected.annualBenefit)}`,
    `Expected avoided downtime: ${money(expected.avoidedDowntime)}`,
    `Expected reduced incident loss: ${money(expected.reducedIncidentLoss)}`,
    `Expected operational efficiency saving: ${money(expected.operationalEfficiency)}`,
    `Expected payback: ${months(expected.paybackMonths)}`,
    `${inputs.periodYears}-year net value: ${money(expected.periodNetValue)}`,
    `${inputs.periodYears}-year cumulative ROI: ${percent(expected.roi)}`,
    `Risk simulation reference: mean annual risk reduction ${money(advanced.annualRiskReduction)}, residual P95 annual loss ${money(advanced.residual.p95)}`,
    "",
    "Disclaimer: This calculator is for business case estimation only. All assumptions must be validated with the customer's finance, OT and risk teams.",
  ].join("\n");
}

function buildRiskSummary(products, quality) {
  const advancedInputs = collectAdvancedInputs();
  const advanced = calculateAdvancedRisk(advancedInputs, products);
  const qualityScore = calculateQualityScore(quality);
  const productNames = products.length ? products.map((product) => product.name).join(", ") : "No products selected";

  return [
    "OT Cybersecurity Risk Simulation Summary",
    `Solution mix: ${productNames}`,
    `Currency: ${selectedCurrency()}`,
    `Assumption quality: ${qualityScore.rating} confidence (${qualityScore.percent}%)`,
    `Risk simulation validation: ${qualityLabels[quality.qualitySimulation]}`,
    `Threat scenarios: ${decimal(advancedInputs.scenarios)}`,
    `Simulation trials: ${decimal(advancedInputs.trials)}`,
    `Control confidence: ${percent(advancedInputs.controlConfidence * 100)}`,
    `Confidence-adjusted reduction: ${percent(advanced.confidenceAdjustedReduction * 100)}`,
    `Mean baseline annual loss: ${money(advanced.baseline.mean)}`,
    `Mean residual annual loss: ${money(advanced.residual.mean)}`,
    `P90 residual annual loss: ${money(advanced.residual.p90)}`,
    `P95 residual annual loss: ${money(advanced.residual.p95)}`,
    `Mean annual risk reduction: ${money(advanced.annualRiskReduction)}`,
    `Probability of at least one annual event: ${percent(advanced.probabilityAtLeastOne * 100)}`,
    "",
    "Disclaimer: This calculator is for business case estimation only. All assumptions must be validated with the customer's finance, OT and risk teams.",
  ].join("\n");
}

function buildReport(inputs, products, quality) {
  const expected = expectedScenario(inputs, products, quality);
  const advanced = calculateAdvancedRisk(collectAdvancedInputs(), products);
  const qualityScore = calculateQualityScore(quality);
  const qualityMultiplier = benefitConfidenceFactor(quality);
  const sensitivity = sensitivityRows(inputs, products, quality)
    .slice(0, 3)
    .map((row, index) => `${index + 1}. ${row.label}: ${row.displayDelta}`)
    .join("\n");

  return [
    "Workshop Report - OT Cybersecurity ROI And Risk Simulation",
    "Composed by Christian Søgaard Nielsen",
    "",
    `Currency: ${selectedCurrency()}`,
    `Assumption quality: ${qualityScore.rating} confidence (${qualityScore.percent}%)`,
    `Benefit confidence factor applied to ROI outputs: ${percent(qualityMultiplier * 100)}`,
    qualityLine(quality),
    "",
    "Environment",
    `${inputs.sites} sites | ${inputs.productionLines} production lines | ${inputs.endpoints} OT endpoints | ${inputs.legacyPercent}% legacy OT systems`,
    "",
    "Expected ROI Business Case",
    `Annual benefit: ${money(expected.annualBenefit)}`,
    `Avoided downtime: ${money(expected.avoidedDowntime)}`,
    `Reduced incident loss: ${money(expected.reducedIncidentLoss)}`,
    `Operational efficiency saving: ${money(expected.operationalEfficiency)}`,
    `Payback: ${months(expected.paybackMonths)}`,
    `${inputs.periodYears}-year net value: ${money(expected.periodNetValue)}`,
    `${inputs.periodYears}-year cumulative ROI: ${percent(expected.roi)}`,
    "",
    "Risk Simulation",
    `Baseline mean annual loss: ${money(advanced.baseline.mean)}`,
    `Residual mean annual loss: ${money(advanced.residual.mean)}`,
    `Residual P95 annual loss: ${money(advanced.residual.p95)}`,
    `Mean annual risk reduction: ${money(advanced.annualRiskReduction)}`,
    `Confidence-adjusted reduction: ${percent(advanced.confidenceAdjustedReduction * 100)}`,
    "",
    "Top Sensitivity Drivers",
    sensitivity,
    "",
    "Disclaimer: This calculator is for business case estimation only. All assumptions must be validated with the customer's finance, OT and risk teams.",
  ].join("\n");
}

function render() {
  const inputs = collectInputs();
  const products = getSelectedProducts();
  const quality = collectQualityInputs();
  const score = calculateQualityScore(quality);
  const baseReduction = combinedRiskReduction(products);

  selectedCountEl.textContent = `${products.length} selected`;
  effectiveReductionEl.textContent = `Expected combined reduction: ${percent(baseReduction * 100)}`;
  qualityScoreEl.textContent = `${score.rating} | ${score.percent}% score | ${percent(benefitConfidenceFactor(quality) * 100)} benefit factor`;
  renderScenarioCards(inputs, products, quality);
  renderAdvancedRisk(products);
  renderSensitivity(inputs, products, quality);
  summaryTextEl.textContent = buildRoiSummary(inputs, products, quality);
  riskSummaryTextEl.textContent = buildRiskSummary(products, quality);
  reportTextEl.textContent = buildReport(inputs, products, quality);
}

function selectTab(tabId) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });
  tabViews.forEach((view) => {
    view.classList.toggle("active", view.id === tabId);
  });
}

async function copyText(text, successMessage, sourceElement) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      copyStatusEl.textContent = successMessage;
      setTimeout(() => {
        copyStatusEl.textContent = "Ready";
      }, 1800);
      return;
    } catch {
      // Fall through to the textarea fallback for file previews and blocked permissions.
    }
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.appendChild(textArea);
  textArea.select();
  textArea.setSelectionRange(0, textArea.value.length);

  try {
    const copied = document.execCommand("copy");
    copyStatusEl.textContent = copied ? successMessage : "Clipboard copy blocked";
  } catch {
    copyStatusEl.textContent = "Clipboard copy blocked";
  } finally {
    document.body.removeChild(textArea);
  }

  if (copyStatusEl.textContent === "Clipboard copy blocked") {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(sourceElement);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  setTimeout(() => {
    copyStatusEl.textContent = "Ready";
  }, 1800);
}

function copySummary() {
  return copyText(summaryTextEl.textContent, "ROI summary copied to clipboard", summaryTextEl);
}

function copyRiskSummary() {
  return copyText(riskSummaryTextEl.textContent, "Risk summary copied to clipboard", riskSummaryTextEl);
}

calculator.addEventListener("input", render);
calculator.addEventListener("submit", (event) => event.preventDefault());
advancedModel.addEventListener("input", render);
advancedModel.addEventListener("submit", (event) => event.preventDefault());
productsEl.addEventListener("input", render);
currencySelect.addEventListener("change", render);
qualityInputs.forEach((input) => input.addEventListener("change", render));
copySummaryButton.addEventListener("click", copySummary);
copyRiskSummaryButton.addEventListener("click", copyRiskSummary);
printReportButton.addEventListener("click", () => window.print());
tabButtons.forEach((button) => {
  button.addEventListener("click", () => selectTab(button.dataset.tab));
});

render();
