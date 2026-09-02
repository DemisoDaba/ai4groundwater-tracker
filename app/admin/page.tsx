"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type TaskStatus =
  | "Pending"
  | "In Progress"
  | "Pending Review"
  | "Completed"
  | "Reassigned";

type PaymentStatus = "Pending" | "Paid" | "Denied";

type Task = {
  id: number;
  project_id: number;
  member_id: string;
  task: string;
  start_date: string;
  end_date: string;
  task_status: TaskStatus;
  payment_status: PaymentStatus;
  remark: string | null;
  submitted_at: string | null;
  created_at?: string;
};

type Project = {
  id: number;
  project_code: string;
  project_name: string;
  reference: string;
  pi_name: string;
};

type TeamMember = {
  id: number;
  member_id: string;
  full_name: string;
  email: string;
  project_role: string;
  is_project_admin: boolean;
  project_id?: number;
  is_registered?: boolean;
};

const EMPTY_FORM = {
  teamMember: "",
  task: "",
  startDate: "",
  endDate: "",
  taskStatus: "Pending" as TaskStatus,
  paymentStatus: "Pending" as PaymentStatus,
  remark: "",
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

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentAdmin, setCurrentAdmin] =
    useState<TeamMember | null>(null);

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
      // --------------------------------------------------------
      // CURRENT AUTH USER
      // --------------------------------------------------------

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("AUTH USER ERROR:", userError);
        window.location.href = "/";
        return;
      }

      // --------------------------------------------------------
      // CURRENT PROFILE
      // --------------------------------------------------------

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("member_id, full_name, email")
          .eq("id", user.id)
          .single();

      if (profileError || !profile) {
        console.error("PROFILE ERROR:", profileError);

        setMessage(
          `Unable to load your profile: ${
            profileError?.message || "Profile not found."
          }`
        );

        return;
      }

      // --------------------------------------------------------
      // FIND PROJECTS WHERE THIS MEMBER IS PROJECT ADMIN
      // --------------------------------------------------------

      const {
        data: adminMemberships,
        error: adminError,
      } = await supabase
        .from("project_member_directory")
        .select(
          `
          id,
          member_id,
          full_name,
          email,
          project_role,
          is_project_admin,
          project_id
          `
        )
        .eq("member_id", profile.member_id)
        .eq("is_project_admin", true);

      if (adminError) {
        console.error("ADMIN MEMBERSHIP ERROR:", adminError);

        setMessage(
          `Unable to verify project administration: ${adminError.message}`
        );

        return;
      }

      if (!adminMemberships || adminMemberships.length === 0) {
        setMessage(
          "You are not assigned as a project administrator."
        );

        return;
      }

      // --------------------------------------------------------
      // SELECT PROJECT
      // --------------------------------------------------------

      const storedProjectId =
        typeof window !== "undefined"
          ? localStorage.getItem("selectedProjectId")
          : null;

      let selectedMembership = adminMemberships[0];

      if (storedProjectId) {
        const matchingMembership = adminMemberships.find(
          (item) =>
            String(item.project_id) === storedProjectId
        );

        if (matchingMembership) {
          selectedMembership = matchingMembership;
        }
      }

      const selectedProjectId = Number(
        selectedMembership.project_id
      );

      console.log("ADMIN MEMBERSHIPS:", adminMemberships);
      console.log("STORED PROJECT ID:", storedProjectId);
      console.log("SELECTED PROJECT ID:", selectedProjectId);

      if (!Number.isFinite(selectedProjectId)) {
        setMessage(
          "Invalid project ID for the current administrator."
        );
        return;
      }

      // Save project context
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "selectedProjectId",
          String(selectedProjectId)
        );
      }

      // --------------------------------------------------------
      // CURRENT ADMIN
      // --------------------------------------------------------

      setCurrentAdmin({
        id: selectedMembership.id,
        member_id: selectedMembership.member_id,
        full_name: selectedMembership.full_name,
        email: selectedMembership.email,
        project_role: selectedMembership.project_role,
        is_project_admin:
          selectedMembership.is_project_admin,
        project_id: selectedMembership.project_id,
      });

      // --------------------------------------------------------
      // LOAD PROJECT
      // --------------------------------------------------------

      const {
        data: projectData,
        error: projectError,
      } = await supabase
        .from("projects")
        .select(
          "id, project_code, project_name, reference, pi_name"
        )
        .eq("id", selectedProjectId)
        .maybeSingle();

      console.log("PROJECT DATA:", projectData);
      console.log(
        "PROJECT ERROR MESSAGE:",
        projectError?.message
      );
      console.log(
        "PROJECT ERROR DETAILS:",
        projectError?.details
      );
      console.log(
        "PROJECT ERROR HINT:",
        projectError?.hint
      );
      console.log(
        "PROJECT ERROR CODE:",
        projectError?.code
      );

      if (projectError || !projectData) {
        console.error("PROJECT ERROR:", projectError);

        setMessage(
          `Unable to load project: ${
            projectError?.message ||
            projectError?.details ||
            "Project could not be loaded."
          }`
        );

        return;
      }

      // --------------------------------------------------------
      // MAP DATABASE PROJECT TO FRONTEND PROJECT
      // --------------------------------------------------------

      const loadedProject: Project = {
        id: Number(projectData.id),
        project_code:
          projectData.project_code ?? "",
        project_name:
          projectData.project_name ??
          "AI4Groundwater",
        reference:
          projectData.reference ?? "",
        pi_name:
          projectData.pi_name ?? "",
      };

      setProject(loadedProject);

      // --------------------------------------------------------
      // LOAD PROJECT MEMBERS
      // --------------------------------------------------------

      const {
        data: memberData,
        error: memberError,
      } = await supabase
        .from("project_member_directory")
        .select(
          `
          id,
          member_id,
          full_name,
          email,
          project_role,
          is_project_admin,
          project_id
          `
        )
        .eq("project_id", selectedProjectId)
        .order("member_id", {
          ascending: true,
        });

      if (memberError) {
        console.error("MEMBERS ERROR:", memberError);

        setMessage(
          `Unable to load project members: ${memberError.message}`
        );

        return;
      }

      const projectMembers =
        (memberData ?? []) as TeamMember[];

      // --------------------------------------------------------
      // CHECK REGISTRATION STATUS
      // --------------------------------------------------------

      const memberIds = projectMembers.map(
        (member) => member.member_id
      );

      let registeredMemberIds = new Set<string>();

      if (memberIds.length > 0) {
        const {
          data: registeredProfiles,
          error: registeredError,
        } = await supabase
          .from("profiles")
          .select("member_id")
          .in("member_id", memberIds);

        if (registeredError) {
          console.error(
            "REGISTRATION STATUS ERROR:",
            registeredError
          );

          setMessage(
            `Unable to check registration status: ${registeredError.message}`
          );

          return;
        }

        registeredMemberIds = new Set(
          (registeredProfiles ?? []).map(
            (profile) => profile.member_id
          )
        );
      }

      const projectMembersWithStatus: TeamMember[] =
        projectMembers.map((member) => ({
          ...member,
          is_registered: registeredMemberIds.has(
            member.member_id
          ),
        }));

      setMembers(projectMembersWithStatus);

      // --------------------------------------------------------
      // DEFAULT TEAM MEMBER
      // --------------------------------------------------------

      const firstTeamMember =
        projectMembersWithStatus.find(
          (member) => !member.is_project_admin
        );

      setForm((current) => ({
        ...current,
        teamMember:
          firstTeamMember?.member_id ?? "",
      }));

      // --------------------------------------------------------
      // LOAD PROJECT TASKS
      // --------------------------------------------------------

      await loadTasks(selectedProjectId);
    } catch (error) {
      console.error("DASHBOARD ERROR:", error);

      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage(
          "An error occurred while loading the dashboard."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // LOAD TASKS
  // ============================================================

  const loadTasks = async (projectId: number) => {
    const {
      data,
      error,
    } = await supabase
      .from("tasks")
      .select(
        `
        id,
        project_id,
        member_id,
        task,
        start_date,
        end_date,
        task_status,
        payment_status,
        remark,
        submitted_at,
        created_at
        `
      )
      .eq("project_id", projectId)
      .order("created_at", {
        ascending: false,
      });

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
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error("LOGOUT ERROR:", error);

        setMessage(
          `Unable to log out: ${error.message}`
        );

        return;
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem(
          "selectedProjectId"
        );
      }

      window.location.href = "/";
    } catch (error) {
      console.error("LOGOUT ERROR:", error);

      setMessage(
        "An error occurred during logout."
      );
    } finally {
      setLoggingOut(false);
    }
  };

  // ============================================================
  // ASSIGN TASK
  // ============================================================

  const assignTask = async () => {
    setMessage("");

    if (!project) {
      setMessage(
        "Project information is not available."
      );
      return;
    }

    if (!form.teamMember) {
      setMessage(
        "Please select a team member."
      );
      return;
    }

    if (!form.task.trim()) {
      setMessage("Please enter a task.");
      return;
    }

    if (!form.startDate) {
      setMessage(
        "Please select the start date."
      );
      return;
    }

    if (!form.endDate) {
      setMessage(
        "Please select the end date."
      );
      return;
    }

    if (form.endDate < form.startDate) {
      setMessage(
        "End date cannot be before start date."
      );
      return;
    }

    // --------------------------------------------------------
    // VERIFY MEMBER
    // --------------------------------------------------------

    const selectedMember =
      members.find(
        (member) =>
          member.member_id ===
          form.teamMember
      );

    if (!selectedMember) {
      setMessage(
        "Selected team member was not found."
      );
      return;
    }

    if (selectedMember.is_project_admin) {
      setMessage(
        "The project administrator cannot be assigned as a team member."
      );
      return;
    }

    setSaving(true);

    try {
      const insertData = {
        project_id: project.id,
        member_id: form.teamMember,
        task: form.task.trim(),
        start_date: form.startDate,
        end_date: form.endDate,
        task_status: form.taskStatus,
        payment_status:
          form.paymentStatus,
        remark: form.remark.trim() || null,
        submitted_at: null,
      };

      console.log(
        "ASSIGNING PROJECT TASK:",
        insertData
      );

      const {
        data,
        error,
      } = await supabase
        .from("tasks")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error(
          "ASSIGN TASK ERROR:",
          error
        );

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

      console.log(
        "TASK CREATED:",
        data
      );

      setMessage(
        "Task assigned successfully."
      );

      const firstTeamMember =
        members.find(
          (member) =>
            !member.is_project_admin
        );

      setForm({
        ...EMPTY_FORM,
        teamMember:
          firstTeamMember?.member_id ??
          "",
      });

      setShowForm(false);

      await loadTasks(project.id);
    } catch (error) {
      console.error(
        "ASSIGN TASK EXCEPTION:",
        error
      );

      if (error instanceof Error) {
        setMessage(
          `Unable to assign task: ${error.message}`
        );
      } else {
        setMessage(
          "An error occurred while assigning the task."
        );
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
    field:
      | "member_id"
      | "task_status"
      | "payment_status"
      | "remark",
    value: string
  ) => {
    setMessage("");

    if (!project) {
      setMessage(
        "Project information is not available."
      );
      return;
    }

    try {
      const updateData = {
        [field]:
          field === "remark"
            ? value.trim() || null
            : value,
      };

      const {
        error,
      } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", id)
        .eq(
          "project_id",
          project.id
        );

      if (error) {
        console.error(
          "TASK UPDATE ERROR:",
          error
        );

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
                [field]:
                  field === "remark"
                    ? value.trim() || null
                    : value,
              }
            : item
        )
      );
    } catch (error) {
      console.error(
        "TASK UPDATE ERROR:",
        error
      );

      if (error instanceof Error) {
        setMessage(
          `Unable to update task: ${error.message}`
        );
      } else {
        setMessage(
          "An error occurred while updating the task."
        );
      }
    }
  };

  // ============================================================
  // COUNTS
  // ============================================================

  const pendingCount =
    tasks.filter(
      (item) =>
        item.task_status === "Pending"
    ).length;

  const progressCount =
    tasks.filter(
      (item) =>
        item.task_status === "In Progress"
    ).length;

  const reviewCount =
    tasks.filter(
      (item) =>
        item.task_status === "Pending Review"
    ).length;

  const completedCount =
    tasks.filter(
      (item) =>
        item.task_status === "Completed"
    ).length;

  // ============================================================
  // GET MEMBER
  // ============================================================

  const getMember = (
    memberId: string
  ) => {
    return members.find(
      (member) =>
        member.member_id === memberId
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">
          Loading project dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {project?.project_name ??
                "Project"}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {project?.reference ?? ""}
            </p>

            {project?.pi_name && (
              <p className="mt-1 text-xs text-slate-400">
                PI: {project.pi_name}
              </p>
            )}
          </div>

          <div className="flex items-center gap-5">

            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">
                {currentAdmin?.full_name ??
                  "Admin"}
              </p>

              <p className="text-xs text-slate-500">
                Project Administrator
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loggingOut
                ? "Logging out..."
                : "Logout"}
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
        {/* PROJECT INFORMATION */}
        {/* ==================================================== */}

        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Current Project
              </p>

              <p className="mt-1 text-lg font-semibold text-slate-900">
                {project?.project_name}
              </p>

              <p className="text-sm text-slate-500">
                {project?.reference}
              </p>

              {project?.project_code && (
                <p className="mt-1 text-xs text-slate-400">
                  Project Code:{" "}
                  {project.project_code}
                </p>
              )}
            </div>

            <div className="text-left sm:text-right">

              <p className="text-xs text-slate-400">
                Administrator
              </p>

              <p className="text-sm font-semibold text-slate-900">
                {currentAdmin?.full_name}
              </p>

              <p className="text-xs text-slate-500">
                {currentAdmin?.member_id}
              </p>

            </div>

          </div>
        </div>

        {/* ==================================================== */}
        {/* STATISTICS */}
        {/* ==================================================== */}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Tasks
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {tasks.length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Pending
            </p>

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
              Manage tasks and payment status for this project.
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
                  {
                    members.filter(
                      (member) =>
                        !member.is_project_admin
                    ).length
                  }{" "}
                  project team members are available.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);

                  setForm({
                    ...EMPTY_FORM,
                    teamMember:
                      members.find(
                        (member) =>
                          !member.is_project_admin
                      )?.member_id ?? "",
                  });

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
                      teamMember:
                        e.target.value,
                    });

                    setMessage("");
                  }}
                  disabled={saving}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
                >
                  {members
                    .filter(
                      (member) =>
                        !member.is_project_admin
                    )
                    .map((member) => (
                      <option
                        key={member.member_id}
                        value={member.member_id}
                      >
                        {member.member_id} —{" "}
                        {member.full_name}
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
                    members.find(
                      (member) =>
                        member.member_id ===
                        form.teamMember
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
                      startDate:
                        e.target.value,
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
                      endDate:
                        e.target.value,
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
                  <option value="Pending">
                    Pending
                  </option>

                  <option value="Paid">
                    Paid
                  </option>

                  <option value="Denied">
                    Denied
                  </option>
                </select>
              </div>

              {/* REMARK */}

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Remark
                </label>

                <textarea
                  value={form.remark}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      remark: e.target.value,
                    })
                  }
                  disabled={saving}
                  placeholder="Write the reason or payment remark..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
                />
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
                {saving
                  ? "Assigning..."
                  : "Assign Task"}
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

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Remark
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {tasks.length === 0 ? (

                  <tr>

                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center"
                    >

                      <p className="text-sm font-medium text-slate-600">
                        No tasks assigned yet
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Click &quot;+ Assign Task&quot; to create an assignment.
                      </p>

                    </td>

                  </tr>

                ) : (

                  tasks.map((item) => {

                    const member =
                      getMember(
                        item.member_id
                      );

                    return (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-50"
                      >

                        {/* MEMBER */}

                        <td className="px-5 py-4">

                          <div className="flex flex-col gap-1">

                            <select
                              value={
                                item.member_id
                              }
                              onChange={(e) =>
                                updateTask(
                                  item.id,
                                  "member_id",
                                  e.target.value
                                )
                              }
                              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-400"
                            >

                              {members
                                .filter(
                                  (member) =>
                                    !member.is_project_admin
                                )
                                .map(
                                  (member) => (
                                    <option
                                      key={
                                        member.member_id
                                      }
                                      value={
                                        member.member_id
                                      }
                                    >
                                      {
                                        member.member_id
                                      }
                                    </option>
                                  )
                                )}

                            </select>

                            <span className="text-xs text-slate-500">
                              {member?.full_name ??
                                item.member_id}
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
                            value={
                              item.task_status
                            }
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
                            value={
                              item.payment_status
                            }
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

                            <option value="Paid">
                              Paid
                            </option>

                            <option value="Denied">
                              Denied
                            </option>

                          </select>

                        </td>

                        {/* REMARK */}

                        <td className="px-5 py-4">

                          <textarea
                            value={item.remark ?? ""}
                            onChange={(e) =>
                              setTasks((current) =>
                                current.map((task) =>
                                  task.id === item.id
                                    ? {
                                        ...task,
                                        remark:
                                          e.target.value,
                                      }
                                    : task
                                )
                              )
                            }
                            onBlur={(e) =>
                              updateTask(
                                item.id,
                                "remark",
                                e.target.value
                              )
                            }
                            placeholder="Add remark..."
                            rows={3}
                            className="w-full min-w-[220px] resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                          />

                        </td>

                      </tr>
                    );
                  })
                )}

              </tbody>

            </table>

          </div>

        </div>

        {/* ==================================================== */}
        {/* PROJECT TEAM */}
        {/* ==================================================== */}

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5">

            <h3 className="text-lg font-semibold text-slate-900">
              Project Team
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              All members assigned to this project are shown here,
              including members who have not registered yet.
            </p>

          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            {members.map((member) => {

              return (
                <div
                  key={member.id}
                  className="rounded-lg border border-slate-200 p-4"
                >

                  <div className="flex items-center justify-between">

                    <span className="text-sm font-semibold text-slate-900">
                      {member.member_id}
                    </span>

                    <div className="flex gap-2">

                      {member.is_project_admin && (
                        <span className="rounded-full bg-slate-900 px-2 py-1 text-xs text-white">
                          Admin
                        </span>
                      )}

                      {!member.is_project_admin && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                          Team
                        </span>
                      )}

                      {member.is_registered && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                          Registered
                        </span>
                      )}

                      {!member.is_registered && (
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500">
                          Not Registered
                        </span>
                      )}

                    </div>

                  </div>

                  <p className="mt-2 text-sm font-medium text-slate-800">
                    {member.full_name}
                  </p>

                  <p className="mt-1 break-all text-xs text-slate-500">
                    {member.email}
                  </p>

                  {member.is_project_admin && (
                    <p className="mt-2 text-xs font-medium text-slate-700">
                      Project Administrator
                    </p>
                  )}

                </div>
              );
            })}

          </div>

        </div>

      </section>

    </main>
  );
}