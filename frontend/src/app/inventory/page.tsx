"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import dynamic from "next/dynamic";

const BloodBagCanvas = dynamic(
  () => import("@/components/three/BloodBagCanvas"),
  { ssr: false, loading: () => <div className="h-64 w-full bg-slate-100 rounded-2xl animate-pulse flex items-center justify-center text-xs font-bold text-slate-400">Loading 3D Visualizer...</div> }
);

export default function InventoryPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("");
  const [inventory, setInventory] = useState<any[]>([]);
  const [expiringBatches, setExpiringBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Atomic reservation form
  const [reserveGroup, setReserveGroup] = useState("O+");
  const [reserveComponent, setReserveComponent] = useState("whole");
  const [reserveUnits, setReserveUnits] = useState(1);
  const [reserving, setReserving] = useState(false);
  const [reserveResult, setReserveResult] = useState<any>(null);

  const { user } = useAuthStore();

  useEffect(() => {
    async function loadInitial() {
      try {
        const [hospList, expiring] = await Promise.all([
          api.listHospitals(),
          api.getExpiringBatches(14),
        ]);
        setHospitals(hospList);
        setExpiringBatches(expiring);
        if (hospList.length > 0) {
          const defaultHosp = user?.hospital_id || hospList[0].id;
          setSelectedHospitalId(defaultHosp);
        }
      } catch (e) {
        console.error("Failed to load inventory data:", e);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, [user]);

  const loadHospitalInventory = async (hospId: string) => {
    if (!hospId) return;
    setLoading(true);
    try {
      const data = await api.getHospitalInventory(hospId);
      setInventory(data);
    } catch (e) {
      console.error("Failed to fetch inventory:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedHospitalId) {
      loadHospitalInventory(selectedHospitalId);
    }
  }, [selectedHospitalId]);

  const handleAtomicReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHospitalId) return;
    setReserving(true);
    setReserveResult(null);
    try {
      const res: any = await api.atomicReserveInventory(
        selectedHospitalId,
        reserveGroup,
        reserveComponent,
        Number(reserveUnits)
      );
      setReserveResult({
        success: true,
        message: `Atomically reserved ${reserveUnits} unit(s) of ${reserveGroup} (${reserveComponent}).`,
        data: res.data,
      });
      loadHospitalInventory(selectedHospitalId);
    } catch (err: any) {
      setReserveResult({
        success: false,
        message: err.message || "Atomic reservation failed: Insufficient unreserved units in cold storage.",
      });
    } finally {
      setReserving(false);
    }
  };

  const selectedHosp = hospitals.find((h) => h.id === selectedHospitalId);

  return (
    <AuthGuard allowedRoles={["HOSPITAL_STAFF", "ADMIN"]}>
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
        <Navbar onOpenAuth={() => setAuthOpen(true)} />

        {/* Header Banner */}
        <div className="bg-white border-b border-slate-200/80 py-8 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Cold Storage Asset Management</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-slate-900">
                Hospital Blood Inventory
              </h1>
              <p className="text-xs font-normal text-slate-500">
                Live blood bank stock verification, clinical expiration countdown, and direct atomic unit reservation.
              </p>
            </div>

            {/* Hospital Selector Dropdown */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedHospitalId}
                  onChange={(e) => setSelectedHospitalId(e.target.value)}
                  className="bg-transparent font-bold text-xs text-slate-800 outline-none cursor-pointer max-w-[220px] truncate"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.address?.city})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => loadHospitalInventory(selectedHospitalId)}
                title="Refresh Inventory"
                className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 shadow-xs cursor-pointer transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#E23744]" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
          {/* Selected Facility Overview Card */}
          {selectedHosp && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2">
                  <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
                    License: {selectedHosp.registration_no || "PB-BB-2024"}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> NABH Accredited
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-[-0.02em] text-slate-900">{selectedHosp.name}</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedHosp.address?.street}, {selectedHosp.address?.city}, {selectedHosp.address?.state} • Contact: {selectedHosp.contact?.phone}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center min-w-[90px]">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Beds</span>
                  <span className="font-extrabold text-base text-slate-900">{selectedHosp.facilities?.total_beds || 500}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center min-w-[90px]">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Clinical Rating</span>
                  <span className="font-extrabold text-base text-amber-600">★ {selectedHosp.rating || 4.8}</span>
                </div>
              </div>
            </div>
          )}

          {/* 8-Group Inventory Grid */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#E23744]" />
                <span>Blood Group Cold Storage Breakdown</span>
              </h3>
              <span className="text-xs font-semibold text-slate-400">
                8 ABO/Rh Groups
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 h-32 animate-pulse border border-slate-200/80 shadow-xs" />
                ))
              ) : inventory.length === 0 ? (
                <div className="col-span-full bg-white rounded-2xl p-8 text-center text-xs text-slate-500 border border-slate-200/80">
                  No inventory records found for this facility.
                </div>
              ) : (
                inventory.map((inv) => {
                  const isShortage = inv.units_available < 5;
                  return (
                    <div
                      key={inv.blood_group}
                      className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs space-y-2 hover:border-slate-300 transition-all hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b pb-1.5 border-slate-100">
                        <span className="text-xl font-extrabold text-slate-900">{inv.blood_group}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold border ${
                            isShortage
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {isShortage ? "CRITICAL" : "OK"}
                        </span>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Available</div>
                        <div className="text-2xl font-extrabold text-slate-900 leading-none mt-0.5">
                          {inv.units_available}
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 border-t pt-1.5 border-slate-100 flex justify-between font-medium">
                        <span>Reserved:</span>
                        <span className="font-bold text-slate-700">{inv.units_reserved}</span>
                      </div>

                      <div className="text-[10px] text-slate-400 font-medium">
                        {(inv.expiry_batches || []).length} Batches Tracked
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Two Columns: Atomic Reservation Playground + Expiring Batches */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Direct Unit Reservation Card */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-red-200 text-[#E23744] flex items-center justify-center font-bold">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">Direct Unit Reservation</h3>
                  <span className="text-xs text-slate-500 block font-normal">
                    Lock blood units instantly for an emergency patient
                  </span>
                </div>
              </div>

              {/* 3D Blood Bag Unit Inspector */}
              <div className="space-y-1">
                <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                  Clinical Unit 3D Inspector
                </div>
                <div className="rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-50">
                  <BloodBagCanvas className="h-64 w-full" initialGroup={reserveGroup} />
                </div>
              </div>

              {reserveResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-bold ${
                    reserveResult.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  {reserveResult.message}
                </div>
              )}

              <form onSubmit={handleAtomicReserve} className="space-y-3.5 text-xs font-bold">
                <div>
                  <label className="block text-slate-700 uppercase tracking-wider text-[11px] mb-1">Target Blood Group</label>
                  <select
                    value={reserveGroup}
                    onChange={(e) => setReserveGroup(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-400/20 focus:border-[#E23744] transition-all"
                  >
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 uppercase tracking-wider text-[11px] mb-1">Component</label>
                    <select
                      value={reserveComponent}
                      onChange={(e) => setReserveComponent(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-400/20 focus:border-[#E23744] transition-all"
                    >
                      <option value="whole">whole</option>
                      <option value="rbc">rbc</option>
                      <option value="platelets">platelets</option>
                      <option value="plasma">plasma</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 uppercase tracking-wider text-[11px] mb-1">Units to Reserve</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      required
                      value={reserveUnits}
                      onChange={(e) => setReserveUnits(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-400/20 focus:border-[#E23744] transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={reserving}
                  className="w-full py-3.5 bg-[#E23744] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-red-500/20 cursor-pointer transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
                >
                  {reserving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{reserving ? "Processing Atomic Reservation..." : "Reserve Units Now"}</span>
                </button>

                <div className="text-[11px] text-slate-500 font-normal leading-relaxed pt-1">
                  ℹ️ Reserved units are immediately held in the hospital cold storage queue for this patient, preventing race conditions.
                </div>
              </form>
            </div>

            {/* Expiring Batches Countdown */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900">Clinical Expiry Countdown</h3>
                    <span className="text-xs text-slate-500 block font-normal">
                      Monitoring units approaching shelf-life limits across batches
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold bg-rose-50 text-[#E23744] px-3 py-1 rounded-full border border-red-200">
                  Next 14 Days
                </span>
              </div>

              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {expiringBatches.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-10 font-medium">
                    No batches expiring within the next 14 days.
                  </div>
                ) : (
                  expiringBatches.map((b, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="font-extrabold text-slate-900 flex items-center gap-2">
                          <span className="bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-900 text-xs font-black shadow-2xs">
                            {b.blood_group}
                          </span>
                          <span className="capitalize text-slate-700">{b.component}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({b.batch_id})</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {b.hospital_name} • {b.city}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-black text-sm text-[#E23744]">
                          {b.units} Unit{b.units > 1 ? "s" : ""}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400">
                          {b.days_remaining !== undefined ? `${b.days_remaining}d remaining` : "Expiring soon"}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>

        <Footer />
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    </AuthGuard>
  );
}
