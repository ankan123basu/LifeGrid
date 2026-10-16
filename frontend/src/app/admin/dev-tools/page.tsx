"use client";

import React, { useState } from "react";
import {
  Play,
  Sparkles,
  Terminal,
  Activity,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Copy,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  Clock,
  Database,
  Lock,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

const PRESET_PIPELINES: Record<
  string,
  { name: string; collection: string; pipeline: any[]; description: string }
> = {
  blood_stock: {
    name: "Pipeline #1: Blood Stock by Group ($group & $sum)",
    collection: "inventory",
    description: "Groups all hospital inventory by blood group and sums available units across India.",
    pipeline: [
      { $match: { units_available: { $gt: 0 } } },
      {
        $group: {
          _id: "$blood_group",
          total_units: { $sum: "$units_available" },
          hospital_count: { $addToSet: "$hospital_id" },
        },
      },
      {
        $project: {
          blood_group: "$_id",
          total_units: 1,
          hospitals_stocked: { $size: "$hospital_count" },
          _id: 0,
        },
      },
      { $sort: { total_units: -1 } },
    ],
  },
  shortages: {
    name: "Pipeline #2: Critical Shortages ($match & $lookup)",
    collection: "inventory",
    description: "Finds inventory items below threshold and enriches with hospital contact coordinates.",
    pipeline: [
      { $match: { units_available: { $lt: 5 } } },
      {
        $lookup: {
          from: "hospitals",
          localField: "hospital_id",
          foreignField: "_id",
          as: "hospital",
        },
      },
      { $unwind: "$hospital" },
      {
        $project: {
          hospital_name: "$hospital.name",
          city: "$hospital.city",
          blood_group: 1,
          component: 1,
          units_available: 1,
          _id: 0,
        },
      },
      { $sort: { units_available: 1 } },
    ],
  },
  top_donors: {
    name: "Pipeline #4: Top Donors with Tier ($switch & $bucket)",
    collection: "donations",
    description: "Aggregates completed donations per donor and calculates lifetime loyalty tiers using $switch.",
    pipeline: [
      { $match: { status: "COMPLETED" } },
      {
        $group: {
          _id: "$donor_id",
          total_units: { $sum: "$units_donated" },
          donation_count: { $sum: 1 },
        },
      },
      {
        $project: {
          donor_id: "$_id",
          total_units: 1,
          donation_count: 1,
          tier: {
            $switch: {
              branches: [
                { case: { $gte: ["$total_units", 15] }, then: "PLATINUM_SAVIOR" },
                { case: { $gte: ["$total_units", 8] }, then: "GOLD_GUARDIAN" },
                { case: { $gte: ["$total_units", 3] }, then: "SILVER_HERO" },
              ],
              default: "BRONZE_STARTER",
            },
          },
          _id: 0,
        },
      },
      { $sort: { total_units: -1 } },
      { $limit: 10 },
    ],
  },
  request_funnel: {
    name: "Pipeline #7: Request Funnel via $facet",
    collection: "blood_requests",
    description: "Runs multiple parallel sub-pipeline analyses in a single database pass using $facet.",
    pipeline: [
      {
        $facet: {
          by_status: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          by_urgency: [{ $group: { _id: "$urgency", count: { $sum: 1 } } }],
          by_blood_group: [{ $group: { _id: "$blood_group", total_units: { $sum: "$units_needed" } } }],
        },
      },
    ],
  },
  expiring_batches: {
    name: "Pipeline #9: Batches Expiring Soon ($unwind & $filter)",
    collection: "inventory",
    description: "Flattens nested expiry batch arrays with $unwind and identifies units expiring within 7 days.",
    pipeline: [
      { $unwind: "$expiry_batches" },
      {
        $project: {
          blood_group: 1,
          component: 1,
          batch_number: "$expiry_batches.batch_number",
          units: "$expiry_batches.units",
          expires_at: "$expiry_batches.expires_at",
        },
      },
      { $sort: { expires_at: 1 } },
      { $limit: 15 },
    ],
  },
};

export default function AdminDevToolsPage() {
  const { user, login } = useAuthStore();
  const [collection, setCollection] = useState("inventory");
  const [pipelineJson, setPipelineJson] = useState(
    JSON.stringify(PRESET_PIPELINES.blood_stock.pipeline, null, 2)
  );
  const [explainMode, setExplainMode] = useState(true);
  const [sandboxMode, setSandboxMode] = useState(false);

  // Natural Language Gen State
  const [nlPrompt, setNlPrompt] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [aiRationale, setAiRationale] = useState<string | null>(null);

  // Execution State
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [adminLoggingIn, setAdminLoggingIn] = useState(false);

  // Preset Selector
  function handleSelectPreset(key: string) {
    const preset = PRESET_PIPELINES[key];
    if (preset) {
      setCollection(preset.collection);
      setPipelineJson(JSON.stringify(preset.pipeline, null, 2));
      setAiRationale(preset.description);
    }
  }

  // Quick Login as Admin for testing
  async function handleQuickAdminLogin() {
    setAdminLoggingIn(true);
    try {
      await login("admin@lifegrid.in", "AdminPassword@123");
    } catch (e: any) {
      alert("Failed admin login: " + e.message);
    } finally {
      setAdminLoggingIn(false);
    }
  }

  // Natural Language to Pipeline
  async function handleGeneratePipeline() {
    if (!nlPrompt.trim()) return;
    setNlLoading(true);
    setErrorMsg(null);
    try {
      const res: any = await api.aiQueryLabGenerate(nlPrompt);
      if (res.success && res.data) {
        if (res.data.collection) setCollection(res.data.collection);
        if (res.data.pipeline) {
          setPipelineJson(JSON.stringify(res.data.pipeline, null, 2));
        }
        setAiRationale(res.data.explanation || res.data.description || "Generated by AI Engine.");
      }
    } catch (e: any) {
      setErrorMsg("Failed to generate pipeline: " + e.message);
    } finally {
      setNlLoading(false);
    }
  }

  // Execute Pipeline
  async function handleExecute() {
    setErrorMsg(null);
    setExecResult(null);

    let parsedPipeline: any[];
    try {
      parsedPipeline = JSON.parse(pipelineJson);
      if (!Array.isArray(parsedPipeline)) {
        throw new Error("Aggregation pipeline must be a valid JSON Array of stages [ { ... } ].");
      }
    } catch (err: any) {
      setErrorMsg("Invalid JSON syntax: " + err.message);
      return;
    }

    setExecuting(true);
    try {
      const res: any = await api.executeQueryLab(collection, parsedPipeline, explainMode, sandboxMode);
      if (res.success && res.data) {
        setExecResult(res.data);
      } else {
        setErrorMsg(res.error || "Execution failed.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to execute pipeline.");
    } finally {
      setExecuting(false);
    }
  }

  // Helper to detect index scan vs collection scan from explain output
  function analyzeExplainPlan(explain: any) {
    if (!explain) return null;
    const str = JSON.stringify(explain);
    const isIxScan = str.includes("IXSCAN") || str.includes("FETCH");
    const isCollScan = str.includes("COLLSCAN");
    const nReturned = explain.executionStats?.nReturned ?? explain.stages?.[0]?.$cursor?.executionStats?.nReturned;
    const executionTimeMillis = explain.executionStats?.executionTimeMillis ?? explain.stages?.[0]?.$cursor?.executionStats?.executionTimeMillis;
    const totalDocsExamined = explain.executionStats?.totalDocsExamined ?? explain.stages?.[0]?.$cursor?.executionStats?.totalDocsExamined;

    return {
      isIxScan,
      isCollScan,
      nReturned,
      executionTimeMillis,
      totalDocsExamined,
    };
  }

  const explainAnalysis = execResult?.explain ? analyzeExplainPlan(execResult.explain) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="bg-[#7CD4FF] border-4 border-black p-6 mb-8 shadow-[6px_6px_0px_0px_#000]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-[#7CD4FF] font-mono text-xs font-black uppercase mb-2">
              <Terminal className="w-3.5 h-3.5" /> Admin Diagnostics &amp; Dev Tools
            </div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-black">
              Database Diagnostics &amp; Query Workbench
            </h1>
            <p className="text-black font-medium mt-1">
              Internal query optimization workbench, explain plan inspector, and database telemetry analyzer.
            </p>
          </div>

          {/* Quick Admin Auth Status */}
          <div className="bg-white border-3 border-black p-4 shadow-[3px_3px_0px_0px_#000] flex flex-col justify-between">
            <div className="text-[11px] font-mono uppercase font-bold text-gray-600 mb-1">
              Admin Privilege Status
            </div>
            {user?.role === "ADMIN" ? (
              <div className="flex items-center gap-2 text-emerald-600 font-mono font-black text-sm">
                <ShieldCheck className="w-4 h-4" /> ADMIN (Active)
              </div>
            ) : (
              <button
                onClick={handleQuickAdminLogin}
                disabled={adminLoggingIn}
                className="px-3 py-1.5 bg-[#FFE600] hover:bg-yellow-400 border-2 border-black font-mono font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] cursor-pointer flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                {adminLoggingIn ? "Logging in..." : "Quick Admin Login"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI Query Compiler */}
      <div className="bg-white border-3 border-black p-6 mb-8 shadow-[6px_6px_0px_0px_#000]">
        <div className="flex items-center gap-2 font-black uppercase text-base mb-2">
          <Sparkles className="w-5 h-5 text-amber-500" /> Natural Language Query Compiler
        </div>
        <p className="text-xs text-gray-700 font-medium mb-3">
          Type an administrative inquiry in plain English to compile into an optimized query pipeline:
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={nlPrompt}
            onChange={(e) => setNlPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGeneratePipeline()}
            placeholder="Type your plain English query here..."
            className="flex-1 px-4 py-3 border-3 border-black font-mono text-sm bg-neutral-50 focus:outline-none focus:bg-white"
          />
          <button
            onClick={handleGeneratePipeline}
            disabled={nlLoading || !nlPrompt.trim()}
            className="px-6 py-3 bg-[#FFE600] hover:bg-yellow-400 border-3 border-black font-black uppercase text-sm shadow-[3px_3px_0px_0px_#000] cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {nlLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Compile Query
          </button>
        </div>

        {aiRationale && (
          <div className="mt-4 p-3 bg-[#F4F1EA] border-2 border-black font-mono text-xs">
            <span className="font-bold text-indigo-700">Query Plan Rationale:</span> {aiRationale}
          </div>
        )}
      </div>

      {/* Main Workbench Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Editor Controls & JSON */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border-3 border-black p-6 shadow-[6px_6px_0px_0px_#000] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-4">
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase text-gray-600 mb-1">
                  Target Collection
                </label>
                <select
                  value={collection}
                  onChange={(e) => setCollection(e.target.value)}
                  className="border-2 border-black px-3 py-1.5 font-mono font-bold bg-[#F4F1EA]"
                >
                  <option value="inventory">inventory</option>
                  <option value="blood_requests">blood_requests</option>
                  <option value="donations">donations</option>
                  <option value="hospitals">hospitals</option>
                  <option value="users">users</option>
                  <option value="audit_logs">audit_logs</option>
                  <option value="ai_usage_logs">ai_usage_logs</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase text-gray-600 mb-1">
                  Load Analytics Template
                </label>
                <select
                  onChange={(e) => handleSelectPreset(e.target.value)}
                  defaultValue="blood_stock"
                  className="border-2 border-black px-3 py-1.5 font-mono font-bold bg-[#FFE600]"
                >
                  <option value="blood_stock">Template #1: Blood Stock</option>
                  <option value="shortages">Template #2: Critical Shortages</option>
                  <option value="top_donors">Template #4: Top Donors Loyalty</option>
                  <option value="request_funnel">Template #7: Request Funnel</option>
                  <option value="expiring_batches">Template #9: Expiring Batches</option>
                </select>
              </div>
            </div>

            {/* Pipeline Stage JSON Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono font-bold uppercase flex items-center gap-1.5">
                  <Layers className="w-4 h-4" /> Pipeline Stage Array (JSON)
                </label>
                <span className="text-[10px] font-mono text-gray-500">
                  Read-only guard active: destructive writes blocked unless sandbox
                </span>
              </div>
              <textarea
                rows={14}
                value={pipelineJson}
                onChange={(e) => setPipelineJson(e.target.value)}
                className="w-full p-4 border-3 border-black font-mono text-xs bg-neutral-900 text-[#2EE59D] focus:outline-none focus:ring-2 focus:ring-[#FFE600]"
              />
            </div>

            {/* Execution Options & Run Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-mono text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={explainMode}
                    onChange={(e) => setExplainMode(e.target.checked)}
                    className="w-4 h-4 accent-black"
                  />
                  Explain Plan (.explain)
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-mono text-xs font-bold text-red-600">
                  <input
                    type="checkbox"
                    checked={sandboxMode}
                    onChange={(e) => setSandboxMode(e.target.checked)}
                    className="w-4 h-4 accent-red-600"
                  />
                  Sandbox Mode
                </label>
              </div>

              <button
                onClick={handleExecute}
                disabled={executing}
                className="px-6 py-3 bg-[#2EE59D] hover:bg-emerald-400 border-3 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_#000] cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {executing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-black" />
                )}
                Execute Query
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-100 border-2 border-black text-red-700 font-mono text-xs font-bold flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Execution Stats & Results */}
        <div className="lg:col-span-5 space-y-4">
          {/* Explain Plan Telemetry */}
          {execResult && (
            <div className="bg-white border-3 border-black p-5 shadow-[6px_6px_0px_0px_#000] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black uppercase text-sm flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-indigo-600" /> Execution Metrics
                </span>
                <span className="px-2 py-0.5 bg-neutral-100 border border-black font-mono text-xs font-bold">
                  {execResult.count} Docs Returned
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border-2 border-black p-2.5 bg-[#F4F1EA]">
                  <div className="text-[10px] font-mono uppercase text-gray-600 font-bold">Time Elapsed</div>
                  <div className="text-xl font-black font-mono text-indigo-700">
                    {execResult.execution_time_ms} ms
                  </div>
                </div>

                <div className="border-2 border-black p-2.5 bg-[#F4F1EA]">
                  <div className="text-[10px] font-mono uppercase text-gray-600 font-bold">Execution Strategy</div>
                  {explainAnalysis?.isIxScan ? (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-300 border border-black font-mono text-xs font-black text-emerald-900">
                      IXSCAN (Indexed)
                    </span>
                  ) : explainAnalysis?.isCollScan ? (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-amber-300 border border-black font-mono text-xs font-black text-amber-900">
                      COLLSCAN (Scan)
                    </span>
                  ) : (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-neutral-200 border border-black font-mono text-xs font-black">
                      PIPELINE STAGE
                    </span>
                  )}
                </div>
              </div>

              {execResult.explain && (
                <details className="mt-2 text-xs font-mono">
                  <summary className="font-bold cursor-pointer text-indigo-700 hover:underline">
                    View Explain Document
                  </summary>
                  <pre className="mt-2 p-3 bg-neutral-900 text-neutral-300 max-h-48 overflow-y-auto border border-black text-[11px]">
                    {JSON.stringify(execResult.explain, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Results Display */}
          <div className="bg-white border-3 border-black p-5 shadow-[6px_6px_0px_0px_#000]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-black uppercase text-sm flex items-center gap-1.5">
                <Database className="w-4 h-4" /> Query Output
              </span>
              {execResult && (
                <button
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(execResult.results, null, 2))}
                  className="px-2 py-1 bg-[#F4F1EA] hover:bg-[#FFE600] border border-black font-mono text-xs font-bold cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy JSON
                </button>
              )}
            </div>

            {execResult ? (
              <div className="max-h-[450px] overflow-y-auto border-2 border-black bg-neutral-950 p-4 font-mono text-xs text-[#7CD4FF]">
                <pre>{JSON.stringify(execResult.results, null, 2)}</pre>
              </div>
            ) : (
              <div className="h-64 border-2 border-dashed border-black flex flex-col items-center justify-center p-6 text-center text-gray-500 font-mono text-xs">
                <Play className="w-8 h-8 mb-2 opacity-40 text-black" />
                Configure query stages on the left and click &quot;Execute Query&quot; to test.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
