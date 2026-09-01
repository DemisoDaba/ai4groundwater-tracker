"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

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
  created_at?: string;
};

type Profile = {
  member_id: string;
  full_name: string;
  email: string;
  role: "admin" | "team";
};

type TeamDirectoryMember = {
  code: string;
  name: string;
  email: string;
};

const TEAM_DIRECTORY: TeamDirectoryMember[] = [
  {
    code: "P1*",
    name: "Mikiyas Ali",
    email: "mikiasali333@gmail.com",
  },
  {
    code: "P2",
    name: "Zelalem Anley (M.Sc)",
    email: "zelalemanley3@gmail.com",
  },
  {
    code: "P3",
    name: "Mullusew Bezabih (M.Sc)",
    email: "bmullusew@gmail.com",
  },
  {
    code: "P4",
    name: "Sintayehu Yadete (Ph.D.)",
    email: "sintayadete5@gmail.com",
  },
  {
    code: "P5",
    name: "Meron Mohammed (M.Sc)",
    email: "meronamin23@gmail.com",
  },
  {
    code: "P6",
    name: "Getachew Enssa (M.Sc)",
    email: "getachew.enssa12@gmail.com",
  },
  {
    code: "P7",
    name: "Sufiyan Abdurhman (M.Sc)",
    email: "sufi.abdi@gmail.com",
  },
  {
    code: "P8",
    name: "Aschalewu Cherie (Ph.D.)",
    email: "aschalewc@gmail.com",
  },
  {
    code: "P9",
    name: "Tafese Fitensa (M.Sc)",
    email: "tatiyihun@gmail.com",
  },
  {
    code: "P10",
    name: "Kinfe Bereda (M.Sc)",
    email: "kinfem110@gmail.com",
  },
  {
    code: "P11",
    name: "Babur Tesfaye (M.Sc)",
    email: "baburtesfaye@gmail.com",
  },
];

const EMPTY_FORM = {
  teamMember: "P1*",
  task: "",
  startDate: "",
  endDate: "",
  taskStatus: "Pending" as TaskStatus,
  paymentStatus: "Pending" as PaymentStatus,
};

