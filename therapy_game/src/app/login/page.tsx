"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildUserIdFromEmail } from "@/lib/userIdentity";

const VALID_EMAIL = "admin@admin.com";
const VALID_PASSWORD = "admin";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      triggerError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    // Simulate a brief loading delay for polish
    await new Promise((res) => setTimeout(res, 800));

    if (email === VALID_EMAIL && password === VALID_PASSWORD) {
      // Store auth state in localStorage
      localStorage.setItem("iaso_ai_auth", "true");
      localStorage.setItem("iaso_ai_user_id", buildUserIdFromEmail(email));
      router.push("/");
    } else {
      setLoading(false);
      triggerError("Invalid email or password.");
    }
  };

  const triggerError = (msg: string) => {
    setError(msg);
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  return (
    <div className="bg-gradient-animated relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Floating decorative orbs */}
      <div
        className="pointer-events-none absolute top-20 left-10 h-72 w-72 rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, rgba(255,107,44,0.62) 0%, transparent 70%)",
          animation: "float 6s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute right-16 bottom-24 h-56 w-56 rounded-full opacity-15"
        style={{
          background:
            "radial-gradient(circle, rgba(34,211,238,0.52) 0%, transparent 70%)",
          animation: "float 8s ease-in-out 2s infinite",
        }}
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10"
        style={{
          background:
            "radial-gradient(circle, rgba(255,159,89,0.42) 0%, transparent 60%)",
          animation: "float 10s ease-in-out 1s infinite",
        }}
      />

      {/* Login Card */}
      <div
        className={`glass-card pulse-glow relative z-10 w-full max-w-md p-10 ${shaking ? "shake" : ""
          } animate-fade-in-up`}
      >
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Interview Gym
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Sign in to start your next interview training block
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-5 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-center text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email field */}
          <div className="animate-fade-in-up-delay-1">
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-[var(--text-muted)]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@admin.com"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-white placeholder-[var(--text-muted)]/60 transition-all duration-300 focus:border-[var(--primary-light)] focus:ring-2 focus:ring-[var(--glow)] focus:outline-none"
            />
          </div>

          {/* Password field */}
          <div className="animate-fade-in-up-delay-2">
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-[var(--text-muted)]"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-white placeholder-[var(--text-muted)]/60 transition-all duration-300 focus:border-[var(--primary-light)] focus:ring-2 focus:ring-[var(--glow)] focus:outline-none"
            />
          </div>

          {/* Submit button */}
          <div className="animate-fade-in-up-delay-3 pt-2">
            <button
              id="login-button"
              type="submit"
              disabled={loading}
              className="relative w-full cursor-pointer overflow-hidden rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] px-6 py-3.5 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,107,44,0.45)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-5 w-5 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </div>
        </form>

        {/* Footer hint */}
        <p className="mt-6 text-center text-xs text-[var(--text-muted)]/70">
          Train your interview instincts every day
        </p>
      </div>
    </div>
  );
}
