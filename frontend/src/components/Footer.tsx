"use client";

import { Database, Cpu, Radio, ShieldCheck, Code } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#FFFFFF] border-t-[3px] border-black mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-6 border-b-2 border-black">
          {/* Col 1: Project Identity */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 font-black text-xl tracking-tight mb-2">
              <span className="w-6 h-6 bg-[#FF4D4D] border-2 border-black flex items-center justify-center text-white text-xs">✚</span>
              <span>LIFEGRID SYSTEM</span>
            </div>
            <p className="text-sm font-medium text-neutral-700 max-w-md mb-3 leading-relaxed">
              Academic & clinical implementation of an Intelligent Real-Time Emergency Blood Resource Mesh.
              Built for <span className="font-bold underline decoration-2 decoration-[#FFE600]">CSE494 (Intelligent NoSQL Databases)</span>.
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-mono font-bold">
              <span className="bg-[#FFE600] px-2 py-0.5 border border-black shadow-[2px_2px_0px_#000]">MongoDB 8.2</span>
              <span className="bg-[#7CD4FF] px-2 py-0.5 border border-black shadow-[2px_2px_0px_#000]">Groq Cloud LLM</span>
              <span className="bg-[#2EE59D] px-2 py-0.5 border border-black shadow-[2px_2px_0px_#000]">WebSockets / Streams</span>
              <span className="bg-[#FF90C8] px-2 py-0.5 border border-black shadow-[2px_2px_0px_#000]">Next.js 15 App Router</span>
            </div>
          </div>

          {/* Col 2: MongoDB Internals */}
          <div>
            <div className="font-extrabold text-sm uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#2EE59D]" />
              <span>Database Specs</span>
            </div>
            <ul className="text-xs font-mono space-y-1.5 text-neutral-700">
              <li>• Strict $jsonSchema (11 colls)</li>
              <li>• 2dsphere Geospatial Index</li>
              <li>• Compound Index (IXSCAN)</li>
              <li>• Multi-Doc ACID Transactions</li>
              <li>• $merge Materialized Views</li>
            </ul>
          </div>

          {/* Col 3: Quick Viva Links */}
          <div>
            <div className="font-extrabold text-sm uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#FF4D4D]" />
              <span>Viva Quick Lab</span>
            </div>
            <ul className="text-xs font-bold space-y-1.5">
              <li>
                <a href="/query-lab" className="hover:underline flex items-center gap-1 text-[#0066CC]">
                  → Interactive Query Lab
                </a>
              </li>
              <li>
                <a href="/analytics" className="hover:underline flex items-center gap-1 text-[#0066CC]">
                  → 15 Aggregation Pipelines
                </a>
              </li>
              <li>
                <a href="/ai" className="hover:underline flex items-center gap-1 text-[#0066CC]">
                  → Groq Tool-Calling Agent
                </a>
              </li>
              <li>
                <a href="/requests" className="hover:underline flex items-center gap-1 text-[#0066CC]">
                  → Live Emergency Dispatch
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between text-xs font-mono font-medium text-neutral-600 gap-2">
          <div>
            MongoDB Cluster URI: <span className="font-bold text-black">mongodb://localhost:27017/lifegrid_db</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Production Grade Academic Release v1.0</span>
            <span className="w-2 h-2 rounded-full bg-[#2EE59D] border border-black" />
          </div>
        </div>
      </div>
    </footer>
  );
}
