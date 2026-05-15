"use client";

import { useEffect, useState } from "react";
import { api, formatBRL, formatDate } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Button, Card, Empty, Field, Input, Pill, Spinner } from "@/components/ui";

interface Installment {
  id: string;
  number: number;
  amount: number;
  dueDate: string;
  status: "PENDING" | "PAID" | "OVERDUE";
  paidAt: string | null;
}
interface Customer { id: string; name: string }
interface Project { id: string; name: string }
interface Revenue {
  id: string;
  description: string;
  amount: string | number;
  directCost: string | number;
  issuedAt: string;
  status: "CONTRACTED" | "PARTIAL" | "PAID" | "CANCELLED";
  customer: Customer | null;
  project: Project | null;
  installments: Installment[];
}

export default function ReceitasPage() {
  return (
    <AppShell>
      <ReceitasContent />
    </AppShell>
  );
}

function ReceitasContent() {
  const { token } = useAuth();
  const [items, setItems] = useState<Revenue[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const [rev, cus, prj] = await Promise.all([
      api<Revenue[]>("/revenues", { token }),
      api<Customer[]>("/customers", { token }),
      api<Project[]>("/projects", { token }),
    ]);
    setItems(rev);
    setCustomers(cus);
    setProjects(prj);
  };

  useEffect(() => {
    if (!token) return;
    load().catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, [token]);

  async function pay(installmentId: string) {
    try {
      await api(`/revenues/installments/${installmentId}/pay`, { token, method: "POST", body: JSON.stringify({}) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  }

  const totalReceived = items
    ? items
        .flatMap((r) => r.installments)
        .filter((i) => i.status === "PAID")
        .reduce((s, i) => s + Number(i.amount), 0)
    : 0;
  const totalContracted = items ? items.reduce((s, r) => s + Number(r.amount), 0) : 0;

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Receitas</h1>
          <p className="text-sm text-ink-600">Contratado e recebido (parcelas).</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancelar" : "+ Nova"}</Button>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-ink-600">Contratado</p>
          <p className="mt-1 text-xl font-bold">{formatBRL(totalContracted)}</p>
        </Card>
        <Card>
          <p className="text-xs text-ink-600">Recebido</p>
          <p className="mt-1 text-xl font-bold text-accent">{formatBRL(totalReceived)}</p>
        </Card>
      </section>

      {showForm && (
        <NewRevenueForm
          token={token}
          customers={customers}
          projects={projects}
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
        <Empty title="Sem receitas ainda." hint="Clique em + Nova para registrar." />
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id}>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink-900">{r.description}</p>
                    <p className="text-xs text-ink-600">
                      {r.customer?.name ?? "—"} · {formatDate(r.issuedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatBRL(Number(r.amount))}</p>
                    <Pill tone={r.status === "PAID" ? "good" : r.status === "PARTIAL" ? "warn" : "neutral"}>
                      {labelStatus(r.status)}
                    </Pill>
                  </div>
                </div>
                {r.installments.length > 0 && (
                  <ul className="mt-3 divide-y divide-ink-100 border-t border-ink-100">
                    {r.installments.map((i) => (
                      <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                        <span>
                          Parcela {i.number} · vence {formatDate(i.dueDate)}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{formatBRL(Number(i.amount))}</span>
                          {i.status === "PAID" ? (
                            <Pill tone="good">Pago</Pill>
                          ) : (
                            <Button variant="secondary" onClick={() => pay(i.id)}>
                              Marcar como pago
                            </Button>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function labelStatus(s: Revenue["status"]) {
  return s === "PAID" ? "Pago" : s === "PARTIAL" ? "Parcial" : s === "CONTRACTED" ? "Contratado" : "Cancelado";
}

function NewRevenueForm({
  token,
  customers,
  projects,
  onCreated,
}: {
  token: string | null;
  customers: Customer[];
  projects: Project[];
  onCreated: () => void;
}) {
  const [description, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [directCost, setCost] = useState("0");
  const [customerId, setCustomerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [installmentsCount, setInst] = useState("1");
  const [issuedAt, setIssuedAt] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const total = Number(amount);
      const count = Math.max(1, Number(installmentsCount));
      const issuedDate = new Date(issuedAt + "T12:00:00");
      const per = Math.round((total / count) * 100) / 100;
      const installments = Array.from({ length: count }).map((_, k) => {
        const due = new Date(issuedDate);
        due.setMonth(due.getMonth() + k);
        return { number: k + 1, amount: per, dueDate: due.toISOString() };
      });
      await api("/revenues", {
        token,
        method: "POST",
        body: JSON.stringify({
          description,
          amount: total,
          directCost: Number(directCost) || 0,
          issuedAt: issuedDate.toISOString(),
          customerId: customerId || undefined,
          projectId: projectId || undefined,
          installments,
        }),
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
        <Field label="Descrição">
          <Input value={description} onChange={(e) => setDesc(e.target.value)} required />
        </Field>
        <Field label="Valor (R$)">
          <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
        <Field label="Custo direto (R$)">
          <Input type="number" min="0" step="0.01" value={directCost} onChange={(e) => setCost(e.target.value)} />
        </Field>
        <Field label="Data">
          <Input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
        </Field>
        <Field label="Cliente">
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3"
          >
            <option value="">—</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Projeto">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3"
          >
            <option value="">—</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Parcelas">
          <Input type="number" min="1" max="36" value={installmentsCount} onChange={(e) => setInst(e.target.value)} />
        </Field>
        <div className="sm:col-span-2 flex items-center justify-end gap-2">
          {err && <span className="mr-auto text-sm text-accent-danger">{err}</span>}
          <Button type="submit" disabled={loading}>{loading ? "Salvando…" : "Salvar"}</Button>
        </div>
      </form>
    </Card>
  );
}
