"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Heart,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Share2,
  Download,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  User,
  Scale,
  Activity,
  FileText,
  Volume2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";

interface DeferralReason {
  rule_id: string;
  label: string;
  type: string;
  explanation: string;
  advice: string;
  eligible_again_on?: string;
}

interface EligibilityResult {
  status: "ELIGIBLE" | "ELIGIBLE_LATER" | "NOT_ELIGIBLE" | "CONSULT_DOCTOR";
  eligible_from?: string | null;
  days_remaining?: number | null;
  reasons: DeferralReason[];
  passed_checks: string[];
  next_steps: string[];
  rules_version: string;
  evaluated_at: string;
}

const STORAGE_KEY = "lifegrid_eligibility_answers_v1";

export default function EligibilityWizardPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<EligibilityResult | null>(null);

  // AI Explanation State
  const [selectedLang, setSelectedLang] = useState<"en" | "hi" | "pa">("en");
  const [explaining, setExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<{
    summary: string;
    explanation: string;
  } | null>(null);

  // Form State — all fields start empty so user must enter/select them consciously
  const [formData, setFormData] = useState({
    // Step 1: Basics
    age: "",
    dob: "",
    sex: "" as "male" | "female" | "other" | "",
    weight: "",

    // Step 2: Last Donation
    hasDonatedBefore: "" as "yes" | "no" | "",
    lastDonationDate: "",
    donationType: "whole_blood",

    // Step 3: Recent Health & Procedures
    recentFever: false,
    recentIllness: "none",
    recentVaccination: false,
    vaccineType: "other_non_live",
    recentTattoo: false,
    tattooDate: "",
    recentDental: false,
    recentSurgery: "none",
    antibioticsActive: false,

    // Step 4: Lifestyle
    alcoholLast24h: null as boolean | null,

    // Step 5: Medical History
    chronicConditions: [] as string[],
    physicianRestricted: false,

    // Step 6: Women's Health (if female)
    isPregnant: false,
    recentDelivery: false,
    deliveryDate: "",
    isBreastfeeding: false,
    recentMiscarriage: false,

    // Step 7: Optional Hemoglobin
    knowsHb: "" as "yes" | "no" | "",
    hemoglobin: "",
  });

  // Load saved draft on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        setFormData(JSON.parse(saved));
      }
    } catch (e) {
      // Ignore sessionStorage errors
    }
  }, []);

  // Save draft on changes
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    } catch (e) {
      // Ignore
    }
  }, [formData]);

  const isFemale = formData.sex === "female";
  const totalSteps = isFemale ? 7 : 6;

  function updateField(key: string, value: any) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrorMsg("");
  }

  function toggleChronic(item: string) {
    setFormData((prev) => {
      const exists = prev.chronicConditions.includes(item);
      const updated = exists
        ? prev.chronicConditions.filter((c) => c !== item)
        : [...prev.chronicConditions, item];
      return { ...prev, chronicConditions: updated };
    });
  }

  // Reactive Step Validity Checker (controls whether Continue button is enabled)
  function isStepValid(currentStep: number): boolean {
    if (currentStep === 1) {
      const numAge = parseInt(formData.age, 10);
      const numWeight = parseFloat(formData.weight);
      return (
        formData.age.trim() !== "" &&
        !isNaN(numAge) &&
        numAge >= 10 &&
        numAge <= 120 &&
        Boolean(formData.sex) &&
        formData.weight.trim() !== "" &&
        !isNaN(numWeight) &&
        numWeight >= 20 &&
        numWeight <= 250
      );
    }
    if (currentStep === 2) {
      if (!formData.hasDonatedBefore) return false;
      if (formData.hasDonatedBefore === "yes" && !formData.lastDonationDate) return false;
      return true;
    }
    if (currentStep === 3) {
      if (formData.recentTattoo && !formData.tattooDate) return false;
      return true;
    }
    if (currentStep === 4) {
      return formData.alcoholLast24h !== null;
    }
    if (currentStep === 5) {
      return true;
    }
    if (currentStep === 6 && isFemale) {
      if (formData.recentDelivery && !formData.deliveryDate) return false;
      return true;
    }
    if (currentStep === 7 || (currentStep === 6 && !isFemale)) {
      if (!formData.knowsHb) return false;
      if (formData.knowsHb === "yes") {
        const numHb = parseFloat(formData.hemoglobin);
        return formData.hemoglobin.trim() !== "" && !isNaN(numHb) && numHb > 0;
      }
      return true;
    }
    return true;
  }

  // Step Validation with user-visible errors
  function validateStep(currentStep: number): boolean {
    if (currentStep === 1) {
      const numAge = parseInt(formData.age, 10);
      if (isNaN(numAge) || numAge < 10 || numAge > 120) {
        setErrorMsg("Please enter a valid age between 10 and 120.");
        return false;
      }
      if (!formData.sex) {
        setErrorMsg("Please select biological sex.");
        return false;
      }
      const numWeight = parseFloat(formData.weight);
      if (isNaN(numWeight) || numWeight < 20 || numWeight > 250) {
        setErrorMsg("Please enter a valid weight in kg.");
        return false;
      }
    }

    if (currentStep === 2) {
      if (!formData.hasDonatedBefore) {
        setErrorMsg("Please indicate if you have donated blood before.");
        return false;
      }
      if (formData.hasDonatedBefore === "yes" && !formData.lastDonationDate) {
        setErrorMsg("Please specify the date of your last donation.");
        return false;
      }
    }

    if (currentStep === 3) {
      if (formData.recentTattoo && !formData.tattooDate) {
        setErrorMsg("Please specify approximate date of your tattoo or piercing.");
        return false;
      }
    }

    if (currentStep === 4) {
      if (formData.alcoholLast24h === null) {
        setErrorMsg("Please answer the alcohol intake question.");
        return false;
      }
    }

    return true;
  }

  function handleNext() {
    if (!validateStep(step)) return;

    if (step === 5 && !isFemale) {
      // Skip female step for male/other
      setStep(7);
    } else if (step < 7) {
      setStep((s) => s + 1);
    } else {
      handleSubmit();
    }
  }

  function handlePrev() {
    setErrorMsg("");
    if (step === 7 && !isFemale) {
      setStep(5);
    } else if (step > 1) {
      setStep((s) => s - 1);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setErrorMsg("");

    const payload: any = {
      age: parseInt(formData.age, 10),
      sex: formData.sex,
      weight: parseFloat(formData.weight),
      donation_type: formData.donationType,
      is_first_time: formData.hasDonatedBefore === "no",
      physician_restricted_donation: formData.physicianRestricted,
      chronic_conditions: formData.chronicConditions,
      active_medications: [] as string[],
    };

    if (formData.hasDonatedBefore === "yes" && formData.lastDonationDate) {
      payload.last_donation_date = formData.lastDonationDate;
    }

    if (formData.recentTattoo && formData.tattooDate) {
      payload.tattoo_piercing_date = formData.tattooDate;
    }

    if (formData.antibioticsActive) {
      payload.active_medications.push("antibiotics");
    }

    if (formData.recentIllness !== "none") {
      payload.recent_illness = formData.recentIllness;
    }

    if (formData.recentVaccination) {
      payload.recent_vaccine = formData.vaccineType;
    }

    if (formData.alcoholLast24h) {
      payload.alcohol_24h = true;
    }

    if (isFemale) {
      payload.is_pregnant = formData.isPregnant;
      payload.is_breastfeeding = formData.isBreastfeeding;
      if (formData.recentDelivery && formData.deliveryDate) {
        payload.delivery_date = formData.deliveryDate;
      }
    }

    if (formData.knowsHb === "yes" && formData.hemoglobin) {
      payload.hemoglobin = parseFloat(formData.hemoglobin);
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${API_BASE}/api/v1/eligibility/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let detail = `Server error ${res.status}`;
        try {
          const errBody = await res.json();
          detail = errBody?.detail || errBody?.error?.message || detail;
        } catch (_) {}
        throw new Error(detail);
      }

      const data: EligibilityResult = await res.json();
      setResult(data);

      // Trigger default AI explanation in background
      fetchAiExplanation(data, selectedLang);
    } catch (err: any) {
      const msg = err.message || "Network error";
      setErrorMsg(`Eligibility check failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAiExplanation(resData: EligibilityResult, lang: "en" | "hi" | "pa") {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    setExplaining(true);
    try {
      const explainRes = await fetch(`${API_BASE}/api/v1/eligibility/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result: resData,
          language: lang,
        }),
      });

      if (explainRes.ok) {
        const explainData = await explainRes.json();
        setAiExplanation(explainData);
      }
    } catch (e) {
      // AI fallback handled gracefully
    } finally {
      setExplaining(false);
    }
  }

  function handleLanguageChange(lang: "en" | "hi" | "pa") {
    setSelectedLang(lang);
    if (result) {
      fetchAiExplanation(result, lang);
    }
  }

  function handleRetake() {
    sessionStorage.removeItem(STORAGE_KEY);
    setResult(null);
    setAiExplanation(null);
    setStep(1);
  }

  // Generate .ics calendar file for temporary deferrals
  function handleDownloadICS() {
    if (!result?.eligible_from) return;

    const dateStr = result.eligible_from.replace(/-/g, "");
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//LifeGrid//Blood Donation Cooldown Reminder//EN",
      "BEGIN:VEVENT",
      `UID:${Date.now()}@lifegrid.org`,
      `DTSTAMP:${dateStr}T090000Z`,
      `DTSTART:${dateStr}T090000Z`,
      `DTEND:${dateStr}T100000Z`,
      "SUMMARY:🩸 LifeGrid: Eligible to Donate Blood Today!",
      "DESCRIPTION:Your cooldown period has ended. You are now clinically eligible to donate whole blood and save lives on LifeGrid.",
      "LOCATION:Nearest LifeGrid Partner Blood Bank",
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `LifeGrid_Donation_Eligibility_${result.eligible_from}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full">
        {/* Header Title */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-slate-900">
            Blood donation eligibility check
          </h1>
          <p className="text-sm font-normal text-slate-500 max-w-lg mx-auto">
            Answer a few questions to check if you can donate whole blood today. Based on common Indian screening criteria — final decision at the donation centre.
          </p>
        </div>

        {/* Wizard Card */}
        {!result ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 space-y-6">
            {/* Step Progress Bar — never shows 100% until evaluation succeeds */}
            {(() => {
              const displayStep = Math.min(step > 6 && !isFemale ? 6 : step, totalSteps - 1);
              const pct = Math.min(Math.round((displayStep / totalSteps) * 100), 95);
              return (
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                    <span>Step {displayStep} of {totalSteps}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E23744] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {errorMsg && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div>{errorMsg}</div>
                  <button
                    type="button"
                    onClick={() => { setErrorMsg(""); handleNext(); }}
                    className="mt-1.5 text-[11px] font-extrabold text-[#E23744] hover:underline cursor-pointer"
                  >
                    Retry →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 1: BASICS ── */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-lg font-extrabold text-slate-900">1. Basic Vitals</h2>
                  <p className="text-xs text-slate-500">Age, biological sex, and current weight.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1.5">
                      Your Age (Years) *
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="120"
                      value={formData.age}
                      onChange={(e) => updateField("age", e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#E23744]"
                      placeholder="e.g. 24"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">Must be at least 18 years old.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1.5">
                      Body Weight (kg) *
                    </label>
                    <input
                      type="number"
                      min="20"
                      max="250"
                      value={formData.weight}
                      onChange={(e) => updateField("weight", e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#E23744]"
                      placeholder="e.g. 62"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">Minimum required is 45 kg.</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-700 mb-2">
                    Biological Sex *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "male", label: "Male" },
                      { id: "female", label: "Female" },
                      { id: "other", label: "Other" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => updateField("sex", s.id)}
                        className={`p-3.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                          formData.sex === s.id
                            ? "bg-[#E23744] text-white border-[#E23744] shadow-md shadow-red-500/20"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: LAST DONATION ── */}
            {step === 2 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-lg font-extrabold text-slate-900">2. Previous Donation History</h2>
                  <p className="text-xs text-slate-500">Cooldown intervals ensure your body fully restores iron reserves.</p>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-700 mb-2">
                    Have you donated blood before?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateField("hasDonatedBefore", "no")}
                      className={`p-3.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                        formData.hasDonatedBefore === "no"
                          ? "bg-[#E23744] text-white border-[#E23744] shadow-md shadow-red-500/20"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      Never donated / First time
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField("hasDonatedBefore", "yes")}
                      className={`p-3.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                        formData.hasDonatedBefore === "yes"
                          ? "bg-[#E23744] text-white border-[#E23744] shadow-md shadow-red-500/20"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      Yes, I have donated before
                    </button>
                  </div>
                </div>

                {formData.hasDonatedBefore === "yes" && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <div>
                      <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1.5">
                        Date of Last Donation *
                      </label>
                      <input
                        type="date"
                        value={formData.lastDonationDate}
                        onChange={(e) => updateField("lastDonationDate", e.target.value)}
                        className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#E23744]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1.5">
                        Donation Type
                      </label>
                      <select
                        value={formData.donationType}
                        onChange={(e) => updateField("donationType", e.target.value)}
                        className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#E23744]"
                      >
                        <option value="whole_blood">Whole Blood (90d male / 120d female cooldown)</option>
                        <option value="platelets">Platelets / Apheresis (14 days cooldown)</option>
                        <option value="plasma">Plasma (28 days cooldown)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 3: RECENT HEALTH & PROCEDURES ── */}
            {step === 3 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-lg font-extrabold text-slate-900">3. Recent Health &amp; Procedures</h2>
                  <p className="text-xs text-slate-500">Temporary deferrals ensure both your recovery and recipient safety.</p>
                </div>

                <div className="space-y-3">
                  {/* Fever */}
                  <label className="flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.recentFever}
                      onChange={(e) => updateField("recentFever", e.target.checked)}
                      className="w-4 h-4 text-[#E23744] rounded"
                    />
                    <div className="text-xs font-bold text-slate-800">
                      Active fever, flu, or persistent cough in the past 14 days
                    </div>
                  </label>

                  {/* Antibiotics */}
                  <label className="flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.antibioticsActive}
                      onChange={(e) => updateField("antibioticsActive", e.target.checked)}
                      className="w-4 h-4 text-[#E23744] rounded"
                    />
                    <div className="text-xs font-bold text-slate-800">
                      Currently taking antibiotic medications (or finished course &lt; 7 days ago)
                    </div>
                  </label>

                  {/* Tattoo or Piercing */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.recentTattoo}
                        onChange={(e) => updateField("recentTattoo", e.target.checked)}
                        className="w-4 h-4 text-[#E23744] rounded"
                      />
                      <div className="text-xs font-bold text-slate-800">
                        Got a tattoo, body piercing, or acupuncture within the last 6 months
                      </div>
                    </label>
                    {formData.recentTattoo && (
                      <div className="pt-2 pl-7">
                        <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                          Date of Tattoo/Piercing:
                        </label>
                        <input
                          type="date"
                          value={formData.tattooDate}
                          onChange={(e) => updateField("tattooDate", e.target.value)}
                          className="w-full sm:w-64 p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                    )}
                  </div>

                  {/* Recent infectious illness select */}
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1.5">
                      Any recent infectious illness (past 12 months)?
                    </label>
                    <select
                      value={formData.recentIllness}
                      onChange={(e) => updateField("recentIllness", e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs"
                    >
                      <option value="none">None of these</option>
                      <option value="malaria">Malaria (requires 3 months post-cure deferral)</option>
                      <option value="dengue">Dengue / Chikungunya (requires 6 months deferral)</option>
                      <option value="typhoid">Typhoid / Jaundice (requires 12 months deferral)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 4: LIFESTYLE ── */}
            {step === 4 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-lg font-extrabold text-slate-900">4. Lifestyle &amp; Hydration</h2>
                  <p className="text-xs text-slate-500">Short-term lifestyle factors affecting circulation.</p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="text-xs font-extrabold text-slate-800">
                      Have you consumed alcohol in the last 24 hours?
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => updateField("alcoholLast24h", false)}
                        className={`p-3 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                          formData.alcoholLast24h === false
                            ? "bg-[#E23744] text-white border-[#E23744] shadow-md shadow-red-500/20"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        No, zero alcohol in past 24h
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField("alcoholLast24h", true)}
                        className={`p-3 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                          formData.alcoholLast24h === true
                            ? "bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-500/20"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        Yes, consumed alcohol
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Alcohol causes mild dehydration. A 24-hour pause avoids vasovagal dizziness during blood draw.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 5: MEDICAL HISTORY ── */}
            {step === 5 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-lg font-extrabold text-slate-900">5. Medical History &amp; Chronic Conditions</h2>
                  <p className="text-xs text-slate-500">Select any condition that applies to you, or leave blank if none.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: "hiv_aids", label: "HIV / Hepatitis B or C" },
                    { id: "cancer", label: "History of Cancer / Malignancy" },
                    { id: "heart_disease", label: "Heart Disease / Renal Failure" },
                    { id: "tb", label: "Active Tuberculosis" },
                    { id: "diabetes", label: "Insulin-Dependent Diabetes" },
                    { id: "hypertension", label: "Hypertension (On Medication)" },
                    { id: "thyroid_disorder", label: "Thyroid Disorder" },
                    { id: "asthma", label: "Asthma (Active Inhaler Use)" },
                  ].map((cond) => {
                    const selected = formData.chronicConditions.includes(cond.id);
                    return (
                      <button
                        key={cond.id}
                        type="button"
                        onClick={() => toggleChronic(cond.id)}
                        className={`p-3.5 rounded-2xl text-left text-xs font-bold border transition-all cursor-pointer ${
                          selected
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {selected ? "✓ " : "+ "}
                        {cond.label}
                      </button>
                    );
                  })}
                </div>

                <label className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.physicianRestricted}
                    onChange={(e) => updateField("physicianRestricted", e.target.checked)}
                    className="w-4 h-4 text-[#E23744] rounded"
                  />
                  <div className="text-xs font-bold text-slate-800">
                    A doctor has specifically advised you not to donate blood
                  </div>
                </label>
              </div>
            )}

            {/* ── STEP 6: WOMEN'S HEALTH (FEMALE ONLY) ── */}
            {step === 6 && isFemale && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-lg font-extrabold text-slate-900">6. Women&apos;s Health</h2>
                  <p className="text-xs text-slate-500">Protects maternal nutrient reserves and infant development.</p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPregnant}
                      onChange={(e) => updateField("isPregnant", e.target.checked)}
                      className="w-4 h-4 text-[#E23744] rounded"
                    />
                    <div className="text-xs font-bold text-slate-800">
                      Currently pregnant
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isBreastfeeding}
                      onChange={(e) => updateField("isBreastfeeding", e.target.checked)}
                      className="w-4 h-4 text-[#E23744] rounded"
                    />
                    <div className="text-xs font-bold text-slate-800">
                      Currently breastfeeding an infant under 12 months
                    </div>
                  </label>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.recentDelivery}
                        onChange={(e) => updateField("recentDelivery", e.target.checked)}
                        className="w-4 h-4 text-[#E23744] rounded"
                      />
                      <div className="text-xs font-bold text-slate-800">
                        Delivered a child within the last 12 months
                      </div>
                    </label>
                    {formData.recentDelivery && (
                      <div className="pt-2 pl-7">
                        <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                          Delivery Date:
                        </label>
                        <input
                          type="date"
                          value={formData.deliveryDate}
                          onChange={(e) => updateField("deliveryDate", e.target.value)}
                          className="w-full sm:w-64 p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 7: OPTIONAL HEMOGLOBIN ── */}
            {step === 7 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    {isFemale ? "7." : "6."} Hemoglobin Level (Optional)
                  </h2>
                  <p className="text-xs text-slate-500">
                    If you don&apos;t know, don&apos;t worry! All blood banks test this on-site free before donation.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-700 mb-2">
                    Do you know your recent hemoglobin reading?
                  </label>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => updateField("knowsHb", "no")}
                      className={`p-3.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                        formData.knowsHb === "no"
                          ? "bg-[#E23744] text-white border-[#E23744] shadow-md shadow-red-500/20"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      I don&apos;t know (test at centre)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField("knowsHb", "yes")}
                      className={`p-3.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                        formData.knowsHb === "yes"
                          ? "bg-[#E23744] text-white border-[#E23744] shadow-md shadow-red-500/20"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Yes, I know it
                    </button>
                  </div>

                  {formData.knowsHb === "yes" && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Hemoglobin reading (g/dL):
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="5"
                        max="25"
                        value={formData.hemoglobin}
                        onChange={(e) => updateField("hemoglobin", e.target.value)}
                        className="w-full sm:w-64 p-3 bg-white border border-slate-200 rounded-2xl font-bold text-sm"
                        placeholder="Enter value, e.g. 13.5"
                        autoComplete="off"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Must be ≥ 12.5 g/dL under national guidelines.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-5 py-3 rounded-full text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={handleNext}
                disabled={loading || !isStepValid(step)}
                className="px-7 py-3 bg-[#E23744] hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#E23744] text-white rounded-full text-xs font-bold tracking-normal shadow-lg shadow-red-500/25 flex items-center gap-2 cursor-pointer transition-all"
              >
                {loading ? (
                  "Evaluating..."
                ) : step === 7 || (!isFemale && step === 6) ? (
                  <>
                    <span>Check eligibility</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Next step</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ── RESULT SCREEN (4 DISTINCT STATES) ── */
          <div className="space-y-6 animate-in zoom-in-95 duration-200">
            {/* Step Progress Bar — 100% on successful evaluation */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
                <span className="flex items-center gap-1.5 font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Assessment complete
                </span>
                <span className="font-bold text-emerald-600">100%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-full" />
              </div>
            </div>

            {/* 1. ELIGIBLE STATE */}
            {result.status === "ELIGIBLE" && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-200 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase text-emerald-600 tracking-wider">
                      Evaluation Result
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                      You are Eligible to Donate!
                    </h2>
                  </div>
                </div>

                <p className="text-sm font-medium text-slate-600 leading-relaxed">
                  Congratulations! You meet all national clinical safety guidelines. 1 whole-blood donation can save up to 3 critical lives in emergency surgery and trauma wings.
                </p>

                {/* AI Empathetic Explanation Card */}
                {aiExplanation && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>AI Clinical Summary</span>
                      </div>
                      {/* Language Switcher */}
                      <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-slate-200 text-[10px] font-bold">
                        <button
                          onClick={() => handleLanguageChange("en")}
                          className={`px-2 py-0.5 rounded-full ${selectedLang === "en" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                        >
                          EN
                        </button>
                        <button
                          onClick={() => handleLanguageChange("hi")}
                          className={`px-2 py-0.5 rounded-full ${selectedLang === "hi" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                        >
                          हिन्दी
                        </button>
                        <button
                          onClick={() => handleLanguageChange("pa")}
                          className={`px-2 py-0.5 rounded-full ${selectedLang === "pa" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                        >
                          ਪੰਜਾਬੀ
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed italic">
                      &quot;{aiExplanation.explanation}&quot;
                    </p>
                  </div>
                )}

                {/* Pre-Donation Checklist */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Pre-Donation Checklist:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {result.next_steps.map((stepText, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs font-semibold text-emerald-950">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{stepText}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTAs */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <Link
                    href={`/requests?prefill_age=${formData.age}&prefill_weight=${formData.weight}`}
                    className="flex-1 py-4 bg-[#E23744] hover:bg-red-700 text-white rounded-full font-extrabold text-xs uppercase tracking-wider text-center shadow-lg shadow-red-500/25 transition-all"
                  >
                    View Emergency Requests Nearby →
                  </Link>
                  <button
                    onClick={handleRetake}
                    className="px-6 py-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-full flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Retake Check
                  </button>
                </div>
              </div>
            )}

            {/* 2. ELIGIBLE LATER (COOLDOWN STATE) */}
            {result.status === "ELIGIBLE_LATER" && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-200 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <Clock className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase text-amber-600 tracking-wider">
                      Temporary Cooldown Active
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                      {result.days_remaining ?? "A few"} Days Remaining
                    </h2>
                  </div>
                </div>

                {result.eligible_from && (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="text-xs font-bold text-amber-900">Your Next Eligible Donation Date:</div>
                      <div className="text-lg font-black text-slate-900 mt-0.5">{result.eligible_from}</div>
                    </div>
                    <button
                      onClick={handleDownloadICS}
                      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Add to Calendar (.ics)</span>
                    </button>
                  </div>
                )}

                {/* Specific Reasons */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Clinical Reasons for Cooldown:
                  </h4>
                  {result.reasons.map((r, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="text-xs font-extrabold text-slate-900">{r.label}</div>
                      <p className="text-xs text-slate-600">{r.explanation}</p>
                      <div className="text-xs font-semibold text-amber-800 pt-1">💡 Advice: {r.advice}</div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleRetake}
                    className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-bold text-xs uppercase tracking-wider text-center cursor-pointer transition-all"
                  >
                    Check Another Time / Retake
                  </button>
                </div>
              </div>
            )}

            {/* 3. NOT ELIGIBLE (PERMANENT / HARD DEFERRAL) */}
            {result.status === "NOT_ELIGIBLE" && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-red-200 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase text-red-600 tracking-wider">
                      Medical Guideline Notice
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                      Blood Donation Not Recommended
                    </h2>
                  </div>
                </div>

                <p className="text-sm font-medium text-slate-600 leading-relaxed">
                  Based on national blood safety standards, you cannot donate blood at this time. These rules exist primarily to safeguard your own cardiovascular health and prevent complications.
                </p>

                <div className="space-y-3">
                  {result.reasons.map((r, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="text-xs font-extrabold text-slate-900">{r.label}</div>
                      <p className="text-xs text-slate-600">{r.explanation}</p>
                      <div className="text-xs font-semibold text-slate-700 pt-1">💡 Note: {r.advice}</div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 space-y-1">
                  <div className="text-xs font-extrabold text-rose-900">How You Can Still Help:</div>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    You can champion blood donation in your local community, coordinate emergency requests, or alert family and friends when critical shortages arise.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleRetake}
                    className="w-full py-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-full cursor-pointer transition-all"
                  >
                    Retake Questionnaire
                  </button>
                </div>
              </div>
            )}

            {/* 4. CONSULT DOCTOR STATE */}
            {result.status === "CONSULT_DOCTOR" && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-blue-200 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <HelpCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase text-blue-600 tracking-wider">
                      Medical Officer Review Required
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                      Consultation Recommended
                    </h2>
                  </div>
                </div>

                <p className="text-sm font-medium text-slate-600 leading-relaxed">
                  You may be eligible to donate, but a quick in-person discussion with the blood bank medical officer is required before donation.
                </p>

                <div className="space-y-3">
                  {result.reasons.map((r, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="text-xs font-extrabold text-slate-900">{r.label}</div>
                      <p className="text-xs text-slate-600">{r.explanation}</p>
                      <div className="text-xs font-semibold text-blue-800 pt-1">💡 Guidance: {r.advice}</div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/inventory"
                    className="flex-1 py-4 bg-[#E23744] hover:bg-red-700 text-white rounded-full font-bold text-xs uppercase tracking-wider text-center transition-all"
                  >
                    Locate Nearest Blood Bank →
                  </Link>
                  <button
                    onClick={handleRetake}
                    className="px-6 py-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-full cursor-pointer transition-all"
                  >
                    Retake
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
