from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Interaction(Base):
    __tablename__ = "interactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    hcp_name: Mapped[str] = mapped_column(String(160), index=True, default="")
    product_discussed: Mapped[str] = mapped_column(String(160), default="")
    date_of_visit: Mapped[str] = mapped_column(String(32), default="")
    sentiment: Mapped[str] = mapped_column(String(32), default="")
    samples_dropped: Mapped[bool] = mapped_column(Boolean, default=False)
    materials_shared: Mapped[str] = mapped_column(Text, default="")
    follow_up_required: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
