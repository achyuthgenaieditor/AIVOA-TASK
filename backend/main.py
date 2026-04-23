import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from agent import run_agent, _camel_to_model, _model_to_form
from database import Base, engine, get_db
from models import Interaction
from schemas import ChatRequest, ChatResponse, FormData, InteractionResponse

load_dotenv()
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI-First CRM HCP Module", version="1.0.0")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_origin,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "agent": "langgraph",
        "model": os.getenv("GROQ_MODEL", "gemma2-9b-it"),
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
    }


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    return run_agent(request.text, request.currentFormData, db)


@app.post("/api/interactions", response_model=InteractionResponse)
def save_interaction(form_data: FormData, db: Session = Depends(get_db)):
    interaction = Interaction(**_camel_to_model(form_data))
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return InteractionResponse(id=interaction.id, formData=_model_to_form(interaction))


@app.get("/api/interactions", response_model=list[InteractionResponse])
def list_interactions(hcpName: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Interaction).order_by(Interaction.created_at.desc()).limit(20)
    if hcpName:
        query = db.query(Interaction).filter(Interaction.hcp_name.ilike(f"%{hcpName}%")).order_by(Interaction.created_at.desc()).limit(20)
    return [InteractionResponse(id=item.id, formData=_model_to_form(item)) for item in query.all()]
