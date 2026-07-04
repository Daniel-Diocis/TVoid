from pydantic import BaseModel, Field


class ProgressPayload(BaseModel):
    current_time_seconds: float = Field(ge=0)
    duration_seconds: float | None = Field(default=None, ge=0)
