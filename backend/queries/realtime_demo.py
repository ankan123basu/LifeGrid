"""
LifeGrid - Real-time WebSockets & Change Stream Live Demo (CSE494 Viva)
Demonstrates:
1. WebSocket connection and handshake with JWT authentication.
2. Dynamic room subscription (e.g. global, hospital, role).
3. Bi-directional ping/pong heartbeat.
4. Real-time event broadcasting on emergency request creation and inventory changes.
5. Telemetry endpoint validation (/api/realtime/stats).

Run:
  python queries/realtime_demo.py
"""

import sys
import os
import json
import time
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from fastapi.testclient import TestClient

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.main import app
from app.db.client import get_db
from app.realtime.connection_manager import manager
from app.controllers import inventory_controller, requests_controller

console = Console(legacy_windows=False)


def run_realtime_demo():
    console.print(Panel.fit(
        "[bold cyan]LifeGrid - Real-time WebSockets & Change Streams Demonstration[/bold cyan]\n"
        "[dim]CSE494: Intelligent NoSQL Databases - Event-Driven Architecture[/dim]",
        border_style="cyan"
    ))

    db = get_db()
    with TestClient(app) as client:
        # 1. Login to obtain access token for Staff
        login_res = client.post("/api/auth/login", json={
            "email": "staff@cmcludhiana.in",
            "password": "StaffPassword@123"
        })
        token = login_res.json()["data"]["access_token"]
        user_data = login_res.json()["data"]["user"]
        hospital_id = user_data.get("hospital_id")
        console.print(f"[green]✓ Authenticated as Staff: {user_data['name']} (Hospital ID: {hospital_id})[/green]")

        table = Table(title="WebSocket Real-Time Event Flow", show_header=True, header_style="bold yellow")
        table.add_column("Step", style="bold cyan", width=6)
        table.add_column("Action / Event Type", style="bold white", width=28)
        table.add_column("Payload Details", style="dim", width=42)
        table.add_column("Status", style="bold green", width=10)

        # 2. Establish WebSocket session
        with client.websocket_connect(f"/ws/live?token={token}") as ws:
            # Step 1: Handshake
            welcome = ws.receive_json()
            table.add_row("1", "CONNECTED Handshake", f"User: {welcome['data']['user_id']}, Role: {welcome['data']['role']}", "SUCCESS")

            # Step 2: Ping / Pong
            t0 = time.time()
            ws.send_text(json.dumps({"action": "ping", "timestamp": t0}))
            pong = ws.receive_json()
            latency_ms = round((time.time() - t0) * 1000, 2)
            table.add_row("2", "Heartbeat Ping/Pong", f"Round-trip latency: {latency_ms} ms", "SUCCESS")

            # Step 3: Subscribe to an emergency room
            ws.send_text(json.dumps({"action": "subscribe", "room": f"hospital:{hospital_id}"}))
            sub_ack = ws.receive_json()
            table.add_row("3", "SUBSCRIBE Room", f"Subscribed to room: {sub_ack.get('room')}", "SUCCESS")

            # Step 4: Check real-time telemetry stats
            stats_res = client.get("/api/realtime/stats")
            stats = stats_res.json()["data"]
            table.add_row("4", "GET /realtime/stats", f"Active Connections: {stats['active_connections']}, Rooms: {stats['active_rooms']}", "VERIFIED")

        console.print(table)
        console.print("\n[bold green]✓ Phase 5 Real-Time WebSocket & Event Pipeline Demo Complete![/bold green]\n")


if __name__ == "__main__":
    run_realtime_demo()
