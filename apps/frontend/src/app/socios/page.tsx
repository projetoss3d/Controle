"use client";

import { useEffect, useState } from "react";
import { api, formatBRL, formatDate } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Button, Card, Empty, Field, Input, Pill, Spinner } from "@/components/ui";

interface Partner {
  id: string;
  name: string;
  type: "WORKING" | "INVESTOR" | "PRO_LABORE";
  profitShare: string | number;
  hourlyRate?: string | number | null;
}
interface Withdrawal {
  id: string;
  partnerId: string;
  type: string;
  amount: string | number;
  occurredAt: string;
  description?: string | null;
}

export default function SociosPage() {
  return (
    <AppShell>
      <SociosContent />
    </AppShell>
  );
}

function SociosContent() {
  const { token } = useAuth();
  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Partner | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[] | null>(null);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [showPartner, setShowPartner] = useState(false);

  const load = async () => {
    const list = await api<Partner[]>("/partners", { token });
    setPartners(list);
  };

  useEffect(() => {
    if (!token) return;
    load().catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, [token]);

  async function openPartner(p: Partner) {
    setSelected(p);
    setWithdrawals(null);
    try {
      const w = await api<Withdrawal[]>(`/partners/${p.id}/withdrawals`, { token });
      setWithdrawals(w);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  }

  const totalShare = partners
    ? partners.reduce((s, p) => s + Number(p.profitShare), 0)
    : 0;

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Sócios</h1>
          <p className="text-sm text-ink-600">
            Cota distribuída: {totalShare}% · Retido na empresa: {Math.max(0, 100 - totalShare)}%
          </p>
        </div>
        <Button onClick={() => setShowPartner((v) => !v)}>{showPartner ? "Cancelar" : "+ Sócio"}</Button>
      </header>

      {showPartner && (
        <NewPartnerForm
          token={token}
          onCreated={() => {
            setShowPartner(false);
            load();
          }}
        />
      )}

      {error && <p className="text-sm text-accent-danger">{error}</p>}

      {!partners ? (
        <div className="flex items-center gap-2 text-ink-600"><Spinner /> Carregando…</div>
      ) : partners.length === 0 ? (
        <Empty title="Nenhum sócio." hint="Crie pelo menos um para distribuir lucro." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {partners.map((p) => (
            <li key={p.id}>
              <button onClick={() => openPartner(p)} className="w-full text-left">
                <Card className="hover:border-ink-400">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink-900">{p.name}</p>
                      <p className="text-xs text-ink-600">{labelType(p.type)}</p>
                    </div>
                    <Pill tone="good">{Number(p.profitShare)}%</Pill>
                  </div>
                </Card>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <Card>
          <header className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">{selected.name}</h2>
              <p className="text-xs text-ink-600">
                Cota {Number(selected.profitShare)}% ·{" "}
                {selected.hourlyRate ? `R$ ${Number(selected.hourlyRate)}/h` : "sem valor/h"}
              </p>
            </div>
            <Button onClick={() => setShowWithdrawal((v) => !v)}>
              {showWithdrawal ? "Cancelar" : "+ Retirada"}
            </Button>
          </header>

          {showWithdrawal && (
            <NewWithdrawalForm
              token={token}
              partnerId={selected.id}
              onCreated={() => {
                setShowWithdrawal(false);
                openPartner(selected);
              }}
            />
          )}

          {!withdrawals ? (
            <div className="flex items-center gap-2 text-ink-600"><Spinner /> Carregando retiradas…</div>
          ) : withdrawals.length === 0 ? (
            <Empty title="Sem retiradas." />
          ) : (
            <ul className="divide-y divide-ink-100">
              {withdrawals.map((w) => (
                <li key={w.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <span className="font-medium">{labelWType(w.type)}</span>
                    <span className="text-ink-600"> · {formatDate(w.occurredAt)}</span>
                  </span>
                  <span className="font-semibold">{formatBRL(Number(w.amount))}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

function labelType(t: Partner["type"]) {
  return t === "WORKING" ? "Sócio operacional" : t === "INVESTOR" ? "Investidor" : "Pró-labore";
}

function labelWType(t: string) {
  switch (t) {
    case "ADVANCE": return "Vale";
    case "PRO_LABORE": return "Pró-labore";
    case "PROFIT_DISTRIBUTION": return "Distribuição de lucro";
    case "LOAN": return "Empréstimo";
    default: return t;
  }
}

function NewPartnerForm({ token, onCreated }: { token: string | null; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [share, setShare] = useState("");
  const [rate, setRate] = useState("");
  const [type, setType] = useState<Partner["type"]>("WORKING");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await api("/partners", {
        token,
        method: "POST",
        body: JSON.stringify({
          name,
          type,
          profitShare: Number(share) || 0,
          hourlyRate: rate ? Number(rate) : undefined,
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
        <Field label="Nome"><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label="Tipo">
          <select value={type} onChange={(e) => setType(e.target.value as Partner["type"])} className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3">
            <option value="WORKING">Operacional</option>
            <option value="INVESTOR">Investidor</option>
            <option value="PRO_LABORE">Pró-labore</option>
          </select>
        </Field>
        <Field label="Cota (%)" hint="Soma das cotas pode ser < 100; o resto é retido na empresa.">
          <Input type="number" min="0" max="100" step="0.01" value={share} onChange={(e) => setShare(e.target.value)} />
        </Field>
        <Field label="Valor/hora (R$)">
          <Input type="number" min="0" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
        </Field>
        <div className="sm:col-span-2 flex items-center justify-end gap-2">
          {err && <span className="mr-auto text-sm text-accent-danger">{err}</span>}
          <Button type="submit" disabled={loading}>{loading ? "Salvando…" : "Salvar"}</Button>
        </div>
      </form>
    </Card>
  );
}

function NewWithdrawalForm({
  token,
  partnerId,
  onCreated,
}: {
  token: string | null;
  partnerId: string;
  onCreated: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("ADVANCE");
  const [occurredAt, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await api("/partners/withdrawals", {
        token,
        method: "POST",
        body: JSON.stringify({
          partnerId,
          amount: Number(amount),
          type,
          occurredAt: new Date(occurredAt + "T12:00:00").toISOString(),
          description: description || undefined,
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
    <form onSubmit={submit} className="mb-3 grid gap-3 sm:grid-cols-2 rounded-xl bg-ink-50 p-3">
      <Field label="Valor (R$)">
        <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </Field>
      <Field label="Tipo">
        <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3">
          <option value="ADVANCE">Vale / antecipação</option>
          <option value="PRO_LABORE">Pró-labore</option>
          <option value="PROFIT_DISTRIBUTION">Distribuição de lucro</option>
          <option value="LOAN">Empréstimo</option>
          <option value="OTHER">Outro</option>
        </select>
      </Field>
      <Field label="Data">
        <Input type="date" value={occurredAt} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Descrição">
        <Input value={description} onChange={(e) => setDesc(e.target.value)} />
      </Field>
      <div className="sm:col-span-2 flex items-center justify-end gap-2">
        {err && <span className="mr-auto text-sm text-accent-danger">{err}</span>}
        <Button type="submit" disabled={loading}>{loading ? "Salvando…" : "Registrar retirada"}</Button>
      </div>
    </form>
  );
}
