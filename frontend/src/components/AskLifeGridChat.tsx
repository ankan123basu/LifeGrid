"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, RefreshCw, Bot, User, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";

export default function AskLifeGridChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; content: string }>
  >([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm LifeGrid's emergency care assistant. How can I help you find blood, locate a certified hospital, or check donor eligibility today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
          content: "Sorry, I had trouble connecting. For immediate critical blood emergencies, please call our 24/7 helpline at 1800-LIFE-GRID.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 bg-[#FFE600] hover:bg-yellow-400 border-[3px] border-black font-black uppercase text-xs tracking-wider shadow-[4px_4px_0px_#000] cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D4D] animate-ping" />
          <MessageSquare className="w-4 h-4 text-black" />
          <span>Ask LifeGrid</span>
        </button>
      )}

      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div className="w-[360px] sm:w-[420px] h-[540px] bg-white border-[3px] border-black shadow-[8px_8px_0px_#000] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-3.5 bg-[#FF4D4D] text-white border-b-[3px] border-black flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white text-black border-2 border-black flex items-center justify-center font-black text-sm">
                ✚
              </div>
              <div>
                <div className="font-black text-sm uppercase leading-tight tracking-wide">
                  Ask LifeGrid
                </div>
                <div className="text-[10px] font-mono text-white/90">
                  Instant Emergency Assistant
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 bg-white text-black hover:bg-neutral-200 border-2 border-black font-bold text-xs cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F4F1EA]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] p-3 text-xs font-medium border-2 border-black ${
                    m.role === "user"
                      ? "bg-[#FFE600] text-black shadow-[2px_2px_0px_#000]"
                      : "bg-white text-neutral-800 shadow-[2px_2px_0px_#000]"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 p-2.5 bg-white border-2 border-black w-fit font-mono text-xs font-bold animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking hospital network...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div className="p-2 bg-white border-t-2 border-black flex items-center gap-1.5 overflow-x-auto">
            {[
              "Where is O- blood available in Delhi?",
              "Can A+ donate to AB+?",
              "How to donate?",
            ].map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="whitespace-nowrap px-2.5 py-1 bg-[#F4F1EA] hover:bg-[#FFE600] border border-black font-mono text-[10px] font-bold cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t-2 border-black flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask a question..."
              className="flex-1 px-3 py-2 border-2 border-black font-mono text-xs focus:outline-none focus:bg-[#FFE600]/10"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="px-3.5 py-2 bg-[#FF4D4D] hover:bg-red-600 text-white border-2 border-black font-bold text-xs shadow-[2px_2px_0px_#000] cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
