"use client";

import { useEffect, useState } from "react";
import { api, formatBRL } from "@/lib/api";

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

export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("controle.token") : null;
    api<Overview>("/dashboard/overview", { token })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, []);

  if (error) {
    return (
      <main className="min-h-screen p-6">
        <p className="text-accent-danger">Erro: {error}</p>
        <p className="text-ink-600 text-sm mt-2">
          Faça login primeiro para ver o dashboard real.
        </p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen p-6">
        <p className="text-ink-600">Carregando…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-ink-900">Dashboard</h1>
        <p className="text-sm text-ink-600">
          Período: {new Date(data.period.from).toLocaleDateString("pt-BR")} —{" "}
          {new Date(data.period.to).toLocaleDateString("pt-BR")}
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Faturamento" value={formatBRL(data.revenue)} />
        <Stat label="Lucro real" value={formatBRL(data.profit.netProfit)} accent />
        <Stat label="Margem" value={`${data.profit.margin}%`} />
        <Stat label="Retido na empresa" value={formatBRL(data.distribution.retained)} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-ink-900">Sócios</h2>
        <div className="rounded-2xl border border-ink-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-100 text-ink-600">
              <tr>
                <th className="text-left px-4 py-2">Sócio</th>
                <th className="text-right px-4 py-2">Cota</th>
                <th className="text-right px-4 py-2">Distribuído</th>
                <th className="text-right px-4 py-2">Retiradas</th>
                <th className="text-right px-4 py-2">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {data.distribution.partners.map((p) => (
                <tr key={p.partnerId} className="border-t border-ink-100">
                  <td className="px-4 py-3">{p.partnerName}</td>
                  <td className="px-4 py-3 text-right">{p.share}%</td>
                  <td className="px-4 py-3 text-right">{formatBRL(p.distributed)}</td>
                  <td className="px-4 py-3 text-right">{formatBRL(p.withdrawn)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatBRL(p.balance)}</td>
                </tr>
              ))}
              {data.distribution.partners.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ink-600">
                    Nenhum sócio cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-ink-600">{label}</p>
      <p
        className={
          "mt-1 text-xl sm:text-2xl font-bold " + (accent ? "text-accent" : "text-ink-900")
        }
      >
        {value}
      </p>
    </div>
  );
}
