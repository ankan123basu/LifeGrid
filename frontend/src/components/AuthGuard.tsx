"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { Lock, ShieldAlert, AlertTriangle, ArrowRight, CheckCircle2, User, RefreshCw } from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import AuthModal from "./AuthModal";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, token, loadSession, login } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    loadSession();
    setMounted(true);
  }, []);

  // Quick 1-click login handler for demo / evaluation
  const handleQuickLogin = async (email: string, pass: string, roleName: string) => {
    setQuickLoading(roleName);
    try {
      await login(email, pass);
    } catch (err: any) {
      alert("Login failed: " + (err.message || "Invalid credentials"));
    } finally {
      setQuickLoading(null);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin text-[#E23744]" />
            <span>Verifying session &amp; RBAC credentials...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Case 1: Unauthenticated user attempting to access protected route
  if (!user || !token) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
        <Navbar onOpenAuth={() => setAuthModalOpen(true)} />

        <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-16 flex items-center justify-center w-full">
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-xl text-center space-y-6 w-full">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-red-200 text-[#E23744] flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-[#E23744] border border-red-200 rounded-full text-xs font-extrabold uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5" /> Authentication Required
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-slate-900">
                Sign In to Access This Page
              </h1>
              <p className="text-sm font-normal text-slate-600 max-w-md mx-auto leading-relaxed">
                This internal clinical and administrative section requires verified credentials.
                Please sign in to proceed.
              </p>
            </div>

            {/* Quick 1-Click Demo Accounts */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Quick Evaluation Logins (1-Click):
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Instant Access
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={!!quickLoading}
                  onClick={() => handleQuickLogin("staff@riversidehospital.in", "StaffPassword@123", "Staff")}
                  className="p-3 bg-white hover:bg-slate-100/80 border border-slate-200 rounded-xl text-left cursor-pointer transition-all hover:border-slate-300 disabled:opacity-50"
                >
                  <div className="font-extrabold text-xs text-slate-900 flex items-center justify-between">
                    <span>🏥 Hospital Staff</span>
                    {quickLoading === "Staff" && <RefreshCw className="w-3 h-3 animate-spin text-[#E23744]" />}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">staff@riversidehospital.in</div>
                </button>

                <button
                  type="button"
                  disabled={!!quickLoading}
                  onClick={() => handleQuickLogin("admin@lifegrid.in", "AdminPassword@123", "Admin")}
                  className="p-3 bg-white hover:bg-slate-100/80 border border-slate-200 rounded-xl text-left cursor-pointer transition-all hover:border-slate-300 disabled:opacity-50"
                >
                  <div className="font-extrabold text-xs text-slate-900 flex items-center justify-between">
                    <span>👑 System Admin</span>
                    {quickLoading === "Admin" && <RefreshCw className="w-3 h-3 animate-spin text-[#E23744]" />}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">admin@lifegrid.in</div>
                </button>

                <button
                  type="button"
                  disabled={!!quickLoading}
                  onClick={() => handleQuickLogin("donor@lifegrid.in", "DonorPassword@123", "Donor")}
                  className="p-3 bg-white hover:bg-slate-100/80 border border-slate-200 rounded-xl text-left cursor-pointer transition-all hover:border-slate-300 disabled:opacity-50"
                >
                  <div className="font-extrabold text-xs text-slate-900 flex items-center justify-between">
                    <span>🩸 Voluntary Donor</span>
                    {quickLoading === "Donor" && <RefreshCw className="w-3 h-3 animate-spin text-[#E23744]" />}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">donor@lifegrid.in</div>
                </button>

                <button
                  type="button"
                  disabled={!!quickLoading}
                  onClick={() => handleQuickLogin("requester@lifegrid.in", "RequesterPassword@123", "Requester")}
                  className="p-3 bg-white hover:bg-slate-100/80 border border-slate-200 rounded-xl text-left cursor-pointer transition-all hover:border-slate-300 disabled:opacity-50"
                >
                  <div className="font-extrabold text-xs text-slate-900 flex items-center justify-between">
                    <span>🚑 Patient / Requester</span>
                    {quickLoading === "Requester" && <RefreshCw className="w-3 h-3 animate-spin text-[#E23744]" />}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">requester@lifegrid.in</div>
                </button>
              </div>
            </div>

            {/* Standard Sign In & Register Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={`/login?redirect=${encodeURIComponent(pathname)}`}
                className="w-full sm:w-auto px-6 py-3 bg-[#E23744] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
              >
                Sign In With Custom Account
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </main>

        <Footer />
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </div>
    );
  }

  // Case 2: Authenticated user but lacks required RBAC role
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
        <Navbar />

        <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-16 flex items-center justify-center w-full">
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-xl text-center space-y-6 w-full">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-extrabold uppercase tracking-wider">
                <span>403 Access Restricted</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-slate-900">
                Insufficient Role Privileges
              </h1>
              <p className="text-sm font-normal text-slate-600 max-w-md mx-auto leading-relaxed">
                You are currently signed in as <strong className="font-bold text-slate-900">{user.role}</strong> ({user.email}).
                This section requires one of: <span className="font-mono text-xs font-bold text-slate-800">{allowedRoles.join(", ")}</span>.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleQuickLogin("staff@riversidehospital.in", "StaffPassword@123", "Staff")}
                className="w-full sm:w-auto px-5 py-3 bg-[#E23744] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
              >
                Switch to Hospital Staff
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("admin@lifegrid.in", "AdminPassword@123", "Admin")}
                className="w-full sm:w-auto px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
              >
                Switch to Admin
              </button>
              <Link
                href="/"
                className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                Go to Home
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // Case 3: Fully authorized
  return <>{children}</>;
}
