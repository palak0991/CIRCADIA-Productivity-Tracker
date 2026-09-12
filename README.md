# 24 Hour Visualizer

> **An interactive 24-hour visual day planner and productivity analytics platform.**
> Built as a production-quality full-stack application demonstrating Java, Spring Boot, JWT, React, Docker, and CI/CD.

[![CI — Build, Test & Docker](https://github.com/palak0991/24-hour-visualizer/actions/workflows/ci.yml/badge.svg)](https://github.com/palak0991/24-hour-visualizer/actions/workflows/ci.yml)

---

## ✨ Features

| Feature | Description |
|---|---|
| **24-Hour Visual Timeline** | See your full day as a continuous visual grid — drag to scroll, click to create |
| **Midnight-Crossing Tasks** | Tasks spanning midnight (e.g. 11 PM → 7 AM) stored as one DB record, visually clamped per day |
| **Live Red Time-Line** | Glowing real-time indicator on the timeline showing current time, updates every second |
| **Productivity Analytics** | Day score ring (0–100), status breakdown, per-category time bars with completion overlay |
| **Missed Task Detection** | Background scheduler auto-marks overdue PLANNED/IN_PROGRESS tasks as MISSED every 15 min |
| **Task Status Workflow** | PLANNED → IN_PROGRESS → COMPLETED (or MISSED / CANCELLED) |
| **Category Management** | Color-coded categories with a full palette picker — 6 seeded on signup |
| **Multi-Timezone Support** | Pick any timezone in the date header; all queries are timezone-aware |
| **JWT Authentication** | Stateless JWT-secured REST API — register, login, auto-verify on reload |
| **Glassmorphism Dark UI** | Polished dark glassmorphism theme with blur cards and gradient accents |

---

## 🏗️ Tech Stack

**Backend**
- Java 17, Spring Boot 3.2.5, Maven
- Spring Data JPA + Hibernate (PostgreSQL 17)
- Spring Security + JWT (JJWT 0.12)
- Bean Validation, Lombok
- JUnit 5, Mockito, MockMvc, H2 (test)

**Frontend**
- React 18, Vite 5.4.11
- React Router v6
- Axios + JWT bearer interceptor
- Lucide React icons
- Custom glassmorphism CSS (no component framework)

**Infrastructure**
- Docker multi-stage build (4 stages)
- Docker Compose (PostgreSQL + Spring Boot + Nginx)
- Nginx reverse proxy (SPA routing + `/api` proxy + gzip + security headers)
- GitHub Actions CI (parallel test + build + GHCR push)

---

## 🚀 Quick Start

### Prerequisites
- Docker Desktop ≥ 24 and Docker Compose v2
- *Or* locally: JDK 17, Maven 3.9+, Node 20, PostgreSQL 17

### Run with Docker Compose (recommended)

```bash
# 1. Clone
git clone https://github.com/palak0991/24-hour-visualizer.git
cd 24-hour-visualizer

# 2. Create .env from template
cp .env.example .env
# Edit .env — at minimum set a strong JWT_SECRET and DB_PASSWORD

# 3. Build & start everything
docker compose up --build

# App is live at http://localhost
# API health: http://localhost/api/health
```

### Run locally (development)

**Backend**
```bash
cd backend
# Ensure PostgreSQL is running on port 5432 with DB "visualizer24"
mvn spring-boot:run
# → http://localhost:8080
```

**Frontend**
```bash
cd frontend
npm install
echo "VITE_API_BASE_URL=http://localhost:8080/api" > .env.local
npm run dev
# → http://localhost:5173
```

---

## 📁 Project Structure

```
24-hour-visualizer/
├── backend/                        # Spring Boot application
│   ├── src/main/java/com/visualizer/hour24/
│   │   ├── controller/             # REST controllers (Auth, Category, Task, Analytics)
│   │   ├── service/                # Business logic interfaces + impls
│   │   ├── repository/             # Spring Data JPA repositories
│   │   ├── entity/                 # JPA entities (User, Category, Task)
│   │   ├── dto/                    # Request/Response DTOs
│   │   ├── security/               # JWT filter, UserDetails, EntryPoint
│   │   ├── scheduler/              # Missed-task detection scheduler
│   │   ├── exception/              # Global exception handler
│   │   └── config/                 # SecurityConfig
│   └── src/test/                   # Unit + integration tests (9 passing)
│
├── frontend/                       # React + Vite SPA
│   └── src/
│       ├── components/             # Timeline, Navbar, DateHeader, TaskModal,
│       │                           #   CategoryModal, AnalyticsPanel
│       ├── pages/                  # LoginPage, RegisterPage, DashboardPage
│       ├── services/               # Axios service modules per domain
│       ├── context/                # AuthContext (JWT state)
│       └── styles/                 # Glassmorphism CSS
│
├── nginx/nginx.conf                # Nginx reverse proxy config
├── Dockerfile                      # 4-stage multi-stage build
├── docker-compose.yml              # Full-stack orchestration
├── .github/workflows/ci.yml        # GitHub Actions CI
└── .env.example                    # Environment variable template
```

---

## 🔌 REST API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | Public | Register new user (seeds 6 default categories) |
| `POST` | `/api/auth/login` | Public | Login, returns JWT |
| `GET` | `/api/auth/me` | JWT | Get current user profile |
| `GET` | `/api/health` | Public | Health check |
| `GET/POST` | `/api/categories` | JWT | List / create categories |
| `GET/PUT/DELETE` | `/api/categories/{id}` | JWT | Get / update / delete category |
| `GET` | `/api/tasks?date=YYYY-MM-DD&timezone=UTC` | JWT | Tasks overlapping a day |
| `POST` | `/api/tasks` | JWT | Create task |
| `GET/PUT/DELETE` | `/api/tasks/{id}` | JWT | Get / update / delete task |
| `PATCH` | `/api/tasks/{id}/status` | JWT | Update task status |
| `GET` | `/api/analytics/day?date=YYYY-MM-DD&timezone=UTC` | JWT | Day analytics |
| `POST` | `/api/analytics/detect-missed` | JWT | On-demand missed task detection |

---

## 🧪 Testing

```bash
cd backend
mvn test
```

**Test coverage includes:**
- `TaskRepositoryTest` — midnight-crossing JPQL query + user isolation
- `TaskServiceTest` — start/end time validation
- `AnalyticsServiceTest` — productivity score computation + category breakdown
- `JwtTokenProviderTest` — token generation, validation, expiry
- `AuthControllerTest` — register + login MockMvc integration tests
- `TaskControllerTest` — create task + date-filtered list MockMvc tests

---

## 🌍 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/visualizer24` | JDBC connection URL |
| `DB_USERNAME` | `postgres` | PostgreSQL username |
| `DB_PASSWORD` | `postgres` | PostgreSQL password |
| `JWT_SECRET` | *(hex string)* | HMAC-SHA256 JWT signing key (change in prod!) |
| `JWT_EXPIRATION_MS` | `86400000` | Token TTL in ms (default 24 h) |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | CORS allowed origins |
| `MISSED_TASK_INTERVAL_MS` | `900000` | Missed-task scheduler interval (15 min) |
| `APP_PORT` | `80` | Host port mapped to Nginx |
| `SPRING_PROFILES_ACTIVE` | `dev` | Spring profile (`dev` / `prod`) |

---

## 📊 Architecture

```
Browser (React SPA)
       │
       ▼
  Nginx :80
  ├── GET /          → serves dist/index.html (SPA)
  ├── GET /assets/*  → serves hashed JS/CSS (long-cache)
  └── /api/*         → proxy_pass → backend:8080
                              │
                    Spring Boot (JRE 17)
                    ├── JWT auth filter
                    ├── REST controllers
                    ├── JPA / Hibernate
                    └── Scheduled missed-task scanner
                              │
                    PostgreSQL 17
```

---

## 👤 Author

Built as a college placement portfolio project demonstrating full-stack engineering capabilities with production-quality patterns.
