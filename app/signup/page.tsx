"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed"); setLoading(false); return; }
      await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      router.push("/");
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
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
            <h1 className="font-display text-2xl font-semibold text-charcoal">Create account</h1>
            <p className="text-muted text-sm mt-1">Start discovering and saving colleges</p>
          </div>

          {error && (
            <div className="bg-error-100 border border-error/20 text-error text-sm px-4 py-3 rounded-xl mb-5">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl border border-line bg-white text-charcoal placeholder-muted focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-line bg-white text-charcoal placeholder-muted focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Min 8 characters"
                className="w-full px-4 py-3 rounded-xl border border-line bg-white text-charcoal placeholder-muted focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink-900 hover:bg-ink-800 text-paper font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm text-muted">
              Already have an account?{" "}
              <Link href="/login" className="text-ink-800 font-semibold hover:text-gold-600">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
