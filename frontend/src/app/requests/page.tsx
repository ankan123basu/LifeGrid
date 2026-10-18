"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";
import { useAuthStore, useLiveStore } from "@/lib/store";
import { socketClient } from "@/lib/socket";
import {
  ShieldAlert,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  ChevronRight,
  User,
  HeartHandshake,
  Activity,
  X,
} from "lucide-react";

export default function RequestsPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUrgency, setFilterUrgency] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // New Request Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState(35);
  const [patientGender, setPatientGender] = useState("MALE");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [component, setComponent] = useState("whole");
  const [unitsNeeded, setUnitsNeeded] = useState(2);
  const [urgency, setUrgency] = useState("CRITICAL");
  const [diagnosis, setDiagnosis] = useState("");
  const [creating, setCreating] = useState(false);

  const { user } = useAuthStore();
  const { alerts } = useLiveStore();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await api.listRequests(filterStatus || undefined, filterUrgency || undefined, 30);
      setRequests(data);
      if (data.length > 0 && !selectedRequest) {
        setSelectedRequest(data[0]);
      }
    } catch (e) {
      console.error("Failed to load requests:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    const unsub = socketClient.subscribe((event, data) => {
      if (event === "EMERGENCY_REQUEST_CREATED" || event === "REQUEST_STATUS_UPDATED") {
        fetchRequests();
      }
    });

    return () => unsub();
  }, [filterStatus, filterUrgency]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createRequest({
        patient: {
          name: patientName,
          age: Number(patientAge),
          gender: patientGender,
          diagnosis: diagnosis || "Emergency Transfusion",
        },
        blood_group: bloodGroup,
        component,
        units_needed: Number(unitsNeeded),
        urgency,
        needed_by: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
        location: {
          type: "Point",
          coordinates: [75.8573, 30.9010],
        },
      });
      setModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      alert(err.message || "Failed to create request. Ensure you are signed in.");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusUpdate = async (reqId: string, newStatus: string) => {
    try {
      await api.updateRequestStatus(reqId, newStatus, `Status transitioned to ${newStatus} via dashboard.`);
      fetchRequests();
      if (selectedRequest && selectedRequest.id === reqId) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }
    } catch (err: any) {
      alert(err.message || "Status update failed.");
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
        <Navbar onOpenAuth={() => setAuthOpen(true)} />

      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200/80 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-[#E23744] border border-red-200 rounded-full text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#E23744] animate-ping" />
              <span>Real-Time Dispatch Console</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-slate-900">
              Emergency Blood Requests
            </h1>
            <p className="text-xs font-normal text-slate-500">
              Active patient requests coordinated with partner hospital blood banks and volunteer donors.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchRequests}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#E23744]" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => {
                if (!user) setAuthOpen(true);
                else setModalOpen(true);
              }}
              className="px-5 py-2.5 bg-[#E23744] hover:bg-red-700 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md shadow-red-500/20 cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Dispatch Emergency</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Filters & Lists */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        {/* Filters Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="text-slate-500 uppercase tracking-wider text-[11px] mr-1">Urgency:</span>
            {["", "CRITICAL", "HIGH", "NORMAL"].map((u) => (
              <button
                key={u}
                onClick={() => setFilterUrgency(u)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  filterUrgency === u
                    ? "bg-[#E23744] text-white shadow-xs font-extrabold"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                {u || "ALL"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="text-slate-500 uppercase tracking-wider text-[11px] mr-1">Status:</span>
            {["", "REQUESTED", "APPROVED", "IN_TRANSIT", "FULFILLED"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === s
                    ? "bg-slate-900 text-white shadow-xs font-extrabold"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                {s || "ALL"}
              </button>
            ))}
          </div>
        </div>

        {/* Two-Column Layout: Request List + Detail Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Requests List Column */}
          <div className="lg:col-span-7 space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200 animate-pulse space-y-2" />
              ))
            ) : requests.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
                <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="font-bold text-base text-slate-800">No emergency requests match this filter.</p>
                <p className="text-xs text-slate-500 mt-1 font-normal">
                  Adjust filters or create a new emergency request above.
                </p>
              </div>
            ) : (
              requests.map((req) => {
                const isSelected = selectedRequest && selectedRequest.id === req.id;
                const isCrit = req.urgency === "CRITICAL";
                return (
                  <div
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#E23744] shadow-md ring-2 ring-red-100"
                        : "border-slate-200/90 hover:border-slate-300 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base font-black bg-rose-50 text-[#E23744] px-2.5 py-0.5 rounded-lg border border-red-200 font-mono">
                          {req.blood_group}
                        </span>
                        <span className="font-extrabold text-sm text-slate-900">
                          {req.patient?.name || "Emergency Patient"}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase ${
                          isCrit
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {req.urgency}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium mt-2">
                      <div>
                        Needed: <span className="font-bold text-slate-800">{req.units_needed} units ({req.component})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="font-bold text-slate-800">{req.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Request Detail & Live Timeline */}
          <div className="lg:col-span-5 sticky top-24">
            {selectedRequest ? (
              <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[11px] text-slate-400 font-mono block">ID: {selectedRequest.id}</span>
                    <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                      {selectedRequest.patient?.name}
                    </h3>
                  </div>
                  <div className="w-12 h-12 bg-[#E23744] rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-sm">
                    {selectedRequest.blood_group}
                  </div>
                </div>

                {/* Patient Details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Age / Gender</span>
                    <span className="font-bold text-slate-800">{selectedRequest.patient?.age} Yrs • {selectedRequest.patient?.gender}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Component</span>
                    <span className="font-bold text-slate-800">{selectedRequest.component}</span>
                  </div>
                </div>

                {/* Clinical Diagnosis */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                  <span className="text-slate-400 text-[10px] block uppercase font-bold mb-1">Diagnosis / Indication</span>
                  <p className="font-medium text-slate-700">
                    {selectedRequest.patient?.diagnosis || "Emergency Transfusion Required"}
                  </p>
                </div>

                {/* Embedded Timeline Visualizer */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    <Clock className="w-3.5 h-3.5 text-[#E23744]" />
                    <span>Audit Status Timeline</span>
                  </div>
                  <div className="space-y-2 border-l-2 border-slate-200 pl-3.5 ml-1.5 text-xs">
                    {selectedRequest.timeline?.map((step: any, idx: number) => (
                      <div key={idx} className="relative">
                        <span className="absolute -left-[19px] top-1 w-2 h-2 rounded-full bg-[#E23744]" />
                        <div className="font-bold text-slate-800">{step.status}</div>
                        <div className="text-[11px] text-slate-500">{step.notes || new Date(step.timestamp).toLocaleTimeString()}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Transitions */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                  {["REQUESTED", "APPROVED", "IN_TRANSIT", "FULFILLED"].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusUpdate(selectedRequest.id, st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        selectedRequest.status === st
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>

      {/* New Request Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-1">
              Dispatch Emergency Blood Request
            </h3>
            <p className="text-xs text-slate-500 mb-5 font-normal">
              Broadcasts immediate alerts across partner hospital blood banks and nearby voluntary donors.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Patient Name
                </label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Gurpreet Singh"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:ring-1 focus:ring-red-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Component
                  </label>
                  <select
                    value={component}
                    onChange={(e) => setComponent(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="whole">Whole Blood</option>
                    <option value="rbc">PRBC (Cells)</option>
                    <option value="platelets">Platelets</option>
                    <option value="plasma">Plasma</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Units Needed
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={unitsNeeded}
                    onChange={(e) => setUnitsNeeded(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Diagnosis &amp; Clinical Notes
                </label>
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  rows={2}
                  placeholder="e.g. Acute hemorrhagic trauma from highway accident."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:ring-1 focus:ring-red-400 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3.5 bg-[#E23744] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                {creating ? "Broadcasting Request..." : "Confirm & Broadcast to Network"}
              </button>
            </form>
          </div>
        </div>
      )}

      <Footer />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  </AuthGuard>
  );
}
