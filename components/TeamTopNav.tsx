"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type TeamTopNavProps = {
  name?: string;
  code?: string;
};

export default function TeamTopNav({ name, code }: TeamTopNavProps) {
  const [loggingOut, setLoggingOut] = useState(false);

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

  return (
    <>
      {/* Desktop Top Navigation */}
      <header className="hidden border-b border-slate-200 bg-white lg:block fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center">
          {/* Project Brand - Full height dark section, touching left edge */}
          <div className="flex h-full items-center bg-slate-900 pl-8 pr-[22px] py-5">
            <div>
              <h1 className="text-3xl font-bold text-white">AI4Groundwater</h1>
              <p className="mt-0.5 text-[11px] text-slate-300">Res/AWTI/078/26</p>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-end gap-4 pr-8">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">
                Team Dashboard
              </p>
              <p className="text-xs text-slate-500">{code ?? ""}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/rules";
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Ground Rules
            </button>

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

      {/* Mobile Top Navigation - Fixed */}
      <div className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white shadow-sm lg:hidden">
        {/* Top Header */}
        <div className="flex items-center">
          {/* Project Brand - Full height dark section on mobile, touching left edge */}
          <div className="flex h-full items-center bg-slate-900 pl-4 pr-[18px] py-3">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-white">
                AI4Groundwater
              </h1>
              <p className="truncate text-[9px] text-slate-300">
                Res/AWTI/078/26
              </p>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2 pr-4">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/rules";
              }}
              className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Rules
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loggingOut ? "..." : "Logout"}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 bg-white px-3 py-2">
          <Link
            href="/team"
            className="shrink-0 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
          >
            🏠 Dashboard
          </Link>

          <a
            href="#assigned-work"
            className="shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
          >
            📋 My Work
          </a>

          <Link
            href="/rules"
            className="shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
          >
            📜 Ground Rules
          </Link>
        </nav>
      </div>

      {/* Spacer to prevent content from hiding behind fixed nav */}
      <div className="h-16 lg:h-0"></div>
    </>
  );
}