# CollegeFinder — College Discovery Platform

A production-grade full-stack college discovery and comparison platform built with Next.js 15, TypeScript, TailwindCSS, Prisma, and PostgreSQL.

## Features
- **College Listing + Search** — full-text search, filters (type, state, fees), sort, pagination
- **College Detail Page** — overview, courses by level, placements, recruiter info
- **Compare Colleges** — side-by-side comparison of up to 3 colleges with persistent tray
- **Auth + Saved** — JWT auth via NextAuth, save/unsave colleges with heart toggle

## Tech Stack
- **Frontend**: Next.js 15 (App Router), React, TypeScript, TailwindCSS, Zustand
- **Backend**: Next.js API Routes, NextAuth.js, Zod validation
- **Database**: PostgreSQL (Neon), Prisma ORM
- **Deployment**: Vercel + Neon

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Neon database
1. Create free account at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string

### 3. Configure environment
```bash
cp .env.example .env.local
# Fill in your DATABASE_URL, DIRECT_URL, and NEXTAUTH_SECRET
# Generate secret: openssl rand -base64 32
```

### 4. Run migrations
```bash
npx prisma migrate dev --name init
```

### 5. Seed the database
```bash
npm run seed
```
> This creates 25 colleges with courses, placements, and a demo user: `demo@college.dev` / `demo1234`

### 6. Start dev server
```bash
npm run dev
```

## Deployment (Vercel + Neon)

1. Push to GitHub
2. Import repo in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy — migrations run automatically via `prisma generate` in build

## Architecture Decisions

- **Search**: Postgres `ILIKE` via Prisma (no Elasticsearch needed for MVP scale)
- **Compare state**: Zustand with `persist` middleware — survives page refresh, syncs across tabs
- **Auth**: NextAuth credentials provider + JWT sessions, `middleware.ts` guards `/saved`
- **Service layer**: Thin `services/` modules between API routes and Prisma — easy to test and swap
- **Seed**: All data from DB via seed script — zero hardcoded frontend arrays

## Communities (Real-time Q&A)

Subject-specific discussion rooms powered by Socket.IO.

### Running in dev
```bash
# Terminal 1 — Next.js
npm run dev

# Terminal 2 — Socket.IO server
npm run socket

# Or both at once
npm run dev:all
```

### Architecture
- **Socket.IO server** (`server.js`) runs standalone on port 3001 — separate from Next.js
- **Events**: `join_room` → `new_question` / `new_answer` / `room_users` / `user_typing`
- **Rooms**: namespaced as `community:cse`, `community:mba` etc.
- **Persistence**: all questions/answers written to PostgreSQL first, then broadcast via socket
- **Guest posting**: works without login (optional name field)

### Production deployment
1. Deploy `server.js` to Railway or Render as a Node.js service
2. Set `NEXT_PUBLIC_SOCKET_URL` in Vercel to your socket server URL
3. Socket server reads `NEXTAUTH_URL` for CORS origin

### Schema additions
```
Community  — subject rooms (8 seeded: CSE, MBA, Medical, etc.)
Question   — belongs to Community, has authorName + optional userId
Answer     — belongs to Question, has authorName + optional userId
```

### Performance notes (slowness fix)
- College detail + states list wrapped in `unstable_cache` (5min TTL)
- **Biggest win**: enable Neon connection pooling in your Neon dashboard → Connection → Pooled connection string → use that as `DATABASE_URL` (keep direct URL as `DIRECT_URL` for migrations)
