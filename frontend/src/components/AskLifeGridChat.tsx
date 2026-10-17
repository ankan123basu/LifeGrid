"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, RefreshCw, PhoneCall } from "lucide-react";
import { api } from "@/lib/api";

export default function AskLifeGridChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isOverFooter, setIsOverFooter] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; content: string }>
  >([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm LifeGrid's emergency care assistant. How can I help you find blood, locate a partner hospital, or check donor eligibility today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Detect when user scrolls near the bottom of the page to collapse button
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      // When within 450px of the bottom (over footer zone)
      setIsOverFooter(scrollPosition >= documentHeight - 450);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  async function handleSend(customPrompt?: string) {
    const text = customPrompt || input;
    if (!text.trim() || loading) return;

    const userMsg = { id: Date.now().toString(), role: "user" as const, content: text };
    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput("");
    setLoading(true);

    try {
      const res: any = await api.aiChat(text);
      if (res.success && res.data) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: res.data.response,
          },
        ]);
      } else {
        throw new Error(res.error || "Failed to reach assistant");
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "Sorry, I had trouble connecting. For immediate life-threatening blood emergencies, please dial 112 immediately.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      {/* Floating Button: Collapses to Icon-Only Circle Over Footer to never cover text */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Ask LifeGrid Assistant"
          className={`flex items-center bg-white hover:bg-slate-50 text-slate-900 shadow-xl shadow-slate-900/15 border border-slate-200/90 cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 ${
            isOverFooter
              ? "w-12 h-12 rounded-full justify-center p-0"
              : "gap-2.5 px-4 sm:px-5 py-3 rounded-full"
          }`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <MessageSquare className="w-3.5 h-3.5 text-[#E23744]" />
          </div>
          {!isOverFooter && (
            <span className="font-extrabold text-xs text-slate-800 hidden sm:inline whitespace-nowrap">
              Ask LifeGrid
            </span>
          )}
        </button>
      )}

      {/* Expanded Modern Chat Drawer */}
      {isOpen && (
        <div className="w-[calc(100vw-32px)] sm:w-[390px] h-[500px] max-h-[85vh] bg-white rounded-3xl border border-slate-200/90 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[#E23744] via-rose-600 to-[#E23744] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-sm">
                ✚
              </div>
              <div>
                <div className="font-extrabold text-sm leading-tight flex items-center gap-1.5">
                  <span>LifeGrid Assistant</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-300" />
                </div>
                <div className="text-[11px] text-white/90 font-medium">
                  24/7 Support • Emergency? Call 112
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Emergency Alert Banner */}
          <div className="px-3.5 py-1.5 bg-rose-50 border-b border-rose-100 flex items-center justify-between text-[11px] text-rose-800 font-semibold">
            <span className="flex items-center gap-1">
              <PhoneCall className="w-3 h-3 text-rose-600" /> Critical emergency?
            </span>
            <a href="tel:112" className="text-[#E23744] font-black underline">
              Dial 112
            </a>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/70">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] p-3 text-xs rounded-2xl ${
                    m.role === "user"
                      ? "bg-[#E23744] text-white font-semibold rounded-br-sm shadow-sm"
                      : "bg-white text-slate-800 font-medium rounded-bl-sm border border-slate-200/80 shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 p-2.5 bg-white rounded-2xl border border-slate-200 text-xs font-semibold text-slate-600 w-fit animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#E23744]" /> Consulting medical
                database...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto">
            {["Where is O- blood available?", "Am I eligible to donate?", "How fast is dispatch?"].map(
              (prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                  className="whitespace-nowrap px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-[11px] font-semibold cursor-pointer transition-colors"
                >
                  {prompt}
                </button>
              )
            )}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-slate-100 flex gap-2 items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask a question..."
              className="flex-1 px-4 py-2 bg-slate-100/80 border border-slate-200 rounded-full text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-[#E23744] transition-all"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="p-2.5 bg-[#E23744] hover:bg-rose-700 text-white rounded-full shadow-md shadow-rose-500/25 cursor-pointer disabled:opacity-40 transition-all"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
