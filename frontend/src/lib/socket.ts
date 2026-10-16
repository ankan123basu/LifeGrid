/**
 * LifeGrid - Real-time WebSocket Client
 * CSE494: Intelligent NoSQL Databases
 */

import { api } from "./api";

type EventCallback = (event: string, data: any) => void;

class RealtimeSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Set<EventCallback> = new Set();
  private isConnecting = false;
  private reconnectTimer: any = null;

  connect() {
    if (typeof window === "undefined" || this.ws || this.isConnecting) return;
    this.isConnecting = true;

    const token = api.getToken();
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/live";
    const url = token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnecting = false;
        console.log("[LifeGrid WS] Connected to real-time event pipeline.");
        // Periodic heartbeat
        setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ action: "ping", timestamp: Date.now() }));
          }
        }, 25000);
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const eventType = payload.event || "MESSAGE";
          const data = payload.data || payload;
          this.listeners.forEach((callback) => callback(eventType, data));
        } catch (e) {
          console.error("[LifeGrid WS] Message decode error:", e);
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.isConnecting = false;
        console.log("[LifeGrid WS] Disconnected. Reconnecting in 3s...");
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn("[LifeGrid WS] Error:", err);
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch (e) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  subscribe(callback: EventCallback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  joinRoom(room: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "subscribe", room }));
    }
  }

  leaveRoom(room: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "unsubscribe", room }));
    }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const socketClient = new RealtimeSocketClient();
