# Deployment Guide — Running Eluru Connect

> Step-by-step instructions for running locally, seeding data, and deploying to production. Written so anyone can follow it — no prior DevOps knowledge assumed.

---

## Prerequisites

Before you start, make sure you have installed:

| Tool | Version | Check Command |
|------|---------|---------------|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Git | Any | `git --version` |

---

## Project Structure

```
venue_scheduler/
├── backend/          ← FastAPI Python server
│   ├── main.py
│   ├── seed.py
│   ├── .env          ← You create this (secrets)
│   └── requirements.txt
└── frontend/         ← React TypeScript app
    ├── src/
    ├── .env          ← You create this (API URL)
    └── package.json
```

---

## Step 1: Clone / Open the Project

```bash
cd "C:\Users\Sai Phanindra\Desktop\mini project\venue_scheduler"
```

---

## Step 2: Backend Setup

### 2a. Create a virtual environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

You should see `(venv)` in your terminal prompt.

### 2b. Install dependencies

```bash
pip install -r requirements.txt
```

If `requirements.txt` doesn't exist, install manually:

```bash
pip install fastapi uvicorn sqlmodel psycopg2-binary python-jose passlib[bcrypt] python-multipart pydantic-settings slowapi
```

### 2c. Create the `.env` file

Create `backend/.env` with these contents:

```env
DATABASE_URL=postgresql://neondb_owner:npg_fH6dLopxgj8D@ep-small-cloud-a1xyz.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET_KEY=a7f3c9b2e4d6f8a1b3c5e7d9f1a3b5c7e9f2a4b6c8e0f3a5b7c9e1f4a6b8c0
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FRONTEND_URL=http://localhost:5173
```

> Replace `DATABASE_URL` with your actual Neon connection string if different.

### 2d. Seed the database

```bash
python seed.py
```

Expected output:
```
M.Tech Refinement: Expanding Eluru Venue Database...
User Initialized: Rajesh Kumar (Municipal Admin)
User Initialized: Venkatesh Rao
User Initialized: Lakshmi Devi
User Initialized: MLA Office (VIP)
Venue Registered: Alluri Sitarama Raju (ASR) Stadium in Eluru
... (10 venues)
Booking seeded: user_id=2 venue_id=1 status=confirmed
... (10 bookings)
Waitlist entry seeded: Lakshmi waiting for Town Hall
M.Tech Refinement: Eluru Expansion Sequence Terminated Successfully.
```

> **Warning:** `seed.py` drops all tables and recreates them. Run it only on a fresh database or when you want to reset all data.

### 2e. Start the backend server

```bash
uvicorn main:app --reload --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Application startup complete.
```

Test it: open `http://localhost:8000/health` — should return `{"status":"ok"}`

Interactive API docs: `http://localhost:8000/docs`

---

## Step 3: Frontend Setup

Open a **new terminal** (keep the backend running).

### 3a. Install dependencies

```bash
cd frontend
npm install
```

This installs React, TypeScript, Vite, Tailwind, Framer Motion, Three.js, and all other dependencies.

### 3b. Create the `.env` file

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

### 3c. Start the frontend dev server

```bash
npm run dev
```

Expected output:
```
  VITE v5.0.0  ready in 423ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open `http://localhost:5173` in your browser.

---

## Step 4: Test the Application

### Default Login Credentials

| Role | Phone | Password |
|------|-------|----------|
| Govt Super Admin | `9999999999` | `admin123` |
| Citizen (Venkatesh) | `9848012345` | `user123` |
| Citizen (Lakshmi) | `9848054321` | `user123` |
| VIP Member | `9000000001` | `vip123` |

### Quick Smoke Test Checklist

- [ ] Login as Venkatesh → see Dashboard with upcoming bookings
- [ ] Go to Browse Venues → see 10 venues with photos
- [ ] Click Book Now on any venue → modal opens
- [ ] Pick a future date/time → see duration preview
- [ ] Try to book an already-taken slot → see conflict screen
- [ ] Logout, login as admin → see Admin Panel nav item
- [ ] Admin Panel → try suspend a user, grant VIP
- [ ] Open `http://localhost:8000/docs` → interactive API explorer

---

## Common Problems & Fixes

### "Cannot connect to database"

```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Fix:** Check that `DATABASE_URL` in `backend/.env` is correct. Neon databases have a connection string that includes the password. Copy it directly from the Neon dashboard.

---

### "CORS error" in browser console

```
Access to XMLHttpRequest from origin 'http://localhost:5173' blocked by CORS policy
```

**Fix:** Make sure `FRONTEND_URL=http://localhost:5173` is set in `backend/.env` and the backend was restarted after editing `.env`.

---

### Frontend shows "Failed to load dashboard data"

**Fix:** Ensure the backend is running on port 8000 and `VITE_API_URL=http://localhost:8000` is set in `frontend/.env`. Restart `npm run dev` after changing `.env`.

---

### "Module not found" on npm install

```
npm ERR! Cannot find module 'three'
```

**Fix:** Run `npm install` again from the `frontend/` directory. If it persists:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

### Backend won't start — "Address already in use"

```
ERROR:    [Errno 10048] error while attempting to bind on address ('127.0.0.1', 8000)
```

**Fix (Windows):**
```powershell
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

---

### 3D scene is blank / WebGL error

**Fix:** Check that your browser supports WebGL. Open `chrome://gpu` in Chrome. If WebGL is disabled:
- Update your graphics drivers
- Enable hardware acceleration in Chrome settings

The 3D hero is on the login page only. The rest of the app works without WebGL.

---

## Production Deployment

### Backend — Deploy to Railway / Render / Fly.io

1. Create a `Procfile`:
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

2. Set environment variables in the hosting platform dashboard:
```
DATABASE_URL=<your_neon_connection_string>
JWT_SECRET_KEY=<generate_a_random_64_char_string>
FRONTEND_URL=https://your-frontend-domain.com
```

3. Deploy from GitHub or upload directly.

### Frontend — Deploy to Vercel / Netlify

1. Set environment variable:
```
VITE_API_URL=https://your-backend-domain.com
```

2. Build command: `npm run build`
3. Publish directory: `dist`

Vercel auto-detects Vite projects. Connect your GitHub repo and it deploys on every push.

### Generate a Strong JWT Secret

```python
import secrets
print(secrets.token_hex(64))
# Output: a7f3c9b2e4d6f8a1b3c5e7d9f1a3b5c7...  (128 hex chars)
```

Never use the development secret in production.

---

## Re-seeding Without Data Loss

If you want to add more demo data without dropping the database:

```python
# In seed.py, comment out the drop_all line:
# SQLModel.metadata.drop_all(engine)  ← comment this
create_db_and_tables()
```

Then run `python seed.py` — it will skip existing records (the `if not session.exec(...).first()` guards).

---

## Logs

The backend writes audit logs to `backend/logs/audit.log`. View them:

```bash
# Windows
type backend\logs\audit.log

# Mac/Linux
tail -f backend/logs/audit.log
```

Uvicorn access logs appear in the terminal where you ran `uvicorn main:app --reload`.
