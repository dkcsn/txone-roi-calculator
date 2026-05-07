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

const calculator = document.querySelector("#calculator");
const productsEl = document.querySelector("#products");
const scenarioCardsEl = document.querySelector("#scenarioCards");
const scenarioTemplate = document.querySelector("#scenarioTemplate");
const effectiveReductionEl = document.querySelector("#effectiveReduction");
const selectedCountEl = document.querySelector("#selectedCount");
const summaryTextEl = document.querySelector("#summaryText");
const copySummaryButton = document.querySelector("#copySummary");
const copyStatusEl = document.querySelector("#copyStatus");
const tabButtons = document.querySelectorAll(".tab-button");
const tabViews = document.querySelectorAll(".tab-view");
const currencySelect = document.querySelector("#currency");

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

function calculateScenario(inputs, products, scenario) {
  const selectedReduction = combinedRiskReduction(products);
  const adjustedReduction = Math.min(0.9, selectedReduction * scenario.factor);
  const legacyMultiplier = 1 + Math.max(0, Math.min(100, inputs.legacyPercent)) / 100 * 0.35;
  const annualDowntimeExposure = inputs.incidents * inputs.downtimeHours * inputs.downtimeCost * legacyMultiplier;
  const annualRecoveryExposure = inputs.incidents * inputs.recoveryCost * legacyMultiplier;
  const avoidedDowntime = annualDowntimeExposure * adjustedReduction;
  const reducedIncidentLoss = annualRecoveryExposure * adjustedReduction;

  const annualFteCost = inputs.fteCount * inputs.fteHourlyCost * 2080;
  const environmentScale = Math.min(0.08, (inputs.sites * 0.004) + (inputs.productionLines * 0.0015) + (inputs.endpoints / 100000));
  const efficiencyRate = Math.min(0.35, (adjustedReduction * 0.18) + environmentScale);
  const operationalEfficiency = annualFteCost * efficiencyRate;

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
  };
}

function collectInputs() {
  return Object.fromEntries(inputIds.map((id) => [id, numberValue(id)]));
}

function renderScenarioCards(inputs, products) {
  scenarioCardsEl.replaceChildren(
    ...scenarios.map((scenario) => {
      const result = calculateScenario(inputs, products, scenario);
      const node = scenarioTemplate.content.cloneNode(true);
      const card = node.querySelector(".scenario-card");

      card.querySelector("h3").textContent = scenario.name;
      card.querySelector(".scenario-pill").textContent = `${scenario.tone} | ${percent(result.adjustedReduction * 100)} risk reduction`;
      card.querySelector('[data-key="annualBenefit"]').textContent = money(result.annualBenefit);
      card.querySelector('[data-key="avoidedDowntime"]').textContent = money(result.avoidedDowntime);
      card.querySelector('[data-key="reducedIncidentLoss"]').textContent = money(result.reducedIncidentLoss);
      card.querySelector('[data-key="operationalEfficiency"]').textContent = money(result.operationalEfficiency);
      card.querySelector('[data-key="paybackMonths"]').textContent = months(result.paybackMonths);
      card.querySelector('[data-label="netValueLabel"]').textContent = `${inputs.periodYears}-year net value`;
      card.querySelector('[data-label="roiLabel"]').textContent = `${inputs.periodYears}-year ROI`;
      card.querySelector('[data-key="netValue"]').textContent = money(result.periodNetValue);
      card.querySelector('[data-key="roi"]').textContent = percent(result.roi);

      return node;
    }),
  );
}

function buildSummary(inputs, products) {
  const expected = calculateScenario(inputs, products, scenarios[1]);
  const productNames = products.length ? products.map((product) => product.name).join(", ") : "No products selected";

  return [
    "TXOne OT Cybersecurity ROI Executive Summary",
    `Solution mix: ${productNames}`,
    `Currency: ${selectedCurrency()}`,
    `Environment: ${inputs.sites} sites, ${inputs.productionLines} production lines, ${inputs.endpoints} OT endpoints, ${inputs.legacyPercent}% legacy OT systems`,
    `Expected annual benefit: ${money(expected.annualBenefit)}`,
    `Expected avoided downtime: ${money(expected.avoidedDowntime)}`,
    `Expected reduced incident loss: ${money(expected.reducedIncidentLoss)}`,
    `Expected operational efficiency saving: ${money(expected.operationalEfficiency)}`,
    `Expected payback: ${months(expected.paybackMonths)}`,
    `${inputs.periodYears}-year net value: ${money(expected.periodNetValue)}`,
    `${inputs.periodYears}-year ROI: ${percent(expected.roi)}`,
    "",
    "Disclaimer: This calculator is for business case estimation only. All assumptions must be validated with the customer's finance, OT and risk teams.",
  ].join("\n");
}

function render() {
  const inputs = collectInputs();
  const products = getSelectedProducts();
  const baseReduction = combinedRiskReduction(products);

  selectedCountEl.textContent = `${products.length} selected`;
  effectiveReductionEl.textContent = `Expected combined reduction: ${percent(baseReduction * 100)}`;
  renderScenarioCards(inputs, products);
  summaryTextEl.textContent = buildSummary(inputs, products);
}

function selectTab(tabId) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });
  tabViews.forEach((view) => {
    view.classList.toggle("active", view.id === tabId);
  });
}

async function copySummary() {
  const summary = summaryTextEl.textContent;
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(summary);
      copyStatusEl.textContent = "Copied";
      setTimeout(() => {
        copyStatusEl.textContent = "Ready";
      }, 1800);
      return;
    } catch {
      // Fall through to the textarea fallback for file previews and blocked permissions.
    }
  }

  const textArea = document.createElement("textarea");
  textArea.value = summary;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.appendChild(textArea);
  textArea.select();
  textArea.setSelectionRange(0, textArea.value.length);

  try {
    const copied = document.execCommand("copy");
    copyStatusEl.textContent = copied ? "Copied" : "Copy blocked";
  } catch {
    copyStatusEl.textContent = "Copy blocked";
  } finally {
    document.body.removeChild(textArea);
  }

  if (copyStatusEl.textContent === "Copy blocked") {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(summaryTextEl);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  setTimeout(() => {
    copyStatusEl.textContent = "Ready";
  }, 1800);
}

calculator.addEventListener("input", render);
calculator.addEventListener("submit", (event) => event.preventDefault());
productsEl.addEventListener("input", render);
copySummaryButton.addEventListener("click", copySummary);
tabButtons.forEach((button) => {
  button.addEventListener("click", () => selectTab(button.dataset.tab));
});

render();
