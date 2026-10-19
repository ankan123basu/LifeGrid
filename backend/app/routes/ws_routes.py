"""
LifeGrid - Real-time WebSocket Endpoints & Subscription Hub
LifeGrid Core Platform Architecture

Provides:
- WebSocket endpoint `/ws/live` with JWT query param authentication,
  automatic room assignment, and bidirectional message handling (ping/pong, subscribe/unsubscribe).
- REST endpoint `GET /api/realtime/stats` for real-time telemetry.
"""

import json
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from bson import ObjectId

from app.db.client import get_db
from app.realtime.connection_manager import manager
from app.utils.jwt import decode_access_token
from app.utils.serializers import serialize_doc

logger = logging.getLogger("lifegrid.realtime.routes")

router = APIRouter(tags=["Real-time WebSockets"])


def get_user_from_token(token: Optional[str]) -> Optional[dict]:
    """Decodes token and loads user from database."""
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        db = get_db()
        return db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    except Exception as e:
        logger.debug(f"Invalid or expired WebSocket token: {e}")
        return None


@router.websocket("/ws/live")
async def websocket_live_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    Main WebSocket endpoint for real-time LifeGrid updates.
    - Query param: `?token=<jwt_access_token>` (optional).
    - Subscribes client to global, role, and private user rooms automatically.
    - Client can send `{"action": "subscribe", "room": "..."}` or `{"action": "ping"}`.
    """
    user = get_user_from_token(token)
    from app.realtime.stream_listener import stream_listener
    if stream_listener._loop is None or not stream_listener._loop.is_running():
        try:
            import asyncio
            stream_listener._loop = asyncio.get_running_loop()
        except RuntimeError:
            pass

    await manager.connect(websocket, user=user)

    # Send welcome handshake
    await manager.send_personal(websocket, {
        "event": "CONNECTED",
        "data": {
            "message": "Connected to LifeGrid Real-time Network",
            "authenticated": user is not None,
            "user_id": str(user["_id"]) if user else None,
            "role": user.get("role") if user else "ANONYMOUS",
            "rooms": list(manager.connections.get(websocket, {}).get("rooms", []))
        }
    })

    try:
        while True:
            text_data = await websocket.receive_text()
            try:
                msg = json.loads(text_data)
            except json.JSONDecodeError:
                await manager.send_personal(websocket, {"error": "Invalid JSON format"})
                continue

            action = msg.get("action", "").lower()

            if action == "ping":
                await manager.send_personal(websocket, {"event": "pong", "timestamp": msg.get("timestamp")})

            elif action == "subscribe":
                room = msg.get("room")
                if room:
                    # Enforce basic room permission check: only ADMIN or respective user can join user:<id>
                    if room.startswith("user:") and (not user or str(user["_id"]) != room.split("user:")[1] and user.get("role") != "ADMIN"):
                        await manager.send_personal(websocket, {"error": "Unauthorized room access", "room": room})
                    else:
                        await manager.join_room(websocket, room)
                        await manager.send_personal(websocket, {"event": "SUBSCRIBED", "room": room})

            elif action == "unsubscribe":
                room = msg.get("room")
                if room:
                    await manager.leave_room(websocket, room)
                    await manager.send_personal(websocket, {"event": "UNSUBSCRIBED", "room": room})

            elif action == "auth":
                # Late authentication over already open WebSocket
                auth_token = msg.get("token")
                authed_user = get_user_from_token(auth_token)
                if authed_user:
                    user_id = str(authed_user["_id"])
                    role = authed_user.get("role")
                    await manager.join_room(websocket, f"user:{user_id}")
                    if role:
                        await manager.join_room(websocket, f"role:{role}")
                    if authed_user.get("hospital_id"):
                        await manager.join_room(websocket, f"hospital:{str(authed_user['hospital_id'])}")

                    await manager.send_personal(websocket, {
                        "event": "AUTHENTICATED",
                        "user_id": user_id,
                        "role": role
                    })
                else:
                    await manager.send_personal(websocket, {"error": "Authentication failed"})
            else:
                await manager.send_personal(websocket, {"error": f"Unknown action: {action}"})

    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket unhandled error: {e}")
        await manager.disconnect(websocket)


@router.get("/api/realtime/stats")
async def get_realtime_stats():
    """Returns current real-time telemetry, active connections, and room statistics."""
    return {
        "success": True,
        "data": manager.get_stats(),
        "meta": {}
    }
