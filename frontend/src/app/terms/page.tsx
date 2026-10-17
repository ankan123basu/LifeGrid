"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { FileText, AlertCircle, ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#E23744] mb-8 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to LifeGrid Home</span>
        </Link>

        {/* Legal Review Notice Box */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-8 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed font-normal">
            <strong className="font-bold">LEGAL REVIEW NOTICE:</strong> These draft terms of service
            define the platform coordination scope for LifeGrid. Formal commercial integration with
            hospital networks requires execution of a signed Master Service Agreement (MSA) reviewed
            by licensed legal counsel.
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-full text-xs font-bold mb-3">
              <FileText className="w-3.5 h-3.5 text-sky-600" />
              <span>Platform Usage &amp; Protocols</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-slate-900">
              Terms of Service
            </h1>
            <p className="text-xs text-slate-500 mt-2 font-normal">
              Last updated: October 18, 2026 • Version 1.1
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">1. Nature of the LifeGrid Service</h2>
            <p className="text-sm font-normal text-slate-600 leading-relaxed">
              LifeGrid provides software coordination, inventory visibility, and alert routing to
              assist in connecting patients with available blood products. LifeGrid itself does NOT
              operate clinical laboratories, harvest blood units, or perform medical procedures.
              All blood storage, screening, testing, cross-matching, and transfusions are conducted
              exclusively by licensed hospitals and blood banks.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">2. Emergency Medical Disclaimer</h2>
            <p className="text-sm font-normal text-slate-600 leading-relaxed">
              In immediate life-threatening situations, users should simultaneously dial National
              Emergency Services at <strong>112</strong>. While LifeGrid dispatches alerts in
              real-time, stock levels are subject to simultaneous in-person hospital allocations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">3. Non-Commercialization Guarantee</h2>
            <p className="text-sm font-normal text-slate-600 leading-relaxed">
              Under Indian law (National Blood Transfusion Council regulations and the Drugs &amp;
              Cosmetics Act), the sale or commercial brokerage of human blood is strictly illegal.
              LifeGrid is a coordination service and never charges matching or facilitation fees.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">4. Partner Hospital Obligations</h2>
            <p className="text-sm font-normal text-slate-600 leading-relaxed">
              Hospitals connecting to LifeGrid agree to maintain accurate stock records, honor atomic
              reservations promptly, and comply with all biomedical waste and patient privacy
              statutes.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
