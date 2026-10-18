"""
LifeGrid - Multi-Turn AI Agent with Groq Function Calling & Tool Loop
CSE494: Intelligent NoSQL Databases

Handles multi-turn clinical & database guidance conversations, executes
raw PyMongo database tools, and persists conversation histories in `ai_conversations`.
"""

import json
import logging
import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from bson import ObjectId

from app.db.client import get_db
from app.ai.client import ai_manager
from app.ai.tools.db_tools import TOOLS_SCHEMA, execute_db_tool
from app.ai.prompts.assistant_prompt import SYSTEM_PROMPT_ASSISTANT
from app.utils.serializers import serialize_doc

logger = logging.getLogger("lifegrid.ai.agent")


def run_assistant_agent(
    user_message: str,
    conversation_id: Optional[str] = None,
    user_id: Optional[str] = None,
    role: Optional[str] = None,
    hospital_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes an autonomous Groq LLM agent interaction loop:
    1. Loads or initializes conversation state from MongoDB `ai_conversations`.
    2. Provides system prompt + tool definitions.
    3. Handles function calling iterations by invoking PyMongo DB tools.
    4. Persists the completed turn and telemetry.
    """
    db = get_db()
    conv_obj_id = ObjectId(conversation_id) if conversation_id and ObjectId.is_valid(conversation_id) else ObjectId()
    now = datetime.now(timezone.utc)

    # 1. Retrieve existing conversation history if any
    existing_conv = db.ai_conversations.find_one({"_id": conv_obj_id}) if conversation_id else None

    # Determine valid user_id and role adhering to AI_CONVERSATIONS_SCHEMA
    if user_id and ObjectId.is_valid(user_id):
        user_obj_id = ObjectId(user_id)
    else:
        sample_user = db.users.find_one({"role": "REQUESTER"}, {"_id": 1})
        user_obj_id = sample_user["_id"] if sample_user else ObjectId()

    assigned_role = role if role in ["ADMIN", "HOSPITAL_STAFF", "DONOR", "REQUESTER"] else "REQUESTER"

    history_messages: List[Dict[str, Any]] = []
    if existing_conv and "messages" in existing_conv:
        history_messages = existing_conv["messages"]
    else:
        # Create initial conversation container
        title = (user_message[:40] + ("..." if len(user_message) > 40 else "")) or "Emergency Consultation"
        db.ai_conversations.insert_one({
            "_id": conv_obj_id,
            "user_id": user_obj_id,
            "role": assigned_role,
            "title": title,
            "messages": [],
            "created_at": now,
            "updated_at": now
        })

    # 2. Build full message sequence for Groq
    system_content = SYSTEM_PROMPT_ASSISTANT
    if role:
        system_content += f"\nAuthenticated User Context: Role={role}"
    if hospital_id:
        system_content += f", HospitalID={hospital_id}"

    messages = [{"role": "system", "content": system_content}]
    # Add recent history (up to last 10 messages for token efficiency)
    for m in history_messages[-10:]:
        msg_payload = {"role": m["role"], "content": m.get("content") or ""}
        messages.append(msg_payload)

    # Append current user prompt
    messages.append({"role": "user", "content": user_message})

    # 3. Agent Tool Calling Loop (Max 5 iterations)
    max_turns = 5
    turn_count = 0
    executed_tools: List[Dict[str, Any]] = []
    total_tokens = 0
    total_latency_ms = 0.0
    final_content = ""

    while turn_count < max_turns:
        turn_count += 1
        response_msg, usage_meta, latency_ms = ai_manager.chat_completion(
            messages=messages,
            tools=TOOLS_SCHEMA,
            tool_choice="auto",
            temperature=0.2,
            feature="ASSISTANT_CHAT",
            user_id=str(user_obj_id)
        )
        total_tokens += usage_meta.get("total_tokens", 0)
        total_latency_ms += latency_ms

        # Check if model requested tool execution
        tool_calls = getattr(response_msg, "tool_calls", None)
        if tool_calls:
            logger.info(f"Agent requested {len(tool_calls)} tool call(s).")
            # Format assistant message with tool calls
            tool_calls_dict = []
            for tc in tool_calls:
                tool_calls_dict.append({
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments
                    }
                })

            messages.append({
                "role": "assistant",
                "content": response_msg.content or "",
                "tool_calls": tool_calls_dict
            })

            # Execute each requested tool
            for tc in tool_calls:
                fname = tc.function.name
                fargs = {}
                try:
                    fargs = json.loads(tc.function.arguments)
                except Exception:
                    fargs = {}

                tool_result = execute_db_tool(fname, fargs)
                executed_tools.append({
                    "tool": fname,
                    "arguments": fargs,
                    "result_summary": f"Returned {len(tool_result)} items" if isinstance(tool_result, list) else "Executed"
                })

                # Append tool response
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(tool_result)
                })
        else:
            # Final text response obtained
            final_content = response_msg.content or ""
            break

    # If the model had empty content (e.g. reasoning model token exhaustion or loop limit reached)
    if not final_content and executed_tools:
        try:
            summary_msg, s_meta, s_lat = ai_manager.chat_completion(
                messages=messages + [{
                    "role": "user",
                    "content": "Please provide a clear, concise, direct response answering the user's inquiry based on the database data above."
                }],
                temperature=0.3,
                feature="ASSISTANT_CHAT",
                user_id=str(user_obj_id)
            )
            final_content = summary_msg.content or ""
            total_tokens += s_meta.get("total_tokens", 0)
            total_latency_ms += s_lat
        except Exception as e:
            logger.warning(f"Failed to synthesize final answer: {e}")

    if not final_content:
        final_content = "I have checked the LifeGrid database records for your inquiry. Please see the clinical data retrieved."

    # Strip double asterisks and raw markdown artifacts for a clean human-readable conversation
    final_content = re.sub(r"\*\*(.*?)\*\*", r"\1", final_content)
    final_content = final_content.replace("**", "").replace("### ", "").strip()

    # 4. Save updated messages to MongoDB adhering to strict schema
    new_user_entry = {"role": "user", "content": user_message, "at": now}
    new_assistant_entry = {
        "role": "assistant",
        "content": final_content,
        "at": datetime.now(timezone.utc)
    }

    db.ai_conversations.update_one(
        {"_id": conv_obj_id},
        {
            "$push": {
                "messages": {"$each": [new_user_entry, new_assistant_entry]}
            },
            "$set": {
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    return {
        "conversation_id": str(conv_obj_id),
        "reply": final_content,
        "response": final_content,
        "tools_executed": executed_tools,
        "tool_calls": executed_tools,
        "latency_ms": round(total_latency_ms, 2),
        "telemetry": {
            "total_tokens": total_tokens,
            "latency_ms": round(total_latency_ms, 2),
            "iterations": turn_count
        }
    }
