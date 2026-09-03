"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/api/client";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState("+919999900001");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(phone, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not log in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-4 py-16">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Log in</h1>
      <p className="mb-8 text-muted">Access your policy, claims, and coverage.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Phone number
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-brand"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-full bg-brand px-6 py-3 font-medium text-white disabled:opacity-60"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-6 text-xs text-muted">
        Demo beneficiary: +919999900001 / demo1234 · Demo admin: +919999900099 / demo1234
      </p>
    </div>
  );
}
