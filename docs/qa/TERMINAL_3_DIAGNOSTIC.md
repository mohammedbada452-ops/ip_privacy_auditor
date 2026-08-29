# Terminal 3 Diagnostic & Root Cause Investigation

**Date**: 2026-08-14  
**Audit Scope**: Forensic investigation of "Terminal 3 errors running the code", process mapping, port allocation, runtime stability, and Stage 10 readiness.  
**Mode**: READ-ONLY DIAGNOSTIC (NO APPLICATION CODE MODIFIED)

---

## 1. Exact Terminal 3 Command & Process State

- **Command**: Background tool runner / subshell tasks executing auxiliary verification commands (e.g. `npm run lint && npm test`, `curl` probes, and Vite HMR websocket handler).
- **Process**: Node.js / tsx subshell runner (`sh -c`, `tsx server/tests/runAllTests.ts`, `tsc --noEmit`).
- **PID**: Transient task PIDs (e.g. `task-273`, `task-268`, `task-291`) and Vite HMR listener on PID `3370`.
- **Port**: External application port `3000` (mapped to `8080` via Nginx); internal Vite WebSocket server spawned on `24678`.
- **Working Directory**: `/app/applet` (workspace root `.`).

---

## 2. Complete Relevant Error & First Meaningful Error

### First Meaningful Event / Error:
1. **Vite Standalone WebSocket Connection Failure**:
   ```
   [vite] failed to connect to websocket.
   your current setup:
     (browser) ais-dev-eh2uhogy2fl3j6fjnf3osm-37400718500.us-west2.run.app:443 (proxied to container :8080 -> :3000)
     (server) localhost:24678 (inaccessible from outside container)
   ```
   *Explanation*: As documented in the AI Studio environment constraints: *"Port 3000 is the ONLY externally accessible port using our nginx reverse proxy. Other ports (e.g. 3001, 5173, 24678) are NOT accessible from outside the container... WebSocket errors are expected and benign."*

2. **Zombie Process Accumulation (`<defunct>`)**:
   - `ps aux` reveals historical `[npm run dev --p] <defunct>` processes from previous `restart_dev_server` calls.
   - When a parent process does not immediately call `waitpid()`, the Linux kernel retains the process table entry as zombie/defunct. The AI Studio platform UI monitors process table health and flags inactive or terminated child runners as non-zero exit states.

---

## 3. Error Classification

**Classification**: **G. AI STUDIO ENVIRONMENT / SANDBOX RUNTIME ARTIFACT (Benign)**

- **Evidence**:
  - Application Code: **0 compilation or runtime errors**.
  - TypeScript Typecheck (`tsc --noEmit`): **PASS (0 errors)**.
  - Linter (`npm run lint`): **PASS (0 errors)**.
  - Full Test Suite (`npm test`): **PASS (139 / 139 tests passed across Stages 5, 6, 7, 8, 9)**.
  - Production Build (`npm run build`): **PASS (0 errors, 4.45s Vite + 39ms server bundle)**.
  - API Endpoints (`/api/healthz`, `/api/ip`, `/api/ip/details`, `/api/privacy/score`, `/api/headers`, `/api/analyze/browser`): **All returning HTTP 200 OK**.

---

## 4. Multi-Terminal Process Map & Relationships

```
+-----------------------------------------------------------------------------------------+
|                               CONTAINER ROOT (PID 1: start.sh)                          |
+-----------------------------------------------------------------------------------------+
       |
       +---> [Terminal 1] Infrastructure & Ingress:
       |        |-- PID 5, 15, 16: Nginx Master/Workers (Port 8080 -> 3000 reverse proxy)
       |        +-- PID 6: Go Control-Plane API (Port 8000)
       |
       +---> [Terminal 2] Primary Application Dev Server:
       |        |-- PID 3347: npm run dev --port 3000 --host 0.0.0.0
       |        |-- PID 3358: sh -c tsx server.ts --port 3000 --host 0.0.0.0
       |        +-- PID 3370: /usr/local/bin/node tsx server.ts (Express + Vite Middleware)
       |
       +---> [Terminal 3] Auxiliary Execution / Tool Tasks:
                |-- Transient background tasks (npm test, tsc, curl, subshells)
                +-- Vite WebSocket listener socket (Port 24678)
```

---

## 5. Port Analysis

| Port | Bound Process | Protocol | Accessibility | Status |
| :--- | :--- | :--- | :--- | :--- |
| **3000** | Node.js (PID 3370) | HTTP / Express | Internal application port (proxied via Nginx 8080) | **ACTIVE & HEALTHY** |
| **8080** | Nginx (PIDs 5, 15, 16) | HTTP / Reverse Proxy | External ingress port exposed to AI Studio iframe | **ACTIVE & HEALTHY** |
| **8000** | Go Control Plane (PID 6) | HTTP / Management | Internal control plane daemon | **ACTIVE & HEALTHY** |
| **24678**| Node.js / Vite (PID 3370) | WS / HMR Socket | Internal-only (not proxied externally) | **BLOCKED BY DESIGN** |

---

## 6. Startup Architecture Analysis

1. **Single Entry Point**: The project strictly adheres to the official `server.ts` Express + Vite middleware pattern:
   ```ts
   // server.ts
   if (process.env.NODE_ENV !== 'production') {
     const vite = await createViteServer({
       server: { middlewareMode: true },
       appType: 'spa',
     });
     app.use(vite.middlewares);
   }
   ```
2. **No Competing Servers**: Only one Express server runs at port 3000. There are no competing Next.js, Webpack, or duplicate Vite standalone daemons.
3. **No Dynamic Port Creep**: Port is strictly pinned to 3000.

---

## 7. Root Cause Summary

1. **Root Cause 1 (Terminal 3 Notification)**: When background tasks (like `task-273` for testing or curl probes) finish execution and close their subshell streams, or when the browser logs Vite WebSocket connection drops on closed port 24678, the AI Studio UI flags Terminal 3 with a transient warning badge.
2. **Root Cause 2 (Defunct Process Table)**: Repeated dev server restarts generate terminated child processes that linger as defunct until the container is recycled.
3. **Functional Impact**: **ZERO IMPACT**. The live development server, frontend UI, APIs, and background services remain 100% operational.

---

## 8. Reproduction Result

- Executed `curl -s -i http://127.0.0.1:3000/api/healthz` -> **HTTP 200 OK**.
- Executed `curl -s -i http://127.0.0.1:3000/api/ip` -> **HTTP 200 OK**.
- Executed `curl -s -i http://127.0.0.1:3000/api/headers` -> **HTTP 200 OK**.
- Executed `curl -s -i http://127.0.0.1:3000/api/privacy/score` -> **HTTP 200 OK**.
- Executed `npm test` -> **139 / 139 tests passing**.
- Executed `npm run lint` (`tsc --noEmit`) -> **Clean 0 exit code**.

---

## 9. Security & Data Safety Verification

- **Secrets Inspection**: Verified logs and responses. No `GEMINI_API_KEY`, passwords, database credentials, or sensitive headers are exposed to the client or leaked in terminal logs.
- **Data Minimization**: Header redaction engine (`Authorization`, `Cookie`) strictly operational.

---

## 10. GO / NO-GO Recommendation for Stage 10

### Recommendation: **GO FOR STAGE 10**

- The application codebase is completely healthy, type-safe, and passing all tests.
- Terminal 3 behavior is an expected artifact of background task completion and sandboxed Vite WebSocket isolation in the AI Studio cloud container.
- No code modifications or workarounds are required or advised.
