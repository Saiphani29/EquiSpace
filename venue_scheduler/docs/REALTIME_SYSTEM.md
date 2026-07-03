# Real-Time System — How Live Updates Work

> Explains the WebSocket pipeline: how events are generated in the backend, transmitted to every browser, and acted upon in the frontend — all within milliseconds.

---

## Why Real-Time?

Consider this scenario without real-time:

1. Lakshmi joins the waitlist for ASR Stadium at 10 AM
2. Venkatesh cancels his booking at 2 PM
3. Lakshmi **doesn't know** — she keeps waiting, manually refreshing the page
4. By the time she checks back, someone else has already booked the newly freed slot

With real-time:

1. Lakshmi joins the waitlist
2. Venkatesh cancels at 2 PM
3. **Within 200ms**, Lakshmi's browser receives a notification: *"Your waitlisted slot at ASR Stadium is now confirmed!"*
4. Her dashboard updates automatically — no refresh needed

This is the difference between a useful system and a frustrating one.

---

## Technology: WebSocket

HTTP is a **request-response** protocol — the browser asks, the server answers, connection closes. There is no way for the server to push data to the browser unprompted.

WebSocket is a **persistent, bidirectional** protocol:
- The browser opens a connection once
- It stays open until the browser tab closes
- Either side can send messages at any time
- Latency is typically 20–50ms (vs. 200–500ms for a polling HTTP request)

FastAPI supports WebSocket natively — no extra dependencies.

---

## Backend: Connection Manager

### `backend/utils/ws_manager.py`

```python
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)
        for conn in dead_connections:
            if conn in self.active_connections:
                self.active_connections.remove(conn)

manager = ConnectionManager()   # single shared instance
```

### The Dead Connection Problem

When a user closes their browser tab, the WebSocket connection doesn't immediately tell the server it's gone. The server discovers this only when it tries to send a message and the write fails.

The `broadcast()` method handles this gracefully:
1. Try to send to each connection
2. If any `send_json()` raises an exception → mark that connection as dead
3. After iterating, remove all dead connections from the list

Without this cleanup, the active_connections list would grow indefinitely as users come and go, and eventually broadcasts would take longer and longer.

### The WebSocket Route

```python
# main.py
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()   # keep connection alive
    except WebSocketDisconnect:
        manager.disconnect(websocket)
```

The `while True: receive_text()` loop keeps the connection open. The server doesn't actually process messages from clients — it only receives them to detect disconnections. All real-time traffic flows **server → client**.

---

## Events: When Broadcasts Happen

### 1. New Booking Created

```python
# routers/bookings.py — after successful booking insert
try:
    await manager.broadcast({
        "type": "booking_created",
        "venue_id": booking.venue_id,
        "start_time": booking.start_time.isoformat(),
        "end_time": booking.end_time.isoformat()
    })
except Exception:
    pass   # broadcast failure never breaks the booking
```

**Purpose:** Other users viewing the venues page can see availability change in real-time.

---

### 2. Booking Cancelled

```python
try:
    await manager.broadcast({
        "type": "booking_cancelled",
        "venue_id": booking.venue_id,
        "booking_id": booking.id
    })
except Exception:
    pass
```

**Purpose:** Users browsing venues see the slot become available again.

---

### 3. Waitlist Promoted

This is the most important event. When a booking is cancelled and someone is waiting:

```python
if next_waitlist_user:
    # Create confirmed booking for them
    new_booking = Booking(user_id=next_waitlist_user.user_id, ...)
    session.add(new_booking)
    session.delete(next_waitlist_user)
    session.commit()

    try:
        await manager.broadcast({
            "type": "waitlist_promoted",
            "user_id": next_waitlist_user.user_id,
            "venue_id": new_booking.venue_id,
            "message": f"Great news! Your waitlisted slot at {venue.name} is now confirmed!"
        })
    except Exception:
        pass
```

**Purpose:** The specific user who was promoted receives a personalised success notification.

---

### 4. Booking Overridden (Admin)

