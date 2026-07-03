from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from database import create_db_and_tables
from routers import auth, venues, bookings, waitlist, admin
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from utils.limiter import limiter
from utils.ws_manager import manager
from utils.error_handler import global_exception_handler
from fastapi import WebSocket, WebSocketDisconnect
from config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(
    title="Eluru Connect — Transparent Venue Scheduler API",
    description="Democratizing public resource access with fair-play algorithms, VIP management, and government oversight.",
    version="2.0.0",
    lifespan=lifespan
)

# 1. Global exception handler (Zero-Crash Policy)
app.add_exception_handler(Exception, global_exception_handler)

# 2. Rate limit handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 3. Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# 4. CORS — specific origins only (credentials require explicit origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 5. Register routers
app.include_router(auth.router)
app.include_router(venues.router)
app.include_router(bookings.router)
app.include_router(waitlist.router)
app.include_router(admin.router)

# 6. WebSocket endpoint for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "Eluru Connect — Transparent Venue Scheduler API",
        "docs": "/docs",
        "status": "Running",
        "version": "2.0.0"
    }

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}
