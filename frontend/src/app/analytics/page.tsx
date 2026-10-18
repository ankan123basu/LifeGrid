"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthGuard from "@/components/AuthGuard";

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
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineInfo>(PIPELINES_METADATA[0]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [liveData, setLiveData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Quick Overview Stats
  const [stockSummary, setStockSummary] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [cityDemand, setCityDemand] = useState<any[]>([]);

  useEffect(() => {
    loadOverviewData();
  }, []);

  useEffect(() => {
    executePipeline(selectedPipeline);
  }, [selectedPipeline]);

  async function loadOverviewData() {
    try {
      const [stock, leaders, cities] = await Promise.allSettled([
        api.getBloodStockByGroup(),
        api.getHospitalLeaderboard(5),
        api.getCityDemandSupply(),
      ]);
      if (stock.status === "fulfilled") setStockSummary(stock.value);
      if (leaders.status === "fulfilled") setLeaderboard(leaders.value);
      if (cities.status === "fulfilled") setCityDemand(cities.value);
    } catch (e) {
      console.error("Overview load error", e);
    }
  }

  async function executePipeline(p: PipelineInfo) {
    setLoading(true);
    setError(null);
    setLiveData(null);
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
      setLiveData(data);
    } catch (err: any) {
      setError(err.message || "Failed to execute pipeline.");
    } finally {
      setLoading(false);
    }
  }

  const filteredPipelines =
    activeCategory === "All"
      ? PIPELINES_METADATA
      : PIPELINES_METADATA.filter((p) => p.category === activeCategory);

  const totalStockUnits = stockSummary.reduce(
    (acc, s) => acc + (s.total_available ?? s.total_stock ?? 0),
    0
  );

  return (
    <AuthGuard allowedRoles={["ADMIN", "HOSPITAL_STAFF"]}>
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
        <Navbar />

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8">
          {/* Header Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-[#E23744] border border-red-200 rounded-full text-xs font-bold uppercase tracking-wider">
                <BarChart3 className="w-3.5 h-3.5" /> Emergency Network Analytics
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-slate-900">
                Clinical Logistics &amp; Stock Intelligence
              </h1>
              <p className="text-sm font-normal text-slate-600 max-w-2xl leading-relaxed">
                Real-time emergency benchmarks, donor retention cohorts, expiry forecasts, and regional supply indicators.
              </p>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shrink-0">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Pipelines
                </div>
                <div className="text-2xl font-black text-slate-900">15 / 15</div>
              </div>
              <div className="border-r border-slate-300 h-10" />
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  RBAC Role
                </div>
                <div className="text-sm font-extrabold text-emerald-600 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Authorized
                </div>
              </div>
            </div>
          </div>

          {/* KPI Highlights Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Blood Stock Highlight */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Live Stock Units
                </span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-extrabold">
                  Pipeline #1
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900">
                {totalStockUnits.toLocaleString()} <span className="text-sm font-semibold text-slate-500">Units</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {stockSummary.slice(0, 4).map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                  >
                    {s.blood_group}: {s.total_available ?? s.total_stock}
                  </span>
                ))}
              </div>
            </div>

            {/* Top Partner Hospital */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Leading Response Centre
                </span>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-extrabold">
                  Pipeline #8
                </span>
              </div>
              <div className="text-xl font-black text-slate-900 truncate">
                {leaderboard[0]?.hospital_name || "Riverside General Hospital"}
              </div>
              <div className="text-xs font-normal text-slate-600 flex items-center gap-3 pt-1">
                <span className="flex items-center gap-1 font-semibold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Fulfilment: {leaderboard[0]?.fulfilment_rate ?? "94%"}
                </span>
                <span>•</span>
                <span>Rating: ★ {leaderboard[0]?.rating ?? "4.9"}</span>
              </div>
            </div>

            {/* City Demand vs Supply */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Regional Deficit Watch
                </span>
                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-extrabold">
                  Pipeline #10
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {cityDemand.length > 0 ? `${cityDemand.length} Metro Hubs` : "7 Active Hubs"}
              </div>
              <div className="text-xs font-normal text-slate-600 flex items-center gap-1.5 pt-1">
                <MapPin className="w-3.5 h-3.5 text-[#E23744]" />
                <span>Delhi, Mumbai, Bengaluru, Chandigarh, Ludhiana</span>
              </div>
            </div>
          </div>

          {/* Interactive Pipeline Explorer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Pipeline Catalog (4 cols) */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter Pipelines:
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {["All", "Inventory", "Donations", "Logistics", "Network"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                        activeCategory === cat
                          ? "bg-slate-900 text-white font-extrabold"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable List */}
              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {filteredPipelines.map((p) => {
                  const isSelected = selectedPipeline.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPipeline(p)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-rose-50/60 border-[#E23744] shadow-sm ring-1 ring-red-200"
                          : "bg-white hover:bg-slate-50 border-slate-200/80"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#E23744]">
                          Pipeline #{p.id} • {p.category}
                        </span>
                        <ChevronRight
                          className={`w-3.5 h-3.5 transition-transform ${
                            isSelected ? "text-[#E23744] translate-x-1" : "text-slate-400"
                          }`}
                        />
                      </div>
                      <div className="font-extrabold text-xs text-slate-900 leading-snug">
                        {p.title}
                      </div>
                      <div className="text-[11px] font-normal text-slate-500 line-clamp-2 mt-1">
                        {p.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Execution View & Raw MongoDB Results (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Pipeline Details Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#E23744]">
                      Pipeline #{selectedPipeline.id} • {selectedPipeline.category}
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                      {selectedPipeline.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => executePipeline(selectedPipeline)}
                    disabled={loading}
                    className="px-4 py-2 bg-[#E23744] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-red-500/20 flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto disabled:opacity-50"
                  >
                    <Play className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    <span>{loading ? "Executing..." : "Re-Run Pipeline"}</span>
                  </button>
                </div>

                <p className="text-xs font-normal text-slate-600 leading-relaxed">
                  {selectedPipeline.description}
                </p>

                {/* Stages Flow */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    MongoDB Pipeline Stages:
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selectedPipeline.stages.map((stage, idx) => (
                      <React.Fragment key={idx}>
                        <span className="px-3 py-1 bg-slate-900 text-white font-mono text-xs font-bold rounded-lg shadow-xs">
                          {stage}
                        </span>
                        {idx < selectedPipeline.stages.length - 1 && (
                          <span className="text-slate-400 font-bold text-xs">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Clinical Engineering Note */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                  <div className="font-bold text-[#E23744] flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                    <Sparkles className="w-3.5 h-3.5" /> Clinical Intelligence Note:
                  </div>
                  <div className="text-slate-700 font-normal leading-relaxed">
                    {selectedPipeline.vivaNote}
                  </div>
                </div>
              </div>

              {/* Live Data Results Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600" /> Live Aggregation Feed
                  </span>
                  {liveData && (
                    <span className="text-xs font-semibold text-slate-500">
                      {Array.isArray(liveData)
                        ? `${liveData.length} records returned`
                        : "Object returned"}
                    </span>
                  )}
                </div>

                {loading ? (
                  <div className="h-64 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-xs font-bold text-slate-600 gap-2.5">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#E23744]" />
                    <span>Executing Pipeline #{selectedPipeline.id} on MongoDB...</span>
                  </div>
                ) : error ? (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#E23744]" />
                    <span>Error: {error}</span>
                  </div>
                ) : liveData ? (
                  <div className="max-h-[420px] overflow-y-auto rounded-2xl bg-slate-900 p-4 font-mono text-xs text-emerald-400 border border-slate-800">
                    <pre>{JSON.stringify(liveData, null, 2)}</pre>
                  </div>
                ) : (
                  <div className="h-48 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-xs font-medium text-slate-400">
                    Click Re-Run Pipeline to fetch live records.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
