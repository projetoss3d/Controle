"use client";

import { useEffect, useState } from "react";
import { api, formatBRL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Card, Empty, Pill, Spinner, StatCard } from "@/components/ui";

interface PartnerLine {
  partnerId: string;
  partnerName: string;
  share: number;
  distributed: number;
  withdrawn: number;
  balance: number;
}

interface Overview {
  period: { from: string; to: string };
  revenue: number;
  costs: { direct: number; indirect: number; operational: number };
  profit: { grossProfit: number; operatingProfit: number; netProfit: number; margin: number };
  distribution: { distributable: number; retained: number; partners: PartnerLine[] };
}

interface MonthlyPoint {
  month: string;
  revenue: number;
  totalCost: number;
  netProfit: number;
}

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const { token } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [series, setSeries] = useState<MonthlyPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api<Overview>("/dashboard/overview", { token }),
      api<MonthlyPoint[]>("/dashboard/monthly?months=6", { token }),
    ])
      .then(([o, s]) => {
        setOverview(o);
        setSeries(s);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, [token]);

  if (error) return <p className="text-accent-danger">Erro: {error}</p>;
  if (!overview || !series) {
    return (
      <div className="flex items-center gap-2 text-ink-600">
        <Spinner /> Carregando…
      </div>
    );
  }

  const profitTone = overview.profit.netProfit >= 0 ? "good" : "bad";
  const verdict =
    overview.profit.netProfit > 0
      ? "Você está lucrando este mês."
      : overview.profit.netProfit === 0
      ? "Você está apenas girando dinheiro."
      : "Atenção: prejuízo no período.";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink-900">Resumo do mês</h1>
        <p className="mt-1 text-sm text-ink-600">
          {new Date(overview.period.from).toLocaleDateString("pt-BR")} —{" "}
          {new Date(overview.period.to).toLocaleDateString("pt-BR")} · {verdict}
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Faturamento" value={formatBRL(overview.revenue)} />
        <StatCard
          label="Lucro real"
          value={formatBRL(overview.profit.netProfit)}
          tone={profitTone}
          hint={`Margem ${overview.profit.margin}%`}
        />
        <StatCard
          label="Custos totais"
          value={formatBRL(
            overview.costs.direct + overview.costs.indirect + overview.costs.operational,
          )}
          hint={`Diretos ${formatBRL(overview.costs.direct)}`}
        />
        <StatCard
          label="Retido na empresa"
          value={formatBRL(overview.distribution.retained)}
          tone="warn"
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink-900">Histórico (6 meses)</h2>
        <Card>
          <MonthlyChart data={series} />
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink-900">Sócios</h2>
        {overview.distribution.partners.length === 0 ? (
          <Empty title="Nenhum sócio cadastrado." hint="Cadastre sócios em /socios para ver a distribuição." />
        ) : (
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ink-100 text-ink-600">
                <tr>
                  <th className="text-left px-4 py-2">Sócio</th>
                  <th className="text-right px-4 py-2">Cota</th>
                  <th className="text-right px-4 py-2 hidden sm:table-cell">Distribuído</th>
                  <th className="text-right px-4 py-2 hidden sm:table-cell">Retiradas</th>
                  <th className="text-right px-4 py-2">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {overview.distribution.partners.map((p) => (
                  <tr key={p.partnerId} className="border-t border-ink-100">
                    <td className="px-4 py-3 font-medium text-ink-900">{p.partnerName}</td>
                    <td className="px-4 py-3 text-right">
                      <Pill>{p.share}%</Pill>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      {formatBRL(p.distributed)}
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      {formatBRL(p.withdrawn)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <span className={p.balance >= 0 ? "text-accent" : "text-accent-danger"}>
                        {formatBRL(p.balance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}

/** Gráfico de barras SVG sem dependências externas. */
function MonthlyChart({ data }: { data: MonthlyPoint[] }) {
  const w = 700;
  const h = 220;
  const padX = 32;
  const padY = 24;
  const max = Math.max(1, ...data.map((d) => Math.max(d.revenue, d.totalCost, Math.abs(d.netProfit))));
  const barW = (w - padX * 2) / (data.length * 3 + (data.length - 1));
  const groupW = barW * 3 + barW; // 3 barras + gap

  const yFor = (v: number) => h - padY - (Math.max(0, v) / max) * (h - padY * 2);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="min-w-[560px] w-full h-56" role="img" aria-label="Histórico mensal">
        {/* baseline */}
        <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke="#d3d6dc" />
        {data.map((d, i) => {
          const x0 = padX + i * groupW;
          return (
            <g key={d.month}>
              <rect x={x0} y={yFor(d.revenue)} width={barW} height={h - padY - yFor(d.revenue)} fill="#1f2430" rx={3} />
              <rect
                x={x0 + barW}
                y={yFor(d.totalCost)}
                width={barW}
                height={h - padY - yFor(d.totalCost)}
                fill="#8a92a0"
                rx={3}
              />
              <rect
                x={x0 + barW * 2}
                y={yFor(d.netProfit)}
                width={barW}
                height={Math.max(2, h - padY - yFor(d.netProfit))}
                fill={d.netProfit >= 0 ? "#10b981" : "#ef4444"}
                rx={3}
              />
              <text x={x0 + (barW * 3) / 2} y={h - 6} fontSize="10" fill="#4a5260" textAnchor="middle">
                {d.month.slice(2).replace("-", "/")}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-600">
        <Legend color="#1f2430" label="Faturamento" />
        <Legend color="#8a92a0" label="Custos" />
        <Legend color="#10b981" label="Lucro" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