export default function AdminDashboard() {
  const [supabase] = useState(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error("Missing Supabase environment variables.");
    }

    return createBrowserClient(url, key);
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadDashboard();
  }, []);

  // ============================================================
  // LOAD DASHBOARD
  // ============================================================

  const loadDashboard = async () => {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("AUTH USER ERROR:", userError);
        window.location.href = "/";
        return;
      }

      if (!user) {
        window.location.href = "/";
        return;
      }

      // --------------------------------------------------------
      // CURRENT ADMIN PROFILE
      // --------------------------------------------------------

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("member_id, full_name, email, role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.error("PROFILE ERROR:", profileError);
        setMessage("Unable to load your project profile.");
        return;
      }

      if (profile.role !== "admin") {
        window.location.href = "/team";
        return;
      }

      // --------------------------------------------------------
      // LOAD REGISTERED MEMBERS
      // --------------------------------------------------------

      const { data: memberData, error: memberError } = await supabase
        .from("profiles")
        .select("member_id, full_name, email, role")
        .eq("role", "team")
        .order("member_id");

      if (memberError) {
        console.error("MEMBERS ERROR:", memberError);
      } else {
        setMembers(memberData ?? []);
      }

      // --------------------------------------------------------
      // LOAD TASKS
      // --------------------------------------------------------

      await loadTasks();
    } catch (error) {
      console.error("DASHBOARD ERROR:", error);

      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("An error occurred while loading the dashboard.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // LOAD TASKS
  // ============================================================

  const loadTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        id,
        member_id,
        task,
        start_date,
        end_date,
        task_status,
        payment_status,
        submitted_at,
        created_at
        `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("TASK LOAD ERROR:", error);

      setMessage(
        `Unable to load tasks: ${
          error.message || "Unknown database error"
        }`
      );

      return;
    }

    setTasks((data ?? []) as Task[]);
  };

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("LOGOUT ERROR:", error);
        setMessage(`Unable to log out: ${error.message}`);
        return;
      }

      window.location.href = "/";
    } catch (error) {
      console.error("LOGOUT ERROR:", error);
      setMessage("An error occurred during logout.");
    } finally {
      setLoggingOut(false);
    }
  };

  // ============================================================
  // ASSIGN TASK
  // ============================================================

  const assignTask = async () => {
    setMessage("");

    if (!form.teamMember) {
      setMessage("Please select a team member.");
      return;
    }

    if (!form.task.trim()) {
      setMessage("Please enter a task.");
      return;
    }

    if (!form.startDate) {
      setMessage("Please select the start date.");
      return;
    }

    if (!form.endDate) {
      setMessage("Please select the end date.");
      return;
    }

    if (form.endDate < form.startDate) {
      setMessage("End date cannot be before start date.");
      return;
    }

    setSaving(true);

    try {
      // --------------------------------------------------------
      // ONLY member_id IS USED
      // --------------------------------------------------------

      const insertData = {
        member_id: form.teamMember,
        task: form.task.trim(),
        start_date: form.startDate,
        end_date: form.endDate,
        task_status: form.taskStatus,
        payment_status: form.paymentStatus,
        submitted_at: null,
      };

      console.log("ASSIGNING TASK:", insertData);

      const { data, error } = await supabase
        .from("tasks")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("ASSIGN TASK ERROR:", error);
        console.error("MESSAGE:", error.message);
        console.error("DETAILS:", error.details);
        console.error("HINT:", error.hint);
        console.error("CODE:", error.code);

        setMessage(
          `Unable to assign task: ${
            error.message ||
            error.details ||
            error.hint ||
            "Unknown database error"
          }`
        );

        return;
      }

      console.log("TASK CREATED:", data);

      setMessage("Task assigned successfully.");

      setForm(EMPTY_FORM);
      setShowForm(false);

      await loadTasks();
    } catch (error) {
      console.error("ASSIGN TASK EXCEPTION:", error);

      if (error instanceof Error) {
        setMessage(`Unable to assign task: ${error.message}`);
      } else {
        setMessage("An error occurred while assigning the task.");
      }
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // UPDATE TASK
  // ============================================================

  const updateTask = async (
    id: number,
    field: "member_id" | "task_status" | "payment_status",
    value: string
  ) => {
    setMessage("");

    try {
      const updateData = {
        [field]: value,
      };

      const { error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", id);

      if (error) {
        console.error("TASK UPDATE ERROR:", error);

        setMessage(
          `Unable to update task: ${
            error.message ||
            error.details ||
            error.hint ||
            "Unknown database error"
          }`
        );

        return;
      }

      setTasks((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                [field]: value,
              }
            : item
        )
      );
    } catch (error) {
      console.error("TASK UPDATE ERROR:", error);

      if (error instanceof Error) {
        setMessage(`Unable to update task: ${error.message}`);
      } else {
        setMessage("An error occurred while updating the task.");
      }
    }
  };

  // ============================================================
  // COUNTS
  // ============================================================

  const pendingCount = tasks.filter(
    (item) => item.task_status === "Pending"
  ).length;

  const progressCount = tasks.filter(
    (item) => item.task_status === "In Progress"
  ).length;

  const reviewCount = tasks.filter(
    (item) => item.task_status === "Pending Review"
  ).length;

  const completedCount = tasks.filter(
    (item) => item.task_status === "Completed"
  ).length;

  // ============================================================
  // GET MEMBER NAME
  // ============================================================

  const getMemberName = (memberId: string) => {
    const directory = TEAM_DIRECTORY.find(
      (member) => member.code === memberId
    );

    return directory?.name ?? memberId;
  };

  // ============================================================
  // REGISTERED CHECK
  // ============================================================

  const isRegistered = (code: string) => {
    return members.some(
      (profile) => profile.member_id === code
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              AI4Groundwater
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Res/AWTI/078/26
            </p>
          </div>

          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">
                Admin
              </p>

              <p className="text-xs text-slate-500">
                Project Management
              </p>
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

      {/* ====================================================== */}
      {/* CONTENT */}
      {/* ====================================================== */}

      <section className="mx-auto max-w-7xl px-6 py-8">
        {/* MESSAGE */}

        {message && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {message}
          </div>
        )}

        {/* ==================================================== */}
        {/* STATISTICS */}
        {/* ==================================================== */}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Tasks</p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {tasks.length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pending</p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              In Progress
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {progressCount}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Pending Review
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {reviewCount}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Completed
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {completedCount}
            </p>
          </div>
        </div>

        {/* ==================================================== */}
        {/* TASK HEADER */}
        {/* ==================================================== */}

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Task Management
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage assigned work and payment status
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setMessage("");
              setShowForm(true);
            }}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            + Assign Task
          </button>
        </div>

        {/* ==================================================== */}
        {/* ASSIGN FORM */}
        {/* ==================================================== */}

        {showForm && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Assign Task
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  All 11 project team members are available for
                  assignment.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(EMPTY_FORM);
                  setMessage("");
                }}
                disabled={saving}
                className="text-sm text-slate-500 hover:text-slate-900"
              >
                Cancel
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* TEAM MEMBER */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Team Member
                </label>

                <select
                  value={form.teamMember}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      teamMember: e.target.value,
                    });

                    setMessage("");
                  }}
                  disabled={saving}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
                >
                  {TEAM_DIRECTORY.map((member) => (
                    <option
                      key={member.code}
                      value={member.code}
                    >
                      {member.code} — {member.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* EMAIL */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>

                <input
                  type="text"
                  value={
                    TEAM_DIRECTORY.find(
                      (member) =>
                        member.code === form.teamMember
                    )?.email ?? ""
                  }
                  readOnly
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none"
                />
              </div>

              {/* TASK */}

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Task
                </label>

                <textarea
                  value={form.task}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      task: e.target.value,
                    })
                  }
                  disabled={saving}
                  placeholder="Write the assigned task..."
                  rows={4}
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
                />
              </div>

              {/* START DATE */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Start Date
                </label>

                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      startDate: e.target.value,
                    })
                  }
                  disabled={saving}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
                />
              </div>

              {/* END DATE */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  End Date
                </label>

                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      endDate: e.target.value,
                    })
                  }
                  disabled={saving}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
                />
              </div>

              {/* TASK STATUS */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Task Status
                </label>

                <select
                  value={form.taskStatus}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      taskStatus:
                        e.target.value as TaskStatus,
                    })
                  }
                  disabled={saving}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">
                    In Progress
                  </option>
                  <option value="Pending Review">
                    Pending Review
                  </option>
                  <option value="Completed">
                    Completed
                  </option>
                  <option value="Reassigned">
                    Reassigned
                  </option>
                </select>
              </div>

              {/* PAYMENT */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Payment Status
                </label>

                <select
                  value={form.paymentStatus}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      paymentStatus:
                        e.target.value as PaymentStatus,
                    })
                  }
                  disabled={saving}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
            </div>

            {/* SUBMIT */}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={assignTask}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? "Assigning..." : "Assign Task"}
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TASK TABLE */}
        {/* ==================================================== */}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Team Member
                  </th>

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
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-sm text-slate-500"
                    >
                      Loading tasks...
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center"
                    >
                      <p className="text-sm font-medium text-slate-600">
                        No tasks assigned yet
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Click &quot;+ Assign Task&quot; to create
                        an assignment.
                      </p>
                    </td>
                  </tr>
                ) : (
                  tasks.map((item) => (
                    <tr
                      key={item.id}
                      className="transition hover:bg-slate-50"
                    >
                      {/* MEMBER */}

                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <select
                            value={item.member_id}
                            onChange={(e) =>
                              updateTask(
                                item.id,
                                "member_id",
                                e.target.value
                              )
                            }
                            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-400"
                          >
                            {TEAM_DIRECTORY.map((member) => (
                              <option
                                key={member.code}
                                value={member.code}
                              >
                                {member.code}
                              </option>
                            ))}
                          </select>

                          <span className="text-xs text-slate-500">
                            {getMemberName(item.member_id)}
                          </span>
                        </div>
                      </td>

                      {/* TASK */}

                      <td className="max-w-[400px] px-5 py-4 text-sm text-slate-700">
                        <div className="whitespace-pre-wrap">
                          {item.task}
                        </div>
                      </td>

                      {/* START */}

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {item.start_date}
                      </td>

                      {/* END */}

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {item.end_date}
                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-4">
                        <select
                          value={item.task_status}
                          onChange={(e) =>
                            updateTask(
                              item.id,
                              "task_status",
                              e.target.value
                            )
                          }
                          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                        >
                          <option value="Pending">
                            Pending
                          </option>

                          <option value="In Progress">
                            In Progress
                          </option>

                          <option value="Pending Review">
                            Pending Review
                          </option>

                          <option value="Completed">
                            Completed
                          </option>

                          <option value="Reassigned">
                            Reassigned
                          </option>
                        </select>
                      </td>

                      {/* PAYMENT */}

                      <td className="px-5 py-4">
                        <select
                          value={item.payment_status}
                          onChange={(e) =>
                            updateTask(
                              item.id,
                              "payment_status",
                              e.target.value
                            )
                          }
                          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                        >
                          <option value="Pending">
                            Pending
                          </option>

                          <option value="Paid">Paid</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ==================================================== */}
        {/* TEAM DIRECTORY */}
        {/* ==================================================== */}

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-slate-900">
              Team Assignment
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              All project team members can receive tasks,
              regardless of whether they have registered yet.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM_DIRECTORY.map((member) => {
              const registered = isRegistered(member.code);

              return (
                <div
                  key={member.code}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">
                      {member.code}
                    </span>

                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        registered
                          ? "bg-slate-100 text-slate-700"
                          : "bg-slate-50 text-slate-400"
                      }`}
                    >
                      {registered
                        ? "Registered"
                        : "Not registered"}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-medium text-slate-800">
                    {member.name}
                  </p>

                  <p className="mt-1 break-all text-xs text-slate-500">
                    {member.email}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}