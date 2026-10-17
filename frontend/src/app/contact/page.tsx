"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PhoneCall, Mail, MapPin, Building2, Send, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#E23744] mb-8 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to LifeGrid Home</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Contact Channels */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-[#E23744] border border-red-200 rounded-full text-xs font-bold mb-3">
                <Building2 className="w-3.5 h-3.5" />
                <span>Hospital &amp; Public Relations</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-slate-900 leading-tight">
                Contact LifeGrid
              </h1>
              <p className="text-sm font-normal text-slate-600 mt-2 leading-relaxed">
                Connect with our coordination desk for institutional hospital onboarding, technical
                integrations, or donor partnerships.
              </p>
            </div>

            {/* National 112 Card */}
            <div className="p-5 bg-rose-50 rounded-2xl border border-red-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-800 uppercase tracking-wider">
                <PhoneCall className="w-4 h-4 text-[#E23744]" />
                <span>Life-Threatening Emergency?</span>
              </div>
              <div className="text-2xl font-black text-[#E23744]">Call 112</div>
              <p className="text-xs font-normal text-rose-700">
                For active clinical emergencies requiring immediate trauma response, dial 112
                immediately across India.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-200">
                <Mail className="w-4 h-4 text-slate-500 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-900">Hospital Partnerships</div>
                  <div className="text-xs font-normal text-slate-600">partnerships@lifegrid.org</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-200">
                <Mail className="w-4 h-4 text-slate-500 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-900">Data Protection &amp; Legal</div>
                  <div className="text-xs font-normal text-slate-600">compliance@lifegrid.org</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-200">
                <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-900">Central Hub</div>
                  <div className="text-xs font-normal text-slate-600">
                    Medical Enclave, Trauma Coordination Wing, New Delhi
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Inquiry Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            {submitted ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Message Received</h3>
                <p className="text-sm font-normal text-slate-600 max-w-sm mx-auto">
                  Thank you for reaching out. A LifeGrid hospital coordinator will review your
                  inquiry and follow up within 24 business hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-full transition-colors cursor-pointer"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Send an Inquiry</h3>
                <p className="text-xs font-normal text-slate-500 mb-4">
                  For licensed blood bank onboarding or general platform questions.
                </p>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Ramesh Gupta"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:ring-1 focus:ring-red-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Official Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@hospital.org"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:ring-1 focus:ring-red-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Hospital / Organization
                    </label>
                    <input
                      type="text"
                      value={org}
                      onChange={(e) => setOrg(e.target.value)}
                      placeholder="e.g. Riverside Memorial"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:ring-1 focus:ring-red-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your inquiry or hospital blood bank specifications..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:ring-1 focus:ring-red-400 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#E23744] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Inquiry</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
