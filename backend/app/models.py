from pydantic import BaseModel, Field


class ProgressPayload(BaseModel):
    current_time_seconds: float = Field(ge=0)
    duration_seconds: float | None = Field(default=None, ge=0)
    playback_session: int | None = Field(default=None, gt=0, le=2**53 - 1)
    save_sequence: int | None = Field(default=None, gt=0, le=2**53 - 1)
