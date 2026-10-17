"use client";

import Link from "next/link";
import { PhoneCall, Mail, ArrowRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-auto">
      {/* Container with pb-32 to guarantee collapsed or expanded chat widget never covers any links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-32 sm:pb-28">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3.5">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-[#E23744] shadow-md shadow-red-500/25 flex items-center justify-center text-white font-extrabold text-lg">
                ✚
              </span>
              <span className="font-extrabold text-xl text-white">LifeGrid</span>
            </Link>
            <p className="text-xs text-slate-400 font-normal leading-relaxed">
              India&apos;s real-time emergency blood network connecting voluntary lifesavers, partner
              hospital blood banks, and critical patients in real-time.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-full w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Emergency Blood Network
            </div>
          </div>

          {/* For Patients & Requesters */}
          <div>
            <div className="font-bold text-xs uppercase tracking-wider text-white mb-4">
              Find Blood
            </div>
            <ul className="text-xs space-y-2.5 text-slate-400 font-normal">
              <li>
                <Link href="/requests" className="hover:text-white transition-colors">
                  Emergency Blood Request
                </Link>
              </li>
              <li>
                <Link href="/inventory" className="hover:text-white transition-colors">
                  Hospital Blood Stock
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-white transition-colors">
                  How Matching Works
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-white transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* For Donors & Hospitals */}
          <div>
            <div className="font-bold text-xs uppercase tracking-wider text-white mb-4">
              Get Involved
            </div>
            <ul className="text-xs space-y-2.5 text-slate-400 font-normal">
              <li>
                <Link
                  href="/donate/eligibility"
                  className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>Check Donation Eligibility</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </li>
              <li>
                <Link href="/#donors" className="hover:text-white transition-colors">
                  Become a Voluntary Donor
                </Link>
              </li>
              <li>
                <Link href="/#hospitals" className="hover:text-white transition-colors">
                  Register Your Blood Bank
                </Link>
              </li>
              <li>
                <Link href="/compliance/dpdp" className="hover:text-white transition-colors">
                  DPDP Act Compliance
                </Link>
              </li>
            </ul>
          </div>

          {/* 24/7 Helpline & Contact */}
          <div>
            <div className="font-bold text-xs uppercase tracking-wider text-white mb-4">
              Emergency Contact
            </div>
            <div className="space-y-3 text-xs font-normal">
              <div className="p-4 bg-rose-950/40 rounded-2xl border border-rose-800/60 space-y-1.5">
                <div className="text-[10px] text-rose-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <PhoneCall className="w-3 h-3 text-rose-400" />
                  National Emergency Service
                </div>
                <div className="text-base sm:text-lg font-black text-white tracking-normal">
                  Emergency? Call 112
                </div>
                <div className="text-[11px] text-slate-400 leading-snug">
                  Toll-free 24/7 national emergency response across India.
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-xs pt-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Support Desk
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar with Compliance Links */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-normal text-slate-500">
          <div>© 2026 LifeGrid Emergency Resource Network. All rights reserved.</div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-slate-400 text-xs">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="/compliance/dpdp" className="hover:text-white transition-colors">
              Data Protection (DPDP)
            </Link>
            <Link href="/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
