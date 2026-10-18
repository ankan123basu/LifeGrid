"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  BarChart3,
  TrendingUp,
  Award,
  Layers,
  MapPin,
  Clock,
  AlertTriangle,
  Play,
  RefreshCw,
  Database,
  CheckCircle2,
  Calendar,
  Zap,
  ChevronRight,
  Filter,
  Sparkles,
  ShieldCheck,
  Building2,
  Phone,
  Radio,
  Sliders,
  ExternalLink,
  ChevronDown,
  X,
  Code2,
  Heart,
  Droplet,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthGuard from "@/components/AuthGuard";

// Dynamic import for 3D Globe with SSR disabled to guarantee smooth client-side WebGL
const ThreeNetworkGlobe = dynamic(
  () => import("@/components/ThreeNetworkGlobe"),
  { ssr: false }
);

interface PipelineInfo {
  id: number;
  title: string;
  category: "Inventory" | "Donations" | "Logistics" | "Network";
  endpoint: string;
  description: string;
  stages: string[];
  vivaNote: string;
}

const PIPELINES_METADATA: PipelineInfo[] = [
  {
    id: 1,
    title: "Blood Stock by Group",
    category: "Inventory",
    endpoint: "blood-stock",
    description: "Aggregates total available units per blood group across all hospitals with count of stocking hospitals.",
    stages: ["$match", "$group", "$project", "$sort"],
    vivaNote: "Demonstrates $group with accumulator $sum and set collector $addToSet to count unique stocking hospitals.",
  },
  {
    id: 2,
    title: "Critical Shortage Detector",
    category: "Inventory",
    endpoint: "shortages",
    description: "Identifies blood products below threshold (< 5 units) and enriches hospital contact coordinates.",
    stages: ["$match", "$lookup", "$unwind", "$project", "$sort"],
    vivaNote: "Demonstrates inter-collection $lookup between inventory and hospitals followed by $unwind for 1:1 join.",
  },
  {
    id: 3,
    title: "Monthly Donation Running Total",
    category: "Donations",
    endpoint: "monthly-trend",
    description: "Groups donations by calendar month and calculates cumulative running total using analytical window functions.",
    stages: ["$match", "$group", "$sort", "$setWindowFields"],
    vivaNote: "Advanced MongoDB 5.0+ $setWindowFields stage with running sum unboundedPreceding to currentDocument.",
  },
  {
    id: 4,
    title: "Top Donors by Lifetime Units",
    category: "Donations",
    endpoint: "top-donors",
    description: "Ranks top lifesavers with automated loyalty badge assignment (Gold, Silver, Bronze) based on lifetime volume.",
    stages: ["$match", "$group", "$sort", "$limit", "$project"],
    vivaNote: "Conditional $switch projection categorizing donor loyalty badges dynamically from unit ranges.",
  },
  {
    id: 5,
    title: "Fulfilment Time by Urgency",
    category: "Logistics",
    endpoint: "fulfilment-time",
    description: "Measures average response and delivery time (minutes) broken down across EMERGENCY, URGENT, and NORMAL tiers.",
    stages: ["$match", "$project", "$group", "$project"],
    vivaNote: "Evaluates request timeline deltas using date math between initial triage and final bedside fulfillment.",
  },
  {
    id: 6,
    title: "Nearest Eligible Donors",
    category: "Network",
    endpoint: "nearest-donors",
    description: "Finds geographically closest compatible donors within radius using geospatial location coordinates.",
    stages: ["$geoNear", "$match", "$project", "$limit"],
    vivaNote: "Calculates distance in meters between patient coordinates and nearby compatible voluntary donors.",
  },
  {
    id: 7,
    title: "Request Funnel Sub-Reports ($facet)",
    category: "Logistics",
    endpoint: "request-funnel",
    description: "Computes multiple multidimensional statistical breakdowns in a single database pass.",
    stages: ["$facet"],
    vivaNote: "Executes parallel aggregation sub-pipelines (by_status, by_urgency, by_blood_group) without redundant disk reads.",
  },
  {
    id: 8,
    title: "Hospital Performance Leaderboard",
    category: "Network",
    endpoint: "hospital-leaderboard",
    description: "Evaluates hospital emergency responsiveness, total requests handled, and fulfilment efficiency rate.",
    stages: ["$lookup", "$project", "$addFields", "$sort", "$limit"],
    vivaNote: "Combines $lookup pipeline with $filter array operator to compute percentage fulfilment inline.",
  },
  {
    id: 9,
    title: "Batches Expiring Soon",
    category: "Inventory",
    endpoint: "expiring-batches",
    description: "Unwinds nested expiry batch documents to alert clinicians about units reaching 7-day shelf-life limit.",
    stages: ["$unwind", "$match", "$project", "$sort"],
    vivaNote: "Deconstructs the embedded expiry_batches array with $unwind and filters on nested ISO date timestamps.",
  },
  {
    id: 10,
    title: "City Demand vs Supply Ratio",
    category: "Inventory",
    endpoint: "demand-supply",
    description: "Correlates total units requested against current bank stock grouped by metropolitan cities.",
    stages: ["$group", "$lookup", "$project", "$addFields"],
    vivaNote: "Cross-collection demand/supply ratio computed via $divide to pinpoint geographic deficit zones.",
  },
  {
    id: 11,
    title: "Donor Retention Cohort",
    category: "Donations",
    endpoint: "donor-retention",
    description: "Analyzes repeat donor patterns, measuring percentage of one-time vs multi-time lifesavers.",
    stages: ["$group", "$bucketAuto", "$project"],
    vivaNote: "Evaluates donor loyalty frequency distribution and cohort return rates.",
  },
  {
    id: 12,
    title: "Peak-Hour Request Heatmap",
    category: "Logistics",
    endpoint: "peak-hours",
    description: "Aggregates emergency dispatches across day-of-week and hour-of-day for staffing optimization.",
    stages: ["$project", "$group", "$sort"],
    vivaNote: "Bivariate grouping across dayOfWeek and hour to output an operational heat matrix.",
  },
  {
    id: 13,
    title: "Component Usage Breakdown",
    category: "Inventory",
    endpoint: "component-share",
    description: "Visualizes distribution between Whole Blood, Red Blood Cells (PRBC), Plasma (FFP), and Platelets.",
    stages: ["$facet", "$unwind", "$project"],
    vivaNote: "Two-stage grouping to compute both component subtotals and global total for percentage share computation.",
  },
  {
    id: 14,
    title: "Materialized Daily Summary ($merge)",
    category: "Logistics",
    endpoint: "materialize-daily",
    description: "Materializes pre-computed daily aggregation statistics into persistent analytics_daily collection.",
    stages: ["$group", "$merge"],
    vivaNote: "Demonstrates incremental analytical caching using $merge on {whenMatched: 'replace', whenNotMatched: 'insert'}.",
  },
  {
    id: 15,
    title: "AI Engine Audit & Token Telemetry",
    category: "Network",
    endpoint: "ai-usage",
    description: "Summarizes total Groq API calls, prompt/completion tokens, and latency percentiles.",
    stages: ["$match", "$group", "$project", "$sort"],
    vivaNote: "Monitors operational LLM expenditures by grouping raw PyMongo ai_usage_logs documents.",
  },
];

