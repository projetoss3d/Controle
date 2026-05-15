/**
 * Cliente HTTP fino para a API do Controle.
 * Lê a base URL de NEXT_PUBLIC_API_URL — nada hardcoded.
 */
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface ApiOptions extends RequestInit {
  token?: string | null;
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  headers.set("content-type", "application/json");
  if (opts.token) headers.set("authorization", `Bearer ${opts.token}`);

  const res = await fetch(`${BASE}/api${path}`, { ...opts, headers, cache: "no-store" });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const formatBRL = (n: number): string =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export const formatDate = (d: string | Date): string =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export const formatMonth = (d: string | Date): string =>
  new Date(d).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
