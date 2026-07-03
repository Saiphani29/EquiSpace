# Agora: Transparent Public Venue & Sports Ground Scheduler

> A digital solution to democratize, secure, and streamline the scheduling of public community halls, sports grounds, and municipal parks.

---

## 🏛️ Executive Summary

Public spaces are community assets, yet their scheduling has traditionally been manual, opaque, and prone to favoritism or scheduling conflicts (double bookings). **Agora** (formerly Eluru Connect) resolves this by offering an immutable, publicly verifiable, and automated digital ledger. Equipped with an algorithmic **Fair-Play Quota Engine**, automated waitlist notifications, and strict multi-tier permissions, Agora ensures equal-opportunity access to community spaces.

---

## 🚀 Key Features

*   **Public Transparent Ledger:** A real-time calendar showing existing reservations with team/event names, enabling citizen auditability and preventing double bookings.
*   **Algorithmic Fair-Play Engine:** Automatically enforces booking caps (e.g., maximum prime-time hours per citizen/team per month) to prevent monopolization.
*   **Automated Waitlist Promotion:** When a cancellation occurs, the backend automatically transitions the slot to the next queued citizen and broadcasts the change via WebSockets.
*   **Government & VIP Override Protocol:** A structured override system allowing official municipal utilization of venues with mandatory public reasoning to maintain audit transparency.
*   **Strike/No-Show Feedback Loop:** Citizens must mark attendance (with photographic proof or check-in verification); multiple unexcused no-shows trigger automatic account suspension.
*   **Robust Concurrency Control:** Row-level database locks ensure double bookings are mathematically impossible, even under high traffic.

---

## 🛠️ Technology Stack

| Layer | Technologies | Key Libraries |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, TailwindCSS | Three.js (React Three Fiber), Framer Motion, Axios |
| **Backend** | Python 3.11+, FastAPI | SQLModel (SQLAlchemy), Pydantic, Uvicorn, SlowAPI, PyJWT |
| **Database** | PostgreSQL 16 | Row-level locking & transactional operations |
| **Containers**| Docker, Docker Compose | Multi-stage production builds |

---

## 📂 Repository Structure

```
mini project/
├── .gitignore                   ← Excludes admin, ideas/, and secrets (.env)
├── admin                        ← Default Govt Super Admin login instructions
├── ideas/                       ← Early-stage architectural diagrams & drafts
└── venue_scheduler/             ← Core application directory
    ├── backend/                 ← FastAPI application code
    │   ├── main.py              ← API Entrypoint
    │   ├── seed.py              ← Database initial seed script
    │   └── requirements.txt     ← Python dependencies
    ├── frontend/                ← React TypeScript client
    │   ├── src/                 ← Source components and pages
    │   └── package.json         ← Node configuration
    ├── docs/                    ← Comprehensive system documentation
    └── docker-compose.yml       ← Full-stack multi-container composition
```

---

## 💻 Quick Start Guide

### 🐳 Option A: Multi-Container Setup (Docker Compose)
The easiest way to run the entire stack (PostgreSQL + FastAPI + React Frontend) is using Docker:

1. Navigate to the `venue_scheduler` directory:
   ```bash
   cd venue_scheduler
   ```
2. Set up your environment variables:
   Create a `.env` file in the `venue_scheduler/` directory. (See `.env` configuration details below).
3. Spin up all services:
   ```bash
   docker-compose up --build
   ```
4. Access the applications:
   *   **Frontend:** `http://localhost` (or specified `FRONTEND_PORT`)
   *   **Backend API Documentation:** `http://localhost:8000/docs`

---

### 💻 Option B: Manual Local Development

#### 1. Database Setup
Ensure you have a PostgreSQL database running, or spin up only the database container:
```bash
cd venue_scheduler
docker-compose up db -d
```

#### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd venue_scheduler/backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # Windows PowerShell:
   venv\Scripts\Activate.ps1
   # Linux/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure `.env` file inside `backend/` with database URI and JWT secrets.
5. Initialize and seed test data:
   ```bash
   python seed.py
   ```
6. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload
   ```

#### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd venue_scheduler/frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Create a `.env` file inside `frontend/` containing:
   ```env
   VITE_API_URL=http://localhost:8000
   ```
4. Launch the local development server:
   ```bash
   npm run dev
   ```

---

## 🔒 Configuration & Environment Variables

Make sure to create `.env` files with these structures:

### Backend Configuration (`venue_scheduler/backend/.env`)
```env
DATABASE_URL=postgresql://user:password@localhost:5433/venue_db
JWT_SECRET_KEY=generate_your_64_character_hex_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FRONTEND_URL=http://localhost:5173
```

---

## 👤 Default Credentials (Seeded Data)

| Role | Phone | Password |
| :--- | :--- | :--- |
| **Govt Super Admin** | `9999999999` | `admin123` |
| **Citizen** | `9848012345` | `user123` |
| **VIP Member** | `9000000001` | `vip123` |

---

## 📄 Detailed Documentation

For a deep dive into specific architectures, protocols, or guides, refer to:
*   [Technical Architecture Diagram](file:///c:/Users/Sai%20Phanindra/Desktop/mini%20project/venue_scheduler/architecture_diagram.svg)
*   [Full System Blueprint & Scope](file:///c:/Users/Sai%20Phanindra/Desktop/mini%20project/venue_scheduler/venue_scheduler_detailed_architecture.md)
*   [Deployment & Production Operations Guide](file:///c:/Users/Sai%20Phanindra/Desktop/mini%20project/venue_scheduler/docs/DEPLOYMENT_GUIDE.md)
*   [Developer Contribution Guide](file:///c:/Users/Sai%20Phanindra/Desktop/mini%20project/venue_scheduler/docs/DEVELOPER_GUIDE.md)
*   [Database Schema & Models](file:///c:/Users/Sai%20Phanindra/Desktop/mini%20project/venue_scheduler/docs/DATABASE_SCHEMA.md)
