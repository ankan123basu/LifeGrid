"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
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
  SlidersHorizontal,
  ChevronRight,
  User,
  HeartHandshake
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

    // Subscribe to live WebSocket events
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
          coordinates: [75.8573, 30.9010], // Ludhiana
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
    <div className="min-h-screen flex flex-col bg-[#F4F1EA]">
      <Navbar onOpenAuth={() => setAuthOpen(true)} />

      {/* Header Banner */}
      <div className="bg-[#FFFFFF] border-b-[3px] border-black py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-[#FF4D4D] mb-1">
              <span className="w-2.5 h-2.5 bg-[#FF4D4D] border border-black animate-ping" />
              <span>Real-Time Dispatch Console</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              EMERGENCY BLOOD REQUESTS
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchRequests}
              className="neo-btn neo-btn-white text-xs py-2 px-3 shadow-[3px_3px_0px_#000]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => {
                if (!user) setAuthOpen(true);
                else setModalOpen(true);
              }}
              className="neo-btn neo-btn-danger text-xs py-2 px-4 shadow-[4px_4px_0px_#000]"
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
        <div className="neo-card p-4 bg-[#FFFFFF] flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold font-mono">
            <span>Filter Urgency:</span>
            {["", "CRITICAL", "HIGH", "NORMAL"].map((u) => (
              <button
                key={u}
                onClick={() => setFilterUrgency(u)}
                className={`px-2.5 py-1 border-2 border-black transition-all ${
                  filterUrgency === u
                    ? "bg-[#FFE600] shadow-[2px_2px_0px_#000] -translate-y-0.5"
                    : "bg-white hover:bg-neutral-100"
                }`}
              >
                {u || "ALL"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-bold font-mono">
            <span>Filter Status:</span>
            {["", "REQUESTED", "APPROVED", "IN_TRANSIT", "FULFILLED"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 border-2 border-black transition-all ${
                  filterStatus === s
                    ? "bg-[#7CD4FF] shadow-[2px_2px_0px_#000] -translate-y-0.5"
                    : "bg-white hover:bg-neutral-100"
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
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="neo-card p-5 h-24 bg-white animate-pulse" />
              ))
            ) : requests.length === 0 ? (
              <div className="neo-card p-10 text-center bg-white">
                <AlertCircle className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
                <p className="font-bold text-base">No emergency requests match this filter.</p>
                <p className="text-xs text-neutral-500 font-mono mt-1">
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
                    className={`neo-card p-4 bg-white cursor-pointer transition-all ${
                      isSelected
                        ? "border-[#FF4D4D] shadow-[6px_6px_0px_#FF4D4D] -translate-y-1"
                        : "hover:border-black"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black bg-[#FFE600] px-2 border border-black font-mono">
                          {req.blood_group}
                        </span>
                        <span className="font-bold text-sm">
                          {req.patient?.name || "Emergency Patient"}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 border border-black font-black ${
                          isCrit ? "bg-[#FF4D4D] text-white" : "bg-[#7CD4FF]"
                        }`}
                      >
                        {req.urgency}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-neutral-600 mt-2">
                      <div>
                        Units Needed: <span className="font-bold text-black">{req.units_needed} ({req.component})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-black" />
                        <span className="font-bold text-black">{req.status}</span>
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
              <div className="neo-card p-6 bg-white space-y-5">
                <div className="flex items-center justify-between border-b-2 border-black pb-3">
                  <div>
                    <span className="text-xs font-mono text-neutral-500 block">ID: {selectedRequest.id}</span>
                    <h3 className="text-xl font-black">
                      {selectedRequest.patient?.name}
                    </h3>
                  </div>
                  <div className="w-12 h-12 bg-[#FF4D4D] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center font-black text-white text-lg">
                    {selectedRequest.blood_group}
                  </div>
                </div>

                {/* Patient Details */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-[#F4F1EA] p-2 border border-black">
                    <span className="text-neutral-500 block text-[10px]">Age / Gender</span>
                    <span className="font-bold">{selectedRequest.patient?.age} Yrs • {selectedRequest.patient?.gender}</span>
                  </div>
                  <div className="bg-[#F4F1EA] p-2 border border-black">
                    <span className="text-neutral-500 block text-[10px]">Component</span>
                    <span className="font-bold">{selectedRequest.component}</span>
                  </div>
                </div>

                {/* Clinical Diagnosis */}
                <div className="bg-[#F4F1EA] p-3 border border-black text-xs">
                  <span className="text-neutral-500 font-mono text-[10px] block uppercase mb-1">Diagnosis / Indication</span>
                  <p className="font-medium text-neutral-800">
                    {selectedRequest.patient?.diagnosis || "Emergency Transfusion Required"}
                  </p>
                </div>

                {/* Embedded Timeline Visualizer */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase mb-3">
                    <Clock className="w-4 h-4 text-[#FF4D4D]" />
                    <span>Embedded Audit Timeline ($push)</span>
                  </div>
                  <div className="space-y-2 border-l-2 border-black pl-3 ml-2 text-xs font-mono">
                    {(selectedRequest.timeline || []).map((t: any, idx: number) => (
                      <div key={idx} className="relative">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FFE600] border border-black absolute -left-[18px] top-1" />
                        <div className="font-extrabold">{t.status}</div>
                        <div className="text-[10px] text-neutral-500">{new Date(t.at).toLocaleTimeString()}</div>
                        {t.note && <div className="text-[11px] text-neutral-700 mt-0.5">{t.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Transition Controls (Staff / Admin) */}
                <div className="pt-3 border-t-2 border-black space-y-2">
                  <span className="text-xs font-mono font-bold block uppercase text-neutral-500">Update Request State:</span>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono font-bold">
                    <button
                      onClick={() => handleStatusUpdate(selectedRequest.id, "APPROVED")}
                      className="p-2 border-2 border-black bg-[#FFE600] hover:-translate-y-0.5 transition-transform"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedRequest.id, "IN_TRANSIT")}
                      className="p-2 border-2 border-black bg-[#7CD4FF] hover:-translate-y-0.5 transition-transform"
                    >
                      Dispatch
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedRequest.id, "FULFILLED")}
                      className="p-2 border-2 border-black bg-[#2EE59D] hover:-translate-y-0.5 transition-transform"
                    >
                      Fulfilled
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="neo-card p-10 text-center bg-white text-xs font-mono text-neutral-500">
                Select a request from the left column to view its embedded timeline and clinical triage.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New Emergency Request Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="neo-card bg-white max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 border-2 border-black bg-[#FF4D4D] text-white"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-4 h-4 bg-[#FF4D4D] border border-black" />
              <h2 className="text-xl font-black">DISPATCH EMERGENCY BLOOD REQUEST</h2>
            </div>
            <p className="text-xs font-mono text-neutral-600 mb-4">
              Validated strictly against MongoDB <code>blood_requests</code> schema rules.
            </p>

            <form onSubmit={handleCreate} className="space-y-4 text-xs font-mono font-bold">
              <div>
                <label className="block mb-1">Patient Full Name</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Gurpreet Singh"
                  className="neo-input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Patient Age</label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    required
                    value={patientAge}
                    onChange={(e) => setPatientAge(Number(e.target.value))}
                    className="neo-input text-xs"
                  />
                </div>
                <div>
                  <label className="block mb-1">Gender</label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                    className="neo-input text-xs"
                  >
                    <option value="MALE">MALE</option>
                    <option value="FEMALE">FEMALE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="neo-input text-xs bg-[#FFE600]"
                  >
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Component</label>
                  <select
                    value={component}
                    onChange={(e) => setComponent(e.target.value)}
                    className="neo-input text-xs"
                  >
                    <option value="whole">whole</option>
                    <option value="rbc">rbc</option>
                    <option value="platelets">platelets</option>
                    <option value="plasma">plasma</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Units Demanded</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={unitsNeeded}
                    onChange={(e) => setUnitsNeeded(Number(e.target.value))}
                    className="neo-input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1">Urgency Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {["CRITICAL", "HIGH", "NORMAL"].map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUrgency(u)}
                      className={`p-2 border-2 border-black text-center ${
                        urgency === u
                          ? u === "CRITICAL"
                            ? "bg-[#FF4D4D] text-white shadow-[2px_2px_0px_#000]"
                            : "bg-[#FFE600] text-black shadow-[2px_2px_0px_#000]"
                          : "bg-white"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-1">Diagnosis &amp; Clinical Notes</label>
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  rows={2}
                  placeholder="e.g. Acute hemorrhagic trauma from highway accident."
                  className="neo-input text-xs resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="neo-btn neo-btn-danger w-full py-2.5 text-xs shadow-[4px_4px_0px_#000] disabled:opacity-50"
              >
                {creating ? "Submitting to MongoDB..." : "Confirm & Broadcast to Network"}
              </button>
            </form>
          </div>
        </div>
      )}

      <Footer />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
