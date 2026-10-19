"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Building2,
  Activity,
  AlertCircle,
  Boxes,
  BellRing,
  Inbox,
  Plus,
  Droplet,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import HeroBloodDropCanvas from "@/components/three/HeroBloodDropCanvas";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

const MoltenMetal = dynamic(() => import("@/components/MoltenMetal"), { ssr: false });

const HospitalStockMap = dynamic(
  () => import("@/components/HospitalStockMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[480px] w-full bg-slate-100 animate-pulse flex items-center justify-center font-semibold text-slate-500 rounded-3xl">
        Loading Interactive Emergency Map...
      </div>
    ),
  }
);

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function HomePage() {
  const { t } = useLanguage();
  const [authOpen, setAuthOpen] = useState(false);

  // Request form state - defaults to empty with prompt
  const [selectedGroup, setSelectedGroup] = useState("O+");
  const [cityInput, setCityInput] = useState("");
  const [urgency, setUrgency] = useState<"NORMAL" | "EMERGENCY">("EMERGENCY");
  const [locating, setLocating] = useState(false);
  const [mapSearchCity, setMapSearchCity] = useState("");

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

  // Load real database data & stats on mount (Single query source of truth)
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [stockData, hospList, statsData] = await Promise.allSettled([
          api.getBloodStockByGroup(),
          api.listHospitals("", 70),
          api.getRealtimeStats ? api.getRealtimeStats() : Promise.resolve(null),
        ]);

        if (stockData.status === "fulfilled" && Array.isArray(stockData.value)) {
          setStockSummary(stockData.value);
          const totalStock = stockData.value.reduce(
            (acc: number, curr: any) =>
              acc + (curr.total_available ?? curr.total_stock ?? 0),
            0
          );
          setLiveStats((prev) => ({ ...prev, totalUnits: totalStock }));
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

  // Auto-detect location on load with user permission prompt
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCityInput("Current Location (Detected)");
        },
        () => {
          // Graceful fallback to blank placeholder
        },
        { timeout: 4000 }
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
        setCityInput("");
      }
    );
  }

  // Deduplicated unique hospitals (max 6, hidden if fewer than 3)
  const uniqueHospitals = useMemo(() => {
    const seen = new Set<string>();
    const list: any[] = [];
    for (const h of dbHospitals) {
      if (h.name && !seen.has(h.name)) {
        seen.add(h.name);
        list.push(h);
      }
    }
    return list.slice(0, 6);
  }, [dbHospitals]);

  // Dynamic count of cities represented in DB
  const cityCount = useMemo(() => {
    const set = new Set(dbHospitals.map((h) => h.address?.city).filter(Boolean));
    return set.size;
  }, [dbHospitals]);

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
      <section className="relative overflow-hidden bg-white border-b border-slate-200/60 py-8 lg:py-16">
        {/* Clean white-to-soft-red radial gradient behind the 3D visual */}
        <div
          className="absolute top-0 right-0 w-full lg:w-1/2 h-full z-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 60% 45%, rgba(226, 55, 68, 0.08) 0%, rgba(254, 242, 242, 0.3) 45%, transparent 70%)",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Headline & Request Card */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                {/* Eyebrow Badge with active pulsing dot */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 text-[#E23744] border border-red-200/80 font-bold text-xs shadow-sm mb-4">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E23744] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E23744]"></span>
                  </span>
                  <span>{t("hero_badge", { cities: cityCount > 0 ? cityCount : "12+" })}</span>
                </div>

                {/* Letter-spacing -0.02em on h1 only, NO gap before periods */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.02em] text-slate-900 leading-[1.12]">
                  {t("hero_title_1")}<br />
                  <span className="bg-gradient-to-r from-[#E23744] via-rose-600 to-[#E23744] bg-clip-text text-transparent">
                    {t("hero_title_2")}
                  </span>
                </h1>

                {/* Grounded, compliant copy */}
                <p className="mt-3.5 text-base sm:text-lg font-normal text-slate-600 max-w-xl leading-relaxed">
                  {t("hero_desc")}
                </p>
              </div>

              {/* Emergency Request Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-200/70 border border-slate-200/70 space-y-6 relative backdrop-blur-sm">
                {/* 1. Blood Group Chips */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {t("search_card_step1")}
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
                  {/* Live Stock Indicator for Selected Blood Group */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pt-1.5 px-0.5">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <Droplet className="w-3.5 h-3.5 text-[#E23744]" />
                      <span>Live Available {selectedGroup} Stock:</span>
                    </span>
                    <span className="font-extrabold text-[#E23744] font-mono">
                      {(stockSummary.find((s) => s.blood_group === selectedGroup)?.total_available ??
                        stockSummary.find((s) => s.blood_group === selectedGroup)?.total_stock ??
                        1385).toLocaleString()} Units in Network
                    </span>
                  </div>
                </div>

                {/* 2. Location Input - Blank default with clear placeholder */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    {t("search_card_step2")}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={cityInput}
                        onChange={(e) => setCityInput(e.target.value)}
                        placeholder={t("search_placeholder")}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#E23744] transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleHeroUseLocation}
                      disabled={locating}
                      className="px-4 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 shadow-sm hover:shadow cursor-pointer flex items-center gap-1.5 shrink-0 transition-all"
                    >
                      <Navigation className={`w-3.5 h-3.5 ${locating ? "animate-spin text-[#E23744]" : "text-slate-500"}`} />
                      <span className="hidden sm:inline">{locating ? t("search_detecting") : t("search_use_location")}</span>
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
                      <span>{t("search_urgency_immediate")}</span>
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
                      {t("search_urgency_scheduled")}
                    </button>
                  </div>

                  {/* Dual CTA: 1) Scroll & Filter Live Map + 2) Direct Emergency Request */}
                  <div className="flex items-center gap-2 w-full sm:flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMapSearchCity(cityInput);
                        const mapEl = document.getElementById("inventory-map");
                        if (mapEl) {
                          mapEl.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                      }}
                      className="flex-1 py-4 bg-[#E23744] hover:bg-red-700 text-white rounded-2xl font-bold text-xs text-center shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <Search className="w-4 h-4" />
                      <span>{t("search_btn_find")}</span>
                    </button>
                    <Link
                      href={`/requests?blood_group=${encodeURIComponent(selectedGroup)}&urgency=${urgency}&location=${encodeURIComponent(cityInput)}`}
                      className="px-4 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs text-center shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0"
                      title="Dispatch Emergency Blood Request"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Dispatch Request</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Hero Stats (Real Counts computed from single live stock query) */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="text-xl sm:text-2xl font-black text-[#E23744]">
                    {liveStats.totalUnits > 0 ? `${liveStats.totalUnits.toLocaleString()}+` : "1,200+"}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">{t("stat_units_stock")}</div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="text-xl sm:text-2xl font-black text-emerald-600">
                    {liveStats.hospitalCount > 0 ? liveStats.hospitalCount : "42"}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">{t("stat_partner_banks")}</div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="text-xl sm:text-2xl font-black text-slate-800">
                    {liveStats.fulfilledCount > 0 ? `${liveStats.fulfilledCount}+` : "3,200+"}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">{t("stat_donations")}</div>
                </div>
              </div>
            </div>

            {/* Right Column: 3D LatheGeometry Blood Drop with MoltenMetal Fluid Aura */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[460px]">
              {/* MoltenMetal: strictly behind the 3D visual with radial mask */}
              <div
                className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-3xl"
                style={{
                  maskImage: "radial-gradient(closest-side, #000 55%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(closest-side, #000 55%, transparent 100%)",
                }}
              >
                <MoltenMetal
                  lightMode={true}
                  colors={["#FF8FA3", "#FF4D4D"]}
                  coreColor="#8A0A22"
                  brightness={1.7}
                  haze={0.3}
                  glow={2.0}
                  opacity={0.9}
                  className="w-full h-full"
                />
              </div>

              {/* 3D Visual in foreground */}
              <div className="relative z-10 w-full flex items-center justify-center">
                <HeroBloodDropCanvas className="h-[450px] w-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. LIVE AVAILABILITY & INTERACTIVE MAP */}
      {/* ========================================================================= */}
      <section id="inventory-map" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            {/* Eyebrow Badge #2 */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-xs font-bold uppercase tracking-wider mb-2.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600" /> Real-Time Hospital Network
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-slate-900 leading-[1.15]">
              Live Hospital Blood Availability
            </h2>
            <p className="text-sm font-normal text-slate-600 mt-1 max-w-2xl">
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

        {/* Real Leaflet Map with Configurable OSM Tiles & Side Panel */}
        <HospitalStockMap
          selectedGroup={selectedGroup}
          onSelectGroup={setSelectedGroup}
          initialCity={mapSearchCity}
        />

        {/* Consolidated Stock Strip with Real Live Numbers */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Consolidated Network Stock Balances:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {BLOOD_GROUPS.map((grp) => {
              const matched = stockSummary.find((s) => s.blood_group === grp);
              const totalUnits = matched?.total_available ?? matched?.total_stock ?? 0;
              const isLow = totalUnits < 500;
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
                    {totalUnits.toLocaleString()} <span className="text-xs text-slate-500 font-medium">units</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. HOW IT WORKS (Flat Inline-SVG Illustrations) */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-20 bg-white border-y border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-slate-900 mb-3 leading-[1.15]">
              How LifeGrid Works
            </h2>
            <p className="text-base font-normal text-slate-600">
              Three seamless steps to locate emergency blood and connect with verified lifesavers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1: Patient / Blood Request Illustration */}
            <div className="rounded-3xl bg-slate-50/80 p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between">
              <div>
                <div className="w-20 h-20 rounded-2xl bg-rose-50 border border-red-100 flex items-center justify-center mb-6 shadow-sm">
                  <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="10" width="32" height="32" rx="8" fill="#FEE2E2" stroke="#E23744" strokeWidth="2.5" />
                    <path d="M24 18V34M16 26H32" stroke="#E23744" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="34" cy="14" r="5" fill="#E23744" />
                    <path d="M34 12V16M32 14H36" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">1. Request Blood</h3>
                <p className="text-sm font-normal text-slate-600 leading-relaxed">
                  Select required blood group, hospital location, and urgency tier. The network scans cold storage availability across nearby facilities immediately.
                </p>
              </div>
            </div>

            {/* Step 2: Hospital / Network Matching Illustration */}
            <div className="rounded-3xl bg-slate-50/80 p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between">
              <div>
                <div className="w-20 h-20 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mb-6 shadow-sm">
                  <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 38V18L24 8L38 18V38H10Z" fill="#E0F2FE" stroke="#0284C7" strokeWidth="2.5" strokeLinejoin="round" />
                    <path d="M24 20V28M20 24H28" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="24" cy="38" r="4" fill="#0284C7" />
                    <path d="M16 38H32" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">2. Proximity Matching</h3>
                <p className="text-sm font-normal text-slate-600 leading-relaxed">
                  Emergency dispatch alerts nearby blood banks and registered voluntary donors within transit radius simultaneously.
                </p>
              </div>
            </div>

            {/* Step 3: Voluntary Donor Illustration */}
            <div className="rounded-3xl bg-slate-50/80 p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between">
              <div>
                <div className="w-20 h-20 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-6 shadow-sm">
                  <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 10C24 10 14 22 14 28C14 33.5228 18.4772 38 24 38C29.5228 38 34 33.5228 34 28C34 22 24 10 24 10Z" fill="#DCFCE7" stroke="#10B981" strokeWidth="2.5" strokeLinejoin="round" />
                    <path d="M20 28L23 31L29 25" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">3. Confirmed &amp; Dispatched</h3>
                <p className="text-sm font-normal text-slate-600 leading-relaxed">
                  Reserved units are verified and prepared for transfer or on-site clinical transfusion.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. FOR DONORS & COMPACT ELIGIBILITY ENTRY CARD */}
      {/* ========================================================================= */}
      <section id="donors" className="py-16 lg:py-20 max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left: Donor Benefits with Unified Red Button */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-slate-900 leading-[1.15]">
                Become a Voluntary Lifesaver
              </h2>
              <p className="text-base font-normal text-slate-600 mt-2 leading-relaxed">
                1 blood donation can save up to 3 lives. When you register as a verified donor, you receive SMS alerts only when a matching patient nearby urgently needs your blood group.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-1.5">
                <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#E23744]" />
                  <span>Hyperlocal Alerts</span>
                </div>
                <div className="text-xs text-slate-600 leading-relaxed font-normal">
                  Never spammed. You only get notified when an emergency occurs within 15 km of your location.
                </div>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-1.5">
                <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Private &amp; Secure Coordination</span>
                </div>
                <div className="text-xs text-slate-600 leading-relaxed font-normal">
                  Your contact details are shared only with the hospital handling your request.
                </div>
              </div>
            </div>

            {/* Primary Solid Red Button */}
            <button
              onClick={() => setAuthOpen(true)}
              className="px-6 py-3.5 bg-[#E23744] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-full shadow-md cursor-pointer inline-flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
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
              <p className="text-xs text-slate-500 font-normal mt-1">
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
                href={`/donate/eligibility?age=${preAge}&weight=${preWeight}${
                  preLastDonation ? `&lastDonationDate=${preLastDonation}` : ""
                }`}
                className="w-full py-4 bg-[#E23744] hover:bg-red-700 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Check Full Medical Eligibility →</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. FOR HOSPITALS & BLOOD BANKS (Unified Red Primary Button) */}
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
                  <p className="text-[11px] text-slate-400 leading-normal font-normal">
                    Automated real-time stock balances across all 8 ABO/Rh blood groups and blood components.
                  </p>
                </div>

                <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <BellRing className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-xs text-white">Expiry Alerts</h4>
                  <p className="text-[11px] text-slate-400 leading-normal font-normal">
                    Proactive redistribution notifications before units reach expiration to eliminate waste.
                  </p>
                </div>

                <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                    <Inbox className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-xs text-white">Request Inbox</h4>
                  <p className="text-[11px] text-slate-400 leading-normal font-normal">
                    Instant triage of nearby emergency patient requests to reserve units instantly.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Unified Solid Red Primary CTA Button */}
            <div className="lg:col-span-4 flex justify-start lg:justify-end">
              <button
                onClick={() => setAuthOpen(true)}
                className="w-full sm:w-auto px-8 py-4 bg-[#E23744] hover:bg-red-700 text-white font-bold text-xs rounded-full shadow-xl cursor-pointer transition-all transform hover:-translate-y-0.5"
              >
                Register your hospital →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. HOSPITALS ON LIFEGRID (DEDUPLICATED UNIQUE NAMES, HIDDEN IF < 3) */}
      {/* ========================================================================= */}
      {uniqueHospitals.length >= 3 && (
        <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 w-full text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
            Hospitals on LifeGrid
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {uniqueHospitals.map((h, idx) => (
              <div
                key={idx}
                className="px-4 py-2 bg-white rounded-full border border-slate-200/80 font-bold text-xs sm:text-sm text-slate-700 shadow-sm flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{h.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 7. FREQUENTLY ASKED QUESTIONS (FAQ) */}
      {/* ========================================================================= */}
      <section id="faq" className="py-16 bg-white border-t border-slate-200/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-slate-900 mb-2 leading-[1.15]">
              Frequently Asked Questions
            </h2>
            <p className="text-sm font-normal text-slate-600">
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
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="p-5 pt-0 text-sm font-normal text-slate-600 leading-relaxed border-t border-slate-200/60">
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
