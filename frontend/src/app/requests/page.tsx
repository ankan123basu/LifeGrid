"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  Droplet,
} from "lucide-react";

function RequestsContent() {
  const searchParams = useSearchParams();
  const paramGroup = searchParams.get("blood_group");
  const paramUrgency = searchParams.get("urgency");
  const paramLocation = searchParams.get("location");
  const paramHospitalId = searchParams.get("hospital_id");

  const [authOpen, setAuthOpen] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUrgency, setFilterUrgency] = useState<string>(
    paramUrgency === "EMERGENCY" ? "CRITICAL" : paramUrgency === "NORMAL" ? "NORMAL" : ""
  );
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterBloodGroup, setFilterBloodGroup] = useState<string>(paramGroup || "");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // New Request Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState(35);
  const [patientGender, setPatientGender] = useState("MALE");
  const [bloodGroup, setBloodGroup] = useState(paramGroup || "O+");
  const [component, setComponent] = useState("whole");
  const [unitsNeeded, setUnitsNeeded] = useState(2);
  const [urgency, setUrgency] = useState(
    paramUrgency === "EMERGENCY" ? "CRITICAL" : "CRITICAL"
  );
  const [diagnosis, setDiagnosis] = useState(
    paramLocation ? `Emergency blood request for patient in ${paramLocation}` : ""
  );
  const [creating, setCreating] = useState(false);

  const { user } = useAuthStore();
  const { alerts } = useLiveStore();

  // If arrived with query parameters, auto-fill and open modal
  useEffect(() => {
    if (paramGroup) {
      setBloodGroup(paramGroup);
      setFilterBloodGroup(paramGroup);
    }
    if (paramUrgency === "EMERGENCY") {
      setUrgency("CRITICAL");
      setFilterUrgency("CRITICAL");
    } else if (paramUrgency === "NORMAL") {
      setUrgency("NORMAL");
    }
    if (paramLocation) {
      setDiagnosis(`Emergency transfusion request for ${paramLocation}`);
    }
    if (paramGroup || paramHospitalId) {
      setModalOpen(true);
    }
  }, [paramGroup, paramUrgency, paramLocation, paramHospitalId]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await api.listRequests(filterStatus || undefined, filterUrgency || undefined, 40);
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

  // Client-side blood group filtering
  const displayedRequests = useMemo(() => {
    if (!filterBloodGroup) return requests;
    return requests.filter((r) => r.blood_group === filterBloodGroup);
  }, [requests, filterBloodGroup]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createRequest({
        patient: {
          name: patientName || "Emergency Patient",
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
          {/* Active Search Banner when coming from Hero Card */}
          {paramGroup && (
            <div className="bg-gradient-to-r from-red-50 via-rose-50 to-white border border-red-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-950 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-white border border-red-200 text-[#E23744]">
                  <Droplet className="w-4 h-4" />
                </span>
                <div>
                  <span className="font-extrabold text-sm text-slate-900">
                    Active Search Filter: Blood Group {paramGroup}
                  </span>
                  <p className="text-slate-600 mt-0.5">
                    {paramLocation ? `Location: ${paramLocation} • ` : ""}
                    Urgency: {paramUrgency || "Emergency"} • Verified network blood banks and voluntary donors notified.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="px-4 py-2 bg-[#E23744] hover:bg-red-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs shrink-0 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Dispatch {paramGroup} Request</span>
              </button>
            </div>
          )}

          {/* Filters Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
            {/* Blood Group Filter */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
              <span className="text-slate-500 uppercase tracking-wider text-[11px] mr-1">Group:</span>
              {["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((grp) => (
                <button
                  key={grp}
                  onClick={() => setFilterBloodGroup(grp)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    filterBloodGroup === grp
                      ? "bg-[#E23744] text-white shadow-xs font-extrabold scale-105"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {grp || "ALL"}
                </button>
              ))}
            </div>

            {/* Urgency Filter */}
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

            {/* Status Filter */}
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
              ) : displayedRequests.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
                  <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="font-bold text-base text-slate-800">No emergency requests match this filter.</p>
                  <p className="text-xs text-slate-500 mt-1 font-normal">
                    Adjust filters or create a new emergency request above.
                  </p>
                  <button
                    onClick={() => {
                      setFilterBloodGroup("");
                      setFilterUrgency("");
                      setFilterStatus("");
                    }}
                    className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                displayedRequests.map((req) => {
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
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            isCrit ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {req.urgency}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-medium text-slate-600">
                          {req.units_needed} units • {req.component?.toUpperCase() || "WHOLE"}
                        </span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                            req.status === "FULFILLED"
                              ? "bg-emerald-50 text-emerald-700"
                              : req.status === "IN_TRANSIT"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Request Detail Panel */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5 sticky top-24">
              {selectedRequest ? (
                <>
                  <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Request Detail</div>
                      <h3 className="text-xl font-black text-slate-900 mt-0.5">
                        {selectedRequest.patient?.name || "Emergency Patient"}
                      </h3>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {selectedRequest.patient?.age}y • {selectedRequest.patient?.gender}
                      </div>
                    </div>
                    <span className="text-2xl font-black bg-rose-50 text-[#E23744] px-3 py-1 rounded-xl border border-red-200 font-mono">
                      {selectedRequest.blood_group}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Units Needed:</span>
                      <span className="font-bold text-slate-800">{selectedRequest.units_needed} units</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Component:</span>
                      <span className="font-bold text-slate-800 uppercase">{selectedRequest.component || "WHOLE"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Urgency:</span>
                      <span className="font-bold text-[#E23744] uppercase">{selectedRequest.urgency}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Current Status:</span>
                      <span className="font-bold text-emerald-600 uppercase">{selectedRequest.status}</span>
                    </div>
                    {selectedRequest.patient?.diagnosis && (
                      <div className="py-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">
                          Clinical Diagnosis:
                        </span>
                        <p className="text-slate-700 font-medium leading-relaxed">{selectedRequest.patient.diagnosis}</p>
                      </div>
                    )}
                  </div>

                  {/* Status Action Buttons for Authorized Roles */}
                  <div className="pt-2 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Advance Request Status:
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleStatusUpdate(selectedRequest.id, "APPROVED")}
                        className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedRequest.id, "IN_TRANSIT")}
                        className="py-2 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Dispatch
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedRequest.id, "FULFILLED")}
                        className="py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Fulfil
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Select a request from the list to view its complete timeline.
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Modal: New Blood Request Form */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 relative animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-rose-50 text-[#E23744]">
                    <ShieldAlert className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Dispatch Emergency Blood Request</h3>
                    <p className="text-[11px] text-slate-500">Broadcasts immediately to partner hospitals &amp; voluntary donors</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Patient Name
                    </label>
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:ring-1 focus:ring-red-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Age
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={120}
                      value={patientAge}
                      onChange={(e) => setPatientAge(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:ring-1 focus:ring-red-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Blood Group Needed
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-red-400"
                    >
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
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
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-red-400"
                    >
                      <option value="whole">Whole Blood</option>
                      <option value="rbc">PRBC (Red Blood Cells)</option>
                      <option value="platelets">Platelets (RDP/SDP)</option>
                      <option value="plasma">Plasma (FFP)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Units Needed
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={20}
                      value={unitsNeeded}
                      onChange={(e) => setUnitsNeeded(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:ring-1 focus:ring-red-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Urgency Level
                    </label>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#E23744] focus:outline-none focus:bg-white focus:ring-1 focus:ring-red-400"
                    >
                      <option value="CRITICAL">Immediate (&lt;1 hour)</option>
                      <option value="HIGH">High (&lt;6 hours)</option>
                      <option value="ROUTINE">Scheduled Surgery</option>
                    </select>
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

export default function RequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
          <RefreshCw className="w-8 h-8 animate-spin text-[#E23744]" />
        </div>
      }
    >
      <RequestsContent />
    </Suspense>
  );
}
