/**
 * LifeGrid - Zustand State Management Stores
 * CSE494: Intelligent NoSQL Databases
 */

import { create } from "zustand";
import { api } from "./api";
import { socketClient } from "./socket";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "HOSPITAL_STAFF" | "DONOR" | "REQUESTER";
  blood_group?: string;
  hospital_id?: string;
  phone?: string;
  city?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  logout: () => void;
  loadSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (email, pass) => {
    set({ isLoading: true });
    try {
      const data = await api.login(email, pass);
      const user = data.user;
      const token = data.access_token;
      set({ user, token, isLoading: false });
      socketClient.connect();
      return user;
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  logout: () => {
    api.logout();
    socketClient.disconnect();
    set({ user: null, token: null, isLoading: false });
  },

  loadSession: async () => {
    const token = api.getToken();
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const res: any = await api.getMe();
      if (res.data) {
        set({ user: res.data, token, isLoading: false });
        socketClient.connect();
      } else {
        set({ user: null, token: null, isLoading: false });
      }
    } catch (e) {
      api.logout();
      set({ user: null, token: null, isLoading: false });
    }
  },
}));

interface RealtimeAlert {
  id: string;
  event: string;
  message: string;
  data: any;
  timestamp: string;
}

interface LiveState {
  connected: boolean;
  alerts: RealtimeAlert[];
  shortageCount: number;
  activeRequestsCount: number;
  setConnected: (status: boolean) => void;
  addAlert: (alert: RealtimeAlert) => void;
  clearAlerts: () => void;
  updateCounts: (shortages: number, requests: number) => void;
}

export const useLiveStore = create<LiveState>((set) => ({
  connected: false,
  alerts: [],
  shortageCount: 0,
  activeRequestsCount: 0,

  setConnected: (status) => set({ connected: status }),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts].slice(0, 30),
    })),

  clearAlerts: () => set({ alerts: [] }),

  updateCounts: (shortages, requests) =>
    set({ shortageCount: shortages, activeRequestsCount: requests }),
}));
