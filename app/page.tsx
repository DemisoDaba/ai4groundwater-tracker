
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
};

export default function Home() {
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [selectedProject, setSelectedProject] = useState("");
  const [selectedMember, setSelectedMember] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [mode, setMode] = useState<"login" | "register">("login");

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ============================================================
  // LOAD PROJECTS
  // ============================================================

  useEffect(() => {
    async function loadProjects() {
      setLoadingProjects(true);
      setError("");

      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, project_code, project_name, reference, pi_name"
        )
        .order("project_code", { ascending: true });

      if (error) {
        console.error("PROJECT LOAD ERROR:", error);
        setError(`Project error: ${error.message}`);
        setLoadingProjects(false);
        return;
      }

      setProjects(data ?? []);

      if (data && data.length > 0) {
        setSelectedProject(String(data[0].id));
      }

      setLoadingProjects(false);
    }

    loadProjects();
  }, []);

  // ============================================================
  // LOAD ALL MEMBERS FOR SELECTED PROJECT
  // ============================================================

  useEffect(() => {
    async function loadMembers() {
      if (!selectedProject) {
        setTeamMembers([]);
        setSelectedMember("");
        return;
      }

      setLoadingMembers(true);
      setError("");

      const { data, error } = await supabase
        .from("project_member_directory")
        .select(
          "id, member_id, full_name, email, project_role, is_project_admin"
        )
        .eq("project_id", Number(selectedProject))
        .order("member_id", { ascending: true });

      if (error) {
        console.error("MEMBER LOAD ERROR:", error);
        setError(`Member error: ${error.message}`);
        setTeamMembers([]);
        setSelectedMember("");
        setLoadingMembers(false);
        return;
      }

      const members = (data ?? []) as TeamMember[];

      members.sort((a, b) =>
        a.member_id.localeCompare(b.member_id, undefined, {
          numeric: true,
        })
      );

      setTeamMembers(members);

      if (members.length > 0) {
        setSelectedMember(String(members[0].id));
      } else {
        setSelectedMember("");
      }

      setLoadingMembers(false);
    }

    loadMembers();
  }, [selectedProject]);

  // ============================================================
  // SELECTED PROJECT
  // ============================================================

  const currentProject = projects.find(
    (project) => String(project.id) === selectedProject
  );

  // ============================================================
  // SELECTED MEMBER
  // ============================================================

  const currentMember = teamMembers.find(
    (member) => String(member.id) === selectedMember
  );

  // ============================================================
  // CHANGE LOGIN / REGISTER MODE
  // ============================================================

  const changeMode = (newMode: "login" | "register") => {
    setMode(newMode);
    setMessage("");
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  // ============================================================
  // LOGIN
  // ============================================================

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    if (!currentProject) {
      setError("Please select a project.");
      setLoading(false);
      return;
    }

    if (!currentMember) {
      setError("Please select your project ID.");
      setLoading(false);
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      setLoading(false);
      return;
    }

    // ==========================================================
    // AUTHENTICATE USER
    // ==========================================================

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: currentMember.email,
        password,
      });

    if (error || !data.user) {
      setError(
        error?.message ||
          "Login failed. Please check your project ID and password."
      );

      setLoading(false);
      return;
    }

    // ==========================================================
    // FIND PROFILE
    // ==========================================================

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "id, member_id, full_name, email, role"
      )
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();

      setError(
        "Login succeeded, but your project profile could not be found."
      );

      setLoading(false);
      return;
    }

    // ==========================================================
    // VERIFY PROJECT MEMBER + PROJECT ADMIN STATUS
    // ==========================================================

    const {
      data: projectMember,
      error: projectMemberError,
    } = await supabase
      .from("project_member_directory")
      .select(
        "member_id, full_name, email, project_role, is_project_admin"
      )
      .eq(
        "project_id",
        Number(selectedProject)
      )
      .eq("member_id", profile.member_id)
      .maybeSingle();

    if (projectMemberError) {
      console.error(
        "PROJECT MEMBER DIRECTORY ERROR:",
        projectMemberError
      );

      await supabase.auth.signOut();

      setError(
        "Could not verify your role in the selected project."
      );

      setLoading(false);
      return;
    }

    if (!projectMember) {
      await supabase.auth.signOut();

      setError(
        "Your account is not assigned to the selected project."
      );

      setLoading(false);
      return;
    }

    // ==========================================================
    // SAVE SELECTED PROJECT
    // ==========================================================

    localStorage.setItem(
      "selectedProjectId",
      String(selectedProject)
    );

    // ==========================================================
    // PROJECT-LEVEL REDIRECT
    // ==========================================================

    if (projectMember.is_project_admin === true) {
      router.push("/admin");
    } else {
      router.push("/team");
    }
  }

  // ============================================================
  // REGISTER
  // ============================================================

  async function handleRegister(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    if (!currentProject) {
      setError("Please select a project.");
      setLoading(false);
      return;
    }

    if (!currentMember) {
      setError("Please select your project ID.");
      setLoading(false);
      return;
    }

    if (!password) {
      setError("Please create your password.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your password.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        "/api/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            member_id:
              currentMember.member_id,
            email: currentMember.email,
            password,
            project_id: currentProject.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result?.message ||
            result?.error ||
            "Registration failed. Please try again."
        );

        setLoading(false);
        return;
      }

      setMessage(
        result?.message ||
          "Registration successful. You can now log in using the password you created."
      );

      setMode("login");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(
        "REGISTRATION REQUEST ERROR:",
        error
      );

      setError(
        "Something went wrong during registration."
      );
    }

    setLoading(false);
  }

  // ============================================================
  // SUBMIT
  // ============================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    if (mode === "login") {
      await handleLogin(event);
    } else {
      await handleRegister(event);
    }
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <main className="min-h-screen bg-slate-50">

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">

        {/* ================================================== */}
        {/* LEFT SIDE — PROJECT INFORMATION                    */}
        {/* ================================================== */}

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
                  {currentProject?.project_name ?? "AI4Groundwater"}
                </p>

              </div>

              {/* REFERENCE */}

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Reference
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {currentProject?.reference ?? ""}
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

        {/* ================================================== */}
        {/* RIGHT SIDE — LOGIN / REGISTER                       */}
        {/* ================================================== */}

        <section className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:border-l lg:border-slate-200 lg:px-16">

          <div className="w-full max-w-md">

            {/* ================================================= */}
            {/* LOGIN CARD                                         */}
            {/* ================================================= */}

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">

              {/* LOGIN / REGISTER SWITCH */}

              <div className="mb-7 grid grid-cols-2 rounded-lg bg-slate-100 p-1">

                <button
                  type="button"
                  onClick={() => changeMode("login")}
                  disabled={loading}
                  className={`rounded-md py-2.5 text-sm font-medium transition ${
                    mode === "login"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Login
                </button>

                <button
                  type="button"
                  onClick={() => changeMode("register")}
                  disabled={loading}
                  className={`rounded-md py-2.5 text-sm font-medium transition ${
                    mode === "register"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Register
                </button>

              </div>

              {/* TITLE */}

              <div className="mb-7">

                <h2 className="text-xl font-semibold text-slate-900">

                  {mode === "login"
                    ? "Welcome back"
                    : "Create your account"}

                </h2>

                <p className="mt-1 text-sm leading-5 text-slate-500">

                  {mode === "login"
                    ? "Select your project ID and enter your password."
                    : "Select your project ID and create your own password."}

                </p>

              </div>

              {/* ================================================= */}
              {/* FORM                                               */}
              {/* ================================================= */}

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >

                {/* PROJECT */}

                <div>

                  <label
                    htmlFor="project"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Project
                  </label>

                  <select
                    id="project"
                    value={selectedProject}
                    onChange={(e) => {
                      setSelectedProject(e.target.value);
                      setSelectedMember("");
                      setMessage("");
                      setError("");
                      setPassword("");
                      setConfirmPassword("");
                    }}
                    disabled={
                      loadingProjects || loading
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >

                    {loadingProjects ? (
                      <option value="">
                        Loading projects...
                      </option>
                    ) : projects.length === 0 ? (
                      <option value="">
                        No projects available
                      </option>
                    ) : (
                      projects.map((project) => (
                        <option
                          key={project.id}
                          value={project.id}
                        >
                          Project {project.project_code} —{" "}
                          {project.reference}
                        </option>
                      ))
                    )}

                  </select>

                </div>

                {/* TEAM MEMBER */}

                <div>

                  <label
                    htmlFor="member"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Team Member
                  </label>

                  <select
                    id="member"
                    value={selectedMember}
                    onChange={(e) => {
                      setSelectedMember(e.target.value);
                      setMessage("");
                      setError("");
                      setPassword("");
                      setConfirmPassword("");
                    }}
                    disabled={
                      loadingMembers ||
                      loading ||
                      teamMembers.length === 0
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >

                    {loadingMembers ? (
                      <option value="">
                        Loading team members...
                      </option>
                    ) : teamMembers.length === 0 ? (
                      <option value="">
                        No members assigned to this project
                      </option>
                    ) : (
                      teamMembers.map((member) => (
                        <option
                          key={member.id}
                          value={member.id}
                        >
                          {member.member_id} —{" "}
                          {member.full_name}
                        </option>
                      ))
                    )}

                  </select>

                </div>

                {/* ================================================= */}
                {/* SELECTED MEMBER                                    */}
                {/* ================================================= */}

                {currentMember && (

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                    <div className="grid grid-cols-[90px_1fr] gap-y-3 text-sm">

                      <span className="text-slate-400">
                        Name
                      </span>

                      <span className="font-medium text-slate-800">
                        {currentMember.full_name}
                      </span>

                      <span className="text-slate-400">
                        Email
                      </span>

                      <span className="break-all font-medium text-slate-800">
                        {currentMember.email}
                      </span>

                      <span className="text-slate-400">
                        Project ID
                      </span>

                      <span className="font-semibold text-slate-800">
                        {currentMember.member_id}
                      </span>

                    </div>

                  </div>

                )}

                {/* ================================================= */}
                {/* PASSWORD                                           */}
                {/* ================================================= */}

                <div>

                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >

                    {mode === "register"
                      ? "Create Password"
                      : "Password"}

                  </label>

                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setMessage("");
                      setError("");
                    }}
                    placeholder={
                      mode === "register"
                        ? "Create your password"
                        : "Enter your password"
                    }
                    disabled={loading}
                    autoComplete={
                      mode === "register"
                        ? "new-password"
                        : "current-password"
                    }
                    minLength={6}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />

                </div>

                {/* ================================================= */}
                {/* CONFIRM PASSWORD                                    */}
                {/* ================================================= */}

                {mode === "register" && (

                  <div>

                    <label
                      htmlFor="confirmPassword"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Confirm Password
                    </label>

                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setMessage("");
                        setError("");
                      }}
                      placeholder="Confirm your password"
                      disabled={loading}
                      autoComplete="new-password"
                      minLength={6}
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />

                  </div>

                )}

                {/* ================================================= */}
                {/* MESSAGE                                             */}
                {/* ================================================= */}

                {error && (

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-5 text-slate-700">

                    {error}

                  </div>

                )}

                {message && (

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-5 text-slate-700">

                    {message}

                  </div>

                )}

                {/* ================================================= */}
                {/* SUBMIT BUTTON                                       */}
                {/* ================================================= */}

                <button
                  type="submit"
                  disabled={
                    loading ||
                    loadingProjects ||
                    loadingMembers ||
                    !selectedProject ||
                    !selectedMember
                  }
                  className="w-full rounded-lg bg-slate-900 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >

                  {loading
                    ? mode === "register"
                      ? "Creating account..."
                      : "Signing in..."
                    : mode === "register"
                    ? "Create Account"
                    : "Login"}

                </button>

              </form>

            </div>

            {/* ================================================= */}
            {/* INFORMATION                                         */}
            {/* ================================================= */}

            <div className="mt-5 px-3">

              <p className="text-center text-xs leading-5 text-slate-400">

                {mode === "register"
                  ? "Your project ID, name, and registered email are assigned by the project. You create and control your own password."
                  : "Use the password you created during registration. If you cannot log in, contact the project administrator."}

              </p>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}

