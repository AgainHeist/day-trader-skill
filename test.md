# ALi BOSS — Day Trader Skill • Premium Trading Terminal

> **Live Website:** https://day-trader-skill-pro.vercel.app/  
> **Live API:** https://day-trader-skill-x47a.onrender.com/api/health  
> **Powered by ALi • Support:** https://t.me/alionera

<p align="center">
  <img src="https://img.shields.io/badge/ALi%20BOSS-Premium%20Terminal-06b6d4?style=for-the-badge&logo=rocket" />
  <img src="https://img.shields.io/badge/Power%20By-ALi-8b5cf6?style=for-the-badge" />
  <img src="https://img.shields.io/badge/STATUS-LIVE%20ON%20VERCEL-10b981?style=flat-square" />
  <img src="https://img.shields.io/badge/Backend-RENDER%20LIVE-3b82f6?style=flat-square" />
  <img src="https://img.shields.io/badge/MIT-License-f59e0b?style=flat-square" />
</p>

<p align="center">
  <a href="https://day-trader-skill-pro.vercel.app/"><img src="https://img.shields.io/badge/OPEN%20LIVE%20APP-Click%20Here-06b6d4?style=for-the-badge&logo=vercel" /></a>
  <a href="https://t.me/alionera"><img src="https://img.shields.io/badge/Support-%40alionera-229ED9?style=for-the-badge&logo=telegram" /></a>
</p>

---

### 1. Ye Repo Kya Hai? (Hindi Me Seedha)

Ye **Day Trader Skill** ka production web clone hai — original `Jakeschincariol/day-trader-skill` ke 11 Claude Skills ko real website me badla gaya hai.

* **Static demo nahi** — real FastAPI backend, real Yahoo/SEC/House data, no fake prices
* **11 Modules:** Scanner, News, Entry Timer, Exit Planner, Time Machine (10k replays), Budget, Risk (PASS/BLOCK), Alerts (WebSocket), Analyst (XBRL), Pelosi Tracker, Broker (paper default), Live Dashboard
* **Safety first:** `paper: true` default, `Allow once / Deny` approval, no auto real-money trade

---

### 2. Website Par Kya Dikhega — Premium Look

| Section | Kya Karta Hai |
|---|---|
| **Live Market** | Yahoo 5m candles + MA20/50, TSLA/AAPL/NVDA live price, `DATA UNAVAILABLE` if provider fails |
| **Scanner** | ORB / Flags / Oversold bounce / 20d breakout + most-traded-first sort |
| **Entry Timer** | Completed-bar only (1m/5m) — `WAITING / TRIGGERED / EXPIRED` |
| **Exit Planner** | Stop / Target / Trail logic, saved in DB |
| **Time Machine** | 60 days 5m bars, 10k simulations, fan chart + histogram + verdict |
| **Risk Manager** | Max loss, daily loss, trades/day, R/R, PDT guard — backend PASS/BLOCK |
| **Paper Trading** | $100k virtual, paper orders only, `PAPER MODE` badge everywhere |
| **System Status** | Backend / DB / MarketData / WS / Workers — honest status |

> **Design:** Dark navy `bg-[#070b14]`, cyan→violet gradient `AB` logo, glass blur header, glow cards, 60FPS, mobile + desktop + tablet perfect.

---

### 3. Repo Structure — Kahan Kya Hai

