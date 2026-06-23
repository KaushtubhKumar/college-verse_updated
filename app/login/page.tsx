"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { ...form, redirect: false });
    setLoading(false);
    if (res?.error) setError("Invalid email or password");
    else router.push("/");
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-ink-950 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 15% 85%, white 0, transparent 40%), radial-gradient(circle at 90% 10%, white 0, transparent 40%)" }}
      />
      <div className="w-full max-w-md relative">
        <div className="bg-paper rounded-[1.75rem] shadow-2xl p-8">
          <div className="text-center mb-8">
            <span className="w-12 h-12 rounded-full bg-gold-500 seal-sheen ring-4 ring-gold-700/30 inline-flex items-center justify-center text-ink-950 font-mono-label font-bold text-sm mb-4">CV</span>
            <h1 className="font-display text-2xl font-semibold text-charcoal">Welcome back</h1>
            <p className="text-muted text-sm mt-1">Sign in to access your saved colleges</p>
          </div>

          {error && (
            <div className="bg-error-100 border border-error/20 text-error text-sm px-4 py-3 rounded-xl mb-5">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-line bg-white text-charcoal placeholder-muted focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-line bg-white text-charcoal placeholder-muted focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink-900 hover:bg-ink-800 text-paper font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm text-muted">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-ink-800 font-semibold hover:text-gold-600">Sign up</Link>
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-line text-center">
            <p className="text-xs text-muted font-mono-label">Demo: demo@college.dev / demo1234</p>
          </div>
        </div>
      </div>
    </div>
  );
}
