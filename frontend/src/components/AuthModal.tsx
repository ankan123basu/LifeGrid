"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/store";
import { X, Lock, Mail, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      setLoading(false);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to authenticate.");
      setLoading(false);
    }
  };

  const fillQuick = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="neo-card bg-[#FFFFFF] max-w-md w-full p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 border-2 border-black bg-[#FF4D4D] text-white hover:bg-black transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-4 bg-[#FFE600] border border-black" />
          <h2 className="font-extrabold text-xl tracking-tight">CONNECT TO LIFEGRID</h2>
        </div>
        <p className="text-xs font-mono text-neutral-600 mb-4">
          Authenticate using JWT & RBAC with MongoDB security guards.
        </p>

        {/* Error alert if any */}
        {error && (
          <div className="mb-4 p-3 bg-[#FF4D4D]/10 border-2 border-[#FF4D4D] flex items-center gap-2 text-xs font-bold text-[#FF4D4D]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="user@lifegrid.in"
                className="neo-input pl-9 text-sm"
              />
              <Mail className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="neo-input pl-9 text-sm"
              />
              <Lock className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="neo-btn neo-btn-primary w-full py-2.5 text-sm mt-2 disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        {/* Quick Demo Pre-fills */}
        <div className="mt-5 pt-4 border-t-2 border-black">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-500 mb-2">
            Quick Role Accounts (One-Click):
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillQuick("admin@lifegrid.in", "AdminPassword@123")}
              className="p-1.5 text-left border-2 border-black bg-[#FFE600] font-bold hover:-translate-y-0.5 transition-transform"
            >
              👑 Admin (System)
            </button>
            <button
              type="button"
              onClick={() => fillQuick("staff@cmcludhiana.in", "StaffPassword@123")}
              className="p-1.5 text-left border-2 border-black bg-[#7CD4FF] font-bold hover:-translate-y-0.5 transition-transform"
            >
              🏥 CMC Staff (Ludhiana)
            </button>
            <button
              type="button"
              onClick={() => fillQuick("donor@lifegrid.in", "DonorPassword@123")}
              className="p-1.5 text-left border-2 border-black bg-[#2EE59D] font-bold hover:-translate-y-0.5 transition-transform"
            >
              🩸 Active Donor
            </button>
            <button
              type="button"
              onClick={() => fillQuick("requester@lifegrid.in", "RequesterPassword@123")}
              className="p-1.5 text-left border-2 border-black bg-[#FF90C8] font-bold hover:-translate-y-0.5 transition-transform"
            >
              🚑 Requester (Emergency)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
