# himtech

Backend API built with Node.js, Express, and TypeScript.

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- Git

## Getting Started

```bash
git clone https://github.com/FelineChunk/himtec.git
cd himtec
npm install
cp .env.example .env
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

The server runs at `http://localhost:3000` by default.

## Scripts

| Command         | Description                                  |
| --------------- | -------------------------------------------- |
| `npm run dev`   | Start the dev server with auto-reload (tsx)  |
| `npm run build` | Compile TypeScript to `dist/`                |
| `npm start`     | Run the compiled build                       |

## Project Structure

```
src/
├── app.ts            # Express setup
├── server.ts         # Entry point
├── routes/           # Route definitions
├── controllers/      # Request handlers
├── services/         # Business logic
├── middlewares/      # Auth, error handler, etc.
├── models/           # Database models and types
├── config/           # Env and database config
└── utils/            # Helpers
```

## Git Workflow

1. Never push directly to `main`.
2. Create a branch per task: `feat/<name>`, `fix/<name>`, `chore/<name>`.
3. Open a Pull Request and get at least one review before merging.
4. Use clear commit messages, for example `feat: add login endpoint`.

```bash
git checkout main
git pull origin main
git checkout -b feat/your-feature
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values. Never commit `.env`.