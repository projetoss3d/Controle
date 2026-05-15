"use client";

import { useEffect, useState } from "react";
import { api, formatBRL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Button, Card, Empty, Field, Input, Pill, Spinner } from "@/components/ui";

interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

interface Dashboard {
  customer: Customer;
  totals: {
    revenue: number;
    revenueCount: number;
    averageTicket: number;
    costs: { direct: number; indirect: number; operational: number };
    profit: { netProfit: number; margin: number };
  };
}

export default function ClientesPage() {
  return (
    <AppShell>
      <ClientesContent />
    </AppShell>
  );
}

function ClientesContent() {
  const { token } = useAuth();
  const [items, setItems] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Dashboard | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const list = await api<Customer[]>("/customers", { token });
    setItems(list);
  };

  useEffect(() => {
    if (!token) return;
    load().catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, [token]);

  async function open(id: string) {
    setSelected(null);
    try {
      const d = await api<Dashboard>(`/customers/${id}/dashboard`, { token });
      setSelected(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Clientes</h1>
          <p className="text-sm text-ink-600">Lucro real por cliente.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancelar" : "+ Novo"}</Button>
      </header>

      {showForm && (
        <NewCustomerForm
          token={token}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {error && <p className="text-sm text-accent-danger">{error}</p>}

      {!items ? (
        <div className="flex items-center gap-2 text-ink-600"><Spinner /> Carregando…</div>
      ) : items.length === 0 ? (
        <Empty title="Sem clientes." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((c) => (
            <li key={c.id}>
              <button onClick={() => open(c.id)} className="w-full text-left">
                <Card className="hover:border-ink-400 transition">
                  <p className="font-medium text-ink-900">{c.name}</p>
                  <p className="text-xs text-ink-600">{c.email ?? "—"}</p>
                </Card>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <Card>
          <header className="mb-3">
            <h2 className="text-lg font-semibold text-ink-900">{selected.customer.name}</h2>
            <p className="text-xs text-ink-600">{selected.totals.revenueCount} receita(s)</p>
          </header>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Mini label="Faturamento" value={formatBRL(selected.totals.revenue)} />
            <Mini label="Ticket médio" value={formatBRL(selected.totals.averageTicket)} />
            <Mini
              label="Lucro real"
              value={formatBRL(selected.totals.profit.netProfit)}
              tone={selected.totals.profit.netProfit >= 0 ? "good" : "bad"}
            />
            <Mini label="Margem" value={`${selected.totals.profit.margin}%`} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Pill>Direto: {formatBRL(selected.totals.costs.direct)}</Pill>
            <Pill>Indireto: {formatBRL(selected.totals.costs.indirect)}</Pill>
            <Pill>Operacional: {formatBRL(selected.totals.costs.operational)}</Pill>
          </div>
        </Card>
      )}
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const cls = tone === "good" ? "text-accent" : tone === "bad" ? "text-accent-danger" : "text-ink-900";
  return (
    <div className="rounded-xl bg-ink-50 p-3">
      <p className="text-[11px] text-ink-600">{label}</p>
      <p className={`mt-0.5 font-bold ${cls}`}>{value}</p>
    </div>
  );
}

function NewCustomerForm({ token, onCreated }: { token: string | null; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await api("/customers", {
        token,
        method: "POST",
        body: JSON.stringify({ name, email: email || undefined, phone: phone || undefined }),
      });
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome"><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label="E-mail"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Telefone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <div className="sm:col-span-2 flex items-center justify-end gap-2">
          {err && <span className="mr-auto text-sm text-accent-danger">{err}</span>}
          <Button type="submit" disabled={loading}>{loading ? "Salvando…" : "Salvar"}</Button>
        </div>
      </form>
    </Card>
  );
}
