"""
LifeGrid - Groq AI Client Singleton & Telemetry Logger
LifeGrid Core Platform Architecture

Manages Groq SDK client instances, chat completions, token usage tracking,
and persistent telemetry logging into MongoDB `ai_usage_logs` collection.
"""

import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from groq import Groq
from bson import ObjectId

from app.config import settings
from app.db.client import get_db

logger = logging.getLogger("lifegrid.ai.client")


class GroqClientManager:
    def __init__(self):
        self._client: Optional[Groq] = None

    def get_client(self) -> Groq:
        if self._client is None:
            if not settings.GROQ_API_KEY:
                logger.warning("GROQ_API_KEY is not set in environment or config.")
            self._client = Groq(api_key=settings.GROQ_API_KEY)
        return self._client

    def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        tool_choice: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1500,
        feature: str = "GENERAL",
        user_id: Optional[str] = None
    ) -> Tuple[Any, Dict[str, Any], float]:
        """
        Executes Groq chat completion, measures latency, records token usage,
        and logs the call into `ai_usage_logs` collection.
        Returns (choice_message, usage_meta, latency_ms).
        """
        client = self.get_client()
        chosen_model = model or settings.GROQ_MODEL_CHAT

        kwargs: Dict[str, Any] = {
            "model": chosen_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = tool_choice or "auto"

        start_time = time.time()
        success = True
        error_msg = None
        prompt_tokens = 0
        completion_tokens = 0
        response_msg = None

        try:
            response = client.chat.completions.create(**kwargs)
            latency_ms = round((time.time() - start_time) * 1000, 2)
            choice = response.choices[0]
            response_msg = choice.message

            if response.usage:
                prompt_tokens = response.usage.prompt_tokens
                completion_tokens = response.usage.completion_tokens
        except Exception as exc:
            latency_ms = round((time.time() - start_time) * 1000, 2)
            success = False
            error_msg = str(exc)
            logger.error(f"Groq API error during feature '{feature}': {exc}")
            raise exc
        finally:
            # Telemetry logging to MongoDB
            self._log_usage(
                feature=feature,
                model=chosen_model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                latency_ms=latency_ms,
                success=success,
                error_message=error_msg,
                user_id=user_id
            )

        usage_meta = {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
            "latency_ms": latency_ms,
            "model": chosen_model
        }
        return response_msg, usage_meta, latency_ms

    def _log_usage(
        self,
        feature: str,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        latency_ms: float,
        success: bool,
        error_message: Optional[str] = None,
        user_id: Optional[str] = None
    ):
        """Persists AI invocation record into ai_usage_logs collection."""
        try:
            db = get_db()
            doc = {
                "_id": ObjectId(),
                "feature": feature,
                "model": model,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "latency_ms": latency_ms,
                "success": success,
                "error": error_message,
                "user_id": ObjectId(user_id) if user_id and ObjectId.is_valid(user_id) else None,
                "at": datetime.now(timezone.utc)
            }
            db.ai_usage_logs.insert_one(doc)
        except Exception as e:
            logger.warning(f"Failed to record AI usage log to database: {e}")


ai_manager = GroqClientManager()
