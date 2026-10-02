"""
middleware.py – Production-grade FastAPI middleware stack:
  - Request ID injection (X-Request-ID header)
  - Structured JSON access logging
  - Global exception handler → consistent error envelope
  - Per-IP sliding-window rate limiter (configurable via env)
"""

import time
import uuid
import json
import logging
from collections import defaultdict
from typing import Callable, Dict, Tuple

from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("kinetix.api")
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
    level=logging.INFO,
)

# ── Rate-limiter config ────────────────────────────────────────────────────────
RATE_LIMIT_REQUESTS: int = 120   # requests per window
RATE_LIMIT_WINDOW:   int = 60    # window size in seconds

# Per-IP sliding window store: ip → (count, window_start)
_rate_store: Dict[str, Tuple[int, float]] = defaultdict(lambda: (0, time.time()))


def _check_rate_limit(ip: str) -> None:
    count, window_start = _rate_store[ip]
    now = time.time()

    if now - window_start > RATE_LIMIT_WINDOW:
        # New window
        _rate_store[ip] = (1, now)
    else:
        count += 1
        _rate_store[ip] = (count, window_start)
        if count > RATE_LIMIT_REQUESTS:
            retry_after = int(RATE_LIMIT_WINDOW - (now - window_start)) + 1
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "rate_limit_exceeded",
                    "message": f"Too many requests. Retry after {retry_after}s.",
                    "retry_after_seconds": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Injects a unique X-Request-ID on every request/response."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class AccessLogMiddleware(BaseHTTPMiddleware):
    """Structured access log: method, path, status, latency, IP."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        t0 = time.perf_counter()
        response = await call_next(request)
        latency_ms = round((time.perf_counter() - t0) * 1000, 2)

        rid = getattr(request.state, "request_id", "-")
        logger.info(
            json.dumps({
                "request_id": rid,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "latency_ms": latency_ms,
                "client_ip": request.client.host if request.client else "unknown",
            })
        )
        response.headers["X-Response-Time"] = f"{latency_ms}ms"
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-IP sliding-window rate limiter. Skips health/docs endpoints."""

    SKIP_PATHS = {"/health", "/docs", "/redoc", "/openapi.json"}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.url.path not in self.SKIP_PATHS:
            ip = request.client.host if request.client else "unknown"
            try:
                _check_rate_limit(ip)
            except HTTPException as exc:
                return JSONResponse(
                    status_code=exc.status_code,
                    content={"detail": exc.detail},
                    headers=exc.headers or {},
                )
        return await call_next(request)


class GlobalExceptionMiddleware(BaseHTTPMiddleware):
    """Catches unhandled exceptions and returns a consistent JSON error envelope."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            return await call_next(request)
        except HTTPException:
            raise  # Let FastAPI's default handler deal with these
        except Exception as exc:
            rid = getattr(request.state, "request_id", "-")
            logger.exception(f"[{rid}] Unhandled exception on {request.method} {request.url.path}")
            return JSONResponse(
                status_code=500,
                content={
                    "detail": {
                        "error": "internal_server_error",
                        "message": "An unexpected error occurred. Please try again.",
                        "request_id": rid,
                    }
                },
            )
