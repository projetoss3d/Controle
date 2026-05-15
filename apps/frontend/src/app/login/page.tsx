"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [tenantSlug, setSlug] = useState("demo");
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ tenantSlug, email, password });
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
        <header className="text-center">
          <h1 className="text-2xl font-bold text-ink-900">Entrar</h1>
          <p className="mt-1 text-sm text-ink-600">Conta demo já preenchida abaixo.</p>
        </header>

        <Field label="Empresa (slug)">
          <Input value={tenantSlug} onChange={(e) => setSlug(e.target.value)} required autoCapitalize="none" />
        </Field>
        <Field label="E-mail">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Senha">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>

        {error && <p className="text-sm text-accent-danger">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </main>
  );
}
