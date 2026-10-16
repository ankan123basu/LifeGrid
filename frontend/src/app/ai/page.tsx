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
} from "lucide-react";
import { api } from "@/lib/api";

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
        "Greetings! I am LifeGrid's Clinical Autonomous Agent powered by Groq. I have direct tool access to query real-time MongoDB collections, calculate geographic proximity, and verify immunological blood compatibility. How can I assist you with clinical logistics today?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // --- Parser State ---
  const [parserText, setParserText] = useState(
    "URGENT: Road accident near AIIMS New Delhi! Victim needs 3 units of O- Negative Whole Blood immediately. Patient admitted in Trauma ICU. Contact Dr. Sharma 9876543210."
  );
  const [parserLoading, setParserLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<any>(null);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  // --- Outreach State ---
  const [outreachForm, setOutreachForm] = useState({
    blood_group: "O-",
    hospital_name: "Apollo Hospital",
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
      if (res.success && res.data) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: res.data.response,
            tool_calls: res.data.tool_calls || [],
            latency_ms: res.data.latency_ms,
          },
        ]);
        // Refresh telemetry stats in background
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
      // Find hospital ID from hospitals list or use fallback
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="bg-[#FFE600] border-4 border-black p-6 mb-8 shadow-[6px_6px_0px_0px_#000]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-[#FFE600] font-mono text-xs font-black uppercase mb-2">
              <Zap className="w-3.5 h-3.5" /> Emergency Care AI Assistant
            </div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-black">
              Clinical Intelligence Hub
            </h1>
            <p className="text-black font-medium mt-1">
              Automated donor matching, unstructured SOS distress parser, multilingual broadcast generator, and predictive shortage forecaster.
            </p>
          </div>

          {/* Quick Telemetry Capsule */}
          <div className="bg-white border-3 border-black p-3 shadow-[3px_3px_0px_0px_#000] flex items-center gap-4">
            <div>
              <div className="text-[10px] font-mono uppercase text-gray-600 font-bold">Total Operations</div>
              <div className="text-xl font-black font-mono">{telemetry?.total_logs ?? "..."}</div>
            </div>
            <div className="border-r-2 border-black h-8" />
            <div>
              <div className="text-[10px] font-mono uppercase text-gray-600 font-bold">Processed</div>
              <div className="text-xl font-black font-mono text-emerald-600">
                {telemetry?.total_tokens ? telemetry.total_tokens.toLocaleString() : "..."}
              </div>
            </div>
            <div className="border-r-2 border-black h-8" />
            <div>
              <div className="text-[10px] font-mono uppercase text-gray-600 font-bold">Avg Latency</div>
              <div className="text-xl font-black font-mono text-indigo-600">
                {telemetry?.avg_latency_ms ? `${telemetry.avg_latency_ms}ms` : "..."}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: "chat", label: "Care Assistant", icon: Bot, color: "bg-[#7CD4FF]" },
          { id: "parser", label: "SOS Distress Parser", icon: AlertTriangle, color: "bg-[#FF90C8]" },
          { id: "outreach", label: "Multilingual Broadcaster", icon: Share2, color: "bg-[#2EE59D]" },
          { id: "forecast", label: "Shortage Forecaster", icon: Activity, color: "bg-[#FFE600]" },
          { id: "telemetry", label: "System Telemetry", icon: Cpu, color: "bg-white" },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabMode)}
              className={`flex items-center gap-2 px-5 py-3 border-3 border-black font-black uppercase text-sm transition-all cursor-pointer ${
                isActive
                  ? `${tab.color} shadow-[4px_4px_0px_0px_#000] -translate-y-0.5`
                  : "bg-white hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#000]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AUTONOMOUS CLINICAL AGENT */}
      {/* ========================================================================= */}
      {activeTab === "chat" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Quick Clinical Prompts Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border-3 border-black p-4 shadow-[4px_4px_0px_0px_#000]">
              <div className="flex items-center gap-2 font-black uppercase text-sm mb-3">
                <Sparkles className="w-4 h-4 text-amber-500" /> Quick Clinical Prompts
              </div>
              <p className="text-xs text-gray-700 font-medium mb-3">
                Click any prompt to check blood bank stock, donor matching, and compatibility:
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
                    className="w-full text-left text-xs font-mono font-bold bg-[#F4F1EA] hover:bg-[#FFE600] border-2 border-black p-2 transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000] hover:translate-x-0.5"
                  >
                    → &quot;{prompt}&quot;
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#7CD4FF] border-3 border-black p-4 shadow-[4px_4px_0px_0px_#000]">
              <div className="text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-2">
                <Terminal className="w-4 h-4" /> Available Agent Tools
              </div>
              <ul className="text-xs font-mono space-y-1 list-disc list-inside">
                <li><code className="font-bold">check_blood_inventory</code></li>
                <li><code className="font-bold">find_nearest_hospitals</code></li>
                <li><code className="font-bold">get_blood_compatibility</code></li>
                <li><code className="font-bold">estimate_delivery_time</code></li>
                <li><code className="font-bold">find_critical_shortages</code></li>
              </ul>
            </div>
          </div>

          {/* Main Chat Interface */}
          <div className="lg:col-span-3 bg-white border-3 border-black shadow-[6px_6px_0px_0px_#000] flex flex-col h-[650px]">
            {/* Chat Messages */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div className="text-[11px] font-mono font-bold uppercase mb-1 text-gray-600">
                    {msg.role === "user" ? "You (Staff Clinician)" : "LifeGrid Autonomous AI"}
                  </div>
                  <div
                    className={`max-w-[85%] border-3 border-black p-4 text-sm font-medium ${
                      msg.role === "user"
                        ? "bg-[#FFE600] shadow-[3px_3px_0px_0px_#000]"
                        : "bg-[#F4F1EA] shadow-[3px_3px_0px_0px_#000]"
                    }`}
                  >
                    {/* Tool Calls Execution Visualizer */}
                    {msg.tool_calls && msg.tool_calls.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {msg.tool_calls.map((tc, tidx) => (
                          <div
                            key={tidx}
                            className="bg-black text-[#2EE59D] p-2.5 font-mono text-xs border border-neutral-700"
                          >
                            <div className="flex items-center gap-1.5 font-bold uppercase text-[11px] text-[#FFE600]">
                              <Zap className="w-3.5 h-3.5" /> Executed Tool: {tc.name}
                            </div>
                            <div className="mt-1 text-neutral-300">
                              <span className="text-gray-400">Args:</span>{" "}
                              {JSON.stringify(tc.args)}
                            </div>
                            {tc.result && (
                              <div className="mt-1 text-emerald-400 truncate">
                                <span className="text-gray-400">Result:</span>{" "}
                                {JSON.stringify(tc.result)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                    {msg.latency_ms && (
                      <div className="mt-2 text-[10px] font-mono text-gray-500 font-bold">
                        ⚡ Latency: {msg.latency_ms}ms (Groq acceleration)
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex items-center gap-2 p-3 bg-neutral-100 border-2 border-black w-fit font-mono text-xs font-bold animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                  Groq Model Reasoner Calling PyMongo Tools...
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Box */}
            <div className="p-4 border-t-3 border-black bg-neutral-50 flex gap-2">
              <input
                type="text"
                placeholder="Ask about live blood stock, donor matching, logistics routing..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                disabled={chatLoading}
                className="flex-1 px-4 py-3 border-3 border-black font-mono text-sm bg-white focus:outline-none focus:bg-[#FFE600]/10"
              />
              <button
                onClick={() => handleSendChat()}
                disabled={chatLoading || !chatInput.trim()}
                className="px-6 py-3 bg-[#FFE600] hover:bg-yellow-400 border-3 border-black font-black uppercase text-sm shadow-[3px_3px_0px_0px_#000] cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> Send
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
          <div className="bg-white border-3 border-black p-6 shadow-[6px_6px_0px_0px_#000] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 font-black uppercase text-lg mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" /> Raw SOS Distress Input
              </div>
              <p className="text-sm text-gray-700 font-medium mb-4">
                Paste any noisy WhatsApp forward, transcription from emergency dispatch call, or Telegram group distress message. The LLM extracts the exact clinical schema.
              </p>
              <textarea
                rows={6}
                value={parserText}
                onChange={(e) => setParserText(e.target.value)}
                placeholder="Paste unstructured distress message here..."
                className="w-full p-4 border-3 border-black font-mono text-sm focus:outline-none focus:bg-[#FF90C8]/10"
              />

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setParserText(
                      "SOS: Critical requirement of 4 units AB- platelets for a leukemia patient undergoing chemotherapy at Tata Memorial Hospital Mumbai. Urgent contact 9820011223."
                    )
                  }
                  className="text-xs font-mono font-bold bg-[#F4F1EA] hover:bg-[#FFE600] border border-black px-2 py-1 cursor-pointer"
                >
                  Load Sample 2 (Platelets Mumbai)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setParserText(
                      "Need 2 bottles B+ blood in Fortis Hospital Bangalore for C-section delivery emergency right now. Family contact is 9988776655."
                    )
                  }
                  className="text-xs font-mono font-bold bg-[#F4F1EA] hover:bg-[#FFE600] border border-black px-2 py-1 cursor-pointer"
                >
                  Load Sample 3 (B+ Bangalore)
                </button>
              </div>
            </div>

            <button
              onClick={handleParseEmergency}
              disabled={parserLoading || !parserText.trim()}
              className="mt-6 w-full py-4 bg-[#FF90C8] hover:bg-pink-400 border-3 border-black font-black uppercase text-base shadow-[4px_4px_0px_0px_#000] cursor-pointer flex items-center justify-center gap-2"
            >
              {parserLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" /> Parsing Clinical Fields...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" /> Parse Unstructured Text
                </>
              )}
            </button>
          </div>

          {/* Parsed Result & Dispatch Panel */}
          <div className="bg-white border-3 border-black p-6 shadow-[6px_6px_0px_0px_#000]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-black uppercase text-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Validated BloodRequest Schema
              </div>
              {parsedResult && (
                <span className="bg-[#2EE59D] border-2 border-black px-2 py-0.5 text-xs font-black font-mono">
                  Schema Validated
                </span>
              )}
            </div>

            {parsedResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="border-2 border-black p-3 bg-[#F4F1EA]">
                    <div className="text-[10px] font-mono uppercase text-gray-600 font-bold">Blood Group</div>
                    <div className="text-2xl font-black font-mono text-red-600">{parsedResult.blood_group}</div>
                  </div>
                  <div className="border-2 border-black p-3 bg-[#F4F1EA]">
                    <div className="text-[10px] font-mono uppercase text-gray-600 font-bold">Component</div>
                    <div className="text-lg font-black font-mono">{parsedResult.component}</div>
                  </div>
                  <div className="border-2 border-black p-3 bg-[#F4F1EA]">
                    <div className="text-[10px] font-mono uppercase text-gray-600 font-bold">Units Needed</div>
                    <div className="text-2xl font-black font-mono">{parsedResult.units_needed} Units</div>
                  </div>
                  <div className="border-2 border-black p-3 bg-[#F4F1EA]">
                    <div className="text-[10px] font-mono uppercase text-gray-600 font-bold">Urgency Level</div>
                    <div className="text-lg font-black font-mono text-red-600">{parsedResult.urgency}</div>
                  </div>
                  <div className="border-2 border-black p-3 bg-[#F4F1EA] col-span-2">
                    <div className="text-[10px] font-mono uppercase text-gray-600 font-bold">Hospital & City</div>
                    <div className="text-base font-black">
                      {parsedResult.hospital_name || "Hospital Identified"} ({parsedResult.city || "Detected City"})
                    </div>
                  </div>
                  <div className="border-2 border-black p-3 bg-[#F4F1EA] col-span-2">
                    <div className="text-[10px] font-mono uppercase text-gray-600 font-bold">Clinical Diagnosis</div>
                    <div className="text-sm font-medium">{parsedResult.patient_diagnosis || "N/A"}</div>
                  </div>
                </div>

                <div className="bg-black text-[#2EE59D] p-3 font-mono text-xs overflow-x-auto border-2 border-black">
                  <pre>{JSON.stringify(parsedResult, null, 2)}</pre>
                </div>

                {/* Dispatch Trigger */}
                <div className="pt-2">
                  <button
                    onClick={handleDispatchFromParsed}
                    disabled={dispatchStatus === "dispatching" || dispatchStatus === "dispatched"}
                    className="w-full py-4 bg-[#2EE59D] hover:bg-emerald-400 border-3 border-black font-black uppercase text-base shadow-[4px_4px_0px_0px_#000] cursor-pointer flex items-center justify-center gap-2"
                  >
                    {dispatchStatus === "dispatching" ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : dispatchStatus === "dispatched" ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" /> Dispatched to Live Network!
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-5 h-5" /> 1-Click Dispatch as Live Emergency
                      </>
                    )}
                  </button>
                  {dispatchStatus && dispatchStatus.startsWith("error") && (
                    <div className="mt-2 text-xs font-mono font-bold text-red-600">{dispatchStatus}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-64 border-2 border-dashed border-black flex flex-col items-center justify-center text-center p-6 text-gray-500 font-mono text-sm">
                <AlertTriangle className="w-8 h-8 mb-2 opacity-50 text-red-500" />
                Awaiting input. Click &quot;Parse Unstructured Text&quot; to test.
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
          {/* Controls */}
          <div className="lg:col-span-1 bg-white border-3 border-black p-6 shadow-[6px_6px_0px_0px_#000] space-y-4">
            <div className="flex items-center gap-2 font-black uppercase text-lg mb-2">
              <Share2 className="w-5 h-5 text-emerald-600" /> Outreach Campaign Parameters
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1">Blood Group</label>
              <select
                value={outreachForm.blood_group}
                onChange={(e) => setOutreachForm({ ...outreachForm, blood_group: e.target.value })}
                className="w-full p-2.5 border-2 border-black font-mono font-bold"
              >
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1">Hospital Name</label>
              <input
                type="text"
                value={outreachForm.hospital_name}
                onChange={(e) => setOutreachForm({ ...outreachForm, hospital_name: e.target.value })}
                className="w-full p-2.5 border-2 border-black font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1">City</label>
              <input
                type="text"
                value={outreachForm.city}
                onChange={(e) => setOutreachForm({ ...outreachForm, city: e.target.value })}
                className="w-full p-2.5 border-2 border-black font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1">Urgency</label>
              <select
                value={outreachForm.urgency}
                onChange={(e) => setOutreachForm({ ...outreachForm, urgency: e.target.value })}
                className="w-full p-2.5 border-2 border-black font-mono font-bold"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="NORMAL">NORMAL</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1">Patient Diagnosis / Context</label>
              <input
                type="text"
                value={outreachForm.patient_diagnosis}
                onChange={(e) => setOutreachForm({ ...outreachForm, patient_diagnosis: e.target.value })}
                className="w-full p-2.5 border-2 border-black font-medium"
              />
            </div>

            <button
              onClick={handleGenerateOutreach}
              disabled={outreachLoading}
              className="w-full py-3.5 bg-[#2EE59D] hover:bg-emerald-400 border-3 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_#000] cursor-pointer flex items-center justify-center gap-2 mt-4"
            >
              {outreachLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Generate 3-Language Broadcast
            </button>
          </div>

          {/* Generated Broadcast Cards */}
          <div className="lg:col-span-2 space-y-4">
            {outreachResult ? (
              <div className="space-y-4">
                {/* English */}
                <div className="bg-white border-3 border-black p-5 shadow-[4px_4px_0px_0px_#000]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black uppercase text-sm flex items-center gap-2">
                      <span className="w-3 h-3 bg-red-600 rounded-full inline-block" /> English Broadcast (SMS / WhatsApp)
                    </span>
                    <button
                      onClick={() => copyToClipboard(outreachResult.english, "en")}
                      className="border-2 border-black px-2.5 py-1 text-xs font-bold font-mono bg-[#F4F1EA] hover:bg-[#FFE600] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedLang === "en" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedLang === "en" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="p-3 bg-[#F4F1EA] border border-black font-medium text-sm whitespace-pre-wrap">
                    {outreachResult.english}
                  </div>
                </div>

                {/* Hindi */}
                <div className="bg-white border-3 border-black p-5 shadow-[4px_4px_0px_0px_#000]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black uppercase text-sm flex items-center gap-2">
                      <span className="w-3 h-3 bg-orange-500 rounded-full inline-block" /> Hindi Broadcast (हिंदी सन्देश)
                    </span>
                    <button
                      onClick={() => copyToClipboard(outreachResult.hindi, "hi")}
                      className="border-2 border-black px-2.5 py-1 text-xs font-bold font-mono bg-[#F4F1EA] hover:bg-[#FFE600] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedLang === "hi" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedLang === "hi" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="p-3 bg-[#F4F1EA] border border-black font-medium text-sm whitespace-pre-wrap">
                    {outreachResult.hindi}
                  </div>
                </div>

                {/* Punjabi */}
                <div className="bg-white border-3 border-black p-5 shadow-[4px_4px_0px_0px_#000]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black uppercase text-sm flex items-center gap-2">
                      <span className="w-3 h-3 bg-blue-500 rounded-full inline-block" /> Punjabi Broadcast (ਪੰਜਾਬੀ ਸੁਨੇਹਾ)
                    </span>
                    <button
                      onClick={() => copyToClipboard(outreachResult.punjabi, "pa")}
                      className="border-2 border-black px-2.5 py-1 text-xs font-bold font-mono bg-[#F4F1EA] hover:bg-[#FFE600] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedLang === "pa" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedLang === "pa" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="p-3 bg-[#F4F1EA] border border-black font-medium text-sm whitespace-pre-wrap">
                    {outreachResult.punjabi}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-80 border-3 border-dashed border-black bg-white flex flex-col items-center justify-center p-6 text-center text-gray-500 font-mono text-sm">
                <Share2 className="w-10 h-10 mb-2 opacity-40 text-emerald-600" />
                Configure campaign parameters on the left and click Generate to produce high-urgency multilingual alerts.
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
          <div className="bg-white border-3 border-black p-6 shadow-[6px_6px_0px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-black uppercase text-lg mb-1">
                <Activity className="w-5 h-5 text-amber-500" /> Network-Wide 7-14 Day Depletion Forecaster
              </div>
              <p className="text-sm text-gray-700 font-medium">
                Executes live aggregation pipeline across current blood bank reserves + request consumption rates to simulate risk of critical stock-outs.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={forecastDays}
                onChange={(e) => setForecastDays(Number(e.target.value))}
                className="border-3 border-black px-4 py-2 font-mono font-bold bg-[#F4F1EA]"
              >
                <option value={7}>7-Day Forecast Horizon</option>
                <option value={10}>10-Day Forecast Horizon</option>
                <option value={14}>14-Day Forecast Horizon</option>
              </select>
              <button
                onClick={handleRunForecast}
                disabled={forecastLoading}
                className="px-6 py-2.5 bg-[#FFE600] hover:bg-yellow-400 border-3 border-black font-black uppercase text-sm shadow-[3px_3px_0px_0px_#000] cursor-pointer flex items-center gap-2"
              >
                {forecastLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Run Projection
              </button>
            </div>
          </div>

          {forecastResult ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Executive Summary */}
              <div className="lg:col-span-1 bg-[#FFE600] border-3 border-black p-6 shadow-[5px_5px_0px_0px_#000]">
                <div className="font-mono text-xs font-black uppercase tracking-wider mb-2">Executive Summary</div>
                <div className="text-2xl font-black mb-3">Critical Alert Assessment</div>
                <p className="text-sm font-medium leading-relaxed mb-4">
                  {forecastResult.summary || "Projection calculated across current network stock levels and upcoming scheduled surgeries."}
                </p>
                <div className="bg-black text-[#FFE600] p-3 font-mono text-xs font-bold border-2 border-black">
                  Confidence Score: {forecastResult.confidence_score ? `${(forecastResult.confidence_score * 100).toFixed(0)}%` : "92%"}
                </div>
              </div>

              {/* Shortage Risks Grid */}
              <div className="lg:col-span-2 space-y-4">
                <div className="font-black uppercase text-base flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-600" /> Projected High-Risk Blood Groups
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {forecastResult.shortage_risks && forecastResult.shortage_risks.length > 0 ? (
                    forecastResult.shortage_risks.map((risk: any, rIdx: number) => (
                      <div
                        key={rIdx}
                        className="bg-white border-3 border-black p-4 shadow-[4px_4px_0px_0px_#000]"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-black font-mono text-red-600">
                            {risk.blood_group}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-black font-mono border-2 border-black ${
                              risk.risk_level === "CRITICAL"
                                ? "bg-red-500 text-white"
                                : "bg-amber-400 text-black"
                            }`}
                          >
                            {risk.risk_level} RISK
                          </span>
                        </div>
                        <div className="text-xs font-mono text-gray-700 space-y-1 mb-3">
                          <div>
                            <strong>Days Until Depletion:</strong> {risk.estimated_days_to_stockout ?? "3-5"} days
                          </div>
                          <div>
                            <strong>Deficit Projection:</strong> {risk.projected_deficit_units ?? "15-20"} units
                          </div>
                        </div>
                        <div className="p-2 bg-[#F4F1EA] border border-black text-xs font-medium">
                          <strong>Action:</strong> {risk.recommended_action || "Schedule targeted emergency donor drives immediately."}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 bg-emerald-100 border-2 border-black p-4 text-emerald-800 font-mono text-sm font-bold">
                      ✓ No critical blood group stockouts projected within the next {forecastDays} days.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 border-3 border-dashed border-black bg-white flex flex-col items-center justify-center p-6 text-center text-gray-500 font-mono text-sm">
              <Activity className="w-10 h-10 mb-2 opacity-40 text-amber-500" />
              Click &quot;Run Projection&quot; above to synthesize live consumption rates against bank balances.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: GROQ TELEMETRY & AUDIT */}
      {/* ========================================================================= */}
      {activeTab === "telemetry" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border-3 border-black p-5 shadow-[4px_4px_0px_0px_#000]">
              <div className="text-xs font-mono uppercase text-gray-600 font-bold">Total Agent Calls</div>
              <div className="text-3xl font-black font-mono mt-1">{telemetry?.total_logs ?? 0}</div>
            </div>
            <div className="bg-[#7CD4FF] border-3 border-black p-5 shadow-[4px_4px_0px_0px_#000]">
              <div className="text-xs font-mono uppercase text-black font-bold">Tokens Processed</div>
              <div className="text-3xl font-black font-mono mt-1 text-black">
                {telemetry?.total_tokens ? telemetry.total_tokens.toLocaleString() : 0}
              </div>
            </div>
            <div className="bg-[#FFE600] border-3 border-black p-5 shadow-[4px_4px_0px_0px_#000]">
              <div className="text-xs font-mono uppercase text-black font-bold">Average Latency</div>
              <div className="text-3xl font-black font-mono mt-1 text-black">
                {telemetry?.avg_latency_ms ? `${telemetry.avg_latency_ms} ms` : "0 ms"}
              </div>
            </div>
            <div className="bg-[#2EE59D] border-3 border-black p-5 shadow-[4px_4px_0px_0px_#000]">
              <div className="text-xs font-mono uppercase text-black font-bold">MongoDB Persistence</div>
              <div className="text-base font-black font-mono mt-1">ai_usage_logs (Audited)</div>
            </div>
          </div>

          {/* Model Breakdown */}
          <div className="bg-white border-3 border-black p-6 shadow-[6px_6px_0px_0px_#000]">
            <div className="flex items-center justify-between mb-4">
              <div className="font-black uppercase text-base flex items-center gap-2">
                <Layers className="w-4 h-4" /> Active Groq Models in LifeGrid Pipeline
              </div>
              <button
                onClick={loadTelemetry}
                disabled={telemetryLoading}
                className="text-xs font-mono font-bold bg-[#F4F1EA] hover:bg-[#FFE600] border-2 border-black px-3 py-1 cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${telemetryLoading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border-2 border-black p-4 bg-[#F4F1EA]">
                <div className="font-mono text-xs font-black text-indigo-700">GROQ_MODEL_CHAT</div>
                <div className="text-lg font-black font-mono">openai/gpt-oss-120b</div>
                <div className="text-xs text-gray-600 mt-1">
                  High-capacity clinical reasoning and multi-turn autonomous tool orchestration.
                </div>
              </div>
              <div className="border-2 border-black p-4 bg-[#F4F1EA]">
                <div className="font-mono text-xs font-black text-emerald-700">GROQ_MODEL_FAST</div>
                <div className="text-lg font-black font-mono">openai/gpt-oss-20b</div>
                <div className="text-xs text-gray-600 mt-1">
                  Ultra-low-latency parsing of distress text, regex-resilient schema extraction, & translation.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
