"""
LifeGrid - Real-time Change Stream & Event Listener
LifeGrid Core Platform Architecture

Monitors MongoDB collections for real-time mutations.
- In Replica Set mode: Uses native MongoDB Change Streams (`watch()`) with resume token tracking.
- In Standalone mode: Gracefully operates a polling fallback watcher and reactive event hooks.
"""

import asyncio
import logging
import threading
import time
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from pymongo.errors import PyMongoError, OperationFailure

from app.db.client import get_db, is_replica_set
from app.realtime.connection_manager import manager
from app.utils.serializers import serialize_doc

logger = logging.getLogger("lifegrid.realtime.listener")


class StreamListener:
    def __init__(self):
        self._running: bool = False
        self._threads: list[threading.Thread] = []
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._resume_tokens: Dict[str, Any] = {}

    def start(self, loop: asyncio.AbstractEventLoop):
        """Starts background listeners for collections."""
        if self._running:
            return
        self._running = True
        self._loop = loop

        is_rs = is_replica_set()
        logger.info(f"Starting Real-time Listener. Replica set detected: {is_rs}")

        if is_rs:
            # Launch native change stream worker threads
            t_requests = threading.Thread(
                target=self._watch_requests_replica_set,
                name="Watch-Requests",
                daemon=True
            )
            t_inventory = threading.Thread(
                target=self._watch_inventory_replica_set,
                name="Watch-Inventory",
                daemon=True
            )
            t_notifications = threading.Thread(
                target=self._watch_notifications_replica_set,
                name="Watch-Notifications",
                daemon=True
            )
            self._threads.extend([t_requests, t_inventory, t_notifications])
            for t in self._threads:
                t.start()
        else:
            # Standalone fallback polling thread
            t_poll = threading.Thread(
                target=self._poll_fallback_worker,
                name="Watch-Poll-Fallback",
                daemon=True
            )
            self._threads.append(t_poll)
            t_poll.start()

    def stop(self):
        """Stops background listeners."""
        self._running = False
        logger.info("Stopping Real-time Listener workers.")

    def _dispatch_async(self, coro):
        """Safely dispatches coroutine from background thread or sync caller to asyncio loop."""
        # 1. If self._loop is set and running:
        if self._loop and self._loop.is_running():
            try:
                current_loop = None
                try:
                    current_loop = asyncio.get_running_loop()
                except RuntimeError:
                    pass

                if current_loop == self._loop:
                    self._loop.create_task(coro)
                else:
                    asyncio.run_coroutine_threadsafe(coro, self._loop)
                return
            except Exception as e:
                logger.warning(f"Error dispatching to main loop: {e}")

        # 2. Try current thread's running loop
        try:
            current_loop = asyncio.get_running_loop()
            if current_loop and current_loop.is_running():
                current_loop.create_task(coro)
                return
        except RuntimeError:
            pass

        # 3. Fallback: run synchronously if no loop exists
        try:
            asyncio.run(coro)
        except Exception as e:
            logger.warning(f"Failed to execute coroutine in fallback: {e}")

    # ------------------------------------------------------------------
    # Replica Set Native Change Streams
    # ------------------------------------------------------------------
    def _watch_requests_replica_set(self):
        db = get_db()
        logger.info("Listening to 'blood_requests' Change Stream...")
        pipeline = [
            {"$match": {"operationType": {"$in": ["insert", "update", "replace"]}}}
        ]
        while self._running:
            try:
                resume_token = self._resume_tokens.get("blood_requests")
                with db.blood_requests.watch(
                    pipeline,
                    resume_after=resume_token,
                    full_document="updateLookup"
                ) as stream:
                    for change in stream:
                        if not self._running:
                            break
                        self._resume_tokens["blood_requests"] = stream.resume_token
                        op_type = change.get("operationType")
                        doc = change.get("fullDocument")
                        if not doc:
                            continue

                        serialized = serialize_doc(doc)
                        if op_type == "insert":
                            logger.info(f"Change Stream: New emergency request {serialized.get('_id')}")
                            self._dispatch_async(
                                manager.broadcast_global("EMERGENCY_REQUEST_CREATED", serialized)
                            )
                            if serialized.get("hospital_id"):
                                self._dispatch_async(
                                    manager.broadcast_to_hospital(
                                        str(serialized["hospital_id"]),
                                        "EMERGENCY_REQUEST_CREATED",
                                        serialized
                                    )
                                )
                        elif op_type in ["update", "replace"]:
                            logger.info(f"Change Stream: Request updated {serialized.get('_id')}")
                            self._dispatch_async(
                                manager.broadcast_global("REQUEST_STATUS_UPDATED", serialized)
                            )
                            if serialized.get("requester_id"):
                                self._dispatch_async(
                                    manager.broadcast_to_user(
                                        str(serialized["requester_id"]),
                                        "REQUEST_STATUS_UPDATED",
                                        serialized
                                    )
                                )
            except OperationFailure as e:
                logger.warning(f"Change Stream OperationFailure in requests (fallback enabled): {e}")
                time.sleep(5)
            except Exception as e:
                logger.error(f"Error in requests Change Stream: {e}")
                time.sleep(2)

    def _watch_inventory_replica_set(self):
        db = get_db()
        logger.info("Listening to 'blood_inventory' Change Stream...")
        while self._running:
            try:
                resume_token = self._resume_tokens.get("blood_inventory")
                with db.blood_inventory.watch(
                    resume_after=resume_token,
                    full_document="updateLookup"
                ) as stream:
                    for change in stream:
                        if not self._running:
                            break
                        self._resume_tokens["blood_inventory"] = stream.resume_token
                        doc = change.get("fullDocument")
                        if not doc:
                            continue

                        serialized = serialize_doc(doc)
                        hospital_id = str(serialized.get("hospital_id"))
                        # Broadcast stock update
                        self._dispatch_async(
                            manager.broadcast_to_hospital(hospital_id, "INVENTORY_UPDATED", serialized)
                        )
                        # Check critical shortage alert (< 5 units)
                        if serialized.get("units_available", 0) < 5:
                            self._dispatch_async(
                                manager.broadcast_global("CRITICAL_SHORTAGE_ALERT", serialized)
                            )
            except OperationFailure as e:
                logger.warning(f"Change Stream OperationFailure in inventory: {e}")
                time.sleep(5)
            except Exception as e:
                logger.error(f"Error in inventory Change Stream: {e}")
                time.sleep(2)

    def _watch_notifications_replica_set(self):
        db = get_db()
        logger.info("Listening to 'notifications' Change Stream...")
        while self._running:
            try:
                resume_token = self._resume_tokens.get("notifications")
                with db.notifications.watch(
                    resume_after=resume_token,
                    full_document="updateLookup"
                ) as stream:
                    for change in stream:
                        if not self._running:
                            break
                        self._resume_tokens["notifications"] = stream.resume_token
                        op_type = change.get("operationType")
                        doc = change.get("fullDocument")
                        if not doc or op_type != "insert":
                            continue

                        serialized = serialize_doc(doc)
                        user_id = str(serialized.get("user_id"))
                        logger.info(f"Change Stream: Dispatching notification to user {user_id}")
                        self._dispatch_async(
                            manager.broadcast_to_user(user_id, "NEW_NOTIFICATION", serialized)
                        )
            except OperationFailure as e:
                logger.warning(f"Change Stream OperationFailure in notifications: {e}")
                time.sleep(5)
            except Exception as e:
                logger.error(f"Error in notifications Change Stream: {e}")
                time.sleep(2)

    # ------------------------------------------------------------------
    # Standalone Polling Fallback
    # ------------------------------------------------------------------
    def _poll_fallback_worker(self):
        db = get_db()
        logger.info("Operating in standalone fallback mode: active polling for real-time changes.")
        last_check = datetime.now(timezone.utc)

        while self._running:
            try:
                now = datetime.now(timezone.utc)
                # Check for recent emergency requests
                new_requests = list(db.blood_requests.find({"created_at": {"$gt": last_check}}))
                for req in new_requests:
                    serialized = serialize_doc(req)
                    self._dispatch_async(
                        manager.broadcast_global("EMERGENCY_REQUEST_CREATED", serialized)
                    )
                    if serialized.get("hospital_id"):
                        self._dispatch_async(
                            manager.broadcast_to_hospital(
                                str(serialized["hospital_id"]),
                                "EMERGENCY_REQUEST_CREATED",
                                serialized
                            )
                        )

                # Check for newly inserted notifications
                new_notifs = list(db.notifications.find({"created_at": {"$gt": last_check}}))
                for notif in new_notifs:
                    serialized = serialize_doc(notif)
                    user_id = str(serialized.get("user_id"))
                    self._dispatch_async(
                        manager.broadcast_to_user(user_id, "NEW_NOTIFICATION", serialized)
                    )

                last_check = now
            except Exception as e:
                logger.error(f"Error in poll fallback worker: {e}")
            time.sleep(2)

    # ------------------------------------------------------------------
    # Direct Reactive Event Hook
    # ------------------------------------------------------------------
    def emit_event(self, event_type: str, data: Dict[str, Any], room: Optional[str] = None):
        """Enables direct programmatic dispatch from FastAPI controllers."""
        serialized = serialize_doc(data)
        if room:
            self._dispatch_async(manager.broadcast_to_room(room, {
                "event": event_type,
                "data": serialized
            }))
        else:
            self._dispatch_async(manager.broadcast_global(event_type, serialized))


# Singleton stream listener instance
stream_listener = StreamListener()
