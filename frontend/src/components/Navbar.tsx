"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore, useLiveStore } from "@/lib/store";
import { socketClient } from "@/lib/socket";
import { Activity, ShieldAlert, Cpu, Terminal, BarChart3, Droplet, User, LogOut, LogIn } from "lucide-react";

interface NavbarProps {
  onOpenAuth?: () => void;
}

export default function Navbar({ onOpenAuth }: NavbarProps) {
  const pathname = usePathname();
  const { user, logout, loadSession } = useAuthStore();
  const { connected, setConnected, alerts, addAlert } = useLiveStore();

  useEffect(() => {
    loadSession();

    socketClient.connect();
    const unsubscribe = socketClient.subscribe((event, data) => {
      setConnected(true);
      if (["EMERGENCY_REQUEST_CREATED", "CRITICAL_SHORTAGE_ALERT", "NEW_NOTIFICATION"].includes(event)) {
        addAlert({
          id: Math.random().toString(),
          event,
          message: data.message || `New event: ${event}`,
          data,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const navLinks = [
    { href: "/", label: "Network", icon: Droplet },
    { href: "/requests", label: "Emergencies", icon: ShieldAlert },
    { href: "/inventory", label: "Stock Grid", icon: Activity },
    { href: "/ai", label: "LifeGrid AI", icon: Cpu },
    { href: "/query-lab", label: "Query Lab", icon: Terminal },
    { href: "/analytics", label: "Viva Analytics", icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#F4F1EA] border-b-[3px] border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-[#FF4D4D] border-[3px] border-black shadow-[3px_3px_0px_#000] flex items-center justify-center font-black text-white text-xl group-hover:-translate-y-0.5 transition-transform">
            ✚
          </div>
          <div>
            <div className="font-extrabold text-xl tracking-tight leading-none flex items-center gap-1.5">
              <span>LIFEGRID</span>
              <span className="text-[10px] font-mono uppercase bg-[#FFE600] px-1.5 py-0.5 border border-black font-black">
                CSE494
              </span>
            </div>
            <div className="text-[11px] font-mono text-neutral-600 tracking-wider">
              NoSQL EMERGENCY MESH
            </div>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-bold text-sm border-2 transition-all ${
                  isActive
                    ? "bg-[#FFE600] border-black shadow-[3px_3px_0px_#000] -translate-y-0.5"
                    : "border-transparent hover:border-black hover:bg-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Action & Auth Badges */}
        <div className="flex items-center gap-3">
          {/* Live WS Pill */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold border-2 border-black shadow-[2px_2px_0px_#000] ${
              connected ? "bg-[#2EE59D]" : "bg-[#FF4D4D] text-white"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-black animate-ping" : "bg-white"}`} />
            <span>{connected ? "LIVE MESH" : "OFFLINE"}</span>
          </div>

          {/* User Profile or Login */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-white px-2.5 py-1 border-2 border-black shadow-[2px_2px_0px_#000]">
                <div className="w-6 h-6 rounded-full bg-[#7CD4FF] border border-black flex items-center justify-center font-bold text-xs">
                  {user.name.charAt(0)}
                </div>
                <div className="text-xs font-bold leading-tight hidden lg:block">
                  <div>{user.name}</div>
                  <div className="text-[9px] font-mono text-neutral-500">{user.role}</div>
                </div>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 bg-white hover:bg-[#FF4D4D] hover:text-white border-2 border-black shadow-[2px_2px_0px_#000] transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="neo-btn neo-btn-primary text-xs py-1.5 px-3 shadow-[3px_3px_0px_#000]"
            >
              <LogIn className="w-4 h-4" />
              <span>Connect</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
