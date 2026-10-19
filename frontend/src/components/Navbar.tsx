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
import { useLanguage, SUPPORTED_LANGUAGES, SupportedLanguage } from "@/lib/i18n";

interface NavbarProps {
  onOpenAuth?: () => void;
}

export default function Navbar({ onOpenAuth }: NavbarProps) {
  const pathname = usePathname();
  const { user, logout, loadSession } = useAuthStore();
  const { alerts, addAlert } = useLiveStore();
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [donateDropdownOpen, setDonateDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

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

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDonateDropdownOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
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
                {t("nav_brand_subtitle")}
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
                <span>{t("nav_find_blood")}</span>
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
                  <span>{t("nav_donate")}</span>
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
                        <div>{t("nav_check_eligibility")}</div>
                        <div className="text-[10px] font-normal text-slate-400">
                          {t("nav_eligibility_sub")}
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
                        <div>{t("nav_register_donor")}</div>
                        <div className="text-[10px] font-normal text-slate-400">
                          {t("nav_donor_sub")}
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
                <span>{t("nav_hospitals")}</span>
              </Link>

              <Link
                href="/#how-it-works"
                className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all"
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>{t("nav_how_it_works")}</span>
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

          {/* Desktop Right Actions: 5-Language Switcher + Auth / Emergency CTAs */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* 5-Language Switcher Dropdown */}
            <div className="relative" ref={langRef}>
              <button
                type="button"
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-xs"
                title="Switch Language"
              >
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>{SUPPORTED_LANGUAGES.find((l) => l.code === language)?.native || "English"}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${langDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                    Select Language
                  </div>
                  {SUPPORTED_LANGUAGES.map((l) => {
                    const isSelected = language === l.code;
                    return (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => {
                          setLanguage(l.code);
                          setLangDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-colors cursor-pointer text-left ${
                          isSelected
                            ? "bg-rose-50 text-[#E23744] font-bold"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{l.flag}</span>
                          <span>{l.native}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">{l.code}</span>
                      </button>
                    );
                  })}
                </div>
              )}
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
                  {t("nav_sign_in")}
                </Link>
                <Link
                  href="/requests"
                  className="px-4 py-2 bg-[#E23744] hover:bg-red-700 text-white font-bold text-xs rounded-full shadow-md shadow-red-500/20 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  {t("nav_request_blood")}
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
            {/* 5-Language Selector in Mobile */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                Language:
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {SUPPORTED_LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLanguage(l.code)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                      language === l.code
                        ? "bg-[#E23744] text-white shadow-xs font-extrabold"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    {l.native}
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
