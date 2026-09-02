"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setReady(true);
      } else {
        setError(
          "This password reset link is invalid or has expired. Please request a new one."
        );
      }
    };

    checkSession();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error("UPDATE PASSWORD ERROR:", error);
        setError(error.message);
        return;
      }

      setMessage("Your password has been updated successfully.");

      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (error) {
      console.error("UPDATE PASSWORD ERROR:", error);
      setError("Unable to update your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Set New Password
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Enter your new password below.
          </p>
        </div>

        {!ready && !error && (
          <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
            Verifying password reset link...
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {message}
          </div>
        )}

        {ready && !message && (
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                New Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Confirm New Password
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}

        <div className="mt-5 text-center">
          <a
            href="/"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            ← Back to Login
          </a>
        </div>
      </div>
    </main>
  );
}