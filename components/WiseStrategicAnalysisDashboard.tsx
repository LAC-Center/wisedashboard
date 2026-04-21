"use client";

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type Phase = "Partnerships" | "Integration" | "Infrastructure";
type MacroScenario = "Low (2%)" | "Base (3.5%)" | "High (5%)";

type Corridor = {
  corridor: string;
  region: string;
  volume_usd_bn: number;
  cost_pct: number;
  remittances_gdp_pct: number;
  infra_score: number;
  reg_risk: number;
  aml_risk: number;
  ops_risk: number;
  phase: Phase;
};

type Assumptions = {
  marketCapturePct: number;
  feePct: number;
  macroRateScenario: MacroScenario;
  interestIncomeBaseM: number;
  feeRevenueBaseM: number;
  txsPerBillionUsd: number;
  initialCostPerTx: number;
  targetCostPerTx: number;
  africaPriorityBoostPct: number;
  partnershipPenaltyPct: number;
  infraBuildoutPct: number;
};

type ComputedRow = Corridor & {
  regionBoost: number;
  phaseMultiplier: number;
  adjVolumeUsdBn: number;
  adjCostPct: number;
  macroCapture: number;
  misScore: number;
  effectiveCapturePct: number;
  capturedVolumeBn: number;
  estimatedFeeRevenueM: number;
  priorityScore: number;
  rank: number;
};

const baseData: Corridor[] = [
  {
    corridor: "UK-Nigeria",
    region: "Africa",
    volume_usd_bn: 8.2,
    cost_pct: 7.8,
    remittances_gdp_pct: 4.1,
    infra_score: 52,
    reg_risk: 3.8,
    aml_risk: 4.0,
    ops_risk: 3.0,
    phase: "Partnerships",
  },
  {
    corridor: "France-Senegal",
    region: "Africa",
    volume_usd_bn: 3.4,
    cost_pct: 9.1,
    remittances_gdp_pct: 10.2,
    infra_score: 47,
    reg_risk: 3.1,
    aml_risk: 3.6,
    ops_risk: 2.8,
    phase: "Integration",
  },
  {
    corridor: "USA-Mexico",
    region: "Americas",
    volume_usd_bn: 25.0,
    cost_pct: 4.1,
    remittances_gdp_pct: 3.9,
    infra_score: 70,
    reg_risk: 2.1,
    aml_risk: 2.4,
    ops_risk: 2.1,
    phase: "Infrastructure",
  },
  {
    corridor: "South Africa-Zimbabwe",
    region: "Africa",
    volume_usd_bn: 4.0,
    cost_pct: 12.1,
    remittances_gdp_pct: 12.6,
    infra_score: 38,
    reg_risk: 4.4,
    aml_risk: 4.3,
    ops_risk: 3.7,
    phase: "Partnerships",
  },
  {
    corridor: "UK-Pakistan",
    region: "Asia",
    volume_usd_bn: 8.1,
    cost_pct: 6.2,
    remittances_gdp_pct: 8.3,
    infra_score: 55,
    reg_risk: 2.7,
    aml_risk: 3.1,
    ops_risk: 2.5,
    phase: "Integration",
  },
  {
    corridor: "UAE-India",
    region: "Asia",
    volume_usd_bn: 18.4,
    cost_pct: 3.3,
    remittances_gdp_pct: 3.2,
    infra_score: 73,
    reg_risk: 2.4,
    aml_risk: 2.7,
    ops_risk: 2.3,
    phase: "Infrastructure",
  },
  {
    corridor: "Germany-Ghana",
    region: "Africa",
    volume_usd_bn: 2.9,
    cost_pct: 8.5,
    remittances_gdp_pct: 5.8,
    infra_score: 42,
    reg_risk: 3.5,
    aml_risk: 3.7,
    ops_risk: 3.0,
    phase: "Partnerships",
  },
  {
    corridor: "Spain-Colombia",
    region: "Americas",
    volume_usd_bn: 5.6,
    cost_pct: 5.4,
    remittances_gdp_pct: 1.8,
    infra_score: 68,
    reg_risk: 2.0,
    aml_risk: 2.2,
    ops_risk: 2.1,
    phase: "Integration",
  },
];

const initialAssumptions: Assumptions = {
  marketCapturePct: 2.5,
  feePct: 0.65,
  macroRateScenario: "Base (3.5%)",
  interestIncomeBaseM: 480,
  feeRevenueBaseM: 620,
  txsPerBillionUsd: 220000,
  initialCostPerTx: 1.05,
  targetCostPerTx: 0.42,
  africaPriorityBoostPct: 20,
  partnershipPenaltyPct: 15,
  infraBuildoutPct: 10,
};

