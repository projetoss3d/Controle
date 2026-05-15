"use client";

import { useEffect, useState } from "react";
import { api, formatBRL, formatDate } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Button, Card, Empty, Field, Input, Pill, Spinner } from "@/components/ui";

interface Category { id: string; key: string; label: string }
interface Customer { id: string; name: string }
interface Project { id: string; name: string }
interface Expense {
  id: string;
  description: string;
  amount: string | number;
  occurredAt: string;
  kind: "FIXED" | "VARIABLE";
  nature: "DIRECT" | "INDIRECT" | "OPERATIONAL";
  recurring: boolean;
  category: Category | null;
  project: Project | null;
  customer: Customer | null;
}

export default function DespesasPage() {
  return (
    <AppShell>
      <DespesasContent />
    </AppShell>
  );
}

function DespesasContent() {
  const { token } = useAuth();
  const [items, setItems] = useState<Expense[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const [exp, cat, cus, prj] = await Promise.all([
      api<Expense[]>("/expenses", { token }),
      api<Category[]>("/lookups/expense-categories", { token }),
      api<Customer[]>("/customers", { token }),
      api<Project[]>("/projects", { token }),
    ]);
    setItems(exp);
    setCategories(cat);
    setCustomers(cus);
    setProjects(prj);
  };

  useEffect(() => {
    if (!token) return;
    load().catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, [token]);

  const total = items ? items.reduce((s, e) => s + Number(e.amount), 0) : 0;

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Despesas</h1>
          <p className="text-sm text-ink-600">Diretas, indiretas e operacionais.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancelar" : "+ Nova"}</Button>
      </header>

      <Card>
        <p className="text-xs text-ink-600">Total acumulado</p>
        <p className="mt-1 text-xl font-bold text-accent-danger">{formatBRL(total)}</p>
      </Card>

      {showForm && (
        <NewExpenseForm
          token={token}
          categories={categories}
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
        <Empty title="Sem despesas." hint="Clique em + Nova para registrar." />
      ) : (
        <ul className="space-y-2">
          {items.map((e) => (
            <li key={e.id}>
              <Card className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink-900">{e.description}</p>
                    <p className="text-xs text-ink-600">
                      {formatDate(e.occurredAt)}
                      {e.category ? ` · ${e.category.label}` : ""}
                      {e.project ? ` · ${e.project.name}` : ""}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Pill tone={e.nature === "DIRECT" ? "warn" : "neutral"}>{labelNature(e.nature)}</Pill>
                      {e.recurring && <Pill tone="good">Recorrente</Pill>}
                    </div>
                  </div>
                  <p className="font-semibold whitespace-nowrap">{formatBRL(Number(e.amount))}</p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function labelNature(n: Expense["nature"]) {
  return n === "DIRECT" ? "Direta" : n === "INDIRECT" ? "Indireta" : "Operacional";
}

function NewExpenseForm({
  token,
  categories,
  customers,
  projects,
  onCreated,
}: {
  token: string | null;
  categories: Category[];
  customers: Customer[];
  projects: Project[];
  onCreated: () => void;
}) {
  const [description, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [occurredAt, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [kind, setKind] = useState<"FIXED" | "VARIABLE">("VARIABLE");
  const [nature, setNature] = useState<"DIRECT" | "INDIRECT" | "OPERATIONAL">("OPERATIONAL");
  const [categoryId, setCategoryId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await api("/expenses", {
        token,
        method: "POST",
        body: JSON.stringify({
          description,
          amount: Number(amount),
          occurredAt: new Date(occurredAt + "T12:00:00").toISOString(),
          kind,
          nature,
          categoryId: categoryId || undefined,
          customerId: customerId || undefined,
          projectId: projectId || undefined,
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
        <Field label="Descrição"><Input value={description} onChange={(e) => setDesc(e.target.value)} required /></Field>
        <Field label="Valor (R$)"><Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
        <Field label="Data"><Input type="date" value={occurredAt} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Categoria">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3">
            <option value="">—</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Tipo">
          <select value={kind} onChange={(e) => setKind(e.target.value as "FIXED" | "VARIABLE")} className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3">
            <option value="VARIABLE">Variável</option>
            <option value="FIXED">Fixa</option>
          </select>
        </Field>
        <Field label="Natureza">
          <select value={nature} onChange={(e) => setNature(e.target.value as "DIRECT" | "INDIRECT" | "OPERATIONAL")} className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3">
            <option value="OPERATIONAL">Operacional</option>
            <option value="DIRECT">Direta (cliente/projeto)</option>
            <option value="INDIRECT">Indireta</option>
          </select>
        </Field>
        <Field label="Cliente">
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3">
            <option value="">—</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Projeto">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3">
            <option value="">—</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2 flex items-center justify-end gap-2">
          {err && <span className="mr-auto text-sm text-accent-danger">{err}</span>}
          <Button type="submit" disabled={loading}>{loading ? "Salvando…" : "Salvar"}</Button>
        </div>
      </form>
    </Card>
  );
}
