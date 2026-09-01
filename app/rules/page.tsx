"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  full_name: string;
  role: string;
};

export default function RulesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/";
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        console.error("PROFILE ERROR:", error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error("RULES PAGE ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (profile?.role === "admin") {
      window.location.href = "/admin";
    } else {
      window.location.href = "/team";
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
          <p className="text-sm text-slate-500">Loading ground rules...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
                AI
              </div>

              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  AI4Groundwater
                </h1>

                <p className="text-xs text-slate-500">
                  Res/AWTI/078/26
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          >
            <span className="text-base">←</span>
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* MAIN */}
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-6 lg:py-10">
        {/* HERO */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-8 text-white sm:px-8">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-200">
                Project Policy
              </span>

              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300">
                Admin & Team
              </span>
            </div>

            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ground Rules
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
              Working rules for assigned tasks, responsibilities,
              communication, deadlines, and project continuity.
            </p>
          </div>

          <div className="px-6 py-6 sm:px-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Project 01
                </p>

                <p className="mt-2 font-semibold text-slate-900">
                  AI4Groundwater
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Res/AWTI/078/26
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Project 02
                </p>

                <p className="mt-2 font-semibold text-slate-900">
                  RECHARGE-AI Bilate
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Res/AWTI/079/26
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* INTRODUCTION */}
        <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
              i
            </div>

            <div>
              <h3 className="font-semibold text-blue-900">
                Working Rules for Assigned Tasks
              </h3>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                These rules apply to everyone responsible for assigned
                project work. The purpose is to maintain accountability,
                communication, timely delivery, and continuous progress.
              </p>
            </div>
          </div>
        </div>

        {/* RULE 1 */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-4 border-b border-slate-200 px-6 py-5 sm:px-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-lg font-bold text-white">
              1
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Responsibility & Communication
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Take ownership and communicate problems early.
              </p>
            </div>
          </div>

          <div className="space-y-5 px-6 py-6 sm:px-8">
            <div className="rounded-xl bg-slate-50 p-5">
              <div className="flex gap-4">
                <span className="font-bold text-slate-400">1.1</span>

                <p className="text-sm leading-7 text-slate-600">
                  The responsible team/person must take full responsibility
                  for completing and submitting the assigned task within the
                  agreed deadline, see 2.1 for detail.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-5">
              <div className="flex gap-4">
                <span className="font-bold text-slate-400">1.2</span>

                <p className="text-sm leading-7 text-slate-600">
                  Any issue, constraint, or reason that may affect the
                  deadline must be communicated to PI directly by call or in
                  writing before the deadline.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* RULE 2 */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-4 border-b border-slate-200 px-6 py-5 sm:px-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-lg font-bold text-white">
              2
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Commitment & Project Continuity
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                The priority is responsible work and keeping the project
                moving.
              </p>
            </div>
          </div>

          <div className="space-y-5 px-6 py-6 sm:px-8">
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-5">
              <div className="flex gap-4">
                <span className="font-bold text-amber-600">2.1</span>

                <p className="text-sm leading-7 text-slate-700">
                  The attitude that{" "}
                  <span className="font-semibold text-slate-900">
                    “the payment is small, so whether I complete the work or
                    not, I will still receive the money”
                  </span>{" "}
                  is not acceptable. Our work should be approached with
                  responsibility, commitment, and pride in what we are
                  accomplishing together.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-5">
              <div className="flex gap-4">
                <span className="font-bold text-slate-400">2.2</span>

                <p className="text-sm leading-7 text-slate-600">
                  If someone is too busy or unable to complete an assigned
                  task, they should communicate this to PI early so that the
                  task can be assigned to another team member. There is no
                  problem with reassigning a task when necessary; the priority
                  is keeping our project moving properly and on schedule.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* RULE 3 */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-4 border-b border-slate-200 px-6 py-5 sm:px-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-lg font-bold text-white">
              3
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Deadlines & Reassignment
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Delays must be addressed immediately to protect the project
                schedule.
              </p>
            </div>
          </div>

          <div className="space-y-5 px-6 py-6 sm:px-8">
            <div className="rounded-xl bg-slate-50 p-5">
              <div className="flex gap-4">
                <span className="font-bold text-slate-400">3.1</span>

                <p className="text-sm leading-7 text-slate-600">
                  Failure to submit the assigned work by the agreed deadline
                  will be treated as a failure to meet the assigned
                  responsibility.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-red-100 bg-red-50 p-5">
              <div className="flex gap-4">
                <span className="font-bold text-red-600">3.2</span>

                <p className="text-sm leading-7 text-slate-700">
                  The delay will be recorded as a project delay, and the task
                  will be immediately reassigned to another team member on the
                  following day to ensure that the project continues without
                  further delay.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex gap-4">
                <span className="font-bold text-slate-500">3.3</span>

                <p className="text-sm leading-7 text-slate-600">
                  Where permitted by the applicable project and institutional
                  financial rules, failure to complete the assigned
                  deliverable may also result in a financial consequence or
                  non-payment for the uncompleted portion of the assignment,
                  even where part of the task has been completed.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* AGREEMENT */}
        <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
          <div className="bg-slate-900 px-6 py-5 text-white sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-sm">
                ✓
              </div>

              <div>
                <h3 className="font-bold">Project Agreement</h3>

                <p className="mt-0.5 text-xs text-slate-400">
                  AI4Groundwater & RECHARGE-AI Bilate
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8">
            <p className="text-sm leading-7 text-slate-600">
              Finally, as per the agreement signed between the PI, AWIT, and
              funder (EWTI), the project activities will continue in accordance
              with the agreed terms, responsibilities, and deliverables set
              out in the signed agreement.
            </p>
          </div>
        </section>

        {/* BOTTOM BACK BUTTON */}
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
          >
            <span>←</span>
            Return to Dashboard
          </button>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          These rules are available to all authorized project administrators
          and team members.
        </p>
      </section>
    </main>
  );
}