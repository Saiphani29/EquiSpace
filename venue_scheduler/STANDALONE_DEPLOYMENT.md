# Standalone Network Deployment Guide

## 1. The "Standalone Network" Concept
Your application is now configured to run as a **self-healing, isolated network** using Docker. Instead of running scripts manually, the entire system (Frontend, Backend, and Database) is packaged into containers. This ensures that the software will run "perfectly" on any machine, handling high loads by using multiple worker processes.

## 2. Prerequisites
*   **Docker Desktop:** Download and install from [docker.com](https://www.docker.com/).

## 3. How to Launch the Entire Network
Open your terminal in the root `venue_scheduler` folder and run:

```bash
docker-compose up --build -d
```

### **What this command does:**
1.  **Builds the Backend:** Packages the FastAPI app with 4 production worker threads (using Gunicorn).
2.  **Builds the Frontend:** Compiles the React app into a high-speed production build and serves it via an **Nginx** reverse proxy.
3.  **Launches the Network:** Creates a private, virtual bridge network where these services communicate securely.
4.  **Automatic Resilience:** If the backend crashes, Docker will instantly restart it.

## 4. Accessing the Software
Once launched, the software is available at:
*   **Production UI:** [http://localhost](http://localhost) (Port 80)
*   **Backend API:** [http://localhost/api/docs](http://localhost/api/docs)
*   **Real-time WebSockets:** [ws://localhost/ws](http://localhost/ws)

## 5. Handling "Perfect" Loads
*   **Load Balancing:** The Nginx server acts as a gatekeeper, handling incoming traffic and routing it to the backend.
*   **Persistent Storage:** Your data is saved in a "Docker Volume," so even if you delete the containers, your bookings and venues are safe.
*   **Isolation:** The standalone network prevents conflicts with other software on your computer.

---

**You are now running enterprise-grade civic infrastructure.** 🚀🛡️💎
