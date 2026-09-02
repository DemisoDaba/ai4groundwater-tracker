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
  remark: string | null;
  submitted_at: string | null;
};

type CurrentUser = {
  code: string;
  name: string;
  email: string;
};

type Project = {
  id: number;
  project_code: string;
  project_name: string;
  reference: string;
  pi_name: string;
};

export default function TeamDashboard() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [project, setProject] = useState<Project | null>(null);
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

      const storedProjectId = localStorage.getItem("selectedProjectId");

      if (!storedProjectId) {
        alert("Project information is missing. Please log in again.");
        window.location.href = "/";
        return;
      }

      const projectId = Number(storedProjectId);

      if (!Number.isFinite(projectId)) {
        alert("Invalid project selection. Please log in again.");
        window.location.href = "/";
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("member_id, full_name, email")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.error("PROFILE ERROR:", profileError);
        alert("Unable to load your profile.");
        return;
      }

      const { data: projectMember, error: projectMemberError } =
        await supabase
          .from("project_member_directory")
          .select(
            "project_id, member_id, full_name, email, project_role, is_project_admin"
          )
          .eq("project_id", projectId)
          .eq("member_id", profile.member_id)
          .maybeSingle();

      if (projectMemberError) {
        console.error("PROJECT MEMBER ERROR:", projectMemberError);
        alert("Unable to verify your project membership.");
        return;
      }

      if (!projectMember) {
        alert("You are not assigned to this project.");
        window.location.href = "/";
        return;
      }

      if (projectMember.is_project_admin === true) {
        window.location.href = "/admin";
        return;
      }

      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("id, project_code, project_name, reference, pi_name")
        .eq("id", projectId)
        .maybeSingle();

      if (projectError || !projectData) {
        console.error("PROJECT ERROR:", projectError);
        alert("Unable to load project information.");
        return;
      }

      setProject(projectData);

      setCurrentUser({
        code: profile.member_id,
        name: profile.full_name,
        email: profile.email,
      });

      await loadTasks(profile.member_id, projectId);
    } catch (error) {
      console.error("DASHBOARD ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async (memberId: string, projectId: number) => {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id, member_id, task, start_date, end_date, task_status, payment_status, remark, submitted_at"
      )
      .eq("member_id", memberId)
      .eq("project_id", projectId)
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
        .eq("member_id", currentUser?.code)
        .eq("project_id", project?.id);

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
      <div className="fixed top-0 left-0 right-0 z-50 lg:left-72">
        <TeamTopNav
          name={currentUser?.name}
          code={currentUser?.code}
        />
      </div>

      <div className="flex min-h-screen">
        <div className="h-16 lg:hidden"></div>

        <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-800 bg-slate-900 lg:flex lg:flex-col">
          <div className="border-b border-slate-800 px-6 py-6">
            <h1 className="text-xl font-bold tracking-tight text-white">
              {project?.project_name ?? "AI4Groundwater"}
            </h1>

            <p className="mt-1 text-xs font-semibold text-slate-400">
              {project?.reference ?? ""}
            </p>

            <p className="mt-0.5 text-xs text-slate-500">
              Team Portal
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Workspace
            </p>

            <div className="space-y-1">
              <Link
                href="/team"
                className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700">
                  🏠
                </span>
                <span>Dashboard</span>
              </Link>

              <a
                href="#assigned-work"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800">
                  📋
                </span>
                <span>My Assigned Work</span>
              </a>

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

        <div className="flex-1 lg:ml-72">
          <section className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8 lg:pt-24">

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

                  {project && (
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {project.reference} · PI: {project.pi_name}
                    </p>
                  )}
                </div>

                {currentUser?.code && (
                  <div className="inline-flex w-fit rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">
                    {currentUser.code}
                  </div>
                )}
              </div>
            </div>

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

            <div id="assigned-work" className="mb-5 scroll-mt-28">
              <h2 className="text-xl font-bold text-slate-900">
                My Assigned Work
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Complete your assigned work and submit it for administrator review.
              </p>
            </div>

            {/*
             * DESKTOP TABLE
             * Hidden on small screens.
             */}
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
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

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Remark
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-14 text-center text-sm text-slate-500"
                        >
                          Loading your tasks...
                        </td>
                      </tr>
                    ) : tasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-14 text-center">
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
                        <tr
                          key={task.id}
                          className="transition hover:bg-slate-50"
                        >
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

                          <td className="px-5 py-5">
                            <div className="min-w-[260px] rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm">
                              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                                Admin Remark
                              </p>

                              <p className="mt-1 text-sm font-semibold leading-6 text-blue-900 whitespace-pre-wrap">
                                {task.remark || "No remark provided."}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/*
             * MOBILE TASK CARDS
             * Shown only on small screens.
             */}
            <div className="space-y-4 md:hidden">
              {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-14 text-center shadow-sm">
                  <p className="text-sm text-slate-500">
                    Loading your tasks...
                  </p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-14 text-center shadow-sm">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
                    📋
                  </div>

                  <p className="mt-4 text-sm font-semibold text-slate-700">
                    No assigned work
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Your assigned tasks will appear here.
                  </p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Task
                      </p>

                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-900">
                        {task.task}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Start Date
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {task.start_date}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          End Date
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {task.end_date}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Task Status
                        </p>

                        <span
                          className={
                            "inline-flex rounded-full px-3 py-1.5 text-xs font-semibold " +
                            getStatusClass(task.task_status)
                          }
                        >
                          {task.task_status}
                        </span>
                      </div>

                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Payment Status
                        </p>

                        <span
                          className={
                            "inline-flex rounded-full px-3 py-1.5 text-xs font-semibold " +
                            getPaymentClass(task.payment_status)
                          }
                        >
                          {task.payment_status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Action
                      </p>

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
                          className="w-full rounded-lg bg-slate-900 px-4 py-3 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {submittingId === task.id
                            ? "Submitting..."
                            : "Submit Task"}
                        </button>
                      )}
                    </div>

                    <div className="mt-5">
                      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                          Admin Remark
                        </p>

                        <p className="mt-1 text-sm font-semibold leading-6 text-blue-900 whitespace-pre-wrap">
                          {task.remark || "No remark provided."}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

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