# AI-First CRM HCP Module

React frontend for the Log Interaction Screen. The UI supports a structured HCP interaction form and a conversational assistant backed by Redux state and a FastAPI/LangGraph backend.

## Frontend Stack

- React 19 + TypeScript + Vite
- Redux Toolkit + React Redux for chat/form state
- Tailwind CSS + shadcn/ui components
- Framer Motion animations

## Run Frontend

```bash
cd app
npm install
npm run dev
```

The frontend calls `http://localhost:8000` by default. To point to another backend:

```bash
$env:VITE_API_URL="http://localhost:8000"
npm run dev
```

## Main Flow

1. User sends a natural-language HCP visit message.
2. Redux records the user message and an executing tool bubble.
3. FastAPI sends the request to the LangGraph agent.
4. LangGraph routes to one of five tools.
5. The backend returns assistant text, extracted form data, changed fields, and tool execution status.
6. Redux updates the chat and structured form.

## Required Tool Demonstrations

Use these prompts in the assistant:

- `Today I met Dr. Sarah Smith and discussed CardioX. Sentiment was positive and I shared brochures and clinical studies.`
- `Actually change the sentiment to neutral.`
- `Show me my recent interaction history.`
- `Schedule a follow-up with Dr. Sarah Smith next week to discuss pricing.`
- `Generate call notes for this interaction.`