function normalize(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return values.map(() => 50);
  return values.map((v) => ((v - min) / (max - min)) * 100);
}

function computeScenario(baseRows: Corridor[], a: Assumptions) {
  let interestMultiplier = 1;
  let macroCapture = 1;

  if (a.macroRateScenario === "Low (2%)") {
    interestMultiplier = 0.8;
    macroCapture = 1.08;
  } else if (a.macroRateScenario === "Base (3.5%)") {
    interestMultiplier = 1.0;
    macroCapture = 1.0;
  } else {
    interestMultiplier = 1.2;
    macroCapture = 0.94;
  }

  const scenarioRows = baseRows.map((row) => {
    const regionBoost =
      row.region === "Africa" ? 1 + a.africaPriorityBoostPct / 100 : 1;

    const phaseMultiplier =
      row.phase === "Partnerships"
        ? 1 - a.partnershipPenaltyPct / 100
        : row.phase === "Integration"
          ? 1 - a.partnershipPenaltyPct / 200
          : 1 + a.infraBuildoutPct / 100;

    const adjVolumeUsdBn = row.volume_usd_bn * regionBoost * phaseMultiplier;
    const adjCostPct = row.cost_pct * (row.region === "Africa" ? 1.02 : 1);

    return {
      ...row,
      regionBoost,
      phaseMultiplier,
      adjVolumeUsdBn,
      adjCostPct,
      macroCapture,
    };
  });

  const rawMis = scenarioRows.map(
    (r) => r.adjCostPct * r.adjVolumeUsdBn * r.remittances_gdp_pct
  );
  const rawMisNorm = normalize(rawMis);

  const scoredRows = scenarioRows.map((r, i) => {
    const infraPenalty = (100 - r.infra_score) / 100;
    const riskPenalty = (r.reg_risk + r.aml_risk + r.ops_risk) / 15;

    const misScore =
      0.65 * rawMisNorm[i] + 0.2 * infraPenalty * 100 + 0.15 * riskPenalty * 100;

    const attractiveness = 0.7 + misScore / 180;

    const effectiveCapturePct =
      a.marketCapturePct *
      r.macroCapture *
      r.regionBoost *
      r.phaseMultiplier *
      attractiveness;

    const capturedVolumeBn = r.adjVolumeUsdBn * (effectiveCapturePct / 100);
    const estimatedFeeRevenueM = capturedVolumeBn * 1000 * (a.feePct / 100);

    return {
      ...r,
      misScore,
      effectiveCapturePct,
      capturedVolumeBn,
      estimatedFeeRevenueM,
    };
  });

  const revenueNorm = normalize(scoredRows.map((r) => r.estimatedFeeRevenueM));
  const captureNorm = normalize(scoredRows.map((r) => r.effectiveCapturePct));

  const rows: ComputedRow[] = scoredRows
    .map((r, i) => ({
      ...r,
      priorityScore:
        0.55 * r.misScore + 0.25 * revenueNorm[i] + 0.2 * captureNorm[i],
      rank: 0,
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .map((r, i) => ({
      ...r,
      rank: i + 1,
    }));

  const totalCapturedBn = rows.reduce((sum, r) => sum + r.capturedVolumeBn, 0);
  const newFeeRevenueM = rows.reduce((sum, r) => sum + r.estimatedFeeRevenueM, 0);
  const totalFeeRevenueM = a.feeRevenueBaseM + newFeeRevenueM;
  const interestIncomeM = a.interestIncomeBaseM * interestMultiplier;
  const totalRevenueM = totalFeeRevenueM + interestIncomeM;

  const totalTxs = totalCapturedBn * a.txsPerBillionUsd;
  const scaledCostPerTx = Math.max(
    a.targetCostPerTx,
    a.initialCostPerTx - 0.075 * Math.log1p(Math.max(totalTxs, 1) / 100000)
  );

  const phaseGroups = ["Partnerships", "Integration", "Infrastructure"].map((phase) => {
    const phaseRows = rows.filter((r) => r.phase === phase);
    const phaseVolume = phaseRows.reduce((sum, r) => sum + r.capturedVolumeBn, 0);
    const avgCapturePct =
      phaseRows.length > 0
        ? phaseRows.reduce((sum, r) => sum + r.effectiveCapturePct, 0) / phaseRows.length
        : 0;

    return {
      phase,
      volumeSharePct: totalCapturedBn ? (phaseVolume / totalCapturedBn) * 100 : 0,
      avgCapturePct,
      operationalControlPct:
        phase === "Partnerships" ? 35 : phase === "Integration" ? 65 : 90,
    };
  });

  const revenueMix = [
    { name: "Transaction Fees", value: totalFeeRevenueM },
    { name: "Interest Income", value: interestIncomeM },
  ];

  const riskRows = rows.flatMap((r) => [
    { corridor: r.corridor, riskType: "Regulatory", riskScore: r.reg_risk },
    { corridor: r.corridor, riskType: "AML/Fraud", riskScore: r.aml_risk },
    { corridor: r.corridor, riskType: "Operational", riskScore: r.ops_risk },
  ]);

  const africaCaptured = rows
    .filter((r) => r.region === "Africa")
    .reduce((sum, r) => sum + r.capturedVolumeBn, 0);

  const earlySignals: string[] = [];
  const failureSignals: string[] = [];

  if (newFeeRevenueM >= 10) {
    earlySignals.push("Incremental fee revenue material sin subir precios.");
  }
  if (totalRevenueM > 0 && (totalFeeRevenueM / totalRevenueM) * 100 >= 55) {
    earlySignals.push("El mix de revenue se desplaza hacia transaction fees.");
  }
  if (scaledCostPerTx <= 0.65) {
    earlySignals.push("Se observan economías de escala en coste por transacción.");
  }
  if (totalCapturedBn > 0 && africaCaptured / totalCapturedBn >= 0.35) {
    earlySignals.push("África representa una parte relevante del volumen capturado.");
  }

  if (newFeeRevenueM < 5) {
    failureSignals.push("El revenue incremental es demasiado bajo.");
  }
  if (totalRevenueM > 0 && (interestIncomeM / totalRevenueM) * 100 > 55) {
    failureSignals.push("La dependencia del interest income sigue siendo alta.");
  }
  if (scaledCostPerTx >= 0.9) {
    failureSignals.push("No se materializa operating leverage suficiente.");
  }
  if (
    rows.length > 0 &&
    rows.reduce((sum, r) => sum + r.effectiveCapturePct, 0) / rows.length < 1.2
  ) {
    failureSignals.push("La captura efectiva es demasiado baja.");
  }

  const summary = {
    totalVolumeBn: rows.reduce((sum, r) => sum + r.adjVolumeUsdBn, 0),
    targetCaptureBn: totalCapturedBn,
    newFeeRevenueM,
    totalFeeRevenueM,
    interestIncomeM,
    totalRevenueM,
    feeMixPct: totalRevenueM ? (totalFeeRevenueM / totalRevenueM) * 100 : 0,
    interestMixPct: totalRevenueM ? (interestIncomeM / totalRevenueM) * 100 : 0,
    scaledCostPerTx,
    txCountM: totalTxs / 1_000_000,
  };

  return {
    rows,
    summary,
    phaseGroups,
    revenueMix,
    riskRows,
    earlySignals,
    failureSignals,
  };
}

function formatNumber(value: number, digits = 1) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function KpiCard({
  title,
  value,
  prefix = "",
  suffix = "",
}: {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">
        {prefix}
        {formatNumber(value)}
        {suffix}
      </div>
    </div>
  );
}

function SliderField({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <label className="font-medium text-slate-700">{label}</label>
        <span className="text-slate-500">{value}</span>
      </div>
      <input
        className="w-full"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <input
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function MetricRow({
  label,
  value,
  prefix = "",
}: {
  label: string;
  value: number;
  prefix?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-medium text-slate-900">
        {prefix}
        {formatNumber(value, 2)}
      </span>
    </div>
  );
}

export default function WiseStrategicAnalysisPage() {
  const [assumptions, setAssumptions] = useState<Assumptions>(initialAssumptions);

  const {
    rows,
    summary,
    phaseGroups,
    revenueMix,
    riskRows,
    earlySignals,
    failureSignals,
  } = useMemo(() => computeScenario(baseData, assumptions), [assumptions]);

  const operatingLeverageData = useMemo(() => {
    const maxVolume = Math.max(summary.targetCaptureBn * 2, 5);
    const points = 30;

    return Array.from({ length: points }, (_, i) => {
      const volumeBn = 0.1 + (i * (maxVolume - 0.1)) / (points - 1);
      const txs = volumeBn * assumptions.txsPerBillionUsd;
      const costPerTx = Math.max(
        assumptions.targetCostPerTx,
        assumptions.initialCostPerTx - 0.075 * Math.log1p(Math.max(txs, 1) / 100000)
      );

      return { volumeBn, costPerTx };
    });
  }, [summary.targetCaptureBn, assumptions]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
            Wise Strategic Analysis
          </h1>
          <p className="mt-2 max-w-4xl text-base text-slate-600">
            Dashboard para evaluar expansión en corredores de remesas de alto coste,
            medir impacto financiero y validar si la estrategia reduce dependencia
            del interest income.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Simulator</h2>

            <div className="mt-5 space-y-5">
              <SliderField
                label="Base Market Capture (%)"
                min={0.5}
                max={10}
                step={0.1}
                value={assumptions.marketCapturePct}
                onChange={(value) =>
                  setAssumptions((prev) => ({ ...prev, marketCapturePct: value }))
                }
              />

              <SliderField
                label="Wise Target Fee (%)"
                min={0.1}
                max={1.5}
                step={0.05}
                value={assumptions.feePct}
                onChange={(value) =>
                  setAssumptions((prev) => ({ ...prev, feePct: value }))
                }
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Macro Interest Rates
                </label>
                <select
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  value={assumptions.macroRateScenario}
                  onChange={(e) =>
                    setAssumptions((prev) => ({
                      ...prev,
                      macroRateScenario: e.target.value as MacroScenario,
                    }))
                  }
                >
                  <option value="Low (2%)">Low (2%)</option>
                  <option value="Base (3.5%)">Base (3.5%)</option>
                  <option value="High (5%)">High (5%)</option>
                </select>
              </div>

              <SliderField
                label="Africa strategic boost (%)"
                min={0}
                max={50}
                step={5}
                value={assumptions.africaPriorityBoostPct}
                onChange={(value) =>
                  setAssumptions((prev) => ({
                    ...prev,
                    africaPriorityBoostPct: value,
                  }))
                }
              />

              <SliderField
                label="Partnership execution penalty (%)"
                min={0}
                max={40}
                step={5}
                value={assumptions.partnershipPenaltyPct}
                onChange={(value) =>
                  setAssumptions((prev) => ({
                    ...prev,
                    partnershipPenaltyPct: value,
                  }))
                }
              />

              <SliderField
                label="Infrastructure execution uplift (%)"
                min={0}
                max={30}
                step={5}
                value={assumptions.infraBuildoutPct}
                onChange={(value) =>
                  setAssumptions((prev) => ({
                    ...prev,
                    infraBuildoutPct: value,
                  }))
                }
              />

              <NumberField
                label="Base Interest Income ($M)"
                value={assumptions.interestIncomeBaseM}
                onChange={(value) =>
                  setAssumptions((prev) => ({
                    ...prev,
                    interestIncomeBaseM: value,
                  }))
                }
              />

              <NumberField
                label="Base Fee Revenue ($M)"
                value={assumptions.feeRevenueBaseM}
                onChange={(value) =>
                  setAssumptions((prev) => ({
                    ...prev,
                    feeRevenueBaseM: value,
                  }))
                }
              />

              <NumberField
                label="Transactions per $1B volume"
                value={assumptions.txsPerBillionUsd}
                onChange={(value) =>
                  setAssumptions((prev) => ({
                    ...prev,
                    txsPerBillionUsd: value,
                  }))
                }
              />

              <NumberField
                label="Initial Cost / Tx ($)"
                value={assumptions.initialCostPerTx}
                step={0.01}
                onChange={(value) =>
                  setAssumptions((prev) => ({
                    ...prev,
                    initialCostPerTx: value,
                  }))
                }
              />

              <NumberField
                label="Target Cost / Tx Floor ($)"
                value={assumptions.targetCostPerTx}
                step={0.01}
                onChange={(value) =>
                  setAssumptions((prev) => ({
                    ...prev,
                    targetCostPerTx: value,
                  }))
                }
              />

              <button
                className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                onClick={() => setAssumptions(initialAssumptions)}
              >
                Reset assumptions
              </button>
            </div>
          </aside>

          <section className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <KpiCard title="Scenario Volume" value={summary.totalVolumeBn} prefix="$" suffix="BN" />
              <KpiCard title="Captured Volume" value={summary.targetCaptureBn} prefix="$" suffix="BN" />
              <KpiCard title="Incremental Fee Revenue" value={summary.newFeeRevenueM} prefix="$" suffix="M" />
              <KpiCard title="Fee Mix After Strategy" value={summary.feeMixPct} suffix="%" />
              <KpiCard title="Cost / Tx" value={summary.scaledCostPerTx} prefix="$" />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  Market Opportunity Analysis
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  El scatter usa datos ajustados por escenario: coste, volumen,
                  revenue estimado y prioridad.
                </p>

                <div className="mt-4 h-[380px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        dataKey="adjCostPct"
                        name="Scenario Cost (%)"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="adjVolumeUsdBn"
                        name="Scenario Volume ($BN)"
                        tick={{ fontSize: 12 }}
                      />
                      <ZAxis
                        type="number"
                        dataKey="estimatedFeeRevenueM"
                        range={[80, 500]}
                        name="Est. Fee Revenue ($M)"
                      />
                      <Tooltip
                        formatter={(value: number | string, name: string) => [
                          typeof value === "number" ? formatNumber(value, 2) : value,
                          name,
                        ]}
                      />
                      <Scatter data={rows} fill="#111827" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  Priority Table
                </h2>
                <div className="mt-4 max-h-[380px] overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2">#</th>
                        <th className="py-2">Corridor</th>
                        <th className="py-2">Revenue</th>
                        <th className="py-2">Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.corridor} className="border-b border-slate-100">
                          <td className="py-2">{row.rank}</td>
                          <td className="py-2">{row.corridor}</td>
                          <td className="py-2">${formatNumber(row.estimatedFeeRevenueM, 1)}M</td>
                          <td className="py-2">{formatNumber(row.priorityScore, 1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  Financial Simulation
                </h2>
                <div className="mt-4 space-y-3">
                  <MetricRow label="Captured volume ($BN)" value={summary.targetCaptureBn} prefix="$" />
                  <MetricRow label="Incremental fee revenue ($M)" value={summary.newFeeRevenueM} prefix="$" />
                  <MetricRow label="Total fee revenue ($M)" value={summary.totalFeeRevenueM} prefix="$" />
                  <MetricRow label="Interest income ($M)" value={summary.interestIncomeM} prefix="$" />
                  <MetricRow label="Total revenue ($M)" value={summary.totalRevenueM} prefix="$" />
                  <MetricRow label="Transactions processed (M)" value={summary.txCountM} />
                </div>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  Revenue Structure Analysis
                </h2>
                <div className="mt-4 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueMix}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={95}
                      >
                        <Cell fill="#111827" />
                        <Cell fill="#94A3B8" />
                      </Pie>
                      <Tooltip formatter={(value: number | string) =>
                        typeof value === "number" ? `$${formatNumber(value, 1)}M` : value
                      } />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-sm text-slate-600">
                  Mix bajo este escenario:{" "}
                  <span className="font-medium">{formatNumber(summary.feeMixPct, 1)}% fees</span>{" "}
                  vs{" "}
                  <span className="font-medium">{formatNumber(summary.interestMixPct, 1)}% interest income</span>.
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">
                Operating Leverage Model
              </h2>
              <div className="mt-4 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={operatingLeverageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="volumeBn" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number | string, name: string) => [
                        typeof value === "number" ? formatNumber(value, 3) : value,
                        name,
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="costPerTx"
                      stroke="#111827"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  Strategy Execution Tracker
                </h2>
                <div className="mt-4 h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={phaseGroups}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="phase" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="volumeSharePct" name="% Volume" fill="#111827" />
                      <Bar dataKey="avgCapturePct" name="Avg Capture %" fill="#475569" />
                      <Bar dataKey="operationalControlPct" name="Operational Control %" fill="#CBD5E1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  Risk Dashboard
                </h2>
                <div className="mt-4 h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskRows}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="corridor"
                        tick={{ fontSize: 10 }}
                        interval={0}
                        angle={-18}
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="riskScore" fill="#111827" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  Early Signals
                </h2>
                <div className="mt-4 space-y-3">
                  {earlySignals.length > 0 ? (
                    earlySignals.map((item) => (
                      <div
                        key={item}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
                      >
                        {item}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      Todavía no aparecen señales tempranas claras.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  Failure Signals
                </h2>
                <div className="mt-4 space-y-3">
                  {failureSignals.length > 0 ? (
                    failureSignals.map((item) => (
                      <div
                        key={item}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
                      >
                        {item}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                      No hay señales fuertes de fallo en el escenario actual.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}