"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShieldAlert, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function DpdpCompliancePage() {
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
            <strong className="font-bold">LEGAL REVIEW NOTICE:</strong> This document outlines
            LifeGrid&apos;s architectural compliance readiness under India&apos;s Digital Personal Data
            Protection (DPDP) Act, 2023. This overview is prepared for healthcare enterprise
            audits and requires formal certification by institutional counsel before production SLA
            signing.
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-bold mb-3">
              <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
              <span>Statutory Compliance Architecture</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-slate-900">
              Data Protection (DPDP Act 2023) Notice
            </h1>
            <p className="text-xs text-slate-500 mt-2 font-normal">
              Compliance Framework for Indian Healthcare Organizations • Effective 2026
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">1. Role as Data Fiduciary vs Data Processor</h2>
            <p className="text-sm font-normal text-slate-600 leading-relaxed">
              When voluntary donors directly register on the platform, LifeGrid serves as a Data
              Fiduciary. When partner hospitals upload patient requests or integrate internal blood
              bank stocks, LifeGrid operates strictly as a Data Processor adhering to the
              hospital&apos;s instructions and clinical governance.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">2. Technical &amp; Organizational Measures</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Purpose Limitation</span>
                </div>
                <p className="text-xs font-normal text-slate-600">
                  Donor phone numbers and locations are decrypted only at the moment of emergency
                  matching and never displayed publicly.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Immutable Audit Logging</span>
                </div>
                <p className="text-xs font-normal text-slate-600">
                  All atomic unit reservations, status changes, and staff access attempts are logged
                  to an append-only audit trail with 90-day retention.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Consent Architecture</span>
                </div>
                <p className="text-xs font-normal text-slate-600">
                  Clear, affirmative, unbundled consent is obtained during donor registration with an
                  instant one-click withdrawal mechanism.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Sovereign Data Storage</span>
                </div>
                <p className="text-xs font-normal text-slate-600">
                  All clinical databases and storage instances are hosted strictly on cloud
                  infrastructure located within the sovereign borders of India.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">3. Grievance Redressal</h2>
            <p className="text-sm font-normal text-slate-600 leading-relaxed">
              In accordance with Section 10 of the DPDP Act 2023, questions, access requests, or
              grievances can be submitted to our designated Data Protection Officer:
            </p>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div><strong>Designation:</strong> Data Protection Officer (DPO)</div>
              <div><strong>Email:</strong> <code>compliance@lifegrid.org</code></div>
              <div><strong>Address:</strong> LifeGrid Health Technologies, New Delhi, India</div>
              <div><strong>Turnaround Time:</strong> Grievance resolution within 72 business hours</div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
