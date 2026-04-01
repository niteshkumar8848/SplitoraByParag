# Splitora

Splitora is a full-stack expense-sharing platform for groups. It helps users create groups, add shared expenses, track balances, settle dues, and monitor spending insights in real time.

## Highlights

- Secure auth with email/password + Google Sign-In
- Group-based expense tracking and split management
- Settlement suggestions and payment workflow integration
- Real-time group updates using Socket.IO
- Analytics and AI-powered spending insights
- Avatar upload support via Cloudinary

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Query, Zustand
- Backend: Node.js, Express, Prisma, PostgreSQL, Socket.IO
- Integrations: Google OAuth, Razorpay, Anthropic, Cloudinary

## Repository Structure

```text
Splitora/
├─ client/   # React frontend
├─ server/   # Express + Prisma backend
└─ docker-compose.yml   # Local PostgreSQL service
```

## Prerequisites

- Node.js 18+
- npm 9+
- Docker (recommended for local PostgreSQL)

## Quick Start (Recommended)

1. Install dependencies:

```bash
npm run setup
```

2. Create local environment files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

3. Start the full local stack:

```bash
npm run dev:local
```

This command ensures DB availability, runs Prisma migrations, and starts:

- API server on `http://localhost:10000`
- Frontend app on `http://localhost:5173`

## Manual Setup (Step-by-Step)

1. Start PostgreSQL:

```bash
npm run db:up
```

2. Apply DB migrations:

```bash
npm run db:migrate
```

3. (Optional) Seed sample data:

```bash
npm run db:seed
```

4. Run backend and frontend:

```bash
npm run server:dev
```

```bash
npm run client:dev
```

## Environment Variables

Copy from templates:

- `server/.env.example`
- `client/.env.example`

### Server (`server/.env`)

- `DATABASE_URL` (required)
- `JWT_SECRET` (required)
- `JWT_REFRESH_SECRET` (required)
- `JWT_EXPIRES_IN` (optional)
- `JWT_REFRESH_EXPIRES_IN` (optional)
- `PORT` (optional, default `10000`)
- `NODE_ENV` (optional)
- `CLIENT_URL` (required for CORS/auth redirects)
- `GOOGLE_CLIENT_ID` (optional, for Google Sign-In)
- `RAZORPAY_KEY_ID` (optional, for payments)
- `RAZORPAY_KEY_SECRET` (optional, for payments)
- `ANTHROPIC_API_KEY` (optional, for AI insights)
- `CLOUDINARY_CLOUD_NAME` (optional, for avatar uploads)
- `CLOUDINARY_API_KEY` (optional, for avatar uploads)
- `CLOUDINARY_API_SECRET` (optional, for avatar uploads)

### Client (`client/.env`)

- `VITE_API_URL` (required, e.g. `http://localhost:10000/api`)
- `VITE_SOCKET_URL` (required, e.g. `http://localhost:10000`)
- `VITE_GOOGLE_CLIENT_ID` (optional)
- `VITE_RAZORPAY_KEY_ID` (optional)

## Scripts

### Root

- `npm run setup`: Install server + client dependencies
- `npm run dev:local`: Start DB checks, migrations, API, and web app together
- `npm run db:up`: Start PostgreSQL via Docker
- `npm run db:down`: Stop containers
- `npm run db:reset`: Recreate DB volume and restart PostgreSQL
- `npm run db:ensure`: Auto-start Docker DB if Docker is available
- `npm run db:migrate`: Apply Prisma migrations
- `npm run db:seed`: Seed sample data
- `npm run db:prepare`: Run migrations + seed
- `npm run server:dev`: Run backend in dev mode
- `npm run client:dev`: Run frontend in dev mode

### Server (`server/`)

- `npm run dev`: Start Express with nodemon
- `npm run start`: Start production server
- `npm run db:migrate`: Deploy migrations
- `npm run db:seed`: Seed DB

### Client (`client/`)

- `npm run dev`: Start Vite dev server
- `npm run build`: Build production bundle
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint

## Health Check

When backend is running, verify:

```bash
curl http://localhost:10000/api/health
```

Expected response contains `status: "OK"`.

## Common Issues

1. Client cannot reach backend:

- Confirm backend is running: `http://localhost:10000/api/health`
- Confirm `client/.env` contains:
  - `VITE_API_URL=http://localhost:10000/api`
  - `VITE_SOCKET_URL=http://localhost:10000`

2. Database authentication error:

- Ensure `server/.env` uses:
  - `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/splitora`
- Reset local database:

```bash
npm run db:reset
npm run db:migrate
```

3. Docker unavailable:

- Install Docker Desktop, or
- Run your own PostgreSQL instance on port `5432`.

## License

This project is licensed under the [MIT License](LICENSE).