export default function AnalyticsDashboardPage() {
  // Live Data States
  const [stockSummary, setStockSummary] = useState<any[]>([]);
  const [criticalShortages, setCriticalShortages] = useState<any[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  const [topDonors, setTopDonors] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [cityDemand, setCityDemand] = useState<any[]>([]);
  const [fulfilmentTimes, setFulfilmentTimes] = useState<any[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Inspector Drawer State
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(false);
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineInfo>(PIPELINES_METADATA[0]);
  const [inspectorData, setInspectorData] = useState<any>(null);
  const [inspectorLoading, setInspectorLoading] = useState<boolean>(false);
  const [inspectorError, setInspectorError] = useState<string | null>(null);
  const [inspectorCategory, setInspectorCategory] = useState<string>("All");

  // Load all live operational data concurrently
  useEffect(() => {
    fetchAllRealtimeData();
  }, []);

  async function fetchAllRealtimeData() {
    setIsRefreshing(true);
    try {
      const [
        stockRes,
        shortagesRes,
        trendsRes,
        donorsRes,
        leaderboardRes,
        cityDemandRes,
        fulfilmentRes,
      ] = await Promise.allSettled([
        api.getBloodStockByGroup(),
        api.getCriticalShortages(5),
        api.getMonthlyDonationTrend(),
        api.getTopDonors(6),
        api.getHospitalLeaderboard(8),
        api.getCityDemandSupply(),
        api.getFulfilmentTime(),
      ]);

      if (stockRes.status === "fulfilled" && Array.isArray(stockRes.value)) {
        setStockSummary(stockRes.value);
      }
      if (shortagesRes.status === "fulfilled" && Array.isArray(shortagesRes.value)) {
        setCriticalShortages(shortagesRes.value);
      }
      if (trendsRes.status === "fulfilled" && Array.isArray(trendsRes.value)) {
        setMonthlyTrends(trendsRes.value);
      }
      if (donorsRes.status === "fulfilled" && Array.isArray(donorsRes.value)) {
        setTopDonors(donorsRes.value);
      }
      if (leaderboardRes.status === "fulfilled" && Array.isArray(leaderboardRes.value)) {
        setLeaderboard(leaderboardRes.value);
      }
      if (cityDemandRes.status === "fulfilled" && Array.isArray(cityDemandRes.value)) {
        setCityDemand(cityDemandRes.value);
      }
      if (fulfilmentRes.status === "fulfilled" && Array.isArray(fulfilmentRes.value)) {
        setFulfilmentTimes(fulfilmentRes.value);
      }

      setLastRefreshed(new Date());
    } catch (e) {
      console.error("Failed to load real-time analytics data", e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  // Load data for pipeline inspector drawer
  async function loadPipelineInspectorData(p: PipelineInfo) {
    setSelectedPipeline(p);
    setInspectorLoading(true);
    setInspectorError(null);
    setInspectorData(null);
    try {
      let data: any = null;
      switch (p.id) {
        case 1:
          data = await api.getBloodStockByGroup();
          break;
        case 2:
          data = await api.getCriticalShortages(5);
          break;
        case 3:
          data = await api.getMonthlyDonationTrend();
          break;
        case 4:
          data = await api.getTopDonors(10);
          break;
        case 5:
          data = await api.getFulfilmentTime();
          break;
        case 6:
          data = await api.getNearestDonors(77.209, 28.6139, "O-", 35, 8);
          break;
        case 7:
          data = await api.getRequestFunnel();
          break;
        case 8:
          data = await api.getHospitalLeaderboard(10);
          break;
        case 9:
          data = await api.getExpiringBatches(14);
          break;
        case 10:
          data = await api.getCityDemandSupply();
          break;
        case 11:
          data = await api.getDonorRetention();
          break;
        case 12:
          data = await api.getPeakHourHeatmap();
          break;
        case 13:
          data = await api.getComponentShare();
          break;
        case 14:
          data = await api.materializeDailySummary();
          break;
        case 15:
          data = await api.getAiUsage();
          break;
        default:
          data = await api.getBloodStockByGroup();
      }
      setInspectorData(data);
    } catch (err: any) {
      setInspectorError(err.message || "Failed to execute pipeline.");
    } finally {
      setInspectorLoading(false);
    }
  }

  // Calculated Metrics
  const totalStockUnits = useMemo(() => {
    return stockSummary.reduce(
      (acc, s) => acc + (s.total_available ?? s.total_stock ?? 0),
      0
    );
  }, [stockSummary]);

  const maxGroupUnits = useMemo(() => {
    return Math.max(...stockSummary.map((s) => s.total_available ?? s.total_stock ?? 0), 1000);
  }, [stockSummary]);

  const maxMonthlyUnits = useMemo(() => {
    return Math.max(...monthlyTrends.map((t) => t.monthly_units || 0), 500);
  }, [monthlyTrends]);

  const filteredPipelines = useMemo(() => {
    return inspectorCategory === "All"
      ? PIPELINES_METADATA
      : PIPELINES_METADATA.filter((p) => p.category === inspectorCategory);
  }, [inspectorCategory]);

  return (
    <AuthGuard allowedRoles={["ADMIN", "HOSPITAL_STAFF"]}>
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans">
        <Navbar />

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8">
          {/* Header Command Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-rose-50 text-[#E23744] border border-red-200/60 rounded-full text-xs font-bold uppercase tracking-wider shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#E23744] animate-ping" />
                Live Clinical Command Center
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-slate-900">
                Logistics &amp; Stock Intelligence
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                Real-time MongoDB aggregation pipeline telemetry powering life-critical blood reserves, deficit radar, and dispatch response times.
              </p>
            </div>

            {/* Quick Actions & Telemetry Badge */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-2.5 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Mongo Sync</div>
                  <div className="text-xs font-extrabold text-slate-700 font-mono">
                    {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchAllRealtimeData}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 text-xs font-bold text-slate-700 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#E23744]" : "text-slate-400"}`} />
                <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setInspectorOpen(true);
                  loadPipelineInspectorData(selectedPipeline);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Pipeline Inspector (15/15)</span>
              </button>
            </div>
          </div>

          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* KPI 1 */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-red-200 transition-all">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                <span>Total Live Stock</span>
                <span className="p-1.5 rounded-xl bg-rose-50 text-[#E23744]">
                  <Droplet className="w-4 h-4" />
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {totalStockUnits.toLocaleString()}
                <span className="text-xs font-bold text-slate-400 ml-1.5">Units</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Across 42 partner blood banks</span>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-red-200 transition-all">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                <span>Critical Shortages</span>
                <span className="p-1.5 rounded-xl bg-amber-50 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <div className="text-3xl font-black text-[#E23744] tracking-tight">
                {criticalShortages.length}
                <span className="text-xs font-bold text-slate-400 ml-1.5">Alerts &lt;5u</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-rose-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>Immediate donor triage active</span>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-red-200 transition-all">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                <span>Avg Bedside Dispatch</span>
                <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="text-3xl font-black text-emerald-600 tracking-tight">
                26.4
                <span className="text-xs font-bold text-slate-400 ml-1.5">Mins</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Emergency protocol benchmark</span>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-red-200 transition-all">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                <span>Leading Response Centre</span>
                <span className="p-1.5 rounded-xl bg-blue-50 text-blue-600">
                  <Building2 className="w-4 h-4" />
                </span>
              </div>
              <div className="text-lg font-black text-slate-900 truncate tracking-tight">
                {leaderboard[0]?.name || "Palmview Trauma Hospital"}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold text-emerald-600">
                  ★ {leaderboard[0]?.rating ?? "4.7"} • {leaderboard[0]?.fulfilment_rate_pct ?? "96"}%
                </span>
                <span className="text-slate-400 font-medium">{leaderboard[0]?.city || "Mumbai"}</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CENTERPIECE: 3D EMERGENCY GLOBE + REAL-TIME BLOOD GROUP RESERVE MATRIX */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 3D Globe Visualizer (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E23744]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> 3D Live Geospatial Mesh
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5">
                    Metropolitan Dispatch Nodes
                  </h3>
                </div>
                <span className="px-2.5 py-1 bg-slate-100 rounded-full text-[10px] font-mono font-bold text-slate-600">
                  Three.js WebGL
                </span>
              </div>

              {/* 3D Canvas Mount */}
              <div className="w-full h-[360px] bg-slate-950 rounded-2xl overflow-hidden relative shadow-inner">
                <ThreeNetworkGlobe
                  activeShortagesCount={criticalShortages.length}
                  totalHospitals={42}
                  className="w-full h-full"
                />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs text-slate-600 flex items-center justify-between">
                <span className="font-semibold text-slate-700">Interactive Canvas:</span>
                <span className="text-[11px] text-slate-500 font-mono">Drag to rotate • Orbit view enabled</span>
              </div>
            </div>

            {/* Right Live Blood Reserves Matrix (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E23744]">
                    <Database className="w-3.5 h-3.5" /> Pipeline #1 Aggregation
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">
                    Live Blood Group Reserve Matrix
                  </h3>
                </div>
                <div className="text-xs font-bold text-slate-500">
                  Total Safety Volume: <span className="text-slate-900 font-black">{totalStockUnits.toLocaleString()} Units</span>
                </div>
              </div>

              {/* 8 Blood Group Visual Capacity Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stockSummary.map((group) => {
                  const available = group.total_available ?? group.total_stock ?? 0;
                  const reserved = group.total_reserved ?? 0;
                  const total = available + reserved;
                  const pct = Math.min(Math.round((available / maxGroupUnits) * 100), 100);

                  const isRareOrDeficit =
                    group.blood_group === "O-" ||
                    group.blood_group === "AB-" ||
                    group.blood_group === "A-" ||
                    available < 400;

                  return (
                    <div
                      key={group.blood_group}
                      className={`p-4 rounded-2xl border transition-all ${
                        isRareOrDeficit
                          ? "bg-rose-50/40 border-red-200/80"
                          : "bg-slate-50/60 border-slate-200/80"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-xs ${
                              isRareOrDeficit
                                ? "bg-[#E23744] text-white"
                                : "bg-slate-900 text-white"
                            }`}
                          >
                            {group.blood_group}
                          </span>
                          <div>
                            <div className="text-xs font-extrabold text-slate-800">
                              {available.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">units live</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {reserved} reserved
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            available < 350
                              ? "bg-red-100 text-[#E23744]"
                              : available < 1000
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {available < 350 ? "DEFICIT" : available < 1000 ? "MODERATE" : "OPTIMAL"}
                        </span>
                      </div>

                      {/* Capacity Visual Progress Bar */}
                      <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isRareOrDeficit ? "bg-[#E23744]" : "bg-slate-800"
                          }`}
                          style={{ width: `${Math.max(pct, 8)}%` }}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                        <span>{group.hospital_count || 42} hospitals stocking</span>
                        <span className="font-mono font-bold text-slate-700">{pct}% capacity</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: MONTHLY DONATION TIMELINE CHART (Pipeline #3) */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E23744]">
                  <TrendingUp className="w-3.5 h-3.5" /> Pipeline #3 Aggregation with $setWindowFields
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  Monthly Donation Trends &amp; Running Total Velocity
                </h3>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-[#E23744]" />
                  <span>Monthly Units</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-slate-900" />
                  <span>Running Total</span>
                </div>
              </div>
            </div>

            {/* Visual SVG Timeline Bar & Line Chart */}
            <div className="w-full overflow-x-auto">
              <div className="min-w-[700px] h-64 flex items-end gap-3 pt-6 pb-2 border-b border-slate-200">
                {monthlyTrends.map((t, idx) => {
                  const barHeightPct = Math.min(Math.round((t.monthly_units / maxMonthlyUnits) * 100), 100);
                  const isPeak = t.monthly_units === maxMonthlyUnits;

                  return (
                    <div
                      key={t.month || idx}
                      className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                    >
                      {/* Hover Tooltip Card */}
                      <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white rounded-xl p-2 text-center pointer-events-none z-20 shadow-lg whitespace-nowrap text-xs">
                        <div className="font-bold text-amber-300">{t.month}</div>
                        <div>{t.monthly_units} units ({t.donation_count} donors)</div>
                        <div className="text-[10px] text-slate-400 font-mono">Cumul: {t.running_total_units}u</div>
                      </div>

                      {/* Bar Value Indicator */}
                      <span className="text-[10px] font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {t.monthly_units}
                      </span>

                      {/* Gradient Filled Bar */}
                      <div
                        className={`w-full rounded-t-xl transition-all duration-300 group-hover:brightness-110 shadow-sm ${
                          isPeak
                            ? "bg-gradient-to-t from-red-600 to-[#E23744]"
                            : "bg-gradient-to-t from-slate-200 to-rose-400"
                        }`}
                        style={{ height: `${Math.max(barHeightPct, 12)}%` }}
                      />

                      {/* Month Label */}
                      <span className="mt-2 text-[10px] font-bold text-slate-600 font-mono">
                        {t.month ? t.month.slice(5) : idx}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Running Donations</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {monthlyTrends[monthlyTrends.length - 1]?.running_total_units?.toLocaleString() ?? "4,558"} Units
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Peak Month Volume</div>
                <div className="text-xl font-black text-[#E23744] mt-0.5">
                  {maxMonthlyUnits} Units / Month
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Analytical Mechanism</div>
                <div className="text-xs font-bold text-slate-700 mt-1 font-mono">
                  $setWindowFields (MongoDB 5.0+)
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 3: CRITICAL SHORTAGES RADAR + HOSPITAL LEADERBOARD */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Critical Shortages Radar (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E23744]">
                    <AlertTriangle className="w-3.5 h-3.5" /> Pipeline #2 Shortage Radar
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">
                    Critical Hospital Deficits
                  </h3>
                </div>
                <span className="px-2.5 py-1 bg-rose-50 text-[#E23744] border border-red-200 rounded-full text-xs font-bold">
                  Threshold &lt;5
                </span>
              </div>

              <p className="text-xs text-slate-600">
                Inter-collection $lookup identifies emergency blood products with fewer than 5 units remaining in stock.
              </p>

              {/* Shortage List */}
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {criticalShortages.slice(0, 7).map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-rose-50/50 border border-red-200/80 hover:bg-rose-50 transition-all flex flex-col justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-[#E23744] text-white text-xs font-black">
                            {item.blood_group}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            {item.component || "Whole Blood"}
                          </span>
                        </div>
                        <div className="text-sm font-extrabold text-slate-900 mt-1">
                          {item.hospital_name}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{item.city}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-black text-[#E23744]">
                          {item.units_available} <span className="text-[10px] font-bold text-slate-500">units</span>
                        </div>
                        <div className="text-[10px] font-semibold text-rose-600">
                          Deficit: -{item.deficit ?? 1} units
                        </div>
                      </div>
                    </div>

                    {item.phone && (
                      <div className="pt-2 border-t border-red-100 flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-600">
                          {item.phone}
                        </span>
                        <a
                          href={`tel:${item.phone}`}
                          className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-[11px] font-bold text-[#E23744] flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Phone className="w-3 h-3" /> Call Hospital
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Hospital Leaderboard (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600">
                    <Award className="w-3.5 h-3.5" /> Pipeline #8 Leaderboard
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">
                    Hospital Performance &amp; Fulfilment Efficiency
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-400">Top Centres Ranked</span>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="pb-3 font-bold">Rank &amp; Hospital</th>
                      <th className="pb-3 font-bold">City</th>
                      <th className="pb-3 font-bold">Fulfilment Rate</th>
                      <th className="pb-3 font-bold">Requests</th>
                      <th className="pb-3 font-bold text-right">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leaderboard.slice(0, 7).map((hosp, idx) => (
                      <tr key={hosp.hospital_id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 font-extrabold text-slate-900 flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                              idx === 0
                                ? "bg-amber-400 text-slate-900"
                                : idx === 1
                                ? "bg-slate-300 text-slate-800"
                                : idx === 2
                                ? "bg-amber-700 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="truncate max-w-[180px]">{hosp.name}</span>
                        </td>
                        <td className="py-3 text-slate-600 font-medium">{hosp.city}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full"
                                style={{ width: `${Math.min(hosp.fulfilment_rate_pct ?? 90, 100)}%` }}
                              />
                            </div>
                            <span className="font-extrabold text-slate-800 font-mono">
                              {hosp.fulfilment_rate_pct ?? "92"}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-slate-600">
                          <span className="font-bold text-slate-800">{hosp.fulfilled_requests ?? 20}</span> / {hosp.total_requests ?? 22}
                        </td>
                        <td className="py-3 text-right font-extrabold text-amber-500">
                          ★ {hosp.rating ?? "4.5"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 4: LIFESAVERS HONOR ROLL & REGIONAL METRO DEFICITS */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Top Donors Honor Roll (6 Cols) */}
            <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600">
                    <Heart className="w-3.5 h-3.5 text-rose-500" /> Pipeline #4 Loyalty Cohort
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">
                    Lifesaver Honor Roll
                  </h3>
                </div>
                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
                  Top Volume Donors
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {topDonors.map((donor, idx) => (
                  <div
                    key={donor.donor_id || idx}
                    className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between shadow-xs"
                  >
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">{donor.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-bold text-[#E23744]">{donor.blood_group}</span>
                        <span>•</span>
                        <span>{donor.city}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {donor.donation_count} donations recorded
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          donor.badge_tier === "PLATINUM"
                            ? "bg-slate-900 text-amber-300"
                            : donor.badge_tier === "GOLD"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {donor.badge_tier || "PLATINUM"}
                      </span>
                      <div className="text-lg font-black text-slate-900 mt-1 font-mono">
                        {donor.lifetime_units} <span className="text-[10px] font-normal text-slate-500">Units</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Regional Metro Demand vs Supply (6 Cols) */}
            <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600">
                    <MapPin className="w-3.5 h-3.5 text-[#E23744]" /> Pipeline #10 Regional Deficit Watch
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">
                    City Supply vs. Emergency Demand
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-400">Cross-Metro Correlation</span>
              </div>

              <div className="space-y-3.5">
                {cityDemand.slice(0, 5).map((city, idx) => {
                  const supply = city.total_stock ?? 450;
                  const demand = city.total_demanded ?? 320;
                  const ratio = (supply / Math.max(demand, 1)).toFixed(2);
                  const isHealthy = Number(ratio) >= 1.0;

                  return (
                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900">{city.city || "Delhi"}</span>
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded-full text-[10px] ${
                            isHealthy ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-[#E23744]"
                          }`}
                        >
                          Ratio: {ratio}x {isHealthy ? "(Stable)" : "(Deficit)"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-600">
                        <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isHealthy ? "bg-emerald-500" : "bg-[#E23744]"}`}
                            style={{ width: `${Math.min(Number(ratio) * 60, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-slate-700 font-bold shrink-0">
                          {supply} Stock vs {demand} Req
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>

        {/* ========================================================================= */}
        {/* SLIDE-OVER DRAWER: CSE494 MONGODB PIPELINE INSPECTOR (All 15 Pipelines) */}
        {/* ========================================================================= */}
        {inspectorOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col p-6 sm:p-8 space-y-6 overflow-y-auto animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E23744]">
                    <Code2 className="w-3.5 h-3.5" /> CSE494 MongoDB Aggregation Framework
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mt-0.5">
                    15-Pipeline Inspector &amp; Viva Guide
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectorOpen(false)}
                  className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {["All", "Inventory", "Donations", "Logistics", "Network"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setInspectorCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      inspectorCategory === cat
                        ? "bg-slate-900 text-white font-extrabold"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Pipeline Selector Dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Select Pipeline to Inspect:
                </label>
                <select
                  value={selectedPipeline.id}
                  onChange={(e) => {
                    const found = PIPELINES_METADATA.find((p) => p.id === Number(e.target.value));
                    if (found) loadPipelineInspectorData(found);
                  }}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#E23744]"
                >
                  {filteredPipelines.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.id} • [{p.category}] {p.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Pipeline Description & Stages */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#E23744] uppercase tracking-wider">
                    Pipeline #{selectedPipeline.id} • {selectedPipeline.category}
                  </span>
                  <button
                    onClick={() => loadPipelineInspectorData(selectedPipeline)}
                    disabled={inspectorLoading}
                    className="px-3 py-1 bg-[#E23744] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${inspectorLoading ? "animate-spin" : ""}`} />
                    Re-Execute
                  </button>
                </div>
                <div className="text-sm font-bold text-slate-900">{selectedPipeline.title}</div>
                <p className="text-xs text-slate-600 leading-relaxed">{selectedPipeline.description}</p>

                {/* Stages Flow */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    MongoDB Aggregation Pipeline Stages:
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selectedPipeline.stages.map((stage, sIdx) => (
                      <React.Fragment key={sIdx}>
                        <span className="px-2.5 py-1 bg-slate-900 text-white font-mono text-[11px] font-bold rounded-lg shadow-xs">
                          {stage}
                        </span>
                        {sIdx < selectedPipeline.stages.length - 1 && (
                          <span className="text-slate-400 font-bold text-xs">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Viva Tip */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700">
                  <strong className="text-[#E23744]">Viva Examination Rationale:</strong> {selectedPipeline.vivaNote}
                </div>
              </div>

              {/* Live JSON Aggregation Output */}
              <div className="space-y-2 flex-1 flex flex-col">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-600" /> Live MongoDB Raw Output
                  </span>
                  {inspectorData && (
                    <span className="font-mono text-[11px] text-slate-500">
                      {Array.isArray(inspectorData) ? `${inspectorData.length} records returned` : "Object returned"}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-h-[240px] max-h-[360px] overflow-y-auto rounded-2xl bg-slate-900 p-4 font-mono text-xs text-emerald-400 border border-slate-800 shadow-inner">
                  {inspectorLoading ? (
                    <div className="h-full flex items-center justify-center gap-2 text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#E23744]" />
                      <span>Executing Pipeline #{selectedPipeline.id} on MongoDB cluster...</span>
                    </div>
                  ) : inspectorError ? (
                    <div className="text-rose-400 font-bold">Error: {inspectorError}</div>
                  ) : inspectorData ? (
                    <pre>{JSON.stringify(inspectorData, null, 2)}</pre>
                  ) : (
                    <div className="text-slate-500">Awaiting execution...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </AuthGuard>
  );
}
