"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import TeamTopNav from "@/components/TeamTopNav";

type TaskStatus =
  | "Pending"
  | "In Progress"
  | "Pending Review"
  | "Completed"
  | "Reassigned";

type PaymentStatus = "Pending" | "Paid";

type Task = {
  id: number;
  member_id: string;
  task: string;
  start_date: string;
  end_date: string;
  task_status: TaskStatus;
  payment_status: PaymentStatus;
  submitted_at: string | null;
};

type CurrentUser = {
  code: string;
  name: string;
  email: string;
};

export default function TeamDashboard() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/";
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("member_id, full_name, email, role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.error("PROFILE ERROR:", profileError);
        alert("Unable to load your profile.");
        return;
      }

      if (profile.role === "admin") {
        window.location.href = "/admin";
        return;
      }

      setCurrentUser({
        code: profile.member_id,
        name: profile.full_name,
        email: profile.email,
      });

      await loadTasks(profile.member_id);
    } catch (error) {
      console.error("DASHBOARD ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async (memberId: string) => {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id, member_id, task, start_date, end_date, task_status, payment_status, submitted_at"
      )
      .eq("member_id", memberId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("TASK LOAD ERROR:", error);
      return;
    }

    setTasks(data ?? []);
  };

  const submitTask = async (id: number) => {
    const task = tasks.find((item) => item.id === id);

    if (!task) {
      return;
    }

    if (task.task_status === "Completed" || task.task_status === "Reassigned") {
      return;
    }

    const confirmed = window.confirm(
      "Submit this task for administrator review?"
    );

    if (!confirmed) {
      return;
    }

    setSubmittingId(id);

    try {
      const submittedAt = new Date().toISOString();

      const { error } = await supabase
        .from("tasks")
        .update({
          task_status: "Pending Review",
          submitted_at: submittedAt,
        })
        .eq("id", id)
        .eq("member_id", currentUser?.code);

      if (error) {
        console.error("SUBMIT TASK ERROR:", error);
        alert("Unable to submit task: " + error.message);
        return;
      }

      setTasks((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                task_status: "Pending Review",
                submitted_at: submittedAt,
              }
            : item
        )
      );
    } catch (error) {
      console.error("SUBMIT TASK ERROR:", error);
      alert("An error occurred while submitting the task.");
    } finally {
      setSubmittingId(null);
    }
  };

  const pendingCount = tasks.filter(
    (task) => task.task_status === "Pending"
  ).length;

  const inProgressCount = tasks.filter(
    (task) => task.task_status === "In Progress"
  ).length;

  const reviewCount = tasks.filter(
    (task) => task.task_status === "Pending Review"
  ).length;

  const completedCount = tasks.filter(
    (task) => task.task_status === "Completed"
  ).length;

  const getStatusClass = (status: TaskStatus) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-700";

      case "Pending Review":
        return "bg-blue-100 text-blue-700";

      case "In Progress":
        return "bg-yellow-100 text-yellow-700";

      case "Reassigned":
        return "bg-red-100 text-red-700";

      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getPaymentClass = (status: PaymentStatus) => {
    return status === "Paid"
      ? "bg-green-100 text-green-700"
      : "bg-yellow-100 text-yellow-700";
  };

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Top Navigation - Fixed at top, but with left margin on desktop to not overlap sidebar */}
      <div className="fixed top-0 left-0 right-0 z-50 lg:left-72">
        <TeamTopNav
          name={currentUser?.name}
          code={currentUser?.code}
        />
      </div>

      {/* Main layout with sidebar */}
      <div className="flex min-h-screen">
        {/* pt-16 for mobile top nav spacer */}
        <div className="h-16 lg:hidden"></div>

        {/* =========================================================
            DESKTOP LEFT SIDEBAR - Fixed with dark theme
        ========================================================= */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-800 bg-slate-900 lg:flex lg:flex-col">
          {/* Sidebar Header */}
          <div className="border-b border-slate-800 px-6 py-6">
            <h1 className="text-xl font-bold tracking-tight text-white">
              AI4Groundwater
            </h1>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Res/AWTI/078/26
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Team Portal
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Workspace
            </p>

            <div className="space-y-1">
              {/* Dashboard */}
              <Link
                href="/team"
                className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700">
                  🏠
                </span>
                <span>Dashboard</span>
              </Link>

              {/* Assigned Work */}
              <a
                href="#assigned-work"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800">
                  📋
                </span>
                <span>My Assigned Work</span>
              </a>

              {/* Ground Rules */}
              <Link
                href="/rules"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800">
                  📜
                </span>
                <span>Ground Rules</span>
              </Link>
            </div>
          </nav>

          {/* User Info */}
          <div className="border-t border-slate-800 p-4">
            <div className="rounded-xl bg-slate-800/50 p-3">
              <p className="truncate text-sm font-semibold text-white">
                {currentUser?.name ?? "Loading..."}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-400">
                {currentUser?.code ?? ""}
              </p>
            </div>
          </div>
        </aside>

        {/* =========================================================
            MAIN CONTENT
        ========================================================= */}
        <div className="flex-1 lg:ml-72">
          {/* lg:ml-72 to account for sidebar width */}

          {/* Content section - padding for fixed elements */}
          <section className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8 lg:pt-24">
            {/* pt-24 on desktop accounts for the fixed top nav */}

            {/* Profile */}
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Team Member
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    {currentUser?.name ?? "Loading..."}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {currentUser?.email ?? ""}
                  </p>
                </div>

                {currentUser?.code && (
                  <div className="inline-flex w-fit rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">
                    {currentUser.code}
                  </div>
                )}
              </div>
            </div>

            {/* Statistics */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">My Tasks</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {tasks.length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Pending</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {pendingCount}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">In Progress</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {inProgressCount}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Pending Review</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {reviewCount}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Completed</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {completedCount}
                </p>
              </div>
            </div>

            {/* Assigned Work */}
            <div id="assigned-work" className="mb-5 scroll-mt-28">
              <h2 className="text-xl font-bold text-slate-900">
                My Assigned Work
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Complete your assigned work and submit it for administrator review.
              </p>
            </div>

            {/* Task Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Task
                      </th>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Start Date
                      </th>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        End Date
                      </th>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Task Status
                      </th>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Payment Status
                      </th>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-14 text-center text-sm text-slate-500">
                          Loading your tasks...
                        </td>
                      </tr>
                    ) : tasks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-14 text-center">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
                            📋
                          </div>
                          <p className="mt-4 text-sm font-semibold text-slate-700">
                            No assigned work
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Your assigned tasks will appear here.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      tasks.map((task) => (
                        <tr key={task.id} className="transition hover:bg-slate-50">
                          <td className="px-5 py-5">
                            <p className="max-w-[400px] text-sm font-medium leading-6 text-slate-900">
                              {task.task}
                            </p>
                          </td>
                          <td className="px-5 py-5 text-sm text-slate-600">
                            {task.start_date}
                          </td>
                          <td className="px-5 py-5 text-sm text-slate-600">
                            {task.end_date}
                          </td>
                          <td className="px-5 py-5">
                            <span
                              className={
                                "inline-flex rounded-full px-3 py-1.5 text-xs font-semibold " +
                                getStatusClass(task.task_status)
                              }
                            >
                              {task.task_status}
                            </span>
                          </td>
                          <td className="px-5 py-5">
                            <span
                              className={
                                "inline-flex rounded-full px-3 py-1.5 text-xs font-semibold " +
                                getPaymentClass(task.payment_status)
                              }
                            >
                              {task.payment_status}
                            </span>
                          </td>
                          <td className="px-5 py-5">
                            {task.task_status === "Pending Review" ||
                            task.submitted_at ? (
                              <span className="inline-flex rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                                Submitted
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => submitTask(task.id)}
                                disabled={
                                  submittingId === task.id ||
                                  task.task_status === "Completed" ||
                                  task.task_status === "Reassigned"
                                }
                                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                {submittingId === task.id
                                  ? "Submitting..."
                                  : "Submit Task"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Work Submission */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg">
                  ℹ️
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Work Submission
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-500">
                    <li>
                      • Complete the assigned work within the assigned period.
                    </li>
                    <li>
                      • Click <strong>Submit Task</strong> when your work is ready for review.
                    </li>
                    <li>
                      • After submission, the task becomes{" "}
                      <strong>Pending Review</strong>.
                    </li>
                    <li>
                      • The administrator controls the official task status.
                    </li>
                    <li>
                      • The administrator controls the payment status.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Ground Rules */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Project Guidelines
                  </p>
                  <h3 className="mt-1 text-lg font-bold">
                    Review the Ground Rules
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
                    Please review the project working rules, responsibilities,
                    deadlines, communication requirements, and task reassignment procedures.
                  </p>
                </div>
                <Link
                  href="/rules"
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  View Ground Rules →
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}