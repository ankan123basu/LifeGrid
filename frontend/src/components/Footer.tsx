"use client";

import Link from "next/link";
import { PhoneCall, Mail, ShieldCheck, Heart, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t-[3px] border-black mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b-2 border-black">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="w-8 h-8 bg-[#FF4D4D] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center text-white font-black text-lg">
                ✚
              </span>
              <span className="font-black text-xl tracking-tight text-black">LifeGrid</span>
            </Link>
            <p className="text-xs text-neutral-600 font-medium leading-relaxed">
              India&apos;s real-time emergency blood network connecting voluntary lifesavers, certified hospital blood banks, and critical patients in minutes.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-400 p-2 w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Verified 24/7 Emergency Dispatch
            </div>
          </div>

          {/* For Patients & Requesters */}
          <div>
            <div className="font-black text-sm uppercase tracking-wide text-black mb-3">
              Find Blood
            </div>
            <ul className="text-xs font-bold space-y-2 text-neutral-700">
              <li>
                <Link href="/requests" className="hover:text-[#FF4D4D] transition-colors">
                  Emergency Blood Request
                </Link>
              </li>
              <li>
                <Link href="/inventory" className="hover:text-[#FF4D4D] transition-colors">
                  Hospital Blood Stock
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-[#FF4D4D] transition-colors">
                  How Matching Works
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-[#FF4D4D] transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* For Donors & Hospitals */}
          <div>
            <div className="font-black text-sm uppercase tracking-wide text-black mb-3">
              Get Involved
            </div>
            <ul className="text-xs font-bold space-y-2 text-neutral-700">
              <li>
                <Link href="/#donors" className="hover:text-[#FF4D4D] transition-colors">
                  Become a Voluntary Donor
                </Link>
              </li>
              <li>
                <Link href="/#eligibility" className="hover:text-[#FF4D4D] transition-colors">
                  Donor Eligibility Checker
                </Link>
              </li>
              <li>
                <Link href="/#hospitals" className="hover:text-[#FF4D4D] transition-colors">
                  Register Your Blood Bank
                </Link>
              </li>
              <li>
                <Link href="/#impact" className="hover:text-[#FF4D4D] transition-colors">
                  Network Lives Saved
                </Link>
              </li>
            </ul>
          </div>

          {/* 24/7 Helpline & Contact */}
          <div>
            <div className="font-black text-sm uppercase tracking-wide text-black mb-3">
              24/7 Emergency Helpline
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 bg-[#FFE600] border-2 border-black shadow-[2px_2px_0px_#000] font-bold">
                <div className="text-[10px] text-neutral-700 uppercase">Toll-Free Dispatch</div>
                <div className="text-base font-black text-black">1800-LIFE-GRID</div>
                <div className="text-[10px] text-neutral-600">(1800-543-3474)</div>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-600 font-sans font-medium pt-1">
                <Mail className="w-3.5 h-3.5 text-neutral-800" />
                <span>support@lifegrid.org</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar & Disclaimer */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-neutral-500">
          <div>
            © 2026 LifeGrid Emergency Resource Network. All rights reserved.
          </div>
          <div className="flex items-center gap-6 font-bold text-neutral-700">
            <a href="#privacy" className="hover:underline">Privacy Policy</a>
            <a href="#terms" className="hover:underline">Terms of Service</a>
            <a href="#medical-disclaimer" className="hover:underline">Medical Disclaimer</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
