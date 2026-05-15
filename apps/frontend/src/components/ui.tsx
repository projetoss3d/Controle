"use client";

import { forwardRef } from "react";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-ink-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "bad" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "text-accent"
      : tone === "bad"
      ? "text-accent-danger"
      : tone === "warn"
      ? "text-accent-warn"
      : "text-ink-900";
  return (
    <Card>
      <p className="text-xs text-ink-600">{label}</p>
      <p className={`mt-1 text-xl sm:text-2xl font-bold ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </Card>
  );
}

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost";
  }
>(function Button({ variant = "primary", className = "", ...rest }, ref) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-ink-900 text-white hover:bg-ink-800"
      : variant === "secondary"
      ? "border border-ink-200 bg-white text-ink-900 hover:bg-ink-100"
      : "text-ink-600 hover:bg-ink-100";
  return <button ref={ref} className={`${base} ${styles} ${className}`} {...rest} />;
});

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={`w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-base outline-none focus:border-ink-400 ${className}`}
        {...rest}
      />
    );
  },
);

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

export function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink-200 border-t-ink-900"
    />
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card className="text-center">
      <p className="font-medium text-ink-900">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-600">{hint}</p>}
    </Card>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "bad" | "warn";
}) {
  const map = {
    neutral: "bg-ink-100 text-ink-600",
    good: "bg-emerald-100 text-emerald-800",
    bad: "bg-red-100 text-red-800",
    warn: "bg-amber-100 text-amber-800",
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}
