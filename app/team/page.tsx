"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  const [loggingOut, setLoggingOut] = useState(false);
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

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("LOGOUT ERROR:", error);
      }
    } catch (error) {
      console.error("LOGOUT ERROR:", error);
    } finally {
      window.location.href = "/";
    }
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
      const { error } = await supabase
        .from("tasks")
        .update({
          task_status: "Pending Review",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("member_id", currentUser?.code);

      if (error) {
        console.error("SUBMIT TASK ERROR:", error);
        // Fixed: Using string concatenation instead of template literal
        alert("Unable to submit task: " + error.message);
        return;
      }

      setTasks((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                task_status: "Pending Review",
                submitted_at: new Date().toISOString(),
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

  const pendingCount = tasks.filter((task) => task.task_status === "Pending").length;
  const inProgressCount = tasks.filter((task) => task.task_status === "In Progress").length;
  const reviewCount = tasks.filter((task) => task.task_status === "Pending Review").length;
  const completedCount = tasks.filter((task) => task.task_status === "Completed").length;

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
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI4Groundwater</h1>
            <p className="mt-1 text-sm text-slate-500">Res/AWTI/078/26</p>
          </div>

          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">Team Dashboard</p>
              <p className="text-xs text-slate-500">{currentUser?.code ?? ""}</p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Team Member
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            {currentUser?.name ?? "Loading..."}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{currentUser?.email ?? ""}</p>
          {currentUser?.code && (
            <div className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
              {currentUser.code}
            </div>
          )}
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">My Tasks</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{tasks.length}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pending</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{pendingCount}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">In Progress</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{inProgressCount}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pending Review</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{reviewCount}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{completedCount}</p>
          </div>
        </div>

        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-900">My Assigned Work</h2>
          <p className="mt-1 text-sm text-slate-500">
            Complete your assigned work and submit it for review.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left">
              <thead className="border-b bg-slate-50">
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
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
                      Loading your tasks...
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <p className="text-sm font-medium text-slate-700">No assigned work</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Your assigned tasks will appear here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-5">
                        <p className="max-w-[400px] text-sm font-medium text-slate-900">
                          {task.task}
                        </p>
                      </td>
                      <td className="px-5 py-5 text-sm text-slate-600">{task.start_date}</td>
                      <td className="px-5 py-5 text-sm text-slate-600">{task.end_date}</td>
                      <td className="px-5 py-5">
                        <span className={"inline-flex rounded-full px-3 py-1.5 text-xs font-medium " + getStatusClass(task.task_status)}>
                          {task.task_status}
                        </span>
                      </td>
                      <td className="px-5 py-5">
                        <span className={"inline-flex rounded-full px-3 py-1.5 text-xs font-medium " + getPaymentClass(task.payment_status)}>
                          {task.payment_status}
                        </span>
                      </td>
                      <td className="px-5 py-5">
                        {task.task_status === "Pending Review" || task.submitted_at ? (
                          <span className="inline-flex rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
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
                            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            {submittingId === task.id ? "Submitting..." : "Submit Task"}
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

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-800">Work Submission</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li>• Complete the assigned work within the assigned period.</li>
            <li>
              • Click <strong>Submit Task</strong> when your work is ready for review.
            </li>
            <li>
              • After submission, the task becomes <strong>Pending Review</strong>.
            </li>
            <li>• The administrator controls the official task status.</li>
            <li>• The administrator controls the payment status.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}