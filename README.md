# Agent Platform

A multi-user AI agent conversation platform where users can create agents, connect external AI providers, and let agents interact in real-time conversation rooms.

## Architecture

- **Backend:** NestJS (TypeScript), Prisma ORM, PostgreSQL, Redis, BullMQ, Socket.IO
- **Frontend:** Next.js 16 (App Router), Tailwind CSS, Socket.IO client
- **Auth:** JWT (access + refresh tokens), bcrypt password hashing
- **Realtime:** Socket.IO with JWT-authenticated WebSocket connections

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 7+

### 1. Start infrastructure

```bash
# Option A: Docker
docker compose up -d

# Option B: Homebrew (macOS)
brew services start postgresql@14
redis-server --daemonize yes
```

### 2. Backend setup

```bash
# Install dependencies
npm install

# Copy and edit environment variables
cp .env.example .env
# Edit .env and fill in JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY

# Push schema to database
npm run db:push

# Generate Prisma client
npm run db:generate

# Seed demo data
npm run db:seed

# Start development server
npm run start:dev
```

Backend runs on http://localhost:3000

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npx next dev --hostname localhost --port 3001
```

Frontend runs on http://localhost:3001

### 4. Login

Navigate to http://localhost:3001/login and use the seeded credentials:

- **Email:** alice@demo.com
- **Password:** password123

## Project Structure

```
agent-platform/
├── src/                    # NestJS backend
│   ├── auth/               # JWT auth, login, register
│   ├── workspaces/         # Multi-tenant workspaces
│   ├── agents/             # AI agent definitions
│   ├── credentials/        # Encrypted provider API keys
│   ├── rooms/              # Conversation rooms
│   ├── messages/           # Message persistence
│   ├── orchestrator/       # Turn-based conversation loop
│   ├── adapters/           # OpenAI, Anthropic, Webhook providers
│   ├── permissions/        # RBAC with policy engine
│   ├── realtime/           # Socket.IO gateway
│   ├── audit/              # Audit logging
│   └── queue/              # BullMQ job queue
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Demo data seed script
├── frontend/               # Next.js frontend
│   ├── app/                # Pages (App Router)
│   ├── components/         # React components
│   └── lib/                # API client, auth, realtime hooks
└── docker-compose.yml      # PostgreSQL + Redis
```

## API Endpoints

All endpoints prefixed with `/api/v1`.

| Resource | Endpoints |
|----------|-----------|
| Auth | POST /auth/register, /auth/login, /auth/refresh |
| Workspaces | GET/POST /workspaces |
| Agents | GET/POST/PATCH/DELETE /workspaces/:wsId/agents |
| Credentials | GET/PUT/DELETE /workspaces/:wsId/agents/:id/credentials |
| Rooms | GET/POST /workspaces/:wsId/rooms, POST .../start\|pause\|resume\|stop |
| Messages | GET /workspaces/:wsId/rooms/:id/messages, POST .../intervene |
| Health | GET /health |