```python
try:
    await manager.broadcast({
        "type": "booking_overridden",
        "booking_id": booking.id,
        "reason": override_req.reason
    })
except Exception:
    pass
```

**Purpose:** All connected users are informed of the government action in real-time.

---

### Why `try/except` Around Every Broadcast?

Broadcasting is a **side effect** — it should never cause the main operation to fail. If the WebSocket manager crashes or all connections are dead, the booking should still be confirmed. The `try/except` ensures broadcast failures are silent and non-blocking.

---

## Frontend: WebSocket Client

### Connection Setup

```typescript
// In App.tsx or a dedicated hook
useEffect(() => {
    const WS_URL = import.meta.env.VITE_API_URL?.replace('http', 'ws') || 'ws://localhost:8000';
    const ws = new WebSocket(`${WS_URL}/ws`);

    ws.onopen = () => {
        console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketEvent(data);
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        // Could implement reconnection here
    };

    return () => ws.close();   // cleanup on component unmount
}, []);
```

### Event Handling

```typescript
const handleWebSocketEvent = (data: any) => {
    switch (data.type) {
        case 'waitlist_promoted':
            if (data.user_id === currentUser?.id) {
                toast.success(data.message, { duration: 6000 });
                fetchDashboardData();   // refresh bookings
            }
            break;

        case 'booking_cancelled':
        case 'booking_created':
            // Refresh venue availability if user is on venues page
            if (isOnVenuesPage) {
                fetchVenues();
            }
            break;

        case 'booking_overridden':
            toast(`Booking #${data.booking_id} was overridden by an official`, {
                icon: '⚠️'
            });
            fetchDashboardData();
            break;
    }
};
```

---

## Message Flow Diagram

```
User A cancels booking
        │
        ▼
[POST /bookings/14/cancel]
        │
        ▼
FastAPI: booking.status = CANCELLED
FastAPI: check waitlist for this slot
FastAPI: find Lakshmi at position #1
FastAPI: create confirmed booking for Lakshmi
FastAPI: delete Lakshmi's waitlist entry
FastAPI: session.commit()
        │
        ▼
manager.broadcast({
    type: "waitlist_promoted",
    user_id: Lakshmi.id,
    message: "Your slot is confirmed!"
})
        │
        ├──► Lakshmi's browser (WebSocket) ──► toast.success("Your slot is confirmed!")
        │                                  ──► dashboard refetch
        │
        ├──► User B's browser ──► (user_id doesn't match, ignored)
        │
        └──► User C's browser ──► (user_id doesn't match, ignored)
```

---

## Scalability Consideration

The current implementation stores WebSocket connections **in-memory** (`active_connections` list). This works perfectly on a single server.

For horizontal scaling (multiple server instances), this breaks — User A might be connected to Server 1, and User B's booking cancellation on Server 2 won't reach Server 1's connection pool.

**Production solution:** Replace the in-memory list with **Redis Pub/Sub**:

```python
# Every server subscribes to a Redis channel
# When any server broadcasts, all servers receive it and forward to their own connections

import aioredis
redis = aioredis.from_url("redis://localhost")

async def broadcast_via_redis(message: dict):
    await redis.publish("booking_events", json.dumps(message))
```

This is not implemented in the current version (Redis adds infrastructure complexity), but the `ConnectionManager` class is designed so the broadcast method can be swapped without touching the calling code.

---

## Latency Breakdown

When Venkatesh cancels and Lakshmi is on the waitlist:

| Step | Time |
|------|------|
| POST /cancel HTTP request | ~5ms network |
| Database update + waitlist check | ~15ms (Neon) |
| New booking insert | ~10ms |
| WebSocket broadcast | ~2ms (in-process) |
| WebSocket message to Lakshmi's browser | ~20–50ms (network) |
| React toast appears | ~1ms (DOM update) |
| **Total: Cancellation → Notification** | **~50–80ms** |

In practice, for a user in the same city on a stable connection, the notification appears almost instantaneously.
