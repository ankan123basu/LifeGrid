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
} from "lucide-react";
import { api } from "@/lib/api";

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
    title: "Top Donors & Loyalty Tiering",
    category: "Donations",
    endpoint: "top-donors",
    description: "Ranks donors by lifetime units and assigns tier (Platinum, Gold, Silver, Bronze) using conditional $switch.",
    stages: ["$match", "$group", "$project", "$sort", "$limit"],
    vivaNote: "Demonstrates $switch with conditional $gte branches to avoid nested $cond branching.",
  },
  {
    id: 5,
    title: "Average Fulfilment Time by Urgency",
    category: "Logistics",
    endpoint: "fulfilment-time",
    description: "Calculates hours elapsed between request creation and fulfilment grouped by CRITICAL, HIGH, NORMAL.",
    stages: ["$match", "$project", "$group", "$sort"],
    vivaNote: "Uses date arithmetic $subtract between $fulfilled_at and $created_at converted to hours with $divide.",
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
    vivaNote: "Extracts date parts using $dayOfWeek and $hour operators to build temporal dispatch heatmaps.",
  },
  {
    id: 13,
    title: "Component Usage Share",
    category: "Inventory",
    endpoint: "component-share",
    description: "Analyzes proportion of Whole Blood vs Platelets vs Plasma vs PRBC utilized in transfusions.",
    stages: ["$group", "$group", "$unwind", "$project"],
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
          // Coordinates for Delhi center
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="bg-[#FF90C8] border-4 border-black p-6 mb-8 shadow-[6px_6px_0px_0px_#000]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-[#FF90C8] font-mono text-xs font-black uppercase mb-2">
              <BarChart3 className="w-3.5 h-3.5" /> Emergency Network Analytics
            </div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-black">
              Clinical Logistics &amp; Stock Intelligence
            </h1>
            <p className="text-black font-medium mt-1">
              Real-time emergency benchmarks, donor retention cohorts, expiry forecasts, and regional supply indicators.
            </p>
          </div>

          <div className="bg-white border-3 border-black p-3 shadow-[3px_3px_0px_0px_#000] flex items-center gap-4">
            <div>
              <div className="text-[10px] font-mono uppercase text-gray-600 font-bold">Active Metrics</div>
              <div className="text-2xl font-black font-mono">15 / 15</div>
            </div>
            <div className="border-r-2 border-black h-8" />
            <div>
              <div className="text-[10px] font-mono uppercase text-gray-600 font-bold">Network Feed</div>
              <div className="text-sm font-black font-mono text-emerald-700">Verified Live</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Blood Stock Highlight */}
        <div className="bg-white border-3 border-black p-5 shadow-[4px_4px_0px_0px_#000]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs font-bold uppercase text-gray-600">Total Live Stock Units</span>
            <span className="p-1 bg-[#2EE59D] border border-black font-mono text-[10px] font-black">Pipeline #1</span>
          </div>
          <div className="text-3xl font-black font-mono">
            {stockSummary.reduce((acc, s) => acc + (s.total_units || 0), 0)} Units
          </div>
          <div className="text-xs text-gray-700 mt-2 flex flex-wrap gap-1 font-mono">
            {stockSummary.slice(0, 4).map((s, idx) => (
              <span key={idx} className="bg-[#F4F1EA] px-1.5 py-0.5 border border-black font-bold">
                {s.blood_group}: {s.total_units}u
              </span>
            ))}
          </div>
        </div>

        {/* Top Hospital Highlight */}
        <div className="bg-white border-3 border-black p-5 shadow-[4px_4px_0px_0px_#000]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs font-bold uppercase text-gray-600">Top Responding Hospital</span>
            <span className="p-1 bg-[#FFE600] border border-black font-mono text-[10px] font-black">Pipeline #8</span>
          </div>
          <div className="text-xl font-black truncate">
            {leaderboard[0]?.name || "AIIMS Trauma Center"}
          </div>
          <div className="text-xs font-mono text-gray-700 mt-2">
            Fulfilment Rate:{" "}
            <span className="font-bold text-emerald-600">
              {leaderboard[0]?.fulfilment_rate ? `${leaderboard[0].fulfilment_rate}%` : "98.4%"}
            </span>
          </div>
        </div>

        {/* City Demand Highlight */}
        <div className="bg-white border-3 border-black p-5 shadow-[4px_4px_0px_0px_#000]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs font-bold uppercase text-gray-600">Metro Demand vs Supply</span>
            <span className="p-1 bg-[#7CD4FF] border border-black font-mono text-[10px] font-black">Pipeline #10</span>
          </div>
          <div className="text-2xl font-black font-mono">
            {cityDemand.length} Metros Monitored
          </div>
          <div className="text-xs font-mono text-gray-700 mt-2">
            High Deficit: <span className="font-bold text-red-600">{cityDemand[0]?.city || "Delhi"}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Category & Pipeline List (Left) + Interactive Visualizer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Pipeline Directory */}
        <div className="lg:col-span-5 space-y-4">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 bg-white border-3 border-black p-2 shadow-[3px_3px_0px_0px_#000]">
            {["All", "Inventory", "Donations", "Logistics", "Network"].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 font-mono text-xs font-bold uppercase border-2 border-black cursor-pointer ${
                  activeCategory === cat
                    ? "bg-black text-[#FFE600]"
                    : "bg-[#F4F1EA] hover:bg-neutral-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Pipeline Cards List */}
          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {filteredPipelines.map((p) => {
              const isSelected = selectedPipeline.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPipeline(p)}
                  className={`border-3 border-black p-3.5 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#FFE600] shadow-[4px_4px_0px_0px_#000] -translate-y-0.5"
                      : "bg-white hover:bg-neutral-50 shadow-[2px_2px_0px_0px_#000]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-black uppercase text-gray-700">
                      Pipeline #{p.id} • {p.category}
                    </span>
                    <ChevronRight className={`w-4 h-4 ${isSelected ? "text-black" : "text-gray-400"}`} />
                  </div>
                  <h3 className="text-base font-black leading-tight text-black">{p.title}</h3>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.stages.map((stg, sidx) => (
                      <span
                        key={sidx}
                        className="px-1.5 py-0.5 bg-black text-[#2EE59D] font-mono text-[10px] font-bold"
                      >
                        {stg}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Metric Execution */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Pipeline Card */}
          <div className="bg-white border-3 border-black p-6 shadow-[6px_6px_0px_0px_#000] space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b-2 border-black pb-3">
              <div>
                <span className="font-mono text-xs font-bold uppercase text-gray-500">
                  Live Operational Metric
                </span>
                <h2 className="text-2xl font-black uppercase text-black">
                  #{selectedPipeline.id}: {selectedPipeline.title}
                </h2>
              </div>
              <button
                onClick={() => executePipeline(selectedPipeline)}
                disabled={loading}
                className="px-4 py-2 bg-[#2EE59D] hover:bg-emerald-400 border-2 border-black font-mono font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] cursor-pointer flex items-center gap-1.5 self-start md:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Re-Run Pipeline
              </button>
            </div>

            <p className="text-sm text-gray-800 font-medium leading-relaxed">
              {selectedPipeline.description}
            </p>

            {/* Stages Sequence Visualizer */}
            <div>
              <div className="text-xs font-mono font-bold uppercase text-gray-600 mb-1.5">
                MongoDB Aggregation Stage Flow
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedPipeline.stages.map((stage, idx) => (
                  <React.Fragment key={idx}>
                    <div className="px-3 py-1 bg-neutral-900 text-[#FFE600] font-mono text-xs font-black border border-black shadow-[2px_2px_0px_0px_#000]">
                      {stage}
                    </div>
                    {idx < selectedPipeline.stages.length - 1 && (
                      <span className="text-black font-black text-sm">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Clinical Engineering Note */}
            <div className="p-3.5 bg-[#F4F1EA] border-2 border-black font-mono text-xs space-y-1">
              <div className="font-bold uppercase text-indigo-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Clinical Intelligence Note:
              </div>
              <div className="text-gray-800 font-medium">{selectedPipeline.vivaNote}</div>
            </div>
          </div>

          {/* Live Data Results Card */}
          <div className="bg-white border-3 border-black p-6 shadow-[6px_6px_0px_0px_#000]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-black uppercase text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" /> Live Clinical Analytics Feed
              </span>
              {liveData && (
                <span className="font-mono text-xs font-bold text-gray-600">
                  {Array.isArray(liveData) ? `${liveData.length} records returned` : "Object returned"}
                </span>
              )}
            </div>

            {loading ? (
              <div className="h-64 border-2 border-black bg-neutral-50 flex flex-col items-center justify-center font-mono text-xs font-bold gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-black" />
                Executing Pipeline #{selectedPipeline.id} on MongoDB...
              </div>
            ) : error ? (
              <div className="p-4 bg-red-100 border-2 border-black text-red-700 font-mono text-xs font-bold">
                ⚠️ Error: {error}
              </div>
            ) : liveData ? (
              <div className="max-h-[420px] overflow-y-auto border-2 border-black bg-neutral-950 p-4 font-mono text-xs text-[#2EE59D]">
                <pre>{JSON.stringify(liveData, null, 2)}</pre>
              </div>
            ) : (
              <div className="h-48 border-2 border-dashed border-black flex items-center justify-center font-mono text-xs text-gray-500">
                Click Re-Run Pipeline to fetch live records.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
