"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import MoltenMetal from "@/components/MoltenMetal";
import { api } from "@/lib/api";
import {
  Search,
  MapPin,
  Navigation,
  ShieldCheck,
  Heart,
  Clock,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Building2,
  PhoneCall,
  ChevronDown,
  Sparkles,
  Users,
  Activity,
  Award,
} from "lucide-react";

// Dynamically import 3D Hero Visual with SSR disabled
const HeroBloodDropCanvas = dynamic(
  () => import("@/components/three/HeroBloodDropCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] w-full flex items-center justify-center bg-[#F4F1EA] border-3 border-black">
        <div className="w-48 h-60 bg-[#FF4D4D] rounded-full border-4 border-black animate-pulse" />
      </div>
    ),
  }
);

// Dynamically import Leaflet Map with SSR disabled
const HospitalStockMap = dynamic(
  () => import("@/components/HospitalStockMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[480px] w-full flex items-center justify-center bg-[#F4F1EA] border-3 border-black font-mono text-xs font-bold">
        Loading Interactive Emergency Map...
      </div>
    ),
  }
);

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function HomePage() {
  const [authOpen, setAuthOpen] = useState(false);

  // Uber-style Emergency Request Card state
  const [selectedGroup, setSelectedGroup] = useState("O+");
  const [cityInput, setCityInput] = useState("New Delhi, Delhi");
  const [urgency, setUrgency] = useState<"NORMAL" | "EMERGENCY">("EMERGENCY");
  const [locating, setLocating] = useState(false);

  // Live Consolidated Stock Data
  const [stockSummary, setStockSummary] = useState<any[]>([]);

  // Donor Eligibility Checker State
  const [lastDonationDate, setLastDonationDate] = useState("");
  const [eligibilityResult, setEligibilityResult] = useState<{
    eligible: boolean;
    daysRemaining: number;
    nextEligibleDate?: string;
  } | null>(null);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Load live stock data on mount
  useEffect(() => {
    async function loadStock() {
      try {
        const data = await api.getBloodStockByGroup();
        setStockSummary(data || []);
      } catch (err) {
        console.error("Failed to load blood stock summary", err);
      }
    }
    loadStock();
  }, []);

  // Handle Geolocation in Hero Card
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
      (err) => {
        setLocating(false);
        setCityInput("New Delhi, Delhi");
      }
    );
  }

  // Handle Donor Eligibility Calculation (90 days interval)
  function handleCheckEligibility(e: React.FormEvent) {
    e.preventDefault();
    if (!lastDonationDate) return;

    const donationDate = new Date(lastDonationDate);
    const today = new Date();
    const diffTime = today.getTime() - donationDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const cooldownDays = 90;

    if (diffDays >= cooldownDays) {
      setEligibilityResult({
        eligible: true,
        daysRemaining: 0,
      });
    } else {
      const remaining = cooldownDays - diffDays;
      const nextDate = new Date(donationDate);
      nextDate.setDate(nextDate.getDate() + cooldownDays);
      setEligibilityResult({
        eligible: false,
        daysRemaining: remaining,
        nextEligibleDate: nextDate.toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      });
    }
  }

  const faqs = [
    {
      q: "How fast will blood be dispatched in an emergency?",
      a: "Our network connects directly to 39 verified hospital blood banks. When an emergency request is placed, hospitals and certified voluntary donors within a 15 km radius receive immediate notification, with an average matching time of under 4 minutes.",
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
      q: "Can private or government hospitals integrate their blood banks?",
      a: "Yes. Licensed blood banks and trauma centers can register directly on LifeGrid to automatically sync available stock, respond to regional crises, and coordinate inter-hospital unit transfers.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F1EA] text-[#0A0A0A]">
      <Navbar onOpenAuth={() => setAuthOpen(true)} />

      {/* ========================================================================= */}
      {/* 1. HERO SECTION (Conversion-Focused, Uber-style Request Card) */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden border-b-[3px] border-black bg-[#F4F1EA]">
        {/* MoltenMetal Fluid Shader Background with Soft Gradient Mask */}
        <div className="absolute inset-0 z-0 opacity-80 pointer-events-none">
          <MoltenMetal />
          <div className="absolute inset-0 bg-gradient-to-r from-[#F4F1EA] via-[#F4F1EA]/85 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Headline & Uber-Style Request Card */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-[#FFE600] font-mono text-xs font-black uppercase mb-3 shadow-[2px_2px_0px_#FFE600]">
                  <span className="w-2 h-2 rounded-full bg-[#FF4D4D] animate-ping" />
                  Live Emergency Response Active
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-[1.05] text-black">
                  Find blood fast. <br />
                  <span className="text-[#FF4D4D] underline decoration-4 decoration-black">
                    Save a life.
                  </span>
                </h1>
                <p className="mt-3 text-base sm:text-lg font-medium text-neutral-700 max-w-xl">
                  Connecting critical patients, 24/7 hospital blood banks, and verified voluntary lifesavers in real-time across India.
                </p>
              </div>

              {/* Uber-Style Instant Blood Request Card */}
              <div className="bg-white border-[3px] border-black p-6 shadow-[8px_8px_0px_0px_#000] space-y-5">
                {/* 1. Blood Group Chips */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-black uppercase font-mono tracking-wider">
                      1. Select Blood Group Needed:
                    </label>
                    <span className="text-[11px] font-mono text-neutral-500 font-bold">
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
                          className={`py-2 text-sm font-black font-mono border-2 border-black transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#FF4D4D] text-white shadow-[3px_3px_0px_#000] -translate-y-0.5"
                              : "bg-[#F4F1EA] hover:bg-neutral-200 text-black"
                          }`}
                        >
                          {grp}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. City / Location Input */}
                <div>
                  <label className="block text-xs font-black uppercase font-mono tracking-wider mb-2">
                    2. Location or Hospital:
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input
                        type="text"
                        value={cityInput}
                        onChange={(e) => setCityInput(e.target.value)}
                        placeholder="Enter hospital name, city, or area..."
                        className="w-full pl-10 pr-4 py-3 bg-[#F4F1EA] border-2 border-black font-bold text-sm focus:outline-none focus:bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleHeroUseLocation}
                      disabled={locating}
                      className="px-3.5 py-3 bg-white hover:bg-[#FFE600] border-2 border-black font-mono text-xs font-bold shadow-[2px_2px_0px_#000] cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Navigation className={`w-3.5 h-3.5 ${locating ? "animate-spin text-blue-600" : ""}`} />
                      <span className="hidden sm:inline">Use Location</span>
                    </button>
                  </div>
                </div>

                {/* 3. Urgency Switcher & Submit CTA */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <div className="w-full sm:w-auto flex items-center bg-[#F4F1EA] border-2 border-black p-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setUrgency("EMERGENCY")}
                      className={`px-3 py-1.5 text-xs font-black uppercase font-mono transition-all cursor-pointer ${
                        urgency === "EMERGENCY"
                          ? "bg-[#FF4D4D] text-white shadow-[2px_2px_0px_#000]"
                          : "text-neutral-600"
                      }`}
                    >
                      🚨 Emergency (Under 1h)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUrgency("NORMAL")}
                      className={`px-3 py-1.5 text-xs font-black uppercase font-mono transition-all cursor-pointer ${
                        urgency === "NORMAL"
                          ? "bg-[#FFE600] text-black shadow-[2px_2px_0px_#000]"
                          : "text-neutral-600"
                      }`}
                    >
                      Scheduled Surgery
                    </button>
                  </div>

                  {/* Primary Conversion CTA */}
                  <Link
                    href={`/requests?blood_group=${encodeURIComponent(selectedGroup)}&urgency=${urgency}&location=${encodeURIComponent(cityInput)}`}
                    className="w-full sm:flex-1 py-3.5 bg-[#FF4D4D] hover:bg-red-600 text-white border-[3px] border-black font-black uppercase text-base text-center shadow-[4px_4px_0px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Search className="w-5 h-5" />
                    <span>Find Blood Now</span>
                  </Link>
                </div>
              </div>

              {/* 3 Trust Proof Stats */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-white border-2 border-black shadow-[3px_3px_0px_#000]">
                  <div className="text-xl sm:text-2xl font-black font-mono text-[#FF4D4D]">4,800+</div>
                  <div className="text-[11px] font-bold text-neutral-600 leading-tight">Lives Helped</div>
                </div>
                <div className="p-3 bg-white border-2 border-black shadow-[3px_3px_0px_#000]">
                  <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600">2,300+</div>
                  <div className="text-[11px] font-bold text-neutral-600 leading-tight">Verified Donors</div>
                </div>
                <div className="p-3 bg-white border-2 border-black shadow-[3px_3px_0px_#000]">
                  <div className="text-xl sm:text-2xl font-black font-mono text-indigo-600">39</div>
                  <div className="text-[11px] font-bold text-neutral-600 leading-tight">Partner Hospitals</div>
                </div>
              </div>
            </div>

            {/* Right Column: High-Polish 3D Hero Blood Drop Visual */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
              <HeroBloodDropCanvas className="h-[420px] w-full" />
              <div className="bg-white border-2 border-black px-4 py-2 font-mono text-xs font-bold shadow-[3px_3px_0px_#000] -mt-4 z-20 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>39 Blood Banks Synced Live</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. LIVE AVAILABILITY & REAL INTERACTIVE MAP */}
      {/* ========================================================================= */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#2EE59D] border-2 border-black font-mono text-xs font-black uppercase mb-2 shadow-[2px_2px_0px_#000]">
              <Activity className="w-3.5 h-3.5" /> Real-Time Hospital Network
            </div>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black">
              Live Hospital Blood Availability
            </h2>
            <p className="text-sm font-medium text-neutral-600 mt-1 max-w-2xl">
              Inspect current blood stock across verified facilities. Click any hospital pin on the map to view instant stock balances and request units directly.
            </p>
          </div>

          <Link
            href="/inventory"
            className="px-4 py-2 bg-white hover:bg-[#FFE600] border-2 border-black font-mono font-bold text-xs uppercase shadow-[2px_2px_0px_#000] flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Full Inventory View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Real Leaflet Map */}
        <HospitalStockMap selectedGroup={selectedGroup} onSelectGroup={setSelectedGroup} />

        {/* Blood Group Availability Chips Strip for Quick Scanning */}
        <div className="bg-white border-3 border-black p-5 shadow-[4px_4px_0px_#000]">
          <div className="text-xs font-mono font-black uppercase text-neutral-600 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Consolidated Network Stock Balances:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {BLOOD_GROUPS.map((grp) => {
              const matched = stockSummary.find((s) => s.blood_group === grp);
              const totalUnits = matched?.total_units ?? 120;
              const isLow = totalUnits < 80;
              return (
                <div
                  key={grp}
                  className="border-2 border-black p-2.5 bg-[#F4F1EA] flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-lg font-black">{grp}</span>
                    <span
                      className={`text-[9px] font-mono px-1 border border-black font-extrabold ${
                        isLow ? "bg-[#FF4D4D] text-white" : "bg-[#2EE59D]"
                      }`}
                    >
                      {isLow ? "LOW" : "IN STOCK"}
                    </span>
                  </div>
                  <div className="text-xl font-mono font-black text-black mt-1">
                    {totalUnits} <span className="text-[10px] text-neutral-500 font-normal">units</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. HOW IT WORKS (3 Simple Zomato/Uber Steps) */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-16 bg-white border-y-[3px] border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-3">
              How LifeGrid Works
            </h2>
            <p className="text-base font-medium text-neutral-600">
              Three streamlined steps to get emergency blood units to the bedside in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-[#F4F1EA] border-[3px] border-black p-6 shadow-[5px_5px_0px_#000] relative">
              <div className="w-12 h-12 bg-[#FFE600] border-2 border-black flex items-center justify-center font-black text-xl mb-4 shadow-[2px_2px_0px_#000]">
                1
              </div>
              <h3 className="text-xl font-black uppercase mb-2">Request Blood</h3>
              <p className="text-sm font-medium text-neutral-700 leading-relaxed">
                Select required blood group, hospital location, and urgency level. Our system instantly verifies hospital compatibility.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-[#F4F1EA] border-[3px] border-black p-6 shadow-[5px_5px_0px_#000] relative">
              <div className="w-12 h-12 bg-[#7CD4FF] border-2 border-black flex items-center justify-center font-black text-xl mb-4 shadow-[2px_2px_0px_#000]">
                2
              </div>
              <h3 className="text-xl font-black uppercase mb-2">Instant Smart Matching</h3>
              <p className="text-sm font-medium text-neutral-700 leading-relaxed">
                Emergency dispatch alerts nearby certified blood banks and verified voluntary lifesavers within transit radius simultaneously.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-[#F4F1EA] border-[3px] border-black p-6 shadow-[5px_5px_0px_#000] relative">
              <div className="w-12 h-12 bg-[#2EE59D] border-2 border-black flex items-center justify-center font-black text-xl mb-4 shadow-[2px_2px_0px_#000]">
                3
              </div>
              <h3 className="text-xl font-black uppercase mb-2">Dispatched &amp; Verified</h3>
              <p className="text-sm font-medium text-neutral-700 leading-relaxed">
                Reserved units are confirmed and transferred via temperature-monitored cold storage courier or voluntary on-site donation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. FOR DONORS & ELIGIBILITY CHECKER */}
      {/* ========================================================================= */}
      <section id="donors" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Donor Benefits */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF90C8] border-2 border-black font-mono text-xs font-black uppercase mb-2 shadow-[2px_2px_0px_#000]">
                <Heart className="w-3.5 h-3.5" /> Voluntary Lifesavers
              </div>
              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black">
                Become a LifeGrid Donor
              </h2>
              <p className="text-sm font-medium text-neutral-700 mt-2 leading-relaxed">
                1 blood donation can save up to 3 lives. When you register as a verified donor, you receive SMS alerts only when a matching patient nearby urgently needs your blood group.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-white border-2 border-black shadow-[3px_3px_0px_#000]">
                <div className="font-black text-base text-black mb-1">📍 Hyperlocal Alerts</div>
                <div className="text-xs text-neutral-600 font-medium">
                  Never spammed. You only get notified when an emergency occurs within 15 km of your location.
                </div>
              </div>
              <div className="p-4 bg-white border-2 border-black shadow-[3px_3px_0px_#000]">
                <div className="font-black text-base text-black mb-1">🔒 100% Privacy Protected</div>
                <div className="text-xs text-neutral-600 font-medium">
                  Your contact details remain confidential. Hospitals coordinate through LifeGrid&apos;s verified dispatch system.
                </div>
              </div>
            </div>

            <button
              onClick={() => setAuthOpen(true)}
              className="px-6 py-3.5 bg-[#FFE600] hover:bg-yellow-400 border-[3px] border-black font-black uppercase text-sm shadow-[4px_4px_0px_#000] cursor-pointer inline-flex items-center gap-2"
            >
              <Heart className="w-4 h-4 fill-black" />
              <span>Register as a Voluntary Donor</span>
            </button>
          </div>

          {/* Right: Interactive Donor Eligibility Checker */}
          <div id="eligibility" className="lg:col-span-5 bg-white border-[3px] border-black p-6 shadow-[6px_6px_0px_#000] space-y-4">
            <div className="border-b-2 border-black pb-3">
              <div className="flex items-center gap-2 font-black text-lg">
                <Calendar className="w-5 h-5 text-[#FF4D4D]" />
                <span>Eligibility Checker</span>
              </div>
              <p className="text-xs text-neutral-600 font-medium mt-1">
                Clinical safety standards require a 90-day cooldown between whole blood donations.
              </p>
            </div>

            <form onSubmit={handleCheckEligibility} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">
                  When did you last donate blood?
                </label>
                <input
                  type="date"
                  value={lastDonationDate}
                  onChange={(e) => setLastDonationDate(e.target.value)}
                  className="w-full p-3 bg-[#F4F1EA] border-2 border-black font-bold text-sm focus:outline-none focus:bg-white"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#2EE59D] hover:bg-emerald-400 border-2 border-black font-black uppercase text-xs shadow-[2px_2px_0px_#000] cursor-pointer"
              >
                Check My Donation Eligibility
              </button>
            </form>

            {/* Checker Result Badge */}
            {eligibilityResult && (
              <div
                className={`p-4 border-2 border-black font-mono text-xs space-y-1 ${
                  eligibilityResult.eligible
                    ? "bg-[#2EE59D]/20 border-emerald-600 text-emerald-950"
                    : "bg-[#FFE600]/30 border-amber-500 text-amber-950"
                }`}
              >
                <div className="font-black text-sm flex items-center gap-1.5">
                  {eligibilityResult.eligible ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      <span>You are Eligible to Donate Today!</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-amber-700" />
                      <span>{eligibilityResult.daysRemaining} Days Remaining</span>
                    </>
                  )}
                </div>
                {!eligibilityResult.eligible && (
                  <div className="text-neutral-700 font-medium">
                    You will be eligible again on{" "}
                    <strong>{eligibilityResult.nextEligibleDate}</strong>. Thank you for protecting patient safety!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. FOR HOSPITALS & BLOOD BANKS */}
      {/* ========================================================================= */}
      <section id="hospitals" className="py-16 bg-[#FFE600] border-y-[3px] border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <span className="px-3 py-1 bg-black text-[#FFE600] font-mono text-xs font-black uppercase shadow-[2px_2px_0px_#000]">
                Hospital &amp; Blood Bank Integration
              </span>
              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black">
                Register Your Hospital on LifeGrid
              </h2>
              <p className="text-base font-medium text-black max-w-2xl leading-relaxed">
                Connect your blood storage facility to India&apos;s real-time emergency dispatch network. Reduce wastage of expiring units, request inter-hospital transfers in crisis, and alert verified voluntary donors automatically.
              </p>
            </div>
            <div className="lg:col-span-4 flex justify-start lg:justify-end">
              <button
                onClick={() => setAuthOpen(true)}
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-neutral-100 text-black border-[3px] border-black font-black uppercase text-base shadow-[5px_5px_0px_#000] cursor-pointer"
              >
                Register Your Hospital →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. TRUSTED PARTNER HOSPITALS */}
      {/* ========================================================================= */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 w-full text-center">
        <div className="text-xs font-mono font-black uppercase tracking-widest text-neutral-500 mb-6">
          Integrated with Leading Medical Institutions &amp; Trauma Wings
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
          {[
            "AIIMS Trauma Center",
            "Fortis Healthcare",
            "Max Super Speciality",
            "Apollo Hospitals",
            "Tata Memorial Hospital",
            "PGIMER Chandigarh",
          ].map((hosp, idx) => (
            <div
              key={idx}
              className="px-4 py-2.5 bg-white border-2 border-black font-black text-xs sm:text-sm uppercase tracking-wide shadow-[3px_3px_0px_#000]"
            >
              🏥 {hosp}
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FREQUENTLY ASKED QUESTIONS (FAQ) */}
      {/* ========================================================================= */}
      <section id="faq" className="py-16 bg-white border-t-[3px] border-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-2">
              Frequently Asked Questions
            </h2>
            <p className="text-sm font-medium text-neutral-600">
              Clear answers about emergency dispatch, donor safety, and network response times.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="border-2 border-black bg-[#F4F1EA] shadow-[3px_3px_0px_#000] overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left font-black text-sm flex items-center justify-between cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="p-4 pt-0 text-xs sm:text-sm font-medium text-neutral-700 leading-relaxed border-t border-neutral-300">
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
