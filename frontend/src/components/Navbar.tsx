"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore, useLiveStore } from "@/lib/store";
import { socketClient } from "@/lib/socket";
import {
  Search,
  Heart,
  HeartHandshake,
  Building2,
  HelpCircle,
  Bell,
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  ShieldAlert,
} from "lucide-react";

interface NavbarProps {
  onOpenAuth?: () => void;
}

export default function Navbar({ onOpenAuth }: NavbarProps) {
  const pathname = usePathname();
  const { user, logout, loadSession } = useAuthStore();
  const { alerts, addAlert } = useLiveStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    loadSession();

    socketClient.connect();
    const unsubscribe = socketClient.subscribe((event, data) => {
      if (["EMERGENCY_REQUEST_CREATED", "CRITICAL_SHORTAGE_ALERT", "NEW_NOTIFICATION"].includes(event)) {
        setUnreadNotifications((prev) => prev + 1);
        addAlert({
          id: Math.random().toString(),
          event,
          message: data.message || `New update: ${event}`,
          data,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Public Consumer Navigation Links
  const publicLinks = [
    { href: "/requests", label: "Find Blood", icon: Search },
    { href: "/donate/eligibility", label: "Check Eligibility", icon: HeartHandshake },
    { href: "/#donors", label: "Donate", icon: Heart },
    { href: "/inventory", label: "Hospitals", icon: Building2 },
    { href: "/#how-it-works", label: "How It Works", icon: HelpCircle },
  ];

  // Logged In Consumer/Staff Navigation Links
  const loggedInLinks = [
    { href: "/requests", label: "Requests", icon: Search },
    { href: "/inventory", label: "Inventory", icon: Building2 },
    { href: "/analytics", label: "Analytics", icon: LayoutDashboard },
    { href: "/ai", label: "AI Assistant", icon: ShieldAlert },
  ];

  const currentLinks = user ? loggedInLinks : publicLinks;

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          {/* Consumer Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 shadow-md shadow-red-500/25 flex items-center justify-center font-bold text-white text-xl group-hover:scale-105 transition-all">
              ✚
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight leading-none text-slate-900">
                  LifeGrid
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <span className="text-[11px] font-semibold text-slate-500 tracking-tight">
                Emergency Blood Network
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 p-1.5 rounded-full border border-slate-200/60">
            {currentLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? "bg-white text-slate-900 shadow-sm font-extrabold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-rose-600" : "text-slate-400"}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              /* Logged In State */
              <div className="flex items-center gap-3">
                {/* Notification Bell */}
                <Link
                  href="/requests"
                  className="relative p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full transition-colors cursor-pointer text-slate-600 hover:text-slate-900"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 rounded-full text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
                      {unreadNotifications}
                    </span>
                  )}
                </Link>

                {/* Avatar Menu */}
                <div className="relative">
                  <button
                    onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                    className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 border border-slate-200 rounded-full transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left text-xs font-semibold leading-tight">
                      <div className="truncate max-w-[100px] text-slate-900">{user.name}</div>
                      <div className="text-[10px] text-slate-500 capitalize">
                        {user.role.toLowerCase()}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {avatarMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70 rounded-t-2xl">
                        <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      </div>
                      <Link
                        href="/requests"
                        onClick={() => setAvatarMenuOpen(false)}
                        className="block px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        My Requests
                      </Link>
                      <Link
                        href="/inventory"
                        onClick={() => setAvatarMenuOpen(false)}
                        className="block px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Inventory &amp; Donors
                      </Link>
                      <button
                        onClick={() => {
                          setAvatarMenuOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors border-t border-slate-100 flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Log Out
                      </button>
                    </div>
                  )}
                </div>

                {/* Primary CTA */}
                <Link
                  href="/requests"
                  className="px-5 py-2.5 bg-[#E23744] hover:bg-red-700 text-white rounded-full font-bold text-xs uppercase tracking-wider shadow-md shadow-red-500/20 transition-all transform hover:-translate-y-0.5"
                >
                  Request Blood
                </Link>
              </div>
            ) : (
              /* Logged Out State */
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenAuth}
                  className="px-4 py-2 text-slate-700 hover:text-slate-900 font-bold text-xs rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <Link
                  href="/requests"
                  className="px-5 py-2.5 bg-[#E23744] hover:bg-red-700 text-white rounded-full font-bold text-xs uppercase tracking-wider shadow-md shadow-red-500/20 transition-all transform hover:-translate-y-0.5"
                >
                  Request Blood
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-slate-900" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200/80 bg-white px-4 py-4 space-y-3 shadow-lg">
            <nav className="flex flex-col gap-1">
              {currentLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm ${
                      isActive ? "bg-slate-100 text-rose-600" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-4 h-4 text-slate-500" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {!user && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth?.();
                  }}
                  className="w-full py-2.5 rounded-xl text-slate-800 bg-slate-100 font-bold text-sm"
                >
                  Sign In
                </button>
              )}
              <Link
                href="/requests"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 text-center bg-rose-600 text-white rounded-xl font-bold text-sm shadow-md"
              >
                Request Blood Now
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Sticky Bottom Emergency Bar for Mobile */}
      <div className="sm:hidden fixed bottom-3 left-3 right-3 z-40 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xl p-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 pl-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-800">24/7 Dispatch</span>
        </div>
        <Link
          href="/requests"
          className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md"
        >
          Request Blood →
        </Link>
      </div>
    </>
  );
}
