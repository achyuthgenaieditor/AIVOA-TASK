from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Sentiment = Literal["Positive", "Neutral", "Negative", ""]
ToolName = Literal[
    "log_interaction",
    "edit_interaction",
    "get_history",
    "schedule_followup",
    "generate_notes",
]


class FormData(BaseModel):
    hcpName: str = ""
    productDiscussed: str = ""
    dateOfVisit: str = ""
    sentiment: Sentiment = ""
    samplesDropped: bool = False
    materialsShared: list[str] = Field(default_factory=list)
    followUpRequired: bool = False
    notes: str = ""


class ChatRequest(BaseModel):
    text: str
    currentFormData: FormData = Field(default_factory=FormData)


class Message(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime


class ToolExecution(BaseModel):
    id: str
    toolName: ToolName
    parameters: dict
    status: Literal["executing", "completed", "failed"]
    timestamp: datetime
    result: str | None = None


class ChatResponse(BaseModel):
    message: Message
    formData: dict
    changedFields: list[str]
    toolExecution: ToolExecution


class InteractionResponse(BaseModel):
    id: int
    formData: FormData
