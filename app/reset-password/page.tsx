"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/update-password`,
        }
      );

      if (error) {
        console.error("RESET PASSWORD ERROR:", error);
        setError(error.message);
        return;
      }

      setMessage(
        "Password reset instructions have been sent to your email."
      );
    } catch (error) {
      console.error("RESET PASSWORD ERROR:", error);
      setError("Unable to send password reset instructions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">

        {/* LEFT SIDE — PROJECT INFORMATION */}

        <section className="flex flex-1 items-center px-8 py-12 sm:px-12 lg:px-16">

          <div className="mx-auto w-full max-w-xl">

            {/* PROJECT BRAND */}

            <div className="mb-8 flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white shadow-sm">
                AI
              </div>

              <div>

                <p className="text-base font-semibold text-slate-900">
                  AI4Groundwater
                </p>

                <p className="text-xs text-slate-500">
                  Project Management System
                </p>

              </div>

            </div>

            {/* MAIN HEADING */}

            <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">

              Data.
              <br />

              Science.
              <br />

              <span className="text-slate-500">
                Groundwater.
              </span>

            </h1>

            {/* DESCRIPTION */}

            <p className="mt-6 max-w-lg text-base leading-7 text-slate-600">

              An integrated project workspace for coordinating
              research activities, tasks, team members, finances,
              and groundwater-related scientific work.

            </p>

            {/* PROJECT INFORMATION */}

            <div className="mt-10 grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">

              {/* PROJECT */}

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Project
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-800">
                  AI4Groundwater
                </p>

              </div>

              {/* REFERENCE */}

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Reference
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-800">
                  Res/AWTI/078/26
                </p>

              </div>

            </div>

            {/* MOTTO */}

            <div className="mt-10 border-l-2 border-slate-300 pl-5">

              <p className="text-sm font-medium leading-6 text-slate-700">

                “Turning groundwater data into knowledge,
                knowledge into decisions, and decisions into
                sustainable water management.”

              </p>

            </div>

            {/* LEFT FOOTER */}

            <p className="mt-12 text-xs text-slate-400">

              AI4Groundwater Research Project

            </p>

          </div>

        </section>

        {/* RIGHT SIDE — RESET PASSWORD */}

        <section className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:border-l lg:border-slate-200 lg:px-16">

          <div className="w-full max-w-md">

            {/* RESET PASSWORD CARD */}

            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">

              {/* TOP DECORATION */}

              <div className="h-1.5 w-full bg-slate-900" />

              <div className="p-7 sm:p-9">

                {/* TITLE */}

                <div className="mb-8">

                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-300">

                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-7 w-7"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 5.25a5.25 5.25 0 0 0-9.04 3.71c0 1.02.29 1.97.8 2.78L3.75 15.5v2.75h2.75V21h3v-2.75h2.75l1.77-1.77a5.25 5.25 0 0 0 .73-6.23"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 5.25h.008v.008h-.008V5.25Z"
                      />
                    </svg>

                  </div>

                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    Reset your password
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Enter your registered email address. If an account
                    exists for this email, we will send you a password
                    reset link.
                  </p>

                </div>

                {/* FORM */}

                <form
                  onSubmit={handleReset}
                  className="space-y-5"
                >

                  {/* EMAIL */}

                  <div>

                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Email Address
                    </label>

                    <div className="relative">

                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">

                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          className="h-5 w-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 7.5 12 13l9-5.5"
                          />
                          <rect
                            x="3"
                            y="5"
                            width="18"
                            height="14"
                            rx="2"
                          />
                        </svg>

                      </div>

                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setMessage("");
                          setError("");
                        }}
                        placeholder="Enter your registered email"
                        disabled={loading}
                        autoComplete="email"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-400 focus:border-slate-500 focus:bg-white focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                        required
                      />

                    </div>

                  </div>

                  {/* ERROR */}

                  {error && (

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-5 text-slate-700 shadow-sm">

                      {error}

                    </div>

                  )}

                  {/* SUCCESS MESSAGE */}

                  {message && (

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-5 text-slate-700 shadow-sm">

                      {message}

                    </div>

                  )}

                  {/* SUBMIT BUTTON */}

                  <button
                    type="submit"
                    disabled={loading}
                    className="group w-full rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-300/50 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-700 hover:shadow-xl disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
                  >

                    <span className="flex items-center justify-center gap-2">

                      {loading
                        ? "Sending..."
                        : "Send Reset Link"}

                      {!loading && (
                        <span className="transition-transform duration-200 group-hover:translate-x-1">
                          →
                        </span>
                      )}

                    </span>

                  </button>

                </form>

                {/* BACK TO LOGIN */}

                <div className="mt-7 border-t border-slate-100 pt-6 text-center">

                  <a
                    href="/"
                    className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
                  >
                    ← Back to Login
                  </a>

                </div>

              </div>

            </div>

            {/* INFORMATION */}

            <div className="mt-5 px-3">

              <p className="text-center text-xs leading-5 text-slate-400">

                Use the email address registered for your AI4Groundwater
                project account.

              </p>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}