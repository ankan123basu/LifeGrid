"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
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
  Zap
} from "lucide-react";

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
    <div className="min-h-screen flex flex-col bg-[#F4F1EA]">
      <Navbar onOpenAuth={() => setAuthOpen(true)} />

      {/* Header Banner */}
      <div className="bg-[#FFFFFF] border-b-[3px] border-black py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-[#2EE59D] mb-1">
              <span className="w-2.5 h-2.5 bg-[#2EE59D] border border-black animate-pulse" />
              <span>Cold Storage Asset Management</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              HOSPITAL BLOOD INVENTORY
            </h1>
          </div>

          {/* Hospital Selector Dropdown */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#F4F1EA] p-1.5 border-2 border-black shadow-[3px_3px_0px_#000]">
              <Building2 className="w-4 h-4 text-neutral-600" />
              <select
                value={selectedHospitalId}
                onChange={(e) => setSelectedHospitalId(e.target.value)}
                className="bg-transparent font-bold text-xs font-mono outline-none cursor-pointer"
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
              className="neo-btn neo-btn-white text-xs py-2 px-3 shadow-[3px_3px_0px_#000]"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        {/* Selected Facility Overview Card */}
        {selectedHosp && (
          <div className="neo-card p-5 bg-[#FFFFFF] flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono bg-[#FFE600] px-2 py-0.5 border border-black font-extrabold uppercase">
                Facility License: {selectedHosp.registration_no || "PB-BB-2024"}
              </span>
              <h2 className="text-xl font-black tracking-tight mt-1">{selectedHosp.name}</h2>
              <p className="text-xs text-neutral-600 font-mono">
                {selectedHosp.address?.street}, {selectedHosp.address?.city}, {selectedHosp.address?.state} • Phone: {selectedHosp.contact?.phone}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="p-2 bg-[#F4F1EA] border border-black text-center">
                <span className="text-[10px] text-neutral-500 block">Total Beds</span>
                <span className="font-extrabold text-sm">{selectedHosp.facilities?.total_beds || 500}</span>
              </div>
              <div className="p-2 bg-[#F4F1EA] border border-black text-center">
                <span className="text-[10px] text-neutral-500 block">Rating</span>
                <span className="font-extrabold text-sm">★ {selectedHosp.rating || 4.8}</span>
              </div>
            </div>
          </div>
        )}

        {/* 8-Group Inventory Grid */}
        <section>
          <h3 className="text-xl font-black tracking-tight mb-4 flex items-center gap-2">
            <span className="w-3.5 h-3.5 bg-[#FF4D4D] border border-black" />
            <span>Blood Group Cold Storage Breakdown</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="neo-card p-4 h-32 animate-pulse bg-white" />
              ))
            ) : inventory.length === 0 ? (
              <div className="col-span-full neo-card p-8 text-center bg-white font-mono text-xs text-neutral-500">
                No inventory records found for this facility.
              </div>
            ) : (
              inventory.map((inv) => {
                const isShortage = inv.units_available < 5;
                return (
                  <div
                    key={inv.blood_group}
                    className="neo-card p-3.5 bg-white space-y-2 hover:-translate-y-1 transition-transform"
                  >
                    <div className="flex items-center justify-between border-b pb-1 border-neutral-200">
                      <span className="text-xl font-black font-mono">{inv.blood_group}</span>
                      <span
                        className={`text-[9px] font-mono px-1 border border-black font-extrabold ${
                          isShortage ? "bg-[#FF4D4D] text-white" : "bg-[#2EE59D]"
                        }`}
                      >
                        {isShortage ? "CRITICAL" : "OK"}
                      </span>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono text-neutral-500">Available</div>
                      <div className="text-2xl font-black font-mono leading-none">
                        {inv.units_available}
                      </div>
                    </div>

                    <div className="text-[10px] font-mono text-neutral-600 border-t pt-1 border-neutral-100 flex justify-between">
                      <span>Reserved:</span>
                      <span className="font-bold">{inv.units_reserved}</span>
                    </div>

                    <div className="text-[9px] font-mono text-neutral-400">
                      {(inv.expiry_batches || []).length} Batches
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Two Columns: Atomic Reservation Playground + Expiring Batches */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Atomic Reservation Form */}
          <div className="lg:col-span-5 neo-card p-6 bg-white space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-black pb-2">
              <Lock className="w-5 h-5 text-[#FFE600]" />
              <div>
                <h3 className="font-black text-lg">Atomic Inventory Reservation</h3>
                <span className="text-[11px] font-mono text-neutral-500 block">
                  Demonstrates <code>find_one_and_update()</code> with race condition protection
                </span>
              </div>
            </div>

            {reserveResult && (
              <div
                className={`p-3 border-2 border-black text-xs font-mono font-bold ${
                  reserveResult.success
                    ? "bg-[#2EE59D]/20 border-[#2EE59D] text-black"
                    : "bg-[#FF4D4D]/20 border-[#FF4D4D] text-[#FF4D4D]"
                }`}
              >
                {reserveResult.message}
              </div>
            )}

            <form onSubmit={handleAtomicReserve} className="space-y-3 font-mono text-xs font-bold">
              <div>
                <label className="block mb-1">Target Blood Group</label>
                <select
                  value={reserveGroup}
                  onChange={(e) => setReserveGroup(e.target.value)}
                  className="neo-input text-xs bg-[#FFE600]"
                >
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Component</label>
                  <select
                    value={reserveComponent}
                    onChange={(e) => setReserveComponent(e.target.value)}
                    className="neo-input text-xs"
                  >
                    <option value="whole">whole</option>
                    <option value="rbc">rbc</option>
                    <option value="platelets">platelets</option>
                    <option value="plasma">plasma</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Units to Reserve</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={reserveUnits}
                    onChange={(e) => setReserveUnits(Number(e.target.value))}
                    className="neo-input text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={reserving}
                className="neo-btn neo-btn-primary w-full py-2.5 text-xs shadow-[3px_3px_0px_#000] disabled:opacity-50 mt-2"
              >
                {reserving ? "Executing Atomic Update..." : "Reserve Units Atomically"}
              </button>

              <div className="text-[10px] text-neutral-500 font-mono mt-2 leading-relaxed">
                ℹ️ The atomic filter checks <code>units_available &gt;= units</code> and decrements unreserved while incrementing reserved in a single atomic transaction.
              </div>
            </form>
          </div>

          {/* Expiring Batches Countdown ($unwind on embedded batches) */}
          <div className="lg:col-span-7 neo-card p-6 bg-white space-y-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#FF4D4D]" />
                <div>
                  <h3 className="font-black text-lg">Clinical Expiry Countdown</h3>
                  <span className="text-[11px] font-mono text-neutral-500 block">
                    Aggregation Pipeline #9: <code>$unwind</code> on <code>expiry_batches</code> array
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold bg-[#FF4D4D] text-white px-2 py-0.5 border border-black">
                Next 14 Days
              </span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {expiringBatches.length === 0 ? (
                <div className="text-xs font-mono text-neutral-500 text-center py-8">
                  No batches expiring within the next 14 days.
                </div>
              ) : (
                expiringBatches.map((b, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#F4F1EA] border border-black flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <div className="font-extrabold flex items-center gap-1.5">
                        <span className="bg-[#FFE600] px-1 border border-black">{b.blood_group}</span>
                        <span>{b.component}</span>
                        <span className="text-[10px] text-neutral-500">({b.batch_id})</span>
                      </div>
                      <div className="text-[10px] text-neutral-600 mt-0.5">
                        {b.hospital_name} • {b.city}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-sm text-[#FF4D4D]">
                        {b.units} Unit(s)
                      </div>
                      <div className="text-[10px] text-neutral-500">
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
  );
}