```
day-trader-skill/
├── frontend/              # Vite + React + Tailwind — ALi BOSS UI
│   ├── src/pages/        # Dashboard, Scanner, Markets, News, Entry, Exit, TimeMachine...
│   ├── src/components/   # Layout (sidebar AB logo + Power By ALi + Telegram)
│   ├── src/lib/          # store.ts (Zustand), api.ts, ws.ts
│   └── index.html        # ALi BOSS - Premium Trading Terminal | Power By ALi
├── backend/               # FastAPI + SQLAlchemy + Redis + Workers
│   ├── api/routers/      # health, market, scanner, news, entry, exit, timemachine, budget, risk, alerts, analyst, pelosi, paper, auth, settings
│   ├── services/         # market_service, scanner_service etc — real Yahoo/SEC calls with retry + DATA UNAVAILABLE
│   ├── db/               # models + database.py (auto init)
│   └── workers/          # scanner + alert workers
├── trader-* (11 folders) # Original skill sources (SKILL.md + tools) — source of truth
├── tests/                 # 315 tests — offline fixtures, no fake data
├── vercel.json            # Frontend → Vercel (output: frontend/dist, rewrites to Render API)
├── render.yaml            # Backend + Worker + Postgres + Redis on Render
├── docker-compose.yml     # Local full stack
└── test.md                # Ye file — premium overview
```

---

### 4. Live Deployment — Kaise Chal Raha Hai

**Backend — Render:**
```
Build: pip install -r backend/requirements.txt  (Python 3.11.9)
Start: uvicorn backend.api.main:app --host 0.0.0.0 --port $PORT
Worker: python -m backend.workers.main
URL: https://day-trader-skill-x47a.onrender.com
Health: /api/health → {"status":"ok"}
Docs: /docs (Swagger)
```

**Frontend — Vercel:**
```
Build: cd frontend && npm install && npm run build
Output: frontend/dist
URL: https://day-trader-skill-pro.vercel.app/
Env: VITE_API_URL=https://day-trader-skill-x47a.onrender.com
     VITE_WS_URL=wss://day-trader-skill-x47a.onrender.com
```

> Render ne `Python 3.11.9` pe fix kiya tha (3.14 pe pydantic-core Rust fail ho raha tha). Vercel root `.python-version` delete kiya gaya taaki Python install skip ho.

---

### 5. Update Kaise Kare — Website Update Flow

Har baar code push karo → Render + Vercel auto deploy:

```bash
git add .
git commit -m "update: premium dashboard polish"
git push origin arena/0a9beaf0-day-trader-skill
# PR → Merge to main → Vercel auto picks main (1eb7cba+)
```

Local test:
```bash
# backend
uvicorn backend.api.main:app --reload
# frontend
cd frontend && npm run dev
# → http://localhost:5173  | API http://localhost:8000/api/health
```

Tests:
```bash
python3 -m unittest discover -s tests -v  # 315 OK
```

---

### 6. Premium Branding — ALi BOSS

* **Logo:** `AB` gradient cyan→violet with glow
* **Title:** `ALi BOSS - Premium Trading Terminal | Power By ALi`
* **Sidebar:** `ALi BOSS • Premium Terminal` + `PAPER` + `Power By ALi` pill
* **Footer/Header:** `© ALi BOSS • Power By ALi • Support @alionera`
* **Telegram CTA** har page pe — `https://t.me/alionera`

---

### 7. Tech Stack at a Glance

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite 5, Tailwind, Zustand, Recharts, WebSocket |
| Backend | FastAPI 0.110, Uvicorn, SQLAlchemy 2, Alembic, Redis (optional) |
| Data | Yahoo Finance (chart/quote), SEC EDGAR, House Clerk PTR |
| Deploy | Vercel (frontend), Render (backend/worker/Postgres/Redis), Docker Compose local |
| Security | JWT auth, bcrypt hashing, CORS allowlist, paper-mode guard, never fake prices |

---

### 8. Support & Credits

* **Owner:** ALi BOSS — Power By ALi
* **Telegram:** https://t.me/alionera (24/7 support)
* **Original Skill:** https://github.com/Jakeschincariol/day-trader-skill
* **License:** MIT

> **Disclaimer:** Not financial advice. Paper trading default. Time Machine is simulation, not prediction. Stops can slip. Yahoo data is free/unofficial. See README Fine print.

---

<p align="center"><b>Made with ❤️ by ALi BOSS • Live now → <a href="https://day-trader-skill-pro.vercel.app/">day-trader-skill-pro.vercel.app</a></b></p>
