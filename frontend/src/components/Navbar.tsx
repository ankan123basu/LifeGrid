"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
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
  Calendar,
  Globe,
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
  const [donateDropdownOpen, setDonateDropdownOpen] = useState(false);
  const [lang, setLang] = useState<"EN" | "हिं" | "ਪੰ">("EN");
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSession();

    socketClient.connect();
    const unsubscribe = socketClient.subscribe((event, data) => {
      if (
        ["EMERGENCY_REQUEST_CREATED", "CRITICAL_SHORTAGE_ALERT", "NEW_NOTIFICATION"].includes(event)
      ) {
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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDonateDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Logged In Staff / Admin Links
  const loggedInLinks = [
    { href: "/requests", label: "Requests", icon: Search },
    { href: "/inventory", label: "Inventory", icon: Building2 },
    { href: "/analytics", label: "Analytics", icon: LayoutDashboard },
    { href: "/ai", label: "AI Assistant", icon: ShieldAlert },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-[#E23744] shadow-md shadow-red-500/25 flex items-center justify-center font-bold text-white text-xl group-hover:scale-105 transition-all">
              ✚
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight leading-none text-slate-900">
                LifeGrid
              </span>
              <span className="text-[11px] font-semibold text-slate-500 tracking-normal mt-0.5">
                Emergency Blood Network
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links (Find Blood | Donate [Dropdown] | Hospitals | How It Works) */}
          {!user ? (
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 p-1.5 rounded-full border border-slate-200/60">
              <Link
                href="/requests"
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  pathname === "/requests"
                    ? "bg-white text-slate-900 shadow-sm font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span>Find Blood</span>
              </Link>

              {/* Donate Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDonateDropdownOpen(!donateDropdownOpen)}
                  onMouseEnter={() => setDonateDropdownOpen(true)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    pathname.startsWith("/donate") || donateDropdownOpen
                      ? "bg-white text-slate-900 shadow-sm font-extrabold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 text-[#E23744]" />
                  <span>Donate</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                      donateDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {donateDropdownOpen && (
                  <div
                    onMouseLeave={() => setDonateDropdownOpen(false)}
                    className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <Link
                      href="/donate/eligibility"
                      onClick={() => setDonateDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#E23744] transition-colors"
                    >
                      <HeartHandshake className="w-4 h-4 text-emerald-600" />
                      <div>
                        <div>Check Eligibility</div>
                        <div className="text-[10px] font-normal text-slate-400">
                          1-min clinical pre-screening
                        </div>
                      </div>
                    </Link>

                    <Link
                      href="/register?role=DONOR"
                      onClick={() => setDonateDropdownOpen(false)}
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#E23744] transition-colors cursor-pointer"
                    >
                      <Heart className="w-4 h-4 text-[#E23744]" />
                      <div>
                        <div>Register as Donor</div>
                        <div className="text-[10px] font-normal text-slate-400">
                          Receive local SOS alerts
                        </div>
                      </div>
                    </Link>

                    <Link
                      href="/requests"
                      onClick={() => setDonateDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#E23744] transition-colors"
                    >
                      <Calendar className="w-4 h-4 text-sky-600" />
                      <div>
                        <div>Blood Drives</div>
                        <div className="text-[10px] font-normal text-slate-400">
                          Community donation camps
                        </div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>

              <Link
                href="/inventory"
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  pathname === "/inventory"
                    ? "bg-white text-slate-900 shadow-sm font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Hospitals</span>
              </Link>

              <Link
                href="/#how-it-works"
                className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all"
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>How It Works</span>
              </Link>
            </nav>
          ) : (
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 p-1.5 rounded-full border border-slate-200/60">
              {loggedInLinks.map((link) => {
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
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#E23744]" : "text-slate-400"}`} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Desktop Right Actions: Language Switcher + Auth / Emergency CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {/* EN / हिं / ਪੰ Multi-language Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200/80 text-[11px] font-bold">
              {(["EN", "हिं", "ਪੰ"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2 py-1 rounded-full transition-all cursor-pointer ${
                    lang === l
                      ? "bg-white text-slate-900 shadow-xs font-extrabold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                  title={`Switch to ${l === "EN" ? "English" : l === "हिं" ? "Hindi" : "Punjabi"}`}
                >
                  {l}
                </button>
              ))}
            </div>

            {user ? (
              /* Logged In State */
              <div className="flex items-center gap-3">
                <Link
                  href="/requests"
                  className="relative p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full transition-colors cursor-pointer text-slate-600 hover:text-slate-900"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E23744] rounded-full text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
                      {unreadNotifications}
                    </span>
                  )}
                </Link>

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

                  {avatarMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <div className="text-xs font-bold text-slate-900">{user.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                      </div>
                      <Link
                        href="/requests"
                        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        onClick={() => setAvatarMenuOpen(false)}
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Profile &amp; Requests</span>
                      </Link>
                      {user.role === "ADMIN" && (
                        <Link
                          href="/admin/dev-tools"
                          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
                          onClick={() => setAvatarMenuOpen(false)}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Admin &amp; RBAC DevTools</span>
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          setAvatarMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Public Anonymous State: Sign In + Solid Red Request Blood */
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  onClick={(e) => {
                    if (onOpenAuth) {
                      e.preventDefault();
                      onOpenAuth();
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                >
                  Sign in
                </Link>
                <Link
                  href="/requests"
                  className="px-4 py-2 bg-[#E23744] hover:bg-red-700 text-white font-bold text-xs rounded-full shadow-md shadow-red-500/20 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Request blood
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-xl px-4 py-4 space-y-3 animate-in slide-in-from-top-4 duration-200">
            {/* Multi-language in mobile */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500">Language:</span>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200 text-xs font-bold">
                {(["EN", "हिं", "ਪੰ"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-2.5 py-1 rounded-full ${
                      lang === l ? "bg-white text-slate-900 shadow-xs font-extrabold" : "text-slate-500"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Link
                href="/requests"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <Search className="w-4 h-4 text-slate-500" />
                <span>Find Blood</span>
              </Link>
              <Link
                href="/donate/eligibility"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <HeartHandshake className="w-4 h-4 text-emerald-600" />
                <span>Check Eligibility</span>
              </Link>
              <Link
                href="/register?role=DONOR"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Heart className="w-4 h-4 text-[#E23744]" />
                <span>Register as Donor</span>
              </Link>
              <Link
                href="/inventory"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <Building2 className="w-4 h-4 text-slate-500" />
                <span>Hospitals</span>
              </Link>
              <Link
                href="/#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <HelpCircle className="w-4 h-4 text-slate-500" />
                <span>How It Works</span>
              </Link>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href="/requests"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 bg-[#E23744] text-white font-extrabold text-xs uppercase tracking-wider text-center rounded-xl shadow-md"
              >
                Request Blood Now
              </Link>
              {!user && (
                <Link
                  href="/login"
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    if (onOpenAuth) {
                      e.preventDefault();
                      onOpenAuth();
                    }
                  }}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider text-center rounded-xl transition-colors block"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
