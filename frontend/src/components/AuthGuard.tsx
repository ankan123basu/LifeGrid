"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import {
  Lock,
  ShieldAlert,
  AlertTriangle,
  Building2,
  Heart,
  Ambulance,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import AuthModal from "./AuthModal";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

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

  // Unauthenticated access automatically redirects to /login?next=<path>
  useEffect(() => {
    if (mounted && (!user || !token)) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [mounted, user, token, pathname, router]);

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
            <span>Verifying session &amp; credentials...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Case 1: Unauthenticated user — redirecting with a clean fallback button
  if (!user || !token) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
        <Navbar onOpenAuth={() => setAuthModalOpen(true)} />
        <main className="flex-1 max-w-md mx-auto px-4 py-20 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-red-200 text-[#E23744] flex items-center justify-center shadow-sm">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Sign in required</h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Please sign in to access this page. Redirecting you to sign in...
            </p>
          </div>
          <Link
            href={`/login?next=${encodeURIComponent(pathname)}`}
            className="px-6 py-2.5 bg-[#E23744] hover:bg-red-700 text-white rounded-full text-xs font-bold transition-all shadow-md shadow-red-500/20"
          >
            Go to sign in now
          </Link>
        </main>
        <Footer />
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </div>
    );
  }

  // Case 2: Authenticated user but lacks required RBAC role (403 Forbidden screen)
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
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>403 Access restricted</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-slate-900">
                Insufficient role privileges
              </h1>
              <p className="text-sm font-normal text-slate-600 max-w-md mx-auto leading-relaxed">
                You are signed in as <strong className="font-bold text-slate-900">{user.role}</strong> ({user.email}).
                This section requires one of: <span className="font-mono text-xs font-bold text-slate-800">{allowedRoles.join(", ")}</span>.
              </p>
            </div>

            {DEMO_MODE && (
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleQuickLogin("staff@riversidehospital.in", "StaffPassword@123", "Hospital Staff")}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#E23744] hover:bg-red-700 text-white font-bold text-xs rounded-full shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Switch to hospital staff</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin("admin@lifegrid.in", "AdminPassword@123", "Admin")}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-full shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Switch to admin</span>
                </button>
              </div>
            )}

            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline"
              >
                Return to home
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
