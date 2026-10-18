"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Lock, Mail, AlertCircle, RefreshCw, Eye, EyeOff,
  Building2, ShieldAlert, Heart, Ambulance,
} from "lucide-react";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const DEMO_ACCOUNTS = [
  { label: "Hospital Staff", email: "staff@riversidehospital.in", password: "StaffPassword@123", icon: Building2 },
  { label: "System Admin", email: "admin@lifegrid.in", password: "AdminPassword@123", icon: ShieldAlert },
  { label: "Donor", email: "donor@lifegrid.in", password: "DonorPassword@123", icon: Heart },
  { label: "Requester", email: "requester@lifegrid.in", password: "RequesterPassword@123", icon: Ambulance },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || searchParams.get("next") || "/";

  const { login, user } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      if (redirectUrl && redirectUrl !== "/") {
        router.push(redirectUrl);
      } else if (["HOSPITAL_STAFF", "ADMIN"].includes(user.role)) {
        router.push("/analytics");
      } else {
        router.push("/");
      }
    }
  }, [user, redirectUrl, router]);

  const doRedirect = (role?: string) => {
    if (redirectUrl && redirectUrl !== "/") {
      router.push(redirectUrl);
    } else if (role && ["HOSPITAL_STAFF", "ADMIN"].includes(role)) {
      router.push("/analytics");
    } else {
      router.push("/");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      doRedirect(loggedUser?.role);
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (e: string, p: string, label: string) => {
    setEmail(e);
    setPassword(p);
    setError(null);
    setQuickLoading(label);
    try {
      const loggedUser = await login(e, p);
      doRedirect(loggedUser?.role);
    } catch (err: any) {
      setError(err.message || "Quick login failed.");
    } finally {
      setQuickLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-xl max-w-md w-full">
      {/* Brand Icon & Heading */}
      <div className="text-center space-y-2 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#E23744] text-white flex items-center justify-center font-bold text-xl shadow-md shadow-red-500/20 mx-auto">
          ✚
        </div>
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-slate-900">
          Sign in to LifeGrid
        </h1>
        <p className="text-xs text-slate-500 font-normal">
          Authorized access to emergency dispatch, inventory, and analytics.
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs font-bold text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#E23744]" />
          <span>{error}</span>
        </div>
      )}

      {/* Sign In Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Email address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@hospital.in"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-400/20 focus:border-[#E23744] transition-all"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Password
            </label>
            <button
              type="button"
              className="text-[11px] text-[#E23744] hover:underline font-semibold"
              onClick={() => {}}
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-400/20 focus:border-[#E23744] transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-[#E23744] hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-md shadow-red-500/20 cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
        >
          {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
          <span>{loading ? "Signing in..." : "Sign in"}</span>
        </button>
      </form>

      <div className="mt-4 text-center text-xs text-slate-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-[#E23744] hover:underline">
          Create account
        </Link>
      </div>

      {/* 1-Click Demo Accounts — only in DEMO_MODE */}
      {DEMO_MODE && (
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-slate-500">
              Demo accounts (dev only):
            </span>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Dev / Staging only
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {DEMO_ACCOUNTS.map(({ label, email: e, password: p, icon: Icon }) => (
              <button
                key={label}
                type="button"
                disabled={!!quickLoading}
                onClick={() => handleQuickLogin(e, p, label)}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left cursor-pointer transition-colors disabled:opacity-50"
              >
                <div className="font-semibold text-slate-900 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Icon className="w-3 h-3 text-slate-500" />
                    {label}
                  </span>
                  {quickLoading === label && <RefreshCw className="w-3 h-3 animate-spin text-[#E23744]" />}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">{e}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <Suspense
          fallback={
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <RefreshCw className="w-4 h-4 animate-spin text-[#E23744]" />
              <span>Loading...</span>
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
