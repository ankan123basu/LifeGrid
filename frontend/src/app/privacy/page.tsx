"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShieldCheck, AlertCircle, ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
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
            <strong className="font-bold">LEGAL REVIEW NOTICE:</strong> This draft privacy policy
            outlines the baseline data protection practices for the LifeGrid emergency coordination
            network. Final terms must be reviewed and certified by registered legal counsel prior to
            commercial hospital onboarding under India&apos;s Digital Personal Data Protection (DPDP) Act,
            2023.
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Compliance &amp; Data Protection</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-slate-900">
              Privacy Policy
            </h1>
            <p className="text-xs text-slate-500 mt-2 font-normal">
              Last updated: October 18, 2026 • Version 1.2
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">1. Information We Collect</h2>
            <p className="text-sm font-normal text-slate-600 leading-relaxed">
              LifeGrid acts as a communication bridge between critical patients, voluntary blood
              donors, and certified hospitals. To coordinate emergency life-saving dispatches, we
              collect:
            </p>
            <ul className="list-disc list-inside text-sm font-normal text-slate-600 space-y-1.5 pl-2">
              <li>
                <strong>Patient &amp; Requester Data:</strong> Patient name, hospital location,
                blood group needed, units required, and contact phone number.
              </li>
              <li>
                <strong>Voluntary Donor Data:</strong> Name, phone number, blood group (ABO/Rh),
                approximate geo-radius, and donation history/cooldown timestamps.
              </li>
              <li>
                <strong>Hospital Staff Credentials:</strong> Official institutional email and blood
                bank verification license number.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">2. How Your Data Is Shared</h2>
            <p className="text-sm font-normal text-slate-600 leading-relaxed">
              We operate under a strict principle of least-privilege emergency disclosure:
            </p>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-normal text-slate-700">
              Your contact details are shared <strong>only with the specific hospital or verified blood bank</strong> handling your immediate request. We never sell, rent, or monetize personal or clinical data for advertising purposes.
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">3. Retention &amp; Audit Logs</h2>
            <p className="text-sm font-normal text-slate-600 leading-relaxed">
              Emergency dispatch audit records are preserved for 90 days in compliance with
              national clinical safety guidelines, after which non-anonymized personal identifiers
              are automatically purged via time-to-live (TTL) expiration.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">4. Your Rights Under DPDP Act</h2>
            <p className="text-sm font-normal text-slate-600 leading-relaxed">
              Under India&apos;s Digital Personal Data Protection Act, you possess the right to access,
              rectify, or request erasure of your donor profile at any time by contacting our Data
              Protection Officer at <code>dpo@lifegrid.org</code>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
