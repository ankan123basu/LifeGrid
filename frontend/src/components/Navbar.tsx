"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore, useLiveStore } from "@/lib/store";
import { socketClient } from "@/lib/socket";
import {
  Search,
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
    { href: "/#donors", label: "Donate", icon: HeartHandshake },
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
      <header className="sticky top-0 z-50 bg-[#F4F1EA] border-b-[3px] border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          {/* Consumer Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-[#FF4D4D] border-[3px] border-black shadow-[3px_3px_0px_#000] flex items-center justify-center font-black text-white text-2xl group-hover:-translate-y-0.5 transition-transform">
              ✚
            </div>
            <div className="flex flex-col">
              <span className="font-black text-2xl tracking-tight leading-none text-black">
                LifeGrid
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-600">
                Blood &amp; Emergency Network
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {currentLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3.5 py-2 font-bold text-sm border-2 transition-all ${
                    isActive
                      ? "bg-[#FFE600] border-black shadow-[3px_3px_0px_#000] -translate-y-0.5"
                      : "border-transparent hover:border-black hover:bg-white"
                  }`}
                >
                  <Icon className="w-4 h-4 text-black" />
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
                  className="relative p-2.5 bg-white border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#FFE600] transition-colors cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4 text-black" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#FF4D4D] border-2 border-black rounded-full text-white font-mono text-[10px] font-black flex items-center justify-center">
                      {unreadNotifications}
                    </span>
                  )}
                </Link>

                {/* Avatar Menu */}
                <div className="relative">
                  <button
                    onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                    className="flex items-center gap-2 bg-white px-3 py-1.5 border-2 border-black shadow-[3px_3px_0px_#000] hover:bg-neutral-50 cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#7CD4FF] border border-black flex items-center justify-center font-black text-xs">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left text-xs font-bold leading-tight">
                      <div className="truncate max-w-[100px]">{user.name}</div>
                      <div className="text-[10px] text-neutral-500 font-mono capitalize">
                        {user.role.toLowerCase()}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-600" />
                  </button>

                  {/* Dropdown Drawer */}
                  {avatarMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border-3 border-black shadow-[4px_4px_0px_#000] py-1 z-50">
                      <div className="px-4 py-2 border-b-2 border-black bg-[#F4F1EA]">
                        <p className="text-xs font-black truncate">{user.name}</p>
                        <p className="text-[10px] font-mono text-neutral-600 truncate">{user.email}</p>
                      </div>
                      <Link
                        href="/requests"
                        onClick={() => setAvatarMenuOpen(false)}
                        className="block px-4 py-2 text-xs font-bold hover:bg-[#FFE600] transition-colors"
                      >
                        My Requests
                      </Link>
                      <Link
                        href="/inventory"
                        onClick={() => setAvatarMenuOpen(false)}
                        className="block px-4 py-2 text-xs font-bold hover:bg-[#FFE600] transition-colors"
                      >
                        Inventory &amp; Donors
                      </Link>
                      <button
                        onClick={() => {
                          setAvatarMenuOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-black text-[#FF4D4D] hover:bg-[#FF4D4D] hover:text-white transition-colors border-t border-neutral-200 flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Log Out
                      </button>
                    </div>
                  )}
                </div>

                {/* Primary CTA */}
                <Link
                  href="/requests"
                  className="px-5 py-2.5 bg-[#FF4D4D] text-white hover:bg-red-600 border-[3px] border-black font-black text-sm uppercase tracking-wide shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                >
                  Request Blood
                </Link>
              </div>
            ) : (
              /* Logged Out State */
              <div className="flex items-center gap-3">
                <button
                  onClick={onOpenAuth}
                  className="px-4 py-2 bg-white hover:bg-[#FFE600] border-2 border-black font-bold text-sm shadow-[2px_2px_0px_#000] cursor-pointer transition-all"
                >
                  Log In
                </button>
                <Link
                  href="/requests"
                  className="px-5 py-2.5 bg-[#FF4D4D] text-white hover:bg-red-600 border-[3px] border-black font-black text-sm uppercase tracking-wide shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
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
              className="p-2 bg-white border-2 border-black shadow-[2px_2px_0px_#000] cursor-pointer"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t-2 border-black bg-[#F4F1EA] p-4 space-y-3">
            <nav className="flex flex-col gap-2">
              {currentLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 bg-white border-2 border-black font-bold text-sm shadow-[2px_2px_0px_#000]"
                  >
                    <Icon className="w-4 h-4 text-black" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-2 border-t-2 border-black space-y-2">
              {user ? (
                <>
                  <div className="p-3 bg-white border-2 border-black flex items-center justify-between">
                    <div>
                      <div className="font-black text-sm">{user.name}</div>
                      <div className="text-[10px] font-mono text-neutral-500 capitalize">{user.role.toLowerCase()}</div>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="px-3 py-1 bg-[#FF4D4D] text-white text-xs font-bold border border-black"
                    >
                      Log Out
                    </button>
                  </div>
                  <Link
                    href="/requests"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center w-full py-3 bg-[#FF4D4D] text-white border-3 border-black font-black uppercase text-sm shadow-[3px_3px_0px_#000]"
                  >
                    Request Blood Now
                  </Link>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuth?.();
                    }}
                    className="w-full py-2.5 bg-white border-2 border-black font-bold text-sm shadow-[2px_2px_0px_#000]"
                  >
                    Log In
                  </button>
                  <Link
                    href="/requests"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center w-full py-3 bg-[#FF4D4D] text-white border-3 border-black font-black uppercase text-sm shadow-[3px_3px_0px_#000]"
                  >
                    Request Blood Now
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Mobile Sticky Bottom Emergency Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-white border-t-[3px] border-black shadow-[0_-4px_0px_0px_rgba(0,0,0,0.1)] flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono font-bold uppercase text-red-600 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block" /> Need Blood Urgently?
          </span>
          <span className="text-xs font-black text-black">Average match: 4 mins</span>
        </div>
        <Link
          href="/requests"
          className="px-5 py-2 bg-[#FF4D4D] text-white border-2 border-black font-black text-xs uppercase shadow-[2px_2px_0px_#000]"
        >
          Request Now
        </Link>
      </div>
    </>
  );
}
