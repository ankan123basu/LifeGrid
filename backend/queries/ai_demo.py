"""
LifeGrid - Groq AI Engine Live Viva Demonstration (CSE494)
Executes and displays real-time results for all 5 Groq AI features:
1. Emergency WhatsApp / distress text parsing to structured JSON
2. Multi-turn Agent with MongoDB Tool Calling (live DB queries)
3. Natural language to MongoDB aggregation pipeline generator
4. Blood inventory shortage forecasting
5. Multilingual donor outreach generation (English, Hindi, Punjabi)
6. Real-time telemetry & token expenditure audit

Run:
  python queries/ai_demo.py
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

console = Console(legacy_windows=False)


def run_ai_demo():
    console.print(Panel.fit(
        "[bold cyan]LifeGrid - Groq AI Engine Live Demonstration[/bold cyan]\n"
        "[dim]CSE494: Intelligent NoSQL Databases - LLM Tool Calling & Clinical Intelligence[/dim]",
        border_style="cyan"
    ))

    with TestClient(app) as client:
        # 1. Emergency Distress Message Parser
        console.print("\n[bold yellow]1. Smart Emergency Distress Parser (WhatsApp Forward)[/bold yellow]")
        sample_emergency = (
            "URGENT!! 32yo female severe postpartum hemorrhage at CMC Ludhiana! "
            "Requires 3 units of O-negative packed red cells IMMEDIATELY! ICU Bed 4."
        )
        t0 = time.time()
        res_parse = client.post("/api/ai/parse-emergency", json={"raw_text": sample_emergency})
        dur_parse = round((time.time() - t0) * 1000, 1)
        assert res_parse.status_code == 200
        parse_data = res_parse.json()["data"]
        console.print(f"[green]Parsed Output ({dur_parse} ms):[/green]")
        console.print(f"  Blood Group: [bold red]{parse_data.get('blood_group')}[/bold red] | Component: {parse_data.get('component')}")
        console.print(f"  Units Needed: {parse_data.get('units_needed')} | Urgency: [bold red]{parse_data.get('urgency')}[/bold red]")
        console.print(f"  Patient: {parse_data.get('patient', {}).get('name')} (Age: {parse_data.get('patient', {}).get('age')})")
        console.print(f"  Triage Rationale: {parse_data.get('triage_summary')}")

        # 2. Conversational Agent with Tool Calling
        console.print("\n[bold yellow]2. Conversational Agent with Autonomous Tool Calling[/bold yellow]")
        agent_query = "What is our current available stock of O+ blood, and do we have any critical shortages?"
        t0 = time.time()
        res_chat = client.post("/api/ai/chat", json={"message": agent_query})
        dur_chat = round((time.time() - t0) * 1000, 1)
        assert res_chat.status_code == 200
        chat_data = res_chat.json()["data"]
        console.print(f"[green]Agent Response ({dur_chat} ms):[/green]")
        console.print(chat_data.get("reply", "")[:300] + "...")
        tools_used = chat_data.get("tools_executed", [])
        console.print(f"  [cyan]Tools Executed ({len(tools_used)}):[/cyan] {[t['tool'] for t in tools_used]}")

        # 3. Query Lab Generator
        console.print("\n[bold yellow]3. Query Lab: Natural Language to Aggregation Pipeline[/bold yellow]")
        nl_query = "Show me the top 3 cities with the most blood requests, sorted descending"
        t0 = time.time()
        res_qgen = client.post("/api/ai/query-lab/generate", json={"prompt": nl_query})
        dur_qgen = round((time.time() - t0) * 1000, 1)
        assert res_qgen.status_code == 200
        qgen_data = res_qgen.json()["data"]
        console.print(f"[green]Generated Pipeline ({dur_qgen} ms):[/green]")
        console.print(f"  Target Collection: [cyan]{qgen_data.get('collection')}[/cyan]")
        console.print(f"  Pipeline Stages: {len(qgen_data.get('pipeline', []))} stages")
        console.print(f"  Viva Explanation: {qgen_data.get('explanation')[:180]}...")

        # 4. Shortage Forecasting
        console.print("\n[bold yellow]4. Predictive Shortage Forecast (7-Day Horizon)[/bold yellow]")
        t0 = time.time()
        res_forecast = client.post("/api/ai/forecast", json={"window_days": 7})
        dur_forecast = round((time.time() - t0) * 1000, 1)
        assert res_forecast.status_code == 200
        fc_data = res_forecast.json()["data"]
        console.print(f"[green]Forecast Output ({dur_forecast} ms):[/green]")
        console.print(f"  Risk Level: [bold yellow]{fc_data.get('risk_level')}[/bold yellow]")
        console.print(f"  Predictions Count: {len(fc_data.get('shortage_predictions', []))}")
        console.print(f"  Summary: {fc_data.get('executive_summary', '')[:200]}...")

        # 5. Multilingual Donor Outreach
        console.print("\n[bold yellow]5. Multilingual Donor Outreach Generator[/bold yellow]")
        t0 = time.time()
        res_outreach = client.post("/api/ai/outreach", json={
            "blood_group": "AB-",
            "hospital_name": "Dayanand Medical College",
            "city": "Ludhiana",
            "urgency": "CRITICAL",
            "patient_diagnosis": "Emergency cardiovascular surgery"
        })
        dur_outreach = round((time.time() - t0) * 1000, 1)
        assert res_outreach.status_code == 200
        outreach_data = res_outreach.json()["data"]
        console.print(f"[green]Generated Outreach Messages ({dur_outreach} ms):[/green]")
        messages_obj = outreach_data.get("messages", {})
        console.print(f"  [bold]English SMS:[/bold] {messages_obj.get('english', {}).get('sms')}")
        console.print(f"  [bold]Hindi WhatsApp:[/bold] {messages_obj.get('hindi', {}).get('whatsapp', '')[:100]}...")
        console.print(f"  [bold]Punjabi SMS:[/bold] {messages_obj.get('punjabi', {}).get('sms')}")

        # 6. Telemetry & Token Accounting
        console.print("\n[bold yellow]6. AI Telemetry & Token Expenditure Verification[/bold yellow]")
        res_telem = client.get("/api/ai/telemetry")
        assert res_telem.status_code == 200
        telem = res_telem.json()["data"]
        console.print(f"  Total Calls: [bold green]{telem['total_calls']}[/bold green] | Total Tokens: [bold cyan]{telem['total_tokens']}[/bold cyan]")

    console.print("\n[bold green]✓ Phase 6 Groq AI Engine Full Verification Complete![/bold green]\n")


if __name__ == "__main__":
    run_ai_demo()
