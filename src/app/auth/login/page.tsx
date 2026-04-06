"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-xl font-semibold text-gray-100 mb-2">
          Check your email
        </h1>
        <p className="text-gray-500 text-sm">
          We sent a magic link to <strong className="text-gray-300">{email}</strong>.
          Click it to sign in.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-xl font-semibold text-gray-100 mb-6">
        Sign in to Gnosis
      </h1>
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-4 py-2.5 text-base bg-blue-950/30 border border-gray-700 rounded-md text-gray-200 placeholder-gray-600 focus:border-indigo-500 focus:outline-none focus-visible:outline-2 focus-visible:outline-indigo-400 focus-visible:outline-offset-2"
          required
        />
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="w-full px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {loading ? "Sending..." : "Send magic link"}
        </button>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </form>
    </div>
  );
}
