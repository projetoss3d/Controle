import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-ink-900">
        Controle
      </h1>
      <p className="mt-4 max-w-md text-ink-600">
        Gestão financeira inteligente para pequenas empresas com múltiplos sócios.
        Lucro real, previsibilidade e distribuição societária justa.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/login"
          className="rounded-xl bg-ink-900 px-5 py-3 text-white font-medium shadow-sm hover:bg-ink-800 transition"
        >
          Entrar
        </Link>
        <Link
          href="/dashboard"
          className="rounded-xl border border-ink-200 bg-white px-5 py-3 text-ink-900 font-medium hover:bg-ink-100 transition"
        >
          Ver dashboard demo
        </Link>
      </div>
    </main>
  );
}
