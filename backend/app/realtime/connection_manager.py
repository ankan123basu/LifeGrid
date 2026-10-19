"""
LifeGrid - Real-time WebSocket Connection & Room Manager
LifeGrid Core Platform Architecture

Handles WebSocket connections, authentication, room-based message routing,
and broadcasting for real-time live events.
"""

import asyncio
import logging
from typing import Dict, Set, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
from app.utils.serializers import serialize_doc

logger = logging.getLogger("lifegrid.realtime.manager")


class ConnectionManager:
    def __init__(self):
        # Maps WebSocket -> metadata dict {user_id, role, hospital_id, rooms: set()}
        self.connections: Dict[WebSocket, Dict[str, Any]] = {}
        # Maps room_name -> Set[WebSocket]
        self.rooms: Dict[str, Set[WebSocket]] = {
            "global": set(),
            "role:ADMIN": set(),
            "role:STAFF": set(),
            "role:DONOR": set(),
            "role:REQUESTER": set(),
        }
        self.lock = asyncio.Lock()
        self.total_messages_broadcast: int = 0

    async def connect(self, websocket: WebSocket, user: Optional[Dict[str, Any]] = None):
        """Accepts connection and assigns default rooms based on user role and ID."""
        await websocket.accept()
        meta = {
            "user_id": str(user["_id"]) if user and "_id" in user else None,
            "role": user.get("role") if user else "ANONYMOUS",
            "hospital_id": str(user.get("hospital_id")) if user and user.get("hospital_id") else None,
            "rooms": set()
        }

        async with self.lock:
            self.connections[websocket] = meta
            # Add to global room
            self._add_to_room_unlocked(websocket, "global")

            # Add to role room
            if meta["role"] and meta["role"] != "ANONYMOUS":
                self._add_to_room_unlocked(websocket, f"role:{meta['role']}")

            # Add to personal user room
            if meta["user_id"]:
                self._add_to_room_unlocked(websocket, f"user:{meta['user_id']}")

            # Add to hospital room if staff
            if meta["hospital_id"]:
                self._add_to_room_unlocked(websocket, f"hospital:{meta['hospital_id']}")

        logger.info(
            f"WebSocket client connected. Role: {meta['role']}, User: {meta['user_id']}, Total connections: {len(self.connections)}"
        )

    async def disconnect(self, websocket: WebSocket):
        """Cleans up disconnected client from all subscribed rooms."""
        async with self.lock:
            meta = self.connections.pop(websocket, None)
            if meta:
                for room in list(meta["rooms"]):
                    if room in self.rooms:
                        self.rooms[room].discard(websocket)
                        if not self.rooms[room] and not room.startswith("role:") and room != "global":
                            del self.rooms[room]
        logger.info(f"WebSocket client disconnected. Remaining connections: {len(self.connections)}")

    def _add_to_room_unlocked(self, websocket: WebSocket, room: str):
        if room not in self.rooms:
            self.rooms[room] = set()
        self.rooms[room].add(websocket)
        if websocket in self.connections:
            self.connections[websocket]["rooms"].add(room)

    async def join_room(self, websocket: WebSocket, room: str):
        async with self.lock:
            if websocket in self.connections:
                self._add_to_room_unlocked(websocket, room)
                logger.debug(f"Socket joined room: {room}")

    async def leave_room(self, websocket: WebSocket, room: str):
        async with self.lock:
            if room in self.rooms:
                self.rooms[room].discard(websocket)
            if websocket in self.connections:
                self.connections[websocket]["rooms"].discard(room)
                logger.debug(f"Socket left room: {room}")

    async def send_personal(self, websocket: WebSocket, message: Dict[str, Any]):
        """Sends serialized JSON message directly to a single socket."""
        try:
            payload = serialize_doc(message)
            await websocket.send_json(payload)
        except Exception as e:
            logger.warning(f"Error sending personal message: {e}")

    async def broadcast_to_room(self, room: str, message: Dict[str, Any]):
        """Broadcasts to all clients subscribed to a room."""
        payload = serialize_doc(message)
        dead_sockets = []

        async with self.lock:
            sockets = list(self.rooms.get(room, []))

        for ws in sockets:
            try:
                await ws.send_json(payload)
            except Exception as e:
                logger.warning(f"Failed sending to socket in room {room}: {e}")
                dead_sockets.append(ws)

        if dead_sockets:
            for ws in dead_sockets:
                await self.disconnect(ws)

        self.total_messages_broadcast += 1

    async def broadcast_global(self, event_type: str, data: Any):
        """Convenience method to broadcast an event to all connected clients."""
        await self.broadcast_to_room("global", {
            "event": event_type,
            "data": data
        })

    async def broadcast_to_user(self, user_id: str, event_type: str, data: Any):
        """Sends targeted event to a specific user's room."""
        await self.broadcast_to_room(f"user:{str(user_id)}", {
            "event": event_type,
            "data": data
        })

    async def broadcast_to_hospital(self, hospital_id: str, event_type: str, data: Any):
        """Sends hospital-specific updates (e.g. inventory alerts) to staff."""
        await self.broadcast_to_room(f"hospital:{str(hospital_id)}", {
            "event": event_type,
            "data": data
        })

    async def broadcast_to_role(self, role: str, event_type: str, data: Any):
        """Broadcasts event to a specific user role."""
        await self.broadcast_to_room(f"role:{role}", {
            "event": event_type,
            "data": data
        })

    def get_stats(self) -> Dict[str, Any]:
        return {
            "active_connections": len(self.connections),
            "active_rooms": len(self.rooms),
            "rooms": {k: len(v) for k, v in self.rooms.items() if len(v) > 0},
            "total_broadcasts": self.total_messages_broadcast
        }


# Singleton connection manager instance
manager = ConnectionManager()
