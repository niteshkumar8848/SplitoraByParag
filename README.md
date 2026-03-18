# Splitora

Splitora is a full-stack group expense splitting platform.

## Tech Stack

- Backend: Node.js, Express, Prisma
- Frontend: React, Vite, Tailwind CSS

## Repository Structure

```text
Splitora/
├── server/         # Node.js + Express + Prisma backend
├── client/         # React + Vite + Tailwind frontend
├── .gitignore
└── README.md
```

## Setup Instructions

### 1. Clone and enter the project

```bash
git clone <your-repo-url>
cd Splitora
```

### 2. Backend setup

```bash
cd server
npm install
cp .env.example .env
```

Fill in the values in `.env` for your local environment.

### 3. Frontend setup

```bash
cd ../client
npm install
```

### 4. Run the apps

Backend:

```bash
cd server
npm run dev
```

Frontend:

```bash
cd client
npm run dev
```
