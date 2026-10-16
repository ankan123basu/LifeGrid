/**
 * LifeGrid - Unified Backend API Client
 * CSE494: Intelligent NoSQL Databases
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("lifegrid_access_token");
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("lifegrid_access_token", token);
      } else {
        localStorage.removeItem("lifegrid_access_token");
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== "undefined") {
      this.token = localStorage.getItem("lifegrid_access_token");
    }
    return this.token;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set("Content-Type", "application/json");

    const token = this.getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message || data?.detail || `API Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  }

  // --- Auth Endpoints ---
  async login(email: string, password: string) {
    const res: any = await this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (res.data?.access_token) {
      this.setToken(res.data.access_token);
    }
    return res.data;
  }

  async register(payload: any) {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getMe() {
    return this.request("/api/auth/me");
  }

  logout() {
    this.setToken(null);
  }

  // --- Analytics & Aggregations (15 University-Grade Pipelines) ---
  async getBloodStockByGroup() {
    const res: any = await this.request("/api/analytics/blood-stock");
    return res.data || [];
  }

  async getCriticalShortages(threshold = 5) {
    const res: any = await this.request(`/api/analytics/shortages?threshold=${threshold}`);
    return res.data || [];
  }

  async getMonthlyDonationTrend() {
    const res: any = await this.request("/api/analytics/monthly-trend");
    return res.data || [];
  }

  async getTopDonors(limit = 10) {
    const res: any = await this.request(`/api/analytics/top-donors?limit=${limit}`);
    return res.data || [];
  }

  async getFulfilmentTime() {
    const res: any = await this.request("/api/analytics/fulfilment-time");
    return res.data || [];
  }

  async getNearestDonors(lng: number, lat: number, bloodGroup: string, radiusKm = 30, limit = 10) {
    const res: any = await this.request(
      `/api/analytics/nearest-donors?lng=${lng}&lat=${lat}&blood_group=${encodeURIComponent(bloodGroup)}&radius_km=${radiusKm}&limit=${limit}`
    );
    return res.data || [];
  }

  async getRequestFunnel() {
    const res: any = await this.request("/api/analytics/request-funnel");
    return res.data || {};
  }

  async getHospitalLeaderboard(limit = 10) {
    const res: any = await this.request(`/api/analytics/hospital-leaderboard?limit=${limit}`);
    return res.data || [];
  }

  async getExpiringBatches(days = 7) {
    const res: any = await this.request(`/api/analytics/expiring-batches?days=${days}`);
    return res.data || [];
  }

  async getCityDemandSupply() {
    const res: any = await this.request("/api/analytics/demand-supply");
    return res.data || [];
  }

  async getDonorRetention() {
    const res: any = await this.request("/api/analytics/donor-retention");
    return res.data || [];
  }

  async getPeakHourHeatmap() {
    const res: any = await this.request("/api/analytics/peak-hours");
    return res.data || [];
  }

  async getComponentShare() {
    const res: any = await this.request("/api/analytics/component-share");
    return res.data || [];
  }

  async materializeDailySummary() {
    const res: any = await this.request("/api/analytics/materialize-daily", { method: "POST" });
    return res.data || {};
  }

  async getAiUsage() {
    const res: any = await this.request("/api/analytics/ai-usage");
    return res.data || [];
  }

  async executeQueryLab(collectionName: string, pipeline: any[], explain = false, sandbox = false) {
    return this.request("/api/analytics/query-lab/execute", {
      method: "POST",
      body: JSON.stringify({
        collection_name: collectionName,
        pipeline,
        explain,
        sandbox,
      }),
    });
  }

  // --- Blood Requests ---
  async listRequests(status?: string, urgency?: string, limit = 20) {
    let url = `/api/requests?limit=${limit}`;
    if (status) url += `&status=${status}`;
    if (urgency) url += `&urgency=${urgency}`;
    const res: any = await this.request(url);
    return res.data || [];
  }

  async createRequest(payload: any) {
    return this.request("/api/requests", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateRequestStatus(id: string, newStatus: string, note: string) {
    return this.request(`/api/requests/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus, note }),
    });
  }

  // --- Hospitals & Inventory ---
  async listHospitals(city?: string, limit = 50) {
    let url = `/api/hospitals?limit=${limit}`;
    if (city) url += `&city=${encodeURIComponent(city)}`;
    const res: any = await this.request(url);
    return res.data || [];
  }

  async getHospitalInventory(hospitalId: string) {
    const res: any = await this.request(`/api/inventory/hospital/${hospitalId}`);
    return res.data || [];
  }

  async atomicReserveInventory(hospitalId: string, bloodGroup: string, component: string, units: number) {
    return this.request("/api/inventory/reserve", {
      method: "POST",
      body: JSON.stringify({
        hospital_id: hospitalId,
        blood_group: bloodGroup,
        component,
        units,
      }),
    });
  }

  // --- AI Features (Groq) ---
  async aiChat(message: string, conversationId?: string) {
    return this.request("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
      }),
    });
  }

  async aiParseEmergency(rawText: string) {
    return this.request("/api/ai/parse-emergency", {
      method: "POST",
      body: JSON.stringify({ raw_text: rawText }),
    });
  }

  async aiQueryLabGenerate(prompt: string) {
    return this.request("/api/ai/query-lab/generate", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });
  }

  async aiForecast(windowDays = 7, hospitalId?: string) {
    return this.request("/api/ai/forecast", {
      method: "POST",
      body: JSON.stringify({
        window_days: windowDays,
        hospital_id: hospitalId,
      }),
    });
  }

  async aiOutreach(payload: {
    blood_group: string;
    hospital_name: string;
    city: string;
    urgency: string;
    patient_diagnosis?: string;
  }) {
    return this.request("/api/ai/outreach", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async aiTelemetry() {
    const res: any = await this.request("/api/ai/telemetry");
    return res.data || {};
  }

  async getRealtimeStats() {
    const res: any = await this.request("/api/realtime/stats");
    return res.data || {};
  }
}

export const api = new ApiClient();
