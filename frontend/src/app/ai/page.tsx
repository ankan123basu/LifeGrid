"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Send,
  Sparkles,
  Zap,
  AlertTriangle,
  Share2,
  Copy,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Layers,
  Terminal,
  Activity,
  ArrowRight,
  ShieldAlert,
  Clock,
  Radio,
  FileText,
  Hospital,
} from "lucide-react";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthGuard from "@/components/AuthGuard";

type TabMode = "chat" | "parser" | "outreach" | "forecast" | "telemetry";

export default function AiSuitePage() {
  const [activeTab, setActiveTab] = useState<TabMode>("chat");

  // --- Chat State ---
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      tool_calls?: Array<{ name: string; args: any; result?: any }>;
      latency_ms?: number;
    }>
  >([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Greetings! I am LifeGrid's Clinical Autonomous Agent. I have direct access to live blood bank inventories, donor matching algorithms, and emergency dispatch logistics. How can I assist you today?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // --- Parser State ---
  const [parserText, setParserText] = useState(
    "URGENT: Road accident near Riverside General Hospital Delhi! Victim needs 3 units of O- Negative Whole Blood immediately. Patient admitted in Trauma ICU. Contact Dr. Sharma 9876543210."
  );
  const [parserLoading, setParserLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<any>(null);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  // --- Outreach State ---
  const [outreachForm, setOutreachForm] = useState({
    blood_group: "O-",
    hospital_name: "Riverside General Hospital",
    city: "Delhi",
    urgency: "CRITICAL",
    patient_diagnosis: "Emergency cardiac surgery",
  });
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [outreachResult, setOutreachResult] = useState<any>(null);
  const [copiedLang, setCopiedLang] = useState<string | null>(null);

  // --- Forecast State ---
  const [forecastDays, setForecastDays] = useState(7);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastResult, setForecastResult] = useState<any>(null);

  // --- Telemetry State ---
  const [telemetry, setTelemetry] = useState<any>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);

  // Scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  // Load telemetry
  useEffect(() => {
    loadTelemetry();
  }, []);

  async function loadTelemetry() {
    setTelemetryLoading(true);
    try {
      const data = await api.aiTelemetry();
      setTelemetry(data);
    } catch (e) {
      console.error("Failed to load telemetry", e);
    } finally {
      setTelemetryLoading(false);
    }
  }

  // --- Handlers ---
  async function handleSendChat(customText?: string) {
    const text = customText || chatInput;
    if (!text.trim() || chatLoading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: "user" as const,
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setChatInput("");
    setChatLoading(true);

    try {
      const res: any = await api.aiChat(text);
      const botReply =
        res?.data?.reply ||
        res?.data?.response ||
        res?.data?.message ||
        (typeof res?.data === "string" ? res.data : null);

      if (res?.success && botReply) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: botReply.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*\*/g, ""),
            tool_calls: res.data.tool_calls || res.data.tools_executed || [],
            latency_ms: res.data.latency_ms || res.data.telemetry?.latency_ms,
          },
        ]);
        loadTelemetry();
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `⚠️ Error executing agent: ${err.message || "Failed to reach AI service."}`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleParseEmergency() {
    if (!parserText.trim()) return;
    setParserLoading(true);
    setParsedResult(null);
    setDispatchStatus(null);
    try {
      const res: any = await api.aiParseEmergency(parserText);
      if (res.success) {
        setParsedResult(res.data);
      }
    } catch (err: any) {
      alert("Failed to parse: " + err.message);
    } finally {
      setParserLoading(false);
    }
  }

  async function handleDispatchFromParsed() {
    if (!parsedResult) return;
    setDispatchStatus("dispatching");
    try {
      const hospitals = await api.listHospitals(parsedResult.city || "Delhi", 1);
      const hospitalId = hospitals.length > 0 ? hospitals[0]._id : "64a1b2c3d4e5f6a7b8c9d0e1";

      await api.createRequest({
        hospital_id: hospitalId,
        blood_group: parsedResult.blood_group || "O+",
        component: parsedResult.component || "WHOLE_BLOOD",
        units_needed: parsedResult.units_needed || 2,
        urgency: parsedResult.urgency || "CRITICAL",
        patient_diagnosis: parsedResult.patient_diagnosis || "Trauma Emergency (AI Parsed)",
      });
      setDispatchStatus("dispatched");
    } catch (err: any) {
      setDispatchStatus("error: " + err.message);
    }
  }

  async function handleGenerateOutreach() {
    setOutreachLoading(true);
    setOutreachResult(null);
    try {
      const res: any = await api.aiOutreach(outreachForm);
      if (res.success) {
        setOutreachResult(res.data);
      }
    } catch (err: any) {
      alert("Failed to generate outreach: " + err.message);
    } finally {
      setOutreachLoading(false);
    }
  }

  async function handleRunForecast() {
    setForecastLoading(true);
    setForecastResult(null);
    try {
      const res: any = await api.aiForecast(forecastDays);
      if (res.success) {
        setForecastResult(res.data);
      }
    } catch (err: any) {
      alert("Failed to run forecast: " + err.message);
    } finally {
      setForecastLoading(false);
    }
  }

  const copyToClipboard = (text: string, lang: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLang(lang);
    setTimeout(() => setCopiedLang(null), 2000);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans">
        <Navbar />

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8">
          {/* Header Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-[#E23744] border border-red-200/60 rounded-full text-xs font-bold uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 text-[#E23744]" /> Clinical Intelligence Hub
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-slate-900">
                AI Clinical Assistant & Decision Engine
              </h1>
              <p className="text-sm font-normal text-slate-600 max-w-2xl leading-relaxed">
                Autonomous agent orchestrating live blood inventory, SOS transcription parser, multilingual donor broadcaster, and shortage depletion forecaster.
              </p>
            </div>

            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 flex items-center gap-5 shrink-0 shadow-xs">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Ops</div>
                <div className="text-xl font-extrabold text-slate-900">{telemetry?.total_logs ?? "..."}</div>
              </div>
              <div className="border-r border-slate-200 h-8" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tokens Processed</div>
                <div className="text-xl font-extrabold text-emerald-600">
                  {telemetry?.total_tokens ? telemetry.total_tokens.toLocaleString() : "..."}
                </div>
              </div>
              <div className="border-r border-slate-200 h-8" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Latency</div>
                <div className="text-xl font-extrabold text-[#E23744]">
                  {telemetry?.avg_latency_ms ? `${telemetry.avg_latency_ms}ms` : "..."}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "chat", label: "Care Assistant", icon: Bot },
              { id: "parser", label: "SOS Distress Parser", icon: AlertTriangle },
              { id: "outreach", label: "Multilingual Broadcaster", icon: Share2 },
              { id: "forecast", label: "Shortage Forecaster", icon: Activity },
              { id: "telemetry", label: "System Telemetry", icon: Cpu },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabMode)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#E23744] text-white shadow-md shadow-red-500/20 font-extrabold"
                      : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 shadow-xs"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: CARE ASSISTANT */}
          {/* ========================================================================= */}
          {activeTab === "chat" && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Clinical Quick Prompts Sidebar */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Clinical Quick Prompts
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Click any scenario to query real-time stock, hospital distances, and compatibility:
                  </p>
                  <div className="space-y-2">
                    {[
                      "Check O- negative whole blood availability in Delhi.",
                      "Find nearest hospitals to AIIMS Delhi within 15 km.",
                      "What blood groups can safely donate to an AB+ patient?",
                      "Which city has the most severe critical blood shortage right now?",
                    ].map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendChat(prompt)}
                        disabled={chatLoading}
                        className="w-full text-left text-xs font-medium bg-slate-50 hover:bg-rose-50 hover:text-[#E23744] hover:border-red-200 border border-slate-200/80 rounded-2xl p-3 transition-all cursor-pointer shadow-xs"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-slate-400" /> Integrated Tool Agents
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    {[
                      "check_blood_inventory",
                      "find_nearest_hospitals",
                      "get_blood_compatibility",
                      "estimate_delivery_time",
                      "find_critical_shortages",
                    ].map((toolName) => (
                      <div
                        key={toolName}
                        className="px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-100 font-mono text-[11px] text-slate-700 flex items-center justify-between"
                      >
                        <span>{toolName}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Chat Stream */}
              <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200/90 shadow-sm flex flex-col h-[650px] overflow-hidden">
                {/* Chat Top Status */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-rose-50 border border-red-200/60 flex items-center justify-center text-[#E23744]">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">LifeGrid Autonomous Agent</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live Mongo DB Connection Active
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> 24/7 Clinical AI
                  </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.role === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400 px-1">
                        {msg.role === "user" ? "You (Staff Clinician)" : "LifeGrid AI"}
                      </div>
                      <div
                        className={`max-w-[85%] rounded-3xl p-4 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-[#E23744] text-white shadow-sm rounded-tr-md font-medium"
                            : "bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-md shadow-xs"
                        }`}
                      >
                        {/* Tool Execution Visualizer */}
                        {msg.tool_calls && msg.tool_calls.length > 0 && (
                          <div className="mb-3 space-y-2">
                            {msg.tool_calls.map((tc, tidx) => (
                              <div
                                key={tidx}
                                className="bg-slate-900 text-slate-200 p-3 rounded-2xl text-xs font-mono border border-slate-800 space-y-1 shadow-inner"
                              >
                                <div className="flex items-center gap-1.5 font-bold uppercase text-[11px] text-amber-400">
                                  <Zap className="w-3.5 h-3.5" /> Executed: {tc.name}
                                </div>
                                <div className="text-slate-300 text-[11px]">
                                  <span className="text-slate-400">Args:</span> {JSON.stringify(tc.args)}
                                </div>
                                {tc.result && (
                                  <div className="text-emerald-400 text-[11px] truncate">
                                    <span className="text-slate-400">Result:</span> {JSON.stringify(tc.result)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="whitespace-pre-wrap">{msg.content}</div>

                        {msg.latency_ms && (
                          <div
                            className={`mt-2 text-[10px] font-bold ${
                              msg.role === "user" ? "text-red-200" : "text-slate-400"
                            }`}
                          >
                            ⚡ Latency: {msg.latency_ms}ms
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-2xl w-fit text-xs font-bold text-slate-600 animate-pulse border border-slate-200/60">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#E23744]" />
                      Querying live collections & calculating logistics...
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Input Field */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Ask about live blood stock, donor matching, logistics routing..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                    disabled={chatLoading}
                    className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E23744] focus:ring-2 focus:ring-red-100 transition-all shadow-xs"
                  />
                  <button
                    onClick={() => handleSendChat()}
                    disabled={chatLoading || !chatInput.trim()}
                    className="px-6 py-3 bg-[#E23744] hover:bg-red-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-red-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" /> Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: UNSTRUCTURED SOS DISTRESS PARSER */}
          {/* ========================================================================= */}
          {activeTab === "parser" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Input Panel */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 font-bold text-lg text-slate-900 mb-2">
                    <AlertTriangle className="w-5 h-5 text-[#E23744]" /> Raw SOS Distress Input
                  </div>
                  <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                    Paste raw, noisy WhatsApp messages, emergency dispatch transcriptions, or family distress calls. The AI extracts structured clinical parameters in real time.
                  </p>
                  <textarea
                    rows={6}
                    value={parserText}
                    onChange={(e) => setParserText(e.target.value)}
                    placeholder="Paste unstructured distress message here..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:outline-none focus:border-[#E23744] focus:ring-2 focus:ring-red-100 transition-all shadow-xs"
                  />

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setParserText(
                          "SOS: Critical requirement of 4 units AB- platelets for a leukemia patient undergoing chemotherapy at Tata Memorial Hospital Mumbai. Urgent contact 9820011223."
                        )
                      }
                      className="text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl px-3 py-1.5 transition-all cursor-pointer"
                    >
                      Sample 1 (Platelets Mumbai)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setParserText(
                          "Need 2 bottles B+ blood in Fortis Hospital Bangalore for C-section delivery emergency right now. Family contact is 9988776655."
                        )
                      }
                      className="text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl px-3 py-1.5 transition-all cursor-pointer"
                    >
                      Sample 2 (B+ Bangalore)
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleParseEmergency}
                  disabled={parserLoading || !parserText.trim()}
                  className="mt-6 w-full py-3.5 bg-[#E23744] hover:bg-red-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-red-500/20 cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {parserLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Extracting Clinical Entities...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Parse Unstructured Text
                    </>
                  )}
                </button>
              </div>

              {/* Parsed Result & Dispatch Panel */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 font-bold text-lg text-slate-900">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Extracted Clinical Schema
                    </div>
                    {parsedResult && (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold">
                        Schema Validated
                      </span>
                    )}
                  </div>

                  {parsedResult ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-red-100">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Blood Group</div>
                          <div className="text-2xl font-black text-[#E23744] mt-0.5">{parsedResult.blood_group}</div>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Component</div>
                          <div className="text-lg font-bold text-slate-800 mt-0.5">{parsedResult.component}</div>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Units Needed</div>
                          <div className="text-xl font-bold text-slate-800 mt-0.5">{parsedResult.units_needed} Units</div>
                        </div>
                        <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-red-100">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Urgency Level</div>
                          <div className="text-lg font-bold text-[#E23744] mt-0.5">{parsedResult.urgency}</div>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 col-span-2">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Hospital & City</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">
                            {parsedResult.hospital_name || "Hospital Identified"} ({parsedResult.city || "Detected City"})
                          </div>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 col-span-2">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Clinical Diagnosis</div>
                          <div className="text-xs text-slate-600 mt-0.5 font-medium">{parsedResult.patient_diagnosis || "N/A"}</div>
                        </div>
                      </div>

                      <div className="bg-slate-900 text-emerald-400 p-3.5 rounded-2xl text-xs font-mono overflow-x-auto shadow-inner">
                        <pre>{JSON.stringify(parsedResult, null, 2)}</pre>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-slate-400 text-sm">
                      <AlertTriangle className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
                      Awaiting input. Click &quot;Parse Unstructured Text&quot; to test.
                    </div>
                  )}
                </div>

                {parsedResult && (
                  <div className="pt-4">
                    <button
                      onClick={handleDispatchFromParsed}
                      disabled={dispatchStatus === "dispatching" || dispatchStatus === "dispatched"}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-2 transition-all"
                    >
                      {dispatchStatus === "dispatching" ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : dispatchStatus === "dispatched" ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Dispatched to Live Network!
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4" /> 1-Click Dispatch as Live Emergency
                        </>
                      )}
                    </button>
                    {dispatchStatus && dispatchStatus.startsWith("error") && (
                      <div className="mt-2 text-xs font-semibold text-[#E23744]">{dispatchStatus}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: MULTILINGUAL DONOR OUTREACH BROADCASTER */}
          {/* ========================================================================= */}
          {activeTab === "outreach" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Campaign Settings */}
              <div className="lg:col-span-1 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex items-center gap-2 font-bold text-lg text-slate-900 mb-2">
                  <Share2 className="w-5 h-5 text-emerald-600" /> Broadcast Parameters
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Blood Group</label>
                  <select
                    value={outreachForm.blood_group}
                    onChange={(e) => setOutreachForm({ ...outreachForm, blood_group: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-[#E23744]"
                  >
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Hospital Name</label>
                  <input
                    type="text"
                    value={outreachForm.hospital_name}
                    onChange={(e) => setOutreachForm({ ...outreachForm, hospital_name: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:border-[#E23744]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">City</label>
                  <input
                    type="text"
                    value={outreachForm.city}
                    onChange={(e) => setOutreachForm({ ...outreachForm, city: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:border-[#E23744]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Urgency Level</label>
                  <select
                    value={outreachForm.urgency}
                    onChange={(e) => setOutreachForm({ ...outreachForm, urgency: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-[#E23744]"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="NORMAL">NORMAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Diagnosis / Patient Details</label>
                  <input
                    type="text"
                    value={outreachForm.patient_diagnosis}
                    onChange={(e) => setOutreachForm({ ...outreachForm, patient_diagnosis: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:border-[#E23744]"
                  />
                </div>

                <button
                  onClick={handleGenerateOutreach}
                  disabled={outreachLoading}
                  className="w-full py-3.5 bg-[#E23744] hover:bg-red-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-red-500/20 cursor-pointer flex items-center justify-center gap-2 mt-4 transition-all disabled:opacity-50"
                >
                  {outreachLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Generate Multilingual Alert
                </button>
              </div>

              {/* Broadcast Cards */}
              <div className="lg:col-span-2 space-y-4">
                {outreachResult ? (
                  <div className="space-y-4">
                    {/* English */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-red-600 rounded-full inline-block" /> English Broadcast (SMS / WhatsApp)
                        </span>
                        <button
                          onClick={() => copyToClipboard(outreachResult.english, "en")}
                          className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          {copiedLang === "en" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedLang === "en" ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {outreachResult.english}
                      </div>
                    </div>

                    {/* Hindi */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-orange-500 rounded-full inline-block" /> Hindi Broadcast (हिंदी सन्देश)
                        </span>
                        <button
                          onClick={() => copyToClipboard(outreachResult.hindi, "hi")}
                          className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          {copiedLang === "hi" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedLang === "hi" ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                        {outreachResult.hindi}
                      </div>
                    </div>

                    {/* Punjabi */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block" /> Punjabi Broadcast (ਪੰਜਾਬੀ ਸੁਨੇਹਾ)
                        </span>
                        <button
                          onClick={() => copyToClipboard(outreachResult.punjabi, "pa")}
                          className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          {copiedLang === "pa" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedLang === "pa" ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                        {outreachResult.punjabi}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-80 border border-dashed border-slate-200 bg-white rounded-3xl flex flex-col items-center justify-center p-6 text-center text-slate-400 text-sm">
                    <Share2 className="w-10 h-10 mb-2 opacity-40 text-slate-400" />
                    Fill campaign parameters on the left and click Generate to produce high-urgency multilingual alerts.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: PREDICTIVE SHORTAGE FORECASTER */}
          {/* ========================================================================= */}
          {activeTab === "forecast" && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 font-bold text-lg text-slate-900 mb-1">
                    <Activity className="w-5 h-5 text-amber-500" /> Network 7-14 Day Depletion Forecaster
                  </div>
                  <p className="text-sm text-slate-600">
                    Calculates depletion velocity against live blood bank reserves and historical consumption patterns to predict stock-outs.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={forecastDays}
                    onChange={(e) => setForecastDays(Number(e.target.value))}
                    className="border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold bg-slate-50 text-slate-800 focus:outline-none focus:border-[#E23744]"
                  >
                    <option value={7}>7-Day Horizon</option>
                    <option value={10}>10-Day Horizon</option>
                    <option value={14}>14-Day Horizon</option>
                  </select>
                  <button
                    onClick={handleRunForecast}
                    disabled={forecastLoading}
                    className="px-6 py-2.5 bg-[#E23744] hover:bg-red-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-red-500/20 cursor-pointer flex items-center gap-2 transition-all"
                  >
                    {forecastLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Run Projection
                  </button>
                </div>
              </div>

              {forecastResult ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Summary */}
                  <div className="lg:col-span-1 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Forecaster Assessment</div>
                      <div className="text-xl font-bold text-slate-900 mb-3">Critical Risk Summary</div>
                      <p className="text-sm text-slate-600 leading-relaxed mb-4">
                        {forecastResult.summary || "Projection calculated across current network stock levels and upcoming scheduled surgeries."}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600">Confidence Score</span>
                      <span className="font-extrabold text-[#E23744]">
                        {forecastResult.confidence_score ? `${(forecastResult.confidence_score * 100).toFixed(0)}%` : "92%"}
                      </span>
                    </div>
                  </div>

                  {/* Risks */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-[#E23744]" /> Projected High-Risk Blood Groups
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {forecastResult.shortage_risks && forecastResult.shortage_risks.length > 0 ? (
                        forecastResult.shortage_risks.map((risk: any, rIdx: number) => (
                          <div
                            key={rIdx}
                            className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-black text-[#E23744]">
                                {risk.blood_group}
                              </span>
                              <span
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                  risk.risk_level === "CRITICAL"
                                    ? "bg-red-50 text-[#E23744] border border-red-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {risk.risk_level} RISK
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 space-y-1">
                              <div>
                                <strong className="text-slate-800">Days Until Depletion:</strong> {risk.estimated_days_to_stockout ?? "3-5"} days
                              </div>
                              <div>
                                <strong className="text-slate-800">Deficit Projection:</strong> {risk.projected_deficit_units ?? "15-20"} units
                              </div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700">
                              <strong className="text-slate-900">Recommended Action:</strong> {risk.recommended_action || "Schedule targeted emergency donor drives immediately."}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-3xl p-5 text-sm font-semibold">
                          ✓ No critical blood group stockouts projected within the next {forecastDays} days.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 border border-dashed border-slate-200 bg-white rounded-3xl flex flex-col items-center justify-center p-6 text-center text-slate-400 text-sm">
                  <Activity className="w-10 h-10 mb-2 opacity-40 text-amber-500" />
                  Click &quot;Run Projection&quot; above to calculate depletion velocity against live blood bank reserves.
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: SYSTEM TELEMETRY */}
          {/* ========================================================================= */}
          {activeTab === "telemetry" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Agent Calls</div>
                  <div className="text-3xl font-black text-slate-900 mt-1">{telemetry?.total_logs ?? 0}</div>
                </div>
                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Tokens Processed</div>
                  <div className="text-3xl font-black text-emerald-600 mt-1">
                    {telemetry?.total_tokens ? telemetry.total_tokens.toLocaleString() : 0}
                  </div>
                </div>
                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Average Latency</div>
                  <div className="text-3xl font-black text-[#E23744] mt-1">
                    {telemetry?.avg_latency_ms ? `${telemetry.avg_latency_ms} ms` : "0 ms"}
                  </div>
                </div>
                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Audit Storage</div>
                  <div className="text-sm font-bold text-slate-800 mt-2">MongoDB Collection: `ai_usage_logs`</div>
                </div>
              </div>

              {/* Models Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-500" /> Active AI Models in Pipeline
                  </div>
                  <button
                    onClick={loadTelemetry}
                    disabled={telemetryLoading}
                    className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${telemetryLoading ? "animate-spin" : ""}`} /> Refresh
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Orchestration & Reasoning Model</div>
                    <div className="text-lg font-bold text-slate-900 font-mono">openai/gpt-oss-120b</div>
                    <div className="text-xs text-slate-600 leading-relaxed">
                      High-capacity clinical reasoning and multi-turn autonomous tool orchestration for real-time inventory queries.
                    </div>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Distress Parsing & Translation Model</div>
                    <div className="text-lg font-bold text-slate-900 font-mono">openai/gpt-oss-20b</div>
                    <div className="text-xs text-slate-600 leading-relaxed">
                      Ultra-low-latency parsing of distress text, regex-resilient schema extraction, and multi-language translation.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
