
"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

type TeamMember = {
  code: string;
  name: string;
  email: string;
};

const teamMembers: TeamMember[] = [
  {
    code: "P1",
    name: "Demiso Daba (M.Sc) - PI",
    email: "demisod390@gmail.com",
  },
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

export default function Home() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [selectedMember, setSelectedMember] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedPerson = teamMembers.find(
    (member) => member.code === selectedMember
  );

  // ============================================================
  // CHANGE LOGIN / REGISTER MODE
  // ============================================================

  const changeMode = (newMode: "login" | "register") => {
    setMode(newMode);
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  };

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setMessage("");

    // ----------------------------------------------------------
    // MEMBER CHECK
    // ----------------------------------------------------------

    if (!selectedPerson) {
      setMessage("Please select your project ID.");
      return;
    }

    // ----------------------------------------------------------
    // PASSWORD CHECK
    // ----------------------------------------------------------

    if (!password) {
      setMessage(
        mode === "register"
          ? "Please create your password."
          : "Please enter your password."
      );
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    // ----------------------------------------------------------
    // CONFIRM PASSWORD
    // ----------------------------------------------------------

    if (mode === "register") {
      if (!confirmPassword) {
        setMessage("Please confirm your password.");
        return;
      }

      if (password !== confirmPassword) {
        setMessage("Passwords do not match.");
        return;
      }
    }

    setLoading(true);

    try {
      // ========================================================
      // REGISTRATION
      // ========================================================

      if (mode === "register") {
        /*
          Registration is handled by:

              /api/register

          We send ONLY:

              member_id
              password

          The server already knows the official:
              name
              email
              role

          Therefore users cannot change their assigned
          project information.
        */

        const response = await fetch("/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            member_id: selectedPerson.code,
            password: password,
          }),
        });

        let result: any = null;

        try {
          result = await response.json();
        } catch {
          result = null;
        }

        if (!response.ok) {
          setMessage(
            result?.message ||
              result?.error ||
              "Registration failed. Please try again."
          );
          return;
        }

        /*
          Registration succeeded.

          The server has created the Auth account and
          project profile.
        */

        setMessage(
          "Registration successful. You can now log in using the password you created."
        );

        setMode("login");
        setPassword("");
        setConfirmPassword("");

        return;
      }

      // ========================================================
      // LOGIN
      // ========================================================

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: selectedPerson.email,
          password: password,
        });

      if (error) {
        setMessage(
          "Login failed. Please check your project ID and password."
        );
        return;
      }

      if (!data.user) {
        setMessage("Login failed. Please try again.");
        return;
      }

      // ========================================================
      // GET PROJECT PROFILE
      // ========================================================

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "member_id, full_name, email, role"
          )
          .eq("id", data.user.id)
          .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();

        setMessage(
          "Login succeeded, but your project profile could not be found."
        );

        return;
      }

      // ========================================================
      // VERIFY PROJECT ID
      // ========================================================

      if (profile.member_id !== selectedPerson.code) {
        await supabase.auth.signOut();

        setMessage(
          "The selected project ID does not match this account."
        );

        return;
      }

      // ========================================================
      // VERIFY EMAIL
      // ========================================================

      if (
        profile.email?.toLowerCase() !==
        selectedPerson.email.toLowerCase()
      ) {
        await supabase.auth.signOut();

        setMessage(
          "The selected project account does not match this email."
        );

        return;
      }

      // ========================================================
      // REDIRECT
      // ========================================================

      if (profile.role === "admin") {
        window.location.href = "/admin";
      } else {
        window.location.href = "/team";
      }
    } catch (error) {
      console.error("AUTHENTICATION ERROR:", error);

      setMessage(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

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


                {/* TEAM MEMBER */}

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">

                    Team Member

                  </label>


                  <select
                    value={selectedMember}
                    onChange={(e) => {
                      setSelectedMember(e.target.value);
                      setMessage("");
                      setPassword("");
                      setConfirmPassword("");
                    }}
                    disabled={loading}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >

                    <option value="">
                      Select your project ID
                    </option>


                    {teamMembers.map((member) => (
                      <option
                        key={member.code}
                        value={member.code}
                      >
                        {member.code} — {member.name}
                      </option>
                    ))}

                  </select>

                </div>


                {/* ================================================= */}
                {/* SELECTED MEMBER                                    */}
                {/* ================================================= */}

                {selectedPerson && (

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                    <div className="grid grid-cols-[90px_1fr] gap-y-3 text-sm">

                      <span className="text-slate-400">
                        Name
                      </span>

                      <span className="font-medium text-slate-800">
                        {selectedPerson.name}
                      </span>


                      <span className="text-slate-400">
                        Email
                      </span>

                      <span className="break-all font-medium text-slate-800">
                        {selectedPerson.email}
                      </span>


                      <span className="text-slate-400">
                        Project ID
                      </span>

                      <span className="font-semibold text-slate-800">
                        {selectedPerson.code}
                      </span>

                    </div>

                  </div>

                )}


                {/* ================================================= */}
                {/* PASSWORD                                           */}
                {/* ================================================= */}

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">

                    {mode === "register"
                      ? "Create Password"
                      : "Password"}

                  </label>


                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setMessage("");
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

                    <label className="mb-2 block text-sm font-medium text-slate-700">

                      Confirm Password

                    </label>


                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setMessage("");
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
                {/* MESSAGE                                            */}
                {/* ================================================= */}

                {message && (

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-5 text-slate-700">

                    {message}

                  </div>

                )}


                {/* ================================================= */}
                {/* SUBMIT BUTTON                                      */}
                {/* ================================================= */}

                <button
                  type="submit"
                  disabled={loading}
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

