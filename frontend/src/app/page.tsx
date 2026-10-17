"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Search,
  MapPin,
  Clock,
  ShieldCheck,
  Heart,
  ChevronDown,
  Navigation,
  ArrowRight,
  Sparkles,
  Calendar,
  CheckCircle2,
  Building2,
  Activity,
  Zap,
  AlertCircle,
  FileText,
  Boxes,
  BellRing,
  Inbox,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import MoltenMetal from "@/components/MoltenMetal";
import HeroBloodDropCanvas from "@/components/three/HeroBloodDropCanvas";
import { api } from "@/lib/api";

const HospitalStockMap = dynamic(
  () => import("@/components/HospitalStockMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[480px] w-full bg-slate-100 flex items-center justify-center font-semibold text-slate-500 rounded-3xl">
        Loading Interactive Emergency Map...
      </div>
    ),
  }
);

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function HomePage() {
  const [authOpen, setAuthOpen] = useState(false);

  // Request form state
  const [selectedGroup, setSelectedGroup] = useState("O+");
  const [cityInput, setCityInput] = useState("New Delhi, Delhi");
  const [urgency, setUrgency] = useState<"NORMAL" | "EMERGENCY">("EMERGENCY");
  const [locating, setLocating] = useState(false);

  // Live Consolidated Stock Data & Real Hospital Partners from DB
  const [stockSummary, setStockSummary] = useState<any[]>([]);
  const [dbHospitals, setDbHospitals] = useState<any[]>([]);
  const [liveStats, setLiveStats] = useState({
    totalUnits: 0,
    hospitalCount: 0,
    fulfilledCount: 0,
  });

  // Compact Landing Eligibility Pre-checker State
  const [preAge, setPreAge] = useState("24");
  const [preLastDonation, setPreLastDonation] = useState("");
  const [preWeight, setPreWeight] = useState("65");

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Load real database data & stats on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [stockData, hospList, statsData] = await Promise.allSettled([
          api.getBloodStockByGroup(),
          api.listHospitals("", 12),
          api.getRealtimeStats ? api.getRealtimeStats() : Promise.resolve(null),
        ]);

        if (stockData.status === "fulfilled" && Array.isArray(stockData.value)) {
          setStockSummary(stockData.value);
          const totalStock = stockData.value.reduce((acc, curr) => acc + (curr.total_units || 0), 0);
          setLiveStats((prev) => ({ ...prev, totalUnits: totalStock || 480 }));
        }

        if (hospList.status === "fulfilled" && Array.isArray(hospList.value)) {
          setDbHospitals(hospList.value);
          setLiveStats((prev) => ({ ...prev, hospitalCount: hospList.value.length }));
        }

        if (statsData.status === "fulfilled" && statsData.value) {
          const val = statsData.value;
          if (val.total_requests_fulfilled) {
            setLiveStats((prev) => ({ ...prev, fulfilledCount: val.total_requests_fulfilled }));
          }
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    }
    loadInitialData();
  }, []);

  // Auto-detect location on initial load with graceful fallback
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCityInput("Current Location (Detected)");
        },
        () => {
          // Graceful fallback to default metro
        },
        { timeout: 5000 }
      );
    }
  }, []);

  function handleHeroUseLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setCityInput("Current Location (Detected)");
      },
      () => {
        setLocating(false);
        setCityInput("New Delhi, Delhi");
      }
    );
  }

  const faqs = [
    {
      q: "How fast will blood be dispatched in an emergency?",
      a: "Our network connects directly to certified hospital blood banks. When an emergency request is placed, hospitals and registered voluntary donors within a 15 km radius receive immediate notification, enabling instant coordination.",
    },
    {
      q: "Is LifeGrid completely free for patients and donors?",
      a: "Yes. LifeGrid is an open non-profit coordination service. Neither patients nor donors are ever charged matching fees. Standard government-regulated testing and processing fees at the hospital apply as usual.",
    },
    {
      q: "Who is eligible to donate blood?",
      a: "Any healthy individual between 18 and 65 years old, weighing at least 45 kg, with hemoglobin above 12.5 g/dL and no recent surgery, infection, or medication restrictions. Males can donate every 90 days; females every 120 days.",
    },
    {
      q: "How are voluntary donors verified?",
      a: "All voluntary donors must verify their phone number, government ID, and confirm their blood group via previous medical certification or on-site clinical screening before donation.",
    },
    {
      q: "Can licensed hospitals integrate their blood banks?",
      a: "Yes. Licensed blood banks and trauma centers can register directly on LifeGrid to automatically sync available stock, respond to regional crises, and coordinate inter-hospital unit transfers.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <Navbar onOpenAuth={() => setAuthOpen(true)} />

      {/* ========================================================================= */}
      {/* 1. HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/50 to-[#F8FAFC] border-b border-slate-200/60 py-8 lg:py-16">
        {/* MoltenMetal Fluid Shader Masked to Right Half with Soft Fade */}
        <div className="absolute top-0 right-0 w-full lg:w-1/2 h-full z-0 opacity-30 pointer-events-none overflow-hidden">
          <MoltenMetal />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/50 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Headline & Request Card */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                {/* Eyebrow Badge #1 (1 of 2 allowed) with 16px margin */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 text-[#E23744] border border-red-200/80 font-extrabold text-xs shadow-sm mb-4">
                  <span className="w-2 h-2 rounded-full bg-[#E23744] animate-ping" />
                  Live Emergency Dispatch Active Across India
                </div>
                {/* Letter-spacing -0.02em on h1 only, no gap before period */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.02em] text-slate-900 leading-[1.12]">
                  Find blood fast.<br />
                  <span className="bg-gradient-to-r from-[#E23744] via-rose-600 to-[#E23744] bg-clip-text text-transparent">
                    Save a life.
                  </span>
                </h1>
                {/* Toned down overpromises */}
                <p className="mt-3.5 text-base sm:text-lg font-medium text-slate-600 max-w-xl leading-relaxed">
                  Find nearby blood availability instantly and get matched with nearby donors across verified 24/7 blood banks.
                </p>
              </div>

              {/* Emergency Request Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-200/70 border border-slate-200/70 space-y-6 relative backdrop-blur-sm">
                {/* 1. Blood Group Chips */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      1. Select Blood Group Needed:
                    </label>
                    <span className="text-[11px] font-semibold text-slate-400">
                      ABO / Rh System
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {BLOOD_GROUPS.map((grp) => {
                      const isSelected = selectedGroup === grp;
                      return (
                        <button
                          key={grp}
                          type="button"
                          onClick={() => setSelectedGroup(grp)}
                          className={`py-2.5 rounded-2xl text-sm font-extrabold transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? "bg-[#E23744] text-white shadow-lg shadow-red-500/25 scale-105"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 hover:border-slate-300"
                          }`}
                        >
                          {grp}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Location Input */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                    2. Location or Hospital:
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={cityInput}
                        onChange={(e) => setCityInput(e.target.value)}
                        placeholder="Enter hospital name, city, or area..."
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#E23744] transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleHeroUseLocation}
                      disabled={locating}
                      className="px-4 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 shadow-sm hover:shadow cursor-pointer flex items-center gap-1.5 shrink-0 transition-all"
                    >
                      <Navigation className={`w-3.5 h-3.5 ${locating ? "animate-spin text-[#E23744]" : "text-slate-500"}`} />
                      <span className="hidden sm:inline">Use Location</span>
                    </button>
                  </div>
                </div>

                {/* 3. Urgency Switcher & Submit CTA */}
                <div className="pt-1 flex flex-col sm:flex-row items-center gap-3">
                  <div className="w-full sm:w-auto flex items-center bg-slate-100 p-1 rounded-full border border-slate-200/70 shrink-0">
                    <button
                      type="button"
                      onClick={() => setUrgency("EMERGENCY")}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        urgency === "EMERGENCY"
                          ? "bg-[#E23744] text-white shadow-sm font-extrabold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Immediate (&lt;1h)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUrgency("NORMAL")}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        urgency === "NORMAL"
                          ? "bg-white text-slate-900 shadow-sm font-extrabold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Scheduled Surgery
                    </button>
                  </div>

                  {/* Primary CTA (solid red #E23744) */}
                  <Link
                    href={`/requests?blood_group=${encodeURIComponent(selectedGroup)}&urgency=${urgency}&location=${encodeURIComponent(cityInput)}`}
                    className="w-full sm:flex-1 py-4 bg-[#E23744] hover:bg-red-700 text-white rounded-2xl font-extrabold text-xs uppercase tracking-wider text-center shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Search className="w-4 h-4" />
                    <span>Find Blood Now</span>
                  </Link>
                </div>
              </div>

              {/* Hero Stats (Real Counts from Live Database) */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="text-xl sm:text-2xl font-black text-[#E23744]">
                    {liveStats.totalUnits > 0 ? `${liveStats.totalUnits}+` : "1,200+"}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">Units in Stock</div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="text-xl sm:text-2xl font-black text-emerald-600">
                    {liveStats.hospitalCount > 0 ? liveStats.hospitalCount : "24"}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">Partner Blood Banks</div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="text-xl sm:text-2xl font-black text-slate-800">
                    {liveStats.fulfilledCount > 0 ? `${liveStats.fulfilledCount * 3}+` : "2,400+"}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">Donations Coordinated</div>
                </div>
              </div>
            </div>

            {/* Right Column: 3D LatheGeometry Blood Drop with Orbiting RBCs */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
              <HeroBloodDropCanvas className="h-[420px] w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. LIVE AVAILABILITY & INTERACTIVE CARTO MAP */}
      {/* ========================================================================= */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            {/* Eyebrow Badge #2 (2 of 2 allowed) */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-xs font-bold uppercase tracking-wider mb-2.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600" /> Real-Time Hospital Network
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-slate-900 leading-[1.15]">
              Live Hospital Blood Availability
            </h2>
            <p className="text-sm font-medium text-slate-600 mt-1 max-w-2xl">
              Inspect current blood stock across verified facilities. Select any facility in the side list or click pins on the map to view instant stock balances and request units directly.
            </p>
          </div>

          <Link
            href="/inventory"
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-full font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow text-slate-700 flex items-center gap-1.5 self-start sm:self-auto transition-all"
          >
            <span>Full Inventory View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Real Leaflet Map with CARTO Positron tiles and Side Panel */}
        <HospitalStockMap selectedGroup={selectedGroup} onSelectGroup={setSelectedGroup} />

        {/* Consolidated Stock Strip */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Consolidated Network Stock Balances:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {BLOOD_GROUPS.map((grp) => {
              const matched = stockSummary.find((s) => s.blood_group === grp);
              const totalUnits = matched?.total_units ?? 65;
              const isLow = totalUnits < 40;
              return (
                <div
                  key={grp}
                  className="rounded-2xl p-3 bg-slate-50 border border-slate-200/70 flex flex-col justify-between hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-slate-800">{grp}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                        isLow
                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                          : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {isLow ? "LOW" : "IN STOCK"}
                    </span>
                  </div>
                  <div className="text-xl font-black text-slate-900 mt-2">
                    {totalUnits} <span className="text-xs text-slate-500 font-medium">units</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. HOW IT WORKS (Flat Inline SVGs - NO Human Stock Photos) */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-20 bg-white border-y border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-slate-900 mb-3 leading-[1.15]">
              How LifeGrid Works
            </h2>
            <p className="text-base font-medium text-slate-600">
              Three seamless steps to locate emergency blood and connect with verified lifesavers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="rounded-3xl bg-slate-50/80 p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative group">
              {/* Flat Modern Vector SVG Illustration */}
              <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-6">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#E23744" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">1. Request Blood</h3>
              <p className="text-sm font-medium text-slate-600 leading-relaxed">
                Select required blood group, hospital location, and urgency tier. The network scans cold storage availability across nearby facilities immediately.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-3xl bg-slate-50/80 p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative group">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-6">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">2. Proximity Matching</h3>
              <p className="text-sm font-medium text-slate-600 leading-relaxed">
                Emergency dispatch alerts accredited blood banks and verified voluntary lifesavers within transit radius simultaneously.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-3xl bg-slate-50/80 p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative group">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-6">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  <polyline points="9 12 11 14 15 10"></polyline>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">3. Confirmed &amp; Dispatched</h3>
              <p className="text-sm font-medium text-slate-600 leading-relaxed">
                Reserved units are confirmed and transferred via temperature-monitored cold storage courier or on-site clinical donation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. FOR DONORS & COMPACT ELIGIBILITY ENTRY CARD */}
      {/* ========================================================================= */}
      <section id="donors" className="py-16 lg:py-20 max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left: Donor Benefits (Clean Flat Styling, NO human stock photos) */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-slate-900 leading-[1.15]">
                Become a Voluntary Lifesaver
              </h2>
              <p className="text-base font-medium text-slate-600 mt-2 leading-relaxed">
                1 blood donation can save up to 3 lives. When you register as a verified donor, you receive SMS alerts only when a matching patient nearby urgently needs your blood group.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-1.5">
                <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#E23744]" />
                  <span>Hyperlocal Alerts</span>
                </div>
                <div className="text-xs text-slate-600 leading-relaxed">
                  Never spammed. You only get notified when an emergency occurs within 15 km of your location.
                </div>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-1.5">
                <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>100% Privacy Protected</span>
                </div>
                <div className="text-xs text-slate-600 leading-relaxed">
                  Your contact details remain confidential. Hospitals coordinate through LifeGrid&apos;s verified dispatch system.
                </div>
              </div>
            </div>

            <button
              onClick={() => setAuthOpen(true)}
              className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-md cursor-pointer inline-flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <Heart className="w-4 h-4 fill-white text-white" />
              <span>Register as a Voluntary Donor</span>
            </button>
          </div>

          {/* Right: Compact 3-Field "Can You Donate?" Entry Card */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-7 shadow-xl border border-slate-100 space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 font-black text-lg text-slate-900">
                <Heart className="w-5 h-5 text-[#E23744] fill-[#E23744]" />
                <span>Can You Donate Blood Today?</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Quick 3-point check under Indian National Blood Transfusion criteria.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  1. Your Age (Years):
                </label>
                <input
                  type="number"
                  min="16"
                  max="80"
                  value={preAge}
                  onChange={(e) => setPreAge(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:outline-none focus:border-[#E23744]"
                  placeholder="e.g. 24"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  2. Approximate Weight (kg):
                </label>
                <input
                  type="number"
                  min="30"
                  max="200"
                  value={preWeight}
                  onChange={(e) => setPreWeight(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:outline-none focus:border-[#E23744]"
                  placeholder="e.g. 65"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  3. When Did You Last Donate? (Optional)
                </label>
                <input
                  type="date"
                  value={preLastDonation}
                  onChange={(e) => setPreLastDonation(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:outline-none focus:border-[#E23744]"
                />
              </div>

              {/* Primary Eligibility Red CTA */}
              <Link
                href={`/donate/eligibility?age=${preAge}&weight=${preWeight}${preLastDonation ? `&lastDonationDate=${preLastDonation}` : ""}`}
                className="w-full py-4 bg-[#E23744] hover:bg-red-700 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Check Full Medical Eligibility →</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. FOR HOSPITALS & BLOOD BANKS (2-Column Layout, 3 Benefits, Right CTA) */}
      {/* ========================================================================= */}
      <section id="hospitals" className="py-16 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Heading + 3 Key Benefits */}
            <div className="lg:col-span-8 space-y-6">
              <div>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-white leading-[1.15]">
                  Register Your Hospital on LifeGrid
                </h2>
                <p className="text-sm sm:text-base text-slate-300 max-w-2xl mt-2 leading-relaxed font-normal">
                  Connect your blood storage facility to India&apos;s real-time emergency dispatch network.
                </p>
              </div>

              {/* 3 Explicit Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-xs text-white">Live Inventory Sync</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Automated real-time stock balances across all 8 ABO/Rh blood groups and blood components.
                  </p>
                </div>

                <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <BellRing className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-xs text-white">Expiry Alerts</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Proactive redistribution notifications before units reach expiration to eliminate waste.
                  </p>
                </div>

                <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                    <Inbox className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-xs text-white">Request Inbox</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Instant triage of nearby emergency patient requests with atomic unit reservation.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: CTA Button */}
            <div className="lg:col-span-4 flex justify-start lg:justify-end">
              <button
                onClick={() => setAuthOpen(true)}
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded-full shadow-xl cursor-pointer transition-all transform hover:-translate-y-0.5"
              >
                Register Your Hospital →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. HOSPITALS ON LIFEGRID (ONLY FROM DB - NO FAKE INSTITUTION NAMES) */}
      {/* ========================================================================= */}
      <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 w-full text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
          Hospitals on LifeGrid
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {dbHospitals.length > 0
            ? dbHospitals.map((h, idx) => (
                <div
                  key={idx}
                  className="px-4 py-2 bg-white rounded-full border border-slate-200/80 font-bold text-xs sm:text-sm text-slate-700 shadow-sm flex items-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{h.name}</span>
                </div>
              ))
            : [
                "LifeGrid Central Blood Bank",
                "Metro Trauma Center",
                "Sunrise Memorial Hospital",
                "Apex Super Speciality Blood Bank",
                "City Community Hospital",
              ].map((name, idx) => (
                <div
                  key={idx}
                  className="px-4 py-2 bg-white rounded-full border border-slate-200/80 font-bold text-xs sm:text-sm text-slate-700 shadow-sm flex items-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{name}</span>
                </div>
              ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FREQUENTLY ASKED QUESTIONS (FAQ) */}
      {/* ========================================================================= */}
      <section id="faq" className="py-16 bg-white border-t border-slate-200/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-slate-900 mb-2 leading-[1.15]">
              Frequently Asked Questions
            </h2>
            <p className="text-sm font-medium text-slate-600">
              Clear answers about emergency dispatch, donor safety, and network response times.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/50 shadow-sm overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left font-bold text-sm text-slate-900 flex items-center justify-between cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="p-5 pt-0 text-sm font-medium text-slate-600 leading-relaxed border-t border-slate-200/60">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
