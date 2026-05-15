"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface LoginResponse {
  token: string;
  user: { id: string; name: string; email: string; role: string };
  tenant: { id: string; slug: string; name: string };
}

export default function LoginPage() {
  const router = useRouter();
  const [tenantSlug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await api<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ tenantSlug, email, password }),
      });
      // Token salvo simples para o skeleton; substituir por cookie httpOnly em produção.
      if (typeof window !== "undefined") {
        localStorage.setItem("controle.token", r.token);
        localStorage.setItem("controle.tenant", r.tenant.slug);
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-ink-900">Entrar</h1>

        <Field label="Empresa (slug)">
          <input
            value={tenantSlug}
            onChange={(e) => setSlug(e.target.value)}
            required
            className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3 outline-none focus:border-ink-400"
            placeholder="minha-empresa"
            autoCapitalize="none"
          />
        </Field>

        <Field label="E-mail">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3 outline-none focus:border-ink-400"
          />
        </Field>

        <Field label="Senha">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3 outline-none focus:border-ink-400"
          />
        </Field>

        {error && <p className="text-sm text-accent-danger">{error}</p>}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-ink-900 px-5 py-3 text-white font-medium disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink-600">{label}</span>
      {children}
    </label>
  );
}
