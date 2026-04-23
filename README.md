# AI-First CRM HCP Module

This repository implements the assignment's Task 1: an AI-first CRM Log Interaction Screen for Healthcare Professional interactions.

## Architecture

- `app/` - React + TypeScript frontend with Redux Toolkit state management.
- `backend/` - Python FastAPI service with a LangGraph agent and SQLAlchemy persistence.
- AI model - Groq `llama-3.3-70b-versatile` through `langchain-groq` when `GROQ_API_KEY` is configured.
- Database - SQLAlchemy supports Postgres/MySQL via `DATABASE_URL`; local demo defaults to SQLite so the app runs immediately.

## LangGraph Tools

- `log_interaction` captures HCP, product, visit date, sentiment, samples, materials, follow-up flag, and notes.
- `edit_interaction` modifies previously extracted draft fields.
- `get_history` retrieves saved interactions from the database.
- `schedule_followup` marks follow-up required and updates the current CRM draft.
- `generate_notes` creates structured call notes, using Groq when available and a deterministic fallback otherwise.

## Run Backend

```bash
cd backend
python -m pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8000
```

Set `GROQ_API_KEY` in `backend/.env` to use the real Groq LLM. Without it, all tools still work with deterministic extraction so the frontend demo remains usable.

For Postgres or MySQL, replace `DATABASE_URL`:

```bash
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/crm
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/crm
```

## Run Frontend

```bash
cd app
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deployment

Deploy the frontend and backend separately:

- Frontend: Netlify, base directory `app`, build command `npm run build`, publish directory `dist`.
- Backend: Render/Railway/Fly as a Python web service, start command `uvicorn main:app --host 0.0.0.0 --port $PORT`.
- Database: Postgres is recommended for deployed environments. Set `DATABASE_URL` on the backend service.

Set these environment variables:

```bash
# backend service
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.3-70b-versatile
DATABASE_URL=postgresql+psycopg2://user:password@host:5432/db
FRONTEND_ORIGIN=https://your-netlify-site.netlify.app

# Netlify frontend
VITE_API_URL=https://your-backend-service-url
```

## Demo Prompts

- `Today I met Dr. Sarah Smith and discussed CardioX. Sentiment was positive and I shared brochures and clinical studies.`
- `Actually change the sentiment to neutral.`
- `Show me my recent interaction history.`
- `Schedule a follow-up with Dr. Sarah Smith next week to discuss pricing.`
- `Generate call notes for this interaction.`

## Verification

```bash
cd app
npm run build
```

```bash
cd backend
python -m py_compile main.py agent.py database.py models.py schemas.py
```
