"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (!auth.ready) return;
    if (auth.token) router.replace("/dashboard");
  }, [auth.ready, auth.token, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-ink-900">Controle</h1>
      <p className="mt-4 max-w-md text-ink-600">
        Gestão financeira inteligente para pequenas empresas com múltiplos sócios. Lucro real,
        previsibilidade e distribuição societária justa.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:w-auto">
        <Link
          href="/login"
          className="rounded-xl bg-ink-900 px-5 py-3 text-white font-medium shadow-sm hover:bg-ink-800 transition"
        >
          Entrar na conta demo
        </Link>
      </div>
      <p className="mt-6 text-xs text-ink-400 max-w-md">
        Conta de demonstração: <strong>demo</strong> · admin@demo.com · senha <strong>demo1234</strong>
      </p>
    </main>
  );
}
