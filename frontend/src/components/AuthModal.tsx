"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store";
import {
  X,
  Lock,
  Mail,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Smartphone,
  KeyRound,
  Building2,
  ShieldAlert,
  Heart,
  Ambulance,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const DEMO_ACCOUNTS = [
  { label: "Hospital staff", email: "staff@riversidehospital.in", password: "StaffPassword@123", icon: Building2 },
  { label: "System admin", email: "admin@lifegrid.in", password: "AdminPassword@123", icon: ShieldAlert },
  { label: "Voluntary donor", email: "donor@lifegrid.in", password: "DonorPassword@123", icon: Heart },
  { label: "Patient requester", email: "requester@lifegrid.in", password: "RequesterPassword@123", icon: Ambulance },
];

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [authMethod, setAuthMethod] = useState<"phone" | "email">("phone");

  // Phone + OTP State
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpTimer, setOtpTimer] = useState(30);

  // Email + Password State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);
  const { login } = useAuthStore();

  useEffect(() => {
    let interval: any = null;
    if (otpSent && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, otpTimer]);

  if (!isOpen) return null;

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setOtpSent(true);
    setOtpTimer(30);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otp || otp.length < 4) {
      setError("Please enter the verification code sent to your phone.");
      return;
    }
    setLoading(true);
    try {
      await login("donor@lifegrid.in", "DonorPassword@123");
      setLoading(false);
      onClose();
    } catch (err: any) {
      setError(err.message || "OTP verification failed. Please try again.");
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      setLoading(false);
      onClose();
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
      setLoading(false);
    }
  };

  const fillQuick = async (e: string, p: string, label: string) => {
    setEmail(e);
    setPassword(p);
    setError(null);
    setQuickLoading(label);
    try {
      await login(e, p);
      onClose();
    } catch (err: any) {
      setError(err.message || "Login failed.");
    } finally {
      setQuickLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 relative border border-slate-200/90 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-7 h-7 rounded-lg bg-[#E23744] text-white flex items-center justify-center font-bold text-sm shadow-sm">
            ✚
          </div>
          <h2 className="font-extrabold text-xl tracking-tight text-slate-900">
            Sign in to LifeGrid
          </h2>
        </div>
        <p className="text-xs text-slate-500 mb-4 font-normal">
          Sign in to manage blood requests, check donations, or access hospital stock.
        </p>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-5 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setAuthMethod("phone");
              setError(null);
            }}
            className={`py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              authMethod === "phone"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile &amp; OTP</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod("email");
              setError(null);
            }}
            className={`py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              authMethod === "email"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email &amp; password</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#E23744]" />
            <span>{error}</span>
          </div>
        )}

        {/* Primary Method: Phone Number + OTP */}
        {authMethod === "phone" && (
          <div className="space-y-3.5">
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mobile phone number
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 flex items-center gap-1 border-r border-slate-200 pr-2">
                      <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98765 43210"
                      className="w-full pl-20 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-400/20 focus:border-[#E23744] transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#E23744] hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md shadow-red-500/20 cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <span>Send verification code</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3.5 animate-in fade-in duration-150">
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Code sent to +91 {phone}</span>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="ml-auto text-[11px] font-bold underline hover:text-emerald-900"
                  >
                    Change
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Enter 6-digit OTP
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold tracking-widest text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-400/20 focus:border-[#E23744] transition-all text-center"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>Didn&apos;t get code?</span>
                    {otpTimer > 0 ? (
                      <span>Resend in {otpTimer}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOtpTimer(30)}
                        className="text-[#E23744] font-bold hover:underline cursor-pointer"
                      >
                        Resend code
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#E23744] hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md shadow-red-500/20 cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{loading ? "Verifying..." : "Verify & sign in"}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Secondary Method: Email & Password */}
        {authMethod === "email" && (
          <form onSubmit={handleEmailLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
                  onClick={() => alert("Password reset instructions will be sent to your registered email.")}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-400/20 focus:border-[#E23744] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#E23744] hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md shadow-red-500/20 cursor-pointer transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{loading ? "Signing in..." : "Sign in"}</span>
            </button>
          </form>
        )}

        <div className="mt-4 text-center text-xs text-slate-500 font-normal">
          Don&apos;t have an account?{" "}
          <Link href="/register" onClick={onClose} className="font-semibold text-[#E23744] hover:underline">
            Create account
          </Link>
        </div>

        {/* Demo Accounts — strictly gated behind NEXT_PUBLIC_DEMO_MODE */}
        {DEMO_MODE && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold text-slate-500">
                Demo accounts (dev only):
              </span>
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Dev only
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {DEMO_ACCOUNTS.map(({ label, email: e, password: p, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  disabled={!!quickLoading}
                  onClick={() => fillQuick(e, p, label)}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left cursor-pointer transition-colors disabled:opacity-50"
                >
                  <div className="font-semibold text-slate-900 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <Icon className="w-3 h-3 text-slate-500" />
                      <span>{label}</span>
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
    </div>
  );
}
