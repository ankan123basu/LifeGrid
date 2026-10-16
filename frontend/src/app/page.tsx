"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import MoltenMetal from "@/components/MoltenMetal";
import { api } from "@/lib/api";
import { useLiveStore } from "@/lib/store";
import {
  ShieldAlert,
  Cpu,
  Terminal,
  Activity,
  ArrowRight,
  Database,
  Flame,
  Radio,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles
} from "lucide-react";

export default function HomePage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [stock, setStock] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [quickDistress, setQuickDistress] = useState("");
  const [parsedEmergency, setParsedEmergency] = useState<any>(null);
  const [parsing, setParsing] = useState(false);
  const { alerts } = useLiveStore();

  useEffect(() => {
    async function loadStock() {
      try {
        const data = await api.getBloodStockByGroup();
        setStock(data);
      } catch (e) {
        console.error("Failed to load blood stock summary:", e);
      } finally {
        setLoadingStock(false);
      }
    }
    loadStock();
  }, []);

  const handleParseDistress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickDistress.trim()) return;
    setParsing(true);
    try {
      const res: any = await api.aiParseEmergency(quickDistress);
      setParsedEmergency(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F1EA]">
      <Navbar onOpenAuth={() => setAuthOpen(true)} />

      {/* Hero Section with MoltenMetal Fluid Canvas */}
      <section className="relative overflow-hidden border-b-[3px] border-black bg-[#FFFFFF] py-16 md:py-24">
        {/* WebGL2 Molten Metal Fluid Backdrop */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <MoltenMetal
            colors={["#FF4D4D", "#FFE600", "#7CD4FF"]}
            coreColor="#FFFFFF"
            speed={0.4}
            glow={1.8}
            thickness={1.2}
            mouseInteraction={true}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl">
            {/* Academic Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FFE600] border-2 border-black shadow-[3px_3px_0px_#000] text-xs font-mono font-black uppercase tracking-wider mb-6">
              <span className="w-2.5 h-2.5 bg-[#FF4D4D] border border-black animate-pulse" />
              <span>CSE494: Intelligent NoSQL Databases • University Project</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] text-[#0A0A0A] mb-6">
              THE INTELLIGENT <br />
              <span className="bg-[#FFE600] px-2 border-[3px] border-black inline-block shadow-[4px_4px_0px_#000]">
                REAL-TIME
              </span>{" "}
              BLOOD MESH
            </h1>

            {/* Subheading */}
            <p className="text-lg md:text-xl font-medium text-neutral-800 leading-relaxed mb-8">
              An enterprise-grade emergency resource network powered by <span className="font-bold underline decoration-[#FF4D4D]">MongoDB 8.2</span> with strict schema enforcement, 2dsphere geospatial routing, 15 aggregation pipelines, and autonomous <span className="font-bold underline decoration-[#2EE59D]">Groq LLM</span> tool-calling intelligence.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/requests" className="neo-btn neo-btn-danger text-sm py-3 px-6 shadow-[5px_5px_0px_#000]">
                <ShieldAlert className="w-5 h-5" />
                <span>Live Emergency Dispatch</span>
              </Link>
              <Link href="/ai" className="neo-btn neo-btn-primary text-sm py-3 px-6 shadow-[5px_5px_0px_#000]">
                <Cpu className="w-5 h-5" />
                <span>AI Clinical Assistant</span>
              </Link>
              <Link href="/query-lab" className="neo-btn neo-btn-white text-sm py-3 px-6 shadow-[5px_5px_0px_#000]">
                <Terminal className="w-5 h-5" />
                <span>Query Lab</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Real-time Ticker */}
      <div className="bg-[#0A0A0A] text-[#FFE600] py-2.5 border-b-[3px] border-black overflow-hidden font-mono text-xs font-bold uppercase tracking-wider">
        <div className="flex items-center gap-8 whitespace-nowrap animate-marquee">
          <span>🚨 LIVE NETWORK VITALS</span>
          <span>•</span>
          <span>MONGODB 8.2 SINGLE-NODE REPLICA TOPOLOGY</span>
          <span>•</span>
          <span>2DSPHERE GEOSPATIAL INDEXING (LUDHIANA, PUNJAB & NORTH INDIA)</span>
          <span>•</span>
          <span>GROQ LLM INFERENCE TELEMETRY ACTIVE</span>
          <span>•</span>
          <span>CHANGE STREAM LISTENER ACTIVE</span>
          <span>•</span>
          <span>ZERO-TOLERANCE $JSONSCHEMA VALIDATION STRICT</span>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 flex-1 space-y-16">
        {/* Blood Stock Grid Heatmap */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-neutral-600 mb-1">
                <Activity className="w-4 h-4 text-[#FF4D4D]" />
                <span>Aggregation Pipeline #1 Live Heatmap</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Consolidated Blood Stock By ABO/Rh Group
              </h2>
            </div>
            <Link href="/inventory" className="text-xs font-bold font-mono underline hover:text-[#FF4D4D] flex items-center gap-1">
              View Hospital-Level Grid →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {loadingStock ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="neo-card p-4 h-28 animate-pulse bg-neutral-200" />
              ))
            ) : (
              stock.map((item) => {
                const isShortage = item.total_available < 150;
                return (
                  <div
                    key={item.blood_group}
                    className="neo-card p-4 relative group hover:border-[#FF4D4D] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl font-black tracking-tight">{item.blood_group}</span>
                      <span
                        className={`text-[9px] font-mono px-1 border border-black font-extrabold ${
                          isShortage ? "bg-[#FF4D4D] text-white" : "bg-[#2EE59D]"
                        }`}
                      >
                        {isShortage ? "LOW" : "OK"}
                      </span>
                    </div>
                    <div className="text-2xl font-black font-mono leading-none mb-1">
                      {item.total_available}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-600">
                      Reserved: {item.total_reserved}
                    </div>
                    <div className="text-[9px] font-mono text-neutral-400 mt-2 border-t pt-1 border-neutral-200">
                      {item.hospital_count} Hospitals
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* AI Emergency Parser Interactive Playground */}
        <section className="neo-card p-6 md:p-8 bg-[#FFFFFF]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#7CD4FF] border-2 border-black font-mono text-xs font-bold mb-3 shadow-[2px_2px_0px_#000]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Emergency Triage (Groq Fast LLM)</span>
              </div>
              <h3 className="text-2xl font-black tracking-tight mb-3">
                Natural Language Distress Forward Parser
              </h3>
              <p className="text-sm text-neutral-700 font-medium leading-relaxed mb-6">
                Paste panic messages from WhatsApp groups, doctor voice notes, or SMS distress forwards. The Groq LLM parses urgency, ABO group, unit demands, and patient trauma indicators into structured MongoDB schema objects in &lt;1.2 seconds.
              </p>

              <form onSubmit={handleParseDistress} className="space-y-3">
                <textarea
                  value={quickDistress}
                  onChange={(e) => setQuickDistress(e.target.value)}
                  rows={3}
                  placeholder="e.g. URGENT: 2 units of B+ needed for accident trauma at CMC Hospital Ludhiana ICU immediately! Patient age 28 male."
                  className="neo-input text-sm resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={parsing}
                    className="neo-btn neo-btn-primary text-xs py-2 px-4 shadow-[3px_3px_0px_#000] disabled:opacity-50"
                  >
                    {parsing ? "Parsing via Groq Cloud..." : "Parse Emergency Request"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setQuickDistress(
                        "URGENT: 3 units of O-negative packed red cells needed for severe postpartum hemorrhage at Dayanand Medical College ICU Bed 4!"
                      )
                    }
                    className="text-xs font-mono font-bold underline text-neutral-600 hover:text-black"
                  >
                    Load Sample Forward
                  </button>
                </div>
              </form>
            </div>

            {/* Parsed Result Box */}
            <div className="bg-[#F4F1EA] border-[3px] border-black p-5 shadow-[4px_4px_0px_#000]">
              <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                <span className="font-mono text-xs font-bold uppercase">Structured Request Preview</span>
                <span className="text-[10px] font-mono bg-white px-2 py-0.5 border border-black font-bold">
                  {parsedEmergency ? "PARSED READY" : "AWAITING INPUT"}
                </span>
              </div>

              {parsedEmergency ? (
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between bg-white p-2 border border-black">
                    <span className="text-neutral-500">Blood Group:</span>
                    <span className="font-extrabold text-base bg-[#FF4D4D] text-white px-2 py-0.5 border border-black">
                      {parsedEmergency.blood_group}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-2 border border-black">
                      <span className="text-neutral-500 block text-[10px]">Component</span>
                      <span className="font-bold">{parsedEmergency.component}</span>
                    </div>
                    <div className="bg-white p-2 border border-black">
                      <span className="text-neutral-500 block text-[10px]">Units Demanded</span>
                      <span className="font-bold">{parsedEmergency.units_needed} Unit(s)</span>
                    </div>
                  </div>
                  <div className="bg-white p-2 border border-black">
                    <span className="text-neutral-500 block text-[10px]">Urgency Classification</span>
                    <span className="font-black text-[#FF4D4D]">{parsedEmergency.urgency}</span>
                    <p className="text-[11px] text-neutral-600 mt-1 font-sans">
                      {parsedEmergency.triage_summary}
                    </p>
                  </div>
                  <Link
                    href={`/requests?prefill=${encodeURIComponent(JSON.stringify(parsedEmergency))}`}
                    className="neo-btn neo-btn-danger w-full text-xs py-2 shadow-[3px_3px_0px_#000]"
                  >
                    Dispatch Live Request to Network →
                  </Link>
                </div>
              ) : (
                <div className="text-center py-10 text-neutral-500 font-mono text-xs">
                  Paste or load an emergency forward on the left to extract clinical fields.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 4 Pillars of CSE494 Architecture */}
        <section>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl font-black tracking-tight mb-2">
              CSE494 Intelligent Database Architecture
            </h2>
            <p className="text-sm font-medium text-neutral-600">
              Built to demonstrate mastery of NoSQL distributed indexing, atomicity, and query optimization for the university viva.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1 */}
            <div className="neo-card p-6 bg-[#FFFFFF]">
              <div className="w-10 h-10 bg-[#FFE600] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center font-bold mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="font-black text-lg mb-2">Strict Schema &amp; Atomicity</h3>
              <p className="text-xs text-neutral-700 leading-relaxed font-medium mb-4">
                11 strict $jsonSchema validators with <code>validationAction: error</code>. Atomic inventory reservations using <code>find_one_and_update()</code> to prevent double-booking.
              </p>
              <div className="text-[11px] font-mono bg-[#F4F1EA] p-2 border border-black font-bold">
                ✓ Multi-Doc ACID Transactions (5 Colls)
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="neo-card p-6 bg-[#FFFFFF]">
              <div className="w-10 h-10 bg-[#7CD4FF] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center font-bold mb-4">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-black text-lg mb-2">2dsphere Geospatial Routing</h3>
              <p className="text-xs text-neutral-700 leading-relaxed font-medium mb-4">
                Spherical <code>$geoNear</code> spatial queries targeting nearby compatible voluntary donors matching ABO/Rh transfusion rules and enforcing 90-day clinical cooldowns.
              </p>
              <div className="text-[11px] font-mono bg-[#F4F1EA] p-2 border border-black font-bold">
                ✓ Spatial Indexes on Punjab &amp; Delhi NCR
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="neo-card p-6 bg-[#FFFFFF]">
              <div className="w-10 h-10 bg-[#2EE59D] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center font-bold mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-black text-lg mb-2">Groq Tool-Calling Agent</h3>
              <p className="text-xs text-neutral-700 leading-relaxed font-medium mb-4">
                Backend-only Groq LLM executing raw PyMongo tool calls (stock inspection, shortage detection) and recording every token and latency millisecond into <code>ai_usage_logs</code>.
              </p>
              <div className="text-[11px] font-mono bg-[#F4F1EA] p-2 border border-black font-bold">
                ✓ Autonomous Agent Loop (No ODMs)
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
